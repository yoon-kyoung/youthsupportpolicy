export default function Icon({ name, size = 20, color, filled = true, style = {} }) {
  return (
    <span
      className="material-symbols-rounded"
      style={{
        fontSize: size,
        color: color || 'inherit',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}
