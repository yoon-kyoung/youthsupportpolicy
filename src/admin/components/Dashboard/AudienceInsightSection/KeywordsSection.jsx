function KeywordsSection({ items }) {
  return (
    <article className="panel-card">
      <div className="section-heading">
        <div>
          <h3>인기 검색 키워드</h3>
        </div>
      </div>
      <div className="keyword-grid">
        {items.map((item) => (
          <div key={item.keyword} className="keyword-item">
            <div className="keyword-main">
              <strong>{item.keyword}</strong>
              <span>{item.volume}</span>
            </div>
            <div className="keyword-meta">
              <span>{item.category}</span>
              <span>{item.intent}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

export default KeywordsSection
