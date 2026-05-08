export default function StatTile({ label, value, unit, colorVar }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value" style={colorVar ? { color: `var(${colorVar})` } : undefined}>
        {value ?? '—'}
        {unit && <small style={{ fontFamily: 'var(--font-ui)', fontSize: 11, marginLeft: 2 }}>{unit}</small>}
      </div>
    </div>
  )
}
