import { useState } from 'react'
import Icon from '../../../styles/Icon'
import KpiWidgetSection from './KpiWidgetSection/KpiWidgetSection'
import ActivityTrendChart from './DataVizSection/ActivityTrendChart'
import CategoryPieChart from './DataVizSection/CategoryPieChart'
import PolicyReviewTable from './DataVizSection/PolicyReviewTable'
import TodoList from './OperationWidgetSection/TodoList'
import ActivityFeed from './OperationWidgetSection/ActivityFeed'
import AdminMemo from './OperationWidgetSection/AdminMemo'
import AudienceSummarySection from './AudienceInsightSection/AudienceSummarySection'
import AudienceCategorySection from './AudienceInsightSection/AudienceCategorySection'
import KeywordsSection from './AudienceInsightSection/KeywordsSection'

const SECTIONS = [
  { id: 'kpi',                label: 'KPI 요약' },
  { id: 'trendChart',         label: '조회 추이' },
  { id: 'pieChart',           label: '카테고리 분포' },
  { id: 'reviewTable',        label: '심사 현황' },
  { id: 'todos',              label: '오늘 할 일' },
  { id: 'feed',               label: '최근 활동' },
  { id: 'memo',               label: '관리자 메모' },
  { id: 'audienceSummary',    label: '유저 속성' },
  { id: 'audienceCategories', label: '유입 성향' },
  { id: 'keywords',           label: '인기 검색' },
]

const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s]))

const TOGGLE_GROUPS = [
  { label: '차트 분석',   ids: ['kpi', 'trendChart', 'pieChart'] },
  { label: '운영 현황',   ids: ['reviewTable', 'todos', 'feed', 'memo'] },
  { label: '오디언스',    ids: ['audienceSummary', 'audienceCategories', 'keywords'] },
]

// 초기 순서: 높이가 비슷한 섹션끼리 짝 — 2열 기준 row별 균형
// Row1: KPI 요약 | 카테고리 분포
// Row2: 조회 추이 | 심사 현황
// Row3: 오늘 할 일 | 최근 활동
// 나머지(off)는 뒤로
const INITIAL_ORDER = [
  'kpi', 'pieChart',
  'trendChart', 'reviewTable',
  'todos', 'feed',
  'memo', 'audienceSummary', 'audienceCategories', 'keywords',
]

const INITIAL_VIS = {
  kpi: true, trendChart: true, pieChart: true,
  reviewTable: true, todos: true, feed: true,
  memo: false, audienceSummary: false, audienceCategories: false, keywords: false,
}

function DraggableSection({ id, dragging, dragOver, onDragStart, onDragOver, onDrop, onDragEnd, children }) {
  const [canDrag, setCanDrag] = useState(false)
  const isOver = dragOver === id && dragging !== id

  return (
    <div
      className={`draggable-section${dragging === id ? ' section-dragging' : ''}${isOver ? ' section-drag-over' : ''}`}
      draggable={canDrag}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(id) }}
      onDrop={(e) => { e.preventDefault(); onDrop(id) }}
      onDragEnd={onDragEnd}
    >
      <div
        className="drag-handle"
        onMouseEnter={() => setCanDrag(true)}
        onMouseLeave={() => setCanDrag(false)}
        title="드래그하여 순서 변경"
      >
        ⠿
      </div>
      {children}
    </div>
  )
}

function Dashboard({ data }) {
  const [order, setOrder] = useState(INITIAL_ORDER)
  const [vis, setVis] = useState(INITIAL_VIS)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const toggle = (id) => setVis((v) => ({ ...v, [id]: !v[id] }))

  const handleDragStart = (id) => setDragging(id)
  const handleDragOver = (id) => { if (id !== dragging) setDragOver(id) }
  const handleDrop = (targetId) => {
    if (dragging && dragging !== targetId) {
      setOrder((prev) => {
        const next = [...prev]
        const from = next.indexOf(dragging)
        const to = next.indexOf(targetId)
        next.splice(from, 1)
        next.splice(to, 0, dragging)
        return next
      })
    }
    setDragging(null)
    setDragOver(null)
  }
  const handleDragEnd = () => { setDragging(null); setDragOver(null) }

  const renderSection = (id) => {
    switch (id) {
      case 'kpi':                return <KpiWidgetSection items={data.kpis} />
      case 'trendChart':         return <ActivityTrendChart data={data.trend} />
      case 'pieChart':           return <CategoryPieChart data={data.categoryMix} />
      case 'reviewTable':        return <PolicyReviewTable rows={data.reviews} />
      case 'todos':              return <TodoList items={data.todos} />
      case 'feed':               return <ActivityFeed items={data.feed} />
      case 'memo':               return <AdminMemo initialValue={data.memo} />
      case 'audienceSummary':    return <AudienceSummarySection items={data.audienceSummary} />
      case 'audienceCategories': return <AudienceCategorySection items={data.audienceCategories} />
      case 'keywords':           return <KeywordsSection items={data.searchKeywords} />
      default:                   return null
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-toggle-bar">
        {TOGGLE_GROUPS.map((group) => (
          <div key={group.label} className="toggle-group-box">
            <span className="toggle-group-title">{group.label}</span>
            <div className="toggle-group-btns">
              {group.ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`section-toggle${vis[id] ? ' section-toggle-on' : ''}`}
                  onClick={() => toggle(id)}
                >
                  {vis[id]&&<Icon name="check" size={13} color="currentColor"/>}
                  {SECTION_MAP[id].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {order.filter((id) => vis[id]).map((id) => (
        <DraggableSection
          key={id}
          id={id}
          dragging={dragging}
          dragOver={dragOver}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        >
          {renderSection(id)}
        </DraggableSection>
      ))}
    </div>
  )
}

export default Dashboard
