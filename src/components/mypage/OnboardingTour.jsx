import { useState, useEffect, useCallback, useRef } from 'react'
import Icon from '../../styles/Icon'

const STEPS = [
  {
    selector: '[data-tour="prefs-content"]',
    icon: 'tune',
    iconColor: '#6D28D9',
    iconBg: '#F5F3FF',
    title: '맞춤 조건 설정',
    desc: '지역, 나이, 소득 수준을 설정하면 나에게 딱 맞는 정책만 골라볼 수 있어요. 언제든 맞춤 조건 탭에서 변경할 수 있습니다.',
  },
  {
    selector: '[data-tour="calendar"]',
    icon: 'calendar_today',
    iconColor: '#1D4ED8',
    iconBg: '#EFF6FF',
    title: '마감일 달력',
    desc: '저장한 정책의 마감일이 달력에 자동으로 표시돼요. 신청 진행 상태와 메모도 함께 확인할 수 있고, 날짜 블록을 누르면 해당 정책 상세 페이지로 바로 이동할 수 있어요.',
  },
  {
    selector: '[data-tour="saved-content"]',
    icon: 'bookmark',
    iconColor: '#f59e0b',
    iconBg: '#FFFBEB',
    title: '북마크 저장 · 취소',
    desc: '별/북마크 아이콘을 누르면 정책이 저장됩니다. 저장한 정책 목록에서 북마크를 다시 누르면 저장이 취소돼요. 실수했을 땐 3초 안에 "실행취소"를 눌러 되돌릴 수 있어요.',
  },
]

const PAD      = 12   // spotlight 여백
const CARD_W   = 320
const CARD_H   = 240  // 카드 높이 추정치
const MARGIN   = 12   // 화면 가장자리 최소 여백
const GAP      = 8    // spotlight ↔ 카드 간격

export default function OnboardingTour({ onDismiss, onStep }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const [win,  setWin]  = useState({ w: window.innerWidth, h: window.innerHeight })
  const rafRef = useRef(null)

  // getBoundingClientRect를 즉시 측정 (스크롤 추적용)
  const measure = useCallback((idx) => {
    const el = document.querySelector(STEPS[idx].selector)
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height })
  }, [])

  // 탭 전환 직후 DOM 안정화 기다렸다가 측정
  const measureAfterRender = useCallback((idx) => {
    const attempt = (tries = 0) => {
      const el = document.querySelector(STEPS[idx].selector)
      if (!el) {
        if (tries < 10) setTimeout(() => attempt(tries + 1), 150)
        return
      }
      setTimeout(() => measure(idx), 200)
    }
    attempt()
  }, [measure])

  useEffect(() => {
    setRect(null)
    onStep?.(step)
    const t = setTimeout(() => measureAfterRender(step), 80)

    // 스크롤 시 카드/spotlight 실시간 추적
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => measure(step))
    }
    const onResize = () => {
      setWin({ w: window.innerWidth, h: window.innerHeight })
      measureAfterRender(step)
    }

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [step, measure, measureAfterRender, onStep])

  const goNext = () => {
    if (step < STEPS.length - 1) { setRect(null); setStep(s => s + 1) }
    else onDismiss()
  }

  // rect 확정 전엔 렌더링 안 함 (깜빡임 방지)
  if (!rect) return null

  const s   = STEPS[step]
  const W   = win.w
  const H   = win.h

  // spotlight 박스 좌표
  const sl = rect.left   - PAD
  const st = rect.top    - PAD
  const sr = rect.right  + PAD
  const sb = rect.bottom + PAD
  const sw = sr - sl
  const sh = sb - st

  // ── 카드 가로 위치 결정 ──────────────────────────────────────────
  // 1순위: spotlight 오른쪽 바깥
  let cardLeft = sr + GAP
  if (cardLeft + CARD_W + MARGIN > W) {
    // 2순위: spotlight 왼쪽 바깥
    cardLeft = sl - GAP - CARD_W
  }
  if (cardLeft < MARGIN) {
    // 3순위: spotlight 안쪽 오른쪽 끝 (element가 너무 넓을 때)
    cardLeft = Math.max(MARGIN, Math.min(sr - CARD_W - GAP, W - CARD_W - MARGIN))
  }

  // ── 카드 세로 위치: spotlight 상단에 맞추고 viewport 안으로 클램프 ──
  let cardTop = st
  if (cardTop + CARD_H + MARGIN > H) cardTop = H - CARD_H - MARGIN
  if (cardTop < MARGIN)              cardTop = MARGIN

  // spotlight SVG hole path
  const R = 16
  const holePath =
    `M ${sl+R},${st} H ${sr-R} Q ${sr},${st} ${sr},${st+R} ` +
    `V ${sb-R} Q ${sr},${sb} ${sr-R},${sb} ` +
    `H ${sl+R} Q ${sl},${sb} ${sl},${sb-R} ` +
    `V ${st+R} Q ${sl},${st} ${sl+R},${st} Z`

  return (
    <>
      {/* 반투명 오버레이 + spotlight 구멍 */}
      <svg
        style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}
        width={W} height={H}
      >
        <path
          fillRule="evenodd"
          fill="rgba(0,0,0,0.32)"
          d={`M 0,0 H ${W} V ${H} H 0 Z ${holePath}`}
        />
        <rect x={sl} y={st} width={sw} height={sh} rx={R} ry={R}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
        />
      </svg>

      {/* 툴팁 카드 */}
      <div style={{
        position: 'fixed',
        top: cardTop,
        left: cardLeft,
        width: CARD_W,
        zIndex: 9002,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: '20px 20px 16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {/* 닫기 */}
        <button type="button" onClick={onDismiss} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center',
        }}>
          <Icon name="close" size={16} color="#9ca3af" />
        </button>

        {/* 스텝 도트 */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              backgroundColor: i === step ? '#1D4ED8' : '#e5e7eb',
              transition: 'all 0.2s',
            }} />
          ))}
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* 아이콘 + 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: s.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={s.icon} size={22} color={s.iconColor} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
            {s.title}
          </div>
        </div>

        {/* 설명 */}
        <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, paddingLeft: 2 }}>
          {s.desc}
        </div>

        {/* 버튼 행 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <button type="button" onClick={onDismiss} style={{
            background: 'none', border: 'none', color: '#6b7280', fontSize: 12,
            cursor: 'pointer', padding: '4px 0',
            textDecoration: 'underline', textDecorationColor: '#9ca3af',
          }}>
            다시 보지 않기
          </button>
          <button type="button" onClick={goNext} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            backgroundColor: '#1D4ED8', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {step < STEPS.length - 1
              ? <><span>다음</span><Icon name="arrow_forward" size={14} color="white" /></>
              : <><Icon name="check" size={14} color="white" /><span>시작하기</span></>
            }
          </button>
        </div>
      </div>
    </>
  )
}
