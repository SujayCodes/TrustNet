const PALETTE = ['#1fae84', '#e8a33d', '#5b8def', '#e5626a', '#a06fe0', '#35d6a4'];

function hashSeed(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function Avatar({ seed = 'trustnet', size = 40, className = '' }) {
  const h = hashSeed(seed);
  const color = PALETTE[h % PALETTE.length];
  const initials = (seed || '?').slice(0, 2).toUpperCase();
  const cells = [];
  const grid = 4;
  for (let i = 0; i < grid * grid; i++) {
    const col = i % grid;
    const row = Math.floor(i / grid);
    if (col >= grid / 2) continue; // mirror horizontally
    const bit = (h >> i) & 1;
    if (bit) {
      cells.push({ row, col });
      cells.push({ row, col: grid - 1 - col });
    }
  }
  const cellSize = 100 / grid;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`${seed} avatar`}
    >
      <rect width="100" height="100" rx="22" fill="#12161d" />
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.col * cellSize}
          y={c.row * cellSize}
          width={cellSize}
          height={cellSize}
          fill={color}
          opacity="0.9"
        />
      ))}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="30"
        fontFamily="Space Grotesk, sans-serif"
        fontWeight="700"
        fill="#f6f3ec"
        opacity="0.16"
      >
        {initials}
      </text>
    </svg>
  );
}
