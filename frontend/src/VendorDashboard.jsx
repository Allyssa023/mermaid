import { useState, useEffect, useCallback, useRef } from 'react'
import './dashboard.css'
import './vendor.css'
import { apiGet, apiPost, apiPut, apiDelete } from './api'
import Marketplace from './Marketplace'
import Messages from './Messages'
import GradientText from './components/GradientText/GradientText'
import SpotlightCard from './components/SpotlightCard/SpotlightCard'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Icons ────────────────────────────────────────────────────────────────────

const DashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
)
const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/>
    <line x1="8" x2="21" y1="18" y2="18"/>
    <line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/>
    <line x1="3" x2="3.01" y1="18" y2="18"/>
  </svg>
)
const ShopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
)
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const AnchorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/>
    <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
  </svg>
)
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const CloseListingIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)
const WavesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
  </svg>
)
const FishIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/>
    <path d="M18 12h.01"/><path d="M6.5 12C4 12 2.5 13.5 2 16c1-1 2.5-1.5 4.5-1.5"/>
  </svg>
)
const ScaleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/>
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/>
    <path d="M7 21h10"/><path d="M12 3v18"/>
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>
  </svg>
)
const MessageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const TrendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDeadline(iso) {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso) - new Date()) / 86400000)
  if (diff < 0)   return { label: 'Overdue',      urgent: true }
  if (diff === 0)  return { label: 'Due today',    urgent: true }
  if (diff === 1)  return { label: 'Due tomorrow', urgent: true }
  return { label: fmtDate(iso), urgent: false }
}

function fmtKg(v) {
  if (v == null) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v} kg`
}

function fmtRelative(iso) {
  if (!iso) return ''
  const diff = Math.floor((new Date() - new Date(iso)) / 60000)
  if (diff < 1)   return 'just now'
  if (diff < 60)  return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function severityClass(sev) {
  if (sev === 'LOW')    return 'low'
  if (sev === 'MEDIUM') return 'medium'
  if (sev === 'HIGH')   return 'high'
  return 'critical'
}

function riskClass(level) {
  if (level === 'SAFE')    return 'safe'
  if (level === 'CAUTION') return 'caution'
  return 'unsafe'
}

function riskColor(level) {
  if (level === 'SAFE')    return 'var(--safe)'
  if (level === 'CAUTION') return 'var(--caution)'
  return 'var(--unsafe)'
}

function toLocalDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Supply outlook derived from advisories
function supplyOutlook(advisories) {
  if (!advisories?.length) return 'NORMAL'
  if (advisories.some(a => a.severity === 'CRITICAL')) return 'CRITICAL'
  if (advisories.some(a => a.severity === 'HIGH'))     return 'DISRUPTED'
  return 'NORMAL'
}

// ─── useCountUp hook ──────────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, decimals = 0) {
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

// ─── Supply Outlook Hero Card ─────────────────────────────────────────────────

function SupplyOutlookCard({ advisories, zones, loading }) {
  const outlook = supplyOutlook(advisories)
  const unsafeZones = zones?.filter(z => z.risk?.level === 'UNSAFE').length ?? 0
  const cautionZones = zones?.filter(z => z.risk?.level === 'CAUTION').length ?? 0
  const riskZones = unsafeZones + cautionZones

  const meta = {
    NORMAL:    {
      label: 'SUPPLY NORMAL',
      sub: 'Fishing conditions are favorable. Catch availability expected today.',
      cls: 'safe',
      colors: ['#00f5a0', '#00d9f5', '#00f5a0'],
    },
    DISRUPTED: {
      label: 'SUPPLY DISRUPTED',
      sub: 'High-priority advisory in effect. Expect reduced catch availability.',
      cls: 'caution',
      colors: ['#fbbf24', '#f59e0b', '#fbbf24'],
    },
    CRITICAL:  {
      label: 'SUPPLY CRITICAL',
      sub: 'Dangerous conditions detected. Fishermen may not be able to go out today.',
      cls: 'unsafe',
      colors: ['#ff4d4d', '#ff1744', '#ff4d4d'],
    },
  }

  const m = meta[outlook]

  return (
    <div className={`hero-card hero-card--${m.cls}`} style={{ animation: 'fadeup 0.4s ease' }}>
      <div className="hero-card__bg" />
      <div className="hero-card__inner">
        <div className="hero-card__icon">
          {loading ? <WavesIcon /> : (outlook === 'NORMAL' ? <ShieldIcon /> : <AlertIcon />)}
        </div>
        <div>
          <p className="hero-card__eyebrow">Supply Outlook Today</p>
          {loading
            ? <div className="skeleton" style={{ height: '2.2rem', width: '220px', marginBottom: '8px' }} />
            : <h2 className="hero-card__status">
                <GradientText colors={m.colors} animationSpeed={5}>{m.label}</GradientText>
              </h2>
          }
          {!loading && <p className="hero-card__sub">{m.sub}</p>}
        </div>
        {!loading && (
          <div className="vd-hero-stats">
            <div className="vd-hero-stat">
              <span className="vd-hero-stat__value">{advisories.length}</span>
              <span className="vd-hero-stat__label">Advisories</span>
            </div>
            <div className="vd-hero-stat">
              <span className="vd-hero-stat__value">{riskZones}</span>
              <span className="vd-hero-stat__label">Zones at risk</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, rawValue, unit = '', decimals = 0, icon, iconVariant, sub, loading }) {
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

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function VdTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}{unit}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ─── Demand by Species Bar Chart ──────────────────────────────────────────────

function SpeciesDemandChart({ listings }) {
  const speciesMap = {}
  listings.forEach(l => {
    if (l.status !== 'OPEN') return
    const name = l.fishSpecies?.commonName || 'Unknown'
    speciesMap[name] = (speciesMap[name] || 0) + (l.quantityKg || 0)
  })
  const data = Object.entries(speciesMap)
    .map(([name, kg]) => ({ name, kg }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8)

  if (!data.length) return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Demand by Species</p>
          <p className="chart-card__sub">Open listings only</p>
        </div>
      </div>
      <div className="adv-panel__empty" style={{ borderStyle: 'none', paddingTop: 16, paddingBottom: 20 }}>
        <div className="adv-panel__empty-icon"><FishIcon /></div>
        <p className="adv-panel__empty-title">No Open Listings</p>
        <p className="adv-panel__empty-sub">Post a listing to see demand data</p>
      </div>
    </div>
  )

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Demand by Species</p>
          <p className="chart-card__sub">Total kg demanded across open listings</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false} unit=" kg"
          />
          <YAxis
            type="category" dataKey="name"
            tick={{ fill: 'rgba(238,244,255,0.45)', fontSize: 11, fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false} width={100}
          />
          <Tooltip content={<VdTooltip unit=" kg" />} />
          <Bar dataKey="kg" name="Demand" radius={[0, 6, 6, 0]}
            fill="var(--accent)" fillOpacity={0.85}
            label={{ position: 'right', fill: 'rgba(238,244,255,0.35)', fontSize: 11, formatter: v => `${v} kg` }}
            isAnimationActive animationDuration={1200}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Listing Status Donut ─────────────────────────────────────────────────────

function ListingStatusDonut({ listings }) {
  const open   = listings.filter(l => l.status === 'OPEN').length
  const closed = listings.filter(l => l.status === 'CLOSED').length
  const total  = listings.length

  if (!total) return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Listing Status</p>
          <p className="chart-card__sub">Open vs Closed</p>
        </div>
      </div>
      <div className="adv-panel__empty" style={{ borderStyle: 'none', paddingTop: 16, paddingBottom: 20 }}>
        <div className="adv-panel__empty-icon"><ListIcon /></div>
        <p className="adv-panel__empty-title">No Listings</p>
        <p className="adv-panel__empty-sub">Post your first demand listing</p>
      </div>
    </div>
  )

  const data = [
    { name: 'Open',   value: open,   color: 'var(--safe)' },
    { name: 'Closed', value: closed, color: 'rgba(238,244,255,0.15)' },
  ].filter(d => d.value > 0)

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Listing Status</p>
          <p className="chart-card__sub">Open vs Closed</p>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%"
              innerRadius={52} outerRadius={76}
              paddingAngle={3} dataKey="value"
              isAnimationActive animationDuration={1000}
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
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.8rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-1)' }}>{total}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</p>
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

// ─── Deadline Timeline ────────────────────────────────────────────────────────

function DeadlineTimeline({ listings }) {
  const openListings = listings.filter(l => l.status === 'OPEN' && l.neededBy)

  // Build a 14-day timeline from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    const dateStr = d.toISOString().slice(0, 10)
    return { label, dateStr, count: 0, kg: 0 }
  })

  openListings.forEach(l => {
    const dStr = new Date(l.neededBy).toISOString().slice(0, 10)
    const day = days.find(d => d.dateStr === dStr)
    if (day) {
      day.count++
      day.kg += l.quantityKg || 0
    }
  })

  if (!openListings.length) return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Upcoming Demand Deadlines</p>
          <p className="chart-card__sub">Listings due in the next 14 days</p>
        </div>
      </div>
      <div className="adv-panel__empty" style={{ borderStyle: 'none', paddingTop: 16, paddingBottom: 20 }}>
        <div className="adv-panel__empty-icon"><ClockIcon /></div>
        <p className="adv-panel__empty-title">No Upcoming Deadlines</p>
        <p className="adv-panel__empty-sub">Open listings with deadlines will appear here</p>
      </div>
    </div>
  )

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Upcoming Demand Deadlines</p>
          <p className="chart-card__sub">Listings due in the next 14 days</p>
        </div>
      </div>
      <div className="chart-legend">
        <div className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: 'var(--accent)' }} />
          Listings due
        </div>
        <div className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: 'var(--amber)' }} />
          kg demanded
        </div>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="kgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--amber)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--amber)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label"
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<VdTooltip />} />
          <Area type="monotone" dataKey="count" name="Listings"
            stroke="var(--accent)" strokeWidth={2} fill="url(#countGrad)"
            dot={false} activeDot={{ r: 4, fill: 'var(--accent)', stroke: '#06090F', strokeWidth: 2 }}
            isAnimationActive animationDuration={1200}
          />
          <Area type="monotone" dataKey="kg" name="kg"
            stroke="var(--amber)" strokeWidth={2} fill="url(#kgGrad)"
            dot={false} activeDot={{ r: 4, fill: 'var(--amber)', stroke: '#06090F', strokeWidth: 2 }}
            isAnimationActive animationDuration={1400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Zone Risk Chips ──────────────────────────────────────────────────────────

function ZoneRiskChips({ zones, loading }) {
  return (
    <div className="adv-panel">
      <div className="adv-panel__head">
        <p className="adv-panel__title">Fishing Zone Status</p>
        {!loading && zones.length > 0 && (
          <span className="adv-panel__count">{zones.length}</span>
        )}
      </div>
      <div style={{ padding: '10px 14px 14px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 36 }} />
            <div className="skeleton" style={{ height: 36 }} />
          </div>
        ) : zones.length === 0 ? (
          <div className="adv-panel__empty" style={{ borderStyle: 'none', padding: '8px 0 4px' }}>
            <p className="adv-panel__empty-sub">Zone data unavailable</p>
          </div>
        ) : (
          <div className="vd-zone-chips">
            {zones.map((z, i) => {
              const rc = riskClass(z.risk?.level || 'SAFE')
              return (
                <div key={i} className={`vd-zone-chip vd-zone-chip--${rc}`}>
                  <span className={`risk-badge risk-badge--${rc}`} style={{ fontSize: '10px', padding: '2px 7px' }}>
                    {z.risk?.level === 'SAFE' ? '✓' : z.risk?.level === 'CAUTION' ? '!' : '✕'}
                    {' '}{z.risk?.level || 'SAFE'}
                  </span>
                  <span className="vd-zone-chip__name">{z.zoneName}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Advisories Panel ─────────────────────────────────────────────────────────

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

// ─── Fisherman Interests Panel ────────────────────────────────────────────────

function InterestsPanel({ interests, loading, onMessageFisherman }) {
  return (
    <div className="adv-panel">
      <div className="adv-panel__head">
        <p className="adv-panel__title">Fisherman Interests</p>
        {!loading && interests.length > 0 && (
          <span className="adv-panel__count">{interests.length}</span>
        )}
      </div>
      <div className="adv-panel__list">
        {loading ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton" style={{ height: 68 }} />
            <div className="skeleton" style={{ height: 68 }} />
          </div>
        ) : interests.length > 0 ? (
          interests.slice(0, 8).map(item => (
            <div key={item.id} className="vd-interest-item">
              <div className="vd-interest-item__avatar">
                <UserIcon />
              </div>
              <div className="vd-interest-item__body">
                <div className="vd-interest-item__header">
                  <span className="vd-interest-item__name">{item.fishermanName}</span>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <span className="vd-interest-item__time">{fmtRelative(item.createdAt)}</span>
                    <button 
                      className="vd-btn" 
                      style={{padding: '2px 6px', fontSize: '11px', background: 'var(--bg-3)'}}
                      onClick={() => onMessageFisherman(item)}
                    >
                      Message
                    </button>
                  </div>
                </div>
                <p className="vd-interest-item__species">{item.speciesName}</p>
                {item.message && (
                  <p className="vd-interest-item__msg">
                    <MessageIcon /> {item.message}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="adv-panel__empty">
            <div className="adv-panel__empty-icon"><UserIcon /></div>
            <p className="adv-panel__empty-title">No Interests Yet</p>
            <p className="adv-panel__empty-sub">Fishermen who respond to your listings will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Status Chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  return (
    <span className={`vd-status vd-status--${status?.toLowerCase()}`}>
      {status === 'OPEN' ? '● Open' : '○ Closed'}
    </span>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function VendorSidebar({ user, activeNav, onNav, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const navItems = [
    { id: 'dashboard', icon: <DashIcon />,  label: 'Dashboard' },
    { id: 'listings',  icon: <ListIcon />,  label: 'My Listings' },
    { id: 'market',    icon: <ShopIcon />,  label: 'Marketplace' },
    { id: 'messages',  icon: <MessageIcon />, label: 'Messages' },
  ]
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'VE'

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
            <span className="sidebar__user-role">Vendor</span>
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

// ─── Listing Form Modal ───────────────────────────────────────────────────────

function ListingFormModal({ listing, species, locations, token, onSuccess, onClose }) {
  const isEdit = !!listing

  const [speciesId,       setSpeciesId]       = useState(listing?.fishSpecies?.id   ?? '')
  const [locationId,      setLocationId]      = useState(listing?.marketLocation?.id ?? '')
  const [quantityKg,      setQuantityKg]      = useState(listing?.quantityKg         ?? '')
  const [offerPricePerKg, setOfferPricePerKg] = useState(listing?.offerPricePerKg    ?? '')
  const [notes,           setNotes]           = useState(listing?.notes               ?? '')
  const [neededBy,        setNeededBy]        = useState(toLocalDatetimeInput(listing?.neededBy))
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!speciesId)       { setError('Please select a fish species'); return }
    if (!locationId)      { setError('Please select a market location'); return }
    if (!quantityKg || Number(quantityKg) <= 0) { setError('Quantity must be greater than 0'); return }
    if (!offerPricePerKg || Number(offerPricePerKg) < 0) { setError('Price must be 0 or greater'); return }

    setSubmitting(true)
    const body = {
      speciesId:       Number(speciesId),
      locationId:      Number(locationId),
      quantityKg:      Number(quantityKg),
      offerPricePerKg: Number(offerPricePerKg),
      notes:    notes.trim()   || null,
      neededBy: neededBy       ? new Date(neededBy).toISOString() : null,
    }

    try {
      let result
      if (isEdit) {
        result = await apiPut(`/vendor/demand-listings/${listing.id}`, token, body)
      } else {
        result = await apiPost('/vendor/demand-listings', token, body)
      }
      onSuccess(result, isEdit)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="vd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vd-modal">
        <div className="vd-modal__header">
          <h2 className="vd-modal__title">{isEdit ? 'Edit Listing' : 'New Demand Listing'}</h2>
          <button className="vd-modal__close" onClick={onClose}>✕</button>
        </div>

        <form className="vd-form" onSubmit={submit}>
          {error && <p className="vd-form__error">{error}</p>}

          <div className="vd-form__row">
            <div className="vd-form__group">
              <label className="vd-form__label">Fish Species *</label>
              <select className="vd-form__select" value={speciesId} onChange={e => setSpeciesId(e.target.value)} required>
                <option value="">Select species…</option>
                {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
              </select>
            </div>
            <div className="vd-form__group">
              <label className="vd-form__label">Market Location *</label>
              <select className="vd-form__select" value={locationId} onChange={e => setLocationId(e.target.value)} required>
                <option value="">Select location…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="vd-form__row">
            <div className="vd-form__group">
              <label className="vd-form__label">Quantity (kg) *</label>
              <input className="vd-form__input" type="number" min="0.1" step="0.1"
                placeholder="e.g. 200" value={quantityKg}
                onChange={e => setQuantityKg(e.target.value)} required
              />
            </div>
            <div className="vd-form__group">
              <label className="vd-form__label">Offer Price (₱/kg) *</label>
              <input className="vd-form__input" type="number" min="0" step="0.01"
                placeholder="e.g. 85" value={offerPricePerKg}
                onChange={e => setOfferPricePerKg(e.target.value)} required
              />
            </div>
          </div>

          <div className="vd-form__group">
            <label className="vd-form__label">Needed By (optional)</label>
            <input className="vd-form__input" type="datetime-local"
              value={neededBy} onChange={e => setNeededBy(e.target.value)}
            />
          </div>

          <div className="vd-form__group">
            <label className="vd-form__label">Notes (optional)</label>
            <textarea className="vd-form__textarea"
              placeholder="Any additional requirements for fishermen…"
              maxLength={500} value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="vd-form__actions">
            <button type="button" className="vd-form__cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="vd-form__submit" disabled={submitting}>
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Post Listing')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ listing, onConfirm, onClose, deleting }) {
  return (
    <div className="vd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vd-modal vd-confirm">
        <div className="vd-modal__header">
          <h2 className="vd-modal__title">Delete Listing</h2>
          <button className="vd-modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="vd-confirm__body">
          Are you sure you want to permanently delete the listing for{' '}
          <strong>{listing.fishSpecies?.commonName}</strong> at{' '}
          <strong>{listing.marketLocation?.name}</strong>? This cannot be undone.
        </p>
        <div className="vd-confirm__actions">
          <button className="vd-form__cancel" onClick={onClose}>Cancel</button>
          <button className="vd-confirm__delete" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ listings, advisories, zones, interests, loading, onNewListing, onMessageFisherman }) {
  const openListings   = listings.filter(l => l.status === 'OPEN')
  const closedListings = listings.filter(l => l.status === 'CLOSED')
  const totalKg        = openListings.reduce((s, l) => s + (l.quantityKg || 0), 0)
  const now            = new Date()
  const urgentCount    = openListings.filter(l => l.neededBy && (new Date(l.neededBy) - now) < 86400000).length

  return (
    <div className="db-body">
      {/* ── Left column ── */}
      <div className="db-left">
        {/* Hero */}
        <SupplyOutlookCard advisories={advisories} zones={zones} loading={loading} />

        {/* KPI Row */}
        <div className="kpi-row">
          <KPICard
            label="Total Listings"
            rawValue={listings.length}
            icon={<ListIcon />}
            sub="All time"
            loading={loading}
          />
          <KPICard
            label="Open Listings"
            rawValue={openListings.length}
            icon={<FishIcon />}
            iconVariant={openListings.length > 0 ? 'safe' : ''}
            sub="Accepting offers"
            loading={loading}
          />
          <KPICard
            label="Total KG Demanded"
            rawValue={totalKg}
            unit=" kg"
            icon={<ScaleIcon />}
            sub="Across open listings"
            loading={loading}
          />
          <KPICard
            label="Expiring Soon"
            rawValue={urgentCount}
            icon={<ClockIcon />}
            iconVariant={urgentCount > 0 ? '' : 'safe'}
            sub="Due within 24 hours"
            loading={loading}
          />
        </div>

        {/* Charts row */}
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 240, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 240, borderRadius: 18 }} />
          </>
        ) : (
          <>
            <SpeciesDemandChart listings={listings} />
            <DeadlineTimeline listings={listings} />
          </>
        )}
      </div>

      {/* ── Right column ── */}
      <div className="db-right">
        <ZoneRiskChips zones={zones} loading={loading} />
        <AdvisoriesPanel advisories={advisories} loading={loading} />
        {loading
          ? <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
          : <ListingStatusDonut listings={listings} />
        }
        <InterestsPanel interests={interests} loading={loading} onMessageFisherman={onMessageFisherman} />
      </div>
    </div>
  )
}

// ─── Listings View ────────────────────────────────────────────────────────────

function ListingsView({
  listings, loading, error,
  species, locations, token,
  onReload, onAdd, onEdit, onClose, onDelete,
}) {
  const [filter, setFilter] = useState('ALL')
  const filtered = filter === 'ALL' ? listings : listings.filter(l => l.status === filter)

  if (error) return (
    <div className="db-error">
      <AlertIcon /><span>{error}</span>
      <button className="db-error__retry" onClick={onReload}>Retry</button>
    </div>
  )

  return (
    <>
      <div className="vd-page-header">
        <div>
          <h2 className="vd-page-header__title">My Listings</h2>
          <p className="vd-page-header__sub">Manage your demand listings for La Union fishermen</p>
        </div>
        <button className="vd-create-btn" onClick={onAdd}>
          <PlusIcon /> New Listing
        </button>
      </div>

      <div className="vd-filter-row">
        {['ALL', 'OPEN', 'CLOSED'].map(f => (
          <button
            key={f}
            className={`vd-filter-chip vd-filter-chip--${f.toLowerCase()}${filter === f ? ' vd-filter-chip--on' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : f === 'OPEN' ? '● Open' : '○ Closed'}
          </button>
        ))}
        <span className="vd-filter-count">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 52 }} />
          <div className="skeleton" style={{ height: 52 }} />
          <div className="skeleton" style={{ height: 52 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="vd-empty">
          <span className="vd-empty__icon">{filter === 'ALL' ? '📋' : filter === 'OPEN' ? '📂' : '📁'}</span>
          <p>{filter === 'ALL' ? 'No listings yet. Post your first demand!' : `No ${filter.toLowerCase()} listings.`}</p>
          {filter === 'ALL' && (
            <button className="vd-create-btn" style={{ margin: '14px auto 0', display: 'inline-flex' }} onClick={onAdd}>
              <PlusIcon /> Post First Listing
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="vd-col-heads">
            <span>Species</span><span>Location</span><span>Price/kg</span>
            <span>Quantity</span><span>Needed By</span><span>Status</span><span />
          </div>
          <div className="vd-listings-list">
            {filtered.map(l => {
              const dl = fmtDeadline(l.neededBy)
              return (
                <div key={l.id} className={`vd-listing-row${l.status === 'CLOSED' ? ' vd-listing-row--closed' : ''}`}>
                  <div>
                    <p className="vd-listing-row__species">{l.fishSpecies?.commonName}</p>
                    {l.notes && <p className="vd-listing-row__notes">{l.notes}</p>}
                  </div>
                  <p className="vd-listing-row__location">📍 {l.marketLocation?.name}</p>
                  <p className="vd-listing-row__price">₱{l.offerPricePerKg}</p>
                  <p className="vd-listing-row__qty">{fmtKg(l.quantityKg)}</p>
                  <p className={`vd-listing-row__deadline${dl?.urgent ? ' vd-listing-row__deadline--urgent' : ''}`}>
                    {dl ? dl.label : '—'}
                  </p>
                  <StatusChip status={l.status} />
                  <div className="vd-actions">
                    {l.status === 'OPEN' && (
                      <>
                        <button className="vd-btn vd-btn--edit" title="Edit" onClick={() => onEdit(l)}>
                          <EditIcon />
                        </button>
                        <button className="vd-btn vd-btn--close" title="Close listing" onClick={() => onClose(l.id)}>
                          <CloseListingIcon />
                        </button>
                      </>
                    )}
                    <button className="vd-btn vd-btn--delete" title="Delete" onClick={() => onDelete(l)}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

// ─── Main VendorDashboard ─────────────────────────────────────────────────────

export default function VendorDashboard({ user, token, onLogout }) {
  const [listings,    setListings]    = useState([])
  const [advisories,  setAdvisories]  = useState([])
  const [zones,       setZones]       = useState([])
  const [interests,   setInterests]   = useState([])
  const [species,     setSpecies]     = useState([])
  const [locations,   setLocations]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeNav,   setActiveNav]   = useState('dashboard')
  const [jumpContact, setJumpContact] = useState(null)

  const [createModal,   setCreateModal]   = useState(false)
  const [editListing,   setEditListing]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [actionError,   setActionError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [l, adv, sp, loc, cond, intr] = await Promise.all([
        apiGet('/vendor/demand-listings', token),
        apiGet('/advisories?activeOnly=true', token),
        apiGet('/lookups/fish-species', token),
        apiGet('/lookups/market-locations', token),
        apiGet('/marine/conditions', token).catch(() => null),
        apiGet('/vendor/demand-listings/interests', token).catch(() => []),
      ])
      setListings(l)
      setAdvisories(adv)
      setSpecies(sp)
      setLocations(loc)
      setZones(cond?.zones ?? [])
      setInterests(intr ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  function handleFormSuccess(result, isEdit) {
    if (isEdit) {
      setListings(prev => prev.map(l => l.id === result.id ? result : l))
      setEditListing(null)
    } else {
      setListings(prev => [result, ...prev])
      setCreateModal(false)
    }
  }

  async function handleClose(id) {
    setActionError(null)
    try {
      const updated = await apiPost(`/vendor/demand-listings/${id}/close`, token, {})
      setListings(prev => prev.map(l => l.id === id ? updated : l))
    } catch (err) {
      setActionError(err.message || 'Failed to close listing')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    setActionError(null)
    try {
      await apiDelete(`/vendor/demand-listings/${confirmDelete.id}`, token)
      setListings(prev => prev.filter(l => l.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      setActionError(err.message || 'Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  function handleMessageFisherman(interest) {
    setJumpContact({
      id: interest.fishermanId,
      fullName: interest.fishermanName,
      role: 'Fisherman'
    })
    setActiveNav('messages')
  }

  return (
    <div className="db-shell vd-shell">
      <VendorSidebar user={user} activeNav={activeNav} onNav={setActiveNav} onLogout={onLogout} />

      <main className="db-main">
        {activeNav === 'market' ? <Marketplace token={token} /> : 
         activeNav === 'messages' ? <Messages token={token} userProfile={user} initialContact={jumpContact} /> : 
         (
          <div className="db-content">
            {/* ── Header ── */}
            <header className="db-header">
              <div>
                <h1 className="db-greeting">
                  {greeting()}, <span className="db-greeting__name">{user?.fullName?.split(' ')[0] || 'Vendor'}</span>
                </h1>
                <p className="db-date">{today}</p>
              </div>
              <div className="db-header-right">
                {lastUpdated && (
                  <span className="db-last-updated">Updated {fmtTime(lastUpdated.toISOString())}</span>
                )}
                <button
                  className={`db-refresh${loading ? ' db-refresh--spinning' : ''}`}
                  onClick={load} disabled={loading}
                >
                  <RefreshIcon /> Refresh
                </button>
                <button className="db-trip-btn" onClick={() => setCreateModal(true)}>
                  <PlusIcon /> New Listing
                </button>
              </div>
            </header>

            {/* ── Global errors ── */}
            {(error || actionError) && (
              <div className="db-error" style={{ margin: '0 36px' }}>
                <AlertIcon />
                <span>{error || actionError}</span>
                <button className="db-error__retry" onClick={error ? load : () => setActionError(null)}>
                  {error ? 'Retry' : 'Dismiss'}
                </button>
              </div>
            )}

            {/* ── Content ── */}
            {activeNav === 'listings' ? (
              <div style={{ padding: '0 36px 52px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                <ListingsView
                  listings={listings}
                  loading={loading}
                  error={null}
                  species={species}
                  locations={locations}
                  token={token}
                  onReload={load}
                  onAdd={() => setCreateModal(true)}
                  onEdit={l => setEditListing(l)}
                  onClose={handleClose}
                  onDelete={l => setConfirmDelete(l)}
                />
              </div>
            ) : (
              <DashboardView
                listings={listings}
                advisories={advisories}
                zones={zones}
                interests={interests}
                loading={loading}
                onNewListing={() => setCreateModal(true)}
                onMessageFisherman={handleMessageFisherman}
              />
            )}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {createModal && (
        <ListingFormModal
          species={species} locations={locations} token={token}
          onSuccess={handleFormSuccess} onClose={() => setCreateModal(false)}
        />
      )}
      {editListing && (
        <ListingFormModal
          listing={editListing} species={species} locations={locations} token={token}
          onSuccess={handleFormSuccess} onClose={() => setEditListing(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          listing={confirmDelete} onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)} deleting={deleting}
        />
      )}
    </div>
  )
}
