import NavigationMenu from './NavigationMenu'

function Sidebar({ items, activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-panel">
        <div className="sidebar-heading">
          <p className="eyebrow">LNB</p>
          <h2>운영 메뉴</h2>
        </div>
        <NavigationMenu items={items} activePage={activePage} onNavigate={onNavigate} />
        <div className="sidebar-summary">
          <span className="sidebar-summary-label">오늘 운영 포커스</span>
          <strong>심사 대기 47건</strong>
          <p>우선순위 높은 신청건을 오전 내 1차 검토로 이동하세요.</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
