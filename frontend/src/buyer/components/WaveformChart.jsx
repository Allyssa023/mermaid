/**
 * WaveformChart — Freshness decay curve for the Featured card.
 * Ported pixel-for-pixel from mermaid_buyer/charts.jsx Waveform component.
 */
export default function WaveformChart({ progress = 0.6, score = 96 }) {
  const w = 300, h = 80
  const padL = 0, padR = 0, padT = 6, padB = 14
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  // Quality curve — starts at 100 at t=0, decays nonlinearly to ~38 at t=1.
  const quality = (t) => {
    const a = 1 - Math.pow(t, 1.6) * 0.55
    const b = Math.max(0, (t - 0.75) * 1.6)
    return Math.max(38, 100 * (a - b * 0.35))
  }

  const N = 60
  const points = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N
    const q = quality(t)
    const x = padL + t * innerW
    const y = padT + (1 - q / 100) * innerH
    return [x, y, t, q]
  })

  const pathD = 'M ' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
  const areaD = pathD + ` L ${padL + innerW} ${padT + innerH} L ${padL} ${padT + innerH} Z`

  const bandX = (t) => padL + t * innerW

  // Now marker
  const nowX = padL + progress * innerW
  const nowY = padT + (1 - quality(progress) / 100) * innerH

  return (
    <div className="waveform-v2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 80, display: 'block' }}
      >
        <defs>
          <linearGradient id="fresh-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#5eead4" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fresh-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3ee2ff" />
            <stop offset="55%" stopColor="#5eead4" />
            <stop offset="85%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>

        {/* Phase band dividers */}
        <line x1={bandX(0.33)} y1={padT - 2} x2={bandX(0.33)} y2={padT + innerH}
          stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" strokeDasharray="2 3" />
        <line x1={bandX(0.66)} y1={padT - 2} x2={bandX(0.66)} y2={padT + innerH}
          stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" strokeDasharray="2 3" />

        {/* Horizontal guide line @ 70% quality */}
        <line x1={padL} x2={padL + innerW}
          y1={padT + 0.3 * innerH} y2={padT + 0.3 * innerH}
          stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />

        {/* Area under curve */}
        <path d={areaD} fill="url(#fresh-area)" />

        {/* Curve */}
        <path d={pathD} fill="none" stroke="url(#fresh-line)" strokeWidth="2"
          strokeLinecap="round" />

        {/* Past-progress shading */}
        <rect x={padL} y={padT} width={nowX - padL} height={innerH}
          fill="rgba(255,255,255,0.03)" />

        {/* Now marker */}
        <line x1={nowX} y1={padT - 2} x2={nowX} y2={padT + innerH}
          stroke="#3ee2ff" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
        <circle cx={nowX} cy={nowY} r="3.5" fill="#3ee2ff"
          stroke="#150f23" strokeWidth="2" />

        {/* Phase labels */}
        <text x={bandX(0.165)} y={h - 3}
          textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)"
          fontFamily="Menlo, Monaco, monospace"
          style={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>PEAK</text>
        <text x={bandX(0.50)} y={h - 3}
          textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)"
          fontFamily="Menlo, Monaco, monospace"
          style={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>PRIME</text>
        <text x={bandX(0.835)} y={h - 3}
          textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)"
          fontFamily="Menlo, Monaco, monospace"
          style={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>DECLINE</text>
      </svg>

      {/* Floating NOW pill */}
      <div className="waveform-v2__now" style={{ left: `${progress * 100}%` }}>
        <span className="mono">NOW</span>
        <strong>{score}<small>/100</small></strong>
      </div>
    </div>
  )
}
