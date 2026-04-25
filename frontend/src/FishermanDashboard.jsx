import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import { apiGet } from './api'
import { I } from './icons'
import MyTrips from './MyTrips'
import TripPlanner from './TripPlanner'
import Marketplace from './Marketplace'
import Messages from './Messages'
import CatchAlerts from './CatchAlerts'
import Orders from './Orders'

// ── Helpers ───────────────────────────────────────────────────────────────────

function windDir(deg) {
  if (deg == null) return ''
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8]
}

function fmt(val, unit = '', dec = 1) {
  if (val == null || isNaN(val)) return '—'
  return `${Number(val).toFixed(dec)}${unit}`
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(startedAt) {
  if (!startedAt) return '—'
  const ms = Date.now() - new Date(startedAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function overallRisk(zones) {
  if (!zones?.length) return null
  if (zones.some(z => z.risk?.level === 'UNSAFE')) return 'UNSAFE'
  if (zones.some(z => z.risk?.level === 'CAUTION')) return 'CAUTION'
  return 'SAFE'
}

function riskLabel(r) {
  if (r === 'SAFE') return 'favorable'
  if (r === 'CAUTION') return 'manageable'
  return 'dangerous'
}

function generateForecast(baseWave = 1.2, baseWind = 18) {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now.getTime() + i * 3_600_000)
    const hour = h.getHours()
    const wave = Math.max(0.1, baseWave + Math.sin((hour / 12) * Math.PI) * 0.4 + (Math.random() - 0.5) * 0.1)
    const wind = Math.max(2, baseWind + Math.sin(((hour - 14) / 12) * Math.PI) * 7 + (Math.random() - 0.5) * 2)
    return {
      label: i === 0 ? 'Now' : (i % 6 === 0 ? `+${i}h` : ''),
      hour: h.getHours(),
      wave: +wave.toFixed(2),
      wind: +wind.toFixed(1),
    }
  })
}

function bestWindow(forecastData) {
  if (!forecastData?.length) return null
  let bestScore = Infinity, bestStart = 0
  const windowSize = 3
  for (let i = 0; i <= forecastData.length - windowSize; i++) {
    const slice = forecastData.slice(i, i + windowSize)
    const score = slice.reduce((s, p) => s + p.wave * 2 + p.wind * 0.04, 0) / windowSize
    if (score < bestScore) { bestScore = score; bestStart = i }
  }
  const start = forecastData[bestStart]
  const end   = forecastData[Math.min(bestStart + 2, forecastData.length - 1)]
  const fmtH  = h => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
  return {
    label:    `${fmtH(start.hour)} – ${fmtH(end.hour)}`,
    wave:     forecastData.slice(bestStart, bestStart + 3).reduce((s, p) => s + p.wave, 0) / 3,
    wind:     forecastData.slice(bestStart, bestStart + 3).reduce((s, p) => s + p.wind, 0) / 3,
    hoursAway: bestStart,
  }
}

// ── Rail Sidebar ───────────────────────────────────────────────────────────────

function Rail({ page, setPage, user, onLogout, badges = {} }) {
  const items = [
    { id: 'dashboard',    icon: 'Dashboard',  label: 'Dashboard' },
    { id: 'planner',      icon: 'Calendar',   label: 'Trip Planner' },
    { id: 'trips',        icon: 'Anchor',     label: 'My Trips' },
    { id: 'catch-alerts', icon: 'Bell',       label: 'Catch Alerts',  badge: badges.alerts },
    { id: 'orders',       icon: 'Clipboard',  label: 'Orders',        badge: badges.orders },
    { id: 'market',       icon: 'Store',      label: 'Marketplace' },
    { id: 'messages',     icon: 'Message',    label: 'Messages',      badge: badges.messages },
  ]

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'FI'
  const firstName = user?.fullName?.split(' ')[0] || 'Fisherman'
  const vessel = user?.vesselName || user?.vessel || null

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>

      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {items.map(it => {
          const Icon = I[it.icon]
          return (
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => setPage(it.id)}
              data-tip={it.label}
            >
              <div className="rail-item__icon" style={{ position: 'relative' }}>
                <Icon size={18} />
                {it.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 99,
                    background: 'var(--unsafe)', color: '#fff',
                    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1,
                  }}>
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </div>
              <div className="rail-item__text">{it.label}</div>
            </div>
          )
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onLogout} data-tip="Sign out">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Sign Out</div>
        </div>
        <div className="rail-item" data-tip="Help">
          <div className="rail-item__icon"><I.Help size={18} /></div>
          <div className="rail-item__text">Help</div>
        </div>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{firstName}</span>
            <span className="rail__user-role">
              {vessel ? `FISHERMAN · ${vessel}` : 'Fisherman'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────────

function Topbar({ page }) {
  const labels = {
    dashboard:    'Dashboard',
    planner:      'Trip Planner',
    trips:        'My Trips',
    'catch-alerts': 'Catch Alerts',
    orders:       'Orders',
    market:       'Marketplace',
    messages:     'Messages',
  }
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <strong>{labels[page] || page}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search trips, zones, vendors…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} />
      </button>
      <button className="topbar__icon-btn" title="Help">
        <I.Help size={16} />
      </button>
    </div>
  )
}

// ── SparkLine ──────────────────────────────────────────────────────────────────

function SparkLine({ data, color = 'var(--accent)', height = 28 }) {
  const w = 90, h = height
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const path = `M ${pts.join(' L ')}`
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={areaPath} fill={color} opacity="0.1" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Forecast Chart ─────────────────────────────────────────────────────────────

function ForecastChart({ data }) {
  if (!data?.length) return null
  const w = 600, h = 160, p = { l: 32, r: 12, t: 12, b: 22 }
  const iw = w - p.l - p.r, ih = h - p.t - p.b
  const waves = data.map(d => d.wave), winds = data.map(d => d.wind)
  const wMax = Math.max(...waves) * 1.25 || 1
  const sMax = Math.max(...winds) * 1.25 || 1

  const waveLine = data.map((d, i) => {
    const x = p.l + (i / (data.length - 1)) * iw
    const y = p.t + ih - (d.wave / wMax) * ih
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const windLine = data.map((d, i) => {
    const x = p.l + (i / (data.length - 1)) * iw
    const y = p.t + ih - (d.wind / sMax) * ih
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const yTicks = 4
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }}>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = p.t + (ih / yTicks) * i
        return <line key={i} className="grid-line" x1={p.l} x2={w - p.r} y1={y} y2={y} />
      })}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = (wMax - wMax * (i / yTicks)).toFixed(1)
        const y = p.t + (ih / yTicks) * i
        return <text key={i} className="axis" x={p.l - 8} y={y + 3} textAnchor="end">{val}m</text>
      })}
      {[0, 6, 12, 18, data.length - 1].map(i => {
        const x = p.l + (i / (data.length - 1)) * iw
        const lbl = data[i]?.label || (i === 0 ? 'Now' : `+${i}h`)
        return <text key={i} className="axis" x={x} y={h - 6} textAnchor="middle">{lbl}</text>
      })}
      <path d={`M ${waveLine.join(' L ')} L ${p.l + iw},${p.t + ih} L ${p.l},${p.t + ih} Z`} className="wave-path" />
      <path d={`M ${waveLine.join(' L ')}`} className="wave-path" fill="none" />
      <path d={`M ${windLine.join(' L ')}`} className="wind-path" fill="none" />
    </svg>
  )
}

// ── Zone List ──────────────────────────────────────────────────────────────────

function ZoneList({ zones, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 44, background: 'var(--paper-2)', borderRadius: 8 }} />
        ))}
      </div>
    )
  }

  if (!zones.length) {
    return (
      <div className="empty-ds">
        <I.Waves size={24} />
        <div className="empty-ds__title">No zone data</div>
      </div>
    )
  }

  return (
    <div className="zone-list">
      {zones.map(z => {
        const r = z.risk?.level ?? 'SAFE'
        return (
          <div key={z.id ?? z.zoneName} className="zone-row">
            <div>
              <div className="zone-row__name">{z.zoneName}</div>
              <div className="zone-row__region">{z.region}</div>
            </div>
            <div className="zone-row__metric">
              {fmt(z.marine?.waveHeightM, '', 1)}<small>m</small>
            </div>
            <div className="zone-row__metric">
              {z.weather?.windSpeedKmh != null ? Math.round(z.weather.windSpeedKmh) : '—'}<small>km/h</small>
            </div>
            <div className="zone-row__metric">
              {z.weather?.temperatureC != null ? `${Math.round(z.weather.temperatureC)}°` : '—'}<small>air</small>
            </div>
            <span className={`chip chip--${r === 'SAFE' ? 'safe' : r === 'CAUTION' ? 'caution' : 'unsafe'} chip--dot`}>
              {r}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Active Trip Card ───────────────────────────────────────────────────────────

function ActiveTripCard({ trip, onViewTrip }) {
  const [duration, setDuration] = useState(() => fmtDuration(trip?.startedAt))

  useEffect(() => {
    if (!trip) return
    const id = setInterval(() => setDuration(fmtDuration(trip.startedAt)), 10_000)
    return () => clearInterval(id)
  }, [trip])

  if (!trip) {
    return (
      <div className="card card--paper">
        <div className="card__head" style={{ marginBottom: 0 }}>
          <div>
            <div className="card__title">Active trip</div>
            <div className="card__sub">No trip in progress</div>
          </div>
          <I.Anchor size={18} style={{ color: 'var(--ink-5)' }} />
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn--accent" onClick={onViewTrip} style={{ width: '100%', justifyContent: 'center' }}>
            <I.Plus size={14} /> Start a trip
          </button>
        </div>
      </div>
    )
  }

  const checklistItems = trip.checklist ? Object.values(trip.checklist).filter(v => typeof v === 'boolean') : []
  const checkedCount   = checklistItems.filter(Boolean).length
  const totalItems     = checklistItems.length
  const pct            = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--safe)', background: 'var(--safe-soft)' }}>
      <div className="card__head" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="chip chip--safe chip--dot" style={{ fontSize: 10 }}>ACTIVE</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginTop: 4 }}>
            {trip.tripName || `Trip #${trip.id}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            {duration}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 1 }}>elapsed</div>
        </div>
      </div>

      {trip.vesselName && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <I.Anchor size={12} /> {trip.vesselName}
        </div>
      )}

      {totalItems > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-4)', marginBottom: 5 }}>
            <span>Safety checklist</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{checkedCount}/{totalItems}</span>
          </div>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--safe)', borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      <button className="btn" onClick={onViewTrip} style={{ width: '100%', justifyContent: 'center' }}>
        View trip details →
      </button>
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

function DashboardPage({ conditions, advisories, forecast, activeTrip, loading, error, onLoad, user, setPage }) {
  const overall  = conditions ? overallRisk(conditions.zones) : null
  const zones    = conditions?.zones ?? []

  const zonesWithWave = zones.filter(z => z.marine?.waveHeightM != null)
  const avgWave = zonesWithWave.length
    ? zonesWithWave.reduce((s, z) => s + z.marine.waveHeightM, 0) / zonesWithWave.length
    : null
  const maxWind = zones.length
    ? Math.max(...zones.map(z => z.weather?.windSpeedKmh ?? 0))
    : null
  const representativeZone = zones.find(z => z.risk?.level === 'SAFE') ?? zones[0]
  const safeCount    = zones.filter(z => z.risk?.level === 'SAFE').length
  const cautionCount = zones.filter(z => z.risk?.level === 'CAUTION').length
  const unsafeCount  = zones.filter(z => z.risk?.level === 'UNSAFE').length

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.fullName?.split(' ')[0] || 'Captain'

  return (
    <div className="page">
      {/* Header */}
      <div className="page__head">
        <div>
          <div className="eyebrow">{greet}, {firstName}</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Today on the <em>water</em>.
          </h1>
          <p className="page__sub">
            {zones.length} zones monitored · Updated {fmtTime(new Date().toISOString())}
          </p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={onLoad} disabled={loading}>
            <I.Refresh size={14} /> Refresh
          </button>
          <button className="btn btn--primary" onClick={() => setPage('trips')}>
            <I.Plus size={14} /> Start trip
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', background: 'var(--unsafe-soft)', border: '1px solid var(--unsafe)',
          borderRadius: 'var(--r-md)', marginBottom: 18, fontSize: 13, color: 'var(--unsafe)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <I.Alert size={14} /> {error}
          <button className="btn btn--sm" onClick={onLoad} style={{ marginLeft: 'auto' }}>Retry</button>
        </div>
      )}

      {/* Hero sea status */}
      <div className="hero" style={{ marginBottom: 18 }}>
        <div>
          <div className="hero__eyebrow">
            Sea Status · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {loading ? (
            <div style={{ height: 44, marginTop: 8, background: 'var(--line-soft)', borderRadius: 8 }} />
          ) : (
            <h2 className="hero__headline">
              Conditions are <em>{overall ? riskLabel(overall) : '—'}</em>
              {overall === 'CAUTION' ? ' — some zones need care.' :
               overall === 'UNSAFE' ? ' — stay ashore today.' :
               overall === 'SAFE'   ? ' — good day to fish.' : '.'}
            </h2>
          )}
          {!loading && (
            <p className="hero__sub">
              {representativeZone ? representativeZone.risk?.advisory : 'Checking conditions…'}
            </p>
          )}
          <div className="hero__row">
            {!loading && safeCount > 0 && (
              <span className="chip chip--safe chip--dot">{safeCount} zone{safeCount > 1 ? 's' : ''} safe</span>
            )}
            {!loading && cautionCount > 0 && (
              <span className="chip chip--caution chip--dot">{cautionCount} zone{cautionCount > 1 ? 's' : ''} caution</span>
            )}
            {!loading && unsafeCount > 0 && (
              <span className="chip chip--unsafe chip--dot">{unsafeCount} zone{unsafeCount > 1 ? 's' : ''} unsafe</span>
            )}
            {advisories.length > 0 && (
              <span className="chip chip--dot">{advisories.length} active advisor{advisories.length > 1 ? 'ies' : 'y'}</span>
            )}
          </div>
        </div>
        <div className="hero__weather">
          <div className="hero__weather-item">
            <div className="eyebrow">Wave</div>
            <div className="data">{loading ? '—' : fmt(avgWave, '', 1)}<small>m avg</small></div>
          </div>
          <div className="hero__weather-item">
            <div className="eyebrow">Wind</div>
            <div className="data">{loading ? '—' : fmt(maxWind, '', 0)}<small>km/h max</small></div>
          </div>
          <div className="hero__weather-item">
            <div className="eyebrow">Air</div>
            <div className="data">{loading ? '—' : fmt(representativeZone?.weather?.temperatureC, '', 0)}<small>°C</small></div>
          </div>
          <div className="hero__weather-item">
            <div className="eyebrow">Advisories</div>
            <div className="data">{loading ? '—' : advisories.length}<small> open</small></div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid--kpi" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="kpi__label">Catch this week</div>
          <div className="kpi__value">312<sup>kg</sup></div>
          <div className="kpi__foot">
            <span className="delta-up">↑ 18%</span>
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>vs last week</span>
          </div>
          <div className="kpi__spark"><SparkLine data={[24, 32, 28, 41, 38, 52, 58, 62]} /></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Revenue</div>
          <div className="kpi__value">₱54,280</div>
          <div className="kpi__foot">
            <span className="delta-up">↑ 12%</span>
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>vs last week</span>
          </div>
          <div className="kpi__spark"><SparkLine data={[3200, 4100, 3800, 5200, 4400, 6100, 6800, 7200]} /></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Avg price / kg</div>
          <div className="kpi__value">₱294</div>
          <div className="kpi__foot">
            <span className="delta-up">↑ ₱8</span>
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>vs last week</span>
          </div>
          <div className="kpi__spark"><SparkLine data={[270, 280, 285, 290, 282, 295, 298, 294]} /></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Trips completed</div>
          <div className="kpi__value">4</div>
          <div className="kpi__foot">
            <span className="delta-up">↑ 1</span>
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>vs last week</span>
          </div>
          <div className="kpi__spark"><SparkLine data={[1, 2, 3, 2, 3, 4, 3, 4]} /></div>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
        {/* LEFT — forecast + zone carousel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">24-hour sea forecast</div>
                <div className="card__sub">Wave height (m) · Wind speed (km/h, dashed)</div>
              </div>
              <div className="row">
                <span className="chip chip--accent chip--dot">Wave m</span>
                <span className="chip chip--caution chip--dot">Wind km/h</span>
              </div>
            </div>
            <ForecastChart data={forecast} />
          </div>

          <div className="card">
            <div className="card__head" style={{ marginBottom: 14 }}>
              <div>
                <div className="card__title">Zone conditions</div>
                <div className="card__sub">{zones.length} zones monitored · tap for detail</div>
              </div>
              <button className="btn btn--sm btn--ghost">View map <I.Arrow size={12} /></button>
            </div>
            <ZoneList zones={zones} loading={loading} />
          </div>
        </div>

        {/* RIGHT — active trip + best window + advisories + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Active advisories */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Active advisories</div>
                <div className="card__sub">{advisories.length} open · PAGASA + BFAR feeds</div>
              </div>
              {advisories.length > 0 && (
                <span className="chip chip--ink">{advisories.length}</span>
              )}
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ height: 64, background: 'var(--paper-2)', borderRadius: 8 }} />
                ))}
              </div>
            ) : advisories.length > 0 ? (
              <div className="adv-list">
                {advisories.slice(0, 3).map((a, i) => {
                  const s = a.severity || 'LOW'
                  const cls = s === 'LOW' ? 'low' : s === 'MEDIUM' ? 'med' : 'high'
                  return (
                    <div key={a.id ?? i} className="adv-item">
                      <div className={`adv-item__icon adv-item__icon--${cls}`}>
                        <I.Alert size={14} />
                      </div>
                      <div>
                        <div className="adv-item__title">{a.title}</div>
                        <div className="adv-item__msg">{a.message || a.msg}</div>
                        <div className="adv-item__meta">{a.affectedArea || a.area}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-ds">
                <I.Shield size={22} />
                <div className="empty-ds__title">All clear</div>
                <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>No active advisories</p>
              </div>
            )}
          </div>

          {/* Active trip */}
          <ActiveTripCard trip={activeTrip} onViewTrip={() => setPage('trips')} />

          {/* Today's best window */}
          <div className="card card--paper">
            <div className="card__head" style={{ marginBottom: 8 }}>
              <div className="card__title">Today's best window</div>
              <I.Star size={14} style={{ color: 'var(--caution)' }} />
            </div>
            {(() => {
              const win = bestWindow(forecast)
              if (!win) return null
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1 }}>{win.label}</div>
                    <div className="chip chip--safe chip--dot">Safe</div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.5 }}>
                    Wave {fmt(win.wave, 'm', 1)}, wind {fmt(win.wind, ' km/h', 0)}.
                    {win.hoursAway === 0 ? ' Conditions are good right now.' : ` Starts in ${win.hoursAway}h.`}
                  </p>
                  <button className="btn btn--accent" style={{ marginTop: 12 }} onClick={() => setPage('planner')}>
                    Plan trip for this window <I.Arrow size={12} />
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export default function FishermanDashboard({ user, token, onLogout }) {
  const [conditions,  setConditions]  = useState(null)
  const [advisories,  setAdvisories]  = useState([])
  const [activeTrip,  setActiveTrip]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [activeNav,   setActiveNav]   = useState('dashboard')
  const [forecast,    setForecast]    = useState(() => generateForecast())
  const [badges,      setBadges]      = useState({ alerts: 0, orders: 0, messages: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cond, adv, tripList, alerts, orders] = await Promise.all([
        apiGet('/marine/conditions', token),
        apiGet('/advisories?activeOnly=true', token),
        apiGet('/trips?status=ACTIVE', token).catch(() => []),
        apiGet('/fisherman/catch-alerts?status=ACTIVE', token).catch(() => []),
        apiGet('/orders/mine?status=PENDING', token).catch(() => []),
      ])
      setConditions(cond)
      setAdvisories(adv)
      setActiveTrip(Array.isArray(tripList) ? tripList[0] ?? null : null)
      setBadges({
        alerts:   Array.isArray(alerts) ? alerts.length : 0,
        orders:   Array.isArray(orders) ? orders.length : 0,
        messages: 0,
      })

      const zones     = cond?.zones ?? []
      const waveBases = zones.map(z => z.marine?.waveHeightM).filter(Boolean)
      const windBases = zones.map(z => z.weather?.windSpeedKmh).filter(Boolean)
      const baseWave  = waveBases.length ? waveBases.reduce((a, b) => a + b, 0) / waveBases.length : 1.2
      const baseWind  = windBases.length ? windBases.reduce((a, b) => a + b, 0) / windBases.length : 18
      setForecast(generateForecast(baseWave, baseWind))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <div className="app" data-density="balanced">
      <Rail page={activeNav} setPage={setActiveNav} user={user} onLogout={onLogout} badges={badges} />
      <div className="main">
        <Topbar page={activeNav} />

        {activeNav === 'planner'      ? <TripPlanner token={token} /> :
         activeNav === 'trips'        ? <MyTrips token={token} /> :
         activeNav === 'catch-alerts' ? <CatchAlerts token={token} role="FISHERMAN" /> :
         activeNav === 'orders'       ? <Orders token={token} role="FISHERMAN" /> :
         activeNav === 'market'       ? <Marketplace token={token} /> :
         activeNav === 'messages'     ? <Messages token={token} userProfile={user} /> :
         (
           <DashboardPage
             conditions={conditions}
             advisories={advisories}
             forecast={forecast}
             activeTrip={activeTrip}
             loading={loading}
             error={error}
             onLoad={load}
             user={user}
             setPage={setActiveNav}
           />
         )
        }
      </div>
    </div>
  )
}
