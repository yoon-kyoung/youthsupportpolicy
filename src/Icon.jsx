// 아이콘 검색: https://fonts.google.com/icons?icon.style=Rounded
// 사용법: <Icon name="search" />  <Icon name="star" fill={1} size={24} />
export function Icon({ name, size = 20, fill = 0, weight = 400, style }) {
  return (
    <span
      className="material-symbols-rounded"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        lineHeight: 1,
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
