import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import '../design-system.css'
import './vendor-shell.css'
import { StompProvider } from '../context/StompContext'
import { getVendorHome } from './api/home'
import Home from './Home'
import StorefrontEditor from './StorefrontEditor'
import Inventory from './Inventory'
import OrdersInbox from './OrdersInbox'
import ProcurementFeed from './ProcurementFeed'
import Analytics from './Analytics'
import Reviews from './Reviews'
import ShopProfile from './ShopProfile'
import VendorMessagesPage from './Messages'

const VENDOR_NAV_ITEMS = [
  { id: 'vdashboard',   icon: 'Dashboard', label: 'Dashboard' },
  { id: 'vstore',       icon: 'Receipt',   label: 'Storefront' },
  { id: 'vinventory',   icon: 'Box',       label: 'Inventory' },
  { id: 'vorders',      icon: 'Clipboard', label: 'Orders' },
  { id: 'vprocurement', icon: 'Fish',      label: 'Source Catch' },
  { id: 'vmessages',    icon: 'Message',   label: 'Messages' },
  { id: 'vanalytics',   icon: 'Bars',      label: 'Analytics' },
  { id: 'vreviews',     icon: 'Heart',     label: 'Reviews' },
  { id: 'vshop',        icon: 'User',      label: 'Shop profile' },
]

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

function Rail({ page, navigate, user, onLogout, badgeCounts, onMouseEnter, onMouseLeave }) {
  const initials = user
    ? (user.fullName || user.first || 'V').slice(0, 1) +
      ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'V'
  const displayName = user?.first || user?.fullName?.split(' ')[0] || 'Vendor'
  const displaySub  = user?.businessName || user?.business || 'Vendor'

  return (
    <nav className="v-rail" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="v-rail__brand">
        <div className="v-rail__mark">M</div>
        <div className="v-rail__wordmark">
          <span className="v-rail__name">MERMAID</span>
          <span className="v-rail__role">Vendor console</span>
        </div>
      </div>

      <div className="v-rail__items">
        {VENDOR_NAV_ITEMS.map(it => {
          const Icon = I[it.icon]
          const badge = badgeCounts?.[it.id] ?? 0
          return (
            <div
              key={it.id}
              className={`v-rail-item${page === it.id ? ' v-rail-item--on' : ''}`}
              onClick={() => navigate(it.id)}
              title={it.label}
            >
              <span className="v-rail-item__icon"><Icon size={17} /></span>
              <span className="v-rail-item__label">{it.label}</span>
              {badge > 0 && <span className="v-rail-item__dot" />}
              {badge > 0 && <span className="v-rail-item__pill">{badge}</span>}
            </div>
          )
        })}
      </div>

      <div className="v-rail__bottom">
        <div className="v-rail__user" onClick={onLogout} title="Log out">
          <div className="v-rail__avatar">{initials}</div>
          <div className="v-rail__user-info">
            <span className="v-rail__user-name">{displayName}</span>
            <span className="v-rail__user-role">VENDOR · {displaySub}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

function Topbar({ page, user, onNewListing }) {
  const label = PAGE_LABELS[page] || page
  const initials = user
    ? (user.fullName || user.first || 'V').slice(0, 1) +
      ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'V'
  const displayName = user?.first || user?.fullName?.split(' ')[0] || 'Vendor'
  return (
    <div className="v-topbar">
      <div className="v-crumbs">
        <span>Mermaid</span>
        <span className="sep"> / </span>
        <span>Vendor</span>
        <span className="sep"> / </span>
        <strong>{label}</strong>
      </div>
      <div className="v-topbar__search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="Search orders, lots, alerts…" />
        <kbd>⌘K</kbd>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="v-topbar__icon" title="Notifications">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <div className="v-topbar__user">
          <div className="v-topbar__avatar">{initials}</div>
          <span className="v-topbar__name">{displayName}</span>
        </div>
      </div>
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
    queryKey: ['vendor-home'],
    queryFn: getVendorHome,
    staleTime: 60_000,
  })
  const home = homeQ.data
  const badgeCounts = {
    vinventory:   home?.lots?.length ?? 0,
    vorders:      (home?.openOrders?.new ?? 0) + (home?.openOrders?.preparing ?? 0),
    vprocurement: home?.recentMatchedCatchAlerts?.length ?? 0,
    vmessages:    home?.unreadMessageCount ?? 0,
  }

  // Bridge real URLs (e.g. /vendor/messages?deal=42 from ProcurementFeed) into
  // the tab-state shell. The Messages page itself reads ?deal=... via
  // useSearchParams, so we only need to flip the tab here.
  useEffect(() => {
    if (location.pathname.startsWith('/vendor/messages') && page !== 'vmessages') {
      setPage('vmessages')
      setPageState(null)
    }
  }, [location.pathname, page])

  // Handle Xendit payment return: /payment/return?orderId=...
  // Verifies the payment with Xendit and redirects to procurement orders tab.
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
      <div
        className="app"
        data-vendor-shell=""
        data-rail-open={String(railOpen)}
      >
        <Rail
          page={page}
          navigate={navigate}
          user={user}
          onLogout={onLogout}
          badgeCounts={badgeCounts}
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
        />
        <div
          className="v-main"
          onMouseEnter={() => setRailOpen(false)}
        >
          <Topbar page={page} user={user} onNewListing={() => navigate('vstore')} />
          <div className="v-page" ref={pageRef}>
            <PageContent page={page} pageState={pageState} navigate={navigate} />
          </div>
        </div>
      </div>
    </StompProvider>
  )
}
