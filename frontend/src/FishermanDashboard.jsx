import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  listFishermanProcurementOrders,
  fishermanAccept,
  fishermanMarkReady,
  fishermanComplete,
  fishermanCancel,
} from './vendor/api/procurement'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return Array.from({ length: 48 }, (_, i) => {
    const h = new Date(now.getTime() + i * 3_600_000)
    const hour = h.getHours()
    const wave = Math.max(0.1, baseWave + Math.sin((hour / 12) * Math.PI) * 0.4 + (Math.random() - 0.5) * 0.1)
    const wind = Math.max(2, baseWind + Math.sin(((hour - 14) / 12) * Math.PI) * 7 + (Math.random() - 0.5) * 2)
    return {
      hour: h.getHours(),
      wave: +wave.toFixed(2),
      wind: +wind.toFixed(1),
    }
  })
}

// ── Smooth cubic-bezier SVG path ──────────────────────────────────────────────

function smoothPath(xys) {
  if (!xys.length) return ''
  let d = `M ${xys[0][0]},${xys[0][1]}`
  for (let i = 0; i < xys.length - 1; i++) {
    const [x1, y1] = xys[i]
    const [x2, y2] = xys[i + 1]
    const cp = (x1 + x2) / 2
    d += ` C ${cp},${y1} ${cp},${y2} ${x2},${y2}`
  }
  return d
}

// ── Rail Sidebar ───────────────────────────────────────────────────────────────

function Rail({ page, setPage, user, onLogout, badges = {} }) {
  const items = [
    { id: 'dashboard',    icon: 'Dashboard',  label: 'Dashboard' },
    { id: 'planner',      icon: 'Calendar',   label: 'Trip Planner' },
    { id: 'trips',        icon: 'Anchor',     label: 'My Trips' },
    { id: 'catch-alerts', icon: 'Bell',       label: 'Catch Alerts',  badge: badges.alerts },
    { id: 'orders',       icon: 'Clipboard',  label: 'Orders',        badge: badges.orders },
    { id: 'procurement',  icon: 'Store',      label: 'Procurement',   badge: badges.procurement },
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
    dashboard:      'Dashboard',
    planner:        'Trip Planner',
    trips:          'My Trips',
    'catch-alerts': 'Catch Alerts',
    orders:         'Orders',
    procurement:    'Procurement Requests',
    market:         'Marketplace',
    messages:       'Messages',
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

// ── Forecast Chart — 48h, smooth curves, hover tooltip ───────────────────────

function ForecastChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  if (!data?.length) return null

  const w = 600, h = 160, pad = { l: 36, r: 12, t: 16, b: 28 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const wMax = Math.max(...data.map(d => d.wave)) * 1.25 || 1
  const sMax = Math.max(...data.map(d => d.wind)) * 1.25 || 1

  const waveXY = data.map((d, i) => [
    pad.l + (i / (data.length - 1)) * iw,
    pad.t + ih - (d.wave / wMax) * ih,
  ])
  const windXY = data.map((d, i) => [
    pad.l + (i / (data.length - 1)) * iw,
    pad.t + ih - (d.wind / sMax) * ih,
  ])

  const waveLine = smoothPath(waveXY)
  const windLine = smoothPath(windXY)
  const waveArea = `${waveLine} L ${pad.l + iw},${pad.t + ih} L ${pad.l},${pad.t + ih} Z`

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * w
    const raw = Math.round(((svgX - pad.l) / iw) * (data.length - 1))
    setHoverIdx(Math.max(0, Math.min(data.length - 1, raw)))
  }

  const yTicks = 4
  const xTickIdxs = [0, 6, 12, 18, 24, 30, 36, 42, 47].filter(i => i < data.length)

  const tooltipLeft = hoverIdx !== null
    ? `calc(${(waveXY[hoverIdx][0] / w) * 100}% - 56px)`
    : 0

  return (
    <div style={{ position: 'relative' }}>
      {hoverIdx !== null && (
        <div style={{
          position: 'absolute',
          left: tooltipLeft,
          top: 0,
          background: 'var(--ink-2)',
          color: 'var(--paper)',
          borderRadius: 'var(--r-sm)',
          padding: '6px 10px',
          fontSize: 11,
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
          lineHeight: 1.7,
          boxShadow: 'var(--shadow-2)',
        }}>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {hoverIdx === 0 ? 'Now' : `+${hoverIdx}h`}
          </div>
          <div>Wave <strong>{fmt(data[hoverIdx].wave, 'm', 1)}</strong></div>
          <div>Wind <strong>{fmt(data[hoverIdx].wind, ' km/h', 0)}</strong></div>
        </div>
      )}
      <svg
        className="chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: h, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = pad.t + (ih / yTicks) * i
          return <line key={i} className="grid-line" x1={pad.l} x2={w - pad.r} y1={y} y2={y} />
        })}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = (wMax - wMax * (i / yTicks)).toFixed(1)
          const y = pad.t + (ih / yTicks) * i
          return <text key={i} className="axis" x={pad.l - 8} y={y + 3} textAnchor="end">{val}m</text>
        })}
        {xTickIdxs.map(i => {
          const x = pad.l + (i / (data.length - 1)) * iw
          const lbl = i === 0 ? 'Now' : i === 47 ? '+48h' : i === 24 ? '+24h' : `+${i}h`
          return <text key={i} className="axis" x={x} y={h - 6} textAnchor="middle">{lbl}</text>
        })}
        <path d={waveArea} className="wave-path" />
        <path d={waveLine} className="wave-path" fill="none" />
        <path d={windLine} className="wind-path" fill="none" />
        {hoverIdx !== null && (
          <>
            <line
              x1={waveXY[hoverIdx][0]} x2={waveXY[hoverIdx][0]}
              y1={pad.t} y2={pad.t + ih}
              stroke="var(--line-2)" strokeWidth="1" strokeDasharray="3,3"
            />
            <circle
              cx={waveXY[hoverIdx][0]} cy={waveXY[hoverIdx][1]}
              r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth="2"
            />
            <circle
              cx={windXY[hoverIdx][0]} cy={windXY[hoverIdx][1]}
              r={4} fill="var(--caution)" stroke="var(--surface)" strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  )
}

// ── Zone Carousel — single card, auto-slide with fade+translate ───────────────

function degToCardinal(deg) {
  if (deg == null) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function ZoneCarousel({ zones, loading }) {
  const [idx, setIdx]           = useState(0)
  const [opacity, setOpacity]   = useState(1)
  const [ty, setTy]             = useState(0)
  const idxRef                  = useRef(0)
  const animRef                 = useRef(false)

  const goTo = useCallback((target, dir) => {
    if (animRef.current) return
    animRef.current = true
    setOpacity(0)
    setTy(dir >= 0 ? 8 : -8)
    setTimeout(() => {
      idxRef.current = target
      setIdx(target)
      setTy(dir >= 0 ? -6 : 6)
      setTimeout(() => {
        setOpacity(1)
        setTy(0)
        animRef.current = false
      }, 30)
    }, 260)
  }, [])

  const goNext = useCallback(() => {
    const next = (idxRef.current + 1) % zones.length
    goTo(next, 1)
  }, [goTo, zones.length])

  const goPrev = useCallback(() => {
    const prev = (idxRef.current - 1 + zones.length) % zones.length
    goTo(prev, -1)
  }, [goTo, zones.length])

  useEffect(() => {
    if (!zones.length) return
    const id = setInterval(goNext, 5000)
    return () => clearInterval(id)
  }, [goNext, zones.length])

  if (loading) {
    return <div style={{ flex: 1, minHeight: 200, background: 'var(--paper-2)', borderRadius: 'var(--r-md)' }} />
  }
  if (!zones.length) {
    return (
      <div className="empty-ds">
        <div className="empty-ds__title">No zone data</div>
      </div>
    )
  }

  const z = zones[idx]
  const r = z.risk?.level ?? 'SAFE'
  const rCls = r === 'SAFE' ? 'safe' : r === 'CAUTION' ? 'caution' : 'unsafe'

  const freshnessMin = z.observedAt
    ? Math.floor((Date.now() - new Date(z.observedAt).getTime()) / 60_000)
    : null
  const freshnessLabel = freshnessMin == null ? null
    : freshnessMin < 1 ? 'Just now'
    : freshnessMin < 60 ? `${freshnessMin}m ago`
    : `${Math.floor(freshnessMin / 60)}h ago`

  const secondary = [
    { label: 'Wind Dir',    value: degToCardinal(z.weather?.windDirectionDeg) },
    { label: 'Gusts',       value: z.weather?.windGustsKmh != null ? Math.round(z.weather.windGustsKmh) : '—', unit: 'km/h' },
    { label: 'Rain',        value: z.weather?.precipitationMm != null ? fmt(z.weather.precipitationMm, '', 1) : '—', unit: 'mm' },
    { label: 'Swell',       value: z.marine?.swellHeightM != null ? fmt(z.marine.swellHeightM, '', 1) : '—', unit: 'm' },
    { label: 'Swell Period',value: z.marine?.swellPeriodS != null ? Math.round(z.marine.swellPeriodS) : '—', unit: 's' },
    { label: 'Cloud Cover', value: z.weather?.cloudCoverPct != null ? Math.round(z.weather.cloudCoverPct) : '—', unit: '%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Nav row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={goPrev}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--ink-4)', lineHeight: 0 }}
        >
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <I.Arrow size={14} />
          </span>
        </button>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {zones.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > idxRef.current ? 1 : -1)}
              style={{
                width: i === idx ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === idx ? 'var(--accent)' : 'var(--line)',
                transition: 'width 0.35s ease, background 0.35s ease',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--ink-4)', lineHeight: 0 }}
        >
          <I.Arrow size={14} />
        </button>
      </div>

      {/* Zone card */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        opacity,
        transform: `translateY(${ty}px)`,
        transition: 'opacity 0.26s ease, transform 0.26s ease',
        background: 'var(--paper-2)',
        borderRadius: 'var(--r-md)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {/* Zone header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{z.zoneName}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 3 }}>{z.region}</div>
            {freshnessLabel && (
              <div style={{ fontSize: 10, color: 'var(--ink-5)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                Updated {freshnessLabel}
              </div>
            )}
          </div>
          <span className={`chip chip--${rCls} chip--dot`}>{r}</span>
        </div>

        {/* Primary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Wave Height', value: fmt(z.marine?.waveHeightM, '', 1), unit: 'm' },
            { label: 'Wind Speed',  value: z.weather?.windSpeedKmh != null ? Math.round(z.weather.windSpeedKmh) : '—', unit: 'km/h' },
            { label: 'Air Temp',    value: z.weather?.temperatureC  != null ? Math.round(z.weather.temperatureC)  : '—', unit: '°C' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--surface)',
              padding: '14px 10px',
              borderRadius: 'var(--r-md)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 700, fontSize: 26, color: 'var(--ink)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{item.unit}</div>
            </div>
          ))}
        </div>

        {/* Secondary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {secondary.map(item => (
            <div key={item.label} style={{
              background: 'var(--surface)',
              padding: '9px 10px',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}>
              <div style={{ fontSize: 9, color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                {item.value}<span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 2 }}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Advisory */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          background: 'var(--surface)',
          borderRadius: 'var(--r-md)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
            Advisory
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            {z.risk?.advisory ?? 'No active advisory for this zone.'}
          </p>
        </div>

        {/* Counter */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--font-mono)', flexShrink: 0, paddingTop: 4 }}>
          {idx + 1} / {zones.length}
        </div>
      </div>
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

  const checklistItems = trip.checklist
    ? Object.values(trip.checklist).filter(v => typeof v === 'boolean')
    : []
  const checkedCount = checklistItems.filter(Boolean).length
  const totalItems   = checklistItems.length
  const pct          = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--safe)', background: 'var(--safe-soft)' }}>
      <div className="card__head" style={{ marginBottom: 12 }}>
        <div>
          <span className="chip chip--safe chip--dot" style={{ fontSize: 10 }}>ACTIVE</span>
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

// ── Orders Summary ─────────────────────────────────────────────────────────────

function OrdersSummary({ orders, setPage }) {
  if (!orders?.length) {
    return (
      <div className="empty-ds">
        <I.Clipboard size={20} />
        <div className="empty-ds__title">No pending orders</div>
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>New orders will appear here</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {orders.slice(0, 3).map((o, i) => (
        <div
          key={o.id ?? i}
          onClick={() => setPage('orders')}
          style={{
            padding: '10px 12px',
            background: 'var(--paper-2)',
            borderRadius: 'var(--r-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600, fontSize: 13, color: 'var(--ink)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {o.speciesName ?? o.species ?? o.title ?? `Order #${o.id}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
              {o.requestedQuantityKg != null ? `${o.requestedQuantityKg} kg` : '—'}
              {o.offeredPricePerKg != null ? ` · ₱${o.offeredPricePerKg}/kg` : ''}
            </div>
          </div>
          <span className="chip chip--caution chip--dot" style={{ fontSize: 10, flexShrink: 0 }}>
            {o.status ?? 'PENDING'}
          </span>
        </div>
      ))}
      {orders.length > 3 && (
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => setPage('orders')}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          +{orders.length - 3} more
        </button>
      )}
    </div>
  )
}

// ── Fisherman Procurement Tab ─────────────────────────────────────────────────

const PROC_BUCKETS = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED']

function FishermanProcurementTab() {
  const [bucket, setBucket] = useState('PENDING')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionErr, setActionErr] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listFishermanProcurementOrders(bucket)
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }, [bucket])

  useEffect(() => { load() }, [load])

  const act = async (fn, orderId) => {
    setActionErr(null)
    try { await fn(orderId); load() }
    catch (e) { setActionErr(e?.response?.data?.message || 'Action failed.') }
  }

  const handleCancel = async (orderId) => {
    setActionErr(null)
    try {
      await fishermanCancel(orderId, cancelReason || undefined)
      setCancelOpen(null)
      setCancelReason('')
      load()
    } catch (e) { setActionErr(e?.response?.data?.message || 'Cancel failed.') }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Procurement Requests</h1>
          <p className="page__sub">Vendor orders from your catch alerts</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {PROC_BUCKETS.map(b => (
          <button
            key={b}
            onClick={() => setBucket(b)}
            className={`btn btn--sm${bucket === b ? ' btn--primary' : ''}`}
          >
            {b.charAt(0) + b.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {actionErr && (
        <div style={{ padding: '8px 12px', background: 'var(--unsafe-soft)', color: 'var(--unsafe)', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {actionErr}
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : orders.length === 0 ? (
        <p className="muted">No {bucket.toLowerCase()} procurement requests.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(order => (
            <div key={order.id} style={{
              border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px', background: 'var(--paper)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{order.speciesName ?? '(species)'}</span>
                  {order.isPreorder && (
                    <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 7px', borderRadius: 10, background: '#ede9fe', color: '#7c3aed', fontWeight: 500 }}>
                      Preorder
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>#{order.id}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12, fontSize: 13 }}>
                {order.qtyKg != null && <span><span style={{ color: 'var(--ink-4)', marginRight: 8 }}>Qty</span>{order.qtyKg.toFixed(1)} kg</span>}
                {order.pricePerKg != null && <span><span style={{ color: 'var(--ink-4)', marginRight: 8 }}>Price</span>₱{order.pricePerKg.toFixed(2)}/kg</span>}
                {order.notes && <span><span style={{ color: 'var(--ink-4)', marginRight: 8 }}>Notes</span>{order.notes}</span>}
                <span><span style={{ color: 'var(--ink-4)', marginRight: 8 }}>Placed</span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {order.status === 'PENDING' && (
                  <button className="btn btn--sm btn--accent" onClick={() => act(fishermanAccept, order.id)}>Accept</button>
                )}
                {order.status === 'ACCEPTED' && (
                  <button className="btn btn--sm btn--accent" onClick={() => act(fishermanMarkReady, order.id)}>Mark Ready</button>
                )}
                {order.status === 'READY' && (
                  <button className="btn btn--sm btn--primary" onClick={() => act(fishermanComplete, order.id)}>Complete</button>
                )}
                {(order.status === 'PENDING' || order.status === 'ACCEPTED') && cancelOpen !== order.id && (
                  <button className="btn btn--sm" onClick={() => { setCancelOpen(order.id); setActionErr(null) }}
                    style={{ borderColor: 'var(--unsafe)', color: 'var(--unsafe)' }}>
                    Cancel
                  </button>
                )}
                {cancelOpen === order.id && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      placeholder="Reason (optional)"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4, fontSize: 13 }}
                    />
                    <button className="btn btn--sm" style={{ background: 'var(--unsafe)', color: '#fff', border: 'none' }}
                      onClick={() => handleCancel(order.id)}>
                      Confirm
                    </button>
                    <button className="btn btn--sm" onClick={() => { setCancelOpen(null); setCancelReason('') }}>Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

function DashboardPage({ conditions, advisories, forecast, activeTrip, pendingOrders, loading, error, onLoad, user, setPage }) {
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

  const hour     = new Date().getHours()
  const greet    = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.fullName?.split(' ')[0] || 'Captain'

  const QUICK_ACTIONS = [
    { label: 'Start trip',  Icon: I.Anchor,    page: 'trips',   accent: true },
    { label: 'Plan trip',   Icon: I.Calendar,  page: 'planner' },
    { label: 'Marketplace', Icon: I.Store,     page: 'market' },
    { label: 'My orders',   Icon: I.Clipboard, page: 'orders' },
  ]

  return (
    <div className="page" style={{ paddingBottom: 36 }}>
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

      {/* Hero — text only, right side clear for character illustration */}
      <div className="hero" style={{ marginBottom: 18, gridTemplateColumns: '1fr' }}>
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
               overall === 'UNSAFE'  ? ' — stay ashore today.' :
               overall === 'SAFE'    ? ' — good day to fish.' : '.'}
            </h2>
          )}
          {!loading && (
            <p className="hero__sub">
              {representativeZone?.risk?.advisory ?? 'Checking conditions…'}
            </p>
          )}
          <div className="hero__row">
            {!loading && safeCount > 0 && (
              <span className="chip chip--safe chip--dot">{safeCount} zone{safeCount !== 1 ? 's' : ''} safe</span>
            )}
            {!loading && cautionCount > 0 && (
              <span className="chip chip--caution chip--dot">{cautionCount} zone{cautionCount !== 1 ? 's' : ''} caution</span>
            )}
            {!loading && unsafeCount > 0 && (
              <span className="chip chip--unsafe chip--dot">{unsafeCount} zone{unsafeCount !== 1 ? 's' : ''} unsafe</span>
            )}
            {advisories.length > 0 && (
              <span className="chip chip--dot">{advisories.length} active advisor{advisories.length !== 1 ? 'ies' : 'y'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Marine conditions KPIs */}
      <div className="grid grid--kpi" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="kpi__label">Safe zones</div>
          <div className="kpi__value">{loading ? '—' : safeCount}</div>
          <div className="kpi__foot">
            <span className="chip chip--safe chip--dot" style={{ fontSize: 10 }}>SAFE</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Caution zones</div>
          <div className="kpi__value">{loading ? '—' : cautionCount}</div>
          <div className="kpi__foot">
            <span className="chip chip--caution chip--dot" style={{ fontSize: 10 }}>CAUTION</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Avg wave</div>
          <div className="kpi__value">
            {loading ? '—' : avgWave != null ? avgWave.toFixed(1) : '—'}<sup>m</sup>
          </div>
          <div className="kpi__foot">
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>all zones</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Max wind</div>
          <div className="kpi__value">
            {loading ? '—' : maxWind != null ? Math.round(maxWind) : '—'}<sup>km/h</sup>
          </div>
          <div className="kpi__foot">
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>peak speed</span>
          </div>
        </div>
      </div>

      {/* Bento grid — equal 18px gaps throughout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 48h Forecast */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">48-hour sea forecast</div>
                <div className="card__sub">Wave height (m) · Wind speed (km/h, dashed)</div>
              </div>
              <div className="row">
                <span className="chip chip--accent chip--dot">Wave m</span>
                <span className="chip chip--caution chip--dot">Wind km/h</span>
              </div>
            </div>
            <ForecastChart data={forecast} />
          </div>

          {/* Zone carousel */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card__head" style={{ marginBottom: 14 }}>
              <div>
                <div className="card__title">Zone conditions</div>
                <div className="card__sub">{zones.length} zones · slides automatically</div>
              </div>
              <button className="btn btn--sm btn--ghost">View map <I.Arrow size={12} /></button>
            </div>
            <ZoneCarousel zones={zones} loading={loading} />
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Quick actions */}
          <div className="card card--paper">
            <div className="card__head" style={{ marginBottom: 12 }}>
              <div className="card__title">Quick actions</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_ACTIONS.map(({ label, Icon, page, accent }) => (
                <button
                  key={page}
                  className={`btn${accent ? ' btn--accent' : ''}`}
                  onClick={() => setPage(page)}
                  style={{ justifyContent: 'flex-start', gap: 8, fontSize: 13 }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

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
                  const s   = a.severity || 'LOW'
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

          {/* Pending orders */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Pending orders</div>
                <div className="card__sub">
                  {pendingOrders.length > 0
                    ? `${pendingOrders.length} awaiting response`
                    : 'No pending orders'}
                </div>
              </div>
              <button className="btn btn--sm btn--ghost" onClick={() => setPage('orders')}>
                View all <I.Arrow size={12} />
              </button>
            </div>
            <OrdersSummary orders={pendingOrders} setPage={setPage} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export default function FishermanDashboard({ user, token, onLogout }) {
  const [conditions,    setConditions]    = useState(null)
  const [advisories,    setAdvisories]    = useState([])
  const [activeTrip,    setActiveTrip]    = useState(null)
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [activeNav,     setActiveNav]     = useState('dashboard')
  const [forecast,      setForecast]      = useState(() => generateForecast())
  const [badges,        setBadges]        = useState({ alerts: 0, orders: 0, messages: 0, procurement: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cond, adv, tripList, alerts, orders, procOrders] = await Promise.all([
        apiGet('/marine/conditions', token),
        apiGet('/advisories?activeOnly=true', token),
        apiGet('/trips?status=ACTIVE',               token).catch(() => []),
        apiGet('/fisherman/catch-alerts?status=ACTIVE', token).catch(() => []),
        apiGet('/orders/mine?status=PENDING',         token).catch(() => []),
        listFishermanProcurementOrders('PENDING').catch(() => []),
      ])
      setConditions(cond)
      setAdvisories(adv)
      setActiveTrip(Array.isArray(tripList) ? tripList[0] ?? null : null)
      setPendingOrders(Array.isArray(orders) ? orders : [])
      setBadges({
        alerts:      Array.isArray(alerts)      ? alerts.length      : 0,
        orders:      Array.isArray(orders)      ? orders.length      : 0,
        messages:    0,
        procurement: Array.isArray(procOrders)  ? procOrders.length  : 0,
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

        {activeNav === 'planner'      ? <TripPlanner token={token} setPage={setActiveNav} /> :
         activeNav === 'trips'        ? <MyTrips token={token} setPage={setActiveNav} zones={conditions?.zones ?? []} /> :
         activeNav === 'catch-alerts' ? <CatchAlerts token={token} role="FISHERMAN" /> :
         activeNav === 'orders'       ? <Orders token={token} role="FISHERMAN" /> :
         activeNav === 'procurement'  ? <FishermanProcurementTab /> :
         activeNav === 'market'       ? <Marketplace token={token} /> :
         activeNav === 'messages'     ? <Messages token={token} userProfile={user} /> :
         (
           <DashboardPage
             conditions={conditions}
             advisories={advisories}
             forecast={forecast}
             activeTrip={activeTrip}
             pendingOrders={pendingOrders}
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
