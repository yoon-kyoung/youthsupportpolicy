import Icon from '../../styles/Icon'

const CAT = {
  job:    { bg: '#EFF6FF', text: '#1D4ED8', label: '일자리' },
  house:  { bg: '#F0FDF4', text: '#15803D', label: '주거' },
  money:  { bg: '#FFFBEB', text: '#B45309', label: '금융' },
  edu:    { bg: '#F5F3FF', text: '#6D28D9', label: '교육' },
  health: { bg: '#FFF1F2', text: '#BE123C', label: '복지' },
}

const STATUS = {
  '신청완료':  { bg: '#EFF6FF', text: '#1D4ED8' },
  '심사중':    { bg: '#FFFBEB', text: '#B45309' },
  '결과확인':  { bg: '#F5F3FF', text: '#6D28D9' },
  '지원완료':  { bg: '#F0FDF4', text: '#15803D' },
}

export default function JoinHistoryCard({ policies }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}><Icon name="receipt_long" size={16} color="#111827" style={{marginRight:6}}/>신청 내역</span>
        <span style={styles.count}>{policies.length}건</span>
      </div>

      <div style={styles.list}>
        {policies.length === 0 ? (
          <div style={styles.empty}>신청한 정책이 없습니다</div>
        ) : (
          policies.map(p => {
            const c = CAT[p.category] || { bg: '#f3f4f6', text: '#374151', label: p.category }
            const s = p.status ? STATUS[p.status] : null
            return (
              <div key={p.id} style={styles.item}>
                <div style={styles.itemLeft}>
                  <span style={{ ...styles.badge, backgroundColor: c.bg, color: c.text }}>
                    {c.label}
                  </span>
                  <span style={styles.itemTitle}>{p.title}</span>
                </div>
                <div style={styles.itemRight}>
                  {s && (
                    <span style={{ ...styles.statusBadge, backgroundColor: s.bg, color: s.text }}>
                      {p.status}
                    </span>
                  )}
                  <span style={styles.itemDate}>{p.date.replace(/-/g, '.')}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
  },
  count: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1D4ED8',
    backgroundColor: '#EFF6FF',
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
  itemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    whiteSpace: 'nowrap',
  },
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
    whiteSpace: 'nowrap',
  },
  empty: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: '20px 0',
  },
}
