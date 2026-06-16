import { useState } from 'react'

const MEMBERS = [
  { id: 'M-1284', username: '이준서', email: 'lee.js@example.com', region: '서울', joinedAt: '2026-05-12', lastLogin: '2026-06-15', activity: 42, isAdmin: false },
  { id: 'M-1283', username: '박서연', email: 'park.sy@example.com', region: '경기', joinedAt: '2026-05-18', lastLogin: '2026-06-14', activity: 28, isAdmin: false },
  { id: 'M-1282', username: '김소연', email: 'kim.sy@arkit.co.kr', region: '서울', joinedAt: '2026-04-01', lastLogin: '2026-06-15', activity: 186, isAdmin: true },
  { id: 'M-1281', username: '박준호', email: 'park.jh@arkit.co.kr', region: '서울', joinedAt: '2026-04-01', lastLogin: '2026-06-15', activity: 142, isAdmin: true },
  { id: 'M-1280', username: '최지원', email: 'choi.jw@example.com', region: '부산', joinedAt: '2026-05-22', lastLogin: '2026-06-13', activity: 19, isAdmin: false },
  { id: 'M-1279', username: '오민준', email: 'oh.mj@example.com', region: '인천', joinedAt: '2026-05-30', lastLogin: '2026-06-12', activity: 11, isAdmin: false },
  { id: 'M-1278', username: '한지아', email: 'han.ja@example.com', region: '대구', joinedAt: '2026-06-01', lastLogin: '2026-06-15', activity: 8, isAdmin: false },
  { id: 'M-1277', username: '윤태현', email: 'yoon.th@example.com', region: '서울', joinedAt: '2026-06-03', lastLogin: '2026-06-14', activity: 5, isAdmin: false },
]

const KPIS = [
  { title: '전체 회원', value: '1,284', tone: 'blue' },
  { title: '이번달 신규', value: '148', tone: 'green' },
  { title: '이번달 활성', value: '892', tone: 'amber' },
  { title: '관리자', value: '4', tone: 'rose' },
]

const FILTERS = ['전체', '일반회원', '관리자']

const MAX_ACTIVITY = 186

function MemberPage() {
  const [activeFilter, setActiveFilter] = useState('전체')

  const filtered = activeFilter === '전체'
    ? MEMBERS
    : activeFilter === '관리자'
      ? MEMBERS.filter((m) => m.isAdmin)
      : MEMBERS.filter((m) => !m.isAdmin)

  return (
    <div className="page-content">
      <div className="page-stat-grid">
        {KPIS.map((k) => (
          <div key={k.title} className={`page-stat-card page-stat-card-${k.tone}`}>
            <span className="page-stat-title">{k.title}</span>
            <div className="page-stat-value-row">
              <strong className="page-stat-value">{k.value}</strong>
              <span className="page-stat-unit">명</span>
            </div>
          </div>
        ))}
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Member List</p>
            <h3>회원 목록</h3>
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
                <th>ID</th>
                <th>닉네임</th>
                <th>이메일</th>
                <th>지역</th>
                <th>가입일</th>
                <th>최근 로그인</th>
                <th>활동 지수</th>
                <th>권한</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="text-muted">{row.id}</td>
                  <td><strong>{row.username}</strong></td>
                  <td className="text-muted">{row.email}</td>
                  <td>{row.region}</td>
                  <td className="text-muted">{row.joinedAt}</td>
                  <td className="text-muted">{row.lastLogin}</td>
                  <td>
                    <div className="activity-cell">
                      <div className="activity-track">
                        <div
                          className="activity-fill"
                          style={{ width: `${Math.round((row.activity / MAX_ACTIVITY) * 100)}%` }}
                        />
                      </div>
                      <span className="activity-count">{row.activity}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${row.isAdmin ? 'role-badge-admin' : 'role-badge-user'}`}>
                      {row.isAdmin ? '관리자' : '일반'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button type="button" className="action-btn">
                        {row.isAdmin ? '권한 해제' : '관리자 지정'}
                      </button>
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

export default MemberPage
