function KpiCard({ title, value, change, description, tone }) {
  return (
    <article className={`kpi-card kpi-card-${tone}`}>
      <div className="kpi-card-topline">
        <span>{title}</span>
        <strong>{change}</strong>
      </div>
      <h4>{value}</h4>
      <p>{description}</p>
    </article>
  )
}

export default KpiCard
