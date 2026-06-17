function AudienceSummarySection({ items }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h3>유저 속성 요약</h3>
        </div>
      </div>
      <div className="audience-summary-grid">
        {items.map((item) => (
          <article key={item.label} className="panel-card audience-summary-card">
            <span className="audience-card-label">{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AudienceSummarySection
