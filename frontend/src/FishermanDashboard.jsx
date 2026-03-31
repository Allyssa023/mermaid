import { useState, useEffect, useCallback } from 'react'
import './dashboard.css'
import { apiGet } from './api'

// ─── Icons ────────────────────────────────────────────────────────────────────

const DashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
)
const WavesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
  </svg>
)
const WindIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)
const TripIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l1-8 4.5 4 3.5-8 3.5 8 4.5-4 1 8H3z"/>
  </svg>
)
const ShopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" x2="21" y1="6" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>
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
const TempIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskClass(level) {
  if (level === 'SAFE') return 'safe'
  if (level === 'CAUTION') return 'caution'
  return 'unsafe'
}

function severityClass(sev) {
  if (sev === 'LOW') return 'low'
  if (sev === 'MEDIUM') return 'medium'
  if (sev === 'HIGH') return 'high'
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
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return ' ' + dirs[Math.round(deg / 45) % 8]
}

function fmt(val, unit, decimals = 1) {
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

// ─── Components ──────────────────────────────────────────────────────────────

function RiskBadge({ level, large }) {
  const map = {
    SAFE:    { label: 'Safe to Fish', icon: '✓' },
    CAUTION: { label: 'Use Caution',  icon: '⚠' },
    UNSAFE:  { label: 'Do Not Sail',  icon: '✕' },
  }
  const { label, icon } = map[level] || { label: level, icon: '?' }
  return (
    <span className={`risk-badge risk-badge--${riskClass(level)}${large ? ' risk-badge--lg' : ''}`}>
      <span className="risk-badge__icon">{icon}</span>
      {label}
    </span>
  )
}

function SevChip({ severity }) {
  const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' }
  return (
    <span className={`sev-chip sev-chip--${severityClass(severity)}`}>
      {labels[severity] || severity}
    </span>
  )
}

function AdvisoryCard({ advisory }) {
  return (
    <div className={`advisory-card advisory-card--${severityClass(advisory.severity)}`}>
      <div className="advisory-card__header">
        <SevChip severity={advisory.severity} />
        <span className="advisory-card__area">{advisory.affectedArea}</span>
      </div>
      <p className="advisory-card__title">{advisory.title}</p>
      <p className="advisory-card__msg">{advisory.message}</p>
    </div>
  )
}

function ZoneCard({ zone }) {
  const rc = riskClass(zone.risk.level)
  return (
    <div className={`zone-card zone-card--${rc}`}>
      <div className="zone-card__head">
        <div>
          <p className="zone-card__name">{zone.zoneName}</p>
          <p className="zone-card__region">{zone.region}</p>
        </div>
        <RiskBadge level={zone.risk.level} />
      </div>

      <p className="zone-card__advisory">{zone.risk.advisory}</p>

      <div className="zone-card__stats">
        <div className="zone-stat">
          <WavesIcon />
          <span>{fmt(zone.marine?.waveHeightM, 'm')}</span>
          <label>Waves</label>
        </div>
        <div className="zone-stat">
          <WindIcon />
          <span>{zone.weather?.windSpeedKmh != null ? `${Math.round(zone.weather.windSpeedKmh)} km/h${windDir(zone.weather.windDirectionDeg)}` : '—'}</span>
          <label>Wind</label>
        </div>
        <div className="zone-stat">
          <TempIcon />
          <span>{zone.weather?.temperatureC != null ? `${Math.round(zone.weather.temperatureC)}°C` : '—'}</span>
          <label>Temp</label>
        </div>
      </div>

      {zone.risk.factors?.length > 0 && (
        <div className="zone-card__factors">
          {zone.risk.factors.map((f, i) => (
            <span key={i} className="factor-chip">{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Skeleton({ height = '120px', radius = '16px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

function Sidebar({ user, activeNav, onNav, onLogout }) {
  const navItems = [
    { id: 'dashboard', icon: <DashIcon />, label: 'Dashboard' },
    { id: 'trips',     icon: <TripIcon />, label: 'My Trips' },
    { id: 'market',    icon: <ShopIcon />, label: 'Marketplace' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <img src="/logo.png" alt="MERMAID" className="sidebar__logo-img" />
        <span className="sidebar__brand">MERMAID</span>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar__link${activeNav === item.id ? ' sidebar__link--on' : ''}`}
            onClick={() => onNav(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__bottom">
        <button className="sidebar__link" onClick={() => onNav('profile')}>
          <UserIcon />
          <span>{user?.fullName?.split(' ')[0] || 'Profile'}</span>
        </button>
        <button className="sidebar__link sidebar__link--logout" onClick={onLogout}>
          <LogoutIcon />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function FishermanDashboard({ user, token, onLogout }) {
  const [conditions, setConditions] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeNav, setActiveNav] = useState('dashboard')

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const overall = conditions ? overallRisk(conditions.zones) : null
  const highAdvisories = advisories.filter(a => ['HIGH', 'CRITICAL'].includes(a.severity))

  const zonesWithWave = conditions?.zones?.filter(z => z.marine?.waveHeightM != null && !isNaN(z.marine.waveHeightM)) ?? []
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

        {/* ── Top bar ── */}
        <header className="db-topbar">
          <div>
            <h1 className="db-greeting">
              {greeting()}, <span>{user?.fullName?.split(' ')[0] || 'Fisherman'}</span>
            </h1>
            <p className="db-date">{today}</p>
          </div>
          <button
            className={`db-refresh${loading ? ' db-refresh--spinning' : ''}`}
            onClick={load}
            disabled={loading}
            title="Refresh conditions"
          >
            <RefreshIcon />
            {lastUpdated && (
              <span className="db-refresh__time">Updated {fmtTime(lastUpdated.toISOString())}</span>
            )}
          </button>
        </header>

        {/* ── Error ── */}
        {error && (
          <div className="db-error">
            <AlertIcon />
            <span>{error}</span>
            <button className="db-error__retry" onClick={load}>Retry</button>
          </div>
        )}

        {/* ── High-priority advisory banner ── */}
        {!loading && highAdvisories.length > 0 && (
          <div className="db-banner">
            <AlertIcon />
            <strong>
              {highAdvisories.length} high-priority {highAdvisories.length === 1 ? 'advisory' : 'advisories'} in effect
            </strong>
            <span className="db-banner__hint">See details below</span>
          </div>
        )}

        {/* ── Highlight cards ── */}
        <section className="db-section">
          <div className="db-highlights">

            {/* Overall safety */}
            <div className={`db-highlight db-highlight--${overall ? riskClass(overall) : 'neutral'}`}>
              <p className="db-highlight__label">Overall Safety</p>
              {loading
                ? <Skeleton height="2rem" radius="8px" />
                : overall
                  ? <>
                      <RiskBadge level={overall} large />
                      <p className="db-highlight__sub">
                        {overall === 'SAFE'    && 'All zones are favorable for fishing'}
                        {overall === 'CAUTION' && 'Exercise caution in some zones'}
                        {overall === 'UNSAFE'  && 'Dangerous conditions — avoid sailing'}
                      </p>
                    </>
                  : <p className="db-highlight__sub">No data available</p>
              }
            </div>

            {/* Avg wave height */}
            <div className="db-highlight db-highlight--neutral">
              <p className="db-highlight__label">Avg Wave Height</p>
              {loading
                ? <Skeleton height="2rem" radius="8px" />
                : <>
                    <p className="db-highlight__value">
                      <WavesIcon />
                      {avgWave != null ? `${avgWave.toFixed(1)} m` : '—'}
                    </p>
                    <p className="db-highlight__sub">Across all monitored zones</p>
                  </>
              }
            </div>

            {/* Max wind */}
            <div className="db-highlight db-highlight--neutral">
              <p className="db-highlight__label">Max Wind Speed</p>
              {loading
                ? <Skeleton height="2rem" radius="8px" />
                : <>
                    <p className="db-highlight__value">
                      <WindIcon />
                      {maxWind != null ? `${Math.round(maxWind)} km/h` : '—'}
                    </p>
                    <p className="db-highlight__sub">Peak across all zones</p>
                  </>
              }
            </div>

            {/* Active advisories count */}
            <div className={`db-highlight${highAdvisories.length > 0 ? ' db-highlight--warn' : ' db-highlight--neutral'}`}>
              <p className="db-highlight__label">Active Advisories</p>
              {loading
                ? <Skeleton height="2rem" radius="8px" />
                : <>
                    <p className="db-highlight__value">
                      <AlertIcon />
                      {advisories.length}
                    </p>
                    <p className="db-highlight__sub">
                      {advisories.length === 0
                        ? 'No active advisories'
                        : `${highAdvisories.length} high priority`}
                    </p>
                  </>
              }
            </div>

          </div>
        </section>

        {/* ── Advisories ── */}
        <section className="db-section">
          <h2 className="db-section__title"><AlertIcon /> Active Advisories</h2>
          {loading ? (
            <div className="db-adv-list">
              <Skeleton height="88px" /><Skeleton height="88px" />
            </div>
          ) : advisories.length > 0 ? (
            <div className="db-adv-list">
              {advisories.map(a => <AdvisoryCard key={a.id} advisory={a} />)}
            </div>
          ) : (
            <div className="db-empty">
              <span className="db-empty__check">✓</span>
              <p>No active advisories at this time. Waters are clear.</p>
            </div>
          )}
        </section>

        {/* ── Zone conditions ── */}
        <section className="db-section">
          <h2 className="db-section__title"><WavesIcon /> Fishing Zone Conditions</h2>
          {loading ? (
            <div className="db-zones-grid">
              <Skeleton height="200px" /><Skeleton height="200px" /><Skeleton height="200px" />
            </div>
          ) : conditions?.zones?.length > 0 ? (
            <div className="db-zones-grid">
              {conditions.zones.map(z => <ZoneCard key={z.zoneId} zone={z} />)}
            </div>
          ) : (
            <div className="db-empty">
              <p>Zone data unavailable. Try refreshing.</p>
            </div>
          )}
          {conditions && (
            <p className="db-data-source">
              Source: {conditions.zones?.[0]?.dataSource || 'Open-Meteo'} · Generated {fmtTime(conditions.generatedAt)}
            </p>
          )}
        </section>

      </main>
    </div>
  )
}
