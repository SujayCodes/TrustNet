const clampScore = (s) => Math.max(0, Math.min(100, s));

function colorForScore(score) {
  if (score >= 80) return 'var(--color-teal-bright)';
  if (score >= 55) return 'var(--color-teal)';
  if (score >= 30) return 'var(--color-amber)';
  return 'var(--color-rose)';
}

export default function TrustRing({ score = 0, size = 120, label, sublabel }) {
  const s = clampScore(score);
  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - s / 100);
  const color = colorForScore(s);

  return (
    <div className="relative inline-flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ledger)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-semibold" style={{ fontSize: size * 0.24, color }}>
          {s.toFixed(1)}
        </span>
        {label && <span className="text-mist text-[10px] tracking-wide uppercase mt-0.5">{label}</span>}
        {sublabel && <span className="text-mist-dim text-[10px]">{sublabel}</span>}
      </div>
    </div>
  );
}
