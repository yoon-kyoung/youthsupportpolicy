// ────────────────────────────────────────────────────────────
// api/usage.js — 관리자용 사용량/비용 조회 + 기본모델 변경
//   GET  /api/usage   → 사용량 통계 (ADMIN_PASSWORD 필요)
//   POST /api/usage   → { defaultModel } 변경
//   인증: 헤더 x-admin-key 또는 쿼리 ?key= 가 ADMIN_PASSWORD와 일치해야 함
// ────────────────────────────────────────────────────────────
import { getDefaultModel, setDefaultModel } from '../lib/settings.js'
import { getUsageFromSheet, DAILY_LIMIT_USD, DAILY_REQUEST_LIMIT, USD_TO_KRW } from '../lib/sheetUsage.js'
import { ALLOWED_MODELS } from '../lib/aiConfig.js'

function authed(req) {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) return false
  const got = req.headers['x-admin-key'] || req.query?.key
  return got === pw
}

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  let s = ''
  for await (const c of req) s += c
  return JSON.parse(s || '{}')
}

import { applyCors } from '../lib/cors.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  res.setHeader('Cache-Control', 'no-store')

  if (!process.env.ADMIN_PASSWORD) {
    res.status(503).json({ error: 'ADMIN_PASSWORD 미설정 (Vercel 환경변수에 추가하세요)' })
    return
  }
  if (!authed(req)) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다' })
    return
  }

  if (req.method === 'POST') {
    try {
      const b = await readBody(req)
      if (b?.defaultModel && ALLOWED_MODELS.includes(b.defaultModel)) {
        await setDefaultModel(b.defaultModel)
      }
    } catch {
      /* 무시하고 현재 상태 반환 */
    }
  }

  // 사용량은 구글시트(영구 DB)에서 직접 집계 → 서버리스 인메모리 분산 문제 해결
  const usage = await getUsageFromSheet()
  res.status(200).json({
    ...usage,
    dailyLimitUsd: DAILY_LIMIT_USD,
    dailyRequestLimit: DAILY_REQUEST_LIMIT,
    usdToKrw: USD_TO_KRW,
    settings: { defaultModel: await getDefaultModel() },
    persistent: true, // 시트 기반이라 항상 영구
  })
}
