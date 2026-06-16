// ────────────────────────────────────────────────────────────
// api/config.js — 공개 설정 (비밀값 없음): 프론트 모델 드롭다운용
// ────────────────────────────────────────────────────────────
import { ALLOWED_MODELS, MODEL_LABELS } from '../lib/aiConfig.js'
import { getDefaultModel } from '../lib/settings.js'
import { applyCors } from '../lib/cors.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    models: ALLOWED_MODELS.map((id) => ({ id, label: MODEL_LABELS[id] || id })),
    defaultModel: await getDefaultModel(),
    hasKey: !!(process.env.UPSTAGE_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY),
    hasSheet: !!process.env.SHEET_WEBHOOK_URL,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
  })
}
