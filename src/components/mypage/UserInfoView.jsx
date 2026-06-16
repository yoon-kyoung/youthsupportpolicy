import Icon from '../../styles/Icon'

function formatDate(str) {
  if (!str) return '-'
  return str.replace(/-/g, '.')
}

export default function UserInfoView({ user, onEdit }) {
  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.name}>{user.name}</div>
          <div style={styles.email}>{user.email}</div>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.infoList}>
        <InfoRow label="전화번호" value={user.phone} />
        <InfoRow label="가입일" value={formatDate(user.joinDate)} />
        <InfoRow label="최근 로그인" value={formatDate(user.lastLogin)} />
      </div>

      {onEdit && (
        <button style={styles.editBtn} onClick={onEdit}>
          <Icon name="edit" size={16}/>
          정보 수정
        </button>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    backgroundColor: '#EFF6FF',
    border: '2px solid #BFDBFE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    fontWeight: 700,
    color: '#1D4ED8',
    flexShrink: 0,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  email: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: 500,
  },
  value: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: '11px 0',
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
}
