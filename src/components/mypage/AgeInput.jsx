import Icon from '../../styles/Icon'

export default function AgeInput({ value, onChange }) {
  return (
    <div>
      <label style={styles.label}>
        <Icon name="cake" size={15} color="#374151"/>
        연령
      </label>
      <div style={styles.row}>
        <input
          type="number"
          style={styles.input}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="만 나이 입력"
          min={15}
          max={39}
        />
        <span style={styles.unit}>세</span>
      </div>
      <div style={styles.hint}>청년 기준: 만 15세 ~ 39세</div>
    </div>
  )
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
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    maxWidth: 160,
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid #d1d5db',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  unit: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
}
