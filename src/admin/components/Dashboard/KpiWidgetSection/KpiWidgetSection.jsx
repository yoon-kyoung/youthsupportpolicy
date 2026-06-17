import KpiCard from './KpiCard'

function KpiWidgetSection({ items }) {
  return (
    <section className="panel-card">
      <div className="section-heading">
        <div>
          <h3>상단 요약</h3>
        </div>
      </div>
      <div className="kpi-grid">
        {items.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </div>
    </section>
  )
}

export default KpiWidgetSection
