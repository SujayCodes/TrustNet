import { Link } from 'react-router-dom';

function colorFor(score) {
  if (score >= 80) return '#35d6a4';
  if (score >= 55) return '#1fae84';
  if (score >= 30) return '#e8a33d';
  return '#e5626a';
}

export default function SkillConstellation({ overallScore, skills = [], size = 340 }) {
  const center = size / 2;
  const orbitR = size * 0.36;
  const nodeR = 26;
  const n = Math.max(skills.length, 1);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {skills.map((s, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = center + orbitR * Math.cos(angle);
        const y = center + orbitR * Math.sin(angle);
        return (
          <line
            key={`line-${s.skillId}`}
            x1={center} y1={center} x2={x} y2={y}
            stroke="var(--color-ledger)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Center node: overall score */}
      <circle cx={center} cy={center} r={nodeR + 12} fill="#12161d" stroke={colorFor(overallScore)} strokeWidth="2.5" />
      <text x={center} y={center - 4} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="20" fill={colorFor(overallScore)}>
        {overallScore.toFixed(1)}
      </text>
      <text x={center} y={center + 14} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fill="#8b93a3" letterSpacing="1">
        TRUST SCORE
      </text>

      {skills.map((s, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = center + orbitR * Math.cos(angle);
        const y = center + orbitR * Math.sin(angle);
        const c = colorFor(s.score);
        return (
          <g key={s.skillId} className="cursor-pointer">
            <circle cx={x} cy={y} r={nodeR} fill="#12161d" stroke={c} strokeWidth="2" />
            <text x={x} y={y - 3} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="13" fill={c}>
              {s.score.toFixed(0)}
            </text>
            <text
              x={x}
              y={y + orbitR > center ? nodeR + 14 : -nodeR - 8}
              dy={y > center ? nodeR + 13 : -nodeR - 6}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="10.5"
              fill="#f6f3ec"
            >
              {s.skillName.length > 16 ? s.skillName.slice(0, 15) + '…' : s.skillName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
