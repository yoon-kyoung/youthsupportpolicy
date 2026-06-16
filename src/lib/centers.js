import CENTERS from '../data/centers.json' with { type: 'json' }

// sido: "경기도" 같은 시도명(부분일치 허용), cityText: "시흥" 같은 시군구 텍스트(없으면 '')
export function findCenters({ sido = '', cityText = '' }, limit = 3) {
  const match = (a, b) => {
    if (!a || !b) return false
    return a.includes(b) || b.includes(a)
  }

  // 1순위: cityText sgg 부분일치 (sido가 주어지면 sido도 함께 만족해야 통과)
  if (cityText) {
    const bySgg = CENTERS.filter(
      (c) => match(c.sgg, cityText) && (!sido || match(c.sido, sido)),
    )
    if (bySgg.length > 0) return bySgg.slice(0, limit)
  }

  // 2순위: sido 부분일치 폴백 (limit 2)
  if (sido) {
    const bySido = CENTERS.filter((c) => match(c.sido, sido))
    if (bySido.length > 0) return bySido.slice(0, 2)
  }

  return []
}
