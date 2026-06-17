import { useState } from 'react'

const APPLICATIONS = [
  { id: 'A-0892', policy: '청년 취업지원 바우처', name: '이준서', age: 24, region: '서울', phone: '010-****-4521', status: '검토중', submittedAt: '2026-06-15 09:20' },
  { id: 'A-0891', policy: '청년 주거안심 지원금', name: '박서연', age: 26, region: '서울', phone: '010-****-7834', status: '접수완료', submittedAt: '2026-06-15 08:40' },
  { id: 'A-0890', policy: '청년 전세 대출 지원', name: '김지훈', age: 29, region: '경기', phone: '010-****-2290', status: '처리완료', submittedAt: '2026-06-14 17:15' },
  { id: 'A-0889', policy: '청년 창업 패키지', name: '최수아', age: 23, region: '부산', phone: '010-****-6612', status: '반려', submittedAt: '2026-06-14 15:50' },
  { id: 'A-0888', policy: '청년 직무교육 바우처', name: '오민준', age: 27, region: '인천', phone: '010-****-9943', status: '검토중', submittedAt: '2026-06-14 14:22' },
  { id: 'A-0887', policy: '청년 취업지원 바우처', name: '한지아', age: 25, region: '대구', phone: '010-****-3381', status: '접수완료', submittedAt: '2026-06-14 13:10' },
  { id: 'A-0886', policy: '청년 문화패스 지원사업', name: '윤태현', age: 22, region: '서울', phone: '010-****-8847', status: '처리완료', submittedAt: '2026-06-14 11:55' },
  { id: 'A-0885', policy: '청년 전세 대출 지원', name: '정수빈', age: 28, region: '경기', phone: '010-****-1124', status: '접수완료', submittedAt: '2026-06-14 10:30' },
]

const KPIS = [
  { title: '오늘 접수', value: '18', unit: '건', tone: 'blue' },
  { title: '검토 중', value: '47', unit: '건', tone: 'amber' },
  { title: '처리 완료', value: '312', unit: '건', tone: 'green' },
  { title: '반려', value: '23', unit: '건', tone: 'rose' },
]

const FILTERS = ['전체', '접수완료', '검토중', '처리완료', '반려']

const STATUS_CLASS = {
  '접수완료': 'status-violet',
  '검토중': 'status-blue',
  '처리완료': 'status-green',
  '반려': 'status-amber',
}

function ApplicationPage() {
  const [activeFilter, setActiveFilter] = useState('전체')

  const filtered = activeFilter === '전체'
    ? APPLICATIONS
    : APPLICATIONS.filter((a) => a.status === activeFilter)

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
            <h3>신청 접수 현황</h3>
          </div>
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
                <th>접수번호</th>
                <th>신청 정책</th>
                <th>신청자</th>
                <th>나이</th>
                <th>지역</th>
                <th>연락처</th>
                <th>상태</th>
                <th>접수 시각</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="text-muted">{row.id}</td>
                  <td><strong>{row.policy}</strong></td>
                  <td>{row.name}</td>
                  <td>{row.age}세</td>
                  <td>{row.region}</td>
                  <td className="text-muted">{row.phone}</td>
                  <td>
                    <span className={`status-pill ${STATUS_CLASS[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="text-muted">{row.submittedAt}</td>
                  <td>
                    <div className="action-btn-group">
                      <button type="button" className="action-btn">상세</button>
                      <button type="button" className="action-btn">처리</button>
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

export default ApplicationPage
