import { useEffect, useMemo, useState } from 'react'

const SHEET_ID = '1vKSirUpGTuvFy40Hf5y9l_vOp5aNtRFuuC8jTfFpKfs'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent('로그')}`
const USD_TO_KRW = 1500

const MODEL_PRICES = {
  'solar-pro3': { in: 0.15, out: 0.60 },
  'solar-pro2': { in: 0.15, out: 0.60 },
  'solar-mini': { in: 0.15, out: 0.15 },
  'openai-direct:gpt-4o-mini': { in: 0.15, out: 0.60 },
  'gpt-4o-mini': { in: 0.15, out: 0.60 },
  'openrouter/free': { in: 0, out: 0 },
  'openai/gpt-oss-120b:free': { in: 0, out: 0 },
  'openai/gpt-oss-20b:free': { in: 0, out: 0 },
}

const num = (n) => (Number(n) || 0).toLocaleString()
const usd = (n) => `$${(Number(n) || 0).toFixed(4)}`
const won = (n) => `약 ${Math.round((Number(n) || 0) * USD_TO_KRW).toLocaleString()}원`

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function ymdFromCell(value) {
  const match = String(value || '').match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
  if (!match) return null
  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
}

function todayKeyKST() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function normalizeModel(model) {
  const value = String(model || '').trim()
  if (value.startsWith('solar-pro3')) return 'solar-pro3'
  if (value.startsWith('solar-pro2')) return 'solar-pro2'
  if (value.startsWith('solar-mini')) return 'solar-mini'
  if (value.startsWith('openai-direct:')) return value
  if (/gpt-4o-mini/i.test(value)) return 'gpt-4o-mini'
  return value || 'unknown'
}

function estimateUsd(model, prompt, completion) {
  const price = MODEL_PRICES[normalizeModel(model)] || { in: 0, out: 0 }
  return (prompt / 1_000_000) * price.in + (completion / 1_000_000) * price.out
}

function rowToRecord(cols) {
  if (!cols?.length || /시각/.test(cols[0] || '')) return null
  const date = ymdFromCell(cols[0])
  if (!date) return null

  const isV4 = cols.length >= 19
  const isV3 = !isV4 && cols.length >= 16
  const isV2 = !isV4 && !isV3 && cols.length >= 9
  const model = normalizeModel(isV4 ? cols[6] : isV3 ? cols[5] : isV2 ? cols[3] : cols[2])
  const prompt = Number(isV4 ? cols[9] : isV3 ? cols[7] : isV2 ? cols[4] : cols[3]) || 0
  const completion = Number(isV4 ? cols[10] : isV3 ? cols[8] : isV2 ? cols[5] : cols[4]) || 0
  const loggedEstimate = Number(isV4 ? cols[12] : isV3 ? cols[10] : cols[8]) || 0
  const loggedCost = Number(isV3 ? cols[9] : cols[7]) || 0
  const cost = loggedEstimate || loggedCost || estimateUsd(model, prompt, completion)

  return {
    date,
    status: isV4 ? cols[2] || 'success' : isV3 ? cols[1] || 'success' : 'success',
    model,
    prompt,
    completion,
    cost,
    fallback: isV4 ? cols[7] === 'Y' : isV3 ? cols[6] === 'Y' : false,
  }
}

function summarize(records) {
  const today = todayKeyKST()
  const summary = {
    today,
    todayCalls: 0,
    todayCost: 0,
    totalCalls: records.length,
    totalCost: 0,
    fallbackCalls: 0,
    byModel: {},
  }

  for (const record of records) {
    const model = record.model || 'unknown'
    if (!summary.byModel[model]) {
      summary.byModel[model] = { calls: 0, cost: 0, todayCalls: 0, todayCost: 0 }
    }
    const item = summary.byModel[model]
    item.calls += 1
    item.cost += record.cost
    summary.totalCost += record.cost
    if (record.fallback) summary.fallbackCalls += 1
    if (record.date === today) {
      summary.todayCalls += 1
      summary.todayCost += record.cost
      item.todayCalls += 1
      item.todayCost += record.cost
    }
  }

  return summary
}

function AiUsagePage() {
  const [records, setRecords] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadedAt, setLoadedAt] = useState('')

  async function load() {
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`${CSV_URL}&t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const parsed = parseCsv(await res.text()).map(rowToRecord).filter(Boolean)
      setRecords(parsed)
      setLoadedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      setErr('구글시트 사용량 기록을 불러오지 못했어요. 시트 공개 설정을 확인해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { load() }, [])

  const data = useMemo(() => summarize(records), [records])
  const rows = Object.entries(data.byModel)
    .map(([model, value]) => ({ model, ...value }))
    .sort((a, b) => b.calls - a.calls)
  const topModel = rows[0]

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Usage Monitor</p>
          <h2 style={{ margin: '4px 0 0', fontSize: 'clamp(1.3rem, 2vw, 1.7rem)', color: 'var(--title)' }}>AI 호출량과 예상 비용을 확인합니다</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="action-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            전체 기록
          </a>
          <button onClick={load} disabled={busy} className="action-btn">
            {busy ? '불러오는 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {err && (
        <div style={{
          padding: '10px 16px', borderRadius: 12,
          background: '#FEF2F2', border: '1px solid #FECACA',
          fontSize: '0.84rem', color: '#B91C1C',
        }}>
          {err}
        </div>
      )}

      <div className="page-stat-grid">
        <div className="page-stat-card page-stat-card-blue">
          <span className="page-stat-title">오늘 호출</span>
          <div className="page-stat-value-row">
            <span className="page-stat-value">{num(data.todayCalls)}</span>
            <span className="page-stat-unit">회</span>
          </div>
          <span className="page-stat-change">{data.today}</span>
        </div>
        <div className="page-stat-card page-stat-card-green">
          <span className="page-stat-title">오늘 예상 비용</span>
          <div className="page-stat-value-row">
            <span className="page-stat-value">{won(data.todayCost).replace('약 ', '')}</span>
          </div>
          <span className="page-stat-change">{usd(data.todayCost)}</span>
        </div>
        <div className="page-stat-card page-stat-card-amber">
          <span className="page-stat-title">가장 많이 쓴 모델</span>
          <div className="page-stat-value-row">
            <span className="page-stat-value" style={{ fontSize: 'clamp(1rem, 1.7vw, 1.25rem)' }}>{topModel?.model || '-'}</span>
          </div>
          <span className="page-stat-change">{topModel ? `${topModel.calls}회 호출` : '기록 없음'}</span>
        </div>
        <div className="page-stat-card page-stat-card-rose">
          <span className="page-stat-title">전체 예상 비용</span>
          <div className="page-stat-value-row">
            <span className="page-stat-value">{won(data.totalCost).replace('약 ', '')}</span>
          </div>
          <span className="page-stat-change">{num(data.totalCalls)}회 · {usd(data.totalCost)}</span>
        </div>
      </div>

      <div className="panel-card">
        <h3 style={{ margin: '0 0 14px', fontSize: '0.92rem', color: 'var(--title)' }}>모델별 호출/비용 요약</h3>
        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
            {busy ? '사용량 기록을 불러오는 중입니다.' : '아직 사용 기록이 없어요.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="review-table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>모델</th>
                  <th style={{ textAlign: 'right' }}>오늘</th>
                  <th style={{ textAlign: 'right' }}>전체 호출</th>
                  <th style={{ textAlign: 'right' }}>예상 비용</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.model}>
                    <td style={{ fontWeight: 700 }}>{row.model}</td>
                    <td style={{ textAlign: 'right' }}>{num(row.todayCalls)}회</td>
                    <td style={{ textAlign: 'right' }}>{num(row.calls)}회</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{won(row.cost)}</strong>
                      <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.76rem', marginTop: 2 }}>{usd(row.cost)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
        구글시트 공개 기록 기준 예상치입니다{loadedAt ? ` · ${loadedAt} 갱신` : ''}.
      </p>
    </div>
  )
}

export default AiUsagePage
