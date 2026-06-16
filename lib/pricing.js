// ────────────────────────────────────────────────────────────
// lib/pricing.js — OpenRouter 유료판 가격으로 ":free" 모델의 "예상 비용(USD)" 산출
//
// :free 모델은 실비 $0지만, 같은 모델의 유료판 가격 × 토큰수로
// "유료였다면 얼마였을지" 추정치를 계산한다.
// 가격은 OpenRouter /models API에서 실시간 조회하되, 모듈 캐시(6h TTL)로
// 콜드스타트 때만 1회 fetch → 매 요청 지연 없음.
// (estimateCostUsd는 finalize 단계 = 스트리밍 끝난 뒤 호출되므로 사용자 체감 지연 0)
// ────────────────────────────────────────────────────────────

const MODELS_URL = 'https://openrouter.ai/api/v1/models'
const TTL_MS = 6 * 3600 * 1000
const FETCH_TIMEOUT_MS = 4000

// prices: { [modelId]: { prompt, completion } }  단위 = USD per token
let CACHE = { at: 0, prices: null }
let INFLIGHT = null // 동시 호출 시 fetch 1번만 (early-warm + finalize가 공유)

async function loadPrices() {
  const now = Date.now()
  if (CACHE.prices && now - CACHE.at < TTL_MS) return CACHE.prices
  if (INFLIGHT) return INFLIGHT // 이미 fetch 진행 중이면 그 promise 재사용
  INFLIGHT = (async () => {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
      const r = await fetch(MODELS_URL, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!r.ok) throw new Error('models ' + r.status)
      const data = (await r.json()).data || []
      const prices = {}
      for (const m of data) {
        const p = m.pricing || {}
        prices[m.id] = { prompt: Number(p.prompt) || 0, completion: Number(p.completion) || 0 }
      }
      CACHE = { at: now, prices }
      return prices
    } catch {
      return CACHE.prices || {} // 실패 시 옛 캐시 or 빈 객체(→ 추정 불가)
    } finally {
      INFLIGHT = null
    }
  })()
  return INFLIGHT
}

// 요청 처리 시작 시 호출 → 가격 fetch를 LLM 호출과 병렬로 미리 진행(기다리지 않음).
// finalize의 estimateCostUsd는 이때 데워진 캐시/in-flight를 써서 직렬 지연 0.
export function prewarmPrices() {
  loadPrices().catch(() => {})
}

// modelId(예: 'nvidia/nemotron-3-ultra-550b-a55b-20260604:free')의 유료판 가격 찾기.
//  1) ':free' 떼기  2) 날짜 접미사(-YYYYMMDD)까지 떼기  3) 원본 id
// (응답 model에는 -20260604 같은 날짜가 붙지만 /models 목록 id엔 없는 경우가 있음)
function findPrice(prices, modelId) {
  const noFree = modelId.replace(/:free$/, '')
  if (prices[noFree]) return prices[noFree]
  const noDate = noFree.replace(/-\d{8}$/, '')
  if (prices[noDate]) return prices[noDate]
  // 유료판이 없으면 null → 예상비용 빈칸("추정불가").
  // ':free' 항목 자체(가격 0)로 폴백하지 않음 — 0과 "추정불가"를 구분하기 위함.
  return null
}

// 유료 기준 예상 비용(USD). 유료판이 없으면(완전 무료전용 모델) null.
export async function estimateCostUsd(modelId, promptTokens = 0, completionTokens = 0) {
  if (!modelId) return null
  const prices = await loadPrices()
  const pr = findPrice(prices, modelId)
  if (!pr) return null
  return promptTokens * pr.prompt + completionTokens * pr.completion
}
