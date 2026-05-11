import { useNavigate } from 'react-router-dom'

export default function StatTile({ label, value, unit, sub, to, dim }) {
  const navigate = useNavigate()
  return (
    <div
      className="kpi"
      onClick={to ? () => navigate(to) : undefined}
      style={{ cursor: to ? 'pointer' : 'default', opacity: dim ? 0.55 : 1 }}
    >
      <div className="kpi__label">{label}</div>
      <div className="kpi__value" style={{ fontSize: 28 }}>
        {value ?? <span style={{ color: 'var(--ink-5)' }}>—</span>}
        {unit && <sup style={{ fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 400, color: 'var(--ink-4)', marginLeft: 2 }}>{unit}</sup>}
      </div>
      {sub && <div className="kpi__foot">{sub}</div>}
    </div>
  )
}
