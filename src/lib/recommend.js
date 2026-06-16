import POLICIES from '../data/policies.json' with { type: 'json' }
import { matchesField, FIELD_OPTIONS } from '../data/codes.js'

const SIDO_ALIASES = [
  ['서울', /서울(?:특별시|시)?/],
  ['부산', /부산(?:광역시|시)?/],
  ['대구', /대구(?:광역시|시)?/],
  ['인천', /인천(?:광역시|시)?/],
  ['광주', /광주(?:광역시|시)?/],
  ['대전', /대전(?:광역시|시)?/],
  ['울산', /울산(?:광역시|시)?/],
  ['세종', /세종(?:특별자치시|시)?/],
  ['경기', /경기도/],
  ['강원', /강원(?:특별자치도|도)/],
  ['충북', /충청북도|충북/],
  ['충남', /충청남도|충남/],
  ['전북', /전북특별자치도|전라북도|전북/],
  ['전남', /전라남도|전남/],
  ['경북', /경상북도|경북/],
  ['경남', /경상남도|경남/],
  ['제주', /제주특별자치도|제주도|제주/],
]

// 모델이 분야를 정식 키('복지·금융·문화')가 아니라 freeform('금융지원')으로 줄 때
// 키워드 부분일치로 정식 키에 매핑. 못 맞추면 버림 → 전부 버려지면 분야필터 없음(폭넓게).
function normalizeFields(list) {
  const arr = Array.isArray(list) ? list : list ? [list] : []
  const out = []
  for (const f of arr) {
    if (FIELD_OPTIONS.some((o) => o.key === f)) out.push(f)
    else {
      const hit = FIELD_OPTIONS.find((o) => o.match.some((m) => String(f).includes(m)))
      if (hit) out.push(hit.key)
    }
  }
  return [...new Set(out)]
}

// ── 신청기간 만료 판정 ───────────────────────────────────────
// period 예: "20260622 ~ 20261231" / "" / 멀티기간(\N 구분).
// 문자열 속 모든 8자리 날짜의 최댓값(=최종 종료일)을 종료일로 본다.
export function periodEndYmd(period) {
  if (!period) return null
  const ds = String(period).match(/\d{8}/g)
  if (!ds || !ds.length) return null
  return Math.max(...ds.map(Number))
}
// KST 기준 오늘을 YYYYMMDD 정수로
export function todayYmdKST() {
  const n = new Date(Date.now() + 9 * 3600 * 1000)
  return n.getUTCFullYear() * 10000 + (n.getUTCMonth() + 1) * 100 + n.getUTCDate()
}
// 종료일 정보가 있고 그게 오늘보다 과거면 만료(기간정보 없으면 만료 아님)
export function isExpired(period, today = todayYmdKST()) {
  const e = periodEndYmd(period)
  return e != null && e < today
}

// org에서 시·군·구명 추출. "경기도 평택시 기획항만경제실" → "평택시",
// "의왕시"처럼 시군구명만 있는 기관도 잡는다. 시도 단위("경기도")만 있으면 null.
function orgCity(text) {
  if (!text) return null
  text = String(text).trim()
  const withSido = text.match(/(?:특별자치도|특별자치시|특별시|광역시|도)\s+(\S+?[시군구])(?=\s|$)/)
  if (withSido) return withSido[1]
  const direct = text.match(/^(\S+?[시군구])(?:\s|$)/)
  if (direct) return direct[1]
  const inName = text.match(/(?:^|[\s(])([가-힣]{2,10}[시군구])(?=[)\s]|$)/)
  return inName ? inName[1] : null
}
// 비교용으로 끝의 시/군/구 떼기: "평택시"→"평택", "중랑구"→"중랑", "성남"→"성남"
function baseName(s) {
  return s ? String(s).replace(/(시|군|구)$/, '') : s
}

function orgSido(org) {
  const text = String(org || '')
  const hit = SIDO_ALIASES.find(([, re]) => re.test(text))
  return hit ? hit[0] : null
}

function hasLocalOrg(org) {
  return Boolean(orgSido(org) || orgCity(org))
}

// 입력 조건에 맞는 정책을 점수순으로 추천 (만료 제외, 넓은 후보군 → LLM이 최종 선별)
//   answers: { age:number, region:string, fields:string[], city:string }
export function recommendPolicies({ age, region, fields = [], city = '' }, limit = 20) {
  const today = todayYmdKST()
  const cityBase = baseName(city)
  // 방어+정규화: 배열 아님/freeform 값도 정식 분야 키로 보정
  const fieldList = normalizeFields(fields)
  return POLICIES
    .map((p) => {
      if (isExpired(p.period, today)) return null
      const ageOk =
        (p.minAge == null || age >= p.minAge) &&
        (p.maxAge == null || age <= p.maxAge)
      const localityText = [p.org, p.name].filter(Boolean).join(' ')
      const inferredSido = orgSido(localityText)
      const inferredCity = orgCity(localityText)
      const looksLocal = hasLocalOrg(localityText)
      const nationwide = p.nationwide && !looksLocal
      const regionSpecific = !nationwide && (
        p.regions.includes(region) ||
        (region && inferredSido === region)
      )
      const regionOk = nationwide || regionSpecific
      if (!ageOk || !regionOk) return null

      // 도시 지정 시: 같은 시도라도 "다른 시·군·구 전용" 정책은 제외.
      // (org이 도 단위면 통과, 사용자 도시와 같으면 통과, 다른 도시면 컷)
      if (regionSpecific) {
        if (cityBase && inferredCity && baseName(inferredCity) !== cityBase) return null
        // 서울/경기처럼 시도만 말한 경우 구·시 전용 정책을 전체 시도 정책처럼 보여주지 않는다.
        if (!cityBase && inferredCity) return null
      }

      const fieldOk =
        fieldList.length === 0 || fieldList.some((f) => matchesField(p.category, f))

      let score = 0
      if (fieldOk) score += 3
      if (regionSpecific) score += 2

      return { ...p, score, regionSpecific, fieldOk }
    })
    .filter(Boolean)
    .filter((p) => p.fieldOk)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export const TOTAL_POLICIES = POLICIES.length

// id 배열 → 정책 객체 배열 (스트리밍 응답 헤더로 받은 추천 id를 카드로 복원)
const _BY_ID = new Map(POLICIES.map((p) => [p.id, p]))
export function policiesByIds(ids = []) {
  return ids.map((id) => _BY_ID.get(id)).filter(Boolean)
}
