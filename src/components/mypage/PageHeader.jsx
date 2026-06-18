import Icon from '../../styles/Icon'

export default function PageHeader() {
  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}><Icon name="settings" size={26} color="#111827" style={{marginRight:8}}/>내 정보 관리</h1>
      <p style={styles.subtitle}>회원 정보를 확인하고 맞춤 정책 조건을 설정하세요.</p>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.5px',
    display: 'flex',
    alignItems: 'center',
  },
  subtitle: {
    margin: 0,
    fontSize: 15,
    color: '#6b7280',
  },
}
