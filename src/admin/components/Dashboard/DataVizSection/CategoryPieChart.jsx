import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE']

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  color: '#111827',
  fontSize: '0.86rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

function CategoryPieChart({ data }) {
  return (
    <article className="panel-card chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Category Distribution</p>
          <h3>카테고리별 조회 비중</h3>
        </div>
      </div>
      <div className="pie-shell">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={80}
              dataKey="value"
              nameKey="label"
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value}%`, name]}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="pie-legend">
        {data.map((item, index) => (
          <div key={item.label} className="pie-legend-item">
            <span className="pie-dot" style={{ background: COLORS[index] }} />
            <span className="pie-label">{item.label}</span>
            <strong className="pie-value">{item.value}%</strong>
          </div>
        ))}
      </div>
    </article>
  )
}

export default CategoryPieChart
