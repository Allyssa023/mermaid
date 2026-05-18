// MERMAID Vendor Dashboard — Visualizations
// Sparkline, waveform, mini bar etc.

function Sparkline({ data, color = "#a78bfa", fill = "rgba(167,139,250,0.18)", height = 60, showDot = true, label = "" }) {
  const w = 100, h = 100;
  if (!data || data.length === 0) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = Math.max(1, max - min);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  const last = points[points.length - 1];

  // Slight tilt for visual interest
  const gid = `g${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:"100%", height}}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} stroke="none"/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Dashed baseline */}
      <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="rgba(255,255,255,0.10)" strokeDasharray="2 3" strokeWidth="0.5"/>
      {showDot && last && (
        <>
          <circle cx={last[0]} cy={last[1]} r="2.5" fill={color}/>
          <circle cx={last[0]} cy={last[1]} r="5" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1"/>
        </>
      )}
      {label && (
        <text x={last ? last[0] - 14 : 0} y={last ? Math.max(10, last[1] - 6) : 10}
              fontSize="6" fill="rgba(255,255,255,0.6)" fontFamily="Monaco,monospace" textAnchor="end">
          {label}
        </text>
      )}
    </svg>
  );
}

function Waveform({ progress = 0.6, score = 96 }) {
  // Freshness decay curve — quality (%) over the 36h harvest-to-peak-gone window.
  // x: time (0 → 1, mapped to 0–36h). y: quality (0–100).
  const w = 300, h = 80;
  const padL = 0, padR = 0, padT = 6, padB = 14;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // Quality curve — starts at 100 at t=0, decays nonlinearly to ~38 at t=1.
  // Sharp drop after ~75% (the "peak gone" inflection).
  const quality = (t) => {
    // Smooth + accelerating loss
    const a = 1 - Math.pow(t, 1.6) * 0.55;        // gentle decay
    const b = Math.max(0, (t - 0.75) * 1.6);      // sharp tail
    return Math.max(38, 100 * (a - b * 0.35));
  };

  const N = 60;
  const points = Array.from({length: N + 1}, (_, i) => {
    const t = i / N;
    const q = quality(t);
    const x = padL + t * innerW;
    const y = padT + (1 - q / 100) * innerH;
    return [x, y, t, q];
  });

  const pathD = "M " + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const areaD = pathD + ` L ${padL + innerW} ${padT + innerH} L ${padL} ${padT + innerH} Z`;

  // Phase bands: Peak 0-0.33, Prime 0.33-0.66, Past peak 0.66-1
  const bandX = (t) => padL + t * innerW;

  // Now marker
  const nowX = padL + progress * innerW;
  const nowY = padT + (1 - quality(progress) / 100) * innerH;

  return (
    <div className="waveform">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
           style={{width: "100%", height: 80, display: "block"}}>
        <defs>
          <linearGradient id="fresh-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5eead4" stopOpacity="0.45"/>
            <stop offset="60%" stopColor="#5eead4" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="fresh-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#c2ef4e"/>
            <stop offset="55%" stopColor="#5eead4"/>
            <stop offset="85%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#f87171"/>
          </linearGradient>
        </defs>

        {/* Phase band dividers */}
        <line x1={bandX(0.33)} y1={padT - 2} x2={bandX(0.33)} y2={padT + innerH}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" strokeDasharray="2 3"/>
        <line x1={bandX(0.66)} y1={padT - 2} x2={bandX(0.66)} y2={padT + innerH}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" strokeDasharray="2 3"/>

        {/* Horizontal guide line @ 70% quality (recommended floor) */}
        <line x1={padL} x2={padL + innerW}
              y1={padT + 0.3 * innerH} y2={padT + 0.3 * innerH}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.6"/>

        {/* Area under curve */}
        <path d={areaD} fill="url(#fresh-area)"/>

        {/* Curve */}
        <path d={pathD} fill="none" stroke="url(#fresh-line)" strokeWidth="2"
              strokeLinecap="round"/>

        {/* Past-progress shading (consumed time) */}
        <rect x={padL} y={padT} width={nowX - padL} height={innerH}
              fill="rgba(255,255,255,0.03)"/>

        {/* Now marker */}
        <line x1={nowX} y1={padT - 2} x2={nowX} y2={padT + innerH}
              stroke="#c2ef4e" strokeWidth="1" strokeDasharray="2 2" opacity="0.6"/>
        <circle cx={nowX} cy={nowY} r="3.5" fill="#c2ef4e"
                stroke="#150f23" strokeWidth="2"/>

        {/* Phase labels */}
        <text x={bandX(0.165)} y={h - 3}
              textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)"
              fontFamily="Menlo, Monaco, monospace"
              style={{letterSpacing: "0.4px", textTransform: "uppercase"}}>PEAK</text>
        <text x={bandX(0.50)} y={h - 3}
              textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)"
              fontFamily="Menlo, Monaco, monospace"
              style={{letterSpacing: "0.4px", textTransform: "uppercase"}}>PRIME</text>
        <text x={bandX(0.835)} y={h - 3}
              textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)"
              fontFamily="Menlo, Monaco, monospace"
              style={{letterSpacing: "0.4px", textTransform: "uppercase"}}>DECLINE</text>
      </svg>

      {/* Floating "now" pill above the marker */}
      <div className="waveform__now" style={{left: `${progress * 100}%`}}>
        <span className="mono">NOW</span>
        <strong>{score}<small>/100</small></strong>
      </div>
    </div>
  );
}

function MiniBars({ data = [3, 5, 2, 7, 4, 6, 5, 8], color = "#5eead4" }) {
  const max = Math.max(...data);
  return (
    <div style={{display:"flex", alignItems:"flex-end", gap:3, height:24}}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: 4, height: `${(v/max) * 100}%`,
          background: color, opacity: 0.4 + (v/max) * 0.6,
          borderRadius: 2,
        }}/>
      ))}
    </div>
  );
}

window.Sparkline = Sparkline;
window.Waveform = Waveform;
window.MiniBars = MiniBars;
