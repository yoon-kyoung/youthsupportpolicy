import Icon from '../../styles/Icon'

const CAT = {
  job:    { bg: '#E0F2FE', text: '#0369A1', label: '일자리' },
  house:  { bg: '#F0FDF4', text: '#15803D', label: '주거' },
  money:  { bg: '#FFFBEB', text: '#B45309', label: '금융' },
  edu:    { bg: '#F5F3FF', text: '#6D28D9', label: '교육' },
  health: { bg: '#FFF1F2', text: '#BE123C', label: '복지' },
}

export default function SavedPoliciesTab({ policies, favIds, onToggleFav }) {
  const saved = (policies || []).filter(p => favIds?.has(p.id))

  if (saved.length === 0) {
    return (
      <div style={styles.empty}>
        <Icon name="bookmark" size={40} color="#d1d5db" />
        <div style={styles.emptyTitle}>저장한 정책이 없습니다</div>
        <div style={styles.emptyDesc}>검색 또는 AI 챗봇에서 마음에 드는 정책을 저장해보세요.</div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}><Icon name="bookmark" size={16} color="#111827" style={{marginRight:6}}/>저장한 정책</span>
        <span style={styles.count}>{saved.length}건</span>
      </div>
      <div style={styles.list}>
        {saved.map(p => {
          const c = CAT[p.category] || { bg: '#f3f4f6', text: '#374151', label: p.category || '기타' }
          return (
            <div key={p.id} style={styles.item}>
              <div style={styles.itemLeft}>
                <span style={{ ...styles.badge, backgroundColor: c.bg, color: c.text }}>{c.label}</span>
                <span style={styles.itemTitle}>{p.title}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleFav(p.id)}
                title="저장 취소"
                style={styles.removeBtn}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#f59e0b'}
              >
                <Icon name="bookmark" size={18} color="#f59e0b" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
  },
  count: {
    fontSize: 12,
    fontWeight: 600,
    color: '#007FFF',
    backgroundColor: '#F0F7FF',
    padding: '3px 10px',
    borderRadius: 20,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 12,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  itemTitle: {
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.6,
  },
}
