// charts.jsx — Sparkline, donut, bars

function Sparkline({ data, height = 76, stroke = '#fa7faa', fill = 'rgba(250,127,170,0.25)', glow = true, dot = true, dotLabel = null }) {
  if (!data || data.length === 0) return null;
  const w = 320;
  const h = height;
  const padX = 8, padY = 12;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - padX * 2) / (data.length - 1);
  const points = data.map((v, i) => [padX + stepX * i, padY + (h - padY * 2) * (1 - (v - min) / range)]);
  const dPath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const aPath = `${dPath} L${points[points.length-1][0]},${h} L${points[0][0]},${h} Z`;

  const last = points[points.length - 1];
  const gradId = `g-${Math.random().toString(36).slice(2, 8)}`;
  const filterId = `f-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.6" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
        {glow && (
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        )}
      </defs>
      <path d={aPath} fill={`url(#${gradId})`} />
      {glow && <path d={dPath} stroke={stroke} strokeWidth="2.4" fill="none" opacity="0.55" filter={`url(#${filterId})`} />}
      <path d={dPath} stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {dot && (
        <g>
          <circle cx={last[0]} cy={last[1]} r="3.6" fill={stroke} />
          <circle cx={last[0]} cy={last[1]} r="6" fill={stroke} opacity="0.18" />
        </g>
      )}
      {dotLabel && (
        <g transform={`translate(${last[0] - 38}, ${last[1] - 22})`}>
          <rect width="64" height="18" rx="4" fill="#221a3d" stroke="#362d59" />
          <text x="32" y="12" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="#f2efff" fontWeight="600">{dotLabel}</text>
        </g>
      )}
    </svg>
  );
}

// Larger trend chart for active block right side
function MiniBars({ values, color = '#c2ef4e' }) {
  const max = Math.max(...values);
  return (
    <svg viewBox={`0 0 ${values.length * 6} 28`} className="spark">
      {values.map((v, i) => (
        <rect key={i} x={i * 6} y={28 - (v / max) * 26} width={4}
              height={(v / max) * 26} rx={1.5} fill={color} opacity={0.7 + (i / values.length) * 0.3} />
      ))}
    </svg>
  );
}

Object.assign(window, { Sparkline, MiniBars });
