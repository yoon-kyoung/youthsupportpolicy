// Browser-local chat persistence. Swap this module later if account/server sync is added.
const SESSIONS_KEY = 'yoa:chat:sessions'
const LAST_KEY = 'yoa:chat:last'
const MAX_SESSIONS = 20

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function newId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function listSessions() {
  const rows = safeParse(localStorage.getItem(SESSIONS_KEY), [])
  return Array.isArray(rows)
    ? rows.filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    : []
}

export function getSession(id) {
  return listSessions().find((session) => session.id === id) || null
}

export function saveSession(session) {
  if (!session?.id) return null
  const messages = (session.messages || []).filter((message) => !message.streaming)
  if (!messages.some((message) => message.from === 'user')) return null

  const saved = {
    ...session,
    messages,
    title: session.title || deriveTitle(messages),
    updatedAt: Date.now(),
  }
  const next = [saved, ...listSessions().filter((row) => row.id !== saved.id)].slice(0, MAX_SESSIONS)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next))
  setLastSessionId(saved.id)
  return saved
}

export function removeSession(id) {
  const next = listSessions().filter((session) => session.id !== id)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next))
  if (getLastSessionId() === id) {
    localStorage.removeItem(LAST_KEY)
  }
}

export function clearAllSessions() {
  localStorage.removeItem(SESSIONS_KEY)
  localStorage.removeItem(LAST_KEY)
}

export function getLastSessionId() {
  return localStorage.getItem(LAST_KEY)
}

export function setLastSessionId(id) {
  if (id) localStorage.setItem(LAST_KEY, id)
}

export function deriveTitle(messages = []) {
  const firstUser = messages.find((message) => message.from === 'user' && message.text)
  return (firstUser?.text || '새 대화').replace(/\s+/g, ' ').trim().slice(0, 42)
}
