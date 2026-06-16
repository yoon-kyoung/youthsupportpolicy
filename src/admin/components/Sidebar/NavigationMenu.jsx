import MenuItem from './MenuItem'

function NavigationMenu({ items, activePage, onNavigate }) {
  return (
    <nav className="navigation-menu" aria-label="관리자 메뉴">
      {items.map((item) => (
        <MenuItem
          key={item.label}
          {...item}
          active={item.id === activePage}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </nav>
  )
}

export default NavigationMenu
