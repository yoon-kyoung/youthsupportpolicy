import Icon from '../../../styles/Icon'

function MenuItem({ label, icon, active = false, onClick }) {
  return (
    <button
      className={`menu-item${active ? ' menu-item-active' : ''}`}
      type="button"
      onClick={onClick}
    >
      <span className="menu-icon">
        <Icon name={icon} size={17} color="currentColor" />
      </span>
      <span>{label}</span>
    </button>
  )
}

export default MenuItem
