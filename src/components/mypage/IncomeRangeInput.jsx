import Icon from '../../styles/Icon'

export default function IncomeRangeInput({ min, max, onChangeMin, onChangeMax }) {
  return (
    <div>
      <label style={styles.label}>
        <Icon name="payments" size={15} color="#374151"/>
        연 소득
      </label>
      <div style={styles.row}>
        <input
          type="number"
          style={styles.input}
          value={min}
          onChange={e => onChangeMin(e.target.value)}
          placeholder="최소"
          min={0}
        />
        <span style={styles.tilde}>~</span>
        <input
          type="number"
          style={styles.input}
          value={max}
          onChange={e => onChangeMax(e.target.value)}
          placeholder="최대"
          min={0}
        />
        <span style={styles.unit}>만원</span>
      </div>
      <div style={styles.hint}>세전 기준 연간 소득을 입력해주세요</div>
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
  },
  input: {
    flex: 1,
    maxWidth: 130,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid #d1d5db',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  tilde: {
    fontSize: 16,
    color: '#6b7280',
    flexShrink: 0,
  },
  unit: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
    flexShrink: 0,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
}
