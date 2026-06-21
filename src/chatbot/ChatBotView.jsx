import { useState, useRef, useEffect, useCallback } from 'react'
import {
  clearAllSessions,
  deriveTitle,
  getLastSessionId,
  getSession,
  listSessions,
  newId,
  removeSession,
  saveSession,
  setLastSessionId,
} from './chatStore'
import { API_BASE, QUESTION_LIMIT } from './config'
import { SIDO_LIST, FIELD_OPTIONS } from './codes'
import { recommendPolicies, policiesByIds } from './recommend'
import { loadPolicies } from './policiesStore'
import PolicyCardMini from './PolicyCardMini'
import { C } from '../styles/colors'
import Icon from '../styles/Icon'

const SUGGESTIONS = [
  '27살 서울 사는데 월세 지원 있을까?',
  '25살 경기, 취업 준비 중인데 받을 수 있는 거 알려줘',
  '대학생인데 학자금이나 교육 지원 궁금해',
]

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  )
}

// 봇 응답에서 "💬 이어서 물어보세요" 블록 파싱 → { body, followups[] }. 헤더 없으면 원문 폴백.
function parseFollowups(text) {
  if (!text) return { body: text ?? '', followups: [] }
  const lines = text.split('\n')
  const headerIdx = lines.findIndex((l) => l.includes('이어서 물어보세요'))
  if (headerIdx === -1) return { body: text, followups: [] }
  const isBullet = (l) => { const t = l.trimStart(); return t.startsWith('· ') || t.startsWith('- ') || t.startsWith('• ') }
  const stripBullet = (l) => l.trimStart().replace(/^[·•-]\s+/, '').trim()
  const followups = []
  let i = headerIdx + 1
  for (; i < lines.length; i++) {
    const raw = lines[i]
    if (raw.trim() === '') continue
    if (!isBullet(raw)) break
    const q = stripBullet(raw)
    if (q) followups.push(q)
  }
  const body = [...lines.slice(0, headerIdx), ...lines.slice(i)].join('\n').trim()
  return { body, followups: [...new Set(followups)].slice(0, 4) }
}

function useLocalStorageState(key, init) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key)
      return s !== null ? JSON.parse(s) : init
    } catch { return init }
  })
  const set = (upd) => {
    setVal(prev => {
      const next = typeof upd === 'function' ? upd(prev) : upd
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }
  return [val, set]
}

function PrivacyInfoSection({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <Icon name={icon} size={11} color="#007FFF"/>
        {title}
      </div>
      {children}
    </div>
  )
}

function PrivacyNoticePanel({ bp }) {
  const [collapsed, setCollapsed] = useLocalStorageState('yoa:privacy:collapsed', true)
  const isMobile = bp === 'mobile'

  return (
    <div style={{
      position: 'absolute', bottom: 12, right: 12,
      width: collapsed ? 'auto' : (isMobile ? 'calc(100vw - 24px)' : '340px'),
      maxWidth: isMobile ? 'calc(100vw - 24px)' : '340px',
      zIndex: 10,
      ...(collapsed ? {} : {
        border: '1.5px solid #e2e8f0', borderRadius: 18, overflow: 'hidden',
        background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      }),
    }}>
      {/* 펼쳐진 상태: 내용 + 접기 버튼 */}
      {!collapsed && (
        <>
        <div style={{
          padding: isMobile ? '10px 12px 12px' : '12px 14px 14px',
          maxHeight: '40vh', overflowY: 'auto',
        }}>

          {/* 수집하는 정보 */}
          <PrivacyInfoSection icon="database" title="수집하는 정보">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['챗봇 대화 내용 (질문 및 답변)', '이용 일시 및 접속 환경 (브라우저 종류 등)'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#007FFF', marginTop: 6, flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </PrivacyInfoSection>

          {/* 비로그인 vs 로그인 */}
          <PrivacyInfoSection icon="person" title="비로그인 vs 로그인">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 7 }}>
              {/* 비로그인 */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 5 }}>비로그인</div>
                {['챗봇 기본 기능 이용 가능', '이름·연락처 등 개인 식별 정보 미수집', '대화 기록 저장 불가', '맞춤 정책 추천 제한'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', marginBottom: 3 }}>
                    <span style={{ color: '#d1d5db', fontSize: 11, lineHeight: 1.4, flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
              {/* 로그인 */}
              <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #BFDBFE' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  로그인
                  <span style={{ fontSize: 9, background: '#007FFF', color: 'white', borderRadius: 99, padding: '1px 5px', fontWeight: 700 }}>권장</span>
                </div>
                {['챗봇 기본 기능 이용 가능', '대화 기록 저장 및 이어보기', '관심 정책 찜·알림 기능', '나이·지역 기반 맞춤 추천'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', marginBottom: 3 }}>
                    <Icon name="check" size={10} color="#22c55e"/>
                    <span style={{ fontSize: 10, color: '#1D4ED8', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{
              margin: 0, fontSize: 10, color: '#6b7280', lineHeight: 1.6,
              background: '#f8fafc', borderRadius: 8, padding: '7px 10px', border: '1px solid #e2e8f0',
            }}>
              로그인 없이도 챗봇을 이용하실 수 있습니다. 단, 로그인 시 더 정확한 정책 추천과 기록 저장 서비스를 제공받으실 수 있습니다.
            </p>
          </PrivacyInfoSection>

          {/* 수집 목적 */}
          <PrivacyInfoSection icon="analytics" title="수집 목적">
            <p style={{ margin: 0, fontSize: 11, color: '#374151', lineHeight: 1.6 }}>
              서비스 품질 개선 및 AI 응답 정확도 향상을 위해 대화 내용을 분석합니다.
            </p>
          </PrivacyInfoSection>

          {/* 보유 기간 */}
          <PrivacyInfoSection icon="schedule" title="보유 기간">
            <p style={{ margin: 0, fontSize: 11, color: '#374151', lineHeight: 1.6 }}>
              수집일로부터 1년간 보유 후 자동 삭제됩니다. 저장을 원하지 않으시면 아래에서 선택하세요.
            </p>
          </PrivacyInfoSection>

        </div>

        {/* 접기 버튼 — 펼쳐진 상태 하단 */}
        <button
          onClick={() => setCollapsed(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px', background: '#F8FAFE',
            border: 'none', borderTop: '1.5px solid #e2e8f0',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,#0052A3,#007FFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(0,127,255,0.22)',
          }}>
            <Icon name="lock" size={18} color="white"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>개인정보 안내</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>챗봇 이용 전 확인해주세요</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: 12, flexShrink: 0 }}>
            <span>접기</span>
            <span style={{ display: 'inline-block', transform: 'rotate(180deg)', transition: 'transform 0.25s', fontSize: 10 }}>▼</span>
          </div>
        </button>
        </>
      )}

      {/* 접힌 상태: 원형 아이콘 + 하단 문구 */}
      {collapsed && (
        <div
          onClick={() => setCollapsed(false)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg,#0052A3,#007FFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,127,255,0.35)',
          }}>
            <Icon name="lock" size={22} color="white"/>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>개인정보 안내</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>챗봇 이용 전 확인해주세요</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatBotView({ bp, favIds, onToggleFav }) {
  const pad = bp === 'desktop' ? '36px 40px' : bp === 'tablet' ? '28px 24px' : '18px 14px'

  // ── 대화 저장/복원 ──
  const [sessionId, setSessionId] = useState(() => getLastSessionId() || newId())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const createdAtRef = useRef(Date.now())
  const hydratedRef = useRef(false)
  const saveTimerRef = useRef(null)
  const activeReqRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [loadErr, setLoadErr] = useState(false)

  const [models, setModels] = useState([])
  const [model, setModel] = useState('')

  const [mode, setMode] = useState('chat')
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: '안녕하세요! 청년정책 안내 챗봇이에요.\n나이·지역·관심사를 편하게 말씀해 주시면 전국 청년정책 중에서 딱 맞는 걸 찾아드릴게요.',
    },
  ])
  const [input, setInput] = useState('')
  const [chipTags, setChipTags] = useState([])
  const [showOptions, setShowOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiHistory, setApiHistory] = useState([])
  const [qCount, setQCount] = useState(0)
  const [remaining, setRemaining] = useState(null)

  const [step, setStep] = useState(null)
  const [answers, setAnswers] = useState({ age: null, region: null, fields: [] })
  const [ageInput, setAgeInput] = useState('')
  const [pickedFields, setPickedFields] = useState([])

  const [started, setStarted] = useState(false)

  const scrollRef = useRef(null)
  const failStreakRef = useRef(0)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, step])

  useEffect(() => {
    loadPolicies()
      .then(() => setReady(true))
      .catch(() => setLoadErr(true))
  }, [])

  // 마지막 세션 복원(이어서 채팅). ready 이후 1회. messages+apiHistory까지 살려 맥락 유지.
  useEffect(() => {
    if (!ready || hydratedRef.current) return
    const last = getLastSessionId()
    const s = last ? getSession(last) : null
    if (s) {
      setSessionId(s.id)
      createdAtRef.current = s.createdAt || Date.now()
      if (s.messages?.length) setMessages(s.messages)
      setApiHistory(s.apiHistory || [])
      setQCount(s.qCount ?? 0)
      setRemaining(s.remaining ?? null)
      if (s.model) setModel(s.model)
      setStarted(true)
    }
    setSessions(listSessions())
    hydratedRef.current = true
  }, [ready])

  // 디바운스 자동 저장
  useEffect(() => {
    if (!hydratedRef.current) return
    const hasUser = messages.some((m) => m.from === 'user')
    const isStreaming = messages.some((m) => m.streaming)
    if (!hasUser || isStreaming || mode === 'guided') return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const saved = saveSession({
        id: sessionId, title: deriveTitle(messages), messages, apiHistory,
        qCount, remaining, model, createdAt: createdAtRef.current,
      })
      if (saved) setLastSessionId(saved.id)
    }, 600)
    return () => saveTimerRef.current && clearTimeout(saveTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, apiHistory, qCount, remaining, model, mode, sessionId])

  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c?.models?.length) {
          setModels(c.models)
          setModel(c.defaultModel || c.models[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const pushBot = (text, policies = null) =>
    setMessages((m) => [...m, { from: 'bot', text, policies }])
  const pushUser = (text) => setMessages((m) => [...m, { from: 'user', text }])
  const patchLast = (patch) =>
    setMessages((m) => {
      const c = [...m]
      c[c.length - 1] = { ...c[c.length - 1], ...patch }
      return c
    })

  const reachedLimit = qCount >= QUESTION_LIMIT

  function flushSave() {
    if (mode === 'guided') return
    if (!messages.some((m) => m.from === 'user')) return
    const saved = saveSession({
      id: sessionId, title: deriveTitle(messages), messages, apiHistory,
      qCount, remaining, model, createdAt: createdAtRef.current,
    })
    if (saved) setLastSessionId(saved.id)
  }

  function startNewSession() {
    flushSave()
    const nid = newId()
    setSessionId(nid)
    setLastSessionId(nid)
    createdAtRef.current = Date.now()
    setMessages([{ from: 'bot', text: '새 대화를 시작했어요! 나이·지역·관심사를 말씀해 주세요.' }])
    setApiHistory([])
    setQCount(0)
    setRemaining(null)
    setInput('')
    setChipTags([])
    setMode('chat')
    setStep(null)
    setDrawerOpen(false)
    setStarted(false)
  }

  const resetSession = startNewSession

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const openDrawer = useCallback(() => { flushSave(); setSessions(listSessions()); setDrawerOpen(true) }, [])

  function loadSession(id) {
    if (id === sessionId) { setDrawerOpen(false); return }
    flushSave()
    const s = getSession(id)
    if (!s) { setDrawerOpen(false); return }
    setSessionId(s.id)
    createdAtRef.current = s.createdAt || Date.now()
    setMessages(s.messages?.length ? s.messages : [])
    setApiHistory(s.apiHistory || [])
    setQCount(s.qCount ?? 0)
    setRemaining(s.remaining ?? null)
    if (s.model) setModel(s.model)
    setMode('chat')
    setStep(null)
    setInput('')
    setLastSessionId(s.id)
    setStarted(true)
    setDrawerOpen(false)
  }

  function deleteSession(id, e) {
    e?.stopPropagation()
    removeSession(id)
    setSessions(listSessions())
    if (id === sessionId) startNewSession()
  }

  function clearAll() {
    if (!confirm('저장된 모든 대화를 삭제할까요? 되돌릴 수 없어요.')) return
    clearAllSessions()
    setSessions([])
    startNewSession()
    setDrawerOpen(false)
  }

  async function sendMessage(text) {
    const tagPart = chipTags.map(c => c.v).join(' ')
    const base = text ?? input
    const content = [tagPart, base].filter(Boolean).join(' ').trim()
    if (!content || loading || reachedLimit) return
    setStarted(true)
    pushUser(content)
    setInput('')
    setChipTags([])
    setLoading(true)

    const history = [...apiHistory, { role: 'user', content }]
    setMessages((m) => [...m, { from: 'bot', text: '', streaming: true }])
    const reqSession = sessionId
    activeReqRef.current = reqSession

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model }),
      })
      if (res.status === 503) throw Object.assign(new Error('no-key'), { fatal: true })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      let ids = []
      try { ids = JSON.parse(res.headers.get('X-Policy-Ids') || '[]') } catch { ids = [] }
      const rem = res.headers.get('X-Remaining')
      if (rem != null) setRemaining(Number(rem))
      const rateLimited = res.headers.get('X-Rate-Limited') === '1'
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
        if (activeReqRef.current !== reqSession) return
        patchLast({ text: full.replace(/^\[POLICY_IDS:[^\]]*\]?\n?/, '') })
      }
      if (activeReqRef.current !== reqSession) return
      const cleanText = full.replace(/^\[POLICY_IDS:[^\]]*\]\n?/, '')
      const { body, followups } = parseFollowups(cleanText)
      const policies = ids.length ? policiesByIds(ids) : null
      patchLast({ text: body || '결과를 가져오지 못했어요.', policies, followups, streaming: false })
      failStreakRef.current = 0
      if (!rateLimited) {
        setApiHistory([...history, { role: 'assistant', content: full }])
        setQCount((c) => c + 1)
      }
    } catch (e) {
      failStreakRef.current += 1
      if (e?.fatal || failStreakRef.current >= 2) {
        patchLast({
          text: 'AI 대화 서버에 연결할 수 없어요.\n대신 단계별 질문으로 찾아드릴게요!',
          streaming: false,
        })
        setMode('guided')
        setStep('age')
        setTimeout(() => pushBot('먼저, 만 나이가 어떻게 되세요?'), 300)
      } else {
        patchLast({
          text: '앗, 응답을 받지 못했어요. 잠시 후 같은 질문을 다시 한번 보내주세요!',
          streaming: false,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  function submitAge() {
    const age = parseInt(ageInput, 10)
    if (!age || age < 9 || age > 99) {
      pushBot('만 나이를 숫자로 정확히 입력해 주세요. (예: 27)')
      return
    }
    pushUser(`만 ${age}세`)
    setAnswers((a) => ({ ...a, age }))
    setAgeInput('')
    setStep('region')
    setTimeout(() => pushBot('어느 지역에 살고 계세요?'), 250)
  }
  function pickRegion(region) {
    pushUser(region)
    setAnswers((a) => ({ ...a, region }))
    setStep('fields')
    setTimeout(() => pushBot('관심 있는 분야를 모두 골라주세요. (여러 개 선택 가능)'), 250)
  }
  function toggleField(key) {
    setPickedFields((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]))
  }
  function submitFields() {
    pushUser(pickedFields.length ? pickedFields.join(', ') : '전체 분야')
    const found = recommendPolicies({ ...answers, fields: pickedFields })
    setStep('done')
    setTimeout(() => {
      pushBot(
        found.length
          ? `조건에 맞는 정책 ${found.length}건을 찾았어요!`
          : '조건에 맞는 정책을 찾지 못했어요.',
        found,
      )
    }, 250)
  }

  const showSuggestions = mode === 'chat' && messages.length === 1 && !loading

  if (!ready) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,padding:pad}}>
        {loadErr ? (
          <>
            <p style={{color:C.error,fontSize:15}}>정책 데이터를 불러오지 못했어요.</p>
            <button onClick={()=>{setLoadErr(false);loadPolicies().then(()=>setReady(true)).catch(()=>setLoadErr(true))}}
              style={{padding:'10px 24px',borderRadius:12,border:'none',cursor:'pointer',
                background:C.primary,color:C.neutralWhite,fontWeight:800,fontSize:14}}>
              다시 시도
            </button>
          </>
        ) : (
          <p style={{color:C.mutedText,fontSize:15}}>정책 데이터 불러오는 중...</p>
        )}
      </div>
    )
  }

  /* ── Landing (Google/ChatGPT style) ── */
  if (!started) {
    return (
      <div style={{ height:'100%', overflow:'hidden', background:'#ffffff', position:'relative' }}>
        <div style={{position:'absolute',left:'24.9%',top:'52%',width:'28.8vw',aspectRatio:'1',borderRadius:'50%',background:'#4AA8FF',filter:'blur(12vw)',pointerEvents:'none',zIndex:0}}/>
        <div style={{position:'absolute',left:'43.2%',top:'46%',width:'19.4vw',aspectRatio:'1',borderRadius:'50%',background:'#19CEBD',filter:'blur(8vw)',pointerEvents:'none',zIndex:0}}/>
        {/* Privacy Notice — 오른쪽 상단 고정 */}
        <PrivacyNoticePanel bp={bp}/>
        <div style={{
          position:'relative', zIndex:1,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          height:'100%', padding:'0 24px',
        }}>

          {/* Icon */}
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:68,height:68,borderRadius:16,marginBottom:20}}/>

          {/* Title */}
          <h1 style={{
            margin:'0 0 8px',fontSize:bp==='mobile'?22:26,fontWeight:800,
            color:'#111827',textAlign:'center',letterSpacing:'-0.3px',
          }}>청년ON AI 챗봇</h1>
          <p style={{
            margin:'0 0 32px',fontSize:bp==='mobile'?14:15,color:'#6b7280',
            textAlign:'center',lineHeight:1.6,
          }}>나이·지역·관심사를 말씀해 주시면<br/>딱 맞는 청년정책을 찾아드릴게요.</p>

          {/* Search bar */}
          <div style={{
            width:'100%',maxWidth:560,
            border:'1.5px solid #e5e7eb',borderRadius:28,
            display:'flex',alignItems:'center',gap:8,
            padding:'10px 10px 10px 20px',
            background:'#fafafa',
            boxShadow:'0 2px 10px rgba(0,0,0,0.06)',
            transition:'border-color 0.15s,box-shadow 0.15s',
          }}
            onFocusCapture={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.boxShadow=`0 2px 16px rgba(0,127,255,0.15)`}}
            onBlurCapture={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.06)'}}
          >
            <Icon name="search" size={20} color="#9ca3af"/>
            <input
              type="text"
              placeholder="자유롭게 물어보세요 (예: 27살 서울 월세 지원)"
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&sendMessage()}
              autoFocus
              style={{
                flex:1,border:'none',background:'transparent',
                fontSize:bp==='mobile'?14:15,fontFamily:'inherit',outline:'none',
                color:'#111827',
              }}
            />
            <button
              onClick={()=>sendMessage()}
              disabled={!input.trim()}
              style={{
                width:40,height:40,borderRadius:'50%',border:'none',cursor:'pointer',
                background:input.trim()?C.primary:'#e5e7eb',
                display:'flex',alignItems:'center',justifyContent:'center',
                flexShrink:0,transition:'background 0.15s',
              }}
            >
              <Icon name="arrow_upward" size={18} color="#ffffff"/>
            </button>
          </div>

          {/* Suggestion chips */}
          <div style={{
            display:'flex',flexWrap:'wrap',gap:8,marginTop:20,
            maxWidth:560,justifyContent:'center',
          }}>
            {SUGGESTIONS.map(s=>(
              <button key={s} onClick={()=>sendMessage(s)} style={{
                border:`1.5px solid #e5e7eb`,background:'rgba(255,255,255,0.65)',color:'#374151',
                borderRadius:99,padding:'8px 16px',fontSize:13,cursor:'pointer',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.background=C.secondary;e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.65)';e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.color='#374151'}}
              >{s}</button>
            ))}
          </div>

          {/* Footer note */}
          <div style={{ marginTop:bp==='mobile'?32:40, textAlign:'center' }}>
            <span style={{fontSize:11,color:'#94A3B8'}}>※ 실제 신청 조건·기간은 변동될 수 있으니 공고를 확인하세요.</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Chat view ── */
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:C.neutralLight,position:'relative'}}>
      {/* 헤더바 */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,
        padding:'10px 14px',borderBottom:'1.5px solid #f1f5f9',background:C.neutralWhite,
      }}>
        <button onClick={openDrawer} disabled={loading} style={{
          display:'inline-flex',alignItems:'center',gap:6,
          border:`1.5px solid ${C.borderGray}`,background:C.neutralWhite,color:C.neutralDark,
          borderRadius:10,padding:'7px 12px',fontSize:13,fontWeight:700,
          cursor:loading?'default':'pointer',opacity:loading?0.55:1,
        }}>
          <Icon name="menu" size={15} color={C.neutralDark}/>
          대화목록
        </button>
        <button onClick={startNewSession} disabled={loading} style={{
          display:'inline-flex',alignItems:'center',gap:5,
          border:'none',background:C.primary,color:C.neutralWhite,
          borderRadius:10,padding:'7px 12px',fontSize:13,fontWeight:800,
          cursor:loading?'default':'pointer',opacity:loading?0.55:1,
        }}>
          <Icon name="add" size={15} color={C.neutralWhite}/>
          새 대화
        </button>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:pad}}>
        {messages.slice(1).map((msg, i) => (
          <div key={i} style={{animation:'fadeUp 0.25s ease',marginBottom:12}}>
            <div style={{
              display:'flex',alignItems:'flex-start',gap:10,
              justifyContent:msg.from==='user'?'flex-end':'flex-start',
            }}>
              {msg.from==='bot'&&(
                <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:32,height:32,borderRadius:8,flexShrink:0}}/>
              )}
              <div style={msg.from==='bot'
                ?{background:C.neutralWhite,border:`1.5px solid #f1f5f9`,borderRadius:16,padding:'12px 16px',
                  color:C.neutralDark,maxWidth:'80%',lineHeight:1.6,fontSize:14,whiteSpace:'pre-wrap'}
                :{background:C.secondary,color:C.neutralDark,borderRadius:16,
                  padding:'12px 16px',maxWidth:'80%',lineHeight:1.6,fontSize:14,whiteSpace:'pre-wrap'}
              }>
                {msg.streaming&&!msg.text?(
                  <span style={{display:'inline-flex',gap:4}}>
                    {[0,1,2].map(d=>(
                      <i key={d} style={{
                        width:6,height:6,borderRadius:'50%',background:C.mutedText,display:'inline-block',
                        animation:'pulse 1.2s infinite',animationDelay:`${d*0.15}s`,
                      }}/>
                    ))}
                  </span>
                ):(
                  msg.text.split('\n').map((line, j)=><p key={j} style={{margin:'2px 0'}}>{renderInline(line)}</p>)
                )}
              </div>
            </div>
            {/* 연관질문 칩 */}
            {msg.from === 'bot' && !msg.streaming && !reachedLimit && msg.followups?.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10,marginLeft:42,maxWidth:'80%'}}>
                {msg.followups.map((question)=>(
                  <button key={question} onClick={()=>sendMessage(question)} disabled={loading} style={{
                    border:`1.5px solid ${C.primary}`,background:C.secondary,color:C.primaryHover,
                    borderRadius:999,padding:'7px 12px',fontSize:13,fontWeight:700,
                    cursor:loading?'default':'pointer',lineHeight:1.45,textAlign:'left',
                    whiteSpace:'normal',boxShadow:'0 1px 4px rgba(0,127,255,0.12)',
                    transition:'background 0.15s,color 0.15s,transform 0.15s,box-shadow 0.15s',
                    opacity:loading?0.65:1,
                  }}
                    onMouseEnter={e=>{if(loading)return;e.currentTarget.style.background=C.primary;e.currentTarget.style.color=C.neutralWhite;e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 10px rgba(0,127,255,0.22)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background=C.secondary;e.currentTarget.style.color=C.primaryHover;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,127,255,0.12)'}}
                  >{question}</button>
                ))}
              </div>
            )}
            {/* 정책카드 가로 슬라이더 */}
            {msg.policies?.length>0&&(
              <div style={{
                display:'flex',flexDirection:'row',gap:12,alignItems:'stretch',marginTop:10,marginLeft:42,
                overflowX:'auto',overflowY:'hidden',paddingBottom:6,
                scrollSnapType:'x proximity',WebkitOverflowScrolling:'touch',scrollbarWidth:'thin',
              }}>
                {msg.policies.map((p)=>(
                  <div key={p.id} style={{scrollSnapAlign:'start',display:'flex'}}>
                    <PolicyCardMini policy={p} favIds={favIds} onToggleFav={onToggleFav}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 입력 영역 */}
      <div style={{borderTop:`1.5px solid #f1f5f9`,padding:pad,background:C.neutralWhite}}>
        {mode==='chat'&&reachedLimit&&(
          <div style={{textAlign:'center',padding:'12px 0'}}>
            <p style={{margin:'0 0 10px',fontSize:14,color:C.neutralDark}}>
              질문 {QUESTION_LIMIT}회를 모두 사용했어요.<br/>새 대화로 더 정확하게 이어가 볼까요?
            </p>
            <button onClick={resetSession} style={{
              width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
              background:C.primary,color:C.neutralWhite,fontWeight:800,fontSize:14,
            }}>＋ 새 대화 시작</button>
          </div>
        )}

        {mode==='chat'&&!reachedLimit&&(
          <>
            {models.length > 1 && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:12,color:C.mutedText}}>모델</span>
                <select
                  value={model}
                  onChange={(e)=>setModel(e.target.value)}
                  disabled={loading}
                  style={{
                    flex:1,padding:'6px 10px',borderRadius:8,border:`1.5px solid ${C.borderGray}`,
                    background:C.neutralLight,fontSize:12,fontFamily:'inherit',outline:'none',
                    cursor:'pointer',
                  }}
                >
                  {models.map((m)=>(
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
            {showOptions && (
              <div style={{marginBottom:8,padding:'10px 12px',background:'#f8fafc',borderRadius:12,border:`1.5px solid #e2e8f0`}}>
                {[
                  { label:'분야', chips:[{icon:'work',t:'취업·창업',v:'취업·창업 관련'},{icon:'home',t:'주거·금융',v:'주거·금융 관련'},{icon:'school',t:'교육',v:'교육 관련'},{icon:'favorite',t:'복지·문화',v:'복지·문화 관련'},{icon:'how_to_vote',t:'참여·권리',v:'참여·권리 관련'}]},
                  { label:'기간', chips:[{icon:'schedule',t:'마감 임박',v:'마감 임박'},{icon:'event_available',t:'상시 접수',v:'상시 접수'}]},
                  { label:'지원 유형', chips:[{icon:'payments',t:'현금 지원',v:'현금 직접 지원'},{icon:'confirmation_number',t:'바우처',v:'바우처 지원'},{icon:'account_balance',t:'대출·보증',v:'대출·보증 지원'}]},
                  { label:'추천 방식', chips:[{icon:'trending_up',t:'인기순',v:'인기 있는'},{icon:'new_releases',t:'최신순',v:'최근 생긴'},{icon:'stars',t:'금액 큰 순',v:'지원 금액이 큰'}]},
                ].map(({label,chips})=>(
                  <div key={label} style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:C.mutedText,minWidth:52,flexShrink:0,fontWeight:600}}>{label}</span>
                    {chips.map(({icon,t,v})=>{
                      const active=chipTags.some(c=>c.v===v);
                      return(
                        <button key={t} onClick={()=>{
                          setChipTags(prev=>active?prev.filter(c=>c.v!==v):[...prev,{t,v}]);
                        }} style={{
                          display:'flex',alignItems:'center',gap:4,
                          fontSize:12,padding:'5px 11px',borderRadius:99,cursor:'pointer',
                          border:`2px solid ${active?C.primary:'#cbd5e1'}`,
                          background:active?C.primary:'white',
                          color:active?'#ffffff':C.neutralDark,
                          fontWeight:active?700:400,
                          transition:'all 0.15s',
                        }}
                          onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary;e.currentTarget.style.background='#EFF6FF';}}}
                          onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color=C.neutralDark;e.currentTarget.style.background='white';}}}
                        ><Icon name={icon} size={13} color={active?'#ffffff':undefined}/>{t}</button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {chipTags.length>0&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                {chipTags.map(({t,v})=>(
                  <span key={v} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,background:C.primary,color:'white',fontSize:12,fontWeight:700}}>
                    {t}
                    <button onClick={()=>setChipTags(prev=>prev.filter(c=>c.v!==v))} style={{background:'rgba(255,255,255,0.3)',border:'none',borderRadius:'50%',width:16,height:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0,color:'white',fontSize:11,lineHeight:1}}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowOptions(o=>!o)} style={{
                padding:'12px 10px',borderRadius:12,border:`1.5px solid ${showOptions?C.primary:C.borderGray}`,
                background:showOptions?'#EFF6FF':'white',color:showOptions?C.primary:C.mutedText,
                cursor:'pointer',fontSize:18,lineHeight:1,transition:'all 0.15s',flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',
              }} title="옵션 선택"><Icon name="tune" size={18}/></button>
              <input
                type="text"
                placeholder="자유롭게 물어보세요 (예: 27살 서울 월세 지원)"
                value={input}
                onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e)=>e.key==='Enter'&&sendMessage()}
                disabled={loading}
                autoFocus
                style={{
                  flex:1,padding:'12px 14px',borderRadius:12,border:`1.5px solid ${C.borderGray}`,
                  background:C.secondary,fontSize:14,fontFamily:'inherit',outline:'none',
                  transition:'border-color 0.15s',
                }}
                onFocus={e=>{e.target.style.borderColor=C.primary}}
                onBlur={e=>{e.target.style.borderColor=C.borderGray}}
              />
              <button onClick={()=>sendMessage()} disabled={loading} style={{
                padding:'12px 20px',borderRadius:12,border:'none',cursor:'pointer',
                background:C.primary,color:C.neutralWhite,fontWeight:800,fontSize:14,
                opacity:loading?0.6:1,transition:'opacity 0.15s,background 0.15s',
              }}
                onMouseEnter={e=>{if(!loading)e.currentTarget.style.background=C.primaryHover}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.primary}}
              >전송</button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',margin:'6px 0 0',fontSize:12,color:C.mutedText}}>
              {remaining != null && (
                <span>오늘 남은 답변 {remaining}회</span>
              )}
              <span style={{marginLeft:'auto'}}>내 남은 질문 {QUESTION_LIMIT-qCount}회</span>
            </div>
          </>
        )}

        {mode==='guided'&&step==='age'&&(
          <div style={{display:'flex',gap:8}}>
            <input
              type="number" inputMode="numeric"
              placeholder="만 나이 입력 (예: 27)"
              value={ageInput}
              onChange={(e)=>setAgeInput(e.target.value)}
              onKeyDown={(e)=>e.key==='Enter'&&submitAge()}
              autoFocus
              style={{
                flex:1,padding:'12px 14px',borderRadius:12,border:`1.5px solid ${C.borderGray}`,
                background:C.secondary,fontSize:14,fontFamily:'inherit',outline:'none',
                transition:'border-color 0.15s',
              }}
              onFocus={e=>{e.target.style.borderColor=C.primary}}
              onBlur={e=>{e.target.style.borderColor=C.borderGray}}
            />
            <button onClick={submitAge} style={{
              padding:'12px 20px',borderRadius:12,border:'none',cursor:'pointer',
              background:C.primary,color:C.neutralWhite,fontWeight:800,fontSize:14,
              transition:'background 0.15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background=C.primaryHover}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.primary}}
            >확인</button>
          </div>
        )}

        {mode==='guided'&&step==='region'&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {SIDO_LIST.map((r)=>(
              <button key={r} onClick={()=>pickRegion(r)} style={{
                border:`1.5px solid ${C.borderGray}`,background:C.neutralWhite,color:C.neutralDark,
                borderRadius:99,padding:'8px 14px',fontSize:13,cursor:'pointer',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.background=C.secondary;e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.neutralWhite;e.currentTarget.style.borderColor=C.borderGray;e.currentTarget.style.color=C.neutralDark}}
              >{r}</button>
            ))}
          </div>
        )}

        {mode==='guided'&&step==='fields'&&(
          <div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
              {FIELD_OPTIONS.map((c)=>{
                const picked=pickedFields.includes(c.key)
                return (
                  <button key={c.key} onClick={()=>toggleField(c.key)} style={{
                    border:picked?`1.5px solid ${c.color}`:`1.5px solid ${C.borderGray}`,
                    background:picked?`${c.color}12`:C.neutralWhite,
                    color:picked?c.color:C.neutralDark,
                    fontWeight:picked?700:400,
                    borderRadius:99,padding:'8px 14px',fontSize:13,cursor:'pointer',
                    transition:'all 0.15s',
                  }}>
                    <Icon name={c.icon} size={14} color={picked?c.color:undefined}/> {c.key}
                  </button>
                )
              })}
            </div>
            <button onClick={submitFields} style={{
              width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
              background:C.primary,color:C.neutralWhite,fontWeight:800,fontSize:14,
              transition:'background 0.15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background=C.primaryHover}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.primary}}
            >
              {pickedFields.length?`${pickedFields.length}개 분야로 찾기`:'전체 분야에서 찾기'}
            </button>
          </div>
        )}

        {mode==='guided'&&step==='done'&&(
          <button onClick={resetSession} style={{
            width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
            background:C.primary,color:C.neutralWhite,fontWeight:800,fontSize:14,
            transition:'background 0.15s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.primaryHover}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.primary}}
          >처음부터 다시 찾기</button>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'0.2rem',marginTop:'0.7rem',paddingTop:'0.55rem',borderTop:`1px solid ${C.borderGray}`}}>
          <span style={{fontSize:'0.7rem',color:C.mutedText,lineHeight:1.5,display:'inline-flex',alignItems:'center',gap:4}}><Icon name="phone" size={11} color={C.mutedText}/>더 자세한 상담은 온통청년 1670-1839 (평일 9~18시)</span>
          <span style={{fontSize:'0.7rem',color:C.mutedText,lineHeight:1.5}}>※ 실제 신청 조건·기간은 변동될 수 있으니, 신청 전 반드시 해당 기관 공고를 확인하세요.</span>
        </div>
      </div>

      {/* 대화목록 드로어 (오버레이 사이드 패널) */}
      {drawerOpen && (
        <>
          <div onClick={()=>setDrawerOpen(false)} style={{position:'absolute',inset:0,background:'rgba(15,23,42,0.35)',zIndex:40}}/>
          <aside style={{position:'absolute',top:0,left:0,bottom:0,width:'min(320px,82%)',background:'white',zIndex:41,boxShadow:'2px 0 16px rgba(0,0,0,0.12)',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1.5px solid #f1f5f9'}}>
              <span style={{fontWeight:800,fontSize:15,color:'#1e293b'}}>대화 목록</span>
              <button onClick={()=>setDrawerOpen(false)} style={{border:'none',background:'none',cursor:'pointer',fontSize:18,color:'#94a3b8'}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
              {sessions.length===0 ? (
                <p style={{color:'#94a3b8',fontSize:13,textAlign:'center',padding:'24px 0'}}>저장된 대화가 없어요.</p>
              ) : sessions.map((s)=>(
                <div key={s.id} onClick={()=>loadSession(s.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:10,cursor:'pointer',marginBottom:4,background:s.id===sessionId?'#EFF6FF':'transparent',border:s.id===sessionId?'1.5px solid #bfdbfe':'1.5px solid transparent'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.title}</div>
                    <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{new Date(s.updatedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <button onClick={(e)=>deleteSession(s.id,e)} title="삭제" style={{border:'none',background:'none',cursor:'pointer',fontSize:15,color:'#cbd5e1',flexShrink:0,padding:4}}>
                    <Icon name="delete" size={15} color="#cbd5e1"/>
                  </button>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1.5px solid #f1f5f9',padding:'10px 14px'}}>
              <p style={{fontSize:11,color:'#94a3b8',lineHeight:1.5,margin:'0 0 8px'}}>※ 대화는 이 브라우저에만 저장돼요. 공용 PC에서는 사용 후 삭제하세요.</p>
              <button onClick={clearAll} style={{width:'100%',padding:'8px',borderRadius:8,border:'1.5px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer'}}>전체 대화 삭제</button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
