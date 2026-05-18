import { useState, useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import '../design-system.css'
import './fisherman-shell.css'
import { StompProvider } from '../context/StompContext'
import { listTrips } from './api/trips'

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

export default function FishermanDashboard({ user, onLogout }) {
  const [page, setPageState] = useState('dashboard')
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

  const navigateTo = useCallback((to) => {
    if (to === page) return
    if (profileDirty && page === 'profile') {
      setLeaveConfirm({ to })
      return
    }
    if (!pageRef.current) { setPageState(to); return }
    gsap.killTweensOf(pageRef.current)
    gsap.to(pageRef.current, {
      opacity: 0, duration: 0.12,
      onComplete: () => {
        setPageState(to)
        gsap.fromTo(pageRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        )
      },
    })
  }, [page, profileDirty])

  useEffect(() => {
    const labels = labelRefs.current.filter(Boolean)
    if (!labels.length) return
    if (railOpen) {
      gsap.from(labels, { opacity: 0, x: -8, stagger: 0.04, duration: 0.2 })
    }
  }, [railOpen])

  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!activeTrip?.startedAt) { setElapsed(''); return }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTrip.startedAt)) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeTrip])

  const PageComponent = PAGE_MAP[page]

  return (
    <StompProvider>
      <div
        data-fisherman-shell
        data-rail-open={String(railOpen)}
        style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-app)' }}
      >
        <nav
          className="f-rail"
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
        >
          <div className="f-rail__logo">M</div>
          <div className="f-rail__nav">
            {NAV_ITEMS.map((item, i) => {
              const NavIcon = I[item.icon] || I.Dashboard
              return (
                <button
                  key={item.id}
                  data-testid={item.testId}
                  className={`f-rail__item${page === item.id ? ' active' : ''}`}
                  onClick={() => navigateTo(item.id)}
                  style={{ background: 'none' }}
                >
                  <span className="f-rail__item__icon"><NavIcon size={18} /></span>
                  <span
                    className="f-rail__item__label"
                    ref={el => { labelRefs.current[i] = el }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
            <button
              className="f-rail__item"
              onClick={onLogout}
              style={{ background: 'none', marginTop: 'auto' }}
              data-testid="nav-signout"
            >
              <span className="f-rail__item__icon"><I.Logout size={18} /></span>
              <span className="f-rail__item__label">Sign Out</span>
            </button>
          </div>

          {activeTrip && (
            <div className="f-rail__trip-card">
              <div className="f-rail__trip-card__label">Active Trip</div>
              <div className="f-rail__trip-card__value">{activeTrip.departurePoint ?? 'En route'}</div>
              <div className="f-rail__trip-card__value" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>{elapsed}</div>
            </div>
          )}
        </nav>

        <div className="f-main">
          <div className="f-topbar">
            <span className="f-topbar__title">{PAGE_LABELS[page]}</span>
            <FishermanNotificationsBell />
          </div>
          <div className="f-page-wrap" ref={pageRef}>
            <PageComponent
              setPage={navigateTo}
              setProfileDirty={setProfileDirty}
              activeTrip={activeTrip}
            />
          </div>
        </div>

        {leaveConfirm && (
          <div className="f-modal-backdrop">
            <div className="f-modal">
              <div className="f-modal__title">Unsaved Changes</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20, fontSize: '0.9rem' }}>
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
