// ────────────────────────────────────────────────────────────
// 온통청년 Open API 코드 매핑
// ⚠️ 실제 API의 대분류명은 코드표(xlsx)와 다름. 부분일치로 견고하게 매핑.
//    실제 값: 일자리 / 주거 / 교육･직업훈련 / 금융･복지･문화 / 참여･기반
// ────────────────────────────────────────────────────────────

// 법정동코드 앞 2자리 → 시도명
export const SIDO_BY_CODE = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주',
  '30': '대전', '31': '울산', '36': '세종', '41': '경기', '43': '충북',
  '44': '충남', '46': '전남', '47': '경북', '48': '경남', '50': '제주',
  '51': '강원', '52': '전북',
}

export const SIDO_LIST = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

export const STATUSES = [
  { key: '재직중', label: '💼 재직 중' },
  { key: '구직중', label: '🔍 구직 중' },
  { key: '학생', label: '🎓 학생' },
  { key: '무직', label: '🌱 그 외 / 무직' },
]

// 사용자에게 보여줄 분야 그룹 (실제 대분류를 부분일치 키워드로 묶음)
export const FIELD_OPTIONS = [
  { key: '일자리', emoji: '💼', color: '#2563eb', match: ['일자리'] },
  { key: '주거', emoji: '🏠', color: '#16a34a', match: ['주거'] },
  { key: '교육', emoji: '📚', color: '#7c3aed', match: ['교육', '직업훈련'] },
  { key: '복지·금융·문화', emoji: '💰', color: '#db2777', match: ['금융', '복지', '문화'] },
  { key: '참여·권리', emoji: '🙋', color: '#ea580c', match: ['참여', '기반', '권리'] },
]

// 정책 카테고리 문자열 → 표시 메타(이모지/색/라벨). 부분일치라 명칭이 바뀌어도 견딤
export function categoryMeta(cat = '') {
  const found = FIELD_OPTIONS.find((f) => f.match.some((m) => cat.includes(m)))
  if (found) return found
  return { key: cat || '기타', emoji: '📋', color: '#64748b', match: [] }
}

// 정책이 특정 분야 그룹에 속하는지
export function matchesField(policyCategory = '', fieldKey) {
  const field = FIELD_OPTIONS.find((f) => f.key === fieldKey)
  if (!field) return false
  return field.match.some((m) => policyCategory.includes(m))
}

// zipCd 문자열("11110,26110,...") → 시도명 배열
export function zipToSido(zipCd) {
  if (!zipCd) return []
  const set = new Set()
  for (const code of String(zipCd).split(',')) {
    const prefix = code.trim().slice(0, 2)
    if (SIDO_BY_CODE[prefix]) set.add(SIDO_BY_CODE[prefix])
  }
  return [...set]
}
