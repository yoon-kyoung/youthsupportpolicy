import Icon from '../../styles/Icon'

const TABS = [
  { id: 'info',  icon: 'calendar_month', label: '신청 내역' },
  { id: 'saved', icon: 'bookmark',        label: '저장한 정책' },
  { id: 'prefs', icon: 'tune',            label: '맞춤 조건' },
]

export default function TabBar({ active, onChange }) {
  return (
    <div style={styles.wrapper}>
      {TABS.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            style={isActive ? styles.tabActive : styles.tab}
            onClick={() => onChange(t.id)}
          >
            <Icon
              name={t.icon}
              size={18}
              color={isActive ? '#007FFF' : '#9ca3af'}
            />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

const base = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '14px 20px',
  fontSize: 15,
  lineHeight: 1,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  backgroundColor: 'transparent',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
}

const styles = {
  wrapper: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: '12px 12px 0 0',
    padding: '0 8px',
  },
  tab: {
    ...base,
    color: '#9ca3af',
  },
  tabActive: {
    ...base,
    color: '#007FFF',
    fontWeight: 700,
    borderBottom: '2px solid #007FFF',
  },
}
