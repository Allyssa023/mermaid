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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

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

function Rail({ page, setPage, user, onLogout }) {
  const items = [
    { id: 'dashboard',    icon: 'Dashboard',  label: 'Dashboard' },
    { id: 'planner',      icon: 'Calendar',   label: 'Trip Planner' },
    { id: 'trips',        icon: 'Anchor',     label: 'My Trips' },
    { id: 'catch-alerts', icon: 'Bell',       label: 'Catch Alerts' },
    { id: 'orders',       icon: 'Clipboard',  label: 'Orders' },
    { id: 'market',       icon: 'Store',      label: 'Marketplace' },
    { id: 'messages',     icon: 'Message',    label: 'Messages' },
  ]

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'FI'
  const firstName = user?.fullName?.split(' ')[0] || 'Fisherman'

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
              <div className="rail-item__icon"><Icon size={18} /></div>
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
            <span className="rail__user-role">Fisherman</span>
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

// ── Forecast Chart ─────────────────────────────────────────────────────────────

function ForecastChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="waveGradL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="oklch(0.55 0.09 220)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="oklch(0.55 0.09 220)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="windGradL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="oklch(0.72 0.11 75)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="oklch(0.72 0.11 75)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#E5E4DD" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8A90A0', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8A90A0', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#FFFFFF', border: '1px solid #E5E4DD',
            borderRadius: 10, fontFamily: 'Geist, sans-serif', fontSize: 12, color: '#0E1116',
          }}
        />
        <Area type="monotone" dataKey="wave" name="Wave (m)"
          stroke="oklch(0.55 0.09 220)" strokeWidth={1.5}
          fill="url(#waveGradL)" dot={false}
          activeDot={{ r: 3, fill: 'oklch(0.55 0.09 220)', stroke: '#fff', strokeWidth: 2 }}
        />
        <Area type="monotone" dataKey="wind" name="Wind (km/h)"
          stroke="oklch(0.72 0.11 75)" strokeWidth={1.5} strokeDasharray="3 3"
          fill="url(#windGradL)" dot={false}
          activeDot={{ r: 3, fill: 'oklch(0.72 0.11 75)', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Zone Carousel ──────────────────────────────────────────────────────────────

function ZoneCarousel({ zones, loading }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef(null)

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current)
    if (zones.length > 1) {
      timerRef.current = setInterval(() => {
        setIdx(i => (i + 1) % zones.length)
      }, 3500)
    }
  }, [zones.length])

  useEffect(() => {
    resetTimer()
    return () => clearInterval(timerRef.current)
  }, [resetTimer])

  const go = (n) => {
    setIdx((idx + n + zones.length) % zones.length)
    resetTimer()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 48, background: 'var(--paper-2)', borderRadius: 8, animation: 'shimmer 1.4s infinite' }} />
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

  const z = zones[idx]
  const r = z.risk?.level ?? 'SAFE'
  const riskColor = r === 'SAFE' ? 'var(--safe)' : r === 'CAUTION' ? 'var(--caution)' : 'var(--unsafe)'
  const riskBg    = r === 'SAFE' ? 'var(--safe-soft)' : r === 'CAUTION' ? 'var(--caution-soft)' : 'var(--unsafe-soft)'

  return (
    <div style={{ position: 'relative' }}>
      {/* Slide panel */}
      <div
        key={idx}
        style={{
          background: riskBg,
          border: `1px solid ${riskColor}22`,
          borderRadius: 'var(--r-md)',
          padding: '18px 20px',
          transition: 'opacity 0.3s',
          animation: 'fadeSlide 0.35s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{z.zoneName}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{z.region}</div>
          </div>
          <span className={`chip chip--${r === 'SAFE' ? 'safe' : r === 'CAUTION' ? 'caution' : 'unsafe'} chip--dot`}>
            {r}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Wave',  value: fmt(z.marine?.waveHeightM, '', 1),             unit: 'm' },
            { label: 'Swell', value: fmt(z.marine?.swellHeightM, '', 1),            unit: 'm' },
            { label: 'Wind',  value: z.weather?.windSpeedKmh != null ? `${Math.round(z.weather.windSpeedKmh)} ${windDir(z.weather?.windDirectionDeg)}` : '—', unit: 'km/h' },
            { label: 'Temp',  value: z.weather?.temperatureC != null ? `${Math.round(z.weather.temperatureC)}°` : '—', unit: 'C' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                {m.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {z.risk?.advisory && (
          <div style={{
            marginTop: 12, fontSize: 12, color: 'var(--ink-3)',
            borderTop: `1px solid ${riskColor}22`, paddingTop: 10, lineHeight: 1.5,
          }}>
            {z.risk.advisory}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button
          onClick={() => go(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: '2px 6px', borderRadius: 6 }}
          title="Previous zone"
        >
          <I.ChevL size={16} />
        </button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {zones.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); resetTimer() }}
              style={{
                width: i === idx ? 18 : 6, height: 6,
                borderRadius: 3, border: 'none', cursor: 'pointer',
                background: i === idx ? 'var(--accent)' : 'var(--line-2)',
                padding: 0, transition: 'width 0.25s, background 0.25s',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: '2px 6px', borderRadius: 6 }}
          title="Next zone"
        >
          <I.ChevR size={16} />
        </button>
      </div>

      {/* Zone counter */}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-5)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
        {idx + 1} / {zones.length} zones
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

// ── Best Window Card ───────────────────────────────────────────────────────────

function BestWindowCard({ forecast, loading }) {
  if (loading) {
    return (
      <div className="card card--paper">
        <div className="card__title" style={{ marginBottom: 8 }}>Today's best window</div>
        <div style={{ height: 60, background: 'var(--paper-2)', borderRadius: 8 }} />
      </div>
    )
  }

  const win = bestWindow(forecast)
  if (!win) return null

  return (
    <div className="card card--paper" style={{ borderLeft: '3px solid var(--accent)' }}>
      <div className="card__head" style={{ marginBottom: 10 }}>
        <div>
          <div className="card__title">Today's best window</div>
          <div className="card__sub">Lowest wave & wind in forecast</div>
        </div>
        <I.Star size={16} style={{ color: 'var(--accent)' }} />
      </div>

      <div style={{
        background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)',
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent-ink)' }}>
          {win.label}
        </span>
        {win.hoursAway === 0 ? (
          <span className="chip chip--accent chip--dot">Now</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>in {win.hoursAway}h</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Avg wave', value: fmt(win.wave, 'm', 1) },
          { label: 'Avg wind', value: fmt(win.wind, ' km/h', 0) },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--surface)', borderRadius: 'var(--r-sm)',
            padding: '8px 12px', border: '1px solid var(--line)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>
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
          <div className="kpi__label">Avg wave height</div>
          <div className="kpi__value">{loading ? '—' : fmt(avgWave, '', 1)}<sup>m</sup></div>
          <div className="kpi__foot">
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>Across all zones</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Max wind speed</div>
          <div className="kpi__value">{loading ? '—' : fmt(maxWind, '', 0)}<sup>km/h</sup></div>
          <div className="kpi__foot">
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>Peak reading</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Active advisories</div>
          <div className="kpi__value">{loading ? '—' : advisories.length}</div>
          <div className="kpi__foot">
            {advisories.some(a => ['HIGH','CRITICAL'].includes(a.severity))
              ? <span className="delta-down">High priority</span>
              : <span className="delta-up">All manageable</span>
            }
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Zones monitored</div>
          <div className="kpi__value">{loading ? '—' : zones.length}</div>
          <div className="kpi__foot">
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>Real-time data</span>
          </div>
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
                <div className="card__sub">{zones.length} zones monitored</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {safeCount > 0 && <span className="chip chip--safe" style={{ fontSize: 10 }}>{safeCount} safe</span>}
                {cautionCount > 0 && <span className="chip chip--caution" style={{ fontSize: 10 }}>{cautionCount} caution</span>}
                {unsafeCount > 0 && <span className="chip chip--unsafe" style={{ fontSize: 10 }}>{unsafeCount} unsafe</span>}
              </div>
            </div>
            <ZoneCarousel zones={zones} loading={loading} />
          </div>
        </div>

        {/* RIGHT — active trip + best window + advisories + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ActiveTripCard trip={activeTrip} onViewTrip={() => setPage('trips')} />

          <BestWindowCard forecast={forecast} loading={loading} />

          {/* Active advisories */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Active advisories</div>
                <div className="card__sub">{advisories.length} open</div>
              </div>
              {advisories.length > 0 && (
                <span className="chip chip--ink">{advisories.length}</span>
              )}
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2].map(i => (
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

          {/* Quick actions */}
          <div className="card card--paper">
            <div className="card__head" style={{ marginBottom: 8 }}>
              <div className="card__title">Quick actions</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn--accent" onClick={() => setPage('planner')} style={{ justifyContent: 'center' }}>
                <I.Calendar size={14} /> Plan a trip
              </button>
              <button className="btn" onClick={() => setPage('catch-alerts')} style={{ justifyContent: 'center' }}>
                <I.Bell size={14} /> Catch alerts
              </button>
              <button className="btn" onClick={() => setPage('market')} style={{ justifyContent: 'center' }}>
                <I.Store size={14} /> Browse marketplace
              </button>
              <button className="btn" onClick={() => setPage('orders')} style={{ justifyContent: 'center' }}>
                <I.Clipboard size={14} /> View orders
              </button>
            </div>
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cond, adv, tripList] = await Promise.all([
        apiGet('/marine/conditions', token),
        apiGet('/advisories?activeOnly=true', token),
        apiGet('/trips?status=ACTIVE', token).catch(() => []),
      ])
      setConditions(cond)
      setAdvisories(adv)
      setActiveTrip(Array.isArray(tripList) ? tripList[0] ?? null : null)

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
      <Rail page={activeNav} setPage={setActiveNav} user={user} onLogout={onLogout} />
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
