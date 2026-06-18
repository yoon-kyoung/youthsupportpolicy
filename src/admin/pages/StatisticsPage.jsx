import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const MONTHLY_TREND = [
  { month: '1월', visitors: 12400, policyViews: 38200, applications: 2840 },
  { month: '2월', visitors: 13800, policyViews: 41600, applications: 3120 },
  { month: '3월', visitors: 15200, policyViews: 47800, applications: 3580 },
  { month: '4월', visitors: 17600, policyViews: 54200, applications: 4210 },
  { month: '5월', visitors: 19400, policyViews: 61800, applications: 4960 },
  { month: '6월', visitors: 21200, policyViews: 68400, applications: 5920 },
]

const CATEGORY_STATS = [
  { category: '일자리·창업', views: 23240, applies: 2010 },
  { category: '주거·금융', views: 17100, applies: 1580 },
  { category: '교육', views: 10940, applies: 890 },
  { category: '복지·문화', views: 10260, applies: 720 },
  { category: '참여·권리', views: 6860, applies: 360 },
]

const REGION_STATS = [
  { region: '서울', members: 412, policyViews: 19240 },
  { region: '경기', members: 318, policyViews: 14360 },
  { region: '부산', members: 186, policyViews: 8240 },
  { region: '인천', members: 124, policyViews: 5820 },
  { region: '대구', members: 98, policyViews: 4610 },
]

const FUNNEL = [
  { step: '방문자', count: 21200, rate: 100 },
  { step: '정책 탐색', count: 14840, rate: 70 },
  { step: '상세 조회', count: 8480, rate: 40 },
  { step: '신청 시작', count: 7420, rate: 35 },
  { step: '신청 완료', count: 5920, rate: 28 },
]

const DROPOFF = [
  {
    from: '방문자 → 정책 탐색',
    dropped: 6360,
    dropRate: 30,
    severity: 'amber',
    insight: '첫 화면에서 원하는 정책을 빠르게 찾지 못해 이탈. 검색 UX·추천 개선 여지.',
  },
  {
    from: '정책 탐색 → 상세 조회',
    dropped: 6360,
    dropRate: 43,
    severity: 'rose',
    insight: '목록 카드만 보고 종료. 제목·요약 정보 부족으로 클릭 유도 실패 가능성 높음.',
  },
  {
    from: '상세 조회 → 신청 시작',
    dropped: 1060,
    dropRate: 13,
    severity: 'green',
    insight: '자격 미달 판단 후 자연 이탈. 자격조건 미리보기 제공 시 이탈 추가 감소 가능.',
  },
  {
    from: '신청 시작 → 신청 완료',
    dropped: 1500,
    dropRate: 20,
    severity: 'amber',
    insight: '양식 작성 중 이탈. 필수 서류 안내 부족 또는 입력 오류 발생이 주된 원인으로 추정.',
  },
]

const SEVERITY_COLOR = { rose: '#EF4444', amber: '#F59E0B', green: '#10B981' }
const SEVERITY_BG    = { rose: '#FEF2F2', amber: '#FFFBEB', green: '#ECFDF5' }
const SEVERITY_LABEL = { rose: '이탈 높음', amber: '이탈 보통', green: '이탈 낮음' }

const KPIS = [
  { title: '이번달 방문자', value: '21,200', change: '+9.3%', tone: 'blue' },
  { title: '정책 조회수', value: '68,400', change: '+10.7%', tone: 'green' },
  { title: '신청 완료', value: '5,920', change: '+19.4%', tone: 'amber' },
  { title: '신청 전환율', value: '27.9%', change: '+2.1%p', tone: 'rose' },
]

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  color: '#111827',
  fontSize: '0.86rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

const AXIS_STYLE = { fontSize: 12, fill: '#9ca3af' }
const AXIS_STROKE = '#e5e7eb'

function StatisticsPage() {
  return (
    <div className="page-content">
      <div className="page-stat-grid">
        {KPIS.map((k) => (
          <div key={k.title} className={`page-stat-card page-stat-card-${k.tone}`}>
            <span className="page-stat-title">{k.title}</span>
            <div className="page-stat-value-row">
              <strong className="page-stat-value">{k.value}</strong>
            </div>
            <span className="page-stat-change">{k.change}</span>
          </div>
        ))}
      </div>

      {/* 월별 추이 */}
      <article className="panel-card">
        <div className="section-heading">
          <div>
            <h3>월별 방문자 · 조회 · 신청 추이</h3>
          </div>
        </div>
        <div className="chart-shell">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={MONTHLY_TREND}>
              <defs>
                <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007FFF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#007FFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5BA4FF" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#5BA4FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(209,213,219,0.5)" />
              <XAxis dataKey="month" stroke={AXIS_STROKE} tick={AXIS_STYLE} />
              <YAxis stroke={AXIS_STROKE} tick={AXIS_STYLE} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '0.84rem', paddingTop: 12 }} />
              <Area type="monotone" dataKey="visitors" name="방문자" stroke="#007FFF" strokeWidth={2.5} fill="url(#gVisitors)" dot={{ r: 4 }} />
              <Area type="monotone" dataKey="policyViews" name="정책 조회" stroke="#5BA4FF" strokeWidth={2.5} fill="url(#gViews)" dot={{ r: 4 }} />
              <Area type="monotone" dataKey="applications" name="신청 완료" stroke="#93C5FD" strokeWidth={2.5} fill="url(#gApps)" dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 카테고리 & 지역별 */}
      <div className="stat-chart-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <h3>카테고리별 조회 · 신청 비교</h3>
            </div>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CATEGORY_STATS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(209,213,219,0.5)" horizontal={false} />
                <XAxis type="number" stroke={AXIS_STROKE} tick={AXIS_STYLE} />
                <YAxis type="category" dataKey="category" stroke={AXIS_STROKE} tick={AXIS_STYLE} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '0.84rem', paddingTop: 12 }} />
                <Bar dataKey="views" name="조회수" fill="#007FFF" radius={[0, 4, 4, 0]} />
                <Bar dataKey="applies" name="신청수" fill="#93C5FD" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <h3>지역별 회원 · 조회 현황</h3>
            </div>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={REGION_STATS}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(209,213,219,0.5)" />
                <XAxis dataKey="region" stroke={AXIS_STROKE} tick={AXIS_STYLE} />
                <YAxis stroke={AXIS_STROKE} tick={AXIS_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '0.84rem', paddingTop: 12 }} />
                <Bar dataKey="members" name="회원수" fill="#007FFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="policyViews" name="정책 조회" fill="#5BA4FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      {/* 전환 퍼널 + 이탈 분석 */}
      <div className="stat-chart-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <h3>신청 전환 퍼널 (이번달 기준)</h3>
            </div>
          </div>
          <div className="funnel-list">
            {FUNNEL.map((item, index) => (
              <div key={item.step} className="funnel-item">
                <div className="funnel-meta">
                  <span className="funnel-step-num">0{index + 1}</span>
                  <span className="funnel-step-label">{item.step}</span>
                  <strong className="funnel-count">{item.count.toLocaleString()}명</strong>
                  <span className="funnel-rate">{item.rate}%</span>
                </div>
                <div className="funnel-track">
                  <div className="funnel-fill" style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <h3>구간별 이탈 분석</h3>
            </div>
          </div>
          <div className="dropoff-list">
            {DROPOFF.map((item) => (
              <div key={item.from} className="dropoff-item">
                <div className="dropoff-header">
                  <span className="dropoff-label">{item.from}</span>
                  <span
                    className="dropoff-badge"
                    style={{ background: SEVERITY_BG[item.severity], color: SEVERITY_COLOR[item.severity] }}
                  >
                    {SEVERITY_LABEL[item.severity]} {item.dropRate}%
                  </span>
                </div>
                <div className="dropoff-track">
                  <div
                    className="dropoff-fill"
                    style={{ width: `${item.dropRate}%`, background: SEVERITY_COLOR[item.severity] }}
                  />
                </div>
                <p className="dropoff-insight">{item.insight}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}

export default StatisticsPage
