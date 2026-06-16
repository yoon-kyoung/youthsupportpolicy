const ALLOWED_ORIGINS = [
  'https://yoon-kyoung.github.io',
  'https://youthsupportpolicy-preview.vercel.app',
  'https://youthsupportpolicy-preview-livid.vercel.app', // geabong Vercel 계정 프리뷰 (2026-06-12~)
  'https://chatbot-ux-v2-demo.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

export function applyCors(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  res.setHeader('Access-Control-Expose-Headers', 'X-Policy-Ids, X-Remaining, X-Rate-Limited, X-Retry-After')
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400')
    res.status(204).end()
    return true
  }
  return false
}
