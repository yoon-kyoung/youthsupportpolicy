import { useState, useRef, useEffect } from 'react'
import { API_BASE, QUESTION_LIMIT } from './config'
import { SIDO_LIST, FIELD_OPTIONS } from './codes'
import { recommendPolicies, policiesByIds } from './recommend'
import { loadPolicies } from './policiesStore'
import PolicyCardMini from './PolicyCardMini'

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
      text: '안녕하세요! 청년정책 안내 챗봇이에요 😊\n나이·지역·관심사를 편하게 말씀해 주시면 전국 청년정책 중에서 딱 맞는 걸 찾아드릴게요.',
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
      { from: 'bot', text: '새 대화를 시작했어요! 😊 나이·지역·관심사를 말씀해 주세요.' },
    ])
    setApiHistory([])
    setQCount(0)
    setInput('')
    setMode('chat')
    setStep(null)
  }

  async function sendMessage(text) {
    const content = (text ?? input).trim()
    if (!content || loading || reachedLimit) return
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
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const ids = JSON.parse(res.headers.get('X-Policy-Ids') || '[]')
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
      if (!rateLimited) {
        setApiHistory([...history, { role: 'assistant', content: full }])
        setQCount((c) => c + 1)
      }
    } catch {
      patchLast({
        text: 'AI 대화 서버에 연결할 수 없어요 😢\n대신 단계별 질문으로 찾아드릴게요!',
        streaming: false,
      })
      setMode('guided')
      setStep('age')
      setTimeout(() => pushBot('먼저, 만 나이가 어떻게 되세요?'), 300)
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
          ? `조건에 맞는 정책 ${found.length}건을 찾았어요! 👇`
          : '조건에 맞는 정책을 찾지 못했어요 😢',
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
            <p style={{color:'#dc2626',fontSize:15}}>정책 데이터를 불러오지 못했어요.</p>
            <button onClick={()=>{setLoadErr(false);loadPolicies().then(()=>setReady(true)).catch(()=>setLoadErr(true))}}
              style={{padding:'10px 24px',borderRadius:12,border:'none',cursor:'pointer',
                background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontWeight:800,fontSize:14}}>
              다시 시도
            </button>
          </>
        ) : (
          <p style={{color:'#64748b',fontSize:15}}>정책 데이터 불러오는 중...</p>
        )}
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f8fafc'}}>
      {/* 메시지 영역 */}
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:pad}}>
        {messages.map((msg, i) => (
          <div key={i} style={{animation:'fadeUp 0.25s ease',marginBottom:12}}>
            <div style={{
              display:'flex',alignItems:'flex-start',gap:10,
              justifyContent:msg.from==='user'?'flex-end':'flex-start',
            }}>
              {msg.from==='bot'&&(
                <span style={{
                  width:32,height:32,borderRadius:'50%',
                  background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',
                  color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:14,fontWeight:800,flexShrink:0,
                }}>청</span>
              )}
              <div style={msg.from==='bot'
                ?{background:'white',border:'1.5px solid #f1f5f9',borderRadius:16,padding:'12px 16px',
                  color:'#374151',maxWidth:'80%',lineHeight:1.6,fontSize:14,whiteSpace:'pre-wrap'}
                :{background:'linear-gradient(135deg,#1E3A8A,#3B82F6)',color:'#fff',borderRadius:16,
                  padding:'12px 16px',maxWidth:'80%',lineHeight:1.6,fontSize:14,whiteSpace:'pre-wrap'}
              }>
                {msg.streaming&&!msg.text?(
                  <span style={{display:'inline-flex',gap:4}}>
                    {[0,1,2].map(d=>(
                      <i key={d} style={{
                        width:6,height:6,borderRadius:'50%',background:'#94a3b8',display:'inline-block',
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

        {showSuggestions&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
            {SUGGESTIONS.map((s)=>(
              <button key={s} onClick={()=>sendMessage(s)} style={{
                border:'1.5px solid #e2e8f0',background:'white',color:'#374151',
                borderRadius:99,padding:'8px 14px',fontSize:13,cursor:'pointer',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.borderColor='#3B82F6';e.currentTarget.style.color='#1D4ED8'}}
                onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151'}}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div style={{borderTop:'1.5px solid #f1f5f9',padding:pad,background:'white'}}>
        {mode==='chat'&&reachedLimit&&(
          <div style={{textAlign:'center',padding:'12px 0'}}>
            <p style={{margin:'0 0 10px',fontSize:14,color:'#374151'}}>
              질문 {QUESTION_LIMIT}회를 모두 사용했어요 🙂<br/>새 대화로 더 정확하게 이어가 볼까요?
            </p>
            <button onClick={resetSession} style={{
              width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontWeight:800,fontSize:14,
            }}>＋ 새 대화 시작</button>
          </div>
        )}

        {mode==='chat'&&!reachedLimit&&(
          <>
            {models.length > 1 && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:12,color:'#64748b'}}>모델</span>
                <select
                  value={model}
                  onChange={(e)=>setModel(e.target.value)}
                  disabled={loading}
                  style={{
                    flex:1,padding:'6px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
                    background:'#f8fafc',fontSize:12,fontFamily:'inherit',outline:'none',
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
                  flex:1,padding:'12px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',
                  background:'#f8fafc',fontSize:14,fontFamily:'inherit',outline:'none',
                  transition:'border-color 0.15s',
                }}
                onFocus={e=>{e.target.style.borderColor='#3B82F6'}}
                onBlur={e=>{e.target.style.borderColor='#e2e8f0'}}
              />
              <button onClick={()=>sendMessage()} disabled={loading} style={{
                padding:'12px 20px',borderRadius:12,border:'none',cursor:'pointer',
                background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontWeight:800,fontSize:14,
                opacity:loading?0.6:1,
              }}>전송</button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',margin:'6px 0 0',fontSize:12,color:'#94a3b8'}}>
              {remaining != null && (
                <span>오늘 남은 답변 {remaining}회 (분당 20회 / 일 150회)</span>
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
                flex:1,padding:'12px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',
                background:'#f8fafc',fontSize:14,fontFamily:'inherit',outline:'none',
                transition:'border-color 0.15s',
              }}
              onFocus={e=>{e.target.style.borderColor='#3B82F6'}}
              onBlur={e=>{e.target.style.borderColor='#e2e8f0'}}
            />
            <button onClick={submitAge} style={{
              padding:'12px 20px',borderRadius:12,border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontWeight:800,fontSize:14,
            }}>확인</button>
          </div>
        )}

        {mode==='guided'&&step==='region'&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {SIDO_LIST.map((r)=>(
              <button key={r} onClick={()=>pickRegion(r)} style={{
                border:'1.5px solid #e2e8f0',background:'white',color:'#374151',
                borderRadius:99,padding:'8px 14px',fontSize:13,cursor:'pointer',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.borderColor='#3B82F6';e.currentTarget.style.color='#1D4ED8'}}
                onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151'}}
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
                    border:picked?`1.5px solid ${c.color}`:'1.5px solid #e2e8f0',
                    background:picked?`${c.color}12`:'white',
                    color:picked?c.color:'#374151',
                    fontWeight:picked?700:400,
                    borderRadius:99,padding:'8px 14px',fontSize:13,cursor:'pointer',
                    transition:'all 0.15s',
                  }}>
                    {c.emoji} {c.key}
                  </button>
                )
              })}
            </div>
            <button onClick={submitFields} style={{
              width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontWeight:800,fontSize:14,
            }}>
              {pickedFields.length?`${pickedFields.length}개 분야로 찾기`:'전체 분야에서 찾기'}
            </button>
          </div>
        )}

        {mode==='guided'&&step==='done'&&(
          <button onClick={resetSession} style={{
            width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
            background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontWeight:800,fontSize:14,
          }}>처음부터 다시 찾기</button>
        )}
      </div>
    </div>
  )
}
