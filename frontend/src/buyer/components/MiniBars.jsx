/**
 * MiniBars — Tiny inline bar chart.
 * Ported from mermaid_buyer/charts.jsx MiniBars component.
 */
export default function MiniBars({ data = [3, 5, 2, 7, 4, 6, 5, 8], color = '#5eead4' }) {
  const max = Math.max(...data)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: 4,
          height: `${(v / max) * 100}%`,
          background: color,
          opacity: 0.4 + (v / max) * 0.6,
          borderRadius: 2,
        }} />
      ))}
    </div>
  )
}
