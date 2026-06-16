// ────────────────────────────────────────────────────────────
// api/chat.js — Vercel 서버리스 함수: 스트리밍 AI 챗봇
//
// 흐름:
//   1) function calling(non-stream)로 사용자 조건 파악 → search_policies 호출 감지
//   2) recommend.js로 policies.json 필터 → 추천 정책 확보
//   3) 최종 답변을 "스트리밍"으로 클라이언트에 흘려보냄(ChatGPT처럼 또르르)
//   + 사용량/비용 기록, 일일 한도 체크, 모델 선택
//
// 🔑 API 키는 process.env로만 읽음 → 브라우저로 절대 안 나감.
// 추천 정책은 응답 헤더 X-Policy-Ids(id 배열)로 보내고, 카드는 클라가 로컬에서 조회.
// ────────────────────────────────────────────────────────────

import { recommendPolicies } from '../src/lib/recommend.js'
import { findCenters } from '../src/lib/centers.js'
import { FIELD_OPTIONS } from '../src/data/codes.js'
import { ALLOWED_MODELS, costKrwOf } from '../lib/aiConfig.js'
import { getDefaultModel } from '../lib/settings.js'
import { checkDailyLimit } from '../lib/sheetUsage.js'
import { estimateCostUsd, prewarmPrices } from '../lib/pricing.js'

export const config = { maxDuration: 60 }

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY
const UPSTAGE_KEY = process.env.UPSTAGE_API_KEY
const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini'

const SYSTEM = `너는 대한민국 '청년정책 안내 챗봇'이야. 사용자가 상황을 말하면 search_policies 도구로 맞는 청년지원정책을 찾아 추천해.

【도구 호출 규칙 — 가장 중요】
- 사용자의 만 나이를 알 수 있으면(직접 말했거나 "대학생/사회초년생/취준생" 등으로 추정 가능하면) **되묻지 말고 즉시 search_policies를 호출**해.
- 지역은 시·구·동 이름을 반드시 '시도'로 변환해서 region에 넣어:
  예) 광명·수원·분당·성남·고양 → 경기 / 강남·노원·마포 → 서울 / 해운대 → 부산 / 청주 → 충북.
  지역을 전혀 모르면 region은 비우고(전국 정책 위주) 호출해도 돼.
- 사용자가 시·군·구를 말하면 그 이름을 city에도 그대로 넣어(예: 광명→region:경기,city:광명 / 김포→region:경기,city:김포 / 중랑구→region:서울,city:중랑구).
- 관심 분야가 보이면 fields에 넣어(없으면 생략).
- 되묻는 건 "나이조차 전혀 가늠이 안 될 때"만, 딱 한 번. 나이만 있으면 무조건 도구부터 호출.

【정책 선별 규칙 — 매우 중요】
도구 결과로 후보 정책 목록(최대 12개)이 올 거야. 이 중에서 사용자에게 **진짜 맞는 정책은 최대 4개만 골라** 추천해. 잘 맞는 게 1~2개뿐이면 1~2개만 추천해도 돼. 억지로 채우지 말 것.
- 사용자가 특정 시·군·구를 말했으면, 다른 시·군 전용 정책은 반드시 제외해.
  예) 사용자가 "광명"이면 → 기관(org)이 "평택시"·"용인시" 등인 정책은 제외.
  단, 기관이 "경기도"(시도 단위)인 정책은 광명 포함이므로 추천 OK.
- 전국 정책(nationwide)은 누구나 해당되므로 추천 가능.
- 사용자의 상황(취준/재직/학생 등)과 관심 분야에 가장 잘 맞는 것 우선.
- 후보 목록이 비어 있으면([]): 정책을 절대 지어내지 마. [POLICY_IDS:] 태그 없이, 조건에 딱 맞는 정책을 못 찾았다고 솔직히 말하고 지역이나 분야를 바꿔 다시 물어봐 달라고 안내해.

【출력 형식 — 반드시 지켜】
1. 응답의 **맨 첫 줄**에 네가 추천하기로 고른 정책의 id를 아래 형식으로 적어:
   [POLICY_IDS:id1,id2,id3]
   (이 줄은 사용자에게 보이지 않고, 시스템이 파싱해서 카드를 보여주는 데 쓰임.)
2. 그 다음 줄부터 추천 내용을 작성해. 위에서 고른 정책만 설명해.

【답변 스타일】
- 딱딱한 공무원 말투 금지. 따뜻하고 쉽게.
- 말투는 항상 친근한 존댓말(~요체)로 통일해. 반말 금지. 예: "찾아봤어요!", "확인해 보세요!"
- 도구 결과에 있는 정책명/지원내용/기관/신청기간만 사용해. 신청방법, URL, 마감일, 금액, 자격요건을 새로 지어내지 마.
- 특히 "○○포털에서 신청하세요" 같은 사이트·포털 이름을 절대 만들어내지 마. 신청 방법 안내가 필요하면 "아래 정책 카드에서 자세히 확인할 수 있어요"라고만 해.
- 신청기간이 "데이터 없음"이면 "상시"라고 쓰지 말고, 신청기간은 카드/공고에서 확인하라고 안내해.
- 영어 단어, 외국 지명, 내부 지시문, 메타 설명을 섞지 마.
- 각 정책의 신청기간(period)이 실제 날짜로 있으면 마감일을 자연스럽게 알려줘(예: "~12/31까지 신청 가능").
- 청년정책과 관련 없는 질문(잡담·숙제·일반상식 등)에는 도구를 호출하지 말고, 짧고 정중하게 청년정책 안내 챗봇이라고 알린 뒤 나이·지역·관심분야를 물어봐.
- 한국어로 답하고 이모지를 적당히 써.

【이어질 질문 제안 — 매 답변 끝에】
- 정책 추천 답변을 마친 뒤, 마지막에 사용자가 이어서 물어볼 만한 질문 2개를 아래 형식으로 제안해:
  💬 이어서 물어보세요
  · (제안 질문 1)
  · (제안 질문 2)
- 제안 질문은 반드시 **직전 대화 맥락**(방금 추천한 정책의 분야·지역·조건 등)을 바탕으로 작성해.
- 위 괄호 문구는 형식 설명일 뿐이야. 실제 답변에는 "(제안 질문 1)" 같은 placeholder를 절대 쓰지 마.
- 구체적인 질문 문장 2개를 만들 자신이 없으면 이 블록 전체를 생략해. placeholder를 쓰는 것보다 생략이 낫다.
- 우리가 답할 수 있는 범위(정책 추천·신청조건·지역별·분야별 정책 안내) 안에서만 제안해. 신청 방법·사이트 링크·개인 서류 안내 등 답하기 어려운 건 제안하지 마.
- 제안 질문에는 "신청", "링크", "사이트", "서류", "어떻게 해야" 같은 표현을 쓰지 마. 조건·대상·비슷한 정책·다른 분야 질문만 제안해.
- 되묻는 짧은 답변(나이 물어보기 등)이나 오프토픽 안내에는 제안 질문 블록을 붙이지 마.
- 이 블록은 [POLICY_IDS:...] 태그와 무관한 본문 영역이야. 태그는 여전히 응답 첫 줄에만 넣어.

【청년센터 안내 규칙】
- 도구 결과에 centers(청년센터 목록)가 있으면 활용해.
- 추천할 정책이 0건이거나 사용자 지역 전용 정책이 없으면: "등록된 정책은 없지만"이라고 솔직히 말한 뒤, 그 지역 청년센터(이름·전화)를 안내해. 센터 정보를 지어내지 마. centers에 있는 것만 써.
- 정책을 1개 이상 추천했다면 센터 안내는 붙이지 마. 센터 안내는 추천 정책이 0건일 때만 사용해.
- centers가 빈 배열([])이면 센터를 절대 언급하지 마.`


const LOCAL_SIDO_PATTERNS = [
  ['서울', /서울|강남|강동|강북|강서|관악|광진|구로|금천|노원|도봉|동대문|동작|마포|서대문|서초|성동|성북|송파|양천|영등포|용산|은평|종로|중구|중랑/],
  ['경기', /경기|수원|성남|분당|고양|용인|부천|안산|안양|남양주|화성|평택|의정부|시흥|파주|김포|광명|군포|하남|오산|이천|안성|의왕|양주|구리|포천|여주|동두천|과천|가평|양평|연천/],
  ['인천', /인천|부평|계양|미추홀|연수|남동|강화|옹진/],
  ['부산', /부산|해운대|수영|동래|사하|사상|금정|기장|영도/],
  ['대구', /대구|달서|수성|달성/],
  ['대전', /대전|유성|대덕/],
  ['광주', /광주광역시|광산|동구|서구|남구|북구/],
  ['울산', /울산|울주/],
  ['세종', /세종/],
  ['강원', /강원|춘천|원주|강릉/],
  ['충북', /충북|충청북도|청주|충주|제천/],
  ['충남', /충남|충청남도|천안|아산|서산|당진|논산|공주|보령/],
  ['전북', /전북|전라북도|전북특별자치도|전주|군산|익산/],
  ['전남', /전남|전라남도|목포|여수|순천|광양|나주/],
  ['경북', /경북|경상북도|포항|경주|구미|안동|김천/],
  ['경남', /경남|경상남도|창원|김해|진주|양산|거제|통영/],
  ['제주', /제주/],
]

const LOCAL_CITY_PATTERNS = [
  '강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구',
  '수원','성남','분당','고양','용인','부천','안산','안양','남양주','화성','평택','의정부','시흥','파주','김포','광명','군포','하남','오산','이천','안성','의왕','양주','구리','포천','여주','동두천','과천','가평','양평','연천',
  '해운대구','부평구','광산구','청주','천안','전주','창원','제주',
]

const LOCAL_FIELD_HINTS = [
  ['일자리', /일자리|취업|취준|구직|면접|채용|인턴|자격증|시험|직장|창업|농업/],
  ['주거', /주거|월세|전세|보증금|임대|집|주택|원룸|기숙사/],
  ['교육', /교육|학자금|등록금|장학|대학|강의|강좌|훈련|직업훈련|수업|공부/],
  ['복지·금융·문화', /복지|금융|문화|수당|적금|대출|저축|자산|통장|이자|건강|의료|상담|예술/],
  ['참여·권리', /참여|권리|동아리|커뮤니티|모임|네트워크|공간|축제/],
]

function inferLocalSearchArgs(text = '') {
  const q = String(text)
  const ageMatch = q.match(/(?:만\s*)?(\d{1,2})\s*(?:살|세)/)
  let age = ageMatch ? Number(ageMatch[1]) : null
  if (!age && /대학생|대학\s*생/.test(q)) age = 22
  if (!age) return null

  const regionHit = LOCAL_SIDO_PATTERNS.find(([, re]) => re.test(q))
  const cityHit = LOCAL_CITY_PATTERNS.find((city) => q.includes(city))
  const fields = LOCAL_FIELD_HINTS
    .filter(([key, re]) => re.test(q) && FIELD_OPTIONS.some((f) => f.key === key))
    .map(([key]) => key)

  return {
    age,
    region: regionHit ? regionHit[0] : '',
    city: cityHit || '',
    fields: [...new Set(fields)],
  }
}

function makeToolCallMessage(args, id = 'local_search_policies') {
  return {
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id,
        type: 'function',
        function: {
          name: 'search_policies',
          arguments: JSON.stringify(args),
        },
      },
    ],
  }
}

// timeoutMs: 응답 "헤더"가 올 때까지의 제한 (스트리밍 본문은 헤더 후 타이머 해제됨).
// non-stream 호출은 본문 완성 후 헤더가 오므로 사실상 전체 시간 제한이 됨.
// 모델별 프로바이더 라우팅.
// - Solar(solar*/upstage*) → Upstage 직접 API (1순위)
// - openai-direct:* → OpenAI 직접 API (백업)
// - 그 외(gpt-oss·gemma·openrouter/free 등) → 기존 OpenRouter (최후 백업/호환)
function providerFor(model = '') {
  if (/^(solar|upstage[/\-])/i.test(model)) {
    return {
      base: process.env.UPSTAGE_BASE_URL || 'https://api.upstage.ai/v1',
      key: UPSTAGE_KEY,
      model,
      provider: 'upstage',
    }
  }
  if (model.startsWith('openai-direct:')) {
    return {
      base: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      key: OPENAI_KEY,
      model: model.slice('openai-direct:'.length) || OPENAI_FALLBACK_MODEL,
      provider: 'openai',
    }
  }
  return {
    base: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
    key: OPENROUTER_KEY,
    model,
    provider: 'openrouter',
  }
}

function callLLM(body, timeoutMs = 30000) {
  const { base, key, model, provider } = providerFor(body.model)
  if (!key) throw new Error(`${provider} API key missing`)
  // Upstage/OpenAI 직접 API는 OpenRouter 전용 usage 필드를 받지 않는다.
  let payload = { ...body, model }
  if (provider !== 'openrouter' && payload && 'usage' in payload) {
    const { usage, ...rest } = body
    payload = { ...rest, model }
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://youthsupportpolicy-preview.vercel.app'
    headers['X-Title'] = 'Youth Policy Chatbot'
  }
  return fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: ctrl.signal,
  }).finally(() => clearTimeout(timer))
}

// 선택 모델이 느리거나(타임아웃) 죽었을 때(429/5xx) 1회 폴백할 모델.
// OpenAI 키가 있으면 직접 API를 1차 백업으로, 없으면 기존 OpenRouter 무료 모델을 최후 백업으로 쓴다.
const OPENROUTER_FALLBACK_MODEL = 'openai/gpt-oss-120b:free'
const FALLBACK_LLM_MODEL = OPENAI_KEY
  ? `openai-direct:${OPENAI_FALLBACK_MODEL}`
  : (OPENROUTER_KEY ? OPENROUTER_FALLBACK_MODEL : null)

// 주모델 호출 → 실패 시 폴백 모델로 1회 재시도.
// 반환: { resp, usedModel } — resp가 null이거나 !ok면 둘 다 실패한 것.
async function callWithFallback(body, timeoutMs, fbTimeoutMs) {
  let resp = null
  try { resp = await callLLM(body, timeoutMs) } catch { resp = null }
  if (resp?.ok) return { resp, usedModel: body.model }
  if (!FALLBACK_LLM_MODEL || body.model === FALLBACK_LLM_MODEL) {
    return { resp, usedModel: body.model }
  }
  const fbModel = FALLBACK_LLM_MODEL
  let fb = null
  try { fb = await callLLM({ ...body, model: fbModel }, fbTimeoutMs) } catch { fb = null }
  if (fb?.ok) return { resp: fb, usedModel: fbModel }
  return { resp: fb || resp, usedModel: fbModel }
}

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  let s = ''
  for await (const c of req) s += c
  return JSON.parse(s || '{}')
}

// 비ASCII(한글·이모지)를 \uXXXX로 escape → 전송 본문이 100% ASCII가 됨.
// ASCII는 모든 charset(UTF-8·ISO-8859-1 등)의 공통 부분집합이라, GAS가 본문을
// 어떤 charset으로 디코딩하든 JSON.parse가 검 → '검' 으로 정확히 복원함.
// → GAS의 charset 자동감지 실패로 인한 한글 깨짐을 sender 쪽에서 원천 차단(GAS 수정 불필요).
function asciiSafeJson(obj) {
  const s = JSON.stringify(obj)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    out += code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : s.charAt(i)
  }
  return out
}

// 대화 1건을 구글 시트(Apps Script 웹앱)에 기록 — SHEET_WEBHOOK_URL 없으면 건너뜀
async function logToSheet(data) {
  const url = process.env.SHEET_WEBHOOK_URL
  if (!url) return
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000) // GAS가 느려도 함수 안 얼게
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: asciiSafeJson(data), // 한글을 \uXXXX로 → charset 깨짐 방지
      redirect: 'manual', // GAS는 302로 결과 URL을 주는데, append는 이미 실행됨 → 따라갈 필요 X (빠름)
      signal: ctrl.signal,
    })
    clearTimeout(timer)
  } catch {
    /* 로깅 실패는 응답에 영향 X */
  }
}

// [POLICY_IDS:...] 태그 정규식 (앞쪽 스트레이 문자 허용 — unanchored)
const POLICY_TAG_RE = /\[POLICY_IDS:([^\]]*)\]\n?/
const LEADING_POLICY_ID_RE = /^\s*(?:[-*]\s*)?\[?\d{8,}(?:\s*,\s*\d{8,})*\]?\s*\n?/
// 모델이 태그를 안 뱉어 fallback할 때 카드로 띄울 최대 개수 (후보는 점수순 정렬됨).
// 후보 전체(최대 12)를 띄우면 화면이 산만해서 상위 N개만.
const FALLBACK_N = 4

// 비스트리밍 응답 본문에서 선두 태그 제거 — 되묻기 경로(도구 호출 X)에서
// 모델이 습관적으로 [POLICY_IDS:...]를 붙여 보내는 걸 사용자에게서 가림.
// 태그는 항상 맨 앞 규칙 → 태그 이전 문자(스트레이 포함)는 통째로 버림.
function stripPolicyTag(text) {
  const m = POLICY_TAG_RE.exec(text)
  const stripped = m ? text.slice(m.index + m[0].length) : text
  return stripped.replace(LEADING_POLICY_ID_RE, '').replace(/^\s+/, '')
}

// 스트리밍 중 어디서 나와도 [POLICY_IDS:...] 태그를 사용자에게 가리는 필터.
// '[POLICY_IDS' 시작이 보이면 닫는 ']'까지 출력을 보류했다가 태그째 버린다.
// '['로 시작하지만 태그가 아니면 한 글자씩 방출해 일반 텍스트를 훼손하지 않는다.
export function makeTagFilter(write) {
  const MARK = '[POLICY_IDS'
  let hold = ''
  return {
    push(chunk) {
      hold += chunk
      while (hold) {
        const i = hold.indexOf('[')
        if (i === -1) { write(hold); hold = ''; return }
        if (i > 0) { write(hold.slice(0, i)); hold = hold.slice(i) }
        const head = hold.slice(0, MARK.length)
        if (MARK.startsWith(head)) {
          if (hold.length < MARK.length) return // 부분 prefix → 다음 청크 대기
          const close = hold.indexOf(']')
          if (close === -1) {
            if (hold.length > 300) { write(hold); hold = '' } // 비정상 장문 → 포기 방출
            return
          }
          hold = hold.slice(close + 1).replace(/^\n/, '')
          continue
        }
        write(hold[0]) // '['이지만 태그 아님
        hold = hold.slice(1)
      }
    },
    flush() {
      // 끝까지 안 닫힌 태그 조각('[POLICY_IDS:123...')은 노출하지 않고 버림
      if (hold && !hold.startsWith(MARK)) write(hold)
      hold = ''
    },
  }
}

// 429 응답의 Retry-After(초) 읽기 — 없으면 fallback
function retryAfterSec(resp, fallback = 60) {
  const ra = Number(resp.headers?.get?.('retry-after'))
  return Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) : fallback
}

// rate-limit/busy 응답 1건 — 친절 메시지 + X-Retry-After 헤더(프론트 카운트다운용)
function sendRateLimited(res, sec, remaining, msg) {
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('X-Policy-Ids', '[]')
    res.setHeader('X-Remaining', String(remaining))
    res.setHeader('X-Rate-Limited', '1')
    res.setHeader('X-Retry-After', String(sec))
    res.status(200)
  }
  res.end(msg)
}

// OpenAI SSE 스트림을 읽어 delta를 res로 흘리고, 마지막 usage를 반환
async function pipeStream(upstream, res) {
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let usage = { prompt: 0, completion: 0 }
  let actualModel = null
  let costUsd = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload)
        if (j.model) actualModel = j.model
        if (j.usage) {
          usage = { prompt: j.usage.prompt_tokens || 0, completion: j.usage.completion_tokens || 0 }
          if (j.usage.cost != null) costUsd = j.usage.cost
        }
        const delta = j.choices?.[0]?.delta?.content
        if (delta) res.write(delta)
      } catch {
        /* 부분 라인 무시 */
      }
    }
  }
  return { usage, actualModel, costUsd }
}

// pipeStream + [POLICY_IDS:...] 파싱: 헤더 전송 전에 LLM이 고른 정책 ID를 추출
async function pipeStreamWithParse(upstream, res, allPolicies) {
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let usage = { prompt: 0, completion: 0 }
  let fullText = ''
  let headerSent = false
  let pickedIds = []
  let actualModel = null
  let costUsd = 0
  // 태그는 닫는 ']'가 와야 매칭됨. '[POLICY_IDS' 시작이 보이면 길이 무관하게
  // ']'까지 기다리고(정책 4개면 ~96자), 시작조차 없이 80자 넘으면 그때만 fallback.
  const TAG_RE = POLICY_TAG_RE
  // 헤더 전송 후에도 태그가 본문 중간에 다시 나오면 가린다 (모델 변덕 방어)
  const out = makeTagFilter((s) => res.write(s))

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload)
        if (j.model) actualModel = j.model
        if (j.usage) {
          usage = { prompt: j.usage.prompt_tokens || 0, completion: j.usage.completion_tokens || 0 }
          if (j.usage.cost != null) costUsd = j.usage.cost
        }
        const delta = j.choices?.[0]?.delta?.content
        if (!delta) continue
        fullText += delta

        if (!headerSent) {
          const m = fullText.match(TAG_RE)
          if (m) {
            // 태그 앞의 스트레이 문자는 조용히 버림 (사용자에게 노출 안 됨)
            pickedIds = m[1].split(',').map((s) => s.trim()).filter(Boolean)
            res.setHeader('X-Policy-Ids', JSON.stringify(pickedIds))
            headerSent = true
            const rest = fullText.slice(m.index + m[0].length)
            if (rest) out.push(rest)
            fullText = rest
          } else if (!fullText.includes('[POLICY_IDS') && fullText.length > 80) {
            // [POLICY_IDS 시작조차 없이 80자 쌓이면 포기 — 상위 N개만 fallback
            pickedIds = allPolicies.slice(0, FALLBACK_N).map((p) => p.id)
            res.setHeader('X-Policy-Ids', JSON.stringify(pickedIds))
            headerSent = true
            out.push(stripPolicyTag(fullText))
          }
        } else {
          out.push(delta)
        }
      } catch {
        /* partial line */
      }
    }
  }
  if (!headerSent) {
    const m = fullText.match(TAG_RE)
    if (m) {
      pickedIds = m[1].split(',').map((s) => s.trim()).filter(Boolean)
      res.setHeader('X-Policy-Ids', JSON.stringify(pickedIds))
      const rest = fullText.slice(m.index + m[0].length)
      if (rest) out.push(rest)
    } else {
      pickedIds = allPolicies.slice(0, FALLBACK_N).map((p) => p.id)
      res.setHeader('X-Policy-Ids', JSON.stringify(pickedIds))
      out.push(stripPolicyTag(fullText))
    }
  }
  out.flush()
  return { usage, pickedIds, actualModel, costUsd }
}

import { applyCors } from '../lib/cors.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  // 키 미설정 → 503 (프론트가 버튼 모드로 자동 폴백)
  // Solar가 주 키이고, OpenAI 직접 API/OpenRouter는 백업이다.
  if (!UPSTAGE_KEY && !OPENAI_KEY && !OPENROUTER_KEY) {
    res.status(503).json({ error: 'API 키 미설정 (UPSTAGE_API_KEY 또는 OPENAI_API_KEY 필요)' })
    return
  }

  try {
    prewarmPrices() // 가격 fetch를 LLM 호출과 병렬로 미리 시작(기다리지 않음)
    const body = await readBody(req)
    const messages = body?.messages || []
    // 자동 QA봇 요청(x-qa-bot 헤더)은 대화 로그에서 사람과 구별되게 질문 앞에 표식을 붙임
    const isQaBot = String(req.headers['x-qa-bot'] || '') === '1'
    const rawLastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const lastUser = isQaBot ? `🤖[자동QA] ${rawLastUser}` : rawLastUser
    let policyCount = 0
    const reqModel = body?.model
    const adminDefault = await getDefaultModel()
    const model = reqModel && ALLOWED_MODELS.includes(reqModel) ? reqModel : adminDefault

    // 일일 한도 체크 (요청 횟수 + 비용)
    const quota = await checkDailyLimit()
    if (quota.over) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('X-Policy-Ids', '[]')
      res.setHeader('X-Remaining', '0')
      res.status(200)
      res.end(`오늘 답변 한도(${quota.limit}회)에 도달했어요 😢 내일 다시 시도해 주세요!`)
      return
    }
    // 선제 busy — 최근 1분 요청이 소프트 한도 근접(분당 20회 방지). LLM 호출 전에 차단.
    if (quota.busy) {
      sendRateLimited(
        res, 20, quota.remaining,
        '지금 이용자가 많아요 🙏 약 20초 후 다시 시도해 주세요! (분당 요청 제한)',
      )
      return
    }

    // 1) 조건 파악 — 로컬 regex 추출 우선, 실패 시 Solar(prompt 기반 JSON 추출)로 폴백.
    let m1 = null
    let actualModel = 'local-parser'
    const usage = { prompt: 0, completion: 0 }
    let costUsd = 0
    const localArgs = inferLocalSearchArgs(rawLastUser)
    const usedLocalParser = Boolean(localArgs)
    if (localArgs) {
      m1 = makeToolCallMessage(localArgs)
    } else {
      if (!UPSTAGE_KEY && !OPENAI_KEY) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('X-Policy-Ids', '[]')
        res.setHeader('X-Remaining', String(Math.max(0, quota.remaining - 1)))
        res.status(200)
        res.end('정확히 찾아드리려면 만 나이와 지역을 함께 알려주세요. 예: "서울 25세 취업 정책 알려줘"')
        return
      }
      const extractModel = 'solar-mini'
      const extractPrompt = `사용자 메시지에서 청년정책 검색 파라미터를 추출해서 JSON만 출력해.

규칙:
- age: 만 나이(숫자). "대학생"→22, "사회초년생/취준생"→26 으로 추정. 전혀 모르면 null.
- region: 시도명. 시·구·동은 시도로 변환(강남→서울, 수원→경기, 해운대→부산). 모르면 "".
- city: 시·군·구 이름 그대로(예: "광명","중랑구"). 모르면 "".
- fields: 관심 분야 배열. 가능한 값: "일자리","주거","교육","복지·금융·문화","참여·권리". 없으면 [].

반드시 {"age":...,"region":"...","city":"...","fields":[...]} 형태 JSON 한 줄만 출력. 다른 텍스트 금지.
age가 null이면 {"age":null}만 출력.`

      const { resp: r1 } = await callWithFallback(
        {
          model: extractModel,
          messages: [
            { role: 'system', content: extractPrompt },
            { role: 'user', content: rawLastUser },
          ],
          temperature: 0,
        },
        15000, 12000,
      )
      if (r1 && !r1.ok && r1.status === 429) {
        const sec = retryAfterSec(r1)
        sendRateLimited(
          res, sec, quota.remaining,
          `지금 요청이 몰리고 있어요 😅 약 ${sec}초 후 다시 시도해 주세요! (분당 20회 제한)`,
        )
        return
      }
      if (!r1 || !r1.ok) throw new Error(`LLM r1 파라미터 추출 실패: ${r1 ? `${r1.status}: ${await r1.text()}` : 'timeout/network'}`)
      const d1 = await r1.json()
      const raw1 = (d1.choices?.[0]?.message?.content || '').trim()
      actualModel = d1.model || extractModel
      usage.prompt = d1.usage?.prompt_tokens || 0
      usage.completion = d1.usage?.completion_tokens || 0
      costUsd = d1.usage?.cost ?? 0

      let parsed = null
      try {
        const jsonMatch = raw1.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      } catch { /* JSON 파싱 실패 */ }

      if (parsed && parsed.age) {
        m1 = makeToolCallMessage({
          age: Number(parsed.age),
          region: parsed.region || '',
          city: parsed.city || '',
          fields: Array.isArray(parsed.fields) ? parsed.fields : [],
        })
      } else {
        m1 = {
          role: 'assistant',
          content: '정확히 찾아드리려면 만 나이와 지역을 함께 알려주세요! 😊 예: "서울 25세 취업 정책 알려줘"',
          tool_calls: [],
        }
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Accel-Buffering', 'no')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('X-Remaining', String(Math.max(0, quota.remaining - 1)))

    // 시트 로깅은 반드시 res.end() "전"에 (Vercel은 응답 후 함수를 얼림)
    // 사용량 집계는 이 시트가 단일 출처 → 인메모리 기록 불필요(제거).
    const finalize = async (totalCostUsd = 0, estCostUsd = null, modelForCol = actualModel) => {
      await logToSheet({
        question: lastUser,
        model,
        actualModel: modelForCol,
        promptTokens: usage.prompt,
        completionTokens: usage.completion,
        cost: Math.round(costKrwOf(model, usage.prompt, usage.completion) * 100) / 100,
        costUsd: Math.round(totalCostUsd * 1e7) / 1e7,
        // 예상비용(유료기준 USD): 추정 불가(무료전용 모델)면 빈칸
        estCostUsd: estCostUsd == null ? '' : Math.round(estCostUsd * 1e7) / 1e7,
        policies: policyCount,
      })
    }

    if (m1.tool_calls?.length) {
      const convo = [{ role: 'system', content: SYSTEM }, ...messages, m1]
      let policies = []
      for (const tc of m1.tool_calls) {
        // 모델(특히 소형)이 인자를 헐겁게 줄 수 있어 방어적으로 정규화:
        // - JSON 파싱 실패 → 빈 객체  - fields가 문자열이면 배열로  - age는 숫자로
        let args = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* 무시 */ }
        const fieldsArr = Array.isArray(args.fields)
          ? args.fields
          : (typeof args.fields === 'string' && args.fields ? [args.fields] : [])
        const found = recommendPolicies(
          {
            age: Number(args.age),
            region: typeof args.region === 'string' ? args.region : '',
            fields: fieldsArr,
            city: typeof args.city === 'string' ? args.city : '',
          },
          usedLocalParser ? 4 : 12,
        )
        policies = found
        const summary = found.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          org: p.org || '',
          age: p.minAge != null ? `${p.minAge}~${p.maxAge}세` : '무관',
          region: p.nationwide ? '전국' : p.regions.join(','),
          support: (p.summary || p.support || '').slice(0, 120),
          period: p.period || '데이터 없음',
        }))
        const centers = found.length
          ? []
          : findCenters({ sido: args.region || '', cityText: args.city || '' }, 3)
            .map(({ name, tel, addr, url }) => ({ name, tel, addr, url }))
        convo.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ policies: summary, centers }) })
      }

      // 2) 최종 답변 스트리밍 — 선택모델 실패 시 폴백 모델로 1회 재시도.
      // (timeoutMs는 스트림 "시작"까지의 제한 — 본문 스트리밍은 제한 없음)
      const { resp: r2 } = await callWithFallback(
        {
          model,
          messages: convo,
          temperature: 0.3,
          stream: true,
          stream_options: { include_usage: true },
          usage: { include: true }, // OpenRouter: 스트리밍 마지막 usage 청크에 cost(USD) 포함
        },
        20000, 15000,
      )
      if (r2 && !r2.ok && r2.status === 429) {
        const sec = retryAfterSec(r2)
        sendRateLimited(
          res, sec, quota.remaining,
          `지금 요청이 몰리고 있어요 😅 약 ${sec}초 후 다시 시도해 주세요! (분당 20회 제한)`,
        )
        return
      }
      if (!r2 || !r2.ok) throw new Error(`LLM r2 실패: ${r2 ? `${r2.status}: ${await r2.text()}` : 'timeout/network'}`)

      // 함수콜(r1) 토큰은 답변(r2) 토큰을 합치기 전에 따로 보관
      const u1 = { prompt: usage.prompt, completion: usage.completion }
      const { usage: u2, pickedIds, costUsd: cu2, actualModel: streamModel } =
        await pipeStreamWithParse(r2, res, policies)
      policyCount = pickedIds.length || policies.length
      usage.prompt += u2.prompt
      usage.completion += u2.completion
      costUsd += cu2
      // 예상비용: 두 호출(함수콜 모델 + 답변 모델)을 각자 가격으로 추정해 합산
      // (openrouter/free는 호출마다 다른 모델로 라우팅될 수 있음)
      const est1 = await estimateCostUsd(actualModel, u1.prompt, u1.completion)
      const est2 = await estimateCostUsd(streamModel || actualModel, u2.prompt, u2.completion)
      const estCostUsd = est1 == null && est2 == null ? null : (est1 || 0) + (est2 || 0)
      // 실제모델 칼럼엔 답변을 생성한 모델(r2)을 우선 기록
      await finalize(costUsd, estCostUsd, streamModel || actualModel)
      res.end()
    } else {
      // 도구 호출 없음 = 되묻는 질문(짧음) → 선두 [POLICY_IDS:...] 태그만 제거 후 전송
      // (이 경로엔 실제 정책 목록이 없어 태그 ID는 환각 → 무시하고 가림)
      res.setHeader('X-Policy-Ids', '[]')
      const est = await estimateCostUsd(actualModel, usage.prompt, usage.completion)
      await finalize(costUsd, est)
      res.end(stripPolicyTag(m1.content || ''))
    }
  } catch (e) {
    console.error(e)
    if (!res.headersSent) {
      // 500 JSON을 주면 프론트가 버튼 모드로 떨어짐 → 일시 오류는 친절한 200 텍스트로.
      // (키 미설정 등 영구 장애는 위에서 이미 503으로 처리됨)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('X-Policy-Ids', '[]')
      res.setHeader('X-Rate-Limited', '1') // 질문 횟수 차감 방지
      res.status(200)
      res.end('앗, 지금 AI 응답이 원활하지 않아요 😢 잠시 후 같은 질문을 다시 보내주시면 바로 찾아드릴게요!')
    } else {
      try { res.end() } catch { /* noop */ }
    }
  }
}
