import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from './icons'
import {
  fetchAdminUsers, updateAdminUser, createAdminUser,
  fetchAdminAdvisories, createAdvisory, updateAdvisory,
  fetchAdminSpecies, createSpecies, updateSpecies, deleteSpecies, reactivateSpecies,
  fetchAdminLocations, createLocation, updateLocation, deleteLocation, reactivateLocation,
  fetchAdminMetrics, fetchAdminDau, fetchAdminHealth, fetchAdminAuditLog,
} from './api/admin.js'

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
      { id: 'alocations',  icon: 'MapPin',    label: 'Market Locations' },
      { id: 'aaudit',      icon: 'Clock',     label: 'Audit Log' },
    ],
    crumbLabel: 'Admin',
    pageLabels: {
      aoverview:   'Platform Overview',
      ausers:      'User Management',
      aadvisories: 'Advisories',
      aspecies:    'Fish Species',
      alocations:  'Market Locations',
      aaudit:      'Audit Log',
    },
  },
}

function Rail({ role, page, setPage, onTweaks, onSwitchRole, user, advisoryBadge }) {
  const cfg = ROLE_NAV[role]
  const initials = user
    ? user.fullName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const firstName = user?.fullName?.split(' ')[0] || 'Admin'

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {cfg.items.map(it => {
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
              {it.id === 'aadvisories' && advisoryBadge > 0 ? <span className="rail-item__badge">{advisoryBadge}</span> : null}
            </div>
          )
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onSwitchRole} data-tip="Switch role (demo)">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Switch role</div>
        </div>
        <div className="rail-item" onClick={onTweaks} data-tip="Tweak appearance">
          <div className="rail-item__icon"><I.Settings size={18} /></div>
          <div className="rail-item__text">Settings</div>
        </div>
        <div className="rail-item" data-tip="Help & docs">
          <div className="rail-item__icon"><I.Help size={18} /></div>
          <div className="rail-item__text">Help</div>
        </div>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{firstName}</span>
            <span className="rail__user-role">{user?.role || 'ADMIN'}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ role, page }) {
  const cfg = ROLE_NAV[role]
  const label = cfg.pageLabels[page] || page
  const placeholders = {
    FISHERMAN: 'Search trips, catches, vendors…',
    VENDOR:    'Search listings, fishermen, alerts…',
    BUYER:     'Search vendors, species, listings…',
    ADMIN:     'Search users, advisories, species…',
  }
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <span style={{color: 'var(--ink-3)'}}>{cfg.crumbLabel}</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder={placeholders[role]} />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
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
  const { data: dau = [] } = useQuery({ queryKey: ['admin-dau'], queryFn: fetchAdminDau })
  const { data: health = [] } = useQuery({ queryKey: ['admin-health'], queryFn: fetchAdminHealth })
  const { data: audit = [] } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: () => fetchAdminAuditLog(null)
  })

  const max = dau.length ? Math.max(...dau.map(d => d.count), 1) : 1
  const firstName = user?.fullName?.split(' ')[0] || 'Admin'
  const STATUS_CLASS = { OK: 'safe', WARN: 'warn', DOWN: 'unsafe', N_A: 'inactive' }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Platform</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{firstName}</em></h1>
          <p className="page__sub">{M.activeNow ?? 0} users online now · {M.tripsToday ?? 0} trips · {M.ordersToday ?? 0} orders today.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Last 7 days</button>
          <button className="btn btn--primary" onClick={() => setPage('aadvisories')}>
            <I.Plus size={14} /> New advisory
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="orders-strip">
        <div className="stat"><div className="l">Total users</div><div className="v">{(M.totalUsers ?? 0).toLocaleString()}</div><div className="s">+{M.newThisWeek ?? 0} this week</div></div>
        <div className="stat"><div className="l">Active now</div><div className="v">{M.activeNow ?? 0}</div><div className="s">{M.totalUsers ? Math.round((M.activeNow ?? 0)/(M.totalUsers)*100) : 0}% of base</div></div>
        <div className="stat"><div className="l">Trips today</div><div className="v">{M.tripsToday ?? 0}</div><div className="s">{M.activeTrips ?? 0} live now</div></div>
        <div className="stat"><div className="l">Orders today</div><div className="v">{M.ordersToday ?? 0}</div><div className="s">—</div></div>
        <div className="stat"><div className="l">Disputes</div><div className="v" style={{color: (M.disputedOrders ?? 0) > 5 ? 'var(--unsafe)' : 'var(--ink)'}}>{M.disputedOrders ?? 0}</div><div className="s">Need review</div></div>
        <div className="stat"><div className="l">Uptime</div><div className="v">—</div><div className="s">Last 30 days</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {/* Daily active users chart */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Daily active users · 30 days</div>
              <div className="card__sub">Average {Math.round(dau.reduce((a,d)=>a+d.count,0)/Math.max(dau.length,1))} DAU</div>
            </div>
            <div className="seg seg--sm">
              <button className="on">DAU</button>
              <button>Trips</button>
              <button>Orders</button>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px'}}>
            {dau.map((d, i) => {
              const h = (d.count / max) * 100
              return (
                <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4}}>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: i === dau.length - 1 ? 'var(--accent)' : 'var(--ink-soft)',
                    borderRadius: '3px 3px 0 0', minHeight: 4,
                  }} />
                </div>
              )
            })}
          </div>
          <div className="row" style={{justifyContent:'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>
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
            ].map(r => {
              const pct = M.totalUsers ? (r.count / M.totalUsers) * 100 : 0
              return (
                <div key={r.name} className="role-bar">
                  <div className="role-bar__head">
                    <span>{r.name}</span>
                    <strong>{r.count.toLocaleString()}</strong>
                  </div>
                  <div className="role-bar__track">
                    <div className="role-bar__fill" style={{width: `${pct}%`, background: r.color}} />
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
  const [_editUser, setEditUser] = useState(null)
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'FISHERMAN', password: '' })
  const [inviteErr, setInviteErr] = useState(null)

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
      setInviteOpen(false)
      setInviteForm({ fullName: '', email: '', role: 'FISHERMAN', password: '' })
    },
    onError: (e) => setInviteErr(e.message)
  })

  function handleInvite(e) {
    e.preventDefault()
    setInviteErr(null)
    inviteMutation.mutate(inviteForm)
  }

  return (
    <div className="page">
      {inviteOpen && (
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && setInviteOpen(false)}>
          <div className="trip-modal">
            <div className="trip-modal__header">
              <h2 className="trip-modal__title">Invite user</h2>
              <button className="trip-modal__close" onClick={() => setInviteOpen(false)}>✕</button>
            </div>
            <form className="trip-form" onSubmit={handleInvite}>
              {inviteErr && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{inviteErr}</p>}
              <label className="trip-form__label">Full name *
                <input className="trip-form__input" value={inviteForm.fullName}
                  onChange={e => setInviteForm(f => ({...f, fullName: e.target.value}))} required />
              </label>
              <label className="trip-form__label">Email *
                <input type="email" className="trip-form__input" value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} required />
              </label>
              <label className="trip-form__label">Role *
                <select className="trip-form__input" value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({...f, role: e.target.value}))}>
                  <option value="FISHERMAN">Fisherman</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="BUYER">Buyer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
              <label className="trip-form__label">Password *
                <input type="password" className="trip-form__input" value={inviteForm.password}
                  onChange={e => setInviteForm(f => ({...f, password: e.target.value}))} required minLength={8} />
              </label>
              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={() => setInviteOpen(false)}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Users</div>
          <h1 className="page__title" style={{marginTop: 4}}>User <em>Management</em></h1>
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
              <tr><th>Name</th><th>Role</th><th>Activity</th><th>Joined</th><th>Last seen</th><th>Status</th><th></th></tr>
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
                  <td style={{ position: 'relative' }}>
                    <button className="btn btn--ghost btn--sm"
                      onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}>
                      <I.Dots size={12} />
                    </button>
                    {openMenu === u.id && (
                      <div className="popover" style={{ position: 'absolute', right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 0', minWidth: 140 }}>
                        <button className="popover-item" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => { setEditUser(u); setOpenMenu(null) }}>Edit</button>
                        <button className="popover-item" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => { toggleActive(u); setOpenMenu(null) }}>
                          {u.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    )}
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

function AdminAdvisoriesPage() {
  const qc = useQueryClient()
  const { data: advisories = [] } = useQuery({ queryKey: ['admin-advisories'], queryFn: fetchAdminAdvisories })
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [editAdvisory, setEditAdvisory] = useState(null)
  const [form, setForm] = useState({ title:'', message:'', severity:'MEDIUM', affectedArea:'', activeFrom:'', activeTo:'' })
  const [err, setErr] = useState(null)

  const sevColor = { LOW: 'var(--ink-4)', MEDIUM: 'var(--warn)', HIGH: 'var(--unsafe)', CRITICAL: 'var(--unsafe)' }
  const filtered = advisories.filter(a => tab === 'active' ? a.isActive : !a.isActive)

  function openNew() {
    setEditAdvisory(null)
    setForm({ title:'', message:'', severity:'MEDIUM', affectedArea:'', activeFrom:'', activeTo:'' })
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
    setErr(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr(null)
    try {
      const body = {
        ...form,
        activeFrom: form.activeFrom ? new Date(form.activeFrom).toISOString() : undefined,
        activeTo: form.activeTo ? new Date(form.activeTo).toISOString() : undefined,
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

  async function endNow(a) {
    if (!confirm(`End advisory "${a.title}" now?`)) return
    try {
      await updateAdvisory(a.id, { isActive: false, activeTo: new Date().toISOString() })
      qc.invalidateQueries({ queryKey: ['admin-advisories'] })
      qc.invalidateQueries({ queryKey: ['admin-metrics'] })
    } catch(e) { alert(e.message) }
  }

  return (
    <div className="page">
      {showForm && (
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
              <label className="trip-form__label">Severity *
                <select className="trip-form__input" value={form.severity}
                  onChange={e => setForm(f=>({...f,severity:e.target.value}))}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
              <label className="trip-form__label">Affected area *
                <input className="trip-form__input" value={form.affectedArea}
                  onChange={e => setForm(f=>({...f,affectedArea:e.target.value}))} required />
              </label>
              <label className="trip-form__label">Active from *
                <input type="datetime-local" className="trip-form__input" value={form.activeFrom}
                  onChange={e => setForm(f=>({...f,activeFrom:e.target.value}))} required />
              </label>
              <label className="trip-form__label">Active to *
                <input type="datetime-local" className="trip-form__input" value={form.activeTo}
                  onChange={e => setForm(f=>({...f,activeTo:e.target.value}))} required />
              </label>
              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">{editAdvisory ? 'Save changes' : 'Post advisory'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Safety</div>
          <h1 className="page__title" style={{marginTop: 4}}>Marine <em>Advisories</em></h1>
          <p className="page__sub">{advisories.filter(a=>a.isActive).length} active advisories broadcasting to fishermen and vendors.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={openNew}><I.Plus size={14} /> New advisory</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({advisories.filter(a=>a.isActive).length})</button>
            <button className={tab==='archive'?'on':''} onClick={()=>setTab('archive')}>Archive ({advisories.filter(a=>!a.isActive).length})</button>
          </div>
        </div>

        <div className="advisory-list">
          {filtered.map(a => (
            <div key={a.id} className={`advisory-item advisory-item--${a.severity.toLowerCase()}`}>
              <div className="advisory-item__sev" style={{color: sevColor[a.severity]}}>
                <I.Alert size={16} />
                <span>{a.severity}</span>
              </div>
              <div className="advisory-item__body">
                <div className="advisory-item__head">
                  <h3>{a.title}</h3>
                  <span className="chip">{a.affectedArea}</span>
                </div>
                <p>{a.message}</p>
                <div className="advisory-item__meta">
                  <span><I.Clock size={11} /> {new Date(a.activeFrom).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} → {new Date(a.activeTo).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              </div>
              <div className="advisory-item__actions">
                <button className="btn btn--ghost btn--sm" onClick={() => openEdit(a)}>Edit</button>
                {a.isActive ? <button className="btn btn--ghost btn--sm" onClick={() => endNow(a)}>End now</button> : null}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
              No {tab === 'active' ? 'active' : 'archived'} advisories.
            </div>
          )}
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
      {showForm && (
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
        </div>
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Fish <em>Species</em></h1>
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
          <table className="tbl">
            <thead>
              <tr><th>Common name</th><th>Scientific name</th><th>Status</th><th></th></tr>
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
                    <div className="row" style={{gap: 6}}>
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

function AdminLocationsPage() {
  const qc = useQueryClient()
  const { data: locations = [], isLoading } = useQuery({ queryKey: ['admin-locations'], queryFn: fetchAdminLocations })
  const [showForm, setShowForm] = useState(false)
  const [editLocation, setEditLocation] = useState(null)
  const [form, setForm] = useState({ name: '', municipality: '', province: '' })
  const [openMenu, setOpenMenu] = useState(null)
  const [err, setErr] = useState(null)

  function openNew() {
    setEditLocation(null); setForm({ name: '', municipality: '', province: '' }); setErr(null); setShowForm(true)
  }
  function openEdit(l) {
    setEditLocation(l); setForm({ name: l.name, municipality: l.municipality || '', province: l.province || '' }); setErr(null); setShowForm(true); setOpenMenu(null)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr(null)
    try {
      if (editLocation) {
        await updateLocation(editLocation.id, form)
      } else {
        await createLocation(form)
      }
      qc.invalidateQueries({ queryKey: ['admin-locations'] })
      setShowForm(false)
    } catch(e) { setErr(e.message) }
  }

  async function toggleLocation(l) {
    try {
      if (l.active) {
        await deleteLocation(l.id)
      } else {
        await reactivateLocation(l.id)
      }
      qc.invalidateQueries({ queryKey: ['admin-locations'] })
      setOpenMenu(null)
    } catch(e) { alert(e.message) }
  }

  const provinces = new Set(locations.map(l => l.province).filter(Boolean))

  return (
    <div className="page">
      {showForm && (
        <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="trip-modal">
            <div className="trip-modal__header">
              <h2 className="trip-modal__title">{editLocation ? 'Edit location' : 'Add location'}</h2>
              <button className="trip-modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="trip-form" onSubmit={handleSubmit}>
              {err && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{err}</p>}
              <label className="trip-form__label">Name *
                <input className="trip-form__input" value={form.name}
                  onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
              </label>
              <label className="trip-form__label">Municipality
                <input className="trip-form__input" value={form.municipality}
                  onChange={e => setForm(f=>({...f,municipality:e.target.value}))} />
              </label>
              <label className="trip-form__label">Province
                <input className="trip-form__input" value={form.province}
                  onChange={e => setForm(f=>({...f,province:e.target.value}))} />
              </label>
              <div className="trip-form__actions">
                <button type="button" className="trip-btn trip-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="trip-btn trip-btn--primary">{editLocation ? 'Save changes' : 'Add location'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Market <em>Locations</em></h1>
          <p className="page__sub">{locations.filter(l=>l.active).length} active locations across {provinces.size} provinces.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={openNew}><I.Plus size={14} /> Add location</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
      ) : (
        <div className="locations-grid" style={{marginTop: 18}}>
          {locations.map(l => (
            <div key={l.id} className={`location-card${!l.active ? ' location-card--inactive' : ''}`}>
              <div className="location-card__head">
                <I.MapPin size={14} />
                <span>{l.municipality ? `${l.municipality}, ` : ''}{l.province || '—'}</span>
                <div style={{marginLeft:'auto', position:'relative'}}>
                  <button className="btn btn--ghost btn--sm"
                    onClick={() => setOpenMenu(openMenu === l.id ? null : l.id)}>
                    <I.Dots size={12} />
                  </button>
                  {openMenu === l.id && (
                    <div style={{ position: 'absolute', right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 0', minWidth: 140 }}>
                      <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => openEdit(l)}>Edit</button>
                      <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => toggleLocation(l)}>
                        {l.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="location-card__name">{l.name}</h3>
              <div className="location-card__stats">
                <div><div className="l">Status</div><div className="v" style={{fontSize: 13, color: l.active ? 'var(--safe)' : 'var(--ink-4)'}}>{l.active ? 'Active' : 'Off'}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
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
          <h1 className="page__title" style={{marginTop: 4}}>Audit <em>Log</em></h1>
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

function AdminBfarPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">BFAR</div>
          <h1 className="page__title" style={{marginTop: 4}}>BFAR <em>Reference</em></h1>
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminDashboard({ user, onLogout }) {
  const [page, setPage] = useState('aoverview')
  const { data: metrics } = useQuery({ queryKey: ['admin-metrics'], queryFn: fetchAdminMetrics })

  const PAGES = {
    aoverview:   AdminOverviewPage,
    ausers:      AdminUsersPage,
    aadvisories: AdminAdvisoriesPage,
    aspecies:    AdminSpeciesPage,
    alocations:  AdminLocationsPage,
    aaudit:      AdminAuditPage,
    abfar:       AdminBfarPage,
  }
  const PageCmp = PAGES[page] || AdminOverviewPage

  return (
    <div className="app" data-accent="plum" data-density="balanced">
      <Rail
        role="ADMIN" page={page} setPage={setPage}
        onTweaks={() => {}} onSwitchRole={onLogout || (() => {})}
        user={user} advisoryBadge={metrics?.activeAdvisories ?? 0}
      />
      <main className="main">
        <Topbar role="ADMIN" page={page} />
        <PageCmp setPage={setPage} user={user} metrics={metrics} />
      </main>
    </div>
  )
}
