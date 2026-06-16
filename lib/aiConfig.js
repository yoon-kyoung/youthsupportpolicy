// ────────────────────────────────────────────────────────────
// lib/aiConfig.js — 모델 목록 / 가격표 / 기본값
// OpenRouter 무료 모델 기준 (function calling 지원 모델만)
// 환경변수로 덮어쓸 수 있음 (Vercel 환경변수에서 설정)
// ────────────────────────────────────────────────────────────

// $/1M tokens — OpenRouter 무료 모델은 0
export const MODEL_PRICES = {
  'openrouter/free':                          { in: 0, out: 0 },
  'google/gemma-4-31b-it:free':              { in: 0, out: 0 },
  'google/gemma-4-26b-a4b-it:free':          { in: 0, out: 0 },
  'openai/gpt-oss-120b:free':                { in: 0, out: 0 },
  'openai/gpt-oss-20b:free':                 { in: 0, out: 0 },
  'nex-agi/nex-n2-pro:free':                 { in: 0, out: 0 },
  'nvidia/nemotron-3-ultra-550b-a55b:free':   { in: 0, out: 0 },
  // Solar (Upstage 직접 API) — 유료. solar-mini가 제일 쌈(입출력 동일 $0.15/1M).
  'solar-mini':                               { in: 0.15, out: 0.15 },
  'solar-pro2':                               { in: 0.15, out: 0.60 },
  _default:                                   { in: 0, out: 0 },
}

export const MODEL_LABELS = {
  'openrouter/free':                          '🔀 자동 선택 (무료 · 품질 편차 있음)',
  'google/gemma-4-31b-it:free':              '⭐ Gemma 4 31B · 추천 (무료)',
  'google/gemma-4-26b-a4b-it:free':          'Gemma 4 26B · 경량 (무료)',
  'openai/gpt-oss-120b:free':                'GPT-OSS 120B · 고성능 (무료)',
  'openai/gpt-oss-20b:free':                 'GPT-OSS 20B · 빠름 (무료)',
  'nex-agi/nex-n2-pro:free':                 'Nex N2 Pro · 에이전트 (무료)',
  'nvidia/nemotron-3-ultra-550b-a55b:free':   'Nemotron Ultra 550B · 최대 (무료)',
  'solar-mini':                               '🌞 Solar Mini · 한국어 (Upstage)',
  'solar-pro2':                               '🌞 Solar Pro 2 · 고품질 (Upstage)',
}

// 기본 모델: 교수님 피드백(2026-06-16)으로 한국어 특화 Solar로 전환.
// 답변 생성은 Solar(Upstage)를 1순위로 쓰고, 실패 시 OpenAI 직접 API로 백업한다.
// 이번 데모는 답변 품질 우선이라 solar-pro2를 기본으로 둔다. 비용을 줄일 때 env로 solar-mini 지정.
// DEFAULT_MODEL 환경변수는 관리자 시트(settings.defaultModel)의 오래된 값보다 우선한다.
export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'solar-pro2'

// 함수콜(조건파악/도구호출) 전용 모델 — 답변 생성과 분리.
// openrouter/free 오토라우터가 가끔 초대형 모델을 물어 느려지므로,
// 도구호출만 빠른 소형 모델(tool 지원)로 고정해 전체 응답 시간을 줄인다.
// 답변(2차 호출)은 사용자/관리자가 고른 모델을 그대로 사용.
export const FUNCTION_CALL_MODEL = process.env.FUNCTION_CALL_MODEL || 'openai/gpt-oss-20b:free'

export const ALLOWED_MODELS = (process.env.ALLOWED_MODELS || 'solar-mini,solar-pro2,openrouter/free,google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,openai/gpt-oss-120b:free,openai/gpt-oss-20b:free')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function priceOf(model) {
  return MODEL_PRICES[model] || MODEL_PRICES._default
}

export function costOf(model, promptTokens = 0, completionTokens = 0) {
  const p = priceOf(model)
  return (promptTokens / 1e6) * p.in + (completionTokens / 1e6) * p.out
}

export const USD_TO_KRW = Number(process.env.USD_TO_KRW || 1500)
export function costKrwOf(model, promptTokens = 0, completionTokens = 0) {
  return costOf(model, promptTokens, completionTokens) * USD_TO_KRW
}
