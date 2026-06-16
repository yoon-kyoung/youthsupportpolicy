import PolicyReviewTable from './PolicyReviewTable'
import ActivityTrendChart from './ActivityTrendChart'
import CategoryPieChart from './CategoryPieChart'

function DataVizSection({ reviews, trend, categoryMix }) {
  return (
    <section className="data-viz-section">
      <PolicyReviewTable rows={reviews} />
      <div className="chart-row">
        <ActivityTrendChart data={trend} />
        <CategoryPieChart data={categoryMix} />
      </div>
    </section>
  )
}

export default DataVizSection
