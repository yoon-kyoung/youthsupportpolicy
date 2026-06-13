// ────────────────────────────────────────────────────────────
// 빌드타임 prefetch: 온통청년 API → public/policies.json
//
// 로컬:   node --env-file=.env scripts/fetch-policies.mjs
// Actions: env로 YOUTH_API_KEY 주입 후 동일 실행
//
// ⚠️ API 키는 process.env로만 읽고 절대 파일에 기록하지 않음.
// ────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipToSido, SIDO_LIST } from '../src/chatbot/codes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const KEY = process.env.YOUTH_API_KEY
if (!KEY) {
  console.error('❌ YOUTH_API_KEY 환경변수가 없습니다. (.env 확인)')
  process.exit(1)
}

const BASE = 'https://www.youthcenter.go.kr/go/ythip/getPlcy'
const SIZE = 100      // 페이지당 건수
const MAX_PAGES = 40  // 안전 상한 (40 × 100 = 4000)

const num = (v) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}
const clean = (s) => (s ?? '').toString().replace(/\s+/g, ' ').trim()

const out = []
let totCount = Infinity
for (let page = 1; page <= MAX_PAGES; page++) {
  const url = `${BASE}?apiKeyNm=${KEY}&pageNum=${page}&pageSize=${SIZE}&rtnType=json`
  let res = await fetch(url)
  if (!res.ok) {
    // 마지막 페이지 등에서 간헐적 500 → 1회 재시도 후, 그래도 실패면 수집분으로 진행
    await new Promise((r) => setTimeout(r, 800))
    res = await fetch(url)
  }
  if (!res.ok) {
    console.warn(`⚠️ page ${page} HTTP ${res.status} — 여기까지 수집한 ${out.length}건으로 마무리`)
    break
  }
  const json = await res.json()
  totCount = num(json?.result?.pagging?.totCount) ?? totCount
  const list = json?.result?.youthPolicyList ?? []
  if (list.length === 0) break

  for (const it of list) {
    const regions = zipToSido(it.zipCd)
    const nationwide = regions.length === 0 || regions.length >= SIDO_LIST.length - 2
    // 연령: 제한없음(N)이거나 0~0이면 '무관'(null) 처리
    let minAge = num(it.sprtTrgtMinAge)
    let maxAge = num(it.sprtTrgtMaxAge)
    const ageLimit = it.sprtTrgtAgeLmtYn === 'Y'
    if (!ageLimit || (minAge === 0 && maxAge === 0)) { minAge = null; maxAge = null }
    out.push({
      id: clean(it.plcyNo),
      name: clean(it.plcyNm),
      category: clean(it.lclsfNm).split(',')[0].trim(),
      subCategory: clean(it.mclsfNm),
      summary: clean(it.plcyExplnCn),
      support: clean(it.plcySprtCn),
      minAge,
      maxAge,
      nationwide,
      regions: nationwide ? [] : regions,
      keywords: clean(it.plcyKywdNm).split(',').map((s) => s.trim()).filter(Boolean),
      applyUrl: clean(it.aplyUrlAddr),
      refUrl: clean(it.refUrlAddr1),
      period: clean(it.aplyYmd),
      org: clean(it.sprvsnInstCdNm) || clean(it.operInstCdNm),
    })
  }
  console.log(`📄 page ${page}: +${list.length}건 (누적 ${out.length}/${totCount})`)
  if (out.length >= totCount) break
}

const outPath = resolve(__dirname, '../public/policies.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(out), 'utf-8')
console.log(`✅ 저장 완료: public/policies.json (${out.length}건)`)
