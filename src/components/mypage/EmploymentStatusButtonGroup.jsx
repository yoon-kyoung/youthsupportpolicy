import Icon from '../../styles/Icon'

const OPTIONS = [
  '제한없음',
  '재직자',
  '자영업자',
  '미취업자',
  '프리랜서',
  '일용근로자',
  '(예비)창업자',
  '단기근로자',
  '영농종사자',
  '기타',
]

export default function EmploymentStatusButtonGroup({ value, onChange }) {
  return (
    <div>
      <label style={styles.label}>
        <Icon name="work" size={15} color="#374151"/>
        취업 상태
      </label>
      <div style={styles.group}>
        {OPTIONS.map(opt => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              style={active ? styles.btnActive : styles.btn}
              onClick={() => onChange(active ? '' : opt)}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const base = {
  padding: '8px 16px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
}

const styles = {
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 10,
  },
  group: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    ...base,
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
  },
  btnActive: {
    ...base,
    border: '1.5px solid #BFDBFE',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontWeight: 600,
  },
}
