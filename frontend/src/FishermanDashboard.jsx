import { useState, useEffect, useCallback, useRef } from 'react'
import './dashboard.css'
import { apiGet } from './api'
import MyTrips from './MyTrips'
import TripPlanner from './TripPlanner'
import Marketplace from './Marketplace'
import Messages from './Messages'
import Carousel from './components/Carousel/Carousel'
import GradientText from './components/GradientText/GradientText'
import SpotlightCard from './components/SpotlightCard/SpotlightCard'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
)

const DashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
const TripIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l1-8 4.5 4 3.5-8 3.5 8 4.5-4 1 8H3z"/></svg>
const CalendarIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
const ShopIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
const MessageIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const LogoutIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
const WavesIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
const WindIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
const AlertIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
const ShieldIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const AnchorIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>
const TempIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
const DropletIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
const CompassIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const XIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const GridIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>

// ── Helpers ────────────────────────────────────────────────────────────────────

function riskClass(level) {
  if (level === 'SAFE') return 'safe'
  if (level === 'CAUTION') return 'caution'
  return 'unsafe'
}

function riskColor(level) {
  if (level === 'SAFE') return 'var(--safe)'
  if (level === 'CAUTION') return 'var(--caution)'
  return 'var(--unsafe)'
}

function severityClass(s) {
  if (s === 'LOW') return 'low'
  if (s === 'MEDIUM') return 'medium'
  if (s === 'HIGH') return 'high'
  return 'critical'
}

function overallRisk(zones) {
  if (!zones?.length) return null
  if (zones.some(z => z.risk.level === 'UNSAFE')) return 'UNSAFE'
  if (zones.some(z => z.risk.level === 'CAUTION')) return 'CAUTION'
  return 'SAFE'
}

function windDir(deg) {
  if (deg == null) return ''
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8]
}

function fmt(val, unit = '', decimals = 1) {
  if (val == null || isNaN(val)) return '—'
  return `${Number(val).toFixed(decimals)}${unit}`
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── useCountUp hook ────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, decimals = 1) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (target == null || isNaN(target) || target === 0) { setVal(0); return }
    startRef.current = null
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(+(target * eased).toFixed(decimals))
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, decimals])

  return val
}

// ── Forecast generation ────────────────────────────────────────────────────────

function generateForecast(baseWave = 1.2, baseWind = 18) {
  const now = new Date()
  return Array.from({ length: 48 }, (_, i) => {
    const h = new Date(now.getTime() + i * 3_600_000)
    const hour = h.getHours()
    const waveSine = Math.sin((hour / 12) * Math.PI)
    const wave = Math.max(0.1, baseWave + waveSine * 0.4 + (Math.random() - 0.5) * 0.15)
    const windSine = Math.sin(((hour - 14) / 12) * Math.PI)
    const wind = Math.max(2, baseWind + windSine * 7 + (Math.random() - 0.5) * 2.5)
    const label = i === 0 ? 'Now' : (i % 6 === 0 ? `+${i}h` : '')
    return { label, fullLabel: i === 0 ? 'Now' : `+${i}h`, wave: +wave.toFixed(2), wind: +wind.toFixed(1) }
  })
}

// ── Advisory severity counts ───────────────────────────────────────────────────

function advisoryCounts(advisories) {
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  advisories.forEach(a => { counts[a.severity] = (counts[a.severity] || 0) + 1 })
  return [
    { name: 'Low',      value: counts.LOW,      color: 'var(--safe)' },
    { name: 'Medium',   value: counts.MEDIUM,   color: 'var(--caution)' },
    { name: 'High',     value: counts.HIGH,      color: 'var(--amber)' },
    { name: 'Critical', value: counts.CRITICAL,  color: 'var(--unsafe)' },
  ].filter(d => d.value > 0)
}

// ── Custom Chart Tooltip ───────────────────────────────────────────────────────

function SeaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{payload[0]?.payload?.fullLabel || label}</p>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}{p.name === 'Wave' ? 'm' : ' km/h'}</strong></span>
        </div>
      ))}
    </div>
  )
}

function ZoneBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{d?.name}</p>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__dot" style={{ background: d?.color }} />
        <span>Wave: <strong>{d?.wave}m</strong></span>
      </div>
      <div className="chart-tooltip__row" style={{ color: 'var(--text-2)', fontSize: '11px' }}>
        Risk: {d?.risk}
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ user, activeNav, onNav, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const navItems = [
    { id: 'dashboard', icon: <DashIcon />,     label: 'Dashboard' },
    { id: 'planner',   icon: <CalendarIcon />, label: 'Trip Planner' },
    { id: 'trips',     icon: <TripIcon />,     label: 'My Trips' },
    { id: 'market',    icon: <ShopIcon />,     label: 'Marketplace' },
    { id: 'messages',  icon: <MessageIcon />,  label: 'Messages' },
  ]
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'FI'

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <img src="/logo.png" alt="MERMAID" className="sidebar__logo-img" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <span className="sidebar__brand">Mermaid</span>
        <button className="sidebar__toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav className="sidebar__nav">
        <p className="sidebar__nav-label">Navigation</p>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar__link${activeNav === item.id ? ' sidebar__link--on' : ''}`}
            onClick={() => onNav(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            <span className="sidebar__link-text">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__bottom">
        <button className="sidebar__link" onClick={() => onNav('profile')} title={collapsed ? 'Profile' : undefined}>
          <span className="sidebar__avatar">{initials}</span>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.fullName?.split(' ')[0] || 'Profile'}</span>
            <span className="sidebar__user-role">Fisherman</span>
          </div>
        </button>
        <button className="sidebar__link sidebar__link--logout" onClick={onLogout} title={collapsed ? 'Sign Out' : undefined}>
          <span className="sidebar__link-icon"><LogoutIcon /></span>
          <span className="sidebar__link-text">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}


// ── Hero Card ──────────────────────────────────────────────────────────────────

function HeroCard({ overall, loading }) {
  const meta = {
    SAFE:    { label: 'SAFE TO FISH',  sub: 'All monitored zones show favorable sea conditions.', icon: <ShieldIcon /> },
    CAUTION: { label: 'USE CAUTION',   sub: 'Some zones have elevated risk. Check zone details before sailing.', icon: <AlertIcon /> },
    UNSAFE:  { label: 'DO NOT SAIL',   sub: 'Dangerous conditions detected. Stay ashore until conditions improve.', icon: <AlertIcon /> },
  }
  const m = overall ? meta[overall] : null
  const cls = overall ? riskClass(overall) : 'neutral'

  return (
    <div className={`hero-card hero-card--${cls}`} style={{ animation: 'fadeup 0.4s ease' }}>
      <div className="hero-card__bg" />
      <div className="hero-card__inner">
        <div className={`hero-card__icon`}>
          {loading ? <WavesIcon /> : (m?.icon || <ShieldIcon />)}
        </div>
        <div>
          <p className="hero-card__eyebrow">Sea Condition Status</p>
          {loading
            ? <div className="skeleton" style={{ height: '2.2rem', width: '220px', marginBottom: '8px' }} />
            : <h2 className="hero-card__status">
                <GradientText
                  colors={overall === 'SAFE' ? ['#00f5a0', '#00d9f5', '#00f5a0'] : overall === 'CAUTION' ? ['#fbbf24', '#f59e0b', '#fbbf24'] : ['#ff4d4d', '#ff1744', '#ff4d4d']}
                  animationSpeed={5}
                >
                  {m?.label || 'Loading…'}
                </GradientText>
              </h2>
          }
          {!loading && <p className="hero-card__sub">{m?.sub || 'Awaiting data…'}</p>}
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KPICard({ label, rawValue, unit = '', decimals = 1, icon, iconVariant, sub, loading }) {
  const counted = useCountUp(loading ? 0 : (rawValue ?? 0), 1200, decimals)
  const display = loading ? '—' : (rawValue == null || isNaN(rawValue) ? '—' : `${counted}${unit}`)

  return (
    <SpotlightCard className="kpi-card" spotlightColor="rgba(0, 210, 190, 0.08)">
      <div className={`kpi-card__icon-wrap${iconVariant ? ` kpi-card__icon-wrap--${iconVariant}` : ''}`}>
        {icon}
      </div>
      <div>
        <p className="kpi-card__label">{label}</p>
        <p className="kpi-card__value">{display}</p>
      </div>
      {sub && <p className="kpi-card__sub">{sub}</p>}
    </SpotlightCard>
  )
}

// ── Sea Conditions Area Chart ─────────────────────────────────────────────────

function SeaConditionsChart({ forecast }) {
  const [range, setRange] = useState(24)
  const data = forecast.slice(0, range)

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Sea Conditions Forecast</p>
          <p className="chart-card__sub">Wave height (m) & wind speed (km/h)</p>
        </div>
        <div className="chart-toggle">
          {[24, 48].map(r => (
            <button
              key={r}
              className={`chart-toggle__btn${range === r ? ' chart-toggle__btn--on' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}h
            </button>
          ))}
        </div>
      </div>

      <div className="chart-legend">
        <div className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: 'var(--accent)' }} />
          Wave Height (m)
        </div>
        <div className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: 'var(--amber)' }} />
          Wind Speed (km/h)
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--amber)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--amber)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<SeaTooltip />} />
          <Area
            type="monotone"
            dataKey="wave"
            name="Wave"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#waveGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: '#06090F', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1200}
          />
          <Area
            type="monotone"
            dataKey="wind"
            name="Wind"
            stroke="var(--amber)"
            strokeWidth={2}
            fill="url(#windGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--amber)', stroke: '#06090F', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Zone Risk Bar Chart (Power BI style) ──────────────────────────────────────

// ── Wave-tip bar shape ─────────────────────────────────────────────────────────

function WaveBar(props) {
  const { x, y, width, height, fill } = props
  if (!height || height <= 0 || !width || width <= 0) return null

  const wA = 7  // wave amplitude (peak-to-trough = 2×wA)
  const w = width

  // Wave runs along the top edge of the bar.
  // Path: bottom-left → up left → 2 full sine waves (quadratic bézier) → down right → close
  // Peaks sit at y - wA (above bar top), troughs at y + wA (dipping slightly in)
  const path = [
    `M ${x},${y + height}`,
    `L ${x},${y}`,
    `Q ${x + w * 0.125},${y - wA}   ${x + w * 0.25},${y}`,
    `Q ${x + w * 0.375},${y + wA}   ${x + w * 0.5},${y}`,
    `Q ${x + w * 0.625},${y - wA}   ${x + w * 0.75},${y}`,
    `Q ${x + w * 0.875},${y + wA}   ${x + w},${y}`,
    `L ${x + w},${y + height}`,
    'Z',
  ].join(' ')

  // Gradient fill id unique per bar (use x position)
  const gid = `wbg-${Math.round(x)}`

  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={fill} stopOpacity="0.95" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Glow layer */}
      <path d={path} fill={fill} opacity={0.12} style={{ filter: 'blur(6px)' }} />
      {/* Main bar */}
      <path d={path} fill={`url(#${gid})`} />
    </g>
  )
}

// ── Zone Risk Bars (vertical columns) ─────────────────────────────────────────

function ZoneRiskBars({ zones }) {
  const data = zones
    .filter(z => z.marine?.waveHeightM != null)
    .map(z => ({
      name: z.zoneName.replace(/\s+Zone$/i, ''),  // trim trailing "Zone" for brevity
      wave: +z.marine.waveHeightM.toFixed(2),
      risk: z.risk.level,
      color: riskColor(z.risk.level),
    }))
    .sort((a, b) => b.wave - a.wave)

  if (!data.length) return null

  // Attach color per entry so WaveBar can read it via Cell
  const CustomBar = (props) => {
    const entry = data[props.index]
    return <WaveBar {...props} fill={entry?.color ?? 'var(--safe)'} />
  }

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Zone Wave Heights</p>
          <p className="chart-card__sub">Current wave height per fishing zone</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 8 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(238,244,255,0.45)', fontSize: 10.5, fontFamily: 'Outfit' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v}
          />
          <YAxis
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false}
            tickLine={false}
            unit="m"
            width={34}
          />
          <Tooltip content={<ZoneBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="wave" shape={<CustomBar />} isAnimationActive animationDuration={1000} label={{ position: 'top', fill: 'rgba(238,244,255,0.35)', fontSize: 10, fontFamily: 'Outfit', formatter: v => `${v}m` }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Advisory Donut Chart ───────────────────────────────────────────────────────

function AdvisoryDonut({ advisories }) {
  const data = advisoryCounts(advisories)
  const total = advisories.length

  if (!total) {
    return (
      <div className="chart-card">
        <div className="chart-card__head">
          <div>
            <p className="chart-card__title">Advisory Breakdown</p>
            <p className="chart-card__sub">Severity distribution</p>
          </div>
        </div>
        <div className="adv-panel__empty" style={{ borderStyle: 'none', paddingTop: 16, paddingBottom: 20 }}>
          <div className="adv-panel__empty-icon"><ShieldIcon /></div>
          <p className="adv-panel__empty-title">All Clear</p>
          <p className="adv-panel__empty-sub">No active advisories</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Advisory Breakdown</p>
          <p className="chart-card__sub">Severity distribution</p>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              dataKey="value"
              isAnimationActive
              animationDuration={1000}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [v, n]}
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                fontFamily: 'Outfit',
                fontSize: '12px',
                color: 'var(--text-1)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.8rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-1)' }}>{total}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active</p>
        </div>
      </div>

      <div className="chart-legend" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {data.map((d, i) => (
          <div key={i} className="chart-legend__item">
            <span className="chart-legend__dot" style={{ background: d.color }} />
            {d.name}: {d.value}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Advisories Panel ──────────────────────────────────────────────────────────

function AdvisoriesPanel({ advisories, loading }) {
  const sevLabels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' }

  return (
    <div className="adv-panel">
      <div className="adv-panel__head">
        <p className="adv-panel__title">Active Advisories</p>
        {!loading && advisories.length > 0 && (
          <span className="adv-panel__count">{advisories.length}</span>
        )}
      </div>
      <div className="adv-panel__list">
        {loading ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton" style={{ height: 72 }} />
            <div className="skeleton" style={{ height: 72 }} />
            <div className="skeleton" style={{ height: 72 }} />
          </div>
        ) : advisories.length > 0 ? (
          advisories.map(a => (
            <div key={a.id} className={`adv-item adv-item--${severityClass(a.severity)}`}>
              <div className="adv-item__stripe" />
              <div className="adv-item__body">
                <div className="adv-item__header">
                  <span className={`sev-chip sev-chip--${severityClass(a.severity)}`}>
                    {sevLabels[a.severity] || a.severity}
                  </span>
                  <span className="adv-item__area">{a.affectedArea}</span>
                </div>
                <p className="adv-item__title">{a.title}</p>
                <p className="adv-item__msg">{a.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="adv-panel__empty">
            <div className="adv-panel__empty-icon"><ShieldIcon /></div>
            <p className="adv-panel__empty-title">All Clear</p>
            <p className="adv-panel__empty-sub">No active advisories at this time.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Zone Carousel Icon (header slot for each carousel card) ──────────────────

function ZoneCarouselIcon({ zone }) {
  const rc = riskClass(zone.risk.level)
  return (
    <div className="zone-carousel-icon">
      <span className={`risk-badge risk-badge--${rc}`}>
        {zone.risk.level === 'SAFE' ? '✓' : zone.risk.level === 'CAUTION' ? '!' : '✕'}
        {' '}{zone.risk.level}
      </span>
      <div className="zone-carousel-stats">
        <div className="zone-carousel-stat">
          <WavesIcon />
          <span>{fmt(zone.marine?.waveHeightM, 'm')}</span>
        </div>
        <div className="zone-carousel-stat">
          <WindIcon />
          <span>{zone.weather?.windSpeedKmh != null ? `${Math.round(zone.weather.windSpeedKmh)} km/h` : '—'}</span>
        </div>
        <div className="zone-carousel-stat">
          <TempIcon />
          <span>{zone.weather?.temperatureC != null ? `${Math.round(zone.weather.temperatureC)}°C` : '—'}</span>
        </div>
        <div className="zone-carousel-stat">
          <DropletIcon />
          <span>{fmt(zone.weather?.precipitationMm, ' mm', 1)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Zone Cards ────────────────────────────────────────────────────────────────

function ZoneCard({ zone, onClick }) {
  const rc = riskClass(zone.risk.level)
  return (
    <div className={`zone-card zone-card--${rc}`} onClick={onClick}>
      <div className="zone-card__top-bar" />
      <div className="zone-card__body">
        <div className="zone-card__head">
          <div>
            <p className="zone-card__name">{zone.zoneName}</p>
            <p className="zone-card__region">{zone.region}</p>
          </div>
          <span className={`risk-badge risk-badge--${rc}`}>
            {zone.risk.level === 'SAFE' ? '✓' : zone.risk.level === 'CAUTION' ? '!' : '✕'}
            {' '}{zone.risk.level}
          </span>
        </div>

        <p className="zone-card__advisory">{zone.risk.advisory}</p>

        <div className="zone-card__stats">
          <div className="zone-stat">
            <div className="zone-stat__icon"><WavesIcon /></div>
            <span className="zone-stat__value">{fmt(zone.marine?.waveHeightM, 'm')}</span>
            <span className="zone-stat__label">Wave</span>
          </div>
          <div className="zone-stat">
            <div className="zone-stat__icon"><WindIcon /></div>
            <span className="zone-stat__value">
              {zone.weather?.windSpeedKmh != null ? `${Math.round(zone.weather.windSpeedKmh)}` : '—'}
            </span>
            <span className="zone-stat__label">{zone.weather?.windDirectionDeg != null ? windDir(zone.weather.windDirectionDeg) : 'km/h'}</span>
          </div>
          <div className="zone-stat">
            <div className="zone-stat__icon"><TempIcon /></div>
            <span className="zone-stat__value">
              {zone.weather?.temperatureC != null ? `${Math.round(zone.weather.temperatureC)}°` : '—'}
            </span>
            <span className="zone-stat__label">Temp</span>
          </div>
          <div className="zone-stat">
            <div className="zone-stat__icon"><DropletIcon /></div>
            <span className="zone-stat__value">
              {fmt(zone.weather?.precipitationMm, '', 1)}
            </span>
            <span className="zone-stat__label">Rain mm</span>
          </div>
        </div>
        <p className="zone-card__click-hint"><GridIcon /> View details</p>
      </div>
    </div>
  )
}

// ── Zone Detail Modal ─────────────────────────────────────────────────────────

function ZoneModal({ zone, onClose }) {
  const [tab, setTab] = useState('overview')
  const rc = riskClass(zone.risk.level)

  // Escape key
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  const scoreWidth = zone.risk.score != null ? `${(zone.risk.score / 10) * 100}%` : '0%'

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        {/* Header */}
        <div className="modal__header">
          <div>
            <p className="modal__region">{zone.region}</p>
            <h2 className="modal__zone-name">{zone.zoneName}</h2>
            <div style={{ marginTop: 10 }}>
              <span className={`risk-badge risk-badge--${rc} risk-badge--lg`}>
                {zone.risk.level === 'SAFE' ? '✓ SAFE' : zone.risk.level === 'CAUTION' ? '! CAUTION' : '✕ UNSAFE'}
              </span>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}><XIcon /></button>
        </div>

        {/* Tabs */}
        <div className="modal__tabs">
          {['overview', 'marine', 'weather'].map(t => (
            <button
              key={t}
              className={`modal__tab${tab === t ? ' modal__tab--on' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="modal__body">
          {tab === 'overview' && (
            <>
              <p className="modal__advisory-text">{zone.risk.advisory}</p>

              {zone.risk.score != null && (
                <>
                  <p className="modal__score-label">Risk Score</p>
                  <div className="modal__score-bar-wrap">
                    <div className={`modal__score-bar modal__score-bar--${rc}`} style={{ width: scoreWidth }} />
                  </div>
                  <div className="modal__score-nums">
                    <span>0 — Safe</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>
                      {zone.risk.score}/10
                    </span>
                    <span>10 — Extreme</span>
                  </div>
                </>
              )}

              {zone.risk.factors?.length > 0 && (
                <>
                  <p className="modal__score-label" style={{ marginTop: 8 }}>Risk Factors</p>
                  <div className="modal__factors">
                    {zone.risk.factors.map((f, i) => (
                      <span key={i} className="factor-chip">{f}</span>
                    ))}
                  </div>
                </>
              )}

              {(zone.lat != null || zone.observedAt) && (
                <div className="modal__data-grid" style={{ marginTop: 16 }}>
                  {zone.lat != null && (
                    <div className="modal__data-item">
                      <p className="modal__data-label">Coordinates</p>
                      <p className="modal__data-value" style={{ fontSize: '1rem' }}>
                        {zone.lat?.toFixed(4)}, {zone.lng?.toFixed(4)}
                      </p>
                    </div>
                  )}
                  {zone.observedAt && (
                    <div className="modal__data-item">
                      <p className="modal__data-label">Observed At</p>
                      <p className="modal__data-value" style={{ fontSize: '1rem' }}>
                        {fmtTime(zone.observedAt)}
                      </p>
                    </div>
                  )}
                  {zone.dataSource && (
                    <div className="modal__data-item">
                      <p className="modal__data-label">Data Source</p>
                      <p className="modal__data-value" style={{ fontSize: '1rem' }}>{zone.dataSource}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'marine' && (
            <div className="modal__data-grid">
              <div className="modal__data-item">
                <p className="modal__data-label">Wave Height</p>
                <p className="modal__data-value">{fmt(zone.marine?.waveHeightM, '', 2)}</p>
                <p className="modal__data-unit">meters</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Swell Height</p>
                <p className="modal__data-value">{fmt(zone.marine?.swellHeightM, '', 2)}</p>
                <p className="modal__data-unit">meters</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Swell Period</p>
                <p className="modal__data-value">{fmt(zone.marine?.swellPeriodS, '', 1)}</p>
                <p className="modal__data-unit">seconds</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Swell Direction</p>
                <p className="modal__data-value">
                  {zone.marine?.swellDirectionDeg != null
                    ? `${Math.round(zone.marine.swellDirectionDeg)}°`
                    : '—'}
                </p>
                <p className="modal__data-unit">{windDir(zone.marine?.swellDirectionDeg) || 'degrees'}</p>
              </div>
            </div>
          )}

          {tab === 'weather' && (
            <div className="modal__data-grid">
              <div className="modal__data-item">
                <p className="modal__data-label">Wind Speed</p>
                <p className="modal__data-value">{zone.weather?.windSpeedKmh != null ? Math.round(zone.weather.windSpeedKmh) : '—'}</p>
                <p className="modal__data-unit">
                  km/h {windDir(zone.weather?.windDirectionDeg)}
                </p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Wind Gusts</p>
                <p className="modal__data-value">{zone.weather?.windGustsKmh != null ? Math.round(zone.weather.windGustsKmh) : '—'}</p>
                <p className="modal__data-unit">km/h</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Temperature</p>
                <p className="modal__data-value">{zone.weather?.temperatureC != null ? `${Math.round(zone.weather.temperatureC)}°` : '—'}</p>
                <p className="modal__data-unit">Celsius</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Precipitation</p>
                <p className="modal__data-value">{fmt(zone.weather?.precipitationMm, '', 1)}</p>
                <p className="modal__data-unit">mm</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Cloud Cover</p>
                <p className="modal__data-value">
                  {zone.weather?.cloudCoverPct != null ? `${Math.round(zone.weather.cloudCoverPct)}` : '—'}
                </p>
                <p className="modal__data-unit">percent</p>
              </div>
              <div className="modal__data-item">
                <p className="modal__data-label">Wind Direction</p>
                <p className="modal__data-value" style={{ fontSize: '1.1rem' }}>
                  {zone.weather?.windDirectionDeg != null ? `${Math.round(zone.weather.windDirectionDeg)}°` : '—'}
                </p>
                <p className="modal__data-unit">{windDir(zone.weather?.windDirectionDeg) || '—'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Marketplace Status Widget ──────────────────────────────────────────────────

function MarketplaceStatus({ token }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const pageSize = 4

  useEffect(() => {
    let active = true
    apiGet('/marketplace/listings', token)
      .then(data => {
        if (active) {
          setListings(data || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  const totalPages = Math.max(1, Math.ceil(listings.length / pageSize))
  const paginated = listings.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="zone-swap-section" style={{ marginTop: 24 }}>
      <div className="zone-grid-header" style={{ marginBottom: 12 }}>
        <p className="section-label"><ShopIcon /> Marketplace Status</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button 
            disabled={page === 0} 
            onClick={() => setPage(p => p - 1)}
            style={{ 
              opacity: page === 0 ? 0.3 : 1, 
              cursor: page === 0 ? 'default' : 'pointer', 
              background: 'var(--bg-card-2)', 
              border: '1px solid var(--border)', 
              borderRadius: 4, 
              width: 24, 
              height: 24, 
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14
            }}
          >
            {'<'}
          </button>
          <button 
            disabled={page >= totalPages - 1} 
            onClick={() => setPage(p => p + 1)}
            style={{ 
              opacity: page >= totalPages - 1 ? 0.3 : 1, 
              cursor: page >= totalPages - 1 ? 'default' : 'pointer', 
              background: 'var(--bg-card-2)', 
              border: '1px solid var(--border)', 
              borderRadius: 4, 
              width: 24, 
              height: 24, 
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14
            }}
          >
            {'>'}
          </button>
        </div>
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 180 }}>
           <div className="empty-state__icon" style={{ marginBottom: 12 }}><ShopIcon /></div>
           <p className="empty-state__title">No Active Listings</p>
           <p className="empty-state__sub">Market is currently quiet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paginated.map(l => (
            <div key={l.id} style={{ 
              background: 'var(--bg-card-2)', 
              padding: '12px 14px', 
              borderRadius: 12, 
              border: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
               <div style={{ minWidth: 0, paddingRight: 8 }}>
                 <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                   {l.fishSpecies?.commonName || 'Unknown Fish'}
                 </p>
                 <p style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                   {l.vendorName || 'Vendor'} · {l.marketLocation?.name || 'Unknown Location'}
                 </p>
               </div>
               <div style={{ textAlign: 'right', flexShrink: 0 }}>
                 <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>₱{l.offerPricePerKg}/kg</p>
                 <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>Need {l.quantityNeeded}kg</p>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function FishermanDashboard({ user, token, onLogout }) {
  const [conditions, setConditions] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [selectedZone, setSelectedZone] = useState(null)
  const [forecast, setForecast] = useState(() => generateForecast())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cond, adv] = await Promise.all([
        apiGet('/marine/conditions', token),
        apiGet('/advisories?activeOnly=true', token),
      ])
      setConditions(cond)
      setAdvisories(adv)
      setLastUpdated(new Date())
      // Regenerate forecast based on actual data
      const zones = cond?.zones ?? []
      const waveBases = zones.map(z => z.marine?.waveHeightM).filter(v => v != null)
      const windBases = zones.map(z => z.weather?.windSpeedKmh).filter(v => v != null)
      const baseWave = waveBases.length ? waveBases.reduce((a, b) => a + b, 0) / waveBases.length : 1.2
      const baseWind = windBases.length ? windBases.reduce((a, b) => a + b, 0) / windBases.length : 18
      setForecast(generateForecast(baseWave, baseWind))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const overall = conditions ? overallRisk(conditions.zones) : null

  const zonesWithWave = conditions?.zones?.filter(z => z.marine?.waveHeightM != null) ?? []
  const avgWave = zonesWithWave.length
    ? zonesWithWave.reduce((s, z) => s + z.marine.waveHeightM, 0) / zonesWithWave.length
    : null

  const maxWind = conditions?.zones?.length
    ? Math.max(...conditions.zones.map(z => z.weather?.windSpeedKmh ?? 0))
    : null

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="db-shell">
      <Sidebar user={user} activeNav={activeNav} onNav={setActiveNav} onLogout={onLogout} />
      <main className="db-main">
        {activeNav === 'planner' ? <TripPlanner token={token} /> :
         activeNav === 'trips'  ? <MyTrips token={token} /> :
         activeNav === 'market' ? <Marketplace token={token} /> :
         activeNav === 'messages' ? <Messages token={token} userProfile={user} /> :
         (
          <div className="db-content">
            {/* ── Header ── */}
            <header className="db-header">
              <div>
                <h1 className="db-greeting">
                  {greeting()}, <span className="db-greeting__name">{user?.fullName?.split(' ')[0] || 'Fisherman'}</span>
                </h1>
                <p className="db-date">{today}</p>
              </div>
              <div className="db-header-right">
                {lastUpdated && (
                  <span className="db-last-updated">Updated {fmtTime(lastUpdated.toISOString())}</span>
                )}
                <button
                  className={`db-refresh${loading ? ' db-refresh--spinning' : ''}`}
                  onClick={load}
                  disabled={loading}
                >
                  <RefreshIcon />
                  Refresh
                </button>
                <button className="db-trip-btn" onClick={() => setActiveNav('trips')}>
                  <PlusIcon />
                  New Trip
                </button>
              </div>
            </header>

            {/* ── Body grid ── */}
            <div className="db-body">
              {/* ── Left column ── */}
              <div className="db-left">
                {error && (
                  <div className="db-error">
                    <AlertIcon />
                    <span>{error}</span>
                    <button className="db-error__retry" onClick={load}>Retry</button>
                  </div>
                )}

                {/* Hero */}
                <HeroCard overall={overall} loading={loading} />

                {/* KPI Row */}
                <div className="kpi-row">
                  <KPICard
                    label="Avg Wave Height"
                    rawValue={avgWave}
                    unit="m"
                    decimals={1}
                    icon={<WavesIcon />}
                    sub="Across all zones"
                    loading={loading}
                  />
                  <KPICard
                    label="Max Wind Speed"
                    rawValue={maxWind}
                    unit=" km/h"
                    decimals={0}
                    icon={<WindIcon />}
                    iconVariant="amber"
                    sub="Peak reading"
                    loading={loading}
                  />
                  <KPICard
                    label="Active Advisories"
                    rawValue={advisories.length}
                    unit=""
                    decimals={0}
                    icon={<AlertIcon />}
                    iconVariant={advisories.some(a => ['HIGH','CRITICAL'].includes(a.severity)) ? '' : 'safe'}
                    sub={advisories.length === 0 ? 'None issued' : `${advisories.filter(a => ['HIGH','CRITICAL'].includes(a.severity)).length} high priority`}
                    loading={loading}
                  />
                  <KPICard
                    label="Zones Monitored"
                    rawValue={conditions?.zones?.length ?? null}
                    unit=""
                    decimals={0}
                    icon={<CompassIcon />}
                    sub="La Union waters"
                    loading={loading}
                  />
                </div>

                {/* Sea Conditions Chart */}
                {!loading && <SeaConditionsChart forecast={forecast} />}
                {loading && <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />}

                {/* Zone Risk Bars */}
                {!loading && conditions?.zones?.length > 0 && (
                  <ZoneRiskBars zones={conditions.zones} />
                )}
                {loading && <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />}

                {/* Zone Cards removed — now in right column CardSwap */}
                <div style={{ display: 'none' }}>
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="db-right">
                <AdvisoriesPanel advisories={advisories} loading={loading} />
                {!loading && <AdvisoryDonut advisories={advisories} />}
                {loading && <div className="skeleton" style={{ height: 260, borderRadius: 18 }} />}

                {/* ── Zone CardSwap ── */}
                <div className="zone-swap-section">
                  <div className="zone-grid-header" style={{ marginBottom: 8 }}>
                    <p className="section-label"><GridIcon /> Fishing Zones</p>
                    {!loading && conditions?.zones?.length > 0 && (
                      <span className="section-count">{conditions.zones.length}</span>
                    )}
                  </div>

                  {loading ? (
                    <div className="skeleton" style={{ height: 280, borderRadius: 18 }} />
                  ) : conditions?.zones?.length > 0 ? (
                    <div className="zone-carousel-wrapper" onClick={e => {
                      // find which carousel item is active and open its modal
                      const el = e.target.closest('.carousel-item')
                      if (!el) return
                      const items = e.currentTarget.querySelectorAll('.carousel-item')
                      const idx = Array.from(items).indexOf(el)
                      if (idx >= 0 && conditions.zones[idx]) setSelectedZone(conditions.zones[idx])
                    }}>
                      <Carousel
                        items={conditions.zones.map((z, i) => ({
                          id: i,
                          title: z.zoneName,
                          description: z.region,
                          icon: <ZoneCarouselIcon zone={z} />,
                        }))}
                        baseWidth={322}
                        autoplay
                        autoplayDelay={4000}
                        pauseOnHover
                        loop
                      />
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state__icon"><WavesIcon /></div>
                      <p className="empty-state__title">No Zone Data</p>
                      <p className="empty-state__sub">Zone data unavailable.</p>
                    </div>
                  )}
                </div>

                <MarketplaceStatus token={token} />
              </div>
            </div>
          </div>
         )}
      </main>

      {/* Zone Detail Modal */}
      {selectedZone && (
        <ZoneModal zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}
    </div>
  )
}
