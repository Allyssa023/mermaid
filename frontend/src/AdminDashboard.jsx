import { useState, useEffect, useCallback, useRef } from 'react'
import './dashboard.css'
import './admin.css'
import { apiGet, apiPost, apiPut, apiDelete } from './api'
import GradientText from './components/GradientText/GradientText'
import SpotlightCard from './components/SpotlightCard/SpotlightCard'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Icons ────────────────────────────────────────────────────────────────────

const OverviewIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)
const FishIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z"/>
    <path d="M18 12h.01"/>
    <path d="M6.5 12C4 12 1.5 9.5 2 6c.5-3 3-4 5 0"/>
  </svg>
)
const MapPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const ShieldLgIcon = () => (
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
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function severityClass(sev) {
  if (sev === 'LOW')    return 'low'
  if (sev === 'MEDIUM') return 'medium'
  if (sev === 'HIGH')   return 'high'
  return 'critical'
}

function platformStatus(advisories) {
  const active = advisories?.filter(a => a.isActive) ?? []
  if (active.some(a => a.severity === 'CRITICAL')) return 'CRITICAL'
  if (active.some(a => a.severity === 'HIGH'))     return 'ATTENTION'
  return 'OPERATIONAL'
}

// ─── useCountUp ───────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (!target) { setVal(0); return }
    startRef.current = null
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return val
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const cls = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' }[severity] || 'medium'
  return <span className={`sev-chip sev-chip--${cls}`}>{severity}</span>
}

function RoleBadge({ role }) {
  const cls = { ADMIN: 'admin', FISHERMAN: 'fisherman', VENDOR: 'vendor' }[role] || 'fisherman'
  return <span className={`adm-role-badge adm-role-badge--${cls}`}>{role}</span>
}

function StatusChip({ active }) {
  return (
    <span className={`vd-status ${active ? 'vd-status--open' : 'vd-status--closed'}`}>
      {active ? '● Active' : '○ Inactive'}
    </span>
  )
}

// ─── Platform Status Hero Card ────────────────────────────────────────────────

function PlatformStatusCard({ advisories, users, loading }) {
  const status = platformStatus(advisories)
  const activeAdv = advisories?.filter(a => a.isActive).length ?? 0

  const meta = {
    OPERATIONAL: {
      label: 'ALL SYSTEMS OPERATIONAL',
      sub: 'No high-priority advisories. Platform running normally.',
      cls: 'safe',
      colors: ['#00f5a0', '#00d9f5', '#00f5a0'],
    },
    ATTENTION: {
      label: 'ATTENTION REQUIRED',
      sub: 'High-priority advisory active. Review and update affected users.',
      cls: 'caution',
      colors: ['#fbbf24', '#f59e0b', '#fbbf24'],
    },
    CRITICAL: {
      label: 'CRITICAL ADVISORY ACTIVE',
      sub: 'Critical advisory in effect. Immediate action may be required.',
      cls: 'unsafe',
      colors: ['#ff4d4d', '#ff1744', '#ff4d4d'],
    },
  }

  const m = meta[status]

  return (
    <div className={`hero-card hero-card--${m.cls}`} style={{ animation: 'fadeup 0.4s ease' }}>
      <div className="hero-card__bg" />
      <div className="hero-card__inner">
        <div className="hero-card__icon">
          {loading ? <ShieldLgIcon /> : (status === 'OPERATIONAL' ? <ShieldLgIcon /> : <AlertIcon />)}
        </div>
        <div>
          <p className="hero-card__eyebrow">Platform Status</p>
          {loading
            ? <div className="skeleton" style={{ height: '2.2rem', width: '260px', marginBottom: '8px' }} />
            : <h2 className="hero-card__status">
                <GradientText colors={m.colors} animationSpeed={5}>{m.label}</GradientText>
              </h2>
          }
          {!loading && <p className="hero-card__sub">{m.sub}</p>}
        </div>
        {!loading && (
          <div className="vd-hero-stats">
            <div className="vd-hero-stat">
              <span className="vd-hero-stat__value">{users?.length ?? 0}</span>
              <span className="vd-hero-stat__label">Users</span>
            </div>
            <div className="vd-hero-stat">
              <span className="vd-hero-stat__value">{activeAdv}</span>
              <span className="vd-hero-stat__label">Active Advisories</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, rawValue, icon, iconVariant, sub, loading }) {
  const counted = useCountUp(loading ? 0 : (rawValue ?? 0))
  const display = loading ? '—' : (rawValue == null ? '—' : counted)

  return (
    <SpotlightCard className="kpi-card" spotlightColor="rgba(245, 158, 11, 0.08)">
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

// ─── User Breakdown Donut ─────────────────────────────────────────────────────

function UserBreakdownDonut({ users }) {
  const fishermen = users?.filter(u => u.role === 'FISHERMAN').length ?? 0
  const vendors   = users?.filter(u => u.role === 'VENDOR').length ?? 0
  const admins    = users?.filter(u => u.role === 'ADMIN').length ?? 0
  const total     = users?.length ?? 0

  if (!total) return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">User Breakdown</p>
          <p className="chart-card__sub">By role</p>
        </div>
      </div>
      <div className="adv-panel__empty" style={{ borderStyle: 'none', paddingTop: 16, paddingBottom: 20 }}>
        <div className="adv-panel__empty-icon"><UsersIcon /></div>
        <p className="adv-panel__empty-title">No Users</p>
        <p className="adv-panel__empty-sub">No registered accounts yet</p>
      </div>
    </div>
  )

  const data = [
    { name: 'Fishermen', value: fishermen, color: 'var(--accent)' },
    { name: 'Vendors',   value: vendors,   color: 'var(--safe)' },
    { name: 'Admins',    value: admins,    color: 'var(--unsafe)' },
  ].filter(d => d.value > 0)

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">User Breakdown</p>
          <p className="chart-card__sub">By role</p>
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
          <p style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Users</p>
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

// ─── Advisory Severity Bar ────────────────────────────────────────────────────

function AdvisorySeverityBars({ advisories }) {
  const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const colors = {
    LOW: 'var(--safe)', MEDIUM: 'var(--caution)', HIGH: 'var(--amber)', CRITICAL: 'var(--unsafe)',
  }

  const data = SEVERITIES.map(sev => ({
    name: sev,
    count: advisories?.filter(a => a.severity === sev).length ?? 0,
    color: colors[sev],
  }))

  const total = data.reduce((s, d) => s + d.count, 0)

  if (!total) return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Advisory Severity</p>
          <p className="chart-card__sub">All advisories by severity</p>
        </div>
      </div>
      <div className="adv-panel__empty" style={{ borderStyle: 'none', paddingTop: 16, paddingBottom: 20 }}>
        <div className="adv-panel__empty-icon"><AlertIcon /></div>
        <p className="adv-panel__empty-title">No Advisories</p>
        <p className="adv-panel__empty-sub">Create an advisory to see the breakdown</p>
      </div>
    </div>
  )

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <p className="chart-card__title">Advisory Severity</p>
          <p className="chart-card__sub">All advisories by severity level</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number"
            tick={{ fill: 'rgba(238,244,255,0.25)', fontSize: 10, fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false} allowDecimals={false}
          />
          <YAxis type="category" dataKey="name"
            tick={{ fill: 'rgba(238,244,255,0.45)', fontSize: 11, fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false} width={70}
          />
          <Tooltip
            formatter={(v) => [v, 'Advisories']}
            contentStyle={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-2)',
              borderRadius: '10px', fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-1)',
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}
            label={{ position: 'right', fill: 'rgba(238,244,255,0.35)', fontSize: 11, formatter: v => v || '' }}
            isAnimationActive animationDuration={1200}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Recent Advisories Panel ──────────────────────────────────────────────────

function RecentAdvisoriesPanel({ advisories, loading }) {
  const recent = advisories?.slice(0, 6) ?? []

  return (
    <div className="adv-panel">
      <div className="adv-panel__head">
        <p className="adv-panel__title">Recent Advisories</p>
        {!loading && advisories?.length > 0 && (
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
        ) : recent.length > 0 ? (
          recent.map(a => (
            <div key={a.id} className={`adv-item adv-item--${severityClass(a.severity)}`}>
              <div className="adv-item__stripe" />
              <div className="adv-item__body">
                <div className="adv-item__header">
                  <SeverityBadge severity={a.severity} />
                  <span className="adv-item__area">{a.affectedArea}</span>
                </div>
                <p className="adv-item__title">{a.title}</p>
                <p className="adv-item__msg" style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {a.isActive ? '● Active' : '○ Inactive'} · {fmtDate(a.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="adv-panel__empty">
            <div className="adv-panel__empty-icon"><ShieldLgIcon /></div>
            <p className="adv-panel__empty-title">No Advisories</p>
            <p className="adv-panel__empty-sub">No advisories have been created yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'overview',   icon: <OverviewIcon />, label: 'Overview' },
  { id: 'users',      icon: <UsersIcon />,    label: 'Users' },
  { id: 'advisories', icon: <AlertIcon />,    label: 'Advisories' },
  { id: 'species',    icon: <FishIcon />,     label: 'Fish Species' },
  { id: 'locations',  icon: <MapPinIcon />,   label: 'Market Locations' },
]

function AdminSidebar({ user, activeNav, onNav, onLogout }) {
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo-mark"><AnchorIcon /></div>
        <span className="sidebar__brand">Mermaid</span>
      </div>

      <nav className="sidebar__nav">
        <p className="sidebar__nav-label">Admin Console</p>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar__link${activeNav === item.id ? ' sidebar__link--on' : ''}`}
            onClick={() => onNav(item.id)}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__bottom">
        <button className="sidebar__link">
          <span className="sidebar__avatar">{initials}</span>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.fullName?.split(' ')[0] || 'Admin'}</span>
            <span className="sidebar__user-role">Administrator</span>
          </div>
        </button>
        <button className="sidebar__link sidebar__link--logout" onClick={onLogout}>
          <span className="sidebar__link-icon"><LogoutIcon /></span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

// ─── CRUD Table Shell ─────────────────────────────────────────────────────────
// Shared wrapper for all CRUD section page headers

function SectionHeader({ title, sub, action }) {
  return (
    <div className="vd-page-header">
      <div>
        <h2 className="vd-page-header__title">{title}</h2>
        {sub && <p className="vd-page-header__sub">{sub}</p>}
      </div>
      {action && (
        <button className="adm-create-btn" onClick={action.onClick}>
          <PlusIcon /> {action.label}
        </button>
      )}
    </div>
  )
}

// ─── Shared Modal ─────────────────────────────────────────────────────────────

function AdminModal({ title, onClose, onSubmit, saving, submitLabel, children, formError }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="vd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vd-modal">
        <div className="vd-modal__header">
          <h2 className="vd-modal__title">{title}</h2>
          <button className="vd-modal__close" onClick={onClose}><XIcon /></button>
        </div>
        <form className="vd-form" onSubmit={onSubmit}>
          {children}
          {formError && <p className="vd-form__error">{formError}</p>}
          <div className="vd-form__actions">
            <button type="button" className="vd-form__cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="adm-form__submit" disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Section: Overview ────────────────────────────────────────────────────────

function OverviewSection({ token }) {
  const [users,       setUsers]       = useState(null)
  const [advisories,  setAdvisories]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, a] = await Promise.all([
        apiGet('/admin/users', token),
        apiGet('/admin/advisories', token),
      ])
      setUsers(u)
      setAdvisories(a)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const fishermen  = users?.filter(u => u.role === 'FISHERMAN').length ?? 0
  const vendors    = users?.filter(u => u.role === 'VENDOR').length ?? 0
  const activeAdv  = advisories?.filter(a => a.isActive).length ?? 0

  if (error) return (
    <div className="db-error" style={{ margin: '0 28px' }}>
      <AlertIcon /><span>{error}</span>
      <button className="db-error__retry" onClick={load}>Retry</button>
    </div>
  )

  return (
    <div className="db-body">
      {/* Left column */}
      <div className="db-left">
        <PlatformStatusCard advisories={advisories ?? []} users={users} loading={loading} />

        <div className="kpi-row">
          <KPICard label="Total Users"   rawValue={users?.length}  icon={<UsersIcon />}  sub="Registered accounts" loading={loading} />
          <KPICard label="Fishermen"     rawValue={fishermen}       icon={<FishIcon />}   iconVariant="safe"        sub="FISHERMAN role"    loading={loading} />
          <KPICard label="Vendors"       rawValue={vendors}         icon={<MapPinIcon />} sub="VENDOR role"         loading={loading} />
          <KPICard
            label="Active Advisories"
            rawValue={activeAdv}
            icon={<AlertIcon />}
            iconVariant={activeAdv > 0 ? '' : 'safe'}
            sub={activeAdv === 0 ? 'None active' : `${activeAdv} in effect`}
            loading={loading}
          />
        </div>

        {loading
          ? <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
          : <AdvisorySeverityBars advisories={advisories ?? []} />
        }
      </div>

      {/* Right column */}
      <div className="db-right">
        {loading
          ? <div className="skeleton" style={{ height: 280, borderRadius: 18 }} />
          : <UserBreakdownDonut users={users} />
        }
        <RecentAdvisoriesPanel advisories={advisories ?? []} loading={loading} />
      </div>
    </div>
  )
}

// ─── Section: Users ───────────────────────────────────────────────────────────

const EMPTY_USER_FORM = { fullName: '', email: '', password: '', role: 'FISHERMAN' }
const ROLES = ['FISHERMAN', 'VENDOR', 'ADMIN']

function UsersSection({ token }) {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState(EMPTY_USER_FORM)
  const [formError,  setFormError]  = useState(null)
  const [saving,     setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setUsers(await apiGet('/admin/users', token)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY_USER_FORM); setFormError(null); setModal({ mode: 'create' }) }
  function openEdit(u)  { setForm({ fullName: u.fullName, email: u.email, role: u.role, active: u.active }); setFormError(null); setModal({ mode: 'edit', data: u }) }
  function closeModal() { setModal(null); setFormError(null) }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setFormError(null)
    try {
      if (modal.mode === 'create') {
        await apiPost('/admin/users', token, { fullName: form.fullName, email: form.email, password: form.password, role: form.role })
      } else {
        await apiPut(`/admin/users/${modal.data.id}`, token, { fullName: form.fullName, email: form.email, role: form.role, active: form.active })
      }
      closeModal(); await load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  if (error) return (
    <div className="db-error" style={{ margin: '0 28px' }}>
      <AlertIcon /><span>{error}</span>
      <button className="db-error__retry" onClick={load}>Retry</button>
    </div>
  )

  return (
    <div style={{ padding: '0 28px 52px' }}>
      <SectionHeader
        title="Users"
        sub="Manage registered accounts across all roles"
        action={{ label: 'Create User', onClick: openCreate }}
      />

      <div className="adm-col-heads adm-users-cols">
        <span>ID</span><span>Full Name</span><span>Email</span>
        <span>Role</span><span>Status</span><span />
      </div>

      <div className="vd-listings-list">
        {loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 13, marginBottom: 6 }} />
          ))
        ) : users.length === 0 ? (
          <div className="vd-empty"><p>No users found.</p></div>
        ) : users.map(u => (
          <div key={u.id} className="vd-listing-row adm-users-cols">
            <p className="adm-id">#{u.id}</p>
            <p className="vd-listing-row__species">{u.fullName}</p>
            <p className="adm-email">{u.email}</p>
            <RoleBadge role={u.role} />
            <StatusChip active={u.active} />
            <div className="vd-actions">
              <button className="vd-btn vd-btn--edit" title="Edit" onClick={() => openEdit(u)}><EditIcon /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Create User' : `Edit User #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Create User' : 'Save Changes'}
          formError={formError}
        >
          <div className="vd-form__group">
            <label className="vd-form__label">Full Name</label>
            <input className="vd-form__input" type="text" required placeholder="e.g. Isidro Santos"
              value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="vd-form__group">
            <label className="vd-form__label">Email</label>
            <input className="vd-form__input" type="email" required placeholder="user@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          {modal.mode === 'create' && (
            <div className="vd-form__group">
              <label className="vd-form__label">Password</label>
              <input className="vd-form__input" type="password" required placeholder="Minimum 8 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          )}
          <div className="vd-form__row">
            <div className="vd-form__group">
              <label className="vd-form__label">Role</label>
              <select className="vd-form__select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {modal.mode === 'edit' && (
              <div className="vd-form__group">
                <label className="vd-form__label">Active</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
                  <input type="checkbox" className="adm-checkbox"
                    checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                </div>
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  )
}

// ─── Section: Advisories ──────────────────────────────────────────────────────

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const EMPTY_ADV_FORM = { title: '', message: '', severity: 'LOW', affectedArea: '', activeFrom: '', activeTo: '', isActive: true }

function AdvisoriesSection({ token }) {
  const [advisories,   setAdvisories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY_ADV_FORM)
  const [formError,    setFormError]    = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setAdvisories(await apiGet('/admin/advisories', token)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY_ADV_FORM); setFormError(null); setModal({ mode: 'create' }) }
  function openEdit(a) {
    setForm({
      title: a.title, message: a.message, severity: a.severity,
      affectedArea: a.affectedArea,
      activeFrom: a.activeFrom ? a.activeFrom.slice(0, 16) : '',
      activeTo:   a.activeTo   ? a.activeTo.slice(0, 16)   : '',
      isActive: a.isActive,
    })
    setFormError(null); setModal({ mode: 'edit', data: a })
  }
  function closeModal() { setModal(null); setFormError(null) }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setFormError(null)
    try {
      const body = {
        title: form.title, message: form.message, severity: form.severity,
        affectedArea: form.affectedArea,
        activeFrom: form.activeFrom ? new Date(form.activeFrom).toISOString() : undefined,
        activeTo:   form.activeTo   ? new Date(form.activeTo).toISOString()   : undefined,
      }
      if (modal.mode === 'create') {
        await apiPost('/admin/advisories', token, body)
      } else {
        await apiPut(`/admin/advisories/${modal.data.id}`, token, { ...body, isActive: form.isActive })
      }
      closeModal(); await load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await apiDelete(`/admin/advisories/${id}`, token); setConfirmDelete(null); await load() }
    catch (err) { setError(err.message) }
  }

  if (error) return (
    <div className="db-error" style={{ margin: '0 28px' }}>
      <AlertIcon /><span>{error}</span>
      <button className="db-error__retry" onClick={load}>Retry</button>
    </div>
  )

  return (
    <div style={{ padding: '0 28px 52px' }}>
      <SectionHeader
        title="Advisories"
        sub="Create and manage marine safety advisories"
        action={{ label: 'Create Advisory', onClick: openCreate }}
      />

      <div className="adm-col-heads adm-adv-cols">
        <span>ID</span><span>Title</span><span>Severity</span>
        <span>Area</span><span>Status</span><span>Created</span><span />
      </div>

      <div className="vd-listings-list">
        {loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 13, marginBottom: 6 }} />
          ))
        ) : advisories.length === 0 ? (
          <div className="vd-empty"><p>No advisories found.</p></div>
        ) : advisories.map(a => (
          <div key={a.id} className="vd-listing-row adm-adv-cols">
            <p className="adm-id">#{a.id}</p>
            <p className="vd-listing-row__species">{a.title}</p>
            <SeverityBadge severity={a.severity} />
            <p className="vd-listing-row__location">{a.affectedArea}</p>
            <StatusChip active={a.isActive} />
            <p className="vd-listing-row__deadline">{fmtDate(a.createdAt)}</p>
            <div className="vd-actions">
              {confirmDelete === a.id ? (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', marginRight: 4 }}>Sure?</span>
                  <button className="vd-btn vd-btn--delete" onClick={() => handleDelete(a.id)}>✓</button>
                  <button className="vd-btn" onClick={() => setConfirmDelete(null)}>✕</button>
                </>
              ) : (
                <>
                  <button className="vd-btn vd-btn--edit" title="Edit" onClick={() => openEdit(a)}><EditIcon /></button>
                  <button className="vd-btn vd-btn--delete" title="Delete" onClick={() => setConfirmDelete(a.id)}><TrashIcon /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Create Advisory' : `Edit Advisory #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Create Advisory' : 'Save Changes'}
          formError={formError}
        >
          <div className="vd-form__group">
            <label className="vd-form__label">Title</label>
            <input className="vd-form__input" type="text" required placeholder="Advisory title"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="vd-form__group">
            <label className="vd-form__label">Message</label>
            <textarea className="vd-form__textarea" required rows={4} placeholder="Detailed advisory message…"
              value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="vd-form__row">
            <div className="vd-form__group">
              <label className="vd-form__label">Severity</label>
              <select className="vd-form__select" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="vd-form__group">
              <label className="vd-form__label">Affected Area</label>
              <input className="vd-form__input" type="text" required placeholder="e.g. San Fernando Bay"
                value={form.affectedArea} onChange={e => setForm(f => ({ ...f, affectedArea: e.target.value }))} />
            </div>
          </div>
          <div className="vd-form__row">
            <div className="vd-form__group">
              <label className="vd-form__label">Active From</label>
              <input className="vd-form__input" type="datetime-local" required
                value={form.activeFrom} onChange={e => setForm(f => ({ ...f, activeFrom: e.target.value }))} />
            </div>
            <div className="vd-form__group">
              <label className="vd-form__label">Active To</label>
              <input className="vd-form__input" type="datetime-local" required
                value={form.activeTo} onChange={e => setForm(f => ({ ...f, activeTo: e.target.value }))} />
            </div>
          </div>
          {modal.mode === 'edit' && (
            <div className="vd-form__group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <label className="vd-form__label" style={{ margin: 0 }}>Active</label>
              <input type="checkbox" className="adm-checkbox"
                checked={!!form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            </div>
          )}
        </AdminModal>
      )}
    </div>
  )
}

// ─── Section: Fish Species ────────────────────────────────────────────────────

const EMPTY_SPECIES_FORM = { commonName: '' }

function FishSpeciesSection({ token }) {
  const [species,      setSpecies]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY_SPECIES_FORM)
  const [formError,    setFormError]    = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setSpecies(await apiGet('/lookups/fish-species', token)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY_SPECIES_FORM); setFormError(null); setModal({ mode: 'create' }) }
  function openEdit(s)  { setForm({ commonName: s.commonName }); setFormError(null); setModal({ mode: 'edit', data: s }) }
  function closeModal() { setModal(null); setFormError(null) }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setFormError(null)
    try {
      if (modal.mode === 'create') {
        await apiPost('/admin/fish-species', token, { commonName: form.commonName })
      } else {
        await apiPut(`/admin/fish-species/${modal.data.id}`, token, { commonName: form.commonName })
      }
      closeModal(); await load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await apiDelete(`/admin/fish-species/${id}`, token); setConfirmDelete(null); await load() }
    catch (err) { setError(err.message) }
  }

  if (error) return (
    <div className="db-error" style={{ margin: '0 28px' }}>
      <AlertIcon /><span>{error}</span>
      <button className="db-error__retry" onClick={load}>Retry</button>
    </div>
  )

  return (
    <div style={{ padding: '0 28px 52px' }}>
      <SectionHeader
        title="Fish Species"
        sub="Manage the catalog of fish species available for listings"
        action={{ label: 'Add Species', onClick: openCreate }}
      />

      <div className="adm-col-heads adm-species-cols">
        <span>ID</span><span>Common Name</span><span>Status</span><span />
      </div>

      <div className="vd-listings-list">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 13, marginBottom: 6 }} />
          ))
        ) : species.length === 0 ? (
          <div className="vd-empty"><p>No fish species found.</p></div>
        ) : species.map(s => (
          <div key={s.id} className="vd-listing-row adm-species-cols">
            <p className="adm-id">#{s.id}</p>
            <p className="vd-listing-row__species">{s.commonName}</p>
            <StatusChip active={s.active} />
            <div className="vd-actions">
              {confirmDelete === s.id ? (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', marginRight: 4 }}>Sure?</span>
                  <button className="vd-btn vd-btn--delete" onClick={() => handleDelete(s.id)}>✓</button>
                  <button className="vd-btn" onClick={() => setConfirmDelete(null)}>✕</button>
                </>
              ) : (
                <>
                  <button className="vd-btn vd-btn--edit" title="Edit" onClick={() => openEdit(s)}><EditIcon /></button>
                  <button className="vd-btn vd-btn--delete" title="Delete" onClick={() => setConfirmDelete(s.id)}><TrashIcon /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Add Fish Species' : `Edit Species #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Add Species' : 'Save Changes'}
          formError={formError}
        >
          <div className="vd-form__group">
            <label className="vd-form__label">Common Name</label>
            <input className="vd-form__input" type="text" required placeholder="e.g. Milkfish (Bangus)"
              value={form.commonName} onChange={e => setForm({ commonName: e.target.value })} />
          </div>
        </AdminModal>
      )}
    </div>
  )
}

// ─── Section: Market Locations ────────────────────────────────────────────────

const EMPTY_LOCATION_FORM = { name: '', municipality: '' }

function MarketLocationsSection({ token }) {
  const [locations,    setLocations]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY_LOCATION_FORM)
  const [formError,    setFormError]    = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setLocations(await apiGet('/lookups/market-locations', token)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY_LOCATION_FORM); setFormError(null); setModal({ mode: 'create' }) }
  function openEdit(loc) { setForm({ name: loc.name, municipality: loc.municipality }); setFormError(null); setModal({ mode: 'edit', data: loc }) }
  function closeModal()  { setModal(null); setFormError(null) }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setFormError(null)
    try {
      const body = { name: form.name, municipality: form.municipality }
      if (modal.mode === 'create') {
        await apiPost('/admin/market-locations', token, body)
      } else {
        await apiPut(`/admin/market-locations/${modal.data.id}`, token, body)
      }
      closeModal(); await load()
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await apiDelete(`/admin/market-locations/${id}`, token); setConfirmDelete(null); await load() }
    catch (err) { setError(err.message) }
  }

  if (error) return (
    <div className="db-error" style={{ margin: '0 28px' }}>
      <AlertIcon /><span>{error}</span>
      <button className="db-error__retry" onClick={load}>Retry</button>
    </div>
  )

  return (
    <div style={{ padding: '0 28px 52px' }}>
      <SectionHeader
        title="Market Locations"
        sub="Manage wet market locations in La Union"
        action={{ label: 'Add Location', onClick: openCreate }}
      />

      <div className="adm-col-heads adm-locations-cols">
        <span>ID</span><span>Market Name</span><span>Municipality</span><span>Status</span><span />
      </div>

      <div className="vd-listings-list">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 13, marginBottom: 6 }} />
          ))
        ) : locations.length === 0 ? (
          <div className="vd-empty"><p>No market locations found.</p></div>
        ) : locations.map(loc => (
          <div key={loc.id} className="vd-listing-row adm-locations-cols">
            <p className="adm-id">#{loc.id}</p>
            <p className="vd-listing-row__species">{loc.name}</p>
            <p className="vd-listing-row__location">{loc.municipality}</p>
            <StatusChip active={loc.active} />
            <div className="vd-actions">
              {confirmDelete === loc.id ? (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', marginRight: 4 }}>Sure?</span>
                  <button className="vd-btn vd-btn--delete" onClick={() => handleDelete(loc.id)}>✓</button>
                  <button className="vd-btn" onClick={() => setConfirmDelete(null)}>✕</button>
                </>
              ) : (
                <>
                  <button className="vd-btn vd-btn--edit" title="Edit" onClick={() => openEdit(loc)}><EditIcon /></button>
                  <button className="vd-btn vd-btn--delete" title="Delete" onClick={() => setConfirmDelete(loc.id)}><TrashIcon /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Add Market Location' : `Edit Location #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Add Location' : 'Save Changes'}
          formError={formError}
        >
          <div className="vd-form__group">
            <label className="vd-form__label">Market Name</label>
            <input className="vd-form__input" type="text" required placeholder="e.g. San Fernando Public Market"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="vd-form__group">
            <label className="vd-form__label">Municipality</label>
            <input className="vd-form__input" type="text" required placeholder="e.g. San Fernando, La Union"
              value={form.municipality} onChange={e => setForm(f => ({ ...f, municipality: e.target.value }))} />
          </div>
        </AdminModal>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const NAV_LABELS = {
  overview:   'Overview',
  users:      'Users',
  advisories: 'Advisories',
  species:    'Fish Species',
  locations:  'Market Locations',
}

const today = new Date().toLocaleDateString('en-PH', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

export default function AdminDashboard({ user, token, onLogout }) {
  const [activeNav, setActiveNav] = useState('overview')

  return (
    <div className="db-shell adm-shell">
      <AdminSidebar user={user} activeNav={activeNav} onNav={setActiveNav} onLogout={onLogout} />

      <main className="db-main">
        <div className="db-content">
          {/* ── Header ── */}
          <header className="db-header">
            <div>
              <h1 className="db-greeting">
                {greeting()}, <span className="db-greeting__name">{user?.fullName?.split(' ')[0] || 'Admin'}</span>
              </h1>
              <p className="db-date">{today} · {NAV_LABELS[activeNav]}</p>
            </div>
            <div className="db-header-right">
              <span className="adm-header-badge"><ShieldIcon /> Admin</span>
            </div>
          </header>

          {/* ── Section content ── */}
          {activeNav === 'overview'   && <OverviewSection token={token} />}
          {activeNav === 'users'      && <UsersSection token={token} />}
          {activeNav === 'advisories' && <AdvisoriesSection token={token} />}
          {activeNav === 'species'    && <FishSpeciesSection token={token} />}
          {activeNav === 'locations'  && <MarketLocationsSection token={token} />}
        </div>
      </main>
    </div>
  )
}
