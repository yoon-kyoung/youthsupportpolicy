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
    placement: 'right',
  },
  {
    selector: '[data-tour="calendar"]',
    icon: 'calendar_today',
    iconColor: '#1D4ED8',
    iconBg: '#EFF6FF',
    title: '마감일 달력',
    desc: '저장한 정책의 마감일이 달력에 자동으로 표시돼요. 신청 진행 상태와 메모도 함께 확인할 수 있고, 날짜 블록을 누르면 해당 정책 상세 페이지로 바로 이동할 수 있어요.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="saved-content"]',
    icon: 'bookmark',
    iconColor: '#f59e0b',
    iconBg: '#FFFBEB',
    title: '북마크 저장 · 취소',
    desc: '별/북마크 아이콘을 누르면 정책이 저장됩니다. 저장한 정책 목록에서 북마크를 다시 누르면 저장이 취소돼요. 실수했을 땐 3초 안에 "실행취소"를 눌러 되돌릴 수 있어요.',
    placement: 'right',
  },
]

const PAD = 12   // spotlight 여백
const CARD_W = 320

export default function OnboardingTour({ onDismiss, onStep }) {
  const [step, setStep]   = useState(0)
  const [rect, setRect]   = useState(null)
  const [winH, setWinH]   = useState(window.innerHeight)
  const [winW, setWinW]   = useState(window.innerWidth)
  const anchorRef = useRef(null) // step 0 rect 기준 카드 앵커 위치

  const updateRect = useCallback((idx) => {
    const tryFind = (attempts = 0) => {
      const el = document.querySelector(STEPS[idx].selector)
      if (!el) {
        if (attempts < 8) setTimeout(() => tryFind(attempts + 1), 150)
        return
      }
      setTimeout(() => {
        const r = el.getBoundingClientRect()
        const br = getComputedStyle(el).borderRadius || '12px'
        const next = { top: r.top, left: r.left, width: r.width, height: r.height, borderRadius: br }
        setRect(next)
        if (idx === 0) anchorRef.current = { top: r.top, right: r.right }
      }, 200)
    }
    tryFind()
  }, [])

  useEffect(() => {
    setRect(null)
    onStep?.(step)
    // 탭 전환 후 DOM 렌더링 기다렸다가 조회
    const t = setTimeout(() => updateRect(step), 80)
    const onResize = () => {
      setWinH(window.innerHeight)
      setWinW(window.innerWidth)
      updateRect(step)
    }
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [step, updateRect])

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setRect(null)
      setStep(s => s + 1)
    } else {
      onDismiss()
    }
  }

  const s = STEPS[step]

  // 스포트라이트 좌표
  const sl = rect ? rect.left  - PAD : 0
  const st = rect ? rect.top   - PAD : 0
  const sw = rect ? rect.width + PAD * 2 : 0
  const sh = rect ? rect.height + PAD * 2 : 0

  // 카드 위치 — step 0(맞춤조건) rect 기준으로 고정
  const anchor   = anchorRef.current
  const cardTop  = anchor ? anchor.top  : (rect ? st : winH * 0.3)
  const cardLeft = anchor ? anchor.right + 16 : (winW - CARD_W - 32)

  const R = rect ? Math.max(parseInt(rect.borderRadius) || 0, 16) : 16

  // SVG rounded-rect hole path (even-odd)
  const holePath = rect
    ? `M ${sl+R},${st} H ${sl+sw-R} Q ${sl+sw},${st} ${sl+sw},${st+R} V ${st+sh-R} Q ${sl+sw},${st+sh} ${sl+sw-R},${st+sh} H ${sl+R} Q ${sl},${st+sh} ${sl},${st+sh-R} V ${st+R} Q ${sl},${st} ${sl+R},${st} Z`
    : ''

  // rect 확정 전엔 아무것도 안 그림 (깜빡임 방지)
  if (!rect) return null

  return (
    <>
      {/* SVG 오버레이 — 둥근 구멍이 뚫린 단일 레이어 */}
      <svg
        style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}
        width={winW}
        height={winH}
      >
        <path
          fillRule="evenodd"
          fill="rgba(0,0,0,0.3)"
          d={`M 0,0 H ${winW} V ${winH} H 0 Z ${holePath}`}
        />
        {/* 스포트라이트 테두리 */}
        {rect && (
          <rect
            x={sl} y={st} width={sw} height={sh}
            rx={R} ry={R}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* 툴팁 카드 */}
      <div
        style={{
          position: 'fixed',
          top: cardTop,
          left: cardLeft,
          width: CARD_W,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '20px 20px 16px',
          zIndex: 9002,
          boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* 닫기 */}
        <button
          type="button"
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            color: '#9ca3af',
          }}
          title="투어 종료"
        >
          <Icon name="close" size={16} color="#9ca3af" />
        </button>

        {/* 스텝 표시 */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === step ? '#1D4ED8' : '#e5e7eb',
                transition: 'all 0.2s',
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* 아이콘 + 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: s.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
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
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: 12,
              cursor: 'pointer',
              padding: '4px 0',
              textDecoration: 'underline',
              textDecorationColor: '#9ca3af',
            }}
          >
            다시 보지 않기
          </button>

          <button
            type="button"
            onClick={goNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '9px 18px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#1D4ED8',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {step < STEPS.length - 1 ? (
              <><span>다음</span><Icon name="arrow_forward" size={14} color="white" /></>
            ) : (
              <><Icon name="check" size={14} color="white" /><span>시작하기</span></>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
