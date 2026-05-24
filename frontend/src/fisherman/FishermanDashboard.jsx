import { useState, useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import '../design-system.css'
import './fisherman-shell.css'
import { StompProvider } from '../context/StompContext'
import { listTrips } from './api/trips'
import { getNotifications } from '../api/notifications'

import FishermanHomePage    from './Home'
import TripsPage            from './Trips'
import AlertsPage           from './CatchAlerts'
import ActiveDeals          from './ActiveDeals'
import OrdersPage           from './Orders'
import EarningsPage         from './Earnings'
import MessagesPage         from './Messages'
import FishermanProfilePage from './Profile'
import FishermanNotificationsBell from './components/NotificationsBell'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'Dashboard', label: 'Dashboard',    testId: 'nav-dashboard' },
  { id: 'trips',     icon: 'Anchor',    label: 'My Trips',     testId: 'nav-trips' },
  { id: 'alerts',    icon: 'Bell',      label: 'Catch Alerts', testId: 'nav-alerts' },
  { id: 'deals',     icon: 'Users',     label: 'Deals',        testId: 'nav-deals' },
  { id: 'orders',    icon: 'Clipboard', label: 'Orders',       testId: 'nav-orders' },
  { id: 'earnings',  icon: 'Wallet',    label: 'Earnings',     testId: 'nav-earnings' },
  { id: 'messages',  icon: 'Message',   label: 'Messages',     testId: 'nav-messages' },
  { id: 'profile',   icon: 'User',      label: 'Profile',      testId: 'nav-profile' },
]

const PAGE_LABELS = {
  dashboard: 'Dashboard', trips: 'My Trips', alerts: 'Catch Alerts',
  deals: 'Deals', orders: 'Orders', earnings: 'Earnings',
  messages: 'Messages', profile: 'Profile',
}

const PAGE_MAP = {
  dashboard: FishermanHomePage,
  trips:     TripsPage,
  alerts:    AlertsPage,
  deals:     ActiveDeals,
  orders:    OrdersPage,
  earnings:  EarningsPage,
  messages:  MessagesPage,
  profile:   FishermanProfilePage,
}

function initials(name) {
  if (!name) return 'F'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function FishermanDashboard({ user, onLogout }) {
  const [page, setPageState] = useState('dashboard')
  const [openDealId, setOpenDealId] = useState(null)
  const [railOpen, setRailOpen] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(null)
  const pageRef = useRef(null)
  const labelRefs = useRef([])

  const activeTripsQ = useQuery({
    queryKey: ['trips', 'ACTIVE'],
    queryFn: () => listTrips('ACTIVE'),
    select: (data) => (Array.isArray(data) ? data[0] : null),
    staleTime: 30_000,
  })
  const activeTrip = activeTripsQ.data ?? null

  const unreadNotifsQ = useQuery({
    queryKey: ['notifications', { unreadOnly: true }],
    queryFn: () => getNotifications({ unreadOnly: true, size: 100 }),
    refetchInterval: 30000,
    staleTime: 0,
  })
  const unreadNotifs = Array.isArray(unreadNotifsQ.data) ? unreadNotifsQ.data : []

  const orderUnread = unreadNotifs.filter(n => n.type === 'ORDER_STATUS' || (n.link && n.link.includes('order'))).length
  const messageUnread = unreadNotifs.filter(n => n.type === 'MESSAGE' || (n.link && n.link.includes('message'))).length
  const dealUnread = unreadNotifs.filter(n => n.type?.includes('DEAL') || (n.link && n.link.includes('deal'))).length

  const badgeCounts = {
    orders: orderUnread,
    deals: dealUnread,
    messages: messageUnread,
  }

  const navigateTo = useCallback((to, opts) => {
    if (to === page && !opts?.dealId) return
    if (profileDirty && page === 'profile') { setLeaveConfirm({ to }); return }
    setOpenDealId(opts?.dealId ?? null)
    if (!pageRef.current) { setPageState(to); return }
    gsap.killTweensOf(pageRef.current)
    gsap.to(pageRef.current, {
      opacity: 0, duration: 0.12,
      onComplete: () => {
        setPageState(to)
        gsap.fromTo(pageRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        )
      },
    })
  }, [page, profileDirty])

  // Label fade-in is handled entirely by CSS transition on .f-rail__item__label
  // (opacity 0→1 via [data-rail-open="true"] selector). Previously a gsap.from()
  // animation here could leave inline opacity:0 stuck on the elements.

  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!activeTrip?.startedAt) { setElapsed(''); return }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTrip.startedAt)) / 1000)
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60)
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
    tick(); const id = setInterval(tick, 60_000); return () => clearInterval(id)
  }, [activeTrip])

  useEffect(() => {
    const handleNavigate = (e) => {
      const { page: targetPage, dealId } = e.detail || {}
      if (targetPage) {
        navigateTo(targetPage, { dealId })
      }
    }
    window.addEventListener('mermaid:navigate', handleNavigate)
    return () => window.removeEventListener('mermaid:navigate', handleNavigate)
  }, [navigateTo])

  const userInitials = initials(user?.fullName)
  const userName = user?.fullName ?? 'Fisherman'
  const PageComponent = PAGE_MAP[page]

  return (
    <StompProvider>
      <div
        data-fisherman-shell
        data-rail-open={String(railOpen)}
      >
        {/* ── Rail ── */}
        <nav
          className="f-rail"
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
        >
          {/* Logo */}
          <div className="f-rail__logo">
            <div className="f-rail__logo-mark">M</div>
            <div className="f-rail__logo-text">
              <span className="f-rail__logo-name">Mermaid</span>
              <span className="f-rail__logo-sub">Fisherman</span>
            </div>
          </div>

          {/* Nav items */}
          <div className="f-rail__nav">
            {NAV_ITEMS.map((item, i) => {
              const NavIcon = I[item.icon] || I.Clipboard
              const badge = badgeCounts?.[item.id] ?? 0
              return (
                <button
                  key={item.id}
                  data-testid={item.testId}
                  className={`f-rail__item${page === item.id ? ' active' : ''}`}
                  onClick={() => navigateTo(item.id)}
                >
                  <span className="f-rail__item__icon"><NavIcon size={17} /></span>
                  <span className="f-rail__item__label" ref={el => { labelRefs.current[i] = el }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Sign Out — sits directly below nav, spacer pushes bottom content down */}
          <div className="f-rail__signout-wrap" style={{ padding: '0 6px 4px' }}>
            <button className="f-rail__item" onClick={onLogout}>
              <span className="f-rail__item__icon"><I.Logout size={17} /></span>
              <span className="f-rail__item__label">Sign Out</span>
            </button>
          </div>

          <div className="f-rail__spacer" />

          {/* Active trip card (expanded only) */}
          {activeTrip && (
            <div className="f-rail__featured">
              <div className="f-rail__featured-label">
                <span className="f-rail__featured-pulse" />
                Active Trip
              </div>
              <div className="f-rail__featured-title">{activeTrip.departurePoint ?? 'En route'}</div>
              <div className="f-rail__featured-sub">{activeTrip.targetArea ?? '—'}</div>
              {elapsed && (
                <div className="f-rail__featured-stat">
                  {elapsed} <small>elapsed</small>
                </div>
              )}
            </div>
          )}

          {/* User profile */}
          <div className="f-rail__bottom">
            <button className="f-rail__user" onClick={onLogout} style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}>
              <div className="f-rail__user-avatar">{userInitials}</div>
              <div className="f-rail__user-info">
                <span className="f-rail__user-name">{userName}</span>
                <span className="f-rail__user-role">BFAR · Fisherman</span>
              </div>
            </button>
          </div>
        </nav>

        {/* ── Main ── */}
        <div className="f-main">
          {/* Topbar */}
          <header className="f-topbar">
            <div className="f-topbar__crumbs">
              <span>Mermaid</span>
              <span className="sep">/</span>
              <span>Fisherman</span>
              <span className="sep">/</span>
              <strong>{PAGE_LABELS[page]}</strong>
            </div>

            {page === 'trips' || page === 'dashboard' ? (
              <button className="f-topbar__pill" onClick={() => navigateTo('trips')}>
                <I.Plus size={11} /> Log Catch
              </button>
            ) : null}

            <div className="f-topbar__spacer" />

            <div className="f-topbar__search">
              <I.Search size={13} />
              <input placeholder="Search trips, vendors, species…" readOnly />
              <kbd>⌘K</kbd>
            </div>

            <div style={{ position: 'relative' }}>
              <FishermanNotificationsBell />
            </div>

            <button className="f-topbar__icon-btn" onClick={() => navigateTo('profile')} title="Settings">
              <I.Settings size={16} />
            </button>

            <div className="f-topbar__profile">
              <div className="f-topbar__profile-avatar">{userInitials}</div>
              <div className="f-topbar__profile-info">
                <span className="f-topbar__profile-name">{userName.split(' ')[0]}</span>
                <span className="f-topbar__profile-role">BFAR · Verified</span>
              </div>
            </div>
          </header>

          {/* Page */}
          <div className="f-page-wrap" ref={pageRef}>
            <PageComponent
              setPage={navigateTo}
              setProfileDirty={setProfileDirty}
              activeTrip={activeTrip}
              openDealId={openDealId}
              clearOpenDealId={() => setOpenDealId(null)}
            />
          </div>
        </div>

        {/* Leave confirm modal */}
        {leaveConfirm && (
          <div className="f-modal-backdrop">
            <div className="f-modal">
              <div className="f-modal__title">Unsaved Changes</div>
              <p style={{ color: 'var(--ink-3)', marginBottom: 20, fontSize: '0.9rem' }}>
                You have unsaved profile changes. Leave anyway?
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="f-btn f-btn--secondary" onClick={() => setLeaveConfirm(null)}>
                  Stay on Profile
                </button>
                <button
                  className="f-btn f-btn--danger"
                  onClick={() => {
                    setProfileDirty(false)
                    setLeaveConfirm(null)
                    navigateTo(leaveConfirm.to)
                  }}
                >
                  Leave Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StompProvider>
  )
}
