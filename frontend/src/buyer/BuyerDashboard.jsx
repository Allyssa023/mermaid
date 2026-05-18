import { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { I } from '../icons'
import { useCart } from '../context/CartContext'
import '../design-system.css'
import './buyer-shell.css'
import './buyer-dashboard.css'
import './buyer-dashboard-v2.css'
import Home from './Home'
import Marketplace from './Marketplace'
import Cart from './Cart'
import Checkout from './Checkout'
import ListingDetail from './ListingDetail'
import Orders from './Orders'
import Favorites from './Favorites'
import Messages from './Messages'
import Profile from './Profile'

const PAGE_LABELS = {
  bhome:     'Home',
  bbrowse:   'Browse Marketplace',
  bcart:     'My Cart',
  bcheckout: 'Checkout',
  blisting:  'Listing Detail',
  borders:   'My Orders',
  bsaved:    'Saved',
  bmessages: 'Messages',
  bprofile:  'Profile',
}

const NAV_GROUPS = [
  {
    label: 'Marketplace',
    items: [
      { id: 'bhome',     icon: 'Dashboard', label: 'Home' },
      { id: 'bbrowse',   icon: 'Store',     label: 'Browse Market' },
      { id: 'bcart',     icon: 'Cart',      label: 'Cart' },
      { id: 'borders',   icon: 'Clipboard', label: 'My Orders' },
      { id: 'bsaved',    icon: 'Heart',     label: 'Saved' },
      { id: 'bmessages', icon: 'Message',   label: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'bprofile', icon: 'User', label: 'Profile' },
    ],
  },
]

function Rail({ page, navigate, badgeCounts, cart, onLogout, onMouseEnter, onMouseLeave }) {
  const [cartOpen, setCartOpen] = useState(true)
  const topItems = (cart?.groups ?? []).flatMap(g => g.items ?? []).slice(0, 2)
  const itemCount = cart?.itemCount ?? 0

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
          <span className="rail__role">Buyer console</span>
        </div>
      </div>

      <div className="role-tabs">
        <button className={`role-tabs__btn${page === 'bhome' || page === 'bprofile' ? ' role-tabs__btn--on' : ''}`} onClick={() => navigate('bhome')}>Buyer</button>
        <button className="role-tabs__btn" onClick={() => navigate('bbrowse')}>Market</button>
      </div>

      <div className="rail__nav">
        {NAV_GROUPS.map(g => (
          <div key={g.label}>
            <div className="rail__section">{g.label}</div>
            {g.items.map(it => {
              const Icon = I[it.icon]
              const badge = badgeCounts?.[it.id] ?? 0
              return (
                <div
                  key={it.id}
                  className={`nav-item${page === it.id ? ' nav-item--on' : ''}`}
                  onClick={() => navigate(it.id)}
                  title={it.label}
                >
                  <span className="nav-item__icon">{Icon && <Icon size={17} />}</span>
                  <span className="nav-item__label">{it.label}</span>
                  {badge > 0 && <span className="nav-item__badge">{badge}</span>}
                </div>
              )
            })}
          </div>
        ))}
        <div
          className="nav-item"
          onClick={onLogout}
          title="Sign out"
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-item__icon"><I.Logout size={17} /></span>
          <span className="nav-item__label">Sign Out</span>
        </div>
      </div>

      {/* Cart preview */}
      <div className={`rail-expandable${cartOpen ? ' open' : ''}`}>
        <div className="nav-item" onClick={() => setCartOpen(o => !o)} style={{ cursor: 'pointer' }}>
          <span className="nav-item__icon"><I.Cart size={17} /></span>
          <span className="nav-item__label">My Cart{itemCount > 0 ? ` (${itemCount})` : ''}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.5 }}><I.ChevR size={13} /></span>
        </div>
        {cartOpen && (
          <div className="rail__nested">
            {itemCount === 0 ? (
              <div className="rail-cart__empty" style={{ padding: '8px 16px', fontSize: 11, color: 'var(--muted-2)' }}>Cart is empty</div>
            ) : (
              <>
                {topItems.map((item, i) => (
                  <div key={item.id ?? i} className="nested-item" onClick={() => navigate('bcart')}>
                    <span className="nested-item__chip">{(item.speciesName || 'F')[0].toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.speciesName || 'Item'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{item.quantityKg}kg · ₱{item.lineTotal?.toLocaleString() ?? item.subtotal?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', cursor: 'pointer', borderTop: '1px solid var(--hairline)' }} onClick={() => navigate('bcart')}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₱{(cart?.grandTotal ?? 0).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="rail__spacer" />

      <div className="rail__promo" onClick={() => navigate('bbrowse')}>
        <div className="rail__promo-icon"><I.Fish size={16} /></div>
        <div className="rail__promo-body">
          <div className="rail__promo-head">Fresh catch today</div>
          <div className="rail__promo-sub">Browse new listings from fishermen</div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ user, onBrowse, cart, navigate }) {
  const initials = user
    ? (user.fullName || user.first || 'B').slice(0, 1) +
      ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'B'
  const displayName = user?.first || user?.fullName?.split(' ')[0] || 'Buyer'
  const handle = (user?.email || 'buyer').split('@')[0]

  return (
    <div className="topbar">
      <div className="user-pill">
        <div className="user-pill__avatar">{initials}</div>
        <div className="user-pill__info">
          <span className="user-pill__handle">@{handle}</span>
          <span className="user-pill__name">{displayName}</span>
        </div>
        <span className="tier-tag">BUYER</span>
      </div>

      <div className="topbar__chrome">
        <button className="topbar__chrome-btn" title="Back"><I.ChevL size={13} /></button>
        <button className="topbar__chrome-btn" title="Forward"><I.ChevR size={13} /></button>
      </div>

      <button className="btn-v2" style={{ background: 'var(--accent-violet-deep)', borderColor: 'var(--accent-violet-deep)', color: '#fff' }} onClick={() => navigate('bcart')}>
        <I.Cart size={14} />
        Cart &middot; ₱{(cart?.grandTotal ?? 0).toLocaleString()}
      </button>

      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search vendors, species, listings…" />
        <kbd>⌘K</kbd>
      </div>

      <button className="bell-btn" title="Notifications">
        <I.Bell size={15} />
        <span className="bell-btn__dot" />
      </button>
      <button className="topbar__icon" title="Settings"><I.Settings size={15} /></button>
    </div>
  )
}

function PageContent({ page, setPage, buyNow, setBuyNow, listingId, setListingId, user }) {
  switch (page) {
    case 'bhome':     return <Home setPage={setPage} user={user} />
    case 'bbrowse':   return <Marketplace setPage={setPage} setBuyNow={setBuyNow} setListingId={setListingId} />
    case 'bcart':     return <Cart setPage={setPage} />
    case 'bcheckout': return <Checkout setPage={setPage} buyNow={buyNow} setBuyNow={setBuyNow} />
    case 'blisting':  return <ListingDetail setPage={setPage} listingId={listingId} setBuyNow={setBuyNow} setListingId={setListingId} />
    case 'borders':   return <Orders setPage={setPage} />
    case 'bsaved':    return <Favorites setPage={setPage} />
    case 'bmessages': return <Messages setPage={setPage} user={user} />
    case 'bprofile':  return <Profile setPage={setPage} user={user} />
    default:          return <Home setPage={setPage} user={user} />
  }
}

export default function BuyerDashboard({ user, onLogout }) {
  const [page, setPage] = useState('bhome')
  const [buyNow, setBuyNow] = useState(null)
  const [listingId, setListingId] = useState(null)
  const [railOpen, setRailOpen] = useState(false)
  const pageRef = useRef(null)
  const { cart } = useCart()

  const badgeCounts = {
    bcart:     cart?.itemCount ?? 0,
    borders:   0,
    bmessages: 0,
  }

  const navigate = useCallback((id, state = null) => {
    if (id === page) return
    if (!pageRef.current) { setPage(id); return }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.killTweensOf(pageRef.current)
      gsap.to(pageRef.current, {
        opacity: 0, duration: 0.12,
        onComplete: () => {
          setPage(id)
          gsap.fromTo(pageRef.current,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
          )
        }
      })
    } else {
      setPage(id)
    }
    if (state !== null) {
      if (id === 'blisting') setListingId(state)
      if (id === 'bcheckout') setBuyNow(state)
    }
  }, [page])

  return (
    <div className="shell" data-rail={railOpen ? 'expanded' : 'collapsed'}>
      <div className="app-bg" />
      <Rail
        page={page}
        navigate={navigate}
        badgeCounts={badgeCounts}
        cart={cart}
        onLogout={onLogout}
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => setRailOpen(false)}
      />
      <div className="main">
        <Topbar page={page} user={user} onBrowse={() => navigate('bbrowse')} cart={cart} navigate={navigate} />
        <div ref={pageRef} style={{ flex: 1, overflowY: 'auto' }}>
          <PageContent
            page={page}
            setPage={navigate}
            buyNow={buyNow}
            setBuyNow={setBuyNow}
            listingId={listingId}
            setListingId={setListingId}
            user={user}
          />
        </div>
      </div>
    </div>
  )
}
