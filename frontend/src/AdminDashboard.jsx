import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { I } from './icons'
import {
  fetchAdminUsers, updateAdminUser, createAdminUser,
  fetchAdminAdvisories, createAdvisory, updateAdvisory,
  fetchAdminSpecies, createSpecies, updateSpecies, deleteSpecies, reactivateSpecies,
  fetchAdminLocations, createLocation, updateLocation, deleteLocation, reactivateLocation,
  fetchAdminMetrics, fetchAdminDau, fetchAdminHealth, fetchAdminAuditLog,
} from './api/admin.js'
import './admin.css'
import './vendor/vendor-shell.css'

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function fmtAuditTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return `Yest. ${d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`
  return `${diffDays}d ago`
}

// ─── Inline Rail + Topbar from shell.jsx ─────────────────────────────────────

const ROLE_NAV = {
  ADMIN: {
    items: [
      { id: 'aoverview',   icon: 'Dashboard', label: 'Overview' },
      { id: 'ausers',      icon: 'Users',     label: 'Users' },
      { id: 'aadvisories', icon: 'Alert',     label: 'Advisories' },
      { id: 'aspecies',    icon: 'Fish',      label: 'Fish Species' },
      { id: 'aaudit',      icon: 'Clock',     label: 'Audit Log' },
    ],
    crumbLabel: 'Admin',
    pageLabels: {
      aoverview:   'Platform Overview',
      ausers:      'User Management',
      aadvisories: 'Advisories',
      aspecies:    'Fish Species',
      aaudit:      'Audit Log',
    },
  },
}

function Rail({ role, page, setPage, onLogout, user, advisoryBadge, onMouseEnter, onMouseLeave }) {
  const cfg = ROLE_NAV[role]
  const prevPageRef = useRef(page)

  useEffect(() => {
    if (prevPageRef.current === page) return
    prevPageRef.current = page
    const activeEl = document.querySelector('.admin-shell .rail-item--on')
    if (!activeEl) return
    gsap.fromTo(activeEl, { x: -4 }, { x: 0, duration: 0.18, ease: 'power2.out', clearProps: 'transform' })
  }, [page])

  return (
    <aside className="rail" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="rail__brand">
        <div className="rail__mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z"/>
            <path d="M18 12h.01"/>
            <path d="M6.5 12C4 12 1.5 9.5 2 6c.5-3 3-4 5 0"/>
          </svg>
        </div>
        <div className="rail__wordmark">
          <span className="rail__name">MERMAID<sup>®</sup></span>
          <span className="rail__role">Admin console</span>
        </div>
      </div>

      <div className="rail__group">Workspace</div>
      <div className="rail__list">
        {cfg.items.map(it => {
          const Icon = I[it.icon]
          return (
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => setPage(it.id)}
              title={it.label}
            >
              <span className="ric">{Icon && <Icon size={17} />}</span>
              <span className="rail-item__label">{it.label}</span>
              {it.id === 'aadvisories' && advisoryBadge > 0 ? (
                <span className="rail-item__count">{advisoryBadge}</span>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="rail__group" style={{ marginTop: 8 }}>Account</div>
      <div className="rail__list">
        <div className="rail-item" onClick={onLogout} title="Sign Out" style={{ cursor: 'pointer' }}>
          <span className="ric"><I.Logout size={17} /></span>
          <span className="rail-item__label">Sign Out</span>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ role, page, user }) {
  const cfg = ROLE_NAV[role]
  const label = cfg.pageLabels[page] || page
  const initials = user
    ? user.fullName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
    : 'SA'
  const displayName = user?.fullName?.split(' ')[0] || 'Admin'
  const placeholders = {
    FISHERMAN: 'Search trips, catches, vendors…',
    VENDOR:    'Search listings, fishermen, alerts…',
    BUYER:     'Search vendors, species, listings…',
    ADMIN:     'Search users, advisories, species…',
  }
  return (
    <div className="topbar">
      <div className="topbar__user">
        <div className="topbar__avatar">{initials}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>{user?.email || ''}</span>
            <span className="topbar__user-name">{displayName}</span>
          </div>
          <span className="topbar__user-role">ADMIN</span>
        </div>
      </div>
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder={placeholders[role]} />
        <kbd>⌘K</kbd>
      </div>
      <div className="crumbs" style={{ marginLeft: 'auto' }}>
        <span>Mermaid</span>
        <span className="sep">/</span>
        <span style={{ color: 'var(--ink-3)' }}>{cfg.crumbLabel}</span>
        <span className="sep">/</span>
        <strong>{label}</strong>
      </div>
      <button className="topbar__icon" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon" title="Help"><I.Help size={16} /></button>
    </div>
  )
}

// ─── Admin page components ────────────────────────────────────────────────────

function AdminOverviewPage({ setPage, user, metrics: metricsProp }) {
  const { data: M = {} } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: fetchAdminMetrics,
    initialData: metricsProp,
    enabled: !metricsProp,
  })
  const FALLBACK_DAU = [4,3,5,6,4,2,3,5,7,6,4,3,5,8,6,5,4,6,7,5,4,3,6,8,7,5,4,6,7,5].map((count,i) => ({ count, day: i }))
  const { data: dauRaw = [] } = useQuery({ queryKey: ['admin-dau'], queryFn: fetchAdminDau })
  const dau = dauRaw.length ? dauRaw : FALLBACK_DAU
  const { data: healthRaw = [] } = useQuery({ queryKey: ['admin-health'], queryFn: fetchAdminHealth })
  const health = [
    { name: 'PostgreSQL', status: 'OK', detail: 'p95 4ms · connection OK' },
    { name: 'Marine data (Open-Meteo)', status: 'OK', detail: 'HTTP 200 · connection OK' },
    { name: 'Storage', status: 'OK', detail: '34% used' },
    { name: 'Mail queue', status: 'OK', detail: '0 pending · nominal' },
    { name: 'WebSocket', status: 'OK', detail: 'Active' },
  ]
  const { data: audit = [] } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: () => fetchAdminAuditLog(null)
  })

  const max = dau.length ? Math.max(...dau.map(d => d.count), 1) : 1
  const firstName = user?.fullName?.split(' ')[0] || 'Admin'
  const STATUS_CLASS = { OK: 'safe', WARN: 'warn', DOWN: 'unsafe', N_A: 'inactive' }

  const metricCardsRef = useRef([])
  const metricsRef = useRef([])
  const dauBarsRef = useRef([])
  const roleBarFillsRef = useRef([])

  const pct = M.totalUsers ? Math.round((M.activeNow ?? 0) / M.totalUsers * 100) : 0

  const METRIC_VALUES = [
    M.totalUsers ?? 0,
    M.activeNow ?? 0,
    M.tripsToday ?? 0,
    M.ordersToday ?? 0,
    M.disputedOrders ?? 0,
    M.activeAdvisories ?? 0,
  ]

  useEffect(() => {
    const cards = metricCardsRef.current.filter(Boolean)
    if (!cards.length) return
    gsap.killTweensOf(cards)
    gsap.from(cards, {
      y: 20, opacity: 0, duration: 0.35, stagger: 0.06,
      ease: 'power2.out', clearProps: 'opacity,transform',
    })
    metricsRef.current.forEach((el, i) => {
      if (!el) return
      const obj = { v: 0 }
      gsap.killTweensOf(obj)
      gsap.to(obj, {
        v: METRIC_VALUES[i], duration: 0.9, delay: i * 0.06 + 0.15, ease: 'power2.out',
        onUpdate: () => { if (el) el.textContent = Math.round(obj.v).toLocaleString() },
      })
    })
    return () => {
      gsap.killTweensOf(cards)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M.totalUsers, M.activeNow, M.tripsToday, M.ordersToday, M.disputedOrders, M.activeAdvisories])

  useEffect(() => {
    const bars = dauBarsRef.current.filter(Boolean)
    if (!bars.length) return
    gsap.killTweensOf(bars)
    gsap.from(bars, {
      scaleY: 0, transformOrigin: 'bottom center',
      duration: 0.45, stagger: 0.015, ease: 'power2.out', clearProps: 'transform',
    })
    return () => gsap.killTweensOf(bars)
  }, [dau.length])

  useEffect(() => {
    const fills = roleBarFillsRef.current.filter(Boolean)
    if (!fills.length) return
    gsap.killTweensOf(fills)
    gsap.from(fills, {
      scaleX: 0, transformOrigin: 'left center',
      duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'transform',
    })
    return () => gsap.killTweensOf(fills)
  }, [M.totalUsers])

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Platform</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{firstName}</em></h1>
          <p className="page__sub">{M.activeNow ?? 0} users active today · {M.tripsToday ?? 0} trips · {M.ordersToday ?? 0} orders today.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Last 7 days</button>
          <button className="btn btn--primary" onClick={() => setPage('aadvisories')}>
            <I.Plus size={14} /> New advisory
          </button>
        </div>
      </div>

      {/* Metric card grid */}
      <div className="admin-metric-grid">
        {[
          { label: 'Total Users',   value: 0, sub: `+${M.newThisWeek ?? 0} this week`,    mod: '' },
          { label: 'Active Today',  value: 1, sub: `${pct}% of base`,                      mod: 'metric-card--spotlight' },
          { label: 'Trips Today',   value: 2, sub: `${M.activeTrips ?? 0} live now`,       mod: '' },
          { label: 'Orders Today',  value: 3, sub: `${M.totalOrders ?? 0} total`,          mod: '' },
          { label: 'Disputes',      value: 4, sub: 'Need review',                          mod: (M.disputedOrders ?? 0) > 0 ? 'metric-card--danger' : '' },
          { label: 'Advisories',    value: 5, sub: 'Active now',                           mod: '' },
        ].map((mc, i) => (
          <div key={mc.label}
            className={`metric-card anim-card${mc.mod ? ' ' + mc.mod : ''}`}
            ref={el => { metricCardsRef.current[i] = el }}
          >
            <div className="metric-card__label">{mc.label}</div>
            <div className="metric-card__value anim-metric" ref={el => { metricsRef.current[i] = el }}>0</div>
            <div className="metric-card__sub">{mc.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {/* Daily active users chart */}
        <div className="card card--chart">
          <div className="card__head">
            <div>
              <div className="card__title">Daily active <span className="lime-chip">users</span> · 30 days</div>
              <div className="card__sub">Average {Math.round(dau.reduce((a,d)=>a+d.count,0)/Math.max(dau.length,1))} DAU</div>
            </div>
            <div className="seg seg--sm">
              <button className="on">DAU</button>
              <button>Trips</button>
              <button>Orders</button>
            </div>
          </div>
          <div className="adm-dau-chart">
            {dau.map((d, i) => {
              const h = (d.count / max) * 100
              return (
                <div
                  key={i}
                  className={`adm-bar${i === dau.length - 1 ? ' adm-bar--latest' : ''}`}
                  style={{ height: `${h}%` }}
                  ref={el => { dauBarsRef.current[i] = el }}
                />
              )
            })}
          </div>
          <div className="dau-axis">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* User mix */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">User mix</div>
              <div className="card__sub">By role</div>
            </div>
          </div>
          <div className="role-bars">
            {[
              { name: 'Fishermen', count: M.fishermen ?? 0, color: 'oklch(0.55 0.09 220)' },
              { name: 'Vendors',   count: M.vendors ?? 0,   color: 'oklch(0.55 0.09 55)' },
              { name: 'Buyers',    count: M.buyers ?? 0, color: 'oklch(0.55 0.07 150)' },
              { name: 'Admins',    count: M.admins ?? 0,    color: 'oklch(0.50 0.10 330)' },
            ].map((r, ri) => {
              const pct = M.totalUsers ? (r.count / M.totalUsers) * 100 : 0
              return (
                <div key={r.name} className="role-bar">
                  <div className="role-bar__head">
                    <span>{r.name}</span>
                    <strong>{r.count.toLocaleString()}</strong>
                  </div>
                  <div className="role-bar__track">
                    <div className="role-bar__fill" style={{width: `${pct}%`, background: r.color}}
                      ref={el => { roleBarFillsRef.current[ri] = el }} />
                  </div>
                  <div className="role-bar__pct">{pct.toFixed(1)}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid--1-2" style={{marginTop: 18}}>
        {/* Health */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">System health</div>
              <div className="card__sub">{health.filter(h=>h.status==='OK').length}/{health.length} services nominal</div>
            </div>
          </div>
          <div className="health-list">
            {health.map(h => (
              <div key={h.name} className="health-item">
                <span className={`health-dot health-dot--${h.status.toLowerCase()}`} />
                <div className="health-item__body">
                  <div className="health-item__name">{h.name}</div>
                  <div className="health-item__detail">{h.detail}</div>
                </div>
                <span className={`chip chip--${STATUS_CLASS[h.status] || 'inactive'}`}>{h.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit feed */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent activity</div>
              <div className="card__sub">Audit log highlights</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setPage('aaudit')}>View all <I.Arrow size={11} /></button>
          </div>
          <table className="tbl tbl--audit">
            <tbody>
              {audit.slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td className="data" style={{color:'var(--ink-4)', width: 80}}>{fmtAuditTime(a.createdAt)}</td>
                  <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                  <td><strong>{a.actorName}</strong> {a.action}</td>
                  <td style={{color:'var(--ink-3)'}}>{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchAdminUsers })
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'FISHERMAN', password: '' })
  const [inviteErr, setInviteErr] = useState(null)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const roleSelectRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (roleSelectRef.current && !roleSelectRef.current.contains(event.target)) {
        setRoleDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function closeInvite() {
    setInviteOpen(false)
    setEditUser(null)
    setInviteForm({ fullName: '', email: '', role: 'FISHERMAN', password: '' })
    setInviteErr(null)
    setRoleDropdownOpen(false)
  }

  function openEdit(u) {
    setEditUser(u)
    setInviteForm({ fullName: u.fullName, email: u.email, role: u.role, password: '' })
    setInviteOpen(true)
  }

  const filtered = users.filter(u => {
    const m = !search || u.fullName.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase())
    const t = tab === 'all' || u.role === tab.toUpperCase()
    return m && t
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => updateAdminUser(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  })
  const toggleActive = (u) => toggleMutation.mutate({ id: u.id, active: !u.active })

  const inviteMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      closeInvite()
    },
    onError: (e) => setInviteErr(e.message)
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setInviteErr(null)
    if (editUser) {
      try {
        await updateAdminUser(editUser.id, {
          fullName: inviteForm.fullName,
          email: inviteForm.email,
          role: inviteForm.role
        })
        qc.invalidateQueries({ queryKey: ['admin-users'] })
        closeInvite()
      } catch (err) {
        setInviteErr(err.message)
      }
    } else {
      inviteMutation.mutate(inviteForm)
    }
  }

  return (
    <div className="page">
      {inviteOpen && createPortal(
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && closeInvite()}>
          <div className="trip-modal">
            <div className="trip-modal__header">
              <h2 className="trip-modal__title">{editUser ? 'Edit user' : 'Invite user'}</h2>
              <button className="trip-modal__close" onClick={closeInvite}>✕</button>
            </div>
            <form className="trip-form" onSubmit={handleSubmit}>
              {inviteErr && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{inviteErr}</p>}
              <label className="trip-form__label">Full name *
                <input className="trip-form__input" value={inviteForm.fullName}
                  onChange={e => setInviteForm(f => ({...f, fullName: e.target.value}))} required />
              </label>
              <label className="trip-form__label">Email *
                <input type="email" className="trip-form__input" value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} required />
              </label>
              <div className="trip-form__label" style={{ position: 'relative' }}>Role *
                <div className={`custom-select-container ${roleDropdownOpen ? 'custom-select-container--open' : ''}`} ref={roleSelectRef}>
                  <button
                    type="button"
                    className="trip-form__input custom-select-trigger"
                    onClick={(e) => {
                      e.preventDefault();
                      setRoleDropdownOpen(!roleDropdownOpen);
                    }}
                  >
                    <span>
                      {inviteForm.role ? inviteForm.role.charAt(0) + inviteForm.role.slice(1).toLowerCase() : "Select role..."}
                    </span>
                    <span className="custom-select-arrow">▼</span>
                  </button>
                  {roleDropdownOpen && (
                    <div className="custom-select-options">
                      {[
                        { value: 'FISHERMAN', label: 'Fisherman' },
                        { value: 'VENDOR', label: 'Vendor' },
                        { value: 'BUYER', label: 'Buyer' },
                        { value: 'ADMIN', label: 'Admin' }
                      ].map(opt => (
                        <div
                          key={opt.value}
                          className={`custom-select-option${inviteForm.role === opt.value ? ' custom-select-option--selected' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setInviteForm(f => ({ ...f, role: opt.value }));
                            setRoleDropdownOpen(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {!editUser && (
                <label className="trip-form__label">Password *
                  <input type="password" className="trip-form__input" value={inviteForm.password}
                    onChange={e => setInviteForm(f => ({...f, password: e.target.value}))} required minLength={8} />
                </label>
              )}
              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={closeInvite}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">{editUser ? 'Save changes' : 'Invite'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('admin-modal-root') || document.body
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Users</div>
          <h1 className="page__title" style={{marginTop: 4}}>User <span className="lime-chip">Management</span></h1>
          <p className="page__sub">{users.length} accounts · {users.filter(u=>u.active).length} active.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={() => setInviteOpen(true)}><I.Plus size={14} /> Invite user</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='all'?'on':''} onClick={()=>setTab('all')}>All ({users.length})</button>
            <button className={tab==='fisherman'?'on':''} onClick={()=>setTab('fisherman')}>Fishermen ({users.filter(u=>u.role==='FISHERMAN').length})</button>
            <button className={tab==='vendor'?'on':''} onClick={()=>setTab('vendor')}>Vendors ({users.filter(u=>u.role==='VENDOR').length})</button>
            <button className={tab==='admin'?'on':''} onClick={()=>setTab('admin')}>Admins ({users.filter(u=>u.role==='ADMIN').length})</button>
          </div>
          <div className="search-input" style={{minWidth: 220}}>
            <I.Search size={13} />
            <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
        ) : (
          <table className="tbl tbl--users">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Activity</th><th>Joined</th><th>Last seen</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="row--link">
                  <td>
                    <div className="row" style={{gap: 10}}>
                      <div className="user-avatar">{u.fullName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{fontWeight: 500}}>{u.fullName}</div>
                        <small style={{color:'var(--ink-4)'}}>{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td><span className={`role-pill role-pill--${u.role.toLowerCase()}`}>{u.role}</span></td>
                  <td className="data">—</td>
                  <td className="data" style={{color:'var(--ink-4)'}}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH') : '—'}
                  </td>
                  <td style={{color:'var(--ink-4)'}}>{relativeTime(u.lastLoginAt)}</td>
                  <td>
                    <span className={`status status--${u.active ? 'active' : 'inactive'}`}>
                      <span className="status__dot" /> {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(u)} style={{ gap: 4 }}>
                        <I.Edit size={12} /> Edit
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{
                          color: u.active ? 'var(--adm-danger)' : 'var(--adm-safe)',
                          borderColor: u.active ? 'rgba(251,113,133,0.18)' : 'rgba(110,231,183,0.18)',
                          background: u.active ? 'rgba(251,113,133,0.04)' : 'rgba(110,231,183,0.04)',
                          gap: 4
                        }}
                        onClick={() => toggleActive(u)}
                      >
                        {u.active ? <I.X size={12} /> : <I.Check size={12} />}
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const FISHING_ZONES = [
  "Whole La Union",
  "Agoo",
  "Aringay",
  "Bacnotan",
  "Balaoan",
  "Bangar",
  "Bauang",
  "Caba",
  "City of San Fernando",
  "Luna",
  "Rosario",
  "San Juan",
  "Sto. Tomas"
]

function CustomDateTimePicker({ value, onChange, dateOnly = false }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  
  const dateObj = value ? new Date(value) : new Date()
  const isDateValid = value && !isNaN(dateObj.getTime())
  
  const [viewMonth, setViewMonth] = useState(dateObj.getMonth())
  const [viewYear, setViewYear] = useState(dateObj.getFullYear())
  
  const selectedDay = isDateValid ? dateObj.getDate() : null
  const selectedMonth = isDateValid ? dateObj.getMonth() : null
  const selectedYear = isDateValid ? dateObj.getFullYear() : null
  
  const now = new Date()
  const rawHours = isDateValid ? dateObj.getHours() : now.getHours()
  const ampm = rawHours >= 12 ? 'PM' : 'AM'
  const displayHours = rawHours % 12 === 0 ? 12 : rawHours % 12
  const displayMinutes = isDateValid ? dateObj.getMinutes() : now.getMinutes()
  
  const [hourInput, setHourInput] = useState(displayHours)
  const [minuteInput, setMinuteInput] = useState(displayMinutes)
  const [ampmState, setAmpmState] = useState(ampm)

  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth())
        setViewYear(d.getFullYear())
        const h = d.getHours()
        setHourInput(h % 12 === 0 ? 12 : h % 12)
        setMinuteInput(d.getMinutes())
        setAmpmState(h >= 12 ? 'PM' : 'AM')
      }
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const updateDateTime = (day, month = viewMonth, year = viewYear, hr = hourInput, min = minuteInput, am = ampmState) => {
    if (!day) return
    if (dateOnly) {
      const newDate = new Date(year, month, day)
      const yyyy = newDate.getFullYear()
      const mm = String(newDate.getMonth() + 1).padStart(2, '0')
      const dd = String(newDate.getDate()).padStart(2, '0')
      onChange(`${yyyy}-${mm}-${dd}`)
    } else {
      let finalHour = parseInt(hr) || 12
      if (am === 'PM' && finalHour < 12) finalHour += 12
      if (am === 'AM' && finalHour === 12) finalHour = 0
      const finalMin = parseInt(min) || 0
      
      const newDate = new Date(year, month, day, finalHour, finalMin)
      const yyyy = newDate.getFullYear()
      const mm = String(newDate.getMonth() + 1).padStart(2, '0')
      const dd = String(newDate.getDate()).padStart(2, '0')
      const hh = String(newDate.getHours()).padStart(2, '0')
      const m = String(newDate.getMinutes()).padStart(2, '0')
      onChange(`${yyyy}-${mm}-${dd}T${hh}:${m}`)
    }
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
  
  const cells = []
  
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthDays - i,
      month: viewMonth === 0 ? 11 : viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear,
      isCurrentMonth: false
    })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true
    })
  }
  
  const totalCells = 42
  const nextMonthPadding = totalCells - cells.length
  for (let i = 1; i <= nextMonthPadding; i++) {
    cells.push({
      day: i,
      month: viewMonth === 11 ? 0 : viewMonth + 1,
      year: viewMonth === 11 ? viewYear + 1 : viewYear,
      isCurrentMonth: false
    })
  }

  const formatDateDisplay = () => {
    if (!value) return dateOnly ? "Select date..." : "Select date & time..."
    const d = new Date(value)
    if (isNaN(d.getTime())) return dateOnly ? "Select date..." : "Select date & time..."
    if (dateOnly) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className={`custom-picker ${open ? 'custom-picker--open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="trip-form__input custom-picker-trigger"
        onClick={() => setOpen(!open)}
      >
        <span>{formatDateDisplay()}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="custom-picker-popover">
          <div className="picker-header">
            <button type="button" className="picker-nav-btn" onClick={prevMonth}>&lt;</button>
            <span className="picker-month-title">{monthNames[viewMonth]} {viewYear}</span>
            <button type="button" className="picker-nav-btn" onClick={nextMonth}>&gt;</button>
          </div>

          <div className="picker-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <span key={d} className="picker-weekday">{d}</span>
            ))}
          </div>

          <div className="picker-days-grid">
            {cells.map((cell, idx) => {
              const isSelected = selectedDay === cell.day && selectedMonth === cell.month && selectedYear === cell.year
              const isToday = () => {
                const today = new Date()
                return today.getDate() === cell.day && today.getMonth() === cell.month && today.getFullYear() === cell.year
              }
              
              return (
                <button
                  key={idx}
                  type="button"
                  className={`picker-day-btn ${!cell.isCurrentMonth ? 'picker-day-btn--outside' : ''} ${isSelected ? 'picker-day-btn--selected' : ''} ${isToday() ? 'picker-day-btn--today' : ''}`}
                  onClick={() => {
                    updateDateTime(cell.day, cell.month, cell.year)
                  }}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {!dateOnly ? (
            <div className="picker-time-footer">
              <span className="picker-time-label">Time:</span>
              <div className="picker-time-inputs">
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="picker-time-field"
                  value={String(hourInput).padStart(2, '0')}
                  onChange={e => {
                    let rawVal = e.target.value
                    if (rawVal.length > 2) rawVal = rawVal.slice(-2)
                    const val = Math.min(12, Math.max(1, parseInt(rawVal) || 1))
                    setHourInput(val)
                    const day = selectedDay || now.getDate()
                    const month = selectedMonth !== null ? selectedMonth : now.getMonth()
                    const year = selectedYear || now.getFullYear()
                    updateDateTime(day, month, year, val, minuteInput, ampmState)
                  }}
                />
                <span className="picker-time-separator">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="picker-time-field"
                  value={String(minuteInput).padStart(2, '0')}
                  onChange={e => {
                    let rawVal = e.target.value
                    if (rawVal.length > 2) rawVal = rawVal.slice(-2)
                    const val = Math.min(59, Math.max(0, parseInt(rawVal) || 0))
                    setMinuteInput(val)
                    const day = selectedDay || now.getDate()
                    const month = selectedMonth !== null ? selectedMonth : now.getMonth()
                    const year = selectedYear || now.getFullYear()
                    updateDateTime(day, month, year, hourInput, val, ampmState)
                  }}
                />
                <button
                  type="button"
                  className="picker-ampm-btn"
                  onClick={() => {
                    const val = ampmState === 'AM' ? 'PM' : 'AM'
                    setAmpmState(val)
                    const day = selectedDay || now.getDate()
                    const month = selectedMonth !== null ? selectedMonth : now.getMonth()
                    const year = selectedYear || now.getFullYear()
                    updateDateTime(day, month, year, hourInput, minuteInput, val)
                  }}
                >
                  {ampmState}
                </button>
              </div>
              <button
                type="button"
                className="picker-close-btn"
                onClick={() => setOpen(false)}
              >
                OK
              </button>
            </div>
          ) : (
            <div className="picker-time-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="picker-close-btn"
                onClick={() => setOpen(false)}
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminAdvisoriesPage() {
  const qc = useQueryClient()
  const { data: advisories = [] } = useQuery({ queryKey: ['admin-advisories'], queryFn: fetchAdminAdvisories })
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [editAdvisory, setEditAdvisory] = useState(null)
  const [form, setForm] = useState({ title:'', message:'', severity:'MEDIUM', affectedArea:'', activeFrom:'', activeTo:'' })
  const [err, setErr] = useState(null)
  const [confirmEnd, setConfirmEnd] = useState(null)
  const [endLoading, setEndLoading] = useState(false)
  
  // Custom dropdown state and ref
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false)
  const selectRef = useRef(null)
  const [severityDropdownOpen, setSeverityDropdownOpen] = useState(false)
  const severitySelectRef = useRef(null)

  // Redesign state parameters
  const [selectedZoneFilter, setSelectedZoneFilter] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [telemetryLogs, setTelemetryLogs] = useState([])

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setZoneDropdownOpen(false)
      }
      if (severitySelectRef.current && !severitySelectRef.current.contains(event.target)) {
        setSeverityDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  // Redesigned Date UX state parameters
  const [startMode, setStartMode] = useState('now') // 'now' | 'scheduled'
  const [durationPreset, setDurationPreset] = useState('24h') // '2h' | '6h' | '12h' | '24h' | '3d' | '7d' | 'custom'

  const sevColor = { LOW: 'var(--adm-ink-muted)', MEDIUM: 'var(--adm-warn)', HIGH: 'var(--adm-danger)', CRITICAL: 'var(--adm-danger)' }
  const activeAdvisories = advisories.filter(a => a.isActive)
  const activeCount = activeAdvisories.length

  const hasWholeLaUnionActive = activeAdvisories.some(a => a.affectedArea === 'Whole La Union')
  const affectedZonesList = hasWholeLaUnionActive
    ? FISHING_ZONES.slice(1)
    : Array.from(new Set(activeAdvisories.map(a => a.affectedArea).filter(z => z && z !== 'Whole La Union')))
  const affectedZonesCount = hasWholeLaUnionActive ? 12 : affectedZonesList.length

  let highestActiveSeverity = 'CLEAR'
  if (activeAdvisories.some(a => a.severity === 'CRITICAL')) {
    highestActiveSeverity = 'CRITICAL'
  } else if (activeAdvisories.some(a => a.severity === 'HIGH')) {
    highestActiveSeverity = 'HIGH'
  } else if (activeAdvisories.some(a => a.severity === 'MEDIUM')) {
    highestActiveSeverity = 'MEDIUM'
  } else if (activeAdvisories.some(a => a.severity === 'LOW')) {
    highestActiveSeverity = 'LOW'
  }

  // Telemetry logs generator
  useEffect(() => {
    const now = new Date()
    const formatTime = (minusMins) => {
      const d = new Date(now.getTime() - minusMins * 60 * 1000)
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
    const initialLogs = [
      { time: formatTime(25), text: 'System initialized: EOC Broadcast System Online.' },
      { time: formatTime(20), text: 'VHF Transceiver CH16 handshake status: OK (Carrier strength: 98%).' },
      { time: formatTime(15), text: 'SMS API Gateway link established: SMART & GLOBE carriers synced.' },
      { time: formatTime(10), text: `Database scan complete: Found ${advisories.length} historical advisories.` }
    ]
    
    activeAdvisories.forEach((adv, idx) => {
      initialLogs.push({
        time: formatTime(5 - idx),
        text: `ACTIVE BROADCAST: Advisory "${adv.title}" broadcasting to sector [${adv.affectedArea}].`
      })
    })
    setTelemetryLogs(initialLogs.slice(-6))
  }, [advisories.length, activeCount])

  function getRemainingTimeStr(activeTo) {
    const diff = new Date(activeTo).getTime() - new Date().getTime()
    if (diff <= 0) return 'Expired'
    const hrs = Math.floor(diff / (3600 * 1000))
    const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
    if (hrs > 24) {
      const days = Math.floor(hrs / 24)
      const remainHrs = hrs % 24
      return `${days}d ${remainHrs}h remaining`
    }
    return `${hrs}h ${mins}m remaining`
  }

  function getElapsedPercent(activeFrom, activeTo) {
    const start = new Date(activeFrom).getTime()
    const end = new Date(activeTo).getTime()
    const now = new Date().getTime()
    if (end <= start) return 100
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
  }

  const filtered = advisories.filter(a => tab === 'active' ? a.isActive : !a.isActive)
  const finalFiltered = filtered.filter(a => {
    const matchesSearch = searchQuery
      ? (a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.message.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
    const matchesZone = selectedZoneFilter
      ? (a.affectedArea === selectedZoneFilter || a.affectedArea === 'Whole La Union')
      : true
    return matchesSearch && matchesZone
  })

  function getDurationMs(preset) {
    const hour = 60 * 60 * 1000
    const day = 24 * hour
    switch (preset) {
      case '2h': return 2 * hour
      case '6h': return 6 * hour
      case '12h': return 12 * hour
      case '24h': return day
      case '3d': return 3 * day
      case '7d': return 7 * day
      default: return 0
    }
  }

  function formatPreviewDate(dateStr) {
    if (!dateStr) return '...'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '...'
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getDurationLabel(startMode, durationPreset, from, to) {
    if (durationPreset !== 'custom') {
      switch (durationPreset) {
        case '2h': return '2 hours'
        case '6h': return '6 hours'
        case '12h': return '12 hours'
        case '24h': return '24 hours (1 day)'
        case '3d': return '3 days'
        case '7d': return '7 days'
        default: return ''
      }
    }
    if (!from || !to) return 'custom duration'
    const diff = new Date(to).getTime() - new Date(from).getTime()
    if (isNaN(diff) || diff <= 0) return 'invalid duration'
    const hours = Math.round(diff / (60 * 60 * 1000))
    if (hours < 24) return `${hours} hours`
    const days = Math.round(hours / 24)
    return `${days} days`
  }

  function openNew() {
    setEditAdvisory(null)
    const nowStr = new Date().toISOString().slice(0, 16)
    setForm({ title:'', message:'', severity:'MEDIUM', affectedArea:'Whole La Union', activeFrom: nowStr, activeTo:'' })
    setStartMode('now')
    setDurationPreset('24h')
    setErr(null)
    setShowForm(true)
  }

  function openEdit(a) {
    setEditAdvisory(a)
    setForm({
      title: a.title, message: a.message, severity: a.severity,
      affectedArea: a.affectedArea,
      activeFrom: a.activeFrom ? a.activeFrom.slice(0,16) : '',
      activeTo: a.activeTo ? a.activeTo.slice(0,16) : '',
    })
    setStartMode('scheduled')
    setDurationPreset('custom')
    setErr(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr(null)
    try {
      if (!form.affectedArea) {
        throw new Error('Please select an affected area.')
      }
      const computedFrom = startMode === 'now' 
        ? new Date().toISOString() 
        : (form.activeFrom ? new Date(form.activeFrom).toISOString() : new Date().toISOString())
      
      let computedTo = ''
      if (durationPreset !== 'custom') {
        const baseTime = new Date(computedFrom)
        computedTo = new Date(baseTime.getTime() + getDurationMs(durationPreset)).toISOString()
      } else {
        computedTo = form.activeTo ? new Date(form.activeTo).toISOString() : ''
      }

      if (!computedTo) {
        throw new Error('Please specify an active end time.')
      }
      if (new Date(computedTo).getTime() <= new Date(computedFrom).getTime()) {
        throw new Error('End time must be after start time.')
      }

      const body = {
        ...form,
        activeFrom: computedFrom,
        activeTo: computedTo,
      }
      if (editAdvisory) {
        await updateAdvisory(editAdvisory.id, body)
      } else {
        await createAdvisory(body)
      }
      qc.invalidateQueries({ queryKey: ['admin-advisories'] })
      qc.invalidateQueries({ queryKey: ['admin-metrics'] })
      setShowForm(false)
    } catch(e) { setErr(e.message) }
  }

  function endNow(a) {
    setConfirmEnd(a)
  }

  async function confirmEndAdvisory() {
    if (!confirmEnd) return
    setEndLoading(true)
    try {
      await updateAdvisory(confirmEnd.id, { isActive: false, activeTo: new Date().toISOString() })
      qc.invalidateQueries({ queryKey: ['admin-advisories'] })
      qc.invalidateQueries({ queryKey: ['admin-metrics'] })
      setConfirmEnd(null)
    } catch(e) {
      setErr(e.message)
    } finally {
      setEndLoading(false)
    }
  }

  const computedFrom = startMode === 'now' 
    ? new Date().toISOString() 
    : (form.activeFrom ? new Date(form.activeFrom).toISOString() : '')
  const computedTo = durationPreset !== 'custom'
    ? (computedFrom ? new Date(new Date(computedFrom).getTime() + getDurationMs(durationPreset)).toISOString() : '')
    : (form.activeTo ? new Date(form.activeTo).toISOString() : '')

  return (
    <div className="page">
      {confirmEnd && createPortal(
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && !endLoading && setConfirmEnd(null)}>
          <div className="confirm-dialog">
            <div className="confirm-dialog__icon confirm-dialog__icon--danger">
              <I.Alert size={24} />
            </div>
            <h3 className="confirm-dialog__title">End broadcast now?</h3>
            <p className="confirm-dialog__message">
              Advisory <strong>"{confirmEnd.title}"</strong> will stop broadcasting to all affected sectors immediately. This action moves the alert to the historical log.
            </p>
            <div className="confirm-dialog__meta">
              <span><I.MapPin size={12} /> {confirmEnd.affectedArea}</span>
              <span className={`confirm-dialog__sev confirm-dialog__sev--${confirmEnd.severity.toLowerCase()}`}>{confirmEnd.severity}</span>
            </div>
            <div className="confirm-dialog__actions">
              <button className="btn btn--ghost" onClick={() => setConfirmEnd(null)} disabled={endLoading}>Cancel</button>
              <button className="btn btn--danger" onClick={confirmEndAdvisory} disabled={endLoading}>
                {endLoading ? 'Ending…' : 'End broadcast'}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('admin-modal-root') || document.body
      )}

      {showForm && createPortal(
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="trip-modal">
            <div className="trip-modal__header">
              <h2 className="trip-modal__title">{editAdvisory ? 'Edit advisory' : 'New advisory'}</h2>
              <button className="trip-modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="trip-form" onSubmit={handleSubmit}>
              {err && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{err}</p>}
              
              <label className="trip-form__label">Title *
                <input className="trip-form__input" value={form.title}
                  onChange={e => setForm(f=>({...f,title:e.target.value}))} required />
              </label>
              
              <label className="trip-form__label">Message *
                <textarea className="trip-form__input" value={form.message}
                  onChange={e => setForm(f=>({...f,message:e.target.value}))} required rows={3} />
              </label>

              <div className="trip-form__row trip-form__row--2col">
                <div className="trip-form__label" style={{ position: 'relative' }}>Severity *
                  <div className={`custom-select-container ${severityDropdownOpen ? 'custom-select-container--open' : ''}`} ref={severitySelectRef}>
                    <button
                      type="button"
                      className="trip-form__input custom-select-trigger"
                      onClick={(e) => {
                        e.preventDefault();
                        setSeverityDropdownOpen(!severityDropdownOpen);
                      }}
                    >
                      <span>{form.severity ? form.severity.charAt(0) + form.severity.slice(1).toLowerCase() : "Select severity..."}</span>
                      <span className="custom-select-arrow">▼</span>
                    </button>
                    {severityDropdownOpen && (
                      <div className="custom-select-options">
                        {[
                          { value: 'LOW', label: 'Low' },
                          { value: 'MEDIUM', label: 'Medium' },
                          { value: 'HIGH', label: 'High' },
                          { value: 'CRITICAL', label: 'Critical' }
                        ].map(opt => (
                          <div
                            key={opt.value}
                            className={`custom-select-option${form.severity === opt.value ? ' custom-select-option--selected' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setForm(f=>({...f,severity:opt.value}));
                              setSeverityDropdownOpen(false);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="trip-form__label" style={{ position: 'relative' }}>Affected area *
                  <div className={`custom-select-container ${zoneDropdownOpen ? 'custom-select-container--open' : ''}`} ref={selectRef}>
                    <button
                      type="button"
                      className="trip-form__input custom-select-trigger"
                      onClick={(e) => {
                        e.preventDefault();
                        setZoneDropdownOpen(!zoneDropdownOpen);
                      }}
                    >
                      <span>{form.affectedArea || "Select affected area..."}</span>
                      <span className="custom-select-arrow">▼</span>
                    </button>
                    {zoneDropdownOpen && (
                      <div className="custom-select-options">
                        {FISHING_ZONES.map(z => (
                          <div
                            key={z}
                            className={`custom-select-option${form.affectedArea === z ? ' custom-select-option--selected' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setForm(f=>({...f,affectedArea:z}));
                              setZoneDropdownOpen(false);
                            }}
                          >
                            {z}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="trip-form__group">
                <span className="trip-form__group-title">Start Broadcast</span>
                <div className="preset-selector">
                  <button
                    type="button"
                    className={`preset-btn ${startMode === 'now' ? 'active' : ''}`}
                    onClick={() => {
                      setStartMode('now')
                      const nowStr = new Date().toISOString().slice(0, 16)
                      setForm(f => ({ ...f, activeFrom: nowStr }))
                    }}
                  >
                    Immediately (Now)
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${startMode === 'scheduled' ? 'active' : ''}`}
                    onClick={() => setStartMode('scheduled')}
                  >
                    Schedule Start
                  </button>
                </div>
              </div>

              {startMode === 'scheduled' && (
                <label className="trip-form__label trip-form__animate-in">Active from *
                  <CustomDateTimePicker
                    value={form.activeFrom}
                    onChange={val => setForm(f=>({...f,activeFrom:val}))}
                  />
                </label>
              )}

              <div className="trip-form__group">
                <span className="trip-form__group-title">Duration</span>
                <div className="preset-selector">
                  {[
                    { label: '2h', value: '2h' },
                    { label: '6h', value: '6h' },
                    { label: '12h', value: '12h' },
                    { label: '24h', value: '24h' },
                    { label: '3d', value: '3d' },
                    { label: '7d', value: '7d' },
                    { label: 'Custom', value: 'custom' },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      className={`preset-btn ${durationPreset === p.value ? 'active' : ''}`}
                      onClick={() => setDurationPreset(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {durationPreset === 'custom' && (
                <label className="trip-form__label trip-form__animate-in">Active to *
                  <CustomDateTimePicker
                    value={form.activeTo}
                    onChange={val => setForm(f=>({...f,activeTo:val}))}
                  />
                </label>
              )}

              <div className="advisory-schedule-preview">
                <div className="preview-icon"><I.Clock size={16} /></div>
                <div className="preview-details">
                  <div className="preview-header">Broadcast Period</div>
                  <div className="preview-times">
                    <span className="time-start">{formatPreviewDate(computedFrom)}</span>
                    <span className="time-arrow">→</span>
                    <span className="time-end">{formatPreviewDate(computedTo)}</span>
                  </div>
                  <div className="preview-duration">
                    Active for {getDurationLabel(startMode, durationPreset, computedFrom, computedTo)}
                  </div>
                </div>
              </div>

              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">{editAdvisory ? 'Save changes' : 'Post advisory'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('admin-modal-root') || document.body
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Safety</div>
          <h1 className="page__title" style={{marginTop: 4}}>Marine <span className="lime-chip">Advisories</span></h1>
          <p className="page__sub">{advisories.filter(a=>a.isActive).length} active advisories broadcasting to fishermen and vendors.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={openNew}><I.Plus size={14} /> New advisory</button>
        </div>
      </div>

      {/* EOC KPI Dashboard metrics */}
      <div className="eoc-kpi-grid">
        <div className="eoc-kpi-card">
          <div className="eoc-kpi-header">
            <span className="eoc-kpi-title">SYSTEM STATUS</span>
            <span className={`eoc-kpi-dot ${activeCount > 0 ? 'eoc-kpi-dot--pulsing-active' : 'eoc-kpi-dot--nominal'}`} />
          </div>
          <div className="eoc-kpi-value">
            {activeCount > 0 ? 'ALERT ACTIVE' : 'NOMINAL / IDLE'}
          </div>
          <div className="eoc-kpi-subtext">SMS Broadcast Queue: Sync</div>
        </div>

        <div className="eoc-kpi-card">
          <div className="eoc-kpi-header">
            <span className="eoc-kpi-title">THREAT LEVEL MATRIX</span>
          </div>
          <div className={`eoc-kpi-value eoc-kpi-value--severity-${highestActiveSeverity.toLowerCase()}`}>
            {highestActiveSeverity}
          </div>
          <div className="eoc-kpi-subtext">Max severity threshold</div>
        </div>

        <div className="eoc-kpi-card">
          <div className="eoc-kpi-header">
            <span className="eoc-kpi-title">BROADCAST SECTORS</span>
          </div>
          <div className="eoc-kpi-value">
            {affectedZonesCount} / 12
          </div>
          <div className="eoc-kpi-subtext">La Union fishing areas</div>
        </div>

        <div className="eoc-kpi-card">
          <div className="eoc-kpi-header">
            <span className="eoc-kpi-title">VHF SIGNAL LINK</span>
          </div>
          <div className="eoc-kpi-value">
            CH16 ACTIVE
          </div>
          <div className="eoc-kpi-subtext">Vessel channel broadcasting</div>
        </div>
      </div>

      {/* Split Screen Dashboard */}
      <div className="advisories-dashboard-layout">
        {/* Left Side: Broadcast Feeds */}
        <div className="advisories-main-panel">
          <div className="card">
            <div className="card__head" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="seg">
                <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active Alerts ({advisories.filter(a=>a.isActive).length})</button>
                <button className={tab==='archive'?'on':''} onClick={()=>setTab('archive')}>Historical Log ({advisories.filter(a=>!a.isActive).length})</button>
              </div>
            </div>

            {/* Filter and Search Bar inside Main Panel */}
            <div style={{ padding: '0 24px', marginTop: 14 }}>
              <div className="search-input" style={{ width: '100%' }}>
                <I.Search size={14} style={{ opacity: 0.6 }} />
                <input
                  type="text"
                  placeholder="Search broadcast feeds..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--adm-ink-muted)', cursor: 'pointer' }}>
                    ✕
                  </button>
                )}
              </div>

              {selectedZoneFilter && (
                <div className="advisories-filter-bar">
                  <div className="advisories-active-filter-badge">
                    <span>Filtering Zone: <strong>{selectedZoneFilter}</strong></span>
                    <button onClick={() => setSelectedZoneFilter(null)}>
                      <I.X size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="advisory-list" style={{ marginTop: 14 }}>
              {finalFiltered.map(a => {
                const percent = getElapsedPercent(a.activeFrom, a.activeTo)
                const isSevHigh = a.severity === 'HIGH' || a.severity === 'CRITICAL'
                const progressFillClass = isSevHigh ? 'advisory-progress-fill--alert-high' : ''

                return (
                  <div key={a.id} className={`advisory-item advisory-item--${a.severity.toLowerCase()}`}>
                    <div className="advisory-item__body">
                      <div className="advisory-item__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {a.title}
                            {a.isActive ? (
                              <span className="advisory-card-broadcast-status advisory-card-broadcast-status--pulsing">
                                Broadcasting
                              </span>
                            ) : (
                              <span className="advisory-card-broadcast-status" style={{ color: 'var(--adm-ink-muted)', background: 'rgba(255,255,255,0.06)' }}>
                                Expired
                              </span>
                            )}
                          </h3>
                          <span className="chip" style={{ marginTop: 6, display: 'inline-block' }}>
                            {a.affectedArea}
                            {selectedZoneFilter && a.affectedArea === 'Whole La Union' && ` (Affects ${selectedZoneFilter})`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{
                            fontFamily: 'var(--adm-font-mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: sevColor[a.severity],
                            textTransform: 'uppercase',
                            background: `rgba(${a.severity === 'LOW' ? '255,255,255' : a.severity === 'MEDIUM' ? '252,211,77' : '251,113,133'}, 0.08)`,
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {a.severity}
                          </span>
                        </div>
                      </div>

                      <p style={{ marginTop: 10, fontSize: '13.5px', color: 'var(--adm-ink-muted)' }}>{a.message}</p>

                      <div className="advisory-timeline-wrapper">
                        <div className="advisory-progress-bar">
                          <div className={`advisory-progress-fill ${progressFillClass}`} style={{ width: `${percent}%` }} />
                        </div>
                        <div className="advisory-timeline-meta">
                          <span>
                            <I.Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {new Date(a.activeFrom).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} 
                            {" → "}
                            {new Date(a.activeTo).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                          </span>
                          {a.isActive ? (
                            <span className={`advisory-time-remaining ${isSevHigh ? 'advisory-time-remaining--danger' : ''}`}>
                              {getRemainingTimeStr(a.activeTo)}
                            </span>
                          ) : (
                            <span>Broadcast Complete</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="advisory-item__actions">
                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(a)}>Edit</button>
                      {a.isActive ? <button className="btn btn--ghost btn--sm" style={{ color: 'var(--adm-danger)' }} onClick={() => endNow(a)}>End now</button> : null}
                    </div>
                  </div>
                )
              })}

              {finalFiltered.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--adm-ink-faint)' }}>
                  <I.Alert size={28} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <div style={{ fontSize: 14 }}>No {tab === 'active' ? 'active' : 'archived'} advisories match filters.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Coastal Radar Grid & logs */}
        <div className="advisories-sidebar-panel">
          {/* Radar sector grid */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '10px' }}>Coastal Coverage Radar</span>
              {selectedZoneFilter && (
                <button
                  onClick={() => setSelectedZoneFilter(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--adm-lime)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'var(--adm-font-ui)',
                    fontWeight: 500
                  }}
                >
                  Clear Filter
                </button>
              )}
            </div>
            <h4 style={{ color: 'var(--adm-ink)', fontSize: '14px', marginTop: 4, marginBottom: 2 }}>Fishing Sector Grid</h4>
            <p style={{ color: 'var(--adm-ink-faint)', fontSize: '11px', marginBottom: 12 }}>Filter alerts by clicking La Union sectors below:</p>

            <div className="coastal-radar-grid">
              {FISHING_ZONES.map(zone => {
                if (zone === "Whole La Union") return null
                
                // Find highest alert severity affecting this sector
                const sectorAdvisories = activeAdvisories.filter(a => a.affectedArea === zone || a.affectedArea === 'Whole La Union')
                let maxSev = null
                if (sectorAdvisories.length > 0) {
                  if (sectorAdvisories.some(a => a.severity === 'CRITICAL')) maxSev = 'CRITICAL'
                  else if (sectorAdvisories.some(a => a.severity === 'HIGH')) maxSev = 'HIGH'
                  else if (sectorAdvisories.some(a => a.severity === 'MEDIUM')) maxSev = 'MEDIUM'
                  else if (sectorAdvisories.some(a => a.severity === 'LOW')) maxSev = 'LOW'
                }
                
                const statusClass = maxSev ? `sector-tile--alert-${maxSev.toLowerCase()}` : 'sector-tile--clear'
                const isFiltered = selectedZoneFilter === zone

                return (
                  <button
                    key={zone}
                    type="button"
                    className={`sector-tile ${statusClass} ${isFiltered ? 'sector-tile--focused' : ''}`}
                    onClick={() => setSelectedZoneFilter(isFiltered ? null : zone)}
                  >
                    <div className="sector-tile__dot" />
                    <span className="sector-tile__name">{zone}</span>
                    <span className="sector-tile__status">{maxSev || 'CLEAR'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SMS API Status & Live simulated logs */}
          <div className="telemetry-card">
            <div className="telemetry-header">
              <span className="telemetry-title">Gateway Broadcast Sync</span>
              <span className="telemetry-gateway-status">ACTIVE</span>
            </div>
            
            <div className="telemetry-stats-row">
              <div className="telemetry-stat-item">
                <span className="telemetry-stat-label">Smart Network</span>
                <span className="telemetry-stat-value" style={{ color: 'var(--adm-lime)' }}>● ONLINE</span>
              </div>
              <div className="telemetry-stat-item" style={{ alignItems: 'flex-end' }}>
                <span className="telemetry-stat-label">SMS Latency</span>
                <span className="telemetry-stat-value">28ms</span>
              </div>
            </div>

            <div className="telemetry-stats-row" style={{ marginBottom: 12 }}>
              <div className="telemetry-stat-item">
                <span className="telemetry-stat-label">Globe Network</span>
                <span className="telemetry-stat-value" style={{ color: 'var(--adm-lime)' }}>● ONLINE</span>
              </div>
              <div className="telemetry-stat-item" style={{ alignItems: 'flex-end' }}>
                <span className="telemetry-stat-label">VHF Port</span>
                <span className="telemetry-stat-value">CH-16</span>
              </div>
            </div>

            <div className="telemetry-logs-box">
              {telemetryLogs.map((log, idx) => (
                <p key={idx} className="telemetry-log-line">
                  <span className="telemetry-log-time">[{log.time}]</span>
                  {log.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminSpeciesPage() {
  const qc = useQueryClient()
  const { data: species = [], isLoading } = useQuery({ queryKey: ['admin-species'], queryFn: fetchAdminSpecies })
  const [showForm, setShowForm] = useState(false)
  const [editSpecies, setEditSpecies] = useState(null)
  const [form, setForm] = useState({ commonName: '', scientificName: '' })
  const [err, setErr] = useState(null)

  function openNew() {
    setEditSpecies(null); setForm({ commonName: '', scientificName: '' }); setErr(null); setShowForm(true)
  }
  function openEdit(s) {
    setEditSpecies(s); setForm({ commonName: s.commonName, scientificName: s.scientificName || '' }); setErr(null); setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr(null)
    try {
      if (editSpecies) {
        await updateSpecies(editSpecies.id, form)
      } else {
        await createSpecies(form)
      }
      qc.invalidateQueries({ queryKey: ['admin-species'] })
      setShowForm(false)
    } catch(e) { setErr(e.message) }
  }

  async function toggleSpecies(s) {
    try {
      if (s.active) {
        await deleteSpecies(s.id)
      } else {
        await reactivateSpecies(s.id)
      }
      qc.invalidateQueries({ queryKey: ['admin-species'] })
    } catch(e) { alert(e.message) }
  }

  return (
    <div className="page">
      {showForm && createPortal(
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="trip-modal">
            <div className="trip-modal__header">
              <h2 className="trip-modal__title">{editSpecies ? 'Edit species' : 'Add species'}</h2>
              <button className="trip-modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="trip-form" onSubmit={handleSubmit}>
              {err && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{err}</p>}
              <label className="trip-form__label">Common name *
                <input className="trip-form__input" value={form.commonName}
                  onChange={e => setForm(f=>({...f,commonName:e.target.value}))} required />
              </label>
              <label className="trip-form__label">Scientific name
                <input className="trip-form__input" value={form.scientificName}
                  onChange={e => setForm(f=>({...f,scientificName:e.target.value}))} />
              </label>
              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">{editSpecies ? 'Save changes' : 'Add species'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('admin-modal-root') || document.body
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Fish <span className="lime-chip">Species</span></h1>
          <p className="page__sub">{species.filter(s=>s.active).length} active species in the catalog.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={openNew}><I.Plus size={14} /> Add species</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
        ) : (
          <table className="tbl tbl--species">
            <thead>
              <tr><th>Common name</th><th>Scientific name</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {species.map(s => (
                <tr key={s.id} className={s.active ? 'row--link' : ''} style={s.active ? {} : {opacity:0.5}}>
                  <td style={{fontWeight: 500}}>{s.commonName}</td>
                  <td style={{fontStyle: 'italic', color: 'var(--ink-3)'}}>{s.scientificName || '—'}</td>
                  <td>
                    <span className={`status status--${s.active ? 'active' : 'inactive'}`}>
                      <span className="status__dot" /> {s.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{gap: 6, justifyContent: 'center'}}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => toggleSpecies(s)}>
                        {s.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AdminAuditPage() {
  const [filter, setFilter] = useState('all')
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin-audit-log', filter],
    queryFn: () => fetchAdminAuditLog(filter)
  })

  function exportCsv() {
    const header = 'Time,Kind,Actor,Action,Target'
    const lines = entries.map(r =>
      `"${r.createdAt}","${r.kind}","${r.actorName}","${r.action}","${r.target || ''}"`
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'audit-log.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Compliance</div>
          <h1 className="page__title" style={{marginTop: 4}}>Audit <span className="lime-chip">Log</span></h1>
          <p className="page__sub">All admin and system actions, ordered by recency.</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={exportCsv}><I.Filter size={14} /> Export</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            {['all','user','advisory','lookup','flag','system'].map(f => (
              <button key={f} className={filter===f?'on':''} onClick={()=>setFilter(f)}>
                {f === 'all' ? 'All' : f[0].toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
        ) : (
          <table className="tbl tbl--audit">
            <thead>
              <tr><th>Time</th><th>Kind</th><th>Action</th><th>Target</th></tr>
            </thead>
            <tbody>
              {entries.map((a) => (
                <tr key={a.id}>
                  <td className="data" style={{color:'var(--ink-4)'}}>{fmtAuditTime(a.createdAt)}</td>
                  <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                  <td><strong>{a.actorName}</strong> {a.action}</td>
                  <td style={{color:'var(--ink-3)'}}>{a.target}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── BFAR Prices Page ─────────────────────────────────────────────────────────

function AdminBfarPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm]       = useState({ speciesId: '', minPricePerKg: '', maxPricePerKg: '', source: 'BFAR Region 1 NCPMR', effectiveDate: new Date().toISOString().slice(0, 10) })
  const [err, setErr]         = useState(null)

  const { data: prices = [], isLoading, refetch } = useQuery({
    queryKey: ['bfar-all'],
    queryFn: () => fetch('/api/bfar-prices/all', { credentials: 'include' }).then(r => r.json()),
  })
  const { data: species = [] } = useQuery({
    queryKey: ['species'],
    queryFn: () => fetch('/api/species', { credentials: 'include' }).then(r => r.json()),
  })

  function openAdd() { setEditRow(null); setForm({ speciesId: '', minPricePerKg: '', maxPricePerKg: '', source: 'BFAR Region 1 NCPMR', effectiveDate: new Date().toISOString().slice(0, 10) }); setErr(null); setShowAdd(true) }
  function openEdit(p) {
    setEditRow(p)
    setForm({ speciesId: p.species.id, minPricePerKg: p.minPricePerKg, maxPricePerKg: p.maxPricePerKg, source: p.source, effectiveDate: p.effectiveDate })
    setErr(null)
    setShowAdd(true)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr(null)
    try {
      const url = editRow ? `/api/admin/bfar-prices/${editRow.id}` : '/api/admin/bfar-prices'
      const method = editRow ? 'PUT' : 'POST'
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, speciesId: Number(form.speciesId), minPricePerKg: Number(form.minPricePerKg), maxPricePerKg: Number(form.maxPricePerKg) }) })
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed')
      setShowAdd(false); refetch()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="page">
      {showAdd && createPortal(
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="trip-modal">
            <div className="trip-modal__header">
              <h2 className="trip-modal__title">{editRow ? 'Edit BFAR Price' : 'Add BFAR Price'}</h2>
              <button className="trip-modal__close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form className="trip-form" onSubmit={handleSubmit}>
              {err && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{err}</p>}
              <label className="trip-form__label">Species *
                <select className="trip-form__input" value={form.speciesId} onChange={e => setForm(f => ({...f, speciesId: e.target.value}))} required>
                  <option value="">Select species…</option>
                  {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
                </select>
              </label>
              <label className="trip-form__label">Min price/kg (₱) *
                <input type="number" min="0" step="0.01" className="trip-form__input" value={form.minPricePerKg} onChange={e => setForm(f => ({...f, minPricePerKg: e.target.value}))} required />
              </label>
              <label className="trip-form__label">Max price/kg (₱) *
                <input type="number" min="0" step="0.01" className="trip-form__input" value={form.maxPricePerKg} onChange={e => setForm(f => ({...f, maxPricePerKg: e.target.value}))} required />
              </label>
              <label className="trip-form__label">Source
                <input className="trip-form__input" value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} maxLength={200} />
              </label>
              <label className="trip-form__label">Effective date *
                <CustomDateTimePicker
                  value={form.effectiveDate}
                  onChange={val => setForm(f => ({...f, effectiveDate: val}))}
                  dateOnly={true}
                />
              </label>
              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">{editRow ? 'Save changes' : 'Add price'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('admin-modal-root') || document.body
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Reference Data</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>BFAR <span className="lime-chip">Prices</span></h1>
          <p className="page__sub">Weekly benchmark prices per species. Displayed to fishermen when settling catches.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={openAdd}><I.Plus size={14} /> Add price</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Species</th><th>Min/kg</th><th>Max/kg</th><th>Source</th><th>Effective</th><th></th></tr>
            </thead>
            <tbody>
              {prices.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.species?.commonName}</td>
                  <td className="data">₱{Number(p.minPricePerKg).toFixed(2)}</td>
                  <td className="data">₱{Number(p.maxPricePerKg).toFixed(2)}</td>
                  <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{p.source}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.effectiveDate}</td>
                  <td><button className="btn btn--ghost btn--sm" onClick={() => openEdit(p)}>Edit</button></td>
                </tr>
              ))}
              {prices.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>No BFAR prices set yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminDashboard({ user, onLogout }) {
  const [page, setPage] = useState('aoverview')
  const [railOpen, setRailOpen] = useState(false)
  const { data: metrics } = useQuery({ queryKey: ['admin-metrics'], queryFn: fetchAdminMetrics })
  const pageContentRef = useRef(null)

  const PAGES = {
    aoverview:   AdminOverviewPage,
    ausers:      AdminUsersPage,
    aadvisories: AdminAdvisoriesPage,
    aspecies:    AdminSpeciesPage,
    aaudit:      AdminAuditPage,
    abfar:       AdminBfarPage,
  }
  const PageCmp = PAGES[page] || AdminOverviewPage

  function navigateTo(newPage) {
    if (newPage === page) return
    const el = pageContentRef.current
    if (!el) { setPage(newPage); return }
    gsap.killTweensOf(el)
    gsap.to(el, {
      opacity: 0, y: -8, duration: 0.12, ease: 'power2.in',
      onComplete: () => {
        setPage(newPage)
        gsap.fromTo(el,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'opacity,transform' }
        )
      },
    })
  }

  return (
    <div className="shell admin-shell" data-rail-open={String(railOpen)} data-accent="plum" data-density="balanced">
      <div className="app-bg" />
      <Rail
        role="ADMIN" page={page} setPage={navigateTo}
        onLogout={onLogout}
        user={user} advisoryBadge={metrics?.activeAdvisories ?? 0}
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => setRailOpen(false)}
      />
      <main className="main">
        <Topbar role="ADMIN" page={page} user={user} />
        <div ref={pageContentRef} className="page-anim-wrapper">
          <PageCmp setPage={navigateTo} user={user} metrics={metrics} />
        </div>
      </main>
      <div id="admin-modal-root" />
    </div>
  )
}
