import { useState, useEffect, useRef } from 'react'
import Icon from '../../styles/Icon'

const CAT = {
  job:    { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', label: '일자리' },
  house:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: '주거' },
  money:  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: '금융' },
  edu:    { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: '교육' },
  health: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', label: '복지' },
}

const MOCK_POLICIES = [
  {
    id: '1',
    title: '청년도약계좌',
    category: 'money',
    agency: '금융위원회',
    target: '만 19~34세 청년',
    region: '전국',
    deadline: '2026.12.31',
    summary: '월 최대 70만원 납입 시 정부 기여금 포함 5년 만기 최대 5,000만원 목돈 마련',
  },
  {
    id: '2',
    title: '국민취업지원제도 1유형',
    category: 'job',
    agency: '고용노동부',
    target: '만 15~69세 취업취약계층',
    region: '전국',
    deadline: '상시',
    summary: '취업지원 서비스 제공 및 월 50만원 구직촉진수당 최대 6개월 지급',
  },
  {
    id: '3',
    title: '청년 월세 한시 특별지원',
    category: 'house',
    agency: '국토교통부',
    target: '만 19~34세 독립거주 무주택 청년',
    region: '전국',
    deadline: '2026.08.31',
    summary: '보증금 5천만원·월세 70만원 이하 청년에게 월 최대 20만원, 최장 12개월 지원',
  },
  {
    id: '4',
    title: '청년 내일채움공제',
    category: 'job',
    agency: '중소벤처기업부',
    target: '중소·중견기업 재직 청년 (만 15~34세)',
    region: '전국',
    deadline: '2026.12.31',
    summary: '청년·기업·정부 3자 공동 적립으로 2년 근속 시 1,200만원 목돈 마련',
  },
  {
    id: '5',
    title: '청년 창업 사관학교',
    category: 'edu',
    agency: '중소벤처기업부',
    target: '만 39세 이하 예비·초기 창업자',
    region: '전국 15개 캠퍼스',
    deadline: '2026.03.31',
    summary: '1년 과정 창업 교육 및 최대 1억원 창업사업화 자금 지원',
  },
  {
    id: '6',
    title: '청년 건강보험료 지원',
    category: 'health',
    agency: '보건복지부',
    target: '만 19~34세 지역가입자 청년',
    region: '전국',
    deadline: '상시',
    summary: '월 건강보험료의 50% 최대 3년간 지원 (소득 기준 충족 시)',
  },
]

export default function PolicyPreviewSection({ refreshKey = 0 }) {
  const [loading, setLoading] = useState(false)
  const prevKey = useRef(0)

  useEffect(() => {
    if (refreshKey === prevKey.current) return
    prevKey.current = refreshKey
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 1600)
    return () => clearTimeout(t)
  }, [refreshKey])

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <Icon name="auto_awesome" size={20} color="#007FFF"/>
          <span style={styles.title}>맞춤 정책 미리보기</span>
          <span style={styles.badge}>API</span>
        </div>
        <p style={styles.subtitle}>
          {loading
            ? '조건에 맞는 정책을 불러오는 중...'
            : '설정한 조건 기반 추천 정책입니다 · 저장 후 실시간 반영'}
        </p>
      </div>

      {loading ? (
        <div style={styles.loadingGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} style={styles.skeleton} />
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          {MOCK_POLICIES.map(p => {
            const c = CAT[p.category]
            return (
              <div key={p.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={{ ...styles.catBadge, backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
                    {c.label}
                  </span>
                  <span style={styles.deadline}>
                    <Icon name="schedule" size={12}/>
                    {' '}{p.deadline}
                  </span>
                </div>
                <div style={styles.cardTitle}>{p.title}</div>
                <div style={styles.cardSummary}>{p.summary}</div>
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>
                    <Icon name="business" size={13} color="#9ca3af"/>
                    {p.agency}
                  </span>
                  <span style={styles.metaItem}>
                    <Icon name="person" size={13} color="#9ca3af"/>
                    {p.target}
                  </span>
                </div>
                <button style={styles.detailBtn} type="button">
                  자세히 보기
                  <Icon name="chevron_right" size={14}/>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    marginTop: 32,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#007FFF',
    padding: '2px 7px',
    borderRadius: 20,
    letterSpacing: '0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 14,
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 14,
  },
  skeleton: {
    height: 180,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 20,
    border: '1px solid',
  },
  deadline: {
    fontSize: 11,
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.4,
  },
  cardSummary: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.6,
    flex: 1,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    color: '#9ca3af',
  },
  detailBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 4,
    padding: '8px 0',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#374151',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
