import { useState } from 'react'
import { API_BASE } from './config'
import { C } from '../styles/colors'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1vKSirUpGTuvFy40Hf5y9l_vOp5aNtRFuuC8jTfFpKfs/edit'
const num = (n) => (Number(n) || 0).toLocaleString()

export default function AdminPage() {
  const [pw, setPw] = useState('')
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!pw) return
    setBusy(true); setErr('')
    try {
      const res = await fetch(`${API_BASE}/api/usage`, {
        headers: { 'x-admin-key': pw },
      })
      if (res.status === 401) { setErr('비밀번호가 올바르지 않습니다'); return }
      if (res.status === 503) { setErr('서버에 ADMIN_PASSWORD가 설정되지 않았습니다 (Vercel 환경변수)'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:C.neutralLight,padding:'32px 24px'}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <button
          onClick={() => { window.location.hash = '' }}
          style={{
            background:'none',border:'none',cursor:'pointer',color:C.primary,
            fontSize:14,fontWeight:600,padding:0,marginBottom:24,
          }}
        >← 사이트로 돌아가기</button>

        {!data ? (
          <div style={{
            background:C.neutralWhite,border:'1.5px solid #f1f5f9',borderRadius:16,
            padding:'40px 32px',textAlign:'center',
          }}>
            <h1 style={{margin:'0 0 8px',fontSize:22,fontWeight:800,color:C.neutralDark}}>🔐 사용량 대시보드</h1>
            <p style={{margin:'0 0 20px',fontSize:14,color:C.mutedText}}>
              사용량·비용을 확인하려면 관리자 비밀번호를 입력하세요.
            </p>
            <div style={{display:'flex',gap:8,maxWidth:400,margin:'0 auto'}}>
              <input
                type="password" placeholder="ADMIN_PASSWORD" value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()} autoFocus
                style={{
                  flex:1,padding:'12px 14px',borderRadius:12,border:`1.5px solid ${C.borderGray}`,
                  background:C.secondary,fontSize:14,fontFamily:'inherit',outline:'none',
                }}
                onFocus={e=>{e.target.style.borderColor=C.primary}}
                onBlur={e=>{e.target.style.borderColor=C.borderGray}}
              />
              <button onClick={load} disabled={busy} style={{
                padding:'12px 20px',borderRadius:12,border:'none',cursor:'pointer',
                background:C.primary,color:C.neutralWhite,
                fontWeight:800,fontSize:14,opacity:busy?0.6:1,
                transition:'background 0.15s',
              }}
                onMouseEnter={e=>{if(!busy)e.currentTarget.style.background=C.primaryHover}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.primary}}
              >
                {busy ? '확인 중…' : '입장'}
              </button>
            </div>
            {err && <p style={{marginTop:12,color:C.error,fontSize:13}}>{err}</p>}
          </div>
        ) : (
          <Dashboard data={data} busy={busy} onReload={load} />
        )}
      </div>
    </div>
  )
}

function Dashboard({ data, busy, onReload }) {
  const { today, total, dailyLimitUsd, dailyRequestLimit, persistent, date } = data
  const rate = data.usdToKrw || 1500
  const won = (usd) => '₩' + Math.round((Number(usd) || 0) * rate).toLocaleString()
  const reqLimit = dailyRequestLimit || 150
  const reqPct = Math.min(100, (today.requests / reqLimit) * 100)
  const byModel = Object.entries(today.byModel || {})

  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.neutralDark}}>📊 사용량 대시보드</h1>
        <div style={{display:'flex',gap:8}}>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer"
            style={{padding:'8px 14px',borderRadius:10,border:`1.5px solid ${C.borderGray}`,
              background:C.neutralWhite,color:C.neutralDark,fontSize:13,fontWeight:600,textDecoration:'none',cursor:'pointer'}}>
            📊 전체 기록(시트)
          </a>
          <button onClick={onReload} disabled={busy}
            style={{padding:'8px 14px',borderRadius:10,border:`1.5px solid ${C.borderGray}`,
              background:C.neutralWhite,color:C.neutralDark,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.6:1}}>
            새로고침
          </button>
        </div>
      </div>

      {!persistent && (
        <div style={{
          background:C.warningBg,border:`1.5px solid ${C.warningBorder}`,borderRadius:12,
          padding:'10px 16px',marginBottom:16,fontSize:13,color:'#92400E',
        }}>
          ⚠️ 통계를 불러오지 못했어요. 구글 시트 연결을 확인하세요.
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:`오늘 요청 (${date})`,value:num(today.requests)},
          {label:'오늘 토큰',value:num(today.prompt+today.completion),sub:`입력 ${num(today.prompt)} · 출력 ${num(today.completion)}`},
          {label:'오늘 남은 답변',value:`${Math.max(0,reqLimit-today.requests)}회`,sub:`한도 ${reqLimit}회 / 일`,accent:true},
          {label:'누적 (전체)',value:`${num(total.requests)}회`,sub:`토큰 ${num(total.prompt+total.completion)}`},
        ].map((s,i)=>(
          <div key={i} style={{
            background:s.accent?C.primary:C.neutralWhite,
            color:s.accent?C.neutralWhite:C.neutralDark,
            border:s.accent?'none':`1.5px solid #f1f5f9`,borderRadius:16,padding:16,
          }}>
            <div style={{fontSize:12,opacity:0.7,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:800}}>{s.value}</div>
            {s.sub&&<div style={{fontSize:12,opacity:0.6,marginTop:4}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{marginBottom:20}}>
        <div style={{height:8,borderRadius:4,background:C.borderGray,overflow:'hidden'}}>
          <div style={{
            height:'100%',borderRadius:4,transition:'width 0.3s',
            width:`${reqPct}%`,
            background:reqPct>=90?C.error:reqPct>=60?C.warning:C.success,
          }}/>
        </div>
        <p style={{margin:'6px 0 0',fontSize:12,color:C.mutedText}}>
          오늘 {today.requests}회 / {reqLimit}회 ({reqPct.toFixed(0)}%)
          {reqPct >= 100 && ' — 한도 도달, 자동 차단 중'}
        </p>
      </div>

      <div style={{
        background:C.neutralWhite,border:'1.5px solid #f1f5f9',borderRadius:16,
        padding:20,marginBottom:16,
      }}>
        <h2 style={{margin:'0 0 12px',fontSize:16,fontWeight:700,color:C.neutralDark}}>모델별 (오늘)</h2>
        {byModel.length === 0 ? (
          <p style={{margin:0,fontSize:13,color:C.mutedText}}>아직 사용 기록이 없어요.</p>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1.5px solid #f1f5f9',color:C.mutedText}}>
                <th style={{textAlign:'left',padding:'8px 4px',fontWeight:600}}>모델</th>
                <th style={{textAlign:'right',padding:'8px 4px',fontWeight:600}}>요청</th>
                <th style={{textAlign:'right',padding:'8px 4px',fontWeight:600}}>토큰</th>
                <th style={{textAlign:'right',padding:'8px 4px',fontWeight:600}}>비용</th>
              </tr>
            </thead>
            <tbody>
              {byModel.map(([m, v]) => (
                <tr key={m} style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'8px 4px',color:C.neutralDark}}>{m}</td>
                  <td style={{padding:'8px 4px',textAlign:'right'}}>{num(v.requests)}</td>
                  <td style={{padding:'8px 4px',textAlign:'right'}}>{num(v.prompt + v.completion)}</td>
                  <td style={{padding:'8px 4px',textAlign:'right'}}>{won(v.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{fontSize:12,color:C.mutedText,textAlign:'center'}}>
        OpenRouter 무료 모델 · 분당 20회 / 일 {reqLimit}회
      </p>
    </>
  )
}
