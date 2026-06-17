const statusClassMap = {
  심사중: 'status-blue',
  보완요청: 'status-amber',
  승인대기: 'status-violet',
  완료: 'status-green',
}

function PolicyReviewTable({ rows }) {
  return (
    <article className="panel-card">
      <div className="section-heading">
        <div>
          <h3>정책 심사/처리 현황 보드</h3>
        </div>
      </div>
      <div className="table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th>정책명</th>
              <th>카테고리</th>
              <th>지역</th>
              <th>대상</th>
              <th>담당자</th>
              <th>상태</th>
              <th>접수 시각</th>
              <th>우선순위</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.name}-${row.submittedAt}`}>
                <td>{row.name}</td>
                <td>{row.category}</td>
                <td>{row.region}</td>
                <td>{row.target}</td>
                <td>{row.owner}</td>
                <td>
                  <span className={`status-pill ${statusClassMap[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.submittedAt}</td>
                <td>{row.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export default PolicyReviewTable
