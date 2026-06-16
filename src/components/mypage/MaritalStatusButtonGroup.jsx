import Icon from '../../styles/Icon'

const OPTIONS = ['미혼', '기혼', '이혼', '사별']

export default function MaritalStatusButtonGroup({ value, onChange }) {
  return (
    <div>
      <label style={styles.label}>
        <Icon name="favorite" size={15} color="#374151"/>
        혼인 여부
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
  padding: '8px 20px',
  borderRadius: 20,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
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
