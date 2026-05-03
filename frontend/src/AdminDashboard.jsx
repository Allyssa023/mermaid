import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import './handoff.css'
import { apiGet, apiPost, apiPut, apiDelete } from './api'
import { I } from './icons'

// ─── Constants ────────────────────────────────────────────────────────────────

const LA_UNION_MUNICIPALITIES = [
  'Agoo', 'Aringay', 'Bacnotan', 'Balaoan', 'Bangar', 'Bauang', 'Caba',
  'Luna', 'Rosario', 'San Fernando City', 'San Juan', 'Santo Tomas'
]

const ADVISORY_AREAS = [
  'All La Union Coastal Waters',
  'Northern La Union Coast (Bangar to San Juan)',
  'Central La Union Coast (San Fernando to Bauang)',
  'Southern La Union Coast (Caba to Rosario)',
  'Lingayen Gulf Area',
  'San Fernando Bay'
]

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const ROLES = ['FISHERMAN', 'VENDOR', 'BUYER', 'ADMIN']

const EMPTY_USER_FORM = { fullName: '', email: '', password: '', role: 'FISHERMAN' }
const EMPTY_ADV_FORM  = { title: '', message: '', severity: 'LOW', affectedArea: '', activeFrom: '', activeTo: '', isActive: true }
const EMPTY_SPECIES_FORM   = { commonName: '' }
const EMPTY_LOCATION_FORM  = { name: '', municipality: '' }

// ─── Mock Data (TODO: Replace with real API endpoints) ────────────────────────

const MOCK_DAU = (() => {
  const out = []
  for (let i = 0; i < 30; i++) {
    const base = 220 + Math.sin(i / 4) * 35 + (i % 7 === 6 ? -40 : 0)
    out.push({ day: i, dau: Math.round(base + Math.random() * 22) })
  }
  return out
})()

const MOCK_HEALTH = [
  { name: 'API Gateway',             status: 'OK',   detail: '99.94% uptime · p95 142ms' },
  { name: 'PostgreSQL',              status: 'OK',   detail: '24 connections · 0 slow queries' },
  { name: 'Marine data (Open-Meteo)',status: 'OK',   detail: 'Last sync 4 min ago' },
  { name: 'Mail queue',              status: 'WARN', detail: '12 pending · oldest 8 min' },
  { name: 'WebSocket (chat)',        status: 'OK',   detail: '47 active connections' },
  { name: 'Storage',                 status: 'OK',   detail: '38% of 100GB used' },
]

const MOCK_AUDIT = [
  { ts: '08:42', actor: 'Admin',   action: 'updated advisory',  target: 'Small-craft advisory',     kind: 'advisory' },
  { ts: '08:11', actor: 'System',  action: 'auto-expired',      target: '12 catch alerts',           kind: 'system' },
  { ts: '07:55', actor: 'Admin',   action: 'created species',   target: 'Threadfin Bream',           kind: 'lookup' },
  { ts: '07:30', actor: 'System',  action: 'flagged dispute',   target: 'ORD-7387 Bay City vs Mateo',kind: 'flag' },
  { ts: '06:18', actor: 'Admin',   action: 'deactivated user',  target: 'Mateo Villar (id 106)',     kind: 'user' },
  { ts: 'Yest.', actor: 'BFAR',    action: 'posted advisory',   target: 'Reef closure',              kind: 'advisory' },
  { ts: 'Yest.', actor: 'System',  action: 'sync OK',           target: 'Marine data · Open-Meteo',  kind: 'system' },
  { ts: 'Yest.', actor: 'Admin',   action: 'merged duplicate',  target: 'Yellowfin Tuna ↔ Tuna YF',  kind: 'lookup' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Inline edit/trash icons (not in I) ────────────────────────────────────────

const EditSvg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashSvg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

// ─── Small components ─────────────────────────────────────────────────────────

function RolePill({ role }) {
  const cls = { FISHERMAN: 'fisherman', VENDOR: 'vendor', ADMIN: 'admin', BUYER: 'buyer' }[role] || 'fisherman'
  return <span className={`role-pill role-pill--${cls}`}>{role}</span>
}

function SevChip({ severity }) {
  const cls = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' }[severity] || 'low'
  return <span className={`sev-chip sev-chip--${cls}`}>{severity}</span>
}

function StatusChip({ active }) {
  return (
    <span className={`status-chip status-chip--${active ? 'active' : 'inactive'}`}>
      <span className="status-chip__dot" />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function UserAvatar({ name }) {
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '??'
  return <div className="user-avatar">{initials}</div>
}

function Skeleton({ height = 48, style }) {
  return <div className="skeleton" style={{ height, borderRadius: 8, marginBottom: 6, ...style }} />
}

// ─── Shared Modal ─────────────────────────────────────────────────────────────

function AdminModal({ title, onClose, onSubmit, saving, submitLabel, children, formError }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="lf-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lf-modal">
        <div className="lf-modal__head">
          <div className="lf-modal__title">{title}</div>
          <button className="lf-modal__close" onClick={onClose}><I.X size={16} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="lf-modal__body">
            {children}
          </div>
          {formError && <div className="lf-modal__err">{formError}</div>}
          <div className="lf-modal__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page section header ──────────────────────────────────────────────────────

function PageHead({ eyebrow, title, sub, action }) {
  return (
    <div className="page__head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page__title" style={{ marginTop: 4 }}>{title}</h1>
        {sub && <p className="page__sub">{sub}</p>}
      </div>
      {action && (
        <div className="page__actions">
          <button className="btn btn--primary" onClick={action.onClick}>
            <I.Plus size={14} /> {action.label}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection({ token, user, setPage }) {
  const [users,      setUsers]      = useState(null)
  const [advisories, setAdvisories] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [dauMetric,  setDauMetric]  = useState('DAU')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [u, a] = await Promise.all([
        apiGet('/admin/users', token),
        apiGet('/admin/advisories', token),
      ])
      setUsers(u); setAdvisories(a)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const fishermen = users?.filter(u => u.role === 'FISHERMAN').length ?? 0
  const vendors   = users?.filter(u => u.role === 'VENDOR').length ?? 0
  const buyers    = users?.filter(u => u.role === 'BUYER').length ?? 0
  const admins    = users?.filter(u => u.role === 'ADMIN').length ?? 0
  const total     = users?.length ?? 0
  const activeAdv = advisories?.filter(a => a.isActive).length ?? 0
  const maxRole   = Math.max(fishermen, vendors, buyers, admins, 1)
  const dauMax    = Math.max(...MOCK_DAU.map(d => d.dau))
  const dauAvg    = Math.round(MOCK_DAU.reduce((a, d) => a + d.dau, 0) / MOCK_DAU.length)

  if (error) return (
    <div className="page-error">
      <I.Alert size={16} /> {error}
      <button className="page-error__retry" onClick={load}>Retry</button>
    </div>
  )

  return (
    <div className="page">
      <PageHead
        eyebrow="Platform"
        title={<>{greeting()}, <em>{user?.fullName?.split(' ')[0] || 'Admin'}</em></>}
        sub={`${total || '—'} users · ${activeAdv} active advisories`}
      />

      {/* 6-stat metric strip */}
      <div className="orders-strip orders-strip--6">
        <div className="stat"><div className="l">Total users</div><div className="v">{loading ? '—' : total}</div><div className="s">All roles</div></div>
        <div className="stat"><div className="l">Active now</div><div className="v">184</div><div className="s">{total > 0 ? Math.round(184/total*100) : 0}% of base</div></div>
        <div className="stat"><div className="l">Trips today</div><div className="v">96</div><div className="s">47 live now</div></div>
        <div className="stat"><div className="l">Orders today</div><div className="v">138</div><div className="s">₱4.1M MTD</div></div>
        <div className="stat"><div className="l">Disputes</div><div className="v" style={{ color: 'var(--unsafe)' }}>7</div><div className="s">Need review</div></div>
        <div className="stat"><div className="l">Uptime</div><div className="v">99.94%</div><div className="s">Last 30 days</div></div>
      </div>

      {/* Row 1: DAU chart + User mix */}
      <div className="grid--2-1" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Daily active users · 30 days</div>
              <div className="card__sub">Average {dauAvg} DAU</div>
            </div>
            <div className="seg seg--sm">
              {['DAU', 'Trips', 'Orders'].map(m => (
                <button key={m} className={dauMetric === m ? 'on' : ''} onClick={() => setDauMetric(m)}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px' }}>
            {MOCK_DAU.map((d, i) => {
              const h = (d.dau / dauMax) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: i === MOCK_DAU.length - 1 ? 'var(--accent)' : 'var(--ink-soft)',
                    borderRadius: '3px 3px 0 0', minHeight: 4,
                  }} />
                </div>
              )
            })}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            <span>30 days ago</span><span>Today</span>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">User mix</div>
              <div className="card__sub">By role</div>
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} />
            </div>
          ) : (
            <div className="role-bars">
              {[
                { label: 'Fishermen', count: fishermen, color: 'oklch(0.55 0.09 220)' },
                { label: 'Vendors',   count: vendors,   color: 'oklch(0.55 0.10 55)' },
                { label: 'Buyers',    count: buyers,    color: 'oklch(0.50 0.10 150)' },
                { label: 'Admins',    count: admins,    color: 'oklch(0.50 0.10 330)' },
              ].map(r => (
                <div key={r.label}>
                  <div className="role-bar__head"><span>{r.label}</span><strong>{r.count}</strong></div>
                  <div className="role-bar__track"><div className="role-bar__fill" style={{ width: `${(r.count / maxRole) * 100}%`, background: r.color }} /></div>
                  <div className="role-bar__pct">{total > 0 ? Math.round((r.count / total) * 100) : 0}% of users</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Health + Audit feed */}
      <div className="grid--1-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">System health</div>
              <div className="card__sub">{MOCK_HEALTH.filter(h => h.status === 'OK').length}/{MOCK_HEALTH.length} services nominal</div>
            </div>
          </div>
          <div className="health-list">
            {MOCK_HEALTH.map(h => (
              <div key={h.name} className="health-item">
                <span className={`health-dot health-dot--${h.status.toLowerCase()}`} />
                <div>
                  <div className="health-item__name">{h.name}</div>
                  <div className="health-item__detail">{h.detail}</div>
                </div>
                <span className={`chip chip--${h.status === 'OK' ? 'safe' : h.status === 'WARN' ? 'warn' : 'unsafe'}`}>{h.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent activity</div>
              <div className="card__sub">Audit log highlights</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setPage('audit')}>View all <I.Arrow size={11} /></button>
          </div>
          <table className="tbl tbl--audit">
            <tbody>
              {MOCK_AUDIT.map((a, i) => (
                <tr key={i}>
                  <td className="data" style={{ color: 'var(--ink-4)', width: 60 }}>{a.ts}</td>
                  <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                  <td><strong>{a.actor}</strong> {a.action}</td>
                  <td style={{ color: 'var(--ink-3)' }}>{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Users Section ────────────────────────────────────────────────────────────

function UsersSection({ token }) {
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_USER_FORM)
  const [formError, setFormError] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [tab,       setTab]       = useState('all')
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setUsers(await apiGet('/admin/users', token)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const matchTab = tab === 'all' || u.role === tab.toUpperCase()
    const matchSearch = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

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

  if (error) return <div className="page-error"><I.Alert size={16} /> {error}<button className="page-error__retry" onClick={load}>Retry</button></div>

  const activeCount = users.filter(u => u.active).length

  return (
    <div className="page">
      <PageHead
        eyebrow="Users"
        title={<>User <em>Management</em></>}
        sub={`${users.length} accounts · ${activeCount} active`}
        action={{ label: 'Create User', onClick: openCreate }}
      />

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All ({users.length})</button>
            <button className={tab === 'fisherman' ? 'on' : ''} onClick={() => setTab('fisherman')}>Fishermen ({users.filter(u => u.role === 'FISHERMAN').length})</button>
            <button className={tab === 'vendor' ? 'on' : ''} onClick={() => setTab('vendor')}>Vendors ({users.filter(u => u.role === 'VENDOR').length})</button>
            <button className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>Admins ({users.filter(u => u.role === 'ADMIN').length})</button>
          </div>
          <div className="search-input" style={{ minWidth: 220 }}>
            <I.Search size={13} />
            <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <table className="tbl tbl--users">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Status</th><th>ID</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><Skeleton /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-4)' }}>No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="row--link">
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <UserAvatar name={u.fullName} />
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{u.fullName}</div>
                      <small style={{ color: 'var(--ink-4)', fontSize: 11 }}>{u.email}</small>
                    </div>
                  </div>
                </td>
                <td><RolePill role={u.role} /></td>
                <td><StatusChip active={u.active} /></td>
                <td className="data" style={{ fontSize: 11, color: 'var(--ink-4)' }}>#{u.id}</td>
                <td>
                  <div className="tbl-actions">
                    <button className="tbl-btn" title="Edit" onClick={() => openEdit(u)}><EditSvg /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Create User' : `Edit User #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Create User' : 'Save Changes'}
          formError={formError}
        >
          <div className="form-field">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" required placeholder="e.g. Isidro Santos"
              value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required placeholder="user@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          {modal.mode === 'create' && (
            <div className="form-field">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required placeholder="Minimum 8 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          )}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {modal.mode === 'edit' && (
              <div className="form-field" style={{ justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Active</label>
                <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  )
}

// ─── Advisories Section ───────────────────────────────────────────────────────

function AdvisoriesSection({ token }) {
  const [advisories,    setAdvisories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [modal,         setModal]         = useState(null)
  const [form,          setForm]          = useState(EMPTY_ADV_FORM)
  const [formError,     setFormError]     = useState(null)
  const [saving,        setSaving]        = useState(false)
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

  const [tab, setTab] = useState('active')
  const activeCount  = advisories.filter(a => a.isActive).length
  const archiveCount = advisories.filter(a => !a.isActive).length
  const filtered     = advisories.filter(a => tab === 'active' ? a.isActive : !a.isActive)

  const fmtRange = (from, to) => {
    const opts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    const f = from ? new Date(from).toLocaleString('en-US', opts) : '—'
    const t = to   ? new Date(to).toLocaleString('en-US', opts)   : '—'
    return `${f} → ${t}`
  }

  if (error) return <div className="page-error"><I.Alert size={16} /> {error}<button className="page-error__retry" onClick={load}>Retry</button></div>

  return (
    <div className="page">
      <PageHead
        eyebrow="Safety"
        title={<>Marine <em>Advisories</em></>}
        sub={`${activeCount} active advisories broadcasting to fishermen and vendors`}
        action={{ label: 'Create Advisory', onClick: openCreate }}
      />

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active ({activeCount})</button>
            <button className={tab === 'archive' ? 'on' : ''} onClick={() => setTab('archive')}>Archive ({archiveCount})</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={80} /><Skeleton height={80} /><Skeleton height={80} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-4)' }}>No {tab} advisories.</div>
        ) : (
          <div className="advisory-list">
            {filtered.map(a => (
              <div key={a.id} className={`advisory-item advisory-item--${a.severity.toLowerCase()}`}>
                <div className="advisory-item__sev">
                  <I.Alert size={16} />
                  <span>{a.severity}</span>
                </div>
                <div>
                  <div className="advisory-item__head">
                    <h3>{a.title}</h3>
                    <span className="chip">{a.affectedArea}</span>
                  </div>
                  <p>{a.message}</p>
                  <div className="advisory-item__meta">
                    <span><I.Clock size={11} /> {fmtRange(a.activeFrom, a.activeTo)}</span>
                    <span>·</span>
                    <span>{fmtDate(a.createdAt)}</span>
                  </div>
                </div>
                <div className="advisory-item__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => openEdit(a)}>Edit</button>
                  {confirmDelete === a.id ? (
                    <>
                      <button className="btn btn--ghost btn--sm" style={{ color: 'var(--unsafe)' }} onClick={() => handleDelete(a.id)}>Confirm</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(a.id)}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Create Advisory' : `Edit Advisory #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Post Advisory' : 'Save Changes'}
          formError={formError}
        >
          <div className="form-field">
            <label className="form-label">Advisory Title</label>
            <input className="form-input" type="text" required placeholder="e.g. Gale Warning Issued"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Severity Level</label>
              <select className="form-select" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Affected Area</label>
              <select className="form-select" required value={form.affectedArea} onChange={e => setForm(f => ({ ...f, affectedArea: e.target.value }))}>
                <option value="" disabled>Select area...</option>
                <optgroup label="Broad Regions">
                  {ADVISORY_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </optgroup>
                <optgroup label="Municipalities">
                  {LA_UNION_MUNICIPALITIES.map(m => <option key={m} value={m + ' Coastal Waters'}>{m} Coastal Waters</option>)}
                </optgroup>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Detailed Message</label>
            <textarea className="form-textarea" required rows={3} placeholder="Provide specific instructions..."
              value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Active From</label>
              <input className="form-input" type="datetime-local" required
                value={form.activeFrom} onChange={e => setForm(f => ({ ...f, activeFrom: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Active To</label>
              <input className="form-input" type="datetime-local" required
                value={form.activeTo} onChange={e => setForm(f => ({ ...f, activeTo: e.target.value }))} />
            </div>
          </div>
          {modal.mode === 'edit' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="adv-active" checked={!!form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <label htmlFor="adv-active" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                Set as currently active
              </label>
            </div>
          )}
        </AdminModal>
      )}
    </div>
  )
}

// ─── Fish Species Section ─────────────────────────────────────────────────────

function FishSpeciesSection({ token }) {
  const [species,       setSpecies]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [modal,         setModal]         = useState(null)
  const [form,          setForm]          = useState(EMPTY_SPECIES_FORM)
  const [formError,     setFormError]     = useState(null)
  const [saving,        setSaving]        = useState(false)
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

  if (error) return <div className="page-error"><I.Alert size={16} /> {error}<button className="page-error__retry" onClick={load}>Retry</button></div>

  const activeSpecies = species.filter(s => s.active).length
  // TODO: replace with real usageCount from API when available
  const getUsage = (s) => s.usageCount ?? Math.round(50 + (s.id * 37) % 200)
  const maxUsage = Math.max(...species.map(s => getUsage(s)), 1)

  return (
    <div className="page">
      <PageHead
        eyebrow="Lookups"
        title={<>Fish <em>Species</em></>}
        sub={`${activeSpecies} active species in the catalog`}
        action={{ label: 'Add Species', onClick: openCreate }}
      />

      <div className="card" style={{ marginTop: 18 }}>
        <table className="tbl">
          <thead>
            <tr><th>Common Name</th><th>Usage</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={4}><Skeleton /></td></tr>
              ))
            ) : species.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-4)' }}>No fish species found.</td></tr>
            ) : species.map(s => {
              const usage = getUsage(s)
              return (
                <tr key={s.id} className="row--link">
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}><I.Fish size={14} style={{ marginRight: 8, color: 'var(--ink-4)' }} />{s.commonName}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="data" style={{ minWidth: 36 }}>{usage}</span>
                      <div style={{ width: 80, height: 4, background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${(usage / maxUsage) * 100}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                    </div>
                  </td>
                  <td><StatusChip active={s.active} /></td>
                  <td>
                  {confirmDelete === s.id ? (
                    <div className="tbl-confirm">
                      Sure?
                      <button className="tbl-btn tbl-btn--danger" onClick={() => handleDelete(s.id)}>✓</button>
                      <button className="tbl-btn" onClick={() => setConfirmDelete(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="tbl-actions">
                      <button className="tbl-btn" title="Edit" onClick={() => openEdit(s)}><EditSvg /></button>
                      <button className="tbl-btn tbl-btn--danger" title="Delete" onClick={() => setConfirmDelete(s.id)}><TrashSvg /></button>
                    </div>
                  )}
                </td>
              </tr>
            )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Add Fish Species' : `Edit Species #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Add Species' : 'Save Changes'}
          formError={formError}
        >
          <div className="form-field">
            <label className="form-label">Common Name</label>
            <input className="form-input" type="text" required placeholder="e.g. Milkfish (Bangus)"
              value={form.commonName} onChange={e => setForm({ commonName: e.target.value })} />
          </div>
        </AdminModal>
      )}
    </div>
  )
}

// ─── Market Locations Section ─────────────────────────────────────────────────

function MarketLocationsSection({ token }) {
  const [locations,     setLocations]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [modal,         setModal]         = useState(null)
  const [form,          setForm]          = useState(EMPTY_LOCATION_FORM)
  const [formError,     setFormError]     = useState(null)
  const [saving,        setSaving]        = useState(false)
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

  const activeLocs = locations.filter(l => l.active).length
  const municipalities = new Set(locations.map(l => l.municipality)).size

  if (error) return <div className="page-error"><I.Alert size={16} /> {error}<button className="page-error__retry" onClick={load}>Retry</button></div>

  return (
    <div className="page">
      <PageHead
        eyebrow="Lookups"
        title={<>Market <em>Locations</em></>}
        sub={`${activeLocs} active locations across ${municipalities} municipalities`}
        action={{ label: 'Add Location', onClick: openCreate }}
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
          <Skeleton height={140} /><Skeleton height={140} /><Skeleton height={140} />
        </div>
      ) : locations.length === 0 ? (
        <div className="card" style={{ marginTop: 18, textAlign: 'center', padding: 40, color: 'var(--ink-4)' }}>No locations found.</div>
      ) : (
        <div className="locations-grid" style={{ marginTop: 18 }}>
          {locations.map(loc => (
            <div key={loc.id} className={`location-card${!loc.active ? ' location-card--inactive' : ''}`}>
              <div className="location-card__head">
                <I.MapPin size={14} />
                <span>{loc.municipality}</span>
                <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={() => openEdit(loc)}><I.Dots size={12} /></button>
              </div>
              <h3 className="location-card__name">{loc.name}</h3>
              <div className="location-card__stats">
                <div><div className="l">ID</div><div className="v">#{loc.id}</div></div>
                <div><div className="l">Status</div><div className="v" style={{ fontSize: 13, color: loc.active ? 'var(--safe)' : 'var(--ink-4)' }}>{loc.active ? 'Active' : 'Off'}</div></div>
                <div>
                  <div className="l">Actions</div>
                  <div style={{ marginTop: 4 }}>
                    {confirmDelete === loc.id ? (
                      <div className="tbl-confirm">
                        <button className="tbl-btn tbl-btn--danger" onClick={() => handleDelete(loc.id)}>✓</button>
                        <button className="tbl-btn" onClick={() => setConfirmDelete(null)}>✕</button>
                      </div>
                    ) : (
                      <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(loc.id)} style={{ fontSize: 11 }}>Delete</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AdminModal
          title={modal.mode === 'create' ? 'Add Market Location' : `Edit Location #${modal.data.id}`}
          onClose={closeModal} onSubmit={handleSubmit}
          saving={saving} submitLabel={modal.mode === 'create' ? 'Add Location' : 'Save Changes'}
          formError={formError}
        >
          <div className="form-field">
            <label className="form-label">Market Name</label>
            <input className="form-input" type="text" required placeholder="e.g. San Fernando Public Market"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label">Municipality</label>
            <select className="form-select" required value={form.municipality} onChange={e => setForm(f => ({ ...f, municipality: e.target.value }))}>
              <option value="" disabled>Select municipality...</option>
              {LA_UNION_MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

// ─── Audit Log Section ────────────────────────────────────────────────────────

const FULL_AUDIT = [
  ...MOCK_AUDIT,
  { ts: '2d ago', actor: 'Admin',   action: 'approved vendor',   target: 'Bay City Catch LLC',       kind: 'user' },
  { ts: '2d ago', actor: 'System',  action: 'rotated API key',   target: 'Marine data service',       kind: 'system' },
  { ts: '3d ago', actor: 'BFAR',    action: 'ended advisory',    target: 'Gale warning #24',          kind: 'advisory' },
  { ts: '3d ago', actor: 'Admin',   action: 'added location',    target: 'Balaoan Public Market',     kind: 'lookup' },
  { ts: '4d ago', actor: 'System',  action: 'flagged high-value',target: 'ORD-7201 ₱48,000',          kind: 'flag' },
  { ts: '4d ago', actor: 'Admin',   action: 'disabled user',     target: 'Ghost account (id 44)',     kind: 'user' },
  { ts: '5d ago', actor: 'System',  action: 'backup completed',  target: 'PostgreSQL full dump',      kind: 'system' },
  { ts: '5d ago', actor: 'Admin',   action: 'updated species',   target: 'Galunggong → Round Scad',   kind: 'lookup' },
]

function AuditLogSection() {
  const [tab, setTab] = useState('all')
  const filtered = tab === 'all' ? FULL_AUDIT : FULL_AUDIT.filter(a => a.kind === tab)

  return (
    <div className="page">
      <PageHead
        eyebrow="Compliance"
        title={<>Audit <em>Log</em></>}
        sub={`${FULL_AUDIT.length} events recorded`}
      />

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card__head">
          <div className="seg">
            {['all', 'user', 'advisory', 'lookup', 'flag', 'system'].map(k => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {k === 'all' ? `All (${FULL_AUDIT.length})` : `${k.charAt(0).toUpperCase() + k.slice(1)} (${FULL_AUDIT.filter(a => a.kind === k).length})`}
              </button>
            ))}
          </div>
        </div>

        <table className="tbl tbl--audit">
          <thead>
            <tr><th style={{ width: 70 }}>Time</th><th style={{ width: 90 }}>Kind</th><th>Action</th><th>Target</th></tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td className="data" style={{ color: 'var(--ink-4)' }}>{a.ts}</td>
                <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                <td><strong>{a.actor}</strong> {a.action}</td>
                <td style={{ color: 'var(--ink-3)' }}>{a.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Rail (sidebar) ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'overview',   icon: 'Dashboard', label: 'Overview',         tip: 'Overview' },
  { id: 'users',      icon: 'Users',     label: 'Users',            tip: 'Users' },
  { id: 'advisories', icon: 'Alert',     label: 'Advisories',       tip: 'Advisories' },
  { id: 'species',    icon: 'Fish',      label: 'Fish Species',     tip: 'Fish Species' },
  { id: 'locations',  icon: 'MapPin',    label: 'Market Locations', tip: 'Locations' },
  { id: 'audit',      icon: 'Clipboard', label: 'Audit Log',        tip: 'Audit Log' },
]

function AdminRail({ page, setPage, user, onLogout }) {
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <aside className="rail" data-accent="plum">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Admin Console</div>
        {NAV_ITEMS.map(it => {
          const Icon = I[it.icon]
          return (
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => setPage(it.id)}
              data-tip={it.tip}
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
      </div>
      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{user?.fullName?.split(' ')[0] || 'Admin'}</span>
            <span className="rail__user-role">ADMIN</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

const NAV_LABELS = {
  overview:   'Overview',
  users:      'Users',
  advisories: 'Advisories',
  species:    'Fish Species',
  locations:  'Market Locations',
  audit:      'Audit Log',
}

function AdminTopbar({ page }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span><span>/</span>
        <span>Admin</span><span>/</span>
        <strong>{NAV_LABELS[page] || page}</strong>
      </div>
      <div className="topbar__spacer" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <I.Shield size={14} style={{ color: 'var(--ink-4)' }} />
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Administrator
        </span>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard({ user, token, onLogout }) {
  const [page, setPage] = useState('overview')

  return (
    <div className="app" data-accent="plum" data-density="balanced">
      <AdminRail page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <div className="main">
        <AdminTopbar page={page} />
        <div className="content">
          {page === 'overview'   && <OverviewSection    token={token} user={user} setPage={setPage} />}
          {page === 'users'      && <UsersSection       token={token} />}
          {page === 'advisories' && <AdvisoriesSection  token={token} />}
          {page === 'species'    && <FishSpeciesSection  token={token} />}
          {page === 'locations'  && <MarketLocationsSection token={token} />}
          {page === 'audit'      && <AuditLogSection />}
        </div>
      </div>
    </div>
  )
}
