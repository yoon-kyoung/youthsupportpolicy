import { useState } from 'react'
import Icon from '../../styles/Icon'

const CAT = {
  job:    { bg: '#E0F2FE', text: '#0369A1', label: '일자리' },
  house:  { bg: '#F0FDF4', text: '#15803D', label: '주거' },
  money:  { bg: '#FFFBEB', text: '#B45309', label: '금융' },
  edu:    { bg: '#F5F3FF', text: '#6D28D9', label: '교육' },
  health: { bg: '#FFF1F2', text: '#BE123C', label: '복지' },
}

const STATUSES = [
  { id: 'ready',   label: '지원준비중', active: '#EFF6FF', activeText: '#1D4ED8', activeBorder: '#BFDBFE' },
  { id: 'applied', label: '지원완료',   active: '#DCFCE7', activeText: '#15803D', activeBorder: '#BBF7D0' },
  { id: 'review',  label: '심사중',     active: '#FEF3C7', activeText: '#B45309', activeBorder: '#FDE68A' },
  { id: 'waiting', label: '결과대기',   active: '#EDE9FE', activeText: '#6D28D9', activeBorder: '#DDD6FE' },
  { id: 'done',    label: '완료',       active: '#DCFCE7', activeText: '#15803D', activeBorder: '#BBF7D0' },
]

const STATUS_ORDER = STATUSES.map(s => s.id)
const LS_STATUS = 'yoa:apply-status'
const LS_MEMO   = 'yoa:apply-memo'

function loadLS(key, init) {
  try { return JSON.parse(localStorage.getItem(key)) ?? init } catch { return init }
}

export default function JoinHistoryCard({ policies, favIds, onGoDetail }) {
  const saved = (policies || []).filter(p => favIds?.has(p.id))

  const [statuses,  setStatuses]  = useState(() => loadLS(LS_STATUS, {}))
  const [memos,     setMemos]     = useState(() => loadLS(LS_MEMO,   {}))
  const [drafts,    setDrafts]    = useState({})   // 아직 저장 안 된 메모 초안
  const [memoOpen,  setMemoOpen]  = useState({})   // 메모 섹션 열림 여부
  const [savedFlag, setSavedFlag] = useState({})   // "저장됨" 피드백

  const handleStatus = (policyId, statusId) => {
    const next = { ...statuses, [policyId]: statusId }
    setStatuses(next)
    localStorage.setItem(LS_STATUS, JSON.stringify(next))
  }

  const toggleMemo = (policyId) => {
    setMemoOpen(prev => ({ ...prev, [policyId]: !prev[policyId] }))
    // 열 때 현재 저장된 값으로 초기화
    if (!memoOpen[policyId]) {
      setDrafts(prev => ({ ...prev, [policyId]: memos[policyId] || '' }))
    }
  }

  const handleSaveMemo = (policyId) => {
    const text = drafts[policyId] ?? ''
    const next = { ...memos, [policyId]: text }
    setMemos(next)
    localStorage.setItem(LS_MEMO, JSON.stringify(next))
    setSavedFlag(prev => ({ ...prev, [policyId]: true }))
    setTimeout(() => setSavedFlag(prev => ({ ...prev, [policyId]: false })), 2000)
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.titleWrap}>
          <Icon name="receipt_long" size={16} color="#111827" />
          <span style={styles.title}>신청 내역</span>
        </div>
        <span style={styles.count}>{saved.length}건</span>
      </div>

      {saved.length === 0 ? (
        <div style={styles.empty}>
          <Icon name="bookmark" size={36} color="#d1d5db" />
          <div style={styles.emptyTitle}>저장한 정책이 없습니다</div>
          <div style={styles.emptyDesc}>
            검색 또는 AI 챗봇에서 정책을 저장하면<br />
            여기서 진행 상태와 메모를 관리할 수 있어요
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          {saved.map(p => {
            const c           = CAT[p.cat] || { bg: '#f3f4f6', text: '#374151', label: '기타' }
            const currentStatus = statuses[p.id] || 'ready'
            const currentIdx  = STATUS_ORDER.indexOf(currentStatus)
            const isOpen      = !!memoOpen[p.id]
            const draft       = drafts[p.id] ?? memos[p.id] ?? ''
            const isSaved     = !!savedFlag[p.id]
            const hasMemo     = !!(memos[p.id])

            return (
              <div key={p.id} style={styles.item}>
                {/* 제목 행 */}
                <div style={styles.itemTop}>
                  <span style={{ ...styles.catBadge, backgroundColor: c.bg, color: c.text }}>
                    {c.label}
                  </span>
                  <span
                    style={{
                      ...styles.itemTitle,
                      cursor: onGoDetail ? 'pointer' : 'default',
                      textDecoration: onGoDetail ? 'underline' : 'none',
                      textDecorationColor: '#cbd5e1',
                      textUnderlineOffset: '2px',
                    }}
                    onClick={() => onGoDetail?.(p)}
                  >
                    {p.title}
                  </span>
                  <span style={styles.deadline}>
                    {p.deadline === '상시' ? '상시 접수' : `마감 ${p.deadline}`}
                  </span>
                </div>

                {/* 상태 스텝 */}
                <div style={styles.stepRow}>
                  {STATUSES.map((s, i) => {
                    const isActive = currentStatus === s.id
                    const isPast   = i < currentIdx
                    return (
                      <div key={s.id} style={styles.stepWrap}>
                        <button
                          type="button"
                          onClick={() => handleStatus(p.id, s.id)}
                          style={{
                            ...styles.stepBtn,
                            backgroundColor: isActive ? s.active : isPast ? '#f0fdf4' : '#f9fafb',
                            color:           isActive ? s.activeText : isPast ? '#15803D' : '#9ca3af',
                            border:          isActive ? `1.5px solid ${s.activeBorder}` : isPast ? '1.5px solid #BBF7D0' : '1.5px solid #e5e7eb',
                            fontWeight:      isActive ? 700 : 400,
                          }}
                        >
                          {isPast && !isActive && <Icon name="check_circle" size={12} color="#15803D" />}
                          {s.label}
                        </button>
                        {i < STATUSES.length - 1 && (
                          <span style={{ ...styles.arrow, color: i < currentIdx ? '#15803D' : '#d1d5db' }}>›</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 메모 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => toggleMemo(p.id)}
                  style={{
                    ...styles.memoToggleBtn,
                    color: isOpen ? '#1D4ED8' : hasMemo ? '#374151' : '#9ca3af',
                    borderColor: isOpen ? '#BFDBFE' : '#e5e7eb',
                    backgroundColor: isOpen ? '#EFF6FF' : '#f9fafb',
                  }}
                >
                  <Icon name={isOpen ? 'expand_less' : 'edit_note'} size={14} color={isOpen ? '#1D4ED8' : hasMemo ? '#374151' : '#9ca3af'} />
                  {hasMemo && !isOpen ? `메모 보기 · ${memos[p.id]}` : isOpen ? '메모 접기' : '메모 추가'}
                </button>

                {/* 메모 입력 영역 (접기/펴기) */}
                {isOpen && (
                  <div style={styles.memoArea}>
                    <input
                      type="text"
                      placeholder="준비 서류, 신청 일정, 참고 사항 등을 입력하세요"
                      value={draft}
                      onChange={e => setDrafts(prev => ({ ...prev, [p.id]: e.target.value }))}
                      style={styles.memoInput}
                      onFocus={e => { e.target.style.borderColor = '#1D4ED8'; e.target.style.backgroundColor = '#ffffff' }}
                      onBlur={e =>  { e.target.style.borderColor = '#e5e7eb'; e.target.style.backgroundColor = '#f9fafb' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveMemo(p.id) }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveMemo(p.id)}
                      style={{
                        ...styles.memoSaveBtn,
                        backgroundColor: isSaved ? '#15803D' : '#1D4ED8',
                        borderColor:     isSaved ? '#15803D' : '#1D4ED8',
                      }}
                    >
                      {isSaved
                        ? <><Icon name="check" size={14} color="white" /> 저장됨</>
                        : <><Icon name="save" size={14} color="white" /> 저장</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
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
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  title: {
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
    gap: 12,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 16px',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    border: '1px solid #f3f4f6',
  },
  itemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  catBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 12,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  itemTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: 600,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deadline: {
    fontSize: 11,
    color: '#9ca3af',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  stepWrap: {
    display: 'flex',
    alignItems: 'center',
  },
  stepBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    borderRadius: 20,
    fontSize: 12,
    lineHeight: 1,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  arrow: {
    fontSize: 16,
    lineHeight: 1,
    padding: '0 3px',
    userSelect: 'none',
  },
  memoToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    width: 'fit-content',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  memoArea: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  memoInput: {
    flex: 1,
    padding: '9px 12px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    fontSize: 13,
    color: '#374151',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  memoSaveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '9px 16px',
    borderRadius: 8,
    border: '1.5px solid',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s, border-color 0.2s',
    lineHeight: 1,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
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
