import { useState, useRef, useEffect } from 'react'
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
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon name={icon} size={13} color="#007FFF"/>
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
      position: 'absolute', top: 12, right: 12,
      width: collapsed ? 'auto' : (isMobile ? 'calc(100vw - 24px)' : '340px'),
      maxWidth: isMobile ? 'calc(100vw - 24px)' : '340px',
      border: '1.5px solid #e2e8f0', borderRadius: 18, overflow: 'hidden',
      background: 'white', zIndex: 10,
      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
    }}>
      {/* 헤더 */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: '#F8FAFE',
          border: 'none', borderBottom: collapsed ? 'none' : '1.5px solid #e2e8f0',
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
          <span>{collapsed ? '펼치기' : '접기'}</span>
          <span style={{
            display: 'inline-block',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.25s', fontSize: 10,
          }}>▼</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ padding: isMobile ? '16px 16px 20px' : '20px 22px 24px' }}>

          {/* 수집하는 정보 */}
          <PrivacyInfoSection icon="database" title="수집하는 정보">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['챗봇 대화 내용 (질문 및 답변)', '이용 일시 및 접속 환경 (브라우저 종류 등)'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#007FFF', marginTop: 7, flexShrink: 0 }}/>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </PrivacyInfoSection>

          {/* 비로그인 vs 로그인 */}
          <PrivacyInfoSection icon="person" title="비로그인 vs 로그인">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {/* 비로그인 */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>비로그인</div>
                {['챗봇 기본 기능 이용 가능', '이름·연락처 등 개인 식별 정보 미수집', '대화 기록 저장 불가', '맞춤 정책 추천 제한'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
              {/* 로그인 */}
              <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #BFDBFE' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  로그인
                  <span style={{ fontSize: 10, background: '#007FFF', color: 'white', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>권장</span>
                </div>
                {['챗봇 기본 기능 이용 가능', '대화 기록 저장 및 이어보기', '관심 정책 찜·알림 기능', '나이·지역 기반 맞춤 추천'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ color: '#22c55e', fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{
              margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.7,
              background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '1px solid #e2e8f0',
            }}>
              로그인 없이도 챗봇을 이용하실 수 있습니다. 단, 로그인 시 더 정확한 정책 추천과 기록 저장 서비스를 제공받으실 수 있습니다.
            </p>
          </PrivacyInfoSection>

          {/* 수집 목적 */}
          <PrivacyInfoSection icon="analytics" title="수집 목적">
            <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              서비스 품질 개선 및 AI 응답 정확도 향상을 위해 대화 내용을 분석합니다.
            </p>
          </PrivacyInfoSection>

          {/* 보유 기간 */}
          <PrivacyInfoSection icon="schedule" title="보유 기간">
            <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              수집일로부터 1년간 보유 후 자동 삭제됩니다. 저장을 원하지 않으시면 아래에서 선택하세요.
            </p>
          </PrivacyInfoSection>

        </div>
      )}
    </div>
  )
}

export default function ChatBotView({ bp }) {
  const pad = bp === 'desktop' ? '36px 40px' : bp === 'tablet' ? '28px 24px' : '18px 14px'

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
  const [loading, setLoading] = useState(false)
  const [apiHistory, setApiHistory] = useState([])
  const [qCount, setQCount] = useState(0)
  const [remaining, setRemaining] = useState(null)

  const [step, setStep] = useState(null)
  const [answers, setAnswers] = useState({ age: null, region: null, fields: [] })
  const [ageInput, setAgeInput] = useState('')
  const [pickedFields, setPickedFields] = useState([])

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

  function resetSession() {
    setMessages([
      { from: 'bot', text: '안녕하세요! 청년정책 안내 챗봇이에요.\n나이·지역·관심사를 편하게 말씀해 주시면 전국 청년정책 중에서 딱 맞는 걸 찾아드릴게요.' },
    ])
    setApiHistory([])
    setQCount(0)
    setInput('')
    setMode('chat')
    setStep(null)
    setStarted(false)
  }

  async function sendMessage(text) {
    const content = (text ?? input).trim()
    if (!content || loading || reachedLimit) return
    setStarted(true)
    pushUser(content)
    setInput('')
    setLoading(true)

    const history = [...apiHistory, { role: 'user', content }]
    setMessages((m) => [...m, { from: 'bot', text: '', streaming: true }])

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
        patchLast({ text: full.replace(/^\[POLICY_IDS:[^\]]*\]?\n?/, '') })
      }
      const cleanText = full.replace(/^\[POLICY_IDS:[^\]]*\]\n?/, '')
      const policies = ids.length ? policiesByIds(ids) : null
      patchLast({ text: cleanText || '결과를 가져오지 못했어요.', policies, streaming: false })
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

  const [started, setStarted] = useState(false)

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
      <div style={{ height:'100%', overflowY:'auto', background:'#ffffff', position:'relative' }}>
        {/* Privacy Notice — 오른쪽 상단 고정 */}
        <PrivacyNoticePanel bp={bp}/>
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          minHeight:'100%', padding:bp==='mobile'?'28px 16px 100px':'40px 24px 60px',
        }}>

          {/* Icon */}
          <div style={{
            width:68,height:68,borderRadius:'50%',
            background:`linear-gradient(135deg,#0052A3,${C.primary})`,
            display:'flex',alignItems:'center',justifyContent:'center',
            marginBottom:20,
            boxShadow:'0 4px 20px rgba(0,127,255,0.25)',
          }}>
            <Icon name="smart_toy" size={34} color="#ffffff"/>
          </div>

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
                border:`1.5px solid #e5e7eb`,background:'#f9fafb',color:'#374151',
                borderRadius:99,padding:'8px 16px',fontSize:13,cursor:'pointer',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.background=C.secondary;e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary}}
                onMouseLeave={e=>{e.currentTarget.style.background='#f9fafb';e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.color='#374151'}}
              >{s}</button>
            ))}
          </div>

          {/* Footer note */}
          <div style={{ marginTop:bp==='mobile'?32:40, textAlign:'center' }}>
            <span style={{fontSize:11,color:'#d1d5db'}}>※ 실제 신청 조건·기간은 변동될 수 있으니 공고를 확인하세요.</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Chat view ── */
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:C.neutralLight}}>
      {/* 메시지 영역 */}
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:pad}}>
        {messages.slice(1).map((msg, i) => (
          <div key={i} style={{animation:'fadeUp 0.25s ease',marginBottom:12}}>
            <div style={{
              display:'flex',alignItems:'flex-start',gap:10,
              justifyContent:msg.from==='user'?'flex-end':'flex-start',
            }}>
              {msg.from==='bot'&&(
                <div style={{
                  width:32,height:32,borderRadius:'50%',
                  background:`linear-gradient(135deg,#0052A3,${C.primary})`,
                  color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                  flexShrink:0,
                }}>
                  <Icon name="smart_toy" size={16} color="#ffffff"/>
                </div>
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
            {msg.policies?.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:10,
                marginLeft:42,maxWidth:'80%'}}>
                {msg.policies.map((p)=>(
                  <PolicyCardMini key={p.id} policy={p}/>
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
            <div style={{display:'flex',gap:8}}>
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
    </div>
  )
}
