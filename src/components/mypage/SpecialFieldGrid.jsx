import Icon from '../../styles/Icon'

const FIELDS = [
  { id: 'no_limit',      label: '제한없음' },
  { id: 'basic_welfare', label: '기초생활수급자' },
  { id: 'near_poverty',  label: '차상위계층' },
  { id: 'disability',    label: '장애인' },
  { id: 'single_parent', label: '한부모가정' },
  { id: 'female',        label: '여성' },
  { id: 'sme',           label: '중소기업' },
  { id: 'local_talent',  label: '지역인재' },
  { id: 'military',      label: '군인' },
  { id: 'farmer',        label: '농업인' },
  { id: 'multicultural', label: '다문화가정' },
  { id: 'defector',      label: '북한이탈주민' },
  { id: 'career_break',  label: '경력단절자' },
  { id: 'homeless',      label: '무주택자' },
  { id: 'single_hh',     label: '1인가구' },
  { id: 'startup',       label: '(예비)창업자' },
  { id: 'farm_return',   label: '귀농/귀촌' },
  { id: 'low_credit',    label: '금융취약자' },
  { id: 'veteran',       label: '보훈대상자' },
  { id: 'foreign',       label: '외국인/재외동포' },
  { id: 'etc',           label: '기타' },
]

export default function SpecialFieldGrid({ value, onChange }) {
  const toggle = (id) => {
    if (id === 'no_limit') {
      onChange(value.includes('no_limit') ? [] : ['no_limit'])
      return
    }
    const next = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value.filter(v => v !== 'no_limit'), id]
    onChange(next)
  }

  return (
    <div>
      <label style={styles.label}>
        <Icon name="grade" size={15} color="#374151"/>
        특화 분야 <span style={styles.multi}>(복수 선택)</span>
      </label>
      <div style={styles.group}>
        {FIELDS.map(f => {
          const active = value.includes(f.id)
          return (
            <button
              key={f.id}
              type="button"
              style={active ? styles.btnActive : styles.btn}
              onClick={() => toggle(f.id)}
            >
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const base = {
  padding: '9px 16px',
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
  multi: {
    fontSize: 12,
    fontWeight: 400,
    color: '#9ca3af',
  },
  group: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    ...base,
    border: '1.5px solid #e5e7eb',
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
