import { useState } from 'react'
import { I } from '../icons'
import { StompProvider } from '../context/StompContext'
import Home from './Home'
import StorefrontEditor from './StorefrontEditor'
import Inventory from './Inventory'
import OrdersInbox from './OrdersInbox'
import ProcurementFeed from './ProcurementFeed'
import Watchlist from './Watchlist'
import Analytics from './Analytics'
import Reviews from './Reviews'
import Payouts from './Payouts'
import ShopProfile from './ShopProfile'

const VENDOR_NAV_ITEMS = [
  { id: 'vdashboard',   icon: 'Dashboard', label: 'Dashboard' },
  { id: 'vstore',       icon: 'Receipt',   label: 'Storefront' },
  { id: 'vinventory',   icon: 'Box',       label: 'Inventory' },
  { id: 'vorders',      icon: 'Clipboard', label: 'Orders' },
  { id: 'vprocurement', icon: 'Fish',      label: 'Source Catch' },
  { id: 'vwatchlist',   icon: 'Star',      label: 'Watchlist' },
  { id: 'vanalytics',   icon: 'Bars',      label: 'Analytics' },
  { id: 'vreviews',     icon: 'Heart',     label: 'Reviews' },
  { id: 'vpayouts',     icon: 'Wallet',    label: 'Payouts' },
  { id: 'vshop',        icon: 'User',      label: 'Shop profile' },
]

const PAGE_LABELS = {
  vdashboard:   'Dashboard',
  vstore:       'Storefront',
  vinventory:   'Inventory',
  vorders:      'Orders',
  vprocurement: 'Source Catch',
  vwatchlist:   'Catch Watchlist',
  vanalytics:   'Analytics',
  vreviews:     'Reviews',
  vpayouts:     'Payouts',
  vshop:        'Shop Profile',
}

function Rail({ page, navigate, user, onLogout }) {
  const initials = user
    ? (user.fullName || user.first || 'V').slice(0, 1) + ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'V'
  const displayName  = user?.first || user?.fullName?.split(' ')[0] || 'Vendor'
  const displaySub   = user?.business || user?.businessName || 'Vendor'

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {VENDOR_NAV_ITEMS.map(it => {
          const Icon = I[it.icon]
          return (
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => navigate(it.id)}
              data-tip={it.label}
            >
              <div className="rail-item__icon"><Icon size={18} /></div>
              <div className="rail-item__text">{it.label}</div>
            </div>
          )
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onLogout} data-tip="Log out">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Log out</div>
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
            <span className="rail__user-name">{displayName}</span>
            <span className="rail__user-role">VENDOR · {displaySub}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ page }) {
  const label = PAGE_LABELS[page] || page
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <span style={{color: 'var(--ink-3)'}}>Vendor</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search listings, fishermen, alerts…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
    </div>
  )
}

function PageContent({ page, pageState, navigate }) {
  switch (page) {
    case 'vdashboard':   return <Home setPage={navigate} />
    case 'vstore':       return <StorefrontEditor pageState={pageState} setPage={navigate} />
    case 'vinventory':   return <Inventory />
    case 'vorders':      return <OrdersInbox pageState={pageState} setPage={navigate} />
    case 'vprocurement': return <ProcurementFeed pageState={pageState} setPage={navigate} />
    case 'vwatchlist':   return <Watchlist setPage={navigate} />
    case 'vanalytics':   return <Analytics setPage={navigate} />
    case 'vreviews':     return <Reviews />
    case 'vpayouts':     return <Payouts />
    case 'vshop':        return <ShopProfile />
    default:             return <Home setPage={navigate} />
  }
}

export default function VendorDashboard({ user, onLogout }) {
  const [page, setPage] = useState('vdashboard')
  const [pageState, setPageState] = useState(null)

  const navigate = (id, state = null) => {
    setPage(id)
    setPageState(state)
  }

  return (
    <StompProvider>
      <div className="app" data-accent="warm" data-density="balanced">
        <Rail page={page} navigate={navigate} user={user} onLogout={onLogout} />
        <div className="main">
          <Topbar page={page} />
          <PageContent page={page} pageState={pageState} navigate={navigate} />
        </div>
      </div>
    </StompProvider>
  )
}
