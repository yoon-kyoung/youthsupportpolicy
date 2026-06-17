import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  color: '#111827',
  fontSize: '0.86rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

function ActivityTrendChart({ data }) {
  return (
    <article className="panel-card chart-card">
      <div className="section-heading">
        <div>
          <h3>정책 조회 및 신청 추이</h3>
        </div>
      </div>
      <div className="chart-shell">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(209,213,219,0.5)" />
            <XAxis dataKey="label" stroke="#d1d5db" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis stroke="#d1d5db" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend
              wrapperStyle={{ fontSize: '0.84rem', color: '#6b7280', paddingTop: 12 }}
            />
            <Line
              type="monotone"
              dataKey="views"
              name="정책 조회수"
              stroke="#1D4ED8"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#1D4ED8' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="applies"
              name="신청 전환 수"
              stroke="#93C5FD"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#93C5FD' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

export default ActivityTrendChart
