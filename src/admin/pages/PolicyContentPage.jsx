import { useState } from 'react'

const POLICIES = [
  { id: 'P-001', name: '청년 취업지원 바우처', category: '일자리·창업', region: '전국', target: '만 19-34세', owner: '김소연', status: '게시중', views: 1240, applies: 87, updatedAt: '2026-06-15' },
  { id: 'P-002', name: '청년 주거안심 지원금', category: '주거·금융', region: '서울', target: '1인 가구', owner: '박준호', status: '심사중', views: 980, applies: 64, updatedAt: '2026-06-15' },
  { id: 'P-003', name: '청년 창업 패키지', category: '일자리·창업', region: '경기', target: '예비창업자', owner: '이수민', status: '보완요청', views: 860, applies: 52, updatedAt: '2026-06-14' },
  { id: 'P-004', name: '청년 문화패스 지원사업', category: '복지·문화', region: '부산', target: '만 19-29세', owner: '정하늘', status: '게시중', views: 720, applies: 41, updatedAt: '2026-06-14' },
  { id: 'P-005', name: '청년 전세 대출 지원', category: '주거·금융', region: '전국', target: '무주택 청년', owner: '최다은', status: '게시중', views: 1100, applies: 93, updatedAt: '2026-06-13' },
  { id: 'P-006', name: '청년 직무교육 바우처', category: '교육', region: '전국', target: '만 19-34세', owner: '오지훈', status: '게시중', views: 640, applies: 38, updatedAt: '2026-06-13' },
  { id: 'P-007', name: '청년 생활안정자금 대출', category: '주거·금융', region: '경기', target: '사회초년생', owner: '박준호', status: '임시저장', views: 0, applies: 0, updatedAt: '2026-06-12' },
  { id: 'P-008', name: '청년 참여권리 교육 프로그램', category: '참여·권리', region: '전국', target: '만 18-29세', owner: '김소연', status: '게시중', views: 320, applies: 18, updatedAt: '2026-06-11' },
]

const KPIS = [
  { title: '전체 정책', value: '124', unit: '건', tone: 'blue' },
  { title: '게시중', value: '89', unit: '건', tone: 'green' },
  { title: '심사 대기', value: '21', unit: '건', tone: 'amber' },
  { title: '임시저장', value: '14', unit: '건', tone: 'rose' },
]

const FILTERS = ['전체', '일자리·창업', '주거·금융', '교육', '복지·문화', '참여·권리']

const STATUS_CLASS = {
  '게시중': 'status-green',
  '심사중': 'status-blue',
  '보완요청': 'status-amber',
  '임시저장': 'status-violet',
}

function PolicyContentPage() {
  const [activeFilter, setActiveFilter] = useState('전체')

  const filtered = activeFilter === '전체'
    ? POLICIES
    : POLICIES.filter((p) => p.category === activeFilter)

  return (
    <div className="page-content">
      <div className="page-stat-grid">
        {KPIS.map((k) => (
          <div key={k.title} className={`page-stat-card page-stat-card-${k.tone}`}>
            <span className="page-stat-title">{k.title}</span>
            <div className="page-stat-value-row">
              <strong className="page-stat-value">{k.value}</strong>
              <span className="page-stat-unit">{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Policy List</p>
            <h3>정책 목록</h3>
          </div>
          <button className="primary-btn" type="button">+ 정책 등록</button>
        </div>
        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn${activeFilter === f ? ' filter-btn-active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>정책명</th>
                <th>카테고리</th>
                <th>지역</th>
                <th>대상</th>
                <th>담당자</th>
                <th>조회수</th>
                <th>신청수</th>
                <th>상태</th>
                <th>수정일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="text-muted">{row.id}</td>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.category}</td>
                  <td>{row.region}</td>
                  <td>{row.target}</td>
                  <td>{row.owner}</td>
                  <td>{row.views.toLocaleString()}</td>
                  <td>{row.applies}</td>
                  <td>
                    <span className={`status-pill ${STATUS_CLASS[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="text-muted">{row.updatedAt}</td>
                  <td>
                    <div className="action-btn-group">
                      <button type="button" className="action-btn">수정</button>
                      <button type="button" className="action-btn action-btn-danger">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

export default PolicyContentPage
