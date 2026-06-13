import { getPolicies } from './policiesStore.js'
import { matchesField } from './codes.js'

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

// 입력 조건에 맞는 정책을 점수순으로 추천 (만료 제외, 넓은 후보군 → LLM이 최종 선별)
export function recommendPolicies({ age, region, fields = [], city = '' }, limit = 20) {
  const POLICIES = getPolicies()
  const today = todayYmdKST()
  return POLICIES
    .map((p) => {
      if (isExpired(p.period, today)) return null
      const ageOk =
        (p.minAge == null || age >= p.minAge) &&
        (p.maxAge == null || age <= p.maxAge)
      const regionSpecific = !p.nationwide && p.regions.includes(region)
      const regionOk = p.nationwide || regionSpecific
      if (!ageOk || !regionOk) return null

      const fieldOk =
        fields.length === 0 || fields.some((f) => matchesField(p.category, f))

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

export function totalPolicies() {
  return getPolicies().length
}

let _byId = null
export function policiesByIds(ids = []) {
  const POLICIES = getPolicies()
  if (!_byId || _byId.size !== POLICIES.length) {
    _byId = new Map(POLICIES.map(p => [p.id, p]))
  }
  return ids.map(id => _byId.get(id)).filter(Boolean)
}
