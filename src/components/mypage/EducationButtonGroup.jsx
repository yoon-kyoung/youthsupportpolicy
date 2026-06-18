import Icon from '../../styles/Icon'

const OPTIONS = [
  '중졸 이하',
  '고교 재학',
  '고교 졸업',
  '전문대 재학',
  '전문대 졸업',
  '대학 재학',
  '대학 졸업',
  '대학원 재학',
  '대학원 졸업',
  '기타',
]

export default function EducationButtonGroup({ value, onChange }) {
  return (
    <div>
      <label style={styles.label}>
        <Icon name="school" size={15} color="#374151"/>
        학력
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
    border: '1.5px solid #007FFF',
    backgroundColor: '#F0F7FF',
    color: '#007FFF',
    fontWeight: 600,
  },
}
