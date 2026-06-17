import { useState } from 'react'

function TodoList({ items }) {
  const [todos, setTodos] = useState(items)

  const toggleTodo = (index) => {
    setTodos((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, done: !item.done } : item,
      ),
    )
  }

  return (
    <article className="panel-card compact-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Today Checklist</p>
          <h3>오늘의 할 일</h3>
        </div>
      </div>
      <div className="todo-list">
        {todos.map((item, index) => (
          <button
            key={`${item.title}-${item.due}`}
            className={`todo-item${item.done ? ' todo-item-done' : ''}`}
            type="button"
            onClick={() => toggleTodo(index)}
          >
            <span className="todo-check">{item.done ? 'DONE' : 'TODO'}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.due}</p>
            </div>
          </button>
        ))}
      </div>
    </article>
  )
}

export default TodoList
