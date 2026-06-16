// ────────────────────────────────────────────────────────────
// lib/sheetUsage.js — 관리자 대시보드의 "진짜 DB" = 구글시트 CSV
//
// 왜? Vercel 서버리스는 요청마다 인스턴스가 달라서 인메모리 사용량이
// /api/chat 과 /api/usage 사이에 공유되지 않음 → 대시보드가 항상 0.
// 시트는 외부 영구저장이라, 거기서 직접 읽어 집계하면 정확하고 영구적.
//
// 시트 컬럼: [시각, 질문, 모델, 실제모델, 입력토큰, 출력토큰, 비용(원), 비용(USD), 예상비용(USD), 추천수]
// 비용은 시트의 원화값 대신 토큰으로 costOf(USD) 재계산 → 환율 변경에도 정확.
// ────────────────────────────────────────────────────────────

import { costOf, USD_TO_KRW, DEFAULT_MODEL } from './aiConfig.js'
import { parseCsv } from './csv.js'

const SHEET_ID = '1vKSirUpGTuvFy40Hf5y9l_vOp5aNtRFuuC8jTfFpKfs'
const SHEET_CSV_URL =
  process.env.SHEET_CSV_URL ||
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`

const DAILY_LIMIT_USD = Number(process.env.DAILY_COST_LIMIT_USD || 0) // 0 = 무제한
// OpenRouter 무료모델 실한도: $10+ 충전 시 1000/일, 미충전 시 50/일 (둘 다 20 RPM).
// 현재 $10 충전됨 → 1000/일 기준 여유분 100 두고 900.
// ※ Vercel 환경변수 DAILY_REQUEST_LIMIT 가 설정돼 있으면 그 값이 우선함(없으면 아래 기본값).
const DAILY_REQUEST_LIMIT = Number(process.env.DAILY_REQUEST_LIMIT || 900)

// OpenRouter 무료모델 분당 한도 20 RPM에 대한 "선제 busy" 소프트 임계값.
// 시트 CSV가 실시간이 아니라(수초~분 지연) + 행은 요청 완료 후 기록되어 약간 과소집계됨.
// → 20보다 낮게 잡아 여유를 둠(지속적 과부하만 대략 차단). 0이면 비활성.
const RPM_SOFT_LIMIT = Number(process.env.RPM_SOFT_LIMIT || 15)

// 시트 시각 "2026. 6. 9 오전 10:29:26" → "2026-06-09"
function ymdFromCell(s) {
  const m = String(s).match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
}

// 시트 시각(KST) "2026. 6. 12 오후 4:25:44" → epoch ms (UTC)
function cellToEpochMs(s) {
  const m = String(s).match(
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2}):(\d{2})/,
  )
  if (!m) return null
  let [, Y, Mo, D, ampm, H, Mi, Se] = m
  H = Number(H)
  if (ampm === '오후' && H < 12) H += 12
  if (ampm === '오전' && H === 12) H = 0
  // 시트 시각은 KST → UTC epoch로 환산(-9h)
  return Date.UTC(Number(Y), Number(Mo) - 1, Number(D), H, Number(Mi), Number(Se)) - 9 * 3600 * 1000
}

// KST 기준 오늘 (시트 시각이 한국시간이므로 맞춰줌)
function todayKeyKST() {
  const n = new Date(Date.now() + 9 * 3600 * 1000)
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(
    n.getUTCDate(),
  ).padStart(2, '0')}`
}

const emptyDay = () => ({ requests: 0, prompt: 0, completion: 0, cost: 0, byModel: {} })

// 시트를 읽어 일자별/모델별로 집계 (cost 는 USD)
export async function getUsageFromSheet() {
  let rows = []
  let ok = false
  try {
    const r = await fetch(SHEET_CSV_URL, { redirect: 'follow' })
    if (r.ok) { rows = parseCsv(await r.text()); ok = true }
  } catch {
    /* 네트워크 실패 → 빈 통계 */
  }
  // 헤더 행 제거(첫 셀이 '시각')
  if (rows.length && /시각/.test(rows[0][0] || '')) rows = rows.slice(1)

  const nowMs = Date.now()
  let recentMinute = 0 // 최근 60초 내 요청 수 (선제 busy 판정용)
  const days = {}
  let parsed = 0
  for (const cols of rows) {
    if (cols.length < 5) continue
    const date = ymdFromCell(cols[0])
    if (!date) continue
    const ep = cellToEpochMs(cols[0])
    if (ep != null && nowMs - ep >= 0 && nowMs - ep <= 60_000) recentMinute++
    // 신규 9컬럼: [시각,질문,모델,실제모델,입력토큰,출력토큰,비용(원),비용(USD),추천수]
    // 구형 7컬럼: [시각,질문,모델,입력토큰,출력토큰,비용(원),추천수]
    const isNew = cols.length >= 9
    const model = ((isNew ? cols[3] : cols[2]) || cols[2] || '').trim() || DEFAULT_MODEL
    const prompt = Number(isNew ? cols[4] : cols[3]) || 0
    const completion = Number(isNew ? cols[5] : cols[4]) || 0
    const cost = costOf(model, prompt, completion) // USD 정확 재계산
    if (!days[date]) days[date] = emptyDay()
    const d = days[date]
    d.requests++; d.prompt += prompt; d.completion += completion; d.cost += cost
    if (!d.byModel[model]) d.byModel[model] = { requests: 0, prompt: 0, completion: 0, cost: 0 }
    const bm = d.byModel[model]
    bm.requests++; bm.prompt += prompt; bm.completion += completion; bm.cost += cost
    parsed++
  }

  const date = todayKeyKST()
  const today = days[date] || emptyDay()
  const total = Object.values(days).reduce(
    (a, x) => ({
      requests: a.requests + x.requests,
      prompt: a.prompt + x.prompt,
      completion: a.completion + x.completion,
      cost: a.cost + x.cost,
    }),
    { requests: 0, prompt: 0, completion: 0, cost: 0 },
  )

  return { date, today, total, days, recentMinute, rowsParsed: parsed, sourceOk: ok }
}

// 오늘 사용량 + 최근 분당 부하를 확인.
//   over: 일일 한도 초과(차단) / busy: 분당 한도 근접(선제 차단)
export async function checkDailyLimit() {
  try {
    const u = await getUsageFromSheet()
    const todayReqs = u.today.requests
    const remaining = Math.max(0, DAILY_REQUEST_LIMIT - todayReqs)
    const overByCount = DAILY_REQUEST_LIMIT > 0 && todayReqs >= DAILY_REQUEST_LIMIT
    const overByCost = DAILY_LIMIT_USD > 0 && u.today.cost >= DAILY_LIMIT_USD
    const busy = RPM_SOFT_LIMIT > 0 && u.recentMinute >= RPM_SOFT_LIMIT
    return {
      over: overByCount || overByCost,
      busy,
      remaining,
      limit: DAILY_REQUEST_LIMIT,
      used: todayReqs,
      rpmUsed: u.recentMinute,
      rpmLimit: RPM_SOFT_LIMIT,
    }
  } catch {
    return { over: false, busy: false, remaining: DAILY_REQUEST_LIMIT, limit: DAILY_REQUEST_LIMIT, used: 0, rpmUsed: 0, rpmLimit: RPM_SOFT_LIMIT }
  }
}

// 하위 호환 — chat.js 등에서 사용
export async function isOverLimit() {
  return (await checkDailyLimit()).over
}

export { DAILY_LIMIT_USD, DAILY_REQUEST_LIMIT, USD_TO_KRW }
