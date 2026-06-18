import { useState } from 'react'

const SUGGESTIONS = ['IT', '서울', '재택', '정규직', '스타트업', '공공기관', '중소기업', '연구직']

export default function KeywordTagInput({ value, onChange }) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const add = (word) => {
    const trimmed = (word ?? input).trim()
    if (!trimmed || value.includes(trimmed)) { setInput(''); return }
    onChange([...value, trimmed])
    setInput('')
  }

  const remove = (kw) => onChange(value.filter(k => k !== kw))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && input === '' && value.length > 0) remove(value[value.length - 1])
  }

  const unusedSuggestions = SUGGESTIONS.filter(s => !value.includes(s))

  return (
    <div style={styles.wrapper}>
      {/* 헤더 행 */}
      <div style={styles.headerRow}>
        <div style={styles.labelGroup}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#1D4ED8' }}>label</span>
          <span style={styles.label}>선택 키워드</span>
          <span style={styles.badge}>공고 필터링</span>
        </div>
        <span style={styles.desc}>키워드를 포함한 공고를 우선 추천해드려요</span>
      </div>

      {/* 가로형 입력 영역 */}
      <div style={styles.inputRow}>
        {/* 태그 + 인풋 인라인 박스 */}
        <div style={{ ...styles.tagBox, borderColor: focused ? '#007FFF' : '#d1d5db' }}>
          {value.map(kw => (
            <span key={kw} style={styles.tag}>
              {kw}
              <button type="button" style={styles.tagRemove} onClick={() => remove(kw)}>×</button>
            </span>
          ))}
          <input
            style={styles.inlineInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={value.length === 0 ? '키워드 입력 후 Enter' : '+ 추가'}
            maxLength={20}
          />
        </div>
        <button
          type="button"
          style={input.trim() ? styles.addBtn : styles.addBtnDisabled}
          onClick={() => add()}
          disabled={!input.trim()}
        >
          추가
        </button>
      </div>

      {/* 추천 키워드 */}
      {unusedSuggestions.length > 0 && (
        <div style={styles.suggestions}>
          <span style={styles.suggestionLabel}>추천</span>
          {unusedSuggestions.map(s => (
            <button key={s} type="button" style={styles.suggestionChip} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  labelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: '#374151',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#007FFF',
    backgroundColor: '#F0F7FF',
    padding: '2px 8px',
    borderRadius: 20,
  },
  desc: {
    fontSize: 12,
    color: '#9ca3af',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tagBox: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    minHeight: 44,
    transition: 'border-color 0.15s',
    cursor: 'text',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    color: '#007FFF',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #007FFF',
    whiteSpace: 'nowrap',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
    cursor: 'pointer',
    fontWeight: 400,
  },
  inlineInput: {
    flex: 1,
    minWidth: 100,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#111827',
    backgroundColor: 'transparent',
    padding: '2px 0',
  },
  addBtn: {
    flexShrink: 0,
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#007FFF',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  addBtnDisabled: {
    flexShrink: 0,
    padding: '10px 18px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'not-allowed',
    whiteSpace: 'nowrap',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 500,
  },
  suggestionChip: {
    padding: '4px 12px',
    borderRadius: 20,
    border: '1.5px dashed #d1d5db',
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}
