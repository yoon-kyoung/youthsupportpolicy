// ────────────────────────────────────────────────────────────
// 빌드타임 AI 요약: Groq (무료) → 각 정책 주요혜택 요약
//
// 실행:  node --env-file=.env scripts/summarize-policies.mjs
// 키:    .env 에 GROQ_API_KEY=gsk_... 추가 필요
//        → 무료 발급: https://console.groq.com
//
// - 중단 후 재실행해도 이어서 진행 (체크포인트 자동 저장)
// - 완료되면 public/policies.json 에 supportSummary 필드 추가됨
// ────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const KEY = process.env.GROQ_API_KEY
if (!KEY) {
  console.error('❌ GROQ_API_KEY 환경변수가 없습니다.')
  console.error('   1. https://console.groq.com 에서 무료 가입')
  console.error('   2. API Keys → Create API Key')
  console.error('   3. .env 파일에 GROQ_API_KEY=gsk_... 추가')
  process.exit(1)
}

const POLICIES_PATH   = resolve(__dirname, '../public/policies.json')
const CHECKPOINT_PATH = resolve(__dirname, '../public/summaries-checkpoint.json')
const CONCURRENCY = 5
const DELAY_MS    = 300

const policies = JSON.parse(readFileSync(POLICIES_PATH, 'utf-8'))

let checkpoint = {}
if (existsSync(CHECKPOINT_PATH)) {
  checkpoint = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf-8'))
  console.log(`📂 이어서 진행: 이미 완료된 ${Object.keys(checkpoint).length}건`)
}

const toProcess = policies.filter(p =>
  p.support && p.support.length > 30 && !checkpoint[p.id]
)
console.log(`📋 전체: ${policies.length}건 | 남은 요약: ${toProcess.length}건`)
if (toProcess.length === 0) {
  console.log('✅ 이미 모두 완료되었습니다.')
  process.exit(0)
}

async function summarize(supportText, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 120,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: `다음 청년지원정책의 주요 혜택을 2~3문장으로 요약하세요.
무엇을 지원받는지, 얼마나 받는지 핵심만 간결하게 한국어로 작성하세요.
신청 자격·방법·기간은 제외하세요.

${supportText.substring(0, 800)}`,
          }],
        }),
      })
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 5000 * (i + 1)))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json.choices?.[0]?.message?.content?.trim() || ''
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  return ''
}

let failed = 0

for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  const batch = toProcess.slice(i, i + CONCURRENCY)
  await Promise.all(
    batch.map(async (p) => {
      try {
        const summary = await summarize(p.support)
        checkpoint[p.id] = summary
      } catch (e) {
        console.warn(`\n⚠️  ${p.name}: ${e.message}`)
        checkpoint[p.id] = ''
        failed++
      }
    })
  )
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint), 'utf-8')
  const done = Object.keys(checkpoint).length
  process.stdout.write(`\r✅ ${done}/${policies.length} 완료 (실패: ${failed})   `)
  if (i + CONCURRENCY < toProcess.length) {
    await new Promise(r => setTimeout(r, DELAY_MS))
  }
}

console.log('\n')

// policies.json에 supportSummary 필드 병합
const result = policies.map(p => ({
  ...p,
  supportSummary: checkpoint[p.id] ?? p.supportSummary ?? '',
}))
writeFileSync(POLICIES_PATH, JSON.stringify(result), 'utf-8')

try { unlinkSync(CHECKPOINT_PATH) } catch {}

console.log(`✅ 저장 완료: public/policies.json`)
console.log(`다음 단계: npm run build && npm run deploy`)
