// ─── Design Token Color System ───────────────────────────────────────────────
// AI 청년 정책 챗봇 UI 컬러 가이드라인 (WCAG 2.1 준수)

export const C = {
  // 1. Primary — 핵심 CTA 버튼, 활성 탭, 주요 링크
  primary:       '#007FFF',  // Azure Blue
  primaryHover:  '#0066CC',
  primaryActive: '#0052A3',

  // 2. Secondary — 사용자 말풍선, 비활성 태그/칩, 인풋창 배경
  secondary:     '#E6F2FF',  // Sky Tint

  // 3. Accent — 즐겨찾기 ★, 매칭률 %, 마감 임박 배지 (글자는 반드시 neutralDark)
  accent:        '#FFD200',  // Sunny Yellow

  // 4. Neutral
  neutralDark:   '#1A202C',  // Deep Charcoal — 본문·타이틀·AI 답변
  neutralLight:  '#F5F9FC',  // Off-White Blue — 대화창 바탕
  neutralWhite:  '#FFFFFF',  // Pure White — AI 말풍선, 카드 배경

  // 5. Status
  success:       '#00C853',  // Vivid Green
  error:         '#FF4D4D',  // Bright Red
  warning:       '#FF9100',  // Intense Orange
  info:          '#00B0FF',  // Light Blue

  // 6. Variations
  borderGray:    '#E2E8F0',  // 인풋·카드 테두리
  mutedText:     '#718096',  // 날짜·보조 설명·도움말

  // 7. Status backgrounds (light tints)
  successBg:     '#E6FAEF',
  successBorder: '#99F0BC',
  errorBg:       '#FFF0F0',
  errorBorder:   '#FFBDBD',
  warningBg:     '#FFF4E6',
  warningBorder: '#FFD9A0',
};
