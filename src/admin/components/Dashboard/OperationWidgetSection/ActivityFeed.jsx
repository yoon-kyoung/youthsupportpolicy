function ActivityFeed({ items }) {
  return (
    <article className="panel-card compact-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent Updates</p>
          <h3>최근 활동 및 소식</h3>
        </div>
      </div>
      <div className="feed-list">
        {items.map((item) => (
          <div key={`${item.title}-${item.time}`} className="feed-item">
            <span className="feed-tag">{item.category}</span>
            <strong>{item.title}</strong>
            <p>{item.time}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

export default ActivityFeed
