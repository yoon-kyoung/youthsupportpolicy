import { useState } from 'react'

const BOARD_DATA = {
  notice: [
    { id: 'N-021', title: '청년정책 탐색 서비스 이용 안내', author: '관리자', views: 1024, comments: 0, createdAt: '2026-06-10', isPinned: true },
    { id: 'N-020', title: '6월 신규 정책 등록 완료 안내', author: '관리자', views: 742, comments: 0, createdAt: '2026-06-08', isPinned: false },
    { id: 'N-019', title: '서비스 점검 안내 (6/5 03:00-05:00)', author: '관리자', views: 589, comments: 0, createdAt: '2026-06-04', isPinned: false },
    { id: 'N-018', title: '청년정책 카테고리 개편 안내', author: '관리자', views: 821, comments: 0, createdAt: '2026-06-01', isPinned: false },
  ],
  free: [
    { id: 'F-412', title: '청년 취업 바우처 신청 후기 공유합니다', author: '이준서', views: 284, comments: 12, createdAt: '2026-06-15', isPinned: false },
    { id: 'F-411', title: '주거지원 정책 어떤 게 좋은지 추천 부탁드려요', author: '박서연', views: 196, comments: 8, createdAt: '2026-06-14', isPinned: false },
    { id: 'F-410', title: '취업준비 하면서 활용한 정책들 정리', author: '최지원', views: 421, comments: 23, createdAt: '2026-06-13', isPinned: false },
    { id: 'F-409', title: '경기도 청년 지원 정책 신청 성공했어요', author: '오민준', views: 138, comments: 5, createdAt: '2026-06-12', isPinned: false },
    { id: 'F-408', title: '문화패스 사용 가능한 곳 정리해봤어요', author: '한지아', views: 302, comments: 16, createdAt: '2026-06-11', isPinned: false },
  ],
  qna: [
    { id: 'Q-156', title: '청년 취업지원 바우처 자격 요건 문의', author: '이준서', views: 142, comments: 1, qnaStatus: '답변완료', createdAt: '2026-06-15', isPinned: false },
    { id: 'Q-155', title: '주거안심 지원금과 전세 대출 중복 신청 가능한가요?', author: '박서연', views: 98, comments: 0, qnaStatus: '답변대기', createdAt: '2026-06-14', isPinned: false },
    { id: 'Q-154', title: '창업 패키지 신청 서류 목록이 궁금합니다', author: '한지아', views: 87, comments: 1, qnaStatus: '답변완료', createdAt: '2026-06-13', isPinned: false },
    { id: 'Q-153', title: '문화패스 사용처 추가 예정인가요', author: '최지원', views: 64, comments: 0, qnaStatus: '답변대기', createdAt: '2026-06-12', isPinned: false },
    { id: 'Q-152', title: '직무교육 바우처 중복 수혜 관련 문의', author: '오민준', views: 52, comments: 0, qnaStatus: '답변대기', createdAt: '2026-06-11', isPinned: false },
  ],
}

const KPIS = [
  { title: '공지사항', value: '21', tone: 'blue' },
  { title: '자유게시판', value: '412', tone: 'green' },
  { title: 'Q&A 총 건수', value: '156', tone: 'amber' },
  { title: 'Q&A 답변 대기', value: '3', tone: 'rose' },
]

const TABS = [
  { id: 'notice', label: '공지사항' },
  { id: 'free', label: '자유게시판' },
  { id: 'qna', label: 'Q&A' },
]

function BoardPage() {
  const [activeTab, setActiveTab] = useState('notice')

  const rows = BOARD_DATA[activeTab]

  return (
    <div className="page-content">
      <div className="page-stat-grid">
        {KPIS.map((k) => (
          <div key={k.title} className={`page-stat-card page-stat-card-${k.tone}`}>
            <span className="page-stat-title">{k.title}</span>
            <div className="page-stat-value-row">
              <strong className="page-stat-value">{k.value}</strong>
              <span className="page-stat-unit">건</span>
            </div>
          </div>
        ))}
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <h3>게시판 관리</h3>
          </div>
          {activeTab === 'notice' && (
            <button type="button" className="primary-btn">+ 공지 작성</button>
          )}
        </div>
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn${activeTab === tab.id ? ' tab-btn-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'qna' && (
                <span className="tab-badge">대기 3</span>
              )}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>제목</th>
                <th>작성자</th>
                <th>조회수</th>
                <th>댓글</th>
                {activeTab === 'qna' && <th>답변 상태</th>}
                <th>작성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.isPinned ? 'row-pinned' : ''}>
                  <td className="text-muted">
                    {row.isPinned ? <span className="pin-badge">고정</span> : row.id}
                  </td>
                  <td>
                    <strong>{row.title}</strong>
                  </td>
                  <td>{row.author}</td>
                  <td>{row.views.toLocaleString()}</td>
                  <td>{row.comments}</td>
                  {activeTab === 'qna' && (
                    <td>
                      <span className={`status-pill ${row.qnaStatus === '답변완료' ? 'status-green' : 'status-amber'}`}>
                        {row.qnaStatus}
                      </span>
                    </td>
                  )}
                  <td className="text-muted">{row.createdAt}</td>
                  <td>
                    <div className="action-btn-group">
                      {activeTab === 'qna' && row.qnaStatus === '답변대기' && (
                        <button type="button" className="action-btn action-btn-primary">답변</button>
                      )}
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

export default BoardPage
