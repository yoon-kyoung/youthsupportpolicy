import { useState } from 'react'
import Icon from '../../styles/Icon'

const CAT = {
  job:    { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', label: '일자리' },
  house:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: '주거' },
  money:  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: '금융' },
  edu:    { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: '교육' },
  health: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', label: '복지' },
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const MONTH_START_OFFSET = 0 // June 1, 2026 = Monday
const MONTH_DAYS = 30

export default function ApplicationCalendar({ applications }) {
  const [offset, setOffset] = useState(0)

  const year = 2026
  const baseMonth = 6
  const displayMonth = baseMonth + offset
  const normalizedMonth = ((displayMonth - 1 + 12) % 12) + 1
  const normalizedYear = year + Math.floor((displayMonth - 1) / 12)

  // day → [{ title, category }]
  const markedDays = {}
  if (offset === 0 && applications) {
    applications.forEach(a => {
      if (a.date.startsWith('2026-06-')) {
        const day = parseInt(a.date.split('-')[2], 10)
        if (!markedDays[day]) markedDays[day] = []
        markedDays[day].push({ title: a.title, category: a.category })
      }
    })
  }

  const startOffset = offset === 0 ? MONTH_START_OFFSET : (MONTH_START_OFFSET + offset * 2) % 7
  const daysInMonth = offset === 0 ? MONTH_DAYS : 30
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = 15

  return (
    <div style={styles.card}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button type="button" style={styles.navBtn} onClick={() => setOffset(o => o - 1)}>
          <Icon name="chevron_left" size={18}/>
        </button>
        <span style={styles.monthLabel}>{normalizedYear}년 {normalizedMonth}월</span>
        <button type="button" style={styles.navBtn} onClick={() => setOffset(o => o + 1)}>
          <Icon name="chevron_right" size={18}/>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div style={styles.weekRow}>
        {WEEKDAYS.map(d => (
          <div
            key={d}
            style={{
              ...styles.weekDay,
              color: d === '일' ? '#ef4444' : d === '토' ? '#007FFF' : '#6b7280',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={styles.emptyCell} />

          const events = markedDays[day] || []
          const isToday = offset === 0 && day === today
          const isSat = (i % 7) === 5
          const isSun = (i % 7) === 6

          return (
            <div key={day} style={styles.cell}>
              {/* 날짜 숫자 */}
              <span
                style={{
                  ...styles.dayNum,
                  color: isToday ? '#ffffff' : isSun ? '#ef4444' : isSat ? '#007FFF' : '#374151',
                  backgroundColor: isToday ? '#007FFF' : 'transparent',
                }}
              >
                {day}
              </span>

              {/* 이벤트 블럭 */}
              {events.length > 0 && (
                <div style={styles.events}>
                  {events.map((ev, idx) => {
                    const c = CAT[ev.category] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' }
                    return (
                      <div
                        key={idx}
                        style={{
                          ...styles.eventBlock,
                          backgroundColor: c.bg,
                          color: c.text,
                          borderLeft: `3px solid ${c.text}`,
                        }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {offset !== 0 && (
        <div style={styles.noData}>이 달 신청 내역이 없습니다</div>
      )}
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '24px 28px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
  },
  weekRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderBottom: '1px solid #f3f4f6',
    marginBottom: 4,
  },
  weekDay: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 0 8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: 'minmax(72px, auto)',
  },
  emptyCell: {
    borderTop: '1px solid #f9fafb',
  },
  cell: {
    borderTop: '1px solid #f3f4f6',
    padding: '6px 4px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  dayNum: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1,
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginLeft: 2,
  },
  events: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    width: '100%',
  },
  eventBlock: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 6px',
    borderRadius: '0 4px 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
    boxSizing: 'border-box',
    lineHeight: 1.4,
  },
  noData: {
    textAlign: 'center',
    fontSize: 12,
    color: '#d1d5db',
    padding: '16px 0 4px',
  },
}
