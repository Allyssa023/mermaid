import { useState } from 'react'
import { I } from '../icons'
import Home from './Home'
import Cart from './Cart'
import Checkout from './Checkout'
import Profile from './Profile'
import ListingDetail from './ListingDetail'
import Marketplace from './Marketplace'
import Orders from './Orders'
import Favorites from './Favorites'
import Messages from './Messages'

// ─── Buyer nav config ────────────────────────────────────────────────────────
const BUYER_NAV = [
  { id: 'bhome',     icon: 'Dashboard', label: 'Home' },
  { id: 'bbrowse',   icon: 'Store',     label: 'Marketplace' },
  { id: 'bcart',     icon: 'Cart',      label: 'Cart',       badge: 3 },
  { id: 'borders',   icon: 'Clipboard', label: 'My Orders',  badge: 1 },
  { id: 'bsaved',    icon: 'Heart',     label: 'Saved' },
  { id: 'bmessages', icon: 'Message',   label: 'Messages',   badge: 1 },
  { id: 'bprofile',  icon: 'User',      label: 'Profile' },
]

const PAGE_LABELS = {
  bhome: 'Home', bbrowse: 'Browse Marketplace', bcart: 'Cart',
  bcheckout: 'Checkout', blisting: 'Listing detail', bvendor: 'Vendor storefront',
  borders: 'My Orders', bsaved: 'Saved Vendors',
  bmessages: 'Messages', bprofile: 'Profile',
}

// ─── Rail ────────────────────────────────────────────────────────────────────
function Rail({ page, setPage, user, onLogout }) {
  const first = user?.fullName?.split(' ')[0] || 'Buyer'
  const initials = (user?.fullName || 'B').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {BUYER_NAV.map(it => {
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
            <span className="rail__user-name">{first}</span>
            <span className="rail__user-role">BUYER</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Topbar ──────────────────────────────────────────────────────────────────
function Topbar({ page }) {
  const label = PAGE_LABELS[page] || page
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <span style={{ color: 'var(--ink-3)' }}>Buyer</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search vendors, species, listings…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
    </div>
  )
}

// ─── Page renderer ───────────────────────────────────────────────────────────
function renderPage(page, setPage, buyNow, setBuyNow, user, onLogout, listingId, setListingId) {
  switch (page) {
    case 'bhome':     return <Home setPage={setPage} user={user} />
    case 'bbrowse':   return <Marketplace setPage={setPage} setBuyNow={setBuyNow} setListingId={setListingId} />
    case 'bcart':     return <Cart setPage={setPage} />
    case 'bcheckout': return <Checkout setPage={setPage} buyNow={buyNow} setBuyNow={setBuyNow} />
    case 'blisting':  return <ListingDetail setPage={setPage} listingId={listingId} setBuyNow={setBuyNow} setListingId={setListingId} />
    case 'bvendor':   return <ListingDetail setPage={setPage} vendorView />
    case 'borders':   return <Orders setPage={setPage} />
    case 'bsaved':    return <Favorites setPage={setPage} />
    case 'bmessages': return <Messages setPage={setPage} user={user} />
    case 'bprofile':  return <Profile setPage={setPage} user={user} />
    default:          return <Home setPage={setPage} user={user} />
  }
}

// ─── BuyerDashboard ──────────────────────────────────────────────────────────
export default function BuyerDashboard({ user, onLogout }) {
  const [page, setPage] = useState('bhome')
  const [buyNow, setBuyNow] = useState(null)
  const [listingId, setListingId] = useState(null)

  return (
    <div className="app" data-accent="sage" data-density="balanced">
      <Rail page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <div className="main">
        <Topbar page={page} />
        <div className="content">
          {renderPage(page, setPage, buyNow, setBuyNow, user, onLogout, listingId, setListingId)}
        </div>
      </div>
    </div>
  )
}
