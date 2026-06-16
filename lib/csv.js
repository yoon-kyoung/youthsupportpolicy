// ────────────────────────────────────────────────────────────
// lib/csv.js — 따옴표/콤마/개행을 포함한 셀을 안전 처리하는 미니 CSV 파서
// 구글시트 export?format=csv / gviz tqx=out:csv 양쪽에 모두 사용
// ────────────────────────────────────────────────────────────
export function parseCsv(text) {
  const rows = []
  let row = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += c
    } else if (c === '"') {
      inQ = true
    } else if (c === ',') {
      row.push(cur); cur = ''
    } else if (c === '\n') {
      row.push(cur); rows.push(row); row = []; cur = ''
    } else if (c !== '\r') {
      cur += c
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  return rows
}
