import TodoList from './TodoList'
import ActivityFeed from './ActivityFeed'
import AdminMemo from './AdminMemo'

function OperationWidgetSection({ todos, feed, memo }) {
  return (
    <section className="operation-widget-section">
      <TodoList items={todos} />
      <ActivityFeed items={feed} />
      <AdminMemo initialValue={memo} />
    </section>
  )
}

export default OperationWidgetSection
