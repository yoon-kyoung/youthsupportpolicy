function AudienceInsightSection({ summary, categories, searchKeywords, vis }) {
  return (
    <section className="audience-insight-section">
      <div className="section-heading">
        <div>
          <h3>유저 속성 카테고리</h3>
        </div>
      </div>

      {vis.audienceSummary && (
        <div className="audience-summary-grid">
          {summary.map((item) => (
            <article key={item.label} className="panel-card audience-summary-card">
              <span className="audience-card-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      )}

      {vis.audienceCategories && (
        <div className="audience-category-grid">
          {categories.map((category) => (
            <article key={category.title} className="panel-card">
              <div className="section-heading">
                <div>
                  <h3>{category.title}</h3>
                </div>
              </div>
              <div className="attribute-list">
                {category.items.map((item) => (
                  <div key={item.name} className="attribute-item">
                    <div className="attribute-topline">
                      <strong>{item.name}</strong>
                      <span>{item.share}</span>
                    </div>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {vis.keywords && (
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <h3>인기 검색 키워드</h3>
            </div>
          </div>
          <div className="keyword-grid">
            {searchKeywords.map((item) => (
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
      )}
    </section>
  )
}

export default AudienceInsightSection
