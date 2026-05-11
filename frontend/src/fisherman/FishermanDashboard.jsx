import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'
import '../design-system.css'

import FishermanHomePage  from './Home'
import TripsPage          from './Trips'
import AlertsPage         from './CatchAlerts'
import OrdersPage         from './Orders'
import ProcurementPage    from './Procurement'
import EarningsPage       from './Earnings'
import MarketplacePage    from './Marketplace'
import MessagesPage       from './Messages'
import FishermanProfilePage from './Profile'
import PlannerPage        from './Planner'

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard',   icon: 'Dashboard', label: 'Dashboard' },
  { id: 'planner',     icon: 'Calendar',  label: 'Trip Planner' },
  { id: 'trips',       icon: 'Anchor',    label: 'My Trips' },
  { id: 'alerts',      icon: 'Bell',      label: 'Catch Alerts',     badge: 3 },
  { id: 'procurement', icon: 'Truck',     label: 'Procurement',      badge: 2 },
  { id: 'orders',      icon: 'Clipboard', label: 'Orders',           badge: 2 },
  { id: 'earnings',    icon: 'Wallet',    label: 'Earnings' },
  { id: 'market',      icon: 'Store',     label: 'Marketplace' },
  { id: 'messages',    icon: 'Message',   label: 'Messages',         badge: 3 },
  { id: 'profile',     icon: 'User',      label: 'Profile' },
]

const PAGE_LABELS = {
  dashboard:   'Dashboard',
  planner:     'Trip Planner',
  trips:       'My Trips',
  alerts:      'Catch Alerts',
  procurement: 'Procurement',
  orders:      'Orders',
  earnings:    'Earnings',
  market:      'Marketplace',
  messages:    'Messages',
  profile:     'Profile',
}

// ── Rail ─────────────────────────────────────────────────────────────────────

function Rail({ page, setPage, user, onLogout }) {
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
        {NAV_ITEMS.map(it => {
          const Icon = I[it.icon] || I.Dashboard
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
        <div className="rail-item" onClick={onLogout} data-tip="Sign out">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Sign Out</div>
        </div>
      </div>
      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{firstName}</span>
            <span className="rail__user-role">FISHERMAN · {user?.vessel || ''}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function Topbar({ page }) {
  const label = PAGE_LABELS[page] || page
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <span style={{color: 'var(--ink-3)'}}>Fisherman</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search trips, catches, vendors…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
    </div>
  )
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

export default function FishermanDashboard({ user, onLogout }) {
  const [page, setPage] = useState('dashboard')

  const PageComponent = {
    dashboard:   FishermanHomePage,
    planner:     PlannerPage,
    trips:       TripsPage,
    alerts:      AlertsPage,
    procurement: ProcurementPage,
    orders:      OrdersPage,
    earnings:    EarningsPage,
    market:      MarketplacePage,
    messages:    MessagesPage,
    profile:     FishermanProfilePage,
  }[page] || FishermanHomePage

  return (
    <div className="app" data-accent="ocean" data-density="balanced">
      <Rail page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <main className="main">
        <Topbar page={page} />
        <div className="content" style={{ flex: 1, overflowY: 'auto' }}>
          <PageComponent setPage={setPage} user={user} />
        </div>
      </main>
    </div>
  )
}
