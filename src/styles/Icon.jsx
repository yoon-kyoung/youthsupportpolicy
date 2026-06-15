export default function Icon({ name, size = 20, color, style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        color: color || 'inherit',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
