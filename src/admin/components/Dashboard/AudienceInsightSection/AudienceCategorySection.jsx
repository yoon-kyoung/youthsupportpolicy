function AudienceCategorySection({ items }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h3>유입 성향 카테고리</h3>
        </div>
      </div>
      <div className="audience-category-grid">
        {items.map((category) => (
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
    </section>
  )
}

export default AudienceCategorySection
