# 작업지시서 — 청년ON 챗봇 UX 업데이트 3종 (마감 6/17 수)

> 작성: Opus 4.8 (멀티에이전트 스펙 + 적대 검수 반영) · 실행: 담당 AI(또는 종권)
> 대상 레포: **`youthsupportpolicy`** (팀 레포, GitHub Pages 배포) — `C:/Users/superjk/Desktop/Geabong/youthsupportpolicy`
> 작업 브랜치: **`feature/chatbot-ux`** → PR → 최윤경 머지
> 이 문서는 "멍청한 AI도 그대로 따라치면 되게" 쓰였다. 코드 스니펫은 변경 전/후를 명시했다. **추측하지 말고 실제 파일을 Read해서 변경 전 코드를 찾은 뒤 교체하라.**

---

## 0. 절대 규칙 (어기면 안 됨)

1. **백엔드 절대 수정 금지**: `youth-chatbot-api` 레포 / `api/chat.js` / kappa 배포 / 절대수정금지 함수(pipeStreamWithParse·makeTagFilter·callWithFallback)는 **건드리지 않는다.** 이 작업은 100% 프론트엔드(`youthsupportpolicy`).
2. **저장은 localStorage만.** 단, 저장 로직은 전부 **신규 파일 `src/chatbot/chatStore.js`** 에 모은다. (스케일업 시 이 파일만 교체)
3. **inline 스타일만 사용.** 이 코드베이스는 CSS 클래스/CSS 파일을 안 쓴다. 기존 스타일 패턴(그라데이션 `135deg,#1e3a8a,#2563eb`, radius, hover는 onMouseEnter/Leave)을 그대로 따른다.
4. **git은 반드시 `-C` 로 레포 지정**: `cwd`(Geabong)는 git repo가 아니다. 예: `git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy status`
5. 커밋/푸시는 **사용자가 요청할 때만.** 커밋 메시지는 한국어.
6. 작업 순서: **② → ③ (쉬움, 눈에 띔) → ① (제일 큼)**. 각 작업 후 `npm run build` 통과 확인.

---

## 1. 현재 코드 상태 (실측)

- `src/chatbot/ChatBotView.jsx` (~431줄, inline 스타일): `messages`·`apiHistory`가 useState(메모리) → 새로고침 시 전부 소실. `resetSession()`(line 84~93)만 있음.
- 봇 응답 본문에 후속질문이 **평문**으로 옴. 형식: `💬 이어서 물어보세요` 줄 다음에 `· 질문` (가운뎃점 U+00B7 + 공백) 줄들.
- 정책 카드: `msg.policies?.length>0` 일 때 봇 말풍선 아래 **세로 스택**으로 `PolicyCardMini` 렌더 (line 254~261).
- 스트리밍: `patchLast({text})`로 부분 갱신, 완료 시 `streaming:false`.
- `src/App.jsx`: `useLocalStorage` 훅이 line 144에 이미 있음. 로그인/회원가입(LoginPage line 1084, SignupPage line 1202)은 **동작 안 하는 목업**("준비 중인 기능입니다"). 인증/유저상태/식별정보 전무 → **계정 연동 불가** = localStorage가 정답.
- 빌드: Vite. `npm run dev` / `npm run build`.

---

## 시작 전 (필수) — 브랜치 생성

코드를 한 줄이라도 고치기 전에 **반드시** 작업 브랜치를 판다. (main에서 작업 금지)
```bash
# 1) 레포로 이동 확인 — 모든 git은 -C 로 레포 지정 (cwd Geabong은 git repo 아님)
git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy status
# 2) 최신 main 으로 동기화
git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy checkout main
git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy pull origin main
# 3) 작업 브랜치 생성 + 이동
git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy checkout -b feature/chatbot-ux
# 4) 현재 브랜치가 feature/chatbot-ux 인지 확인 (이게 안 보이면 멈추고 점검)
git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy rev-parse --abbrev-ref HEAD
```
> 이미 `feature/chatbot-ux`가 있으면 3번은 `checkout -b` 대신 `checkout feature/chatbot-ux`.
> 브랜치 확인(4번) 결과가 `feature/chatbot-ux`가 아니면 **편집을 시작하지 마라.**

---

## 작업 ② — 연관질문 말풍선(칩)  [난이도 下, ~45분] ← 먼저

**목표**: 봇 응답의 "💬 이어서 물어보세요" 블록을 파싱해 본문에서 떼고, 말풍선 아래 클릭 가능한 칩으로 렌더. 클릭 시 `sendMessage(질문)`.

### ②-1. `parseFollowups` 순수 함수 추가
`ChatBotView.jsx` 상단 `renderInline` 함수(line 14~18) **바로 아래**에 추가:
```js
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
```

### ②-2. 완료 시점에서만 파싱 (스트리밍 중 금지)
`sendMessage`의 **완료 patchLast (line 129~131)** 를 교체:
```js
// 변경 전:
//   const cleanText = full.replace(/^\[POLICY_IDS:[^\]]*\]\n?/, '')
//   const policies = ids.length ? policiesByIds(ids) : null
//   patchLast({ text: cleanText || '결과를 가져오지 못했어요.', policies, streaming: false })
// 변경 후:
const cleanText = full.replace(/^\[POLICY_IDS:[^\]]*\]\n?/, '')
const { body, followups } = parseFollowups(cleanText)   // ★ POLICY_IDS 제거 후 파싱 (순서 중요)
const policies = ids.length ? policiesByIds(ids) : null
patchLast({ text: body || '결과를 가져오지 못했어요.', policies, followups, streaming: false })
```
> ⚠️ 스트리밍 중 patchLast(line 127)는 **절대 건드리지 마라** (파싱은 완료 1회만).

### ②-3. 칩 렌더 (정책 카드 블록 바로 아래)
정책 카드 블록(line 254~261)의 `)}` 다음, 메시지 컨테이너 `</div>`(line 262) 직전에 추가:
```jsx
{/* 연관질문 칩 */}
{msg.from === 'bot' && !msg.streaming && !reachedLimit && msg.followups?.length > 0 && (
  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10,marginLeft:42,maxWidth:'80%'}}>
    {msg.followups.map((q)=>(
      <button key={q} onClick={()=>sendMessage(q)} disabled={loading} style={{
        border:'1.5px solid #e2e8f0',background:'white',color:'#374151',borderRadius:99,
        padding:'8px 14px',fontSize:13,cursor:loading?'default':'pointer',transition:'all 0.15s',
        textAlign:'left',whiteSpace:'normal',wordBreak:'keep-all',lineHeight:1.4,maxWidth:'100%',opacity:loading?0.6:1,
      }}
        onMouseEnter={e=>{if(loading)return;e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.borderColor='#3B82F6';e.currentTarget.style.color='#1D4ED8'}}
        onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#374151'}}
      >{q}</button>
    ))}
  </div>
)}
```

### ② 엣지/주의
- followups 0개·guided 메시지 → 칩 영역 미렌더(옵셔널 체이닝).
- **칩 클릭 = 질문 1회 소모**(sendMessage 경로). 별도 면제 금지(X-Remaining과 어긋남).
- `reachedLimit`(qCount>=8)이면 칩 숨김(조건에 `!reachedLimit` 포함).
- 가운뎃점 `·`(U+00B7) ≠ `•`(U+2022) — 둘 다 허용. 헤더 판정은 `includes('이어서 물어보세요')`로(이모지 의존 금지).
- 파싱 실패 시 본문 원문 그대로(유실/중복 0).

### ② 완료 기준(체크)
- [ ] 후속질문 있는 응답 → 본문에서 `· 질문` 줄 사라지고 칩으로 뜸
- [ ] 스트리밍 중엔 칩 안 보이고 완료 후에만
- [ ] 칩 클릭 → 그 질문이 전송됨
- [ ] 8회 소진 시 칩 숨김 / guided엔 칩 없음
- [ ] `npm run build` 통과

---

## 작업 ③ — 정책 카드 가로 슬라이더 + 색상 구분  [난이도 下, ~40분]

**목표**: 세로 스택 → 가로 슬라이더, 카드를 채팅 말풍선(흰색)과 톤 구분(카테고리 좌측 컬러바 + 연한 틴트).

### ③-1. `PolicyCardMini.jsx` 루트 `<article>` 스타일 교체 (line 8~11)
```jsx
// 변경 전:
//   <article style={{ background:'white',border:'1.5px solid #f1f5f9',borderRadius:16,padding:16,animation:'fadeUp 0.25s ease' }}>
// 변경 후:
<article style={{
  background:`${cat.color}08`, border:'1.5px solid #f1f5f9', borderLeft:`4px solid ${cat.color}`,
  borderRadius:16, padding:16, animation:'fadeUp 0.25s ease',
  flex:'0 0 auto', width:268, maxWidth:'80vw', height:'100%',
  display:'flex', flexDirection:'column', boxSizing:'border-box',
}}>
```
> `cat`은 이미 line 4 `const cat = categoryMeta(policy.category)`로 있음. **App.jsx의 CAT_COLORS를 import하지 마라**(key가 영문이라 매칭 안 됨). 반드시 `categoryMeta(policy.category).color` 사용.

### ③-2. 긴 정책명 2줄 말줄임 (line 26 h3)
```jsx
// 변경 후 h3 style에 추가:
<h3 style={{margin:'0 0 6px',fontSize:15,fontWeight:700,color:'#1e293b',lineHeight:1.4,
  display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
```

### ③-3. (선택) 링크 하단 정렬 (line 58~64 `<a>`)
`marginTop:10` → `marginTop:'auto',paddingTop:10` (카드 높이 stretch 시 버튼 줄맞춤). link 없는 카드도 맞추려면 line 35 `<dl>`에 `flex:1` 추가.

### ③-4. `ChatBotView.jsx` 카드 컨테이너 교체 (line 254~261)
```jsx
// 변경 후:
{msg.policies?.length>0&&(
  <div style={{
    display:'flex',flexDirection:'row',gap:12,alignItems:'stretch',marginTop:10,marginLeft:42,
    overflowX:'auto',overflowY:'hidden',paddingBottom:6,
    scrollSnapType:'x proximity',WebkitOverflowScrolling:'touch',scrollbarWidth:'thin',
  }}>
    {msg.policies.map((p)=>(
      <div key={p.id} style={{scrollSnapAlign:'start',display:'flex'}}>
        <PolicyCardMini policy={p}/>
      </div>
    ))}
  </div>
)}
```
> 기존 `maxWidth:'80%'`는 **제거**(가로 슬라이더에선 카드가 안 보이게 됨). `flexDirection:'column'`→`'row'` + `overflowX:'auto'` 필수.

### ③ 엣지/주의
- 카드 0개 → 컨테이너 미렌더(기존 조건 유지).
- `flex:'0 0 auto'` 빼면 카드가 찌부됨(필수).
- 전역 스크롤바 `::-webkit-scrollbar{height:5px}`(App.jsx GLOBAL_CSS)가 이미 있어 얇게 적용됨.
- 틴트 `${cat.color}08` 이상 진하게 주면 내부 배지(`15`)와 대비 사라짐.

### ③ 완료 기준
- [ ] 카드 2개+ 가로 스크롤/스와이프
- [ ] 카테고리별 좌측 컬러바 색 다름 + 흰 말풍선과 톤 차이
- [ ] 카드 1개도 자연스러움 / 긴 정책명 2줄 말줄임
- [ ] `npm run build` 통과

---

## 작업 ① — 대화 저장 + 이어서 채팅 (localStorage)  [난이도 中, ~2.5시간]

**목표**: 대화 localStorage 영속화 + "이어서 채팅"(apiHistory까지 복원해 LLM 맥락 유지) + 여러 대화 목록 드로어. 저장 로직은 전부 신규 `chatStore.js`.

### ①-1. 신규 파일 `src/chatbot/chatStore.js` 생성 (전체 그대로)
```js
// src/chatbot/chatStore.js
// 대화 영속 계층 추상화. 추후 서버 전환 시 이 파일 내부만 교체.
// 저장소: localStorage. 손상 JSON 방어 + LRU 용량관리.
const NS = 'yoa:chat'
const K_INDEX = `${NS}:index`
const K_SESSION = (id) => `${NS}:s:${id}`
const K_LAST = `${NS}:last`
const MAX_SESSIONS = 30

function safeRead(key, fallback) {
  try { const s = localStorage.getItem(key); return s === null ? fallback : JSON.parse(s) }
  catch { return fallback }
}
function safeWrite(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true } catch { return false }
}
function readIndex() { const idx = safeRead(K_INDEX, []); return Array.isArray(idx) ? idx : [] }
function writeIndex(idx) { safeWrite(K_INDEX, idx) }

export function newId() {
  return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
}
export function listSessions() {
  return readIndex().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}
export function getSession(id) {
  if (!id) return null
  const s = safeRead(K_SESSION(id), null)
  if (!s || typeof s !== 'object' || !Array.isArray(s.messages)) return null
  return s
}
export function saveSession(session) {
  if (!session || !session.id) return
  const cleanMessages = (session.messages || []).filter((m) => m && !m.streaming).map(({ streaming, ...r }) => r)
  const now = Date.now()
  const full = {
    id: session.id, title: session.title || '새 대화', messages: cleanMessages,
    apiHistory: Array.isArray(session.apiHistory) ? session.apiHistory : [],
    qCount: session.qCount ?? 0, remaining: session.remaining ?? null,
    model: session.model || '', mode: 'chat',           // ★[검수반영] 항상 chat으로 저장(guided 복원 데드UI 방지)
    createdAt: session.createdAt || now, updatedAt: now,
  }
  let ok = safeWrite(K_SESSION(full.id), full)
  if (!ok) { pruneOldest(1); ok = safeWrite(K_SESSION(full.id), full) }
  let idx = readIndex().filter((e) => e.id !== full.id)
  idx.unshift({ id: full.id, title: full.title, updatedAt: full.updatedAt })
  idx.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  if (idx.length > MAX_SESSIONS) {
    idx.slice(MAX_SESSIONS).forEach((e) => { try { localStorage.removeItem(K_SESSION(e.id)) } catch {} })
    idx = idx.slice(0, MAX_SESSIONS)
  }
  writeIndex(idx)
  return full
}
export function removeSession(id) {
  if (!id) return
  try { localStorage.removeItem(K_SESSION(id)) } catch {}
  writeIndex(readIndex().filter((e) => e.id !== id))
  if (getLastSessionId() === id) { try { localStorage.removeItem(K_LAST) } catch {} }
}
export function clearAllSessions() {            // ★[검수반영-PII] 전체 삭제
  readIndex().forEach((e) => { try { localStorage.removeItem(K_SESSION(e.id)) } catch {} })
  try { localStorage.removeItem(K_INDEX); localStorage.removeItem(K_LAST) } catch {}
}
export function getLastSessionId() { return safeRead(K_LAST, null) }
export function setLastSessionId(id) { safeWrite(K_LAST, id) }
function pruneOldest(n) {
  const idx = readIndex().slice().sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))
  idx.slice(0, n).forEach((e) => { try { localStorage.removeItem(K_SESSION(e.id)) } catch {} })
  writeIndex(idx.slice(n))
}
export function deriveTitle(messages) {
  const f = (messages || []).find((m) => m && m.from === 'user' && m.text)
  if (!f) return '새 대화'
  const t = f.text.trim().replace(/\s+/g, ' ')
  return t.length > 30 ? t.slice(0, 30) + '…' : t   // 최대 30자 + 말줄임
}
```
> **세션 데이터 구조**: `{id,title,messages,apiHistory,qCount,remaining,model,mode:'chat',createdAt,updatedAt}`. messages의 `policies`는 **full 객체 그대로 저장**(ID만 저장 금지 — 복원 시 재조회 불필요). `mode`는 항상 `'chat'`으로 저장(아래 검수반영).
> **[검수반영-추상화 한계]** 이번 버전은 동기 함수다. 서버 전환 시 list/get/save/remove를 async(Promise)로 바꾸고 호출부를 await로 고쳐야 한다(정해진 작업, 스케일업 §6 참조). `setLastSessionId`는 saveSession과 분리해 호출부에서 명시 호출(서버 동기화 시 last는 기기-로컬 유지하기 위함).

### ①-2. import 교체 (line 1)
```js
// 변경 전: import { useState, useRef, useEffect } from 'react'
// 변경 후 (line 1 전체를 아래 블록으로 교체):
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  listSessions, getSession, saveSession, removeSession, clearAllSessions,
  newId, getLastSessionId, setLastSessionId, deriveTitle,
} from './chatStore'
```

### ①-3. state 추가 (line 23 `const [ready,...]` 바로 위)
```js
  // ── 대화 저장/복원 ──
  const [sessionId, setSessionId] = useState(() => getLastSessionId() || newId())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const createdAtRef = useRef(Date.now())
  const hydratedRef = useRef(false)
  const saveTimerRef = useRef(null)
  const activeReqRef = useRef(null)   // ★[검수반영] 스트리밍 레이스 가드용 요청 sessionId 스냅샷
```

### ①-4. 마운트 복원 effect (정책 로드 effect line 54~58 아래) — ready 가드 포함
```js
  // 마지막 세션 복원(이어서 채팅). ready 이후 1회. messages+apiHistory까지 살려 맥락 유지.
  useEffect(() => {
    if (!ready || hydratedRef.current) return            // ★[검수반영] ready 가드(정책캐시 로드 후)
    const last = getLastSessionId()
    const s = last ? getSession(last) : null
    if (s) {
      setSessionId(s.id)
      createdAtRef.current = s.createdAt || Date.now()
      if (s.messages?.length) setMessages(s.messages)
      setApiHistory(s.apiHistory || [])
      setQCount(s.qCount ?? 0)
      setRemaining(s.remaining ?? null)
      if (s.model) setModel(s.model)                      // ★ 빈값 가드(자동/수동 복원 동일)
      // mode는 항상 chat (guided 복원 안 함 — 데드UI 방지)
    }
    hydratedRef.current = true
  }, [ready])
```

### ①-5. 디바운스 자동 저장 effect (위 effect 아래)
```js
  useEffect(() => {
    if (!hydratedRef.current) return
    const hasUser = messages.some((m) => m.from === 'user')
    const isStreaming = messages.some((m) => m.streaming)
    if (!hasUser || isStreaming || mode === 'guided') return   // ★ 빈대화/스트리밍/guided 저장 안 함
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const saved = saveSession({
        id: sessionId, title: deriveTitle(messages), messages, apiHistory,
        qCount, remaining, model, createdAt: createdAtRef.current,
      })
      if (saved) setLastSessionId(saved.id)                     // ★ last 분리 호출
    }, 600)
    return () => saveTimerRef.current && clearTimeout(saveTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, apiHistory, qCount, remaining, model, mode, sessionId])
```

### ①-6. `resetSession` → `startNewSession` 교체 (line 84~93)
```js
  function flushSave() {  // 전환 직전 현재 대화 저장(유실 방지)
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
    setSessionId(nid); createdAtRef.current = Date.now()
    setMessages([{ from: 'bot', text: '새 대화를 시작했어요! 😊 나이·지역·관심사를 말씀해 주세요.' }])
    setApiHistory([]); setQCount(0); setRemaining(null); setInput(''); setMode('chat'); setStep(null)
  }
  const resetSession = startNewSession   // 기존 호출부(line 290·418) 호환 별칭
```

### ①-7. 드로어 핸들러 (startNewSession 아래)
```js
  const openDrawer = useCallback(() => { flushSave(); setSessions(listSessions()); setDrawerOpen(true) }, [/* flushSave 안정 */])
  function loadSession(id) {
    if (id === sessionId) { setDrawerOpen(false); return }
    flushSave()
    const s = getSession(id)
    if (!s) { setDrawerOpen(false); return }
    setSessionId(s.id); createdAtRef.current = s.createdAt || Date.now()
    setMessages(s.messages?.length ? s.messages : [])
    setApiHistory(s.apiHistory || [])
    setQCount(s.qCount ?? 0); setRemaining(s.remaining ?? null)
    if (s.model) setModel(s.model)                  // ★ 빈값 가드(자동복원과 통일)
    setMode('chat'); setStep(null); setInput(''); setLastSessionId(s.id); setDrawerOpen(false)
  }
  function deleteSession(id, e) {
    e?.stopPropagation(); removeSession(id); setSessions(listSessions())
    if (id === sessionId) startNewSession()
  }
  function clearAll() {
    if (!confirm('저장된 모든 대화를 삭제할까요? 되돌릴 수 없어요.')) return
    clearAllSessions(); setSessions([]); startNewSession(); setDrawerOpen(false)
  }
```
> `openDrawer`의 useCallback deps는 flushSave가 매 렌더 새로 생기므로 정확히는 `[]`로 두고 eslint-disable, 또는 useCallback 없이 일반 함수로 둬도 무방.

### ①-8. 스트리밍 레이스 가드 (sendMessage 내부)  ★[검수반영]
`sendMessage` 안에서, fetch 직전 요청 sessionId를 스냅샷하고, patch/setApiHistory 적용 전 현재 sessionId와 같은지 확인:
```js
// setLoading(true) 직후:
const reqSession = sessionId
activeReqRef.current = reqSession
// ... reader 루프의 patchLast(line 127·131) 와 성공분기 setApiHistory(line 134) 를 가드:
//   if (activeReqRef.current !== reqSession) return   // 세션 바뀌면 이 응답 폐기
// 구체: 스트리밍 while 루프 안 patchLast 앞, 그리고 완료 patchLast/ setApiHistory 앞에 위 가드 추가.
```
그리고 **로딩/스트리밍 중엔 드로어·새대화 버튼 비활성**(아래 헤더바/드로어에 `disabled`).

### ①-9. 최상위 div에 position:relative (line 217)
```jsx
// 변경 후:
<div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f8fafc',position:'relative'}}>
```

### ①-10. 헤더바 삽입 (line 217 여는 div 바로 다음, line 218 `{/* 메시지 영역 */}` 앞)
```jsx
{/* 헤더바 */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1.5px solid #f1f5f9',background:'white'}}>
  <button onClick={openDrawer} disabled={loading} style={{display:'flex',alignItems:'center',gap:6,border:'1.5px solid #e2e8f0',background:'white',color:'#374151',borderRadius:10,padding:'7px 12px',fontSize:13,fontWeight:700,cursor:loading?'default':'pointer',opacity:loading?0.5:1}}>☰ 대화목록</button>
  <button onClick={startNewSession} disabled={loading} style={{border:'none',cursor:loading?'default':'pointer',borderRadius:10,padding:'7px 12px',background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',fontSize:13,fontWeight:800,opacity:loading?0.5:1}}>＋ 새 대화</button>
</div>
```

### ①-11. 드로어 + 백드롭 (최상위 return `</div>` 직전, line 428 마지막 닫기 앞)
```jsx
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
            <button onClick={(e)=>deleteSession(s.id,e)} title="삭제" style={{border:'none',background:'none',cursor:'pointer',fontSize:15,color:'#cbd5e1',flexShrink:0,padding:4}}>🗑</button>
          </div>
        ))}
      </div>
      {/* ★[검수반영-PII] 안내 + 전체삭제 */}
      <div style={{borderTop:'1.5px solid #f1f5f9',padding:'10px 14px'}}>
        <p style={{fontSize:11,color:'#94a3b8',lineHeight:1.5,margin:'0 0 8px'}}>※ 대화는 이 브라우저에만 저장돼요. 공용 PC에서는 사용 후 삭제하세요.</p>
        <button onClick={clearAll} style={{width:'100%',padding:'8px',borderRadius:8,border:'1.5px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer'}}>전체 대화 삭제</button>
      </div>
    </aside>
  </>
)}
```

### ① 엣지/주의 (검수 반영)
- **guided 복원 안 함**: guided는 일시적 폴백. 저장 시 mode='chat' 고정, 복원도 chat. (mode/step 불일치로 입력 UI 사라지는 데드 상태 방지)
- **스트리밍 레이스**: 응답 도중 세션 전환 시 이전 응답이 새 세션에 꽂히지 않게 `activeReqRef` 가드 + 로딩 중 버튼 disabled.
- **model 빈값 덮어쓰기**: 자동/수동 복원 모두 `if (s.model) setModel(...)`로 통일.
- **PII**: 대화는 평문 localStorage 저장 + 로그인 없어 공용 PC면 타인이 봄 → 안내문 + 전체삭제 버튼 필수.
- 손상 JSON/quota 초과/시크릿 모드: chatStore가 try/catch로 방어(앱 크래시 없음).
- `policies`는 full 객체 저장(ID-only 금지). `streaming:true` 메시지는 저장에서 제거(이중 가드).

### ① 완료 기준
- [ ] `chatStore.js` 생성·export 완비
- [ ] 질문 1회 후 새로고침 → 직전 대화(메시지+카드) 복원
- [ ] 복원 후 추가 질문 시 LLM이 이전 맥락 기억(apiHistory 복원)
- [ ] ☰ 대화목록 → 드로어, 항목 클릭 복원, 🗑 삭제, 현재 세션 강조
- [ ] 새대화/8회소진/guided done 으로 시작 시 직전 대화가 목록에 남음
- [ ] 초기 인사만 있는 빈 대화는 저장 안 됨
- [ ] 스트리밍 중 드로어/새대화 버튼 비활성, 응답 도중 전환해도 응답이 엉뚱한 세션에 안 꽂힘
- [ ] 드로어에 PII 안내 + 전체삭제 동작
- [ ] `npm run build` 통과, inline 스타일만

---

## 5. 최종 검증 + 어디서 멈추나  ★중요

1. `npm run build` 통과(③ 후, ① 후 각각).
2. `npm run dev`로 ②③① 전부 수동 확인(위 각 완료기준).
3. 백엔드 무수정 확인: `youth-chatbot-api`는 한 글자도 안 건드림.
4. inline 스타일만, CSS 클래스 0. **루트 `README.md` 미수정 확인**(§7 참조).
5. **`feature/chatbot-ux` 브랜치에 커밋까지만 하고 멈춘다.**
   ```bash
   git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy add src/chatbot/
   git -C C:/Users/superjk/Desktop/Geabong/youthsupportpolicy commit -m "feat(chatbot): 대화 저장·이어가기 + 연관질문 칩 + 정책카드 가로 슬라이더"
   ```
6. **🚫 여기서 STOP — `push`·PR 생성은 하지 마라.** 종권이 직접 확인 후 푸시/PR 시점을 정한다.
   완료 보고: 변경 파일 목록 + 각 작업 완료체크리스트 결과 표.

---

## 6. 스케일업(상용화) 전략 — 로그인 + 대화 서버 이전 (※6/17 작업 아님)

> 데모 후 단계. **6/17엔 위 ①②③만.** 로그인은 (1)이메일 (2)카카오 (3)구글로 계획.

**권장 스택: Supabase** — 이메일/비번 + 카카오 OAuth + 구글 OAuth + Postgres + RLS를 무료 티어 하나로. (Firebase=카카오 번거로움 / 자체JWT=백엔드 필요로 제약 충돌)

**단계:**
1. **인증 인프라**: `npm i @supabase/supabase-js`. `src/supabaseClient.js`에서 `import.meta.env.VITE_SUPABASE_URL/ANON_KEY`(Vite라 `VITE_` 필수, `REACT_APP_`/`process.env` 금지). `.env`는 gitignore, `.env.example`만 커밋. Supabase 대시보드에서 Email/Google/Kakao Provider 설정 + 리다이렉트 URL(GitHub Pages 서브패스 포함) 등록.
2. **전역 인증 상태**: `src/auth/AuthContext.jsx` (getSession + onAuthStateChange, signInEmail/signUpEmail/signInOAuth/signOut). `main.jsx`에서 `<AuthProvider><App/></AuthProvider>`.
3. **목업→실인증**: App.jsx LoginPage(1090)·SignupPage(1220)의 "준비 중" 처리를 `signInWithPassword`/`signUp`으로 교체. 카카오/네이버 정적 버튼 → 카카오/구글 OAuth 버튼(`signInOAuth`). 헤더 3곳(데스크탑 1558·TopNav 1429·모바일 1600) user 유무 토글.
4. **대화 서버 이전**: `chatStore.js`의 시그니처(list/get/save/remove)는 그대로, 내부만 "user 있으면 Supabase, 없으면 localStorage" 분기. **이때 함수가 async여야 함** → 6/17 localStorage 버전을 미리 async로 만들어두면 호출부 안 고쳐도 됨(선택). conversations 테이블 + RLS:
```sql
create table public.conversations (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '', messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now());
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
alter table public.conversations enable row level security;
create policy own_select on public.conversations for select using (auth.uid()=user_id);
create policy own_insert on public.conversations for insert with check (auth.uid()=user_id);
create policy own_update on public.conversations for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy own_delete on public.conversations for delete using (auth.uid()=user_id);
```
5. **마이그레이션**: 최초 로그인 시 localStorage 대화를 서버로 1회 upsert + `yoa:migrated:<uid>` 플래그. 비로그인은 localStorage 폴백.

**보안 주의**: anon key는 공개용(RLS가 보안), **service_role key는 프론트 절대 금지**. RLS enable 필수(빠지면 전 사용자 대화 노출). 이메일 confirm은 데모 OFF / 상용 ON.

---

## 7. 하지 말 것
- 백엔드(api/chat.js)·절대수정금지 함수 수정 ❌
- CSS 클래스/파일 도입 ❌ (inline 유지)
- policies를 ID만 저장 ❌ (full 객체 저장)
- guided 모드 세션 복원 ❌ (chat으로만)
- localStorage 직접 호출을 ChatBotView에 흩뿌리기 ❌ (전부 chatStore.js 경유)
- 6/17에 스케일업(Supabase/로그인) 손대기 ❌ (별도 단계)
- **루트 `README.md` 수정 ❌** — 팀 공용(윤경님 관리)이라 머지 때 충돌·덮어쓰기 발생. 챗봇 관련 문서가 필요하면 **`src/chatbot/README.md`** 에만 적는다(이미 생성됨).
- `push` / PR 생성 ❌ (커밋까지만, §5-6 참조)
