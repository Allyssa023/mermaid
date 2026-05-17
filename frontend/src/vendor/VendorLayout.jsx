import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { I } from '../icons'
import VendorNotificationsBell from './components/NotificationsBell'
import { StompProvider } from '../context/StompContext'

const NAV = [
  { to: 'home',         label: 'Home',         icon: 'Dashboard' },
  { to: 'storefront',   label: 'Storefront',   icon: 'Store' },
  { to: 'orders',       label: 'Orders',       icon: 'Clipboard' },
  { to: 'procurement',  label: 'Procurement',  icon: 'Fish' },
  { to: 'inventory',    label: 'Inventory',    icon: 'Box' },
  { to: 'shop-profile', label: 'Shop profile', icon: 'Settings' },
  { to: 'analytics',    label: 'Analytics',    icon: 'Waves' },
  { to: 'reviews',      label: 'Reviews',      icon: 'Message' },
]

export default function VendorLayout({ user, onLogout }) {
  const location = useLocation()
  const segment = location.pathname.split('/')[2] || 'home'
  const current = NAV.find(n => n.to === segment)
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'VE'
  const firstName = user?.fullName?.split(' ')[0] || 'Vendor'

  return (
    <StompProvider>
    <div className="app" data-density="balanced" data-accent="warm">
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
              <span className="rail__user-role">VENDOR</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            <span>Mermaid</span>
            <span>/</span>
            <strong>{current?.label || 'Vendor'}</strong>
          </div>
          <div className="topbar__spacer" />
          <div className="topbar__search">
            <I.Search size={14} />
            <input placeholder="Search orders, products…" />
            <kbd>⌘K</kbd>
          </div>
          <VendorNotificationsBell />
          <button className="topbar__icon-btn" title="Help">
            <I.Help size={16} />
          </button>
        </div>
        <div className="content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
    </StompProvider>
  )
}
