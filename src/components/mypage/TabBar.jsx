import { useState } from 'react'
import Icon from '../../styles/Icon'

const TABS = [
  { id: 'info',  icon: 'receipt_long', label: '신청 내역' },
  { id: 'saved', icon: 'bookmark',     label: '저장한 정책' },
  { id: 'prefs', icon: 'tune',         label: '맞춤 조건' },
]

export default function TabBar({ active, onChange }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={styles.wrapper}>
      {TABS.map(t => {
        const isActive = active === t.id
        const isHovered = hovered === t.id && !isActive
        return (
          <button
            key={t.id}
            type="button"
            data-tour={`tab-${t.id}`}
            style={{
              ...base,
              color: isActive ? '#007FFF' : isHovered ? '#374151' : '#6b7280',
              fontWeight: isActive ? 700 : 500,
              backgroundColor: isActive ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.55)' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            }}
            onClick={() => onChange(t.id)}
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <Icon
              name={t.icon}
              size={17}
              color={isActive ? '#007FFF' : isHovered ? '#374151' : '#9ca3af'}
            />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

const base = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '10px 16px',
  fontSize: 14,
  lineHeight: 1,
  cursor: 'pointer',
  border: 'none',
  borderRadius: 9,
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
}

const styles = {
  wrapper: {
    display: 'flex',
    gap: 4,
    padding: 6,
    backgroundColor: '#EEF2F7',
    borderRadius: '12px 12px 0 0',
  },
}
