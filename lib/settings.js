// ────────────────────────────────────────────────────────────
// lib/settings.js — 앱 설정도 구글시트(=DB)에 저장. 서버 인메모리 0.
//
// 저장 위치: 같은 스프레드시트의 'settings' 탭 (컬럼: 키 | 값 | 수정시각)
//   - 읽기: gviz CSV (sheet=settings) — 공개 시트라 인증 불필요, 빠름
//   - 쓰기: GAS 웹훅에 {type:'setting', key, value} POST → 해당 탭에 upsert
//
// settings 탭이 아직 없거나 조회 실패해도 env/기본값으로 안전하게 폴백.
// ────────────────────────────────────────────────────────────
import { DEFAULT_MODEL } from './aiConfig.js'
import { parseCsv } from './csv.js'

const SHEET_ID = '1vKSirUpGTuvFy40Hf5y9l_vOp5aNtRFuuC8jTfFpKfs'
const SETTINGS_CSV_URL =
  process.env.SETTINGS_CSV_URL ||
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=0&sheet=settings`
const WEBHOOK = process.env.SHEET_WEBHOOK_URL

// settings 탭 전체를 { key: value } 로
export async function getSettings() {
  try {
    const r = await fetch(SETTINGS_CSV_URL, { redirect: 'follow' })
    if (!r.ok) return {}
    const rows = parseCsv(await r.text())
    // gviz는 'settings' 탭이 없으면 첫 시트(로그)로 폴백함 → 헤더 첫 칸으로 진짜 settings인지 판별
    const head = ((rows[0] && rows[0][0]) || '').trim()
    if (head !== '키' && head.toLowerCase() !== 'key') return {} // settings 탭 아님 → 폴백
    const out = {}
    for (const row of rows) {
      const k = (row[0] || '').trim()
      const v = (row[1] || '').trim()
      if (!k || k === '키' || k.toLowerCase() === 'key') continue // 헤더 스킵
      out[k] = v
    }
    return out
  } catch {
    return {} // 탭 없음/네트워크 실패 → 폴백
  }
}

export async function getDefaultModel() {
  // 배포 환경에서 DEFAULT_MODEL을 지정하면 관리자 시트의 오래된 값보다 우선한다.
  if (process.env.DEFAULT_MODEL) return process.env.DEFAULT_MODEL
  const s = await getSettings()
  return s.defaultModel || DEFAULT_MODEL
}

// GAS 웹훅으로 설정 upsert (rare하게 호출 — 관리자 변경 시)
export async function setSetting(key, value) {
  if (!WEBHOOK) return
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ type: 'setting', key, value }),
      redirect: 'manual',
    })
  } catch {
    /* 무시 */
  }
}

export async function setDefaultModel(model) {
  await setSetting('defaultModel', model)
}
