import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { I } from '../icons'
import NotificationsBell from './components/NotificationsBell'
import { SavedCountBadge } from './components/FavoriteHeart'
import OrderModal from './components/OrderModal'

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  browse:    'Browse Market',
  cart:      'Cart',
  checkout:  'Checkout',
  orders:    'My Orders',
  saved:     'Saved',
  messages:  'Messages',
  profile:   'My Profile',
  listing:   'Listing',
  vendor:    'Vendor',
}

function Rail({ user, onLogout, badges = {} }) {
  const items = [
    { to: '/buyer/dashboard', icon: 'Dashboard', label: 'Dashboard' },
    { to: '/buyer/browse',    icon: 'Store',     label: 'Browse Market' },
    { to: '/buyer/cart',      icon: 'Receipt',   label: 'Cart',           badge: badges.cart },
    { to: '/buyer/orders',    icon: 'Clipboard', label: 'My Orders',      badge: badges.orders },
    { to: '/buyer/saved',     icon: 'Star',      label: 'Saved' },
    { to: '/buyer/messages',  icon: 'Message',   label: 'Messages',       badge: badges.messages },
    { to: '/buyer/profile',   icon: 'Settings',  label: 'My Profile' },
  ]

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BU'
  const firstName = user?.fullName?.split(' ')[0] || 'Buyer'

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
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => `rail-item${isActive ? ' rail-item--on' : ''}`}
              data-tip={it.label}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="rail-item__icon" style={{ position: 'relative' }}>
                <Icon size={18} />
                {it.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 99,
                    background: 'var(--unsafe)', color: '#fff',
                    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1,
                  }}>
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </div>
              <div className="rail-item__text">{it.label}</div>
            </NavLink>
          )
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <button
          type="button"
          className="rail-item"
          onClick={onLogout}
          data-tip="Sign out"
          aria-label="Sign out"
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
        >
          <div className="rail-item__icon" aria-hidden="true"><I.Logout size={18} /></div>
          <div className="rail-item__text">Sign Out</div>
        </button>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{firstName}</span>
            <span className="rail__user-role">BUYER</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  const location = useLocation()
  const segment = location.pathname.split('/')[2] || 'dashboard'
  const label = PAGE_LABELS[segment] || segment
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search listings, orders…" />
        <kbd>⌘K</kbd>
      </div>
      <NotificationsBell />
      <button className="topbar__icon-btn" title="Help">
        <I.Help size={16} />
      </button>
    </div>
  )
}

export default function BuyerLayout({ user, onLogout, badges, quickOrderListing, setQuickOrderListing, onOrderSuccess }) {
  const location = useLocation()

  // Scroll content to top on every route change
  useEffect(() => {
    const el = document.querySelector('.content')
    if (el) el.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [location.pathname])

  return (
    <div className="app" data-density="balanced" data-accent="sage">
      <Rail user={user} onLogout={onLogout} badges={badges} />
      <div className="main">
        <Topbar />
        <div className="content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet context={{ setQuickOrderListing }} />
        </div>
      </div>

      {quickOrderListing && (
        <OrderModal
          listing={quickOrderListing}
          onClose={() => setQuickOrderListing(null)}
          onSuccess={onOrderSuccess}
        />
      )}
    </div>
  )
}
