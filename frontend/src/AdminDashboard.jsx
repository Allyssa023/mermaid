import { useState, useEffect, useRef } from 'react'
import { I } from './icons'

// ─── Mock data (inline from data-admin.jsx) ───────────────────────────────────

const ADMIN_USER = {
  id: 1,
  fullName: 'Liza Domingo',
  first: 'Liza',
  email: 'liza@mermaid.ph',
  role: 'ADMIN',
  team: 'Platform Operations',
  port: 'BFAR Region IV-A',
}

const ADMIN_USERS = [
  { id: 101, fullName: 'Ramiro Delgado',     email: 'ramiro@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2025-08-12', lastSeen: '2h ago',     trips: 47, region: 'Batangas' },
  { id: 102, fullName: 'Carlos Bautista',    email: 'carlos@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2025-09-04', lastSeen: '5h ago',     trips: 32, region: 'Quezon' },
  { id: 103, fullName: 'Tomas Reyes',        email: 'tomas@mermaid.ph',      role: 'FISHERMAN', active: true,  joined: '2025-07-21', lastSeen: '1h ago',     trips: 51, region: 'Quezon' },
  { id: 104, fullName: 'Helena Cruz',        email: 'helena@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2025-11-02', lastSeen: '4d ago',     trips: 28, region: 'Batangas' },
  { id: 105, fullName: 'Capt. Arturo R.',    email: 'arturo@mermaid.ph',     role: 'FISHERMAN', active: true,  joined: '2024-12-15', lastSeen: 'Yesterday', trips: 89, region: 'Batangas' },
  { id: 106, fullName: 'Mateo Villar',       email: 'mateo@mermaid.ph',      role: 'FISHERMAN', active: false, joined: '2025-10-08', lastSeen: '11d ago',    trips: 14, region: 'Quezon' },
  { id: 210, fullName: 'Inez Marina',        email: 'inez@marinaseafoods.ph',role: 'VENDOR',    active: true,  joined: '2025-06-10', lastSeen: '1h ago',     listings: 28, region: 'Quezon' },
  { id: 211, fullName: 'Bay City Market',    email: 'ops@baycity.ph',        role: 'VENDOR',    active: true,  joined: '2025-07-01', lastSeen: '8h ago',     listings: 19, region: 'Quezon' },
  { id: 212, fullName: 'J. Aquino & Sons',   email: 'jaquino@aquino.ph',     role: 'VENDOR',    active: true,  joined: '2025-09-17', lastSeen: 'Yesterday', listings: 11, region: 'Batangas' },
  { id: 213, fullName: 'Puerto Azul Resto',  email: 'kitchen@puertoazul.ph', role: 'VENDOR',    active: true,  joined: '2025-08-22', lastSeen: '3h ago',     listings: 8,  region: 'Batangas' },
  { id: 214, fullName: 'Del Mar Cold Chain', email: 'ops@delmar.ph',         role: 'VENDOR',    active: true,  joined: '2025-05-30', lastSeen: '6h ago',     listings: 22, region: 'Batangas' },
  { id: 215, fullName: 'Taal Lake Fresh',    email: 'desk@taallake.ph',      role: 'VENDOR',    active: false, joined: '2025-12-01', lastSeen: '24d ago',    listings: 4,  region: 'Batangas' },
  { id: 1,   fullName: 'Liza Domingo',       email: 'liza@mermaid.ph',       role: 'ADMIN',     active: true,  joined: '2024-09-01', lastSeen: 'now',        region: 'HQ' },
  { id: 2,   fullName: 'Renato Villanueva',  email: 'reno@mermaid.ph',       role: 'ADMIN',     active: true,  joined: '2024-09-01', lastSeen: '2d ago',     region: 'HQ' },
]

const ADMIN_ADVISORIES = [
  { id: 1, title: 'Tropical Depression Emong',
    message: 'Sustained winds 65 km/h; gusts to 90 km/h. Cancel all offshore trips through Friday.',
    severity: 'HIGH', affectedArea: 'Sibuyan Sea', isActive: true,
    activeFrom: '2026-04-22T06:00:00+08:00', activeTo: '2026-04-26T18:00:00+08:00',
    createdAt: '2026-04-22T05:42:00+08:00', createdBy: 'Liza Domingo' },
  { id: 2, title: 'Small-craft advisory',
    message: 'Wave heights 1.5–2.0m expected between 14:00–20:00. Exercise caution.',
    severity: 'MEDIUM', affectedArea: 'Balayan Bay', isActive: true,
    activeFrom: '2026-04-23T08:00:00+08:00', activeTo: '2026-04-23T22:00:00+08:00',
    createdAt: '2026-04-23T07:14:00+08:00', createdBy: 'Renato Villanueva' },
  { id: 3, title: 'Lunar tide extreme',
    message: 'Spring tides this week. Low at 03:42, high 09:15. Plan landings accordingly.',
    severity: 'LOW', affectedArea: 'Tayabas Bay', isActive: true,
    activeFrom: '2026-04-22T00:00:00+08:00', activeTo: '2026-04-25T23:59:00+08:00',
    createdAt: '2026-04-22T09:00:00+08:00', createdBy: 'Liza Domingo' },
  { id: 4, title: 'Squall line moving NE',
    message: 'Isolated thunderstorms; visibility may drop below 500m intermittently.',
    severity: 'MEDIUM', affectedArea: 'Ragay Gulf', isActive: true,
    activeFrom: '2026-04-22T18:00:00+08:00', activeTo: '2026-04-24T06:00:00+08:00',
    createdAt: '2026-04-22T17:30:00+08:00', createdBy: 'Liza Domingo' },
  { id: 5, title: 'Reef closure — spawning season',
    message: 'No fishing activity in protected zone for next 14 days.',
    severity: 'CRITICAL', affectedArea: 'Apo Reef', isActive: true,
    activeFrom: '2026-04-20T00:00:00+08:00', activeTo: '2026-05-04T00:00:00+08:00',
    createdAt: '2026-04-19T16:00:00+08:00', createdBy: 'BFAR Coordination' },
  { id: 6, title: 'Old advisory — high winds',
    message: 'Sustained winds 45 km/h, advised caution.',
    severity: 'MEDIUM', affectedArea: 'Sibuyan Sea', isActive: false,
    activeFrom: '2026-04-15T00:00:00+08:00', activeTo: '2026-04-17T00:00:00+08:00',
    createdAt: '2026-04-15T05:00:00+08:00', createdBy: 'Liza Domingo' },
]

const ADMIN_SPECIES = [
  { id: 1, commonName: 'Yellowfin Tuna',      scientificName: 'Thunnus albacares',          active: true,  usageCount: 247 },
  { id: 2, commonName: 'Skipjack',            scientificName: 'Katsuwonus pelamis',         active: true,  usageCount: 312 },
  { id: 3, commonName: 'Mahi-mahi',           scientificName: 'Coryphaena hippurus',        active: true,  usageCount: 184 },
  { id: 4, commonName: 'Red Snapper',         scientificName: 'Lutjanus campechanus',       active: true,  usageCount: 96  },
  { id: 5, commonName: 'Grouper (Lapu-lapu)', scientificName: 'Epinephelus fuscoguttatus',  active: true,  usageCount: 142 },
  { id: 6, commonName: 'Spanish Mackerel',    scientificName: 'Scomberomorus commerson',    active: true,  usageCount: 88  },
  { id: 7, commonName: 'Squid (Pusit)',       scientificName: 'Loligo duvaucelii',          active: true,  usageCount: 156 },
  { id: 8, commonName: 'Blue Marlin',         scientificName: 'Makaira nigricans',          active: true,  usageCount: 24  },
  { id: 9, commonName: 'Sailfish',            scientificName: 'Istiophorus platypterus',    active: false, usageCount: 3   },
]

const ADMIN_LOCATIONS = [
  { id: 1, name: 'Marina Seafoods Depot', municipality: 'Quezon',        province: 'Quezon',   active: true,  vendors: 1, listings: 28 },
  { id: 2, name: 'Bay City Market',       municipality: 'Lucena City',   province: 'Quezon',   active: true,  vendors: 1, listings: 19 },
  { id: 3, name: 'Lipa Port',             municipality: 'Lipa',          province: 'Batangas', active: true,  vendors: 1, listings: 11 },
  { id: 4, name: 'Anilao Landing',        municipality: 'Mabini',        province: 'Batangas', active: true,  vendors: 1, listings: 8  },
  { id: 5, name: 'Batangas Port',         municipality: 'Batangas City', province: 'Batangas', active: true,  vendors: 1, listings: 22 },
  { id: 6, name: 'Taal Fresh',            municipality: 'Taal',          province: 'Batangas', active: false, vendors: 1, listings: 4  },
]

const ADMIN_METRICS = {
  totalUsers: 1287,
  fishermen: 942,
  vendors: 341,
  admins: 4,
  newThisWeek: 28,
  activeNow: 184,

  totalTrips: 8642,
  activeTrips: 47,
  tripsToday: 96,

  totalListings: 412,
  openListings: 187,

  totalAlerts: 2341,
  activeAlerts: 84,

  totalOrders: 5611,
  ordersToday: 138,
  orderVolumeKg: 18420,
  orderVolumePhp: 4120000,

  disputedOrders: 7,

  uptimePct: 99.94,
  marineApiHealth: 'OK',
  mailQueue: 12,
}

const ADMIN_DAU = (() => {
  const out = []
  for (let i = 0; i < 30; i++) {
    const base = 220 + Math.sin(i / 4) * 35 + (i % 7 === 6 ? -40 : 0)
    out.push({ day: i, dau: Math.round(base + Math.random() * 22) })
  }
  return out
})()

const ADMIN_AUDIT = [
  { ts: '08:42', actor: 'Renato Villanueva', action: 'updated advisory', target: 'A-2 Small-craft advisory', kind: 'advisory' },
  { ts: '08:11', actor: 'System',            action: 'auto-expired',     target: '12 catch alerts',          kind: 'system' },
  { ts: '07:55', actor: 'Liza Domingo',      action: 'created species',  target: 'Threadfin Bream',          kind: 'lookup' },
  { ts: '07:30', actor: 'System',            action: 'flagged dispute',  target: 'ORD-7387 Bay City vs Mateo', kind: 'flag' },
  { ts: '06:18', actor: 'Liza Domingo',      action: 'deactivated user', target: 'Mateo Villar (id 106)',    kind: 'user' },
  { ts: 'Yest. 22:14', actor: 'BFAR Coord',  action: 'posted advisory',  target: 'A-5 Reef closure',         kind: 'advisory' },
  { ts: 'Yest. 18:02', actor: 'System',      action: 'sync OK',          target: 'Marine data · Open-Meteo', kind: 'system' },
  { ts: 'Yest. 14:40', actor: 'Liza Domingo', action: 'merged duplicate', target: 'Yellowfin Tuna ↔ Tuna YF', kind: 'lookup' },
]

const ADMIN_HEALTH = [
  { name: 'API Gateway',              status: 'OK',   detail: '99.94% uptime · p95 142ms' },
  { name: 'PostgreSQL',               status: 'OK',   detail: '24 connections · 0 slow queries' },
  { name: 'Marine data (Open-Meteo)', status: 'OK',   detail: 'Last sync 4 min ago' },
  { name: 'Mail queue',               status: 'WARN', detail: '12 pending · oldest 8 min' },
  { name: 'WebSocket (chat)',         status: 'OK',   detail: '47 active connections' },
  { name: 'Storage',                  status: 'OK',   detail: '38% of 100GB used' },
]

// ─── Inline Rail + Topbar from shell.jsx ─────────────────────────────────────

const ROLE_NAV = {
  ADMIN: {
    user: () => ADMIN_USER,
    items: [
      { id: 'aoverview',   icon: 'Dashboard', label: 'Overview' },
      { id: 'ausers',      icon: 'Users',     label: 'Users' },
      { id: 'aadvisories', icon: 'Alert',     label: 'Advisories', badge: 5 },
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

function Rail({ role, page, setPage, onTweaks, onSwitchRole }) {
  const cfg = ROLE_NAV[role]
  const user = cfg.user()
  const initials = user.first.slice(0, 1) + (user.fullName.split(' ')[1]?.slice(0, 1) || '')

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
              {it.badge ? <span className="rail-item__badge">{it.badge}</span> : null}
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
            <span className="rail__user-name">{user.first}</span>
            <span className="rail__user-role">{user.role} · {user.vessel || user.business || user.team || ''}</span>
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

function AdminOverviewPage({ setPage }) {
  const M = ADMIN_METRICS
  const max = Math.max(...ADMIN_DAU.map(d => d.dau))

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Platform</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{ADMIN_USER.first}</em></h1>
          <p className="page__sub">{M.activeNow} users online now · {M.tripsToday} trips · {M.ordersToday} orders today.</p>
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
        <div className="stat"><div className="l">Total users</div><div className="v">{M.totalUsers.toLocaleString()}</div><div className="s">+{M.newThisWeek} this week</div></div>
        <div className="stat"><div className="l">Active now</div><div className="v">{M.activeNow}</div><div className="s">{Math.round(M.activeNow/M.totalUsers*100)}% of base</div></div>
        <div className="stat"><div className="l">Trips today</div><div className="v">{M.tripsToday}</div><div className="s">{M.activeTrips} live now</div></div>
        <div className="stat"><div className="l">Orders today</div><div className="v">{M.ordersToday}</div><div className="s">₱{(M.orderVolumePhp/1000000).toFixed(1)}M MTD</div></div>
        <div className="stat"><div className="l">Disputes</div><div className="v" style={{color: M.disputedOrders > 5 ? 'var(--unsafe)' : 'var(--ink)'}}>{M.disputedOrders}</div><div className="s">Need review</div></div>
        <div className="stat"><div className="l">Uptime</div><div className="v">{M.uptimePct}%</div><div className="s">Last 30 days</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {/* Daily active users chart */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Daily active users · 30 days</div>
              <div className="card__sub">Average {Math.round(ADMIN_DAU.reduce((a,d)=>a+d.dau,0)/ADMIN_DAU.length)} DAU</div>
            </div>
            <div className="seg seg--sm">
              <button className="on">DAU</button>
              <button>Trips</button>
              <button>Orders</button>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px'}}>
            {ADMIN_DAU.map((d, i) => {
              const h = (d.dau / max) * 100
              return (
                <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4}}>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: i === ADMIN_DAU.length - 1 ? 'var(--accent)' : 'var(--ink-soft)',
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
              { name: 'Fishermen', count: M.fishermen, color: 'oklch(0.55 0.09 220)' },
              { name: 'Vendors',   count: M.vendors,   color: 'oklch(0.55 0.09 55)' },
              { name: 'Buyers',    count: M.totalUsers - M.fishermen - M.vendors - M.admins, color: 'oklch(0.55 0.07 150)' },
              { name: 'Admins',    count: M.admins,    color: 'oklch(0.50 0.10 330)' },
            ].map(r => {
              const pct = (r.count / M.totalUsers) * 100
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
              <div className="card__sub">{ADMIN_HEALTH.filter(h=>h.status==='OK').length}/{ADMIN_HEALTH.length} services nominal</div>
            </div>
          </div>
          <div className="health-list">
            {ADMIN_HEALTH.map(h => (
              <div key={h.name} className="health-item">
                <span className={`health-dot health-dot--${h.status.toLowerCase()}`} />
                <div className="health-item__body">
                  <div className="health-item__name">{h.name}</div>
                  <div className="health-item__detail">{h.detail}</div>
                </div>
                <span className={`chip chip--${h.status === 'OK' ? 'safe' : h.status === 'WARN' ? 'warn' : 'unsafe'}`}>{h.status}</span>
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
              {ADMIN_AUDIT.map((a, i) => (
                <tr key={i}>
                  <td className="data" style={{color:'var(--ink-4)', width: 80}}>{a.ts}</td>
                  <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                  <td><strong>{a.actor}</strong> {a.action}</td>
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

function AdminUsersPage({ setPage }) {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const filtered = ADMIN_USERS.filter(u => {
    const m = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const t = tab === 'all' ? true : u.role === tab.toUpperCase()
    return m && t
  })

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Users</div>
          <h1 className="page__title" style={{marginTop: 4}}>User <em>Management</em></h1>
          <p className="page__sub">{ADMIN_USERS.length} accounts · {ADMIN_USERS.filter(u=>u.active).length} active.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Export CSV</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Invite user</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='all'?'on':''} onClick={()=>setTab('all')}>All ({ADMIN_USERS.length})</button>
            <button className={tab==='fisherman'?'on':''} onClick={()=>setTab('fisherman')}>Fishermen ({ADMIN_USERS.filter(u=>u.role==='FISHERMAN').length})</button>
            <button className={tab==='vendor'?'on':''} onClick={()=>setTab('vendor')}>Vendors ({ADMIN_USERS.filter(u=>u.role==='VENDOR').length})</button>
            <button className={tab==='admin'?'on':''} onClick={()=>setTab('admin')}>Admins ({ADMIN_USERS.filter(u=>u.role==='ADMIN').length})</button>
          </div>
          <div className="search-input" style={{minWidth: 220}}>
            <I.Search size={13} />
            <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <table className="tbl tbl--users">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Region</th><th>Activity</th><th>Joined</th><th>Last seen</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="row--link">
                <td>
                  <div className="row" style={{gap: 10}}>
                    <div className="user-avatar">{u.fullName.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
                    <div>
                      <div style={{fontWeight: 500}}>{u.fullName}</div>
                      <small style={{color:'var(--ink-4)'}}>{u.email}</small>
                    </div>
                  </div>
                </td>
                <td><span className={`role-pill role-pill--${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td style={{color:'var(--ink-3)'}}>{u.region}</td>
                <td className="data">
                  {u.trips !== undefined ? `${u.trips} trips` : u.listings !== undefined ? `${u.listings} listings` : '—'}
                </td>
                <td className="data" style={{color:'var(--ink-4)'}}>{u.joined}</td>
                <td style={{color:'var(--ink-4)'}}>{u.lastSeen}</td>
                <td>
                  <span className={`status status--${u.active ? 'active' : 'inactive'}`}>
                    <span className="status__dot" /> {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td><button className="btn btn--ghost btn--sm"><I.Dots size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminAdvisoriesPage({ setPage }) {
  const [tab, setTab] = useState('active')
  const filtered = ADMIN_ADVISORIES.filter(a => tab === 'active' ? a.isActive : !a.isActive)
  const sevColor = { LOW: 'var(--ink-4)', MEDIUM: 'var(--warn)', HIGH: 'var(--unsafe)', CRITICAL: 'var(--unsafe)' }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Safety</div>
          <h1 className="page__title" style={{marginTop: 4}}>Marine <em>Advisories</em></h1>
          <p className="page__sub">{ADMIN_ADVISORIES.filter(a=>a.isActive).length} active advisories broadcasting to fishermen and vendors.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary"><I.Plus size={14} /> New advisory</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({ADMIN_ADVISORIES.filter(a=>a.isActive).length})</button>
            <button className={tab==='archive'?'on':''} onClick={()=>setTab('archive')}>Archive ({ADMIN_ADVISORIES.filter(a=>!a.isActive).length})</button>
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
                  <span>·</span>
                  <span>By {a.createdBy}</span>
                </div>
              </div>
              <div className="advisory-item__actions">
                <button className="btn btn--ghost btn--sm">Edit</button>
                {a.isActive ? <button className="btn btn--ghost btn--sm">End now</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AdminSpeciesPage({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Fish <em>Species</em></h1>
          <p className="page__sub">{ADMIN_SPECIES.filter(s=>s.active).length} active species in the catalog · used across {ADMIN_SPECIES.reduce((a,s)=>a+s.usageCount,0).toLocaleString()} catches and listings.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary"><I.Plus size={14} /> Add species</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <table className="tbl">
          <thead>
            <tr><th>Common name</th><th>Scientific name</th><th>Usage</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {ADMIN_SPECIES.map(s => {
              const max = Math.max(...ADMIN_SPECIES.map(x => x.usageCount))
              return (
                <tr key={s.id} className="row--link">
                  <td style={{fontWeight: 500}}>{s.commonName}</td>
                  <td style={{fontStyle: 'italic', color: 'var(--ink-3)'}}>{s.scientificName}</td>
                  <td>
                    <div className="row" style={{gap: 8}}>
                      <span className="data" style={{minWidth: 36}}>{s.usageCount}</span>
                      <div style={{width: 80, height: 4, background:'var(--line-soft)', borderRadius: 2, overflow: 'hidden'}}>
                        <div style={{width: `${s.usageCount/max*100}%`, height: '100%', background: 'var(--accent)'}} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status status--${s.active ? 'active' : 'inactive'}`}>
                      <span className="status__dot" /> {s.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{gap: 6}}>
                      <button className="btn btn--ghost btn--sm">Edit</button>
                      <button className="btn btn--ghost btn--sm"><I.Dots size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminLocationsPage({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Market <em>Locations</em></h1>
          <p className="page__sub">{ADMIN_LOCATIONS.filter(l=>l.active).length} active drop-off and depot locations across {new Set(ADMIN_LOCATIONS.map(l=>l.province)).size} provinces.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary"><I.Plus size={14} /> Add location</button>
        </div>
      </div>

      <div className="locations-grid" style={{marginTop: 18}}>
        {ADMIN_LOCATIONS.map(l => (
          <div key={l.id} className={`location-card${!l.active ? ' location-card--inactive' : ''}`}>
            <div className="location-card__head">
              <I.MapPin size={14} />
              <span>{l.municipality}, {l.province}</span>
              <button className="btn btn--ghost btn--sm" style={{marginLeft:'auto'}}><I.Dots size={12} /></button>
            </div>
            <h3 className="location-card__name">{l.name}</h3>
            <div className="location-card__stats">
              <div><div className="l">Vendors</div><div className="v">{l.vendors}</div></div>
              <div><div className="l">Listings</div><div className="v">{l.listings}</div></div>
              <div><div className="l">Status</div><div className="v" style={{fontSize: 13, color: l.active ? 'var(--safe)' : 'var(--ink-4)'}}>{l.active ? 'Active' : 'Off'}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminAuditPage({ setPage }) {
  const [filter, setFilter] = useState('all')
  const filtered = ADMIN_AUDIT.filter(a => filter === 'all' ? true : a.kind === filter)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Compliance</div>
          <h1 className="page__title" style={{marginTop: 4}}>Audit <em>Log</em></h1>
          <p className="page__sub">All admin and system actions, ordered by recency.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Export</button>
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

        <table className="tbl tbl--audit">
          <thead>
            <tr><th>Time</th><th>Kind</th><th>Action</th><th>Target</th></tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td className="data" style={{color:'var(--ink-4)'}}>{a.ts}</td>
                <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                <td><strong>{a.actor}</strong> {a.action}</td>
                <td style={{color:'var(--ink-3)'}}>{a.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminDashboard({ user, onLogout }) {
  const [page, setPage] = useState('aoverview')

  const PAGES = {
    aoverview:   AdminOverviewPage,
    ausers:      AdminUsersPage,
    aadvisories: AdminAdvisoriesPage,
    aspecies:    AdminSpeciesPage,
    alocations:  AdminLocationsPage,
    aaudit:      AdminAuditPage,
  }
  const PageCmp = PAGES[page] || AdminOverviewPage

  return (
    <div className="app" data-accent="plum" data-density="balanced">
      <Rail role="ADMIN" page={page} setPage={setPage} onTweaks={() => {}} onSwitchRole={onLogout || (() => {})} />
      <main className="main">
        <Topbar role="ADMIN" page={page} />
        <PageCmp setPage={setPage} />
      </main>
    </div>
  )
}
