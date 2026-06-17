import { useState } from 'react'

function AdminMemo({ initialValue }) {
  const [memo, setMemo] = useState(initialValue)

  return (
    <article className="panel-card memo-card">
      <div className="section-heading">
        <div>
          <h3>관리자 메모장</h3>
        </div>
        <span className="memo-badge">자동 저장 준비</span>
      </div>
      <textarea
        className="memo-field"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
      />
    </article>
  )
}

export default AdminMemo
