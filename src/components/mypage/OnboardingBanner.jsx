import Icon from '../../styles/Icon'

const TIPS = [
  {
    icon: 'bookmark',
    iconColor: '#f59e0b',
    iconBg: '#FFFBEB',
    title: '북마크 저장·취소',
    desc: '별/북마크 아이콘을 누르면 정책이 저장됩니다. 저장 목록에서 다시 누르면 3초 후 취소되고, 그 전에 "실행취소"를 눌러 되돌릴 수 있어요.',
  },
  {
    icon: 'calendar_today',
    iconColor: '#1D4ED8',
    iconBg: '#EFF6FF',
    title: '마감일 달력',
    desc: '신청 내역 탭의 달력에서 저장한 정책들의 마감일을 한눈에 확인할 수 있어요. 날짜 블록을 클릭하면 해당 정책 상세로 이동합니다.',
  },
  {
    icon: 'tune',
    iconColor: '#6D28D9',
    iconBg: '#F5F3FF',
    title: '맞춤 조건 설정',
    desc: '맞춤 조건 탭에서 지역, 나이, 소득 등을 설정하면 나에게 딱 맞는 정책만 골라서 볼 수 있어요. 조건은 언제든 바꿀 수 있습니다.',
  },
]

export default function OnboardingBanner({ onDismiss }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div style={styles.topLeft}>
          <Icon name="lightbulb" size={16} color="#b45309" />
          <span style={styles.heading}>청년정책 마이페이지 사용 팁</span>
        </div>
        <button type="button" onClick={onDismiss} style={styles.closeBtn} title="닫기">
          <Icon name="close" size={16} color="#9ca3af" />
        </button>
      </div>

      <div style={styles.cards}>
        {TIPS.map((tip, i) => (
          <div key={i} style={styles.card}>
            <div style={{ ...styles.iconWrap, backgroundColor: tip.iconBg }}>
              <Icon name={tip.icon} size={20} color={tip.iconColor} />
            </div>
            <div style={styles.cardTitle}>{tip.title}</div>
            <div style={styles.cardDesc}>{tip.desc}</div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <button type="button" onClick={onDismiss} style={styles.dismissBtn}>
          <Icon name="check_circle" size={13} color="#9ca3af" />
          다시 보지 않기
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    border: '1px solid #fde68a',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  heading: {
    fontSize: 14,
    fontWeight: 700,
    color: '#92400e',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #fde68a',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.65,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  dismissBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 0',
  },
}
