import { useState, useRef } from 'react'
import Icon from '../../styles/Icon'

const CAT = {
  job:    { bg: '#E0F2FE', text: '#0369A1', label: '일자리' },
  house:  { bg: '#F0FDF4', text: '#15803D', label: '주거' },
  money:  { bg: '#FFFBEB', text: '#B45309', label: '금융' },
  edu:    { bg: '#F5F3FF', text: '#6D28D9', label: '교육' },
  health: { bg: '#FFF1F2', text: '#BE123C', label: '복지' },
}

export default function SavedPoliciesTab({ policies, favIds, onToggleFav, onGoDetail }) {
  const saved = (policies || []).filter(p => favIds?.has(p.id))
  const [pendingIds, setPendingIds] = useState(new Set())
  const timerRefs = useRef({})

  const handleBookmarkClick = (id) => {
    if (pendingIds.has(id)) {
      // 실행취소: 타이머 취소하고 복원
      clearTimeout(timerRefs.current[id])
      delete timerRefs.current[id]
      setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    } else {
      // 3초 후 실제 삭제
      setPendingIds(prev => new Set([...prev, id]))
      timerRefs.current[id] = setTimeout(() => {
        onToggleFav(id)
        setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n })
        delete timerRefs.current[id]
      }, 3000)
    }
  }

  if (saved.length === 0) {
    return (
      <div style={styles.empty}>
        <Icon name="bookmark" size={40} color="#d1d5db" />
        <div style={styles.emptyTitle}>저장한 정책이 없어요</div>
        <div style={styles.emptyDesc}>
          마음에 드는 정책을 저장하면<br />여기서 한눈에 모아볼 수 있어요.
        </div>
        <div style={styles.emptyActions}>
          <button
            type="button"
            style={styles.actionBtn}
            onClick={() => onNavigate?.('search')}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#007FFF'; e.currentTarget.style.color = '#007FFF' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#374151' }}
          >
            <Icon name="search" size={16} color="currentColor" />
            정책 검색하기
          </button>
          <button
            type="button"
            style={styles.actionBtnPrimary}
            onClick={() => onNavigate?.('chatbot')}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icon name="auto_awesome" size={16} color="#ffffff" />
            AI 챗봇으로 찾기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap} data-tour="saved-content">
      <div style={styles.header}>
        <span style={styles.title}>
          <Icon name="bookmark" size={16} color="#111827" style={{ marginRight: 6 }} />
          저장한 정책
        </span>
        <span style={styles.count}>{saved.length}건</span>
      </div>
      <div style={styles.list} data-tour="saved-content">
        {saved.map(p => {
          const c = CAT[p.cat] || CAT[p.category] || { bg: '#f3f4f6', text: '#374151', label: '기타' }
          const isPending = pendingIds.has(p.id)

          return (
            <div
              key={p.id}
              style={{
                ...styles.item,
                opacity: isPending ? 0.55 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={styles.itemLeft}>
                <span style={{ ...styles.badge, backgroundColor: c.bg, color: c.text }}>
                  {c.label}
                </span>
                <span
                  style={{
                    ...styles.itemTitle,
                    cursor: onGoDetail ? 'pointer' : 'default',
                    textDecoration: onGoDetail ? 'underline' : 'none',
                    textDecorationColor: '#cbd5e1',
                    textUnderlineOffset: '2px',
                    textDecorationStyle: isPending ? 'line-through' : 'solid',
                    color: isPending ? '#9ca3af' : '#374151',
                  }}
                  onClick={() => !isPending && onGoDetail?.(p)}
                >
                  {p.title}
                </span>
              </div>

              <div style={styles.actionArea}>
                {isPending && (
                  <button
                    type="button"
                    onClick={() => handleBookmarkClick(p.id)}
                    style={styles.undoBtn}
                  >
                    실행취소
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleBookmarkClick(p.id)}
                  title={isPending ? '취소 중 (클릭해서 되돌리기)' : '저장 취소'}
                  style={styles.removeBtn}
                  onMouseEnter={e => !isPending && (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => !isPending && (e.currentTarget.style.color = '#f59e0b')}
                >
                  <Icon
                    name="bookmark"
                    size={18}
                    color={isPending ? '#d1d5db' : '#f59e0b'}
                  />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div style={styles.hint}>
        <Icon name="info" size={13} color="#9ca3af" />
        <span>북마크 아이콘을 누르면 저장이 취소됩니다. 3초 안에 실행취소할 수 있어요.</span>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
    display: 'flex',
    alignItems: 'center',
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
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s',
  },
  actionArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  undoBtn: {
    background: 'none',
    border: '1px solid #fca5a5',
    borderRadius: 6,
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    fontSize: 11,
    color: '#9ca3af',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '56px 20px 52px',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1E293B',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.7,
    marginBottom: 6,
  },
  emptyActions: {
    display: 'flex',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    lineHeight: 1,
    padding: '10px 18px',
    borderRadius: 10,
    border: '1.5px solid #E2E8F0',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  actionBtnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    lineHeight: 1,
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#007FFF',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
}
