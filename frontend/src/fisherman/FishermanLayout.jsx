import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { I } from '../icons'
import FishermanNotificationsBell from './components/NotificationsBell'

const NAV = [
  { to: 'home',         label: 'Home',         icon: 'Dashboard' },
  { to: 'trips',        label: 'Trips',        icon: 'Anchor' },
  { to: 'catch-alerts', label: 'Catch Alerts', icon: 'Bell' },
  { to: 'orders',       label: 'Orders',       icon: 'Clipboard' },
  { to: 'procurement',  label: 'Procurement',  icon: 'Store' },
  { to: 'marketplace',  label: 'Marketplace',  icon: 'Fish' },
  { to: 'earnings',     label: 'Earnings',     icon: 'Receipt' },
  { to: 'messages',     label: 'Messages',     icon: 'Message' },
  { to: 'profile',      label: 'Profile',      icon: 'Settings' },
]

export default function FishermanLayout({ user, onLogout }) {
  const location = useLocation()
  const segment  = location.pathname.split('/')[2] || 'home'
  const current  = NAV.find(n => n.to === segment)
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'FI'
  const firstName = user?.fullName?.split(' ')[0] || 'Fisherman'

  return (
    <div className="app" data-density="balanced">
      <aside className="rail">
        <div className="rail__logo">
          <div className="rail__logo-mark">M</div>
        </div>
        <div className="rail__items">
          <div className="rail__label">Workspace</div>
          {NAV.map(n => {
            const Icon = I[n.icon] || I.Dashboard
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `rail-item${isActive ? ' rail-item--on' : ''}`}
                data-tip={n.label}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="rail-item__icon"><Icon size={18} /></div>
                <div className="rail-item__text">{n.label}</div>
              </NavLink>
            )
          })}
          <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
          <button
            type="button"
            className="rail-item"
            onClick={onLogout}
            data-tip="Sign out"
            style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', color: 'inherit' }}
          >
            <div className="rail-item__icon"><I.Logout size={18} /></div>
            <div className="rail-item__text">Sign Out</div>
          </button>
        </div>
        <div className="rail__bottom">
          <div className="rail__user">
            <div className="rail__avatar">{initials}</div>
            <div className="rail__user-info">
              <span className="rail__user-name">{firstName}</span>
              <span className="rail__user-role">FISHERMAN</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            <span>Mermaid</span>
            <span>/</span>
            <strong>{current?.label || 'Fisherman'}</strong>
          </div>
          <div className="topbar__spacer" />
          <FishermanNotificationsBell />
          <button className="topbar__icon-btn" title="Help">
            <I.Help size={16} />
          </button>
        </div>
        <div className="content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
