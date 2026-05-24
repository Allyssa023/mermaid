import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import '../design-system.css'
import './vendor-shell.css'
import { StompProvider } from '../context/StompContext'
import VendorNotificationsBell from './components/NotificationsBell'
import { getVendorHome } from './api/home'
import { listListings } from './api/storefront'
import { getFeed } from './api/procurement'
import { getNotifications } from '../api/notifications'
import Home from './Home'
import StorefrontEditor from './StorefrontEditor'
import Inventory from './Inventory'
import OrdersInbox from './OrdersInbox'
import ProcurementFeed from './ProcurementFeed'
import Analytics from './Analytics'
import Reviews from './Reviews'
import ShopProfile from './ShopProfile'
import VendorMessagesPage from './Messages'

const PAGE_LABELS = {
  vdashboard:   'Dashboard',
  vstore:       'Storefront',
  vinventory:   'Inventory',
  vorders:      'Orders',
  vprocurement: 'Source Catch',
  vmessages:    'Messages',
  vanalytics:   'Analytics',
  vreviews:     'Reviews',
  vshop:        'Shop Profile',
}

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'vdashboard',   icon: 'Dashboard', label: 'Dashboard' },
      { id: 'vstore',       icon: 'Store',     label: 'Storefront' },
      { id: 'vinventory',   icon: 'Box',       label: 'Inventory' },
      { id: 'vorders',      icon: 'Clipboard', label: 'Orders' },
      { id: 'vprocurement', icon: 'Fish',      label: 'Source Catch' },
      { id: 'vmessages',    icon: 'Message',   label: 'Messages' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'vanalytics',   icon: 'Bars',      label: 'Analytics' },
      { id: 'vreviews',     icon: 'Heart',     label: 'Reviews' },
      { id: 'vshop',        icon: 'Settings',  label: 'Shop profile' },
    ],
  },
]

function Rail({ page, navigate, badgeCounts, listings, onLogout, onMouseEnter, onMouseLeave }) {
  const [activeOpen, setActiveOpen] = useState(true)
  const activeListings = (listings ?? []).filter(l => l.status === 'PUBLISHED').slice(0, 4)

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
          <span className="rail__role">Vendor console</span>
        </div>
      </div>

      <div className="rail__seg">
        <button className="on" onClick={() => navigate('vdashboard')}>Vendor</button>
        <button onClick={() => navigate('vshop')}>Public shop</button>
      </div>

      {NAV_GROUPS.map(g => (
        <div key={g.label}>
          <div className="rail__group">{g.label}</div>
          <div className="rail__list">
            {g.items.map(it => {
              const Icon = I[it.icon]
              const badge = badgeCounts?.[it.id] ?? 0
              return (
                <div
                  key={it.id}
                  className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
                  onClick={() => navigate(it.id)}
                  title={it.label}
                >
                  <span className="ric">{Icon && <Icon size={17} />}</span>
                  <span className="rail-item__label">{it.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className={`rail-expandable${activeOpen ? ' open' : ''}`}>
        <div className="rail-item" onClick={() => setActiveOpen(o => !o)} style={{ cursor: 'pointer' }}>
          <span className="ric"><I.Bars size={17} /></span>
          <span className="rail-item__label">Active listings</span>
          <span className="chev"><I.ChevR size={13} /></span>
        </div>
        {activeOpen && (
          <div className="rail-sub">
            {activeListings.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--muted-2)', padding: '6px 8px' }}>No active listings</div>
            )}
            {activeListings.map(l => (
              <div key={l.id} className="rail-sub__item" onClick={() => navigate('vstore')}>
                <div className="rail-sub__thumb" style={{ '--c': 'var(--accent-lime)' }}>
                  {(l.speciesName || l.title || 'L')[0].toUpperCase()}
                </div>
                <div className="rail-sub__body">
                  <div className="rail-sub__name">{l.speciesName || l.title || 'Listing'}</div>
                  <div className="rail-sub__sub">₱{l.pricePerKg}/kg · {l.availableKg}kg left</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rail__group" style={{ marginTop: 8 }}>Account</div>
      <div className="rail__list">
        <div className="rail-item" onClick={onLogout} title="Sign out" style={{ cursor: 'pointer' }}>
          <span className="ric"><I.Logout size={17} /></span>
          <span className="rail-item__label">Sign Out</span>
        </div>
      </div>

      <div className="rail__spacer" />

      <div className="rail__cta" onClick={() => navigate('vanalytics')}>
        <div className="rail__cta-icon"><I.Trend size={16} /></div>
        <div className="rail__cta-body">
          <div className="rail__cta-title">Activate Super Tier</div>
          <div className="rail__cta-sub">Unlock storefront ads + insights</div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ page, user, onNewListing, onNavigate }) {
  const label = PAGE_LABELS[page] || page
  const initials = user
    ? (user.fullName || user.first || 'V').slice(0, 1) +
      ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'V'
  const displayName = user?.first || user?.fullName?.split(' ')[0] || 'Vendor'

  return (
    <div className="topbar">
      <div className="topbar__user">
        <div className="topbar__avatar">{initials}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>{user?.email || ''}</span>
            <span className="topbar__user-name">{displayName}</span>
          </div>
          <span className="topbar__user-role">VENDOR</span>
        </div>
      </div>

      <button className="topbar__deposit" onClick={onNewListing}>
        <I.Plus size={12} />
        New listing
      </button>

      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search orders, lots, alerts, buyers…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="crumbs" style={{ marginLeft: 'auto' }}>
        <span>Mermaid</span>
        <span className="sep">/</span>
        <span>Vendor</span>
        <span className="sep">/</span>
        <strong>{label}</strong>
      </div>

      <VendorNotificationsBell onNavigate={onNavigate} btnClassName="topbar__icon" />
      <button className="topbar__icon" title="Settings"><I.Settings size={15} /></button>
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
    case 'vmessages':    return <VendorMessagesPage />
    case 'vanalytics':   return <Analytics setPage={navigate} />
    case 'vreviews':     return <Reviews />
    case 'vshop':        return <ShopProfile />
    default:             return <Home setPage={navigate} />
  }
}

export default function VendorDashboard({ user, onLogout }) {
  const [page, setPage] = useState('vdashboard')
  const [pageState, setPageState] = useState(null)
  const [railOpen, setRailOpen] = useState(false)
  const pageRef = useRef(null)
  const location = useLocation()
  const routerNavigate = useNavigate()

  const homeQ = useQuery({
    queryKey: ['vendor', 'home'],
    queryFn: getVendorHome,
    staleTime: 60_000,
  })
  const listingsQ = useQuery({
    queryKey: ['vendor', 'storefront'],
    queryFn: listListings,
    staleTime: 60_000,
  })
  const unreadNotifsQ = useQuery({
    queryKey: ['notifications', { unreadOnly: true }],
    queryFn: () => getNotifications({ unreadOnly: true, size: 100 }),
    refetchInterval: 30000,
    staleTime: 0,
  })
  const feedQ = useQuery({
    queryKey: ['vendor', 'feed', null],
    queryFn: () => getFeed(null),
    refetchInterval: 30000,
    staleTime: 0,
  })

  const home = homeQ.data
  const listings = listingsQ.data ?? []
  const unreadNotifs = Array.isArray(unreadNotifsQ.data) ? unreadNotifsQ.data : []
  const feed = feedQ.data ?? []

  const orderUnread = unreadNotifs.filter(n => n.type === 'ORDER_STATUS' || (n.link && n.link.includes('order'))).length
  const messageUnread = unreadNotifs.filter(n => n.type === 'MESSAGE' || (n.link && n.link.includes('message'))).length

  // Calculate unseen active catch alerts count
  const maxAlertId = feed.length > 0 ? Math.max(...feed.map(a => a.id)) : 0
  const [lastSeenId, setLastSeenId] = useState(() => {
    return parseInt(localStorage.getItem('vendor_seen_catch_alert_id') || '0', 10)
  })

  useEffect(() => {
    if (!localStorage.getItem('vendor_seen_catch_alert_id') && maxAlertId > 0) {
      localStorage.setItem('vendor_seen_catch_alert_id', String(maxAlertId))
      setLastSeenId(maxAlertId)
    }
  }, [maxAlertId])

  useEffect(() => {
    if (page === 'vprocurement' && maxAlertId > lastSeenId) {
      localStorage.setItem('vendor_seen_catch_alert_id', String(maxAlertId))
      setLastSeenId(maxAlertId)
    }
  }, [page, maxAlertId, lastSeenId])

  const newCatchAlertsCount = page === 'vprocurement' ? 0 : feed.filter(a => a.id > lastSeenId).length

  const badgeCounts = {
    vinventory:   home?.lowStockSpecies?.length ?? 0,
    vorders:      orderUnread,
    vprocurement: newCatchAlertsCount,
    vmessages:    messageUnread,
  }

  useEffect(() => {
    if (location.pathname.startsWith('/vendor/messages') && page !== 'vmessages') {
      setPage('vmessages')
      setPageState(null)
    }
  }, [location.pathname, page])

  useEffect(() => {
    if (location.pathname === '/payment/return') {
      const params = new URLSearchParams(location.search)
      const orderId = params.get('orderId')
      setPage('vprocurement')
      setPageState({ paymentReturnOrderId: orderId })
      routerNavigate('/', { replace: true })
    }
  }, [location.pathname])

  const navigate = useCallback((id, state = null) => {
    if (id === page) return
    if (!pageRef.current) { setPage(id); setPageState(state); return }
    gsap.killTweensOf(pageRef.current)
    gsap.to(pageRef.current, {
      opacity: 0, duration: 0.12,
      onComplete: () => {
        setPage(id)
        setPageState(state)
        gsap.fromTo(pageRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        )
      }
    })
    if (id !== 'vmessages' && location.pathname.startsWith('/vendor/messages')) {
      routerNavigate('/', { replace: true })
    }
  }, [page, location.pathname, routerNavigate])

  return (
    <StompProvider>
      <div className="shell" data-rail-open={String(railOpen)}>
        <div className="app-bg" />
        <Rail
          page={page}
          navigate={navigate}
          badgeCounts={badgeCounts}
          listings={listings}
          onLogout={onLogout}
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
        />
        <div className="main">
          <Topbar page={page} user={user} onNewListing={() => navigate('vstore')} onNavigate={navigate} />
          <div ref={pageRef} style={{ flex: 1, overflowY: 'auto' }}>
            <PageContent page={page} pageState={pageState} navigate={navigate} />
          </div>
        </div>
      </div>
    </StompProvider>
  )
}
