import { useState } from 'react'
import './admin.css'
import Icon from '../styles/Icon'
import Header from './components/Header/Header'
import Sidebar from './components/Sidebar/Sidebar'
import MainContent from './components/MainContent/MainContent'

const DEMO_ID = 'admin'
const DEMO_PW = '1234'

const navigationItems = [
  { id: 'dashboard', label: '대시보드',       icon: 'dashboard' },
  { id: 'policy',    label: '정책 콘텐츠 관리', icon: 'article' },
  { id: 'member',    label: '회원 관리',        icon: 'group' },
  { id: 'board',     label: '소통/게시판 관리', icon: 'forum' },
  { id: 'statistics',label: '통계 및 분석',     icon: 'bar_chart' },
  { id: 'aiUsage',   label: 'AI 사용량',        icon: 'auto_awesome' },
]

const dashboardData = {
  policyCategories: ['일자리·창업', '주거·금융', '교육', '복지·문화', '참여·권리'],
  kpis: [
    { title: '회원가입 건수', value: '1,284', change: '+12.4%', tone: 'blue', description: '정책 탐색 후 회원가입으로 이어지는 전환 흐름이 안정적으로 상승했습니다.' },
    { title: '정책 문의·신청 이슈', value: '86', change: '+5.8%', tone: 'amber', description: '주거·금융과 취업지원 정책에서 자격 요건 문의가 집중되고 있습니다.' },
    { title: '정책 제공 횟수', value: '5,920', change: '+21.0%', tone: 'green', description: '인기 정책군 재정렬 이후 조회수와 상세 진입률이 함께 올랐습니다.' },
    { title: '심사 및 보완 대기 건수', value: '47', change: '-6.3%', tone: 'rose', description: '신규 등록 정책과 수정 요청 정책을 포함한 전체 운영 대기 수입니다.' },
  ],
  audienceSummary: [
    { label: '핵심 유입 지역', value: '서울 · 경기 · 부산', note: '전체 검색 유입의 61%' },
    { label: '주요 직군', value: '취준생 · 사회초년생 · 예비창업자', note: '상세 진입률 상위 그룹' },
    { label: '관심 분야', value: '취업지원 · 주거지원 · 금융지원', note: '검색 빈도 기준 상위 3개' },
    { label: '광고 활용 포인트', value: '지역 + 직군 + 정책관심사', note: '세그먼트 광고 운영 기준' },
  ],
  audienceCategories: [
    {
      title: '지역별 유입 성향',
      items: [
        { name: '서울', share: '28%', detail: '주거·금융, 청년월세, 전세지원 검색 강세' },
        { name: '경기', share: '21%', detail: '취업지원, 교통비, 청년면접수당 반응 높음' },
        { name: '부산', share: '12%', detail: '지역정착, 문화패스, 창업지원 관심 집중' },
      ],
    },
    {
      title: '직종/상태별 유입 성향',
      items: [
        { name: '취업준비생', share: '31%', detail: '취업 바우처, 면접지원, 직무교육 키워드 중심' },
        { name: '사회초년생', share: '24%', detail: '월세, 금융, 생활안정성 정책 탐색 비중 큼' },
        { name: '예비창업자', share: '17%', detail: '창업자금, 멘토링, 공유오피스 검색 강세' },
      ],
    },
    {
      title: '관심분야별 유입 성향',
      items: [
        { name: '취업지원', share: '34%', detail: '일자리·교육 카테고리 재방문율이 가장 높음' },
        { name: '주거지원', share: '25%', detail: '정책 상세 페이지 체류시간이 가장 긴 분야' },
        { name: '금융지원', share: '18%', detail: '대출·저축·생활비 관련 검색 전환율 우수' },
      ],
    },
  ],
  adTargets: [
    { segment: '서울 거주 취업준비생', region: '서울', occupation: '취업준비생', interest: '취업지원 · 교육', trigger: '면접수당, 직무교육, 청년취업 바우처', action: '검색광고 + 리타겟팅' },
    { segment: '경기 거주 사회초년생', region: '경기', occupation: '사회초년생', interest: '주거지원 · 금융지원', trigger: '월세지원, 전세대출, 생활안정자금', action: '지역 맞춤 배너 + SNS 광고' },
    { segment: '부산 지역 예비창업자', region: '부산', occupation: '예비창업자', interest: '창업지원 · 멘토링', trigger: '창업자금, 청년창업, 사업화 지원', action: '콘텐츠 광고 + CRM 캠페인' },
  ],
  searchKeywords: [
    { keyword: '청년 월세 지원', category: '주거·금융', volume: '1,240', intent: '실거주 부담 완화' },
    { keyword: '청년 취업 바우처', category: '일자리·창업', volume: '1,110', intent: '취업준비 비용 절감' },
    { keyword: '청년 전세 대출', category: '주거·금융', volume: '980', intent: '금융지원 탐색' },
    { keyword: '청년 창업 지원금', category: '일자리·창업', volume: '860', intent: '사업 시작 자금 확보' },
  ],
  reviews: [
    { name: '청년 취업지원 바우처', category: '일자리·창업', region: '전국', target: '만 19-34세', owner: '김소연', status: '심사중', submittedAt: '2026-06-15 09:20', priority: '높음' },
    { name: '청년 주거안심 지원금', category: '주거·금융', region: '서울', target: '1인 가구', owner: '박준호', status: '보완요청', submittedAt: '2026-06-15 08:40', priority: '중간' },
    { name: '청년 창업 패키지', category: '일자리·창업', region: '경기', target: '예비창업자', owner: '이수민', status: '승인대기', submittedAt: '2026-06-14 17:15', priority: '높음' },
    { name: '청년 문화패스 지원사업', category: '복지·문화', region: '부산', target: '만 19-29세', owner: '정하늘', status: '완료', submittedAt: '2026-06-14 15:50', priority: '낮음' },
  ],
  trend: [
    { label: '월', views: 3200, applies: 410 },
    { label: '화', views: 3560, applies: 438 },
    { label: '수', views: 3890, applies: 472 },
    { label: '목', views: 4120, applies: 501 },
    { label: '금', views: 4410, applies: 548 },
    { label: '토', views: 3010, applies: 392 },
    { label: '일', views: 2780, applies: 366 },
  ],
  categoryMix: [
    { label: '일자리·창업', value: 34 },
    { label: '주거·금융', value: 25 },
    { label: '교육', value: 16 },
    { label: '복지·문화', value: 15 },
    { label: '참여·권리', value: 10 },
  ],
  todos: [
    { title: '마감 임박 정책 12건 노출 상태 점검', due: '10:30', done: false },
    { title: '서울/경기 주거지원 정책 보완 요청 반영', due: '13:00', done: false },
    { title: '주간 카테고리별 조회/신청 리포트 공유', due: '16:00', done: true },
  ],
  feed: [
    { title: '일자리·창업 카테고리 상단 정책 3건 순위 조정', time: '방금 전', category: '카테고리 운영' },
    { title: '청년 주거안심 지원금 신청 자격 문의 14건 접수', time: '22분 전', category: '신청 문의' },
    { title: '교육 카테고리 신규 정책 2건 승인 후 공개 완료', time: '1시간 전', category: '콘텐츠 발행' },
  ],
  memo: '운영회의 전까지 인기 검색 키워드와 유입 세그먼트를 함께 정리하고, 광고 운영이 가능해질 경우 지역·직군·관심사 3축으로 타겟을 묶을 수 있도록 기준을 유지할 것.',
}

function AdminLogin({ onLogin, onExit }) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    if (id === DEMO_ID && pw === DEMO_PW) { onLogin(); return }
    setErr('아이디 또는 비밀번호가 올바르지 않습니다')
  }

  return (
    <div className="admin-root">
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
          <div className="panel-card" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', marginBottom: 6, color: 'var(--title)' }}>청년ON 관리자</h1>
            <p style={{ fontSize: '0.86rem', color: 'var(--sub)', marginBottom: 24 }}>관리자 계정으로 로그인하세요</p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                placeholder="아이디" value={id} onChange={e => setId(e.target.value)} autoFocus
                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel-soft)', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
              <input
                type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel-soft)', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
              {err && <p style={{ color: '#DC2626', fontSize: '0.82rem', margin: 0 }}>{err}</p>}
              <button type="submit" className="primary-btn" style={{ marginTop: 4, padding: '12px 0', fontSize: '0.9rem' }}>로그인</button>
            </form>

            <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#92400E' }}>데모 계정 안내</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#92400E' }}>
                아이디: <strong>admin</strong> / 비밀번호: <strong>1234</strong>
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#B45309' }}>
                실제 서비스에서는 보안 인증을 적용할 예정입니다.
              </p>
            </div>

            <button type="button" onClick={onExit} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.84rem', cursor: 'pointer' }}>
              ← 사이트로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminShell({ onExit }) {
  const [authed, setAuthed] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} onExit={onExit} />

  return (
    <div className="admin-root">
      <div className="app-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <header className="header">
          <div className="logo-block">
            <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:32,height:32,borderRadius:8,flexShrink:0}}/>
            <div>
              <p className="eyebrow">ADMIN CONSOLE</p>
              <h1 className="logo-title">청년ON 관리자</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="header-text-btn" type="button" onClick={onExit}>
              <Icon name="arrow_back" size={15} color="currentColor"/> 사이트로
            </button>
            <span style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)', padding: '0 8px' }}>운영총괄 관리자</span>
            <button className="header-text-btn" type="button" onClick={() => setAuthed(false)}>로그아웃</button>
          </div>
        </header>
        <div className="app-body">
          <Sidebar items={navigationItems} activePage={activePage} onNavigate={setActivePage} />
          <MainContent data={dashboardData} activePage={activePage} />
        </div>
      </div>
    </div>
  )
}

export default AdminShell
