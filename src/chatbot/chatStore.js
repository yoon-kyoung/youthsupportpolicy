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
    model: session.model || '', mode: 'chat',
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
export function clearAllSessions() {
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
  return t.length > 30 ? t.slice(0, 30) + '…' : t
}
