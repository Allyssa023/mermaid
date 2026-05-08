# Fisherman Role Modernization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the fisherman frontend from a monolithic state-based dashboard into a React Router application with the mermaid-handoff design system, then add earnings/utang tracking, SMS safety, profile management, and dispute resolution.

**Architecture:** Five phases of sequential delivery — Phase 0 (scaffold), Phase 1 (core UI + Trips), Phase 2 (content migration + backend DISPUTED fix), Phase 3 (earnings/utang), Phase 4 (profile/SMS), Phase 5 (disputes). All backend endpoints follow the API-first pattern: define in `api.yaml` → `./mvnw generate-sources` → implement generated interface.

**Tech Stack:** React 18, React Router v6, Vite, Vitest + Testing Library, Spring Boot 3, Flyway, PostgreSQL, OpenAPI Generator v7.20.0, textbee (SMS gateway)

---

## File Map

### Phase 0 — Scaffold
| Action | File |
|--------|------|
| Create | `frontend/src/fisherman/FishermanDashboard.jsx` |
| Create | `frontend/src/fisherman/FishermanLayout.jsx` |
| Create | `frontend/src/fisherman/api/trips.js` |
| Create | `frontend/src/fisherman/api/catchAlerts.js` |
| Create | `frontend/src/fisherman/api/procurement.js` |
| Create | `frontend/src/fisherman/api/earnings.js` |
| Create | `frontend/src/fisherman/api/profile.js` |
| Create | `frontend/src/fisherman/hooks/useFishermanPolling.js` |
| Modify | `frontend/src/App.jsx:33-35` |

### Phase 1 — Core UI
| Action | File |
|--------|------|
| Create | `frontend/src/fisherman/components/NotificationsBell.jsx` |
| Create | `frontend/src/fisherman/components/StatTile.jsx` |
| Create | `frontend/src/fisherman/Home.jsx` |
| Create | `frontend/src/fisherman/Trips.jsx` |
| Create | `frontend/src/fisherman/__tests__/Trips.test.jsx` |
| Delete | `frontend/src/MyTrips.jsx`, `frontend/src/TripPlanner.jsx` |

### Phase 2 — Migration + Bug Fix
| Action | File |
|--------|------|
| Modify | `backend/.../service/ProcurementOrderService.java:52-59,192-199` |
| Create | `backend/.../service/ProcurementOrderServiceTest.java` |
| Create | `frontend/src/fisherman/CatchAlerts.jsx` |
| Create | `frontend/src/fisherman/Procurement.jsx` |
| Create | `frontend/src/fisherman/Orders.jsx` |
| Create | `frontend/src/fisherman/Marketplace.jsx` |
| Create | `frontend/src/fisherman/Messages.jsx` |
| Delete | `frontend/src/CatchAlerts.jsx`, `src/Orders.jsx`, `src/Marketplace.jsx`, `src/Messages.jsx` |
| Delete | `frontend/src/messages.css`, `frontend/src/planner.css` |

### Phase 3 — Earnings / Utang
| Action | File |
|--------|------|
| Modify | `backend/src/main/resources/openapi/api.yaml` |
| Create | `backend/.../db/migration/V43__add_payment_method_to_orders.sql` |
| Modify | `backend/.../domain/Order.java` |
| Modify | `backend/.../controller/FishermanProcurementController.java:64-83` |
| Modify | `backend/.../controller/VendorProcurementController.java` |
| Modify | `backend/.../service/ProcurementOrderService.java` |
| Create | `backend/.../service/EarningsService.java` |
| Create | `backend/.../controller/EarningsController.java` |
| Create | `backend/.../service/EarningsServiceTest.java` |
| Create | `backend/.../controller/EarningsControllerTest.java` |
| Create | `frontend/src/fisherman/Earnings.jsx` |
| Create | `frontend/src/fisherman/__tests__/Earnings.test.jsx` |
| Modify | `frontend/src/vendor/ProcurementOrders.jsx` |

### Phase 4 — Profile + SMS
| Action | File |
|--------|------|
| Modify | `backend/src/main/resources/openapi/api.yaml` |
| Create | `backend/.../db/migration/V44__fisherman_profile_fields.sql` |
| Modify | `backend/.../domain/User.java` |
| Create | `backend/.../service/SmsService.java` |
| Create | `backend/.../service/TextbeeSmsService.java` |
| Modify | `backend/src/main/resources/application.properties` |
| Modify | `backend/.../service/TripService.java` |
| Create | `backend/.../controller/FishermanProfileController.java` |
| Create | `backend/.../service/TextbeeSmsServiceTest.java` |
| Create | `backend/.../service/TripServiceSmsTest.java` |
| Create | `backend/.../controller/FishermanProfileControllerTest.java` |
| Create | `frontend/src/fisherman/Profile.jsx` |

### Phase 5 — Disputes
| Action | File |
|--------|------|
| Modify | `backend/src/main/resources/openapi/api.yaml` |
| Create | `backend/.../db/migration/V45__order_disputes.sql` |
| Create | `backend/.../domain/OrderDispute.java` |
| Create | `backend/.../repository/OrderDisputeRepository.java` |
| Create | `backend/.../service/DisputeService.java` |
| Create | `backend/.../controller/FishermanDisputeController.java` |
| Modify | `backend/.../controller/VendorProcurementController.java` |
| Create | `backend/.../service/DisputeServiceTest.java` |
| Create | `backend/.../controller/FishermanDisputeControllerTest.java` |
| Modify | `frontend/src/fisherman/Procurement.jsx` |
| Modify | `frontend/src/vendor/ProcurementOrders.jsx` |

---

## Phase 0 — Scaffold & Architecture

### Task 0.1: Polling hook + API stubs

**Files:**
- Create: `frontend/src/fisherman/hooks/useFishermanPolling.js`
- Create: `frontend/src/fisherman/api/trips.js`
- Create: `frontend/src/fisherman/api/catchAlerts.js`
- Create: `frontend/src/fisherman/api/procurement.js`
- Create: `frontend/src/fisherman/api/earnings.js`
- Create: `frontend/src/fisherman/api/profile.js`

- [ ] **Step 1: Create the polling hook** — copy `useVendorPolling.js` verbatim, rename the export:

```js
// frontend/src/fisherman/hooks/useFishermanPolling.js
import { useState, useEffect, useRef, useCallback } from 'react'

const BASE_MS = 10_000
const MAX_MS  = 60_000

export function useFishermanPolling(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [isStale, setStale]   = useState(false)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const delayRef  = useRef(BASE_MS)
  const timerRef  = useRef(null)
  const mountedRef = useRef(true)

  const poll = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const result = await fetcher()
      if (!mountedRef.current) return
      setData(result); setStale(false); setError(null)
      delayRef.current = BASE_MS
    } catch (err) {
      if (!mountedRef.current) return
      setStale(true); setError(err)
      delayRef.current = Math.min(delayRef.current * 2, MAX_MS)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        timerRef.current = setTimeout(poll, delayRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    delayRef.current = BASE_MS
    setLoading(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') { clearTimeout(timerRef.current); poll() }
    }
    document.addEventListener('visibilitychange', onVisible)
    poll()
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [poll])

  const refetch = useCallback(() => {
    clearTimeout(timerRef.current)
    delayRef.current = BASE_MS
    setLoading(true)
    poll()
  }, [poll])

  return { data, isStale, error, loading, refetch }
}
```

- [ ] **Step 2: Create API stubs** — all import from `'../../api'`:

```js
// frontend/src/fisherman/api/trips.js
import { apiGet, apiPost, apiPatch } from '../../api'
export const listTrips    = (status) => apiGet('/trips' + (status ? `?status=${status}` : ''))
export const startTrip    = (body)   => apiPost('/trips', body)
export const endTrip      = (id, body) => apiPatch(`/trips/${id}/end`, body)
export const saveChecklist = (id, body) => apiPost(`/trips/${id}/checklist`, body)

// frontend/src/fisherman/api/catchAlerts.js
import { apiGet, apiPost, apiPatch } from '../../api'
export const listCatchAlerts   = () => apiGet('/catch-alerts/my')
export const createCatchAlert  = (body) => apiPost('/catch-alerts', body)
export const cancelCatchAlert  = (id)   => apiPatch(`/catch-alerts/${id}/cancel`, {})

// frontend/src/fisherman/api/procurement.js
import { apiGet, apiPost, apiPatch } from '../../api'
export const listProcurementOrders = (bucket) => apiGet(`/fisherman/procurement-orders${bucket ? `?bucket=${bucket}` : ''}`)
export const acceptOrder    = (id) => apiPatch(`/fisherman/procurement-orders/${id}/accept`, {})
export const markReady      = (id) => apiPatch(`/fisherman/procurement-orders/${id}/ready`, {})
export const completeOrder  = (id) => apiPatch(`/fisherman/procurement-orders/${id}/complete`, {})
export const cancelOrder    = (id, reason) => apiPost(`/fisherman/procurement-orders/${id}/cancel`, { reason })
export const raiseDispute   = (id, body) => apiPost(`/fisherman/procurement-orders/${id}/dispute`, body)
export const getDispute     = (id) => apiGet(`/fisherman/procurement-orders/${id}/dispute`)
export const resolveDispute = (id, body) => apiPatch(`/fisherman/procurement-orders/${id}/dispute/resolve`, body)

// frontend/src/fisherman/api/earnings.js
import { apiGet } from '../../api'
export const getEarningsSummary = (from, to) =>
  apiGet('/fisherman/earnings/summary' + (from ? `?from=${from}&to=${to}` : ''))
export const getEarningsLedger  = (from, to) =>
  apiGet('/fisherman/earnings/ledger' + (from ? `?from=${from}&to=${to}` : ''))

// frontend/src/fisherman/api/profile.js
import { apiGet, apiPut } from '../../api'
export const getProfile    = () => apiGet('/fisherman/profile')
export const updateProfile = (body) => apiPut('/fisherman/profile', body)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/fisherman/
git commit -m "feat(fisherman): scaffold api stubs and polling hook"
```

---

### Task 0.2: FishermanLayout.jsx

**Files:**
- Create: `frontend/src/fisherman/FishermanLayout.jsx`

- [ ] **Step 1: Create the layout** — mirrors VendorLayout but 9 nav items and no `data-accent`:

```jsx
// frontend/src/fisherman/FishermanLayout.jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/FishermanLayout.jsx
git commit -m "feat(fisherman): add FishermanLayout with 9-item rail nav"
```

---

### Task 0.3: FishermanDashboard.jsx + App.jsx cutover

**Files:**
- Create: `frontend/src/fisherman/FishermanDashboard.jsx`
- Modify: `frontend/src/App.jsx:33-35`

- [ ] **Step 1: Create FishermanDashboard** — Routes-only shell, mirrors VendorDashboard exactly (same `<Route path="/vendor" ...>` absolute-path pattern, just substituting `/fisherman`). React Router v6 supports absolute paths in nested `<Routes>` inside a `<BrowserRouter>`; child routes resolve correctly. Verify by confirming `frontend/src/vendor/VendorDashboard.jsx` uses the same structure before writing:

```jsx
// frontend/src/fisherman/FishermanDashboard.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import '../design-system.css'
import '../handoff.css'
import FishermanLayout from './FishermanLayout'
import Home         from './Home'
import Trips        from './Trips'
import CatchAlerts  from './CatchAlerts'
import Orders       from './Orders'
import Procurement  from './Procurement'
import Marketplace  from './Marketplace'
import Earnings     from './Earnings'
import Messages     from './Messages'
import Profile      from './Profile'

export default function FishermanDashboard({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/fisherman" element={<FishermanLayout user={user} onLogout={onLogout} />}>
        <Route index element={<Navigate to="/fisherman/home" replace />} />
        <Route path="home"         element={<Home />} />
        <Route path="trips"        element={<Trips />} />
        <Route path="catch-alerts" element={<CatchAlerts />} />
        <Route path="orders"       element={<Orders />} />
        <Route path="procurement"  element={<Procurement />} />
        <Route path="marketplace"  element={<Marketplace />} />
        <Route path="earnings"     element={<Earnings />} />
        <Route path="messages"     element={<Messages />} />
        <Route path="profile"      element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/fisherman/home" replace />} />
    </Routes>
  )
}
```

> Note: Home, Trips, etc. will be stub components initially — create empty ones that render a `<div>` so the router doesn't break.

- [ ] **Step 2: Update App.jsx** — wrap fisherman branch in BrowserRouter and swap import:

In `frontend/src/App.jsx`, change line 8 and lines 33-35:

```jsx
// Change import at top:
import FishermanDashboard from './fisherman/FishermanDashboard'

// Change fisherman branch (line 33-35):
  if (user.role === 'FISHERMAN') {
    return (
      <>
        <BrowserRouter>
          <FishermanDashboard user={user} onLogout={logout} />
        </BrowserRouter>
        <ThemeToggle />
      </>
    )
  }
```

- [ ] **Step 3: Create stub pages** — create empty components for each route so the app loads without errors:

```jsx
// Each of: Home.jsx, Trips.jsx, CatchAlerts.jsx, Orders.jsx, 
//          Procurement.jsx, Marketplace.jsx, Earnings.jsx, Messages.jsx, Profile.jsx
// Temporary stub:
export default function Home() {
  return <div className="page"><div className="page__head"><h1>Coming soon</h1></div></div>
}
```

- [ ] **Step 4: Run dev server, verify fisherman login navigates to `/fisherman/home`**

```bash
cd frontend && npm run dev
# Log in as a FISHERMAN user — should see rail nav with 9 items
```

- [ ] **Step 5: Delete old FishermanDashboard.jsx**

```bash
rm frontend/src/FishermanDashboard.jsx
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(fisherman): React Router shell + BrowserRouter in App.jsx"
```

---

## Phase 1 — Core Dashboard + Trips

### Task 1.1: NotificationsBell.jsx + StatTile.jsx

**Files:**
- Create: `frontend/src/fisherman/components/NotificationsBell.jsx`
- Create: `frontend/src/fisherman/components/StatTile.jsx`

- [ ] **Step 1: Create StatTile** — reusable KPI tile:

```jsx
// frontend/src/fisherman/components/StatTile.jsx
export default function StatTile({ label, value, unit, colorVar }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value" style={colorVar ? { color: `var(${colorVar})` } : undefined}>
        {value ?? '—'}
        {unit && <small style={{ fontFamily: 'var(--font-ui)', fontSize: 11, marginLeft: 2 }}>{unit}</small>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create NotificationsBell** — mirrors vendor bell; use CSS vars not hardcoded hex:

```jsx
// frontend/src/fisherman/components/NotificationsBell.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { apiGet, apiPost } from '../../api'

export default function FishermanNotificationsBell() {
  const [count, setCount]   = useState(0)
  const [open, setOpen]     = useState(false)
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const fetchCount = useCallback(() => {
    apiGet('/notifications/unread-count').then(d => setCount(d?.count ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 30_000)
    return () => clearInterval(id)
  }, [fetchCount])

  const open_ = () => {
    setOpen(o => !o)
    if (!open) {
      setLoading(true)
      apiGet('/notifications?limit=10')
        .then(d => setItems(Array.isArray(d) ? d : d?.content || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }

  const markAll = async () => {
    await apiPost('/notifications/mark-all-read', {}).catch(() => {})
    setCount(0)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar__icon-btn"
        onClick={open_}
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--unsafe)', color: 'var(--paper)',
            borderRadius: '50%', fontSize: 9, fontWeight: 700,
            width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100,
          width: 320, background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Notifications</span>
            {count > 0 && (
              <button onClick={markAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No notifications</div>
            ) : items.map(n => (
              <div key={n.id} style={{
                padding: '10px 16px', borderBottom: '1px solid var(--line)',
                background: n.read ? undefined : 'var(--accent-soft)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: n.read ? 400 : 600 }}>{n.title || n.message}</div>
                {n.body && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{n.body}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/fisherman/components/
git commit -m "feat(fisherman): NotificationsBell + StatTile components"
```

---

### Task 1.2: Home.jsx

**Files:**
- Create: `frontend/src/fisherman/Home.jsx`

- [ ] **Step 1: Implement Home.jsx** — replaces the stub; migrates content from the existing `src/FishermanDashboard.jsx` home sections with design system applied:

```jsx
// frontend/src/fisherman/Home.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'
import StatTile from './components/StatTile'

const RISK_CLS = { SAFE: 'chip--safe', CAUTION: 'chip--caution', UNSAFE: 'chip--unsafe' }

export default function Home() {
  const navigate = useNavigate()
  const [conditions, setConditions] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [cond, adv, trips, orders] = await Promise.allSettled([
        apiGet('/marine/conditions'),
        apiGet('/advisories?active=true'),
        apiGet('/trips?status=ACTIVE'),
        apiGet('/fisherman/procurement-orders?bucket=PENDING'),
      ])
      if (cond.status === 'fulfilled') setConditions(cond.value)
      if (adv.status === 'fulfilled')  setAdvisories(Array.isArray(adv.value) ? adv.value : adv.value?.content || [])
      if (trips.status === 'fulfilled') {
        const list = Array.isArray(trips.value) ? trips.value : trips.value?.content || []
        setActiveTrip(list.find(t => t.status === 'ACTIVE') || null)
      }
      if (orders.status === 'fulfilled') {
        const list = Array.isArray(orders.value) ? orders.value : orders.value?.content || []
        setPendingOrders(list.length)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const overall = conditions?.overallRisk || conditions?.riskLevel || 'UNKNOWN'

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Operations</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Today on the <em>water.</em>
          </h1>
          <p className="page__sub">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/fisherman/trips')}>
            Start Trip
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : (
        <>
          {/* Sea Conditions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__head">
              <div className="card__title">Sea Conditions</div>
              <span className={`chip ${RISK_CLS[overall] || 'chip'} chip--dot`}>{overall}</span>
            </div>
            {conditions && (
              <div className="grid grid--kpi" style={{ marginTop: 12 }}>
                <StatTile label="Wave Height" value={conditions.waveHeight} unit="m" />
                <StatTile label="Wind Speed"  value={conditions.windSpeed}  unit="km/h" />
                <StatTile label="Wind Gusts"  value={conditions.windGusts}  unit="km/h" />
                <StatTile label="Precipitation" value={conditions.precipitation} unit="mm" />
              </div>
            )}
          </div>

          {/* Active Trip */}
          {activeTrip && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--safe)' }}>
              <div className="card__head">
                <div>
                  <div className="eyebrow">Active Trip</div>
                  <div className="card__title">{activeTrip.vesselName || 'Current Trip'}</div>
                  <div className="card__sub">Departed {new Date(activeTrip.startedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/trips')}>View</button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__title" style={{ marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/catch-alerts')}>Catch Alerts</button>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/procurement')}>
                Vendor Orders{pendingOrders > 0 ? ` (${pendingOrders})` : ''}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/fisherman/earnings')}>Earnings</button>
            </div>
          </div>

          {/* Advisories */}
          {advisories.length > 0 && (
            <div className="card">
              <div className="card__title" style={{ marginBottom: 12 }}>Active Advisories</div>
              <div className="adv-list">
                {advisories.map(a => (
                  <div key={a.id} className="adv-item">
                    <span className={`chip chip--dot ${RISK_CLS[a.riskLevel] || ''}`}>{a.riskLevel}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-2)', marginLeft: 8 }}>{a.title || a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/Home.jsx
git commit -m "feat(fisherman): Home dashboard with conditions, active trip, quick actions"
```

---

### Task 1.3: Trips.jsx with StartTripModal (TDD)

**Files:**
- Create: `frontend/src/fisherman/Trips.jsx`
- Create: `frontend/src/fisherman/__tests__/Trips.test.jsx`

- [ ] **Step 1: Write failing test** — Start button must be disabled until all 6 items are checked:

```jsx
// frontend/src/fisherman/__tests__/Trips.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Inline StartTripModal for isolated test
import StartTripModal from '../Trips'  // will export StartTripModal as named export

describe('StartTripModal checklist gate', () => {
  it('Start Trip button is disabled until all 6 items are checked', () => {
    const onClose = vi.fn()
    const onStarted = vi.fn()
    render(<StartTripModal onClose={onClose} onStarted={onStarted} />)

    // Step 2 is the checklist step — simulate clicking through to it
    // Enter vessel name and click Next to reach checklist
    const vesselInput = screen.getByPlaceholderText(/vessel name/i)
    fireEvent.change(vesselInput, { target: { value: 'MV Test' } })
    fireEvent.click(screen.getByText('Next'))

    // Now on checklist step — Start Trip should be disabled
    const startBtn = screen.getByRole('button', { name: /start trip/i })
    expect(startBtn).toBeDisabled()

    // Check all 6 boxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(6)
    checkboxes.forEach(cb => fireEvent.click(cb))

    // Now Start Trip should be enabled
    expect(startBtn).not.toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --run src/fisherman/__tests__/Trips.test.jsx
# Expected: FAIL — StartTripModal not exported / component not yet created
```

- [ ] **Step 3: Implement Trips.jsx** with named export `StartTripModal`:

```jsx
// frontend/src/fisherman/Trips.jsx
import { useState, useEffect, useCallback } from 'react'
import { listTrips, startTrip, endTrip } from './api/trips'
import { apiGet } from '../api'

const CHECKLIST_ITEMS = [
  { key: 'lifeVestChecked',      label: 'Life vest on board' },
  { key: 'radioChecked',         label: 'Radio functional' },
  { key: 'fuelChecked',          label: 'Fuel level checked' },
  { key: 'engineChecked',        label: 'Engine checked' },
  { key: 'weatherReviewed',      label: 'Weather reviewed' },
  { key: 'emergencyKitChecked',  label: 'Emergency kit complete' },
]

export function StartTripModal({ onClose, onStarted }) {
  const [step, setStep]         = useState(1)
  const [vesselName, setVessel] = useState('')
  const [checked, setChecked]   = useState({})
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')

  const allChecked = CHECKLIST_ITEMS.every(i => checked[i.key])

  const toggle = (key) => setChecked(p => ({ ...p, [key]: !p[key] }))

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const body = {
        vesselName: vesselName || undefined,
        lifeVestChecked:     checked.lifeVestChecked,
        radioChecked:        checked.radioChecked,
        fuelChecked:         checked.fuelChecked,
        engineChecked:       checked.engineChecked,
        weatherReviewed:     checked.weatherReviewed,
        emergencyKitChecked: checked.emergencyKitChecked,
      }
      await startTrip(body)
      onStarted()
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to start trip.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">Safety</div>
            <div className="modal__title">{step === 1 ? 'Start Trip' : 'Safety Checklist'}</div>
          </div>
        </div>

        {step === 1 && (
          <div className="form-grid" style={{ padding: '16px 0 0' }}>
            <div className="form-row">
              <label>Vessel name</label>
              <input
                className="input"
                placeholder="Vessel name (optional)"
                value={vesselName}
                onChange={e => setVessel(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: '16px 0 0' }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
              Check all items before departing.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CHECKLIST_ITEMS.map(item => (
                <label key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${checked[item.key] ? 'var(--safe)' : 'var(--line)'}`,
                  background: checked[item.key] ? 'var(--safe-soft)' : undefined,
                  cursor: 'pointer', fontSize: 13,
                }}>
                  <input
                    type="checkbox"
                    checked={!!checked[item.key]}
                    onChange={() => toggle(item.key)}
                    style={{ accentColor: 'var(--safe)' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {err && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 8 }}>{err}</div>}

        <div className="modal__foot">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          {step === 1 ? (
            <button className="btn btn--primary btn--sm" onClick={() => setStep(2)}>Next</button>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              disabled={!allChecked || busy}
              onClick={submit}
            >
              {busy ? '…' : 'Start Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Trips() {
  const [trips, setTrips]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [busy, setBusy]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    listTrips().then(d => setTrips(Array.isArray(d) ? d : d?.content || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleEnd = async (tripId) => {
    setBusy(tripId)
    try { await endTrip(tripId, {}); load() }
    catch {}
    finally { setBusy(null) }
  }

  const activeTrip = trips.find(t => t.status === 'ACTIVE')

  return (
    <div className="page">
      {modal && <StartTripModal onClose={() => setModal(false)} onStarted={load} />}
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Safety</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Trips.</em></h1>
          <p className="page__sub">Departure log and safety checklist.</p>
        </div>
        <div className="page__actions">
          {!activeTrip && (
            <button className="btn btn--primary btn--sm" onClick={() => setModal(true)}>
              Start Trip
            </button>
          )}
        </div>
      </div>

      {activeTrip && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--safe)' }}>
          <div className="card__head">
            <div>
              <div className="eyebrow">Currently active</div>
              <div className="card__title">{activeTrip.vesselName || 'Active Trip'}</div>
              <div className="card__sub">
                Started {new Date(activeTrip.startedAt).toLocaleString('en-PH')}
              </div>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
              disabled={busy === activeTrip.id}
              onClick={() => handleEnd(activeTrip.id)}
            >
              {busy === activeTrip.id ? '…' : 'End Trip'}
            </button>
          </div>
        </div>
      )}

      {loading && trips.length === 0 ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : trips.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No trips yet</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Start your first trip when you're ready to depart.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }} onClick={() => setModal(true)}>Start Trip</button>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Vessel</th>
                <th>Departed</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.filter(t => t.status !== 'ACTIVE').map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.vesselName || `Trip #${t.id}`}</td>
                  <td className="data">{new Date(t.startedAt).toLocaleString('en-PH')}</td>
                  <td className="data">{t.endedAt ? new Date(t.endedAt).toLocaleString('en-PH') : '—'}</td>
                  <td><span className={`status status--${t.status?.toLowerCase()}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- --run src/fisherman/__tests__/Trips.test.jsx
# Expected: PASS
```

- [ ] **Step 5: Delete old trip files**

```bash
rm frontend/src/MyTrips.jsx frontend/src/TripPlanner.jsx frontend/src/planner.css
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/fisherman/Trips.jsx frontend/src/fisherman/__tests__/
git commit -m "feat(fisherman): Trips page with StartTripModal — 6-item checklist gate"
```

---

## Phase 2 — Migration + Bug Fix

### Task 2.1: Fix DISPUTED bucket in ProcurementOrderService (TDD)

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/ProcurementOrderService.java:52-59,192-199`
- Create: `backend/src/test/java/com/mermaid/app/service/ProcurementOrderServiceDisputedTest.java`

- [ ] **Step 1: Write failing test**

```java
// backend/src/test/java/com/mermaid/app/service/ProcurementOrderServiceDisputedTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcurementOrderServiceDisputedTest {

    @Mock OrderRepository orderRepo;
    @Mock ProcurementCartItemRepository cartRepo;
    @Mock CatchAlertRepository alertRepo;
    @Mock OrderStatusEventRepository eventRepo;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock InventoryService inventoryService;
    @Mock org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks ProcurementOrderService service;

    @Test
    void listForFisherman_DISPUTED_bucket_returns_only_DISPUTED_statuses() {
        when(orderRepo.findBySellerIdAndKindAndStatusIn(eq(1L), eq(OrderKind.PROCUREMENT), eq(List.of("DISPUTED"))))
            .thenReturn(List.of());
        service.listForFisherman(1L, "DISPUTED");
        verify(orderRepo).findBySellerIdAndKindAndStatusIn(1L, OrderKind.PROCUREMENT, List.of("DISPUTED"));
    }

    @Test
    void listForVendor_DISPUTED_bucket_returns_only_DISPUTED_statuses() {
        when(orderRepo.findByBuyerIdAndKindAndStatusIn(eq(1L), eq(OrderKind.PROCUREMENT), eq(List.of("DISPUTED"))))
            .thenReturn(List.of());
        service.listForVendor(1L, "DISPUTED");
        verify(orderRepo).findByBuyerIdAndKindAndStatusIn(1L, OrderKind.PROCUREMENT, List.of("DISPUTED"));
    }
}
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=ProcurementOrderServiceDisputedTest
# Expected: FAIL — DISPUTED falls to default → wrong statuses passed
```

- [ ] **Step 3: Add the missing case to both switch expressions**

In `ProcurementOrderService.java`, `listForVendor()` at line ~52-59:
```java
// Add before the default case:
case "DISPUTED"  -> List.of("DISPUTED");
```

In `listForFisherman()` at line ~192-199, same addition:
```java
case "DISPUTED"  -> List.of("DISPUTED");
```

Both switches now have: `PENDING`, `ACCEPTED`, `READY`, `COMPLETED`, `CANCELLED`, `DISPUTED`, `default`.

> Note: The `default` branch (when `bucket == null`) returns `List.of("PENDING","ACCEPTED","READY")` — this intentionally excludes DISPUTED from the unfiltered view. Do NOT add DISPUTED to the default branch; disputed orders are only surfaced when the DISPUTED tab is explicitly selected.

- [ ] **Step 4: Run test to verify it passes**

```bash
./mvnw test -Dtest=ProcurementOrderServiceDisputedTest
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "fix(procurement): add DISPUTED case to listForFisherman and listForVendor switches"
```

---

### Task 2.2: Migrate CatchAlerts.jsx

**Files:**
- Create: `frontend/src/fisherman/CatchAlerts.jsx`
- Delete: `frontend/src/CatchAlerts.jsx` (after wiring)

- [ ] **Step 1: Create fisherman/CatchAlerts.jsx** — migrate from `src/CatchAlerts.jsx` (854 lines); apply design system. Key changes:
  - Replace all inline SVG icon components with `I.IconName` from `'../icons'`
  - Replace hardcoded hex/rgba with CSS vars (`var(--unsafe)`, `var(--safe)`, etc.)
  - Use `.alert-card`, `.chip.chip--dot.chip--safe/caution/unsafe`, `.modal-overlay`, `.form-grid`, `.form-row`, `.input`, `.btn` classes
  - Keep all existing API calls; change imports from `'../api'` to `'../api'` (same level — stays correct since `fisherman/CatchAlerts.jsx` → `../api.js`)

  The eyebrow/title pattern:
  ```jsx
  <div className="eyebrow">Fisherman · Supply</div>
  <h1 className="page__title" style={{ marginTop: 4 }}>Catch <em>Alerts.</em></h1>
  ```

- [ ] **Step 2: Wire into router** — `FishermanDashboard.jsx` already imports `'./CatchAlerts'`; update `CatchAlerts.jsx` stub with the real implementation. The route at `/fisherman/catch-alerts` is already registered in FishermanDashboard.

- [ ] **Step 3: Delete old file**

```bash
rm frontend/src/CatchAlerts.jsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/fisherman/CatchAlerts.jsx frontend/src/CatchAlerts.jsx
git commit -m "feat(fisherman): migrate CatchAlerts to fisherman/ with design system"
```

---

### Task 2.3: Migrate Procurement.jsx

**Files:**
- Create: `frontend/src/fisherman/Procurement.jsx`

- [ ] **Step 1: Create fisherman/Procurement.jsx** — extracts the procurement tab from the old monolithic `FishermanDashboard.jsx` and redesigns it:

```jsx
// frontend/src/fisherman/Procurement.jsx
import { useState, useCallback } from 'react'
import { listProcurementOrders, acceptOrder, markReady, completeOrder, cancelOrder } from './api/procurement'
import { useFishermanPolling } from './hooks/useFishermanPolling'

const BUCKETS = ['PENDING','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED']

const STATUS_CLS = {
  PENDING: 'status--pending', ACCEPTED: 'status--accepted', READY: 'status--safe',
  COMPLETED: 'status--completed', CANCELLED: 'status--cancelled', DISPUTED: 'status--disputed',
}

export default function Procurement() {
  const [bucket, setBucket]     = useState('PENDING')
  const [busy, setBusy]         = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const fetcher = useCallback(() => listProcurementOrders(bucket), [bucket])
  const { data, loading, error, isStale, refetch } = useFishermanPolling(fetcher, [bucket])
  const orders = Array.isArray(data) ? data : []

  const act = async (action, id, extra) => {
    setBusy(id)
    try { await action(id, extra); refetch() }
    catch {}
    finally { setBusy(null) }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Sales</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Vendor <em>Orders.</em></h1>
          <p className="page__sub">Orders from vendors — accept, prepare, complete.</p>
        </div>
        <div className="page__actions">
          {isStale && <span className="chip chip--caution chip--dot">Stale</span>}
          <button className="btn btn--ghost btn--sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 16 }}>
        {BUCKETS.map(b => (
          <button
            key={b}
            className={`seg__btn${bucket === b ? ' on' : ''}`}
            onClick={() => setBucket(b)}
          >
            {b.charAt(0) + b.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--unsafe)', background: 'var(--unsafe-soft)', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error.message || 'Failed to load orders.'}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : orders.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No {bucket.toLowerCase()} orders</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(order => (
            <div key={order.id} className="card">
              <div className="card__head">
                <div>
                  {order.isPreorder && (
                    <span className="chip chip--accent" style={{ marginBottom: 4, display: 'inline-block' }}>Preorder</span>
                  )}
                  <div className="card__title">
                    {order.speciesName}
                    <span className="kbd" style={{ marginLeft: 8, fontSize: 11 }}>#{order.id}</span>
                  </div>
                  <div className="card__sub">
                    from {order.vendorName || `Vendor #${order.fishermanId}`}
                    {order.qtyKg != null && ` · ${order.qtyKg} kg`}
                    {order.pricePerKg != null && ` · ₱${order.pricePerKg}/kg`}
                  </div>
                  {/* Payment badge — only visible in COMPLETED orders when paymentMethod is set (Phase 3) */}
                  {order.paymentMethod && (
                    <span className={`chip ${order.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      {order.paymentMethod === 'CASH' ? 'Cash' : 'Credit / Utang'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`status ${STATUS_CLS[order.status] || ''}`}>{order.status}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {order.status === 'PENDING' && (
                      <>
                        <button className="btn btn--accent btn--sm" disabled={busy === order.id}
                          onClick={() => act(acceptOrder, order.id)}>Accept</button>
                        <button className="btn btn--ghost btn--sm"
                          style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                          onClick={() => { setCancelTarget(order); setCancelReason('') }}>Cancel</button>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button className="btn btn--primary btn--sm" disabled={busy === order.id}
                        onClick={() => act(markReady, order.id)}>Mark Ready</button>
                    )}
                    {order.status === 'READY' && (
                      <button className="btn btn--primary btn--sm" disabled={busy === order.id}
                        onClick={() => act(completeOrder, order.id)}>Complete</button>
                    )}
                  </div>
                </div>
              </div>
              {order.notes && (
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal__head">
              <div className="modal__title">Cancel order?</div>
            </div>
            <div className="form-row" style={{ padding: '12px 0' }}>
              <label>Reason (optional)</label>
              <input className="input" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setCancelTarget(null)}>Back</button>
              <button
                className="btn btn--sm"
                style={{ background: 'var(--unsafe)', color: 'var(--paper)', border: 'none' }}
                onClick={() => { act(cancelOrder, cancelTarget.id, cancelReason || undefined); setCancelTarget(null) }}
              >Cancel Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/Procurement.jsx
git commit -m "feat(fisherman): Procurement page — status tabs, accept/ready/complete/cancel"
```

---

### Task 2.4: Migrate Orders, Marketplace, Messages + cleanup

**Files:**
- Create: `frontend/src/fisherman/Orders.jsx`, `Marketplace.jsx`, `Messages.jsx`
- Delete: `frontend/src/Orders.jsx`, `src/Marketplace.jsx`, `src/Messages.jsx`, `src/messages.css`

- [ ] **Step 1: Migrate each page** — copy from `src/` equivalents, apply design system (CSS vars, design-system class names, `I` icons). Each page gets:
  - Eyebrow/title pattern with `<em>`
  - `.page`, `.page__head`, `.card`, `.tbl` structure
  - No hardcoded hex — CSS vars only

  `Orders.jsx` eyebrow: `"Fisherman · Sales"` / title: `"Marketplace <em>Orders.</em>"`
  `Marketplace.jsx` eyebrow: `"Fisherman · Browse"` / title: `"Buyer <em>Marketplace.</em>"`
  `Messages.jsx` eyebrow: `"Fisherman · Comms"` / title: `"<em>Messages.</em>"`

- [ ] **Step 2: Delete old files**

```bash
rm frontend/src/Orders.jsx frontend/src/Marketplace.jsx frontend/src/Messages.jsx frontend/src/messages.css
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/fisherman/ frontend/src/
git commit -m "feat(fisherman): migrate Orders, Marketplace, Messages — design system applied"
```

---

## Phase 3 — Earnings + Utang System

### Task 3.1: api.yaml — Earnings endpoints + ProcurementOrderSummary update

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Add tag, endpoints, and schema updates to api.yaml**

Add to `tags:` section:
```yaml
  - name: Fisherman Earnings
    description: Fisherman earnings ledger and summary
```

Add endpoints (after existing fisherman paths):
```yaml
  /fisherman/earnings/summary:
    get:
      tags: [Fisherman Earnings]
      operationId: getFishermanEarningsSummary
      summary: Get earnings summary (cash vs credit)
      parameters:
        - name: from
          in: query
          schema: { type: string, format: date }
        - name: to
          in: query
          schema: { type: string, format: date }
      responses:
        '200':
          description: Summary
          content:
            application/json:
              schema: { $ref: '#/components/schemas/EarningsSummary' }
      security: [{ bearerAuth: [] }]

  /fisherman/earnings/ledger:
    get:
      tags: [Fisherman Earnings]
      operationId: getFishermanEarningsLedger
      summary: Get earnings ledger rows
      parameters:
        - name: from
          in: query
          schema: { type: string, format: date }
        - name: to
          in: query
          schema: { type: string, format: date }
      responses:
        '200':
          description: Ledger rows
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/EarningsLedgerRow' }
      security: [{ bearerAuth: [] }]

  /vendor/procurement-orders/{id}/settle:
    put:
      tags: [Vendor Procurement]
      operationId: settleVendorProcurementOrder
      summary: Mark a completed order as paid
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer, format: int64 }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/OrderSettleRequest' }
      responses:
        '200':
          description: Settled order
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProcurementOrderSummary' }
      security: [{ bearerAuth: [] }]
```

Add schemas:
```yaml
    EarningsSummary:
      type: object
      properties:
        totalGross:         { type: number, format: double }
        cashCollected:      { type: number, format: double }
        creditOutstanding:  { type: number, format: double }
        orderCount:         { type: integer }

    EarningsLedgerRow:
      type: object
      properties:
        orderId:       { type: integer, format: int64 }
        vendorName:    { type: string }
        speciesName:   { type: string }
        qtyKg:         { type: number, format: double }
        gross:         { type: number, format: double }
        paymentMethod: { type: string }
        status:        { type: string }
        settledAt:     { type: string, format: date-time, nullable: true }
        date:          { type: string, format: date-time }

    OrderSettleRequest:
      type: object
      required: [paymentMethod]
      properties:
        paymentMethod:
          type: string
          enum: [CASH, CREDIT]
        settleNotes:
          type: string
          nullable: true
```

Update `ProcurementOrderSummary` schema — add to its `properties`:
```yaml
        paymentMethod:
          type: string
          nullable: true
        settledAt:
          type: string
          format: date-time
          nullable: true
```

- [ ] **Step 2: Regenerate sources**

```bash
cd backend && ./mvnw generate-sources
# Expected: compiles without error; new interfaces FishermanEarningsApi generated
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(earnings): api.yaml — earnings endpoints, settle, ProcurementOrderSummary update"
```

---

### Task 3.2: V43 migration + Order.java fields

**Files:**
- Create: `backend/src/main/resources/db/migration/V43__add_payment_method_to_orders.sql`
- Modify: `backend/src/main/java/com/mermaid/app/domain/Order.java`

- [ ] **Step 1: Create migration**

```sql
-- V43__add_payment_method_to_orders.sql
ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(10) DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH', 'CREDIT')),
  ADD COLUMN settled_at TIMESTAMP,
  ADD COLUMN settle_notes TEXT;
```

- [ ] **Step 2: Add fields to Order.java** — add after `completedAt`:

```java
    @Column(name = "payment_method", length = 10)
    private String paymentMethod;

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    @Column(name = "settle_notes", columnDefinition = "TEXT")
    private String settleNotes;
```

Add getters/setters for all three fields.

- [ ] **Step 3: Run backend to apply migration**

```bash
./mvnw spring-boot:run
# Expected: Flyway V43 migration runs, server starts
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/ backend/src/main/java/com/mermaid/app/domain/Order.java
git commit -m "feat(earnings): V43 migration — payment_method, settled_at, settle_notes on orders"
```

---

### Task 3.3: Update toSummary() in both procurement controllers

**Files:**
- Modify: `backend/.../controller/FishermanProcurementController.java:64-83`
- Modify: `backend/.../controller/VendorProcurementController.java:238-258`

- [ ] **Step 0: After running generate-sources in Task 3.1, verify generated field types** — open the generated `ProcurementOrderSummary.java` in `target/generated-sources/` and confirm that `paymentMethod` and `settledAt` are `JsonNullable<String>` and `JsonNullable<OffsetDateTime>` respectively (because the yaml marks them `nullable: true`). If they are generated as plain `String`/`OffsetDateTime` instead, use `dto.setPaymentMethod(order.getPaymentMethod())` without the `JsonNullable.of()` wrapper. Compile error will indicate the mismatch.

- [ ] **Step 1: Update FishermanProcurementController.toSummary()** — add two lines at end of method (before `return dto`):

```java
        if (order.getPaymentMethod() != null)
            dto.setPaymentMethod(JsonNullable.of(order.getPaymentMethod()));   // adjust if field is plain String
        if (order.getSettledAt() != null)
            dto.setSettledAt(JsonNullable.of(order.getSettledAt()));           // adjust if field is plain OffsetDateTime
```

- [ ] **Step 2: Update VendorProcurementController.toOrderSummary()** — same two lines added at end of the `toOrderSummary` private method.

- [ ] **Step 3: Build to verify no compilation errors**

```bash
./mvnw clean package -DskipTests
# Expected: BUILD SUCCESS
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/
git commit -m "feat(earnings): populate paymentMethod and settledAt in toSummary()"
```

---

### Task 3.4: EarningsService + EarningsController (TDD)

**Files:**
- Create: `backend/.../service/EarningsService.java`
- Create: `backend/.../controller/EarningsController.java`
- Create: `backend/.../service/EarningsServiceTest.java`
- Create: `backend/.../controller/EarningsControllerTest.java`

- [ ] **Step 1: Write failing service test**

```java
// EarningsServiceTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EarningsServiceTest {

    @Mock OrderRepository orderRepo;
    @InjectMocks EarningsService service;

    private Order makeOrder(String paymentMethod, BigDecimal qty, BigDecimal price) {
        Order o = new Order();
        o.setKind(OrderKind.PROCUREMENT);
        o.setStatus("COMPLETED");
        o.setPaymentMethod(paymentMethod);
        o.setOrderedQtyKg(qty);
        o.setAgreedPricePerKg(price);
        o.setCompletedAt(OffsetDateTime.now());
        return o;
    }

    @Test
    void summary_splits_cash_and_credit_correctly() {
        Order cash   = makeOrder("CASH",   new BigDecimal("10"), new BigDecimal("50"));
        Order credit = makeOrder("CREDIT", new BigDecimal("5"),  new BigDecimal("80"));
        when(orderRepo.findBySellerIdAndKindAndStatusAndCompletedAtBetween(
            eq(1L), eq(OrderKind.PROCUREMENT), eq("COMPLETED"), any(), any()))
            .thenReturn(List.of(cash, credit));

        var summary = service.getSummary(1L, null, null);

        assertThat(summary.getTotalGross()).isEqualByComparingTo(new BigDecimal("900")); // 500 + 400
        assertThat(summary.getCashCollected()).isEqualByComparingTo(new BigDecimal("500"));
        assertThat(summary.getCreditOutstanding()).isEqualByComparingTo(new BigDecimal("400"));
        assertThat(summary.getOrderCount()).isEqualTo(2);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

```bash
./mvnw test -Dtest=EarningsServiceTest
# Expected: FAIL — EarningsService does not exist yet
```

- [ ] **Step 3: Add query method to OrderRepository**

```java
// In OrderRepository.java — add:
List<Order> findBySellerIdAndKindAndStatusAndCompletedAtBetween(
    Long sellerId, OrderKind kind, String status,
    OffsetDateTime from, OffsetDateTime to);
```

- [ ] **Step 4: Implement EarningsService**

```java
// EarningsService.java
package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EarningsService {

    private final OrderRepository orderRepo;

    public EarningsService(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    @Transactional(readOnly = true)
    public EarningsSummary getSummary(Long fishermanId, LocalDate from, LocalDate to) {
        List<Order> orders = queryOrders(fishermanId, from, to);
        BigDecimal cash   = BigDecimal.ZERO;
        BigDecimal credit = BigDecimal.ZERO;
        for (Order o : orders) {
            BigDecimal gross = o.getOrderedQtyKg().multiply(o.getAgreedPricePerKg());
            if ("CREDIT".equals(o.getPaymentMethod())) credit = credit.add(gross);
            else                                         cash   = cash.add(gross);
        }
        EarningsSummary s = new EarningsSummary();
        s.setTotalGross(cash.add(credit).doubleValue());
        s.setCashCollected(cash.doubleValue());
        s.setCreditOutstanding(credit.doubleValue());
        s.setOrderCount(orders.size());
        return s;
    }

    @Transactional(readOnly = true)
    public List<EarningsLedgerRow> getLedger(Long fishermanId, LocalDate from, LocalDate to) {
        return queryOrders(fishermanId, from, to).stream().map(o -> {
            EarningsLedgerRow row = new EarningsLedgerRow();
            row.setOrderId(o.getId());
            row.setSpeciesName(o.getSpecies() != null ? o.getSpecies().getCommonName() : null);
            row.setQtyKg(o.getOrderedQtyKg() != null ? o.getOrderedQtyKg().doubleValue() : null);
            BigDecimal gross = o.getOrderedQtyKg().multiply(o.getAgreedPricePerKg());
            row.setGross(gross.doubleValue());
            row.setPaymentMethod(o.getPaymentMethod());
            row.setStatus(o.getStatus());
            row.setSettledAt(o.getSettledAt());
            row.setDate(o.getCompletedAt());
            return row;
        }).collect(Collectors.toList());
    }

    private List<Order> queryOrders(Long fishermanId, LocalDate from, LocalDate to) {
        OffsetDateTime start = from != null
            ? from.atStartOfDay().atOffset(ZoneOffset.UTC)
            : OffsetDateTime.of(2000, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime end = to != null
            ? to.atTime(23, 59, 59).atOffset(ZoneOffset.UTC)
            : OffsetDateTime.now(ZoneOffset.UTC);
        return orderRepo.findBySellerIdAndKindAndStatusAndCompletedAtBetween(
            fishermanId, OrderKind.PROCUREMENT, "COMPLETED", start, end);
    }
}
```

- [ ] **Step 5: Implement EarningsController**

```java
// EarningsController.java
package com.mermaid.app.controller;

import com.mermaid.app.api.FishermanEarningsApi;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.EarningsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;
import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class EarningsController implements FishermanEarningsApi {

    private final EarningsService earningsService;

    public EarningsController(EarningsService earningsService) {
        this.earningsService = earningsService;
    }

    @Override
    public ResponseEntity<EarningsSummary> getFishermanEarningsSummary(String from, String to) {
        Long fid = SecurityUtils.currentUserId();
        LocalDate f = from != null ? LocalDate.parse(from) : null;
        LocalDate t = to   != null ? LocalDate.parse(to)   : null;
        return ResponseEntity.ok(earningsService.getSummary(fid, f, t));
    }

    @Override
    public ResponseEntity<List<EarningsLedgerRow>> getFishermanEarningsLedger(String from, String to) {
        Long fid = SecurityUtils.currentUserId();
        LocalDate f = from != null ? LocalDate.parse(from) : null;
        LocalDate t = to   != null ? LocalDate.parse(to)   : null;
        return ResponseEntity.ok(earningsService.getLedger(fid, f, t));
    }
}
```

- [ ] **Step 6: Run tests**

```bash
./mvnw test -Dtest=EarningsServiceTest
# Expected: PASS
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/
git commit -m "feat(earnings): EarningsService + EarningsController — cash vs credit aggregation"
```

---

### Task 3.5: Settle endpoint on VendorProcurementController

**Files:**
- Modify: `backend/.../service/ProcurementOrderService.java` (add `settle()`)
- Modify: `backend/.../controller/VendorProcurementController.java` (implement generated `settleVendorProcurementOrder`)

- [ ] **Step 1: Add `settle()` to ProcurementOrderService**

```java
    @Transactional
    public Order settle(Long vendorId, Long orderId, String paymentMethod, String settleNotes) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!vendorId.equals(order.getBuyerId()) || !OrderKind.PROCUREMENT.equals(order.getKind())) {
            throw new AccessDeniedException("Order does not belong to this vendor");
        }
        if (!"COMPLETED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Can only settle a COMPLETED order; current status: " + order.getStatus());
        }
        if (order.getSettledAt() != null) return order; // idempotent
        order.setPaymentMethod(paymentMethod);
        order.setSettledAt(OffsetDateTime.now());
        order.setSettleNotes(settleNotes);
        return orderRepo.save(order);
    }
```

- [ ] **Step 2: Implement `settleVendorProcurementOrder` in VendorProcurementController**

```java
    @Override
    public ResponseEntity<ProcurementOrderSummary> settleVendorProcurementOrder(Long id, OrderSettleRequest body) {
        Long vendorId = SecurityUtils.currentUserId();
        String notes = body.getSettleNotes() != null && body.getSettleNotes().isPresent()
            ? body.getSettleNotes().get() : null;
        Order settled = orderService.settle(vendorId, id, body.getPaymentMethod(), notes);
        return ResponseEntity.ok(toOrderSummary(settled));
    }
```

- [ ] **Step 3: Build and run tests**

```bash
./mvnw clean package -DskipTests
# Expected: BUILD SUCCESS
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/
git commit -m "feat(earnings): settle endpoint — vendor marks procurement order as paid"
```

---

### Task 3.6: fisherman/Earnings.jsx + Vendor "Mark as Paid"

**Files:**
- Create: `frontend/src/fisherman/Earnings.jsx`
- Create: `frontend/src/fisherman/__tests__/Earnings.test.jsx`
- Modify: `frontend/src/vendor/ProcurementOrders.jsx`

- [ ] **Step 1: Write failing frontend test**

```jsx
// frontend/src/fisherman/__tests__/Earnings.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/earnings', () => ({
  getEarningsSummary: vi.fn().mockResolvedValue({
    totalGross: 1500, cashCollected: 1000, creditOutstanding: 500, orderCount: 3,
  }),
  getEarningsLedger: vi.fn().mockResolvedValue([]),
}))

// Note: Earnings.jsx currently has no Router hooks. If a "view order" link is added later,
// wrap with: render(<MemoryRouter><Earnings /></MemoryRouter>) to avoid "useNavigate" errors.
import Earnings from '../Earnings'

describe('Earnings page', () => {
  it('renders cash and credit summary tiles', async () => {
    render(<Earnings />)
    expect(await screen.findByText('₱1,000.00')).toBeInTheDocument()  // cash
    expect(await screen.findByText('₱500.00')).toBeInTheDocument()    // credit
  })
})
```

- [ ] **Step 2: Run to verify fails**

```bash
npm test -- --run src/fisherman/__tests__/Earnings.test.jsx
# Expected: FAIL — Earnings not implemented
```

- [ ] **Step 3: Implement Earnings.jsx**

```jsx
// frontend/src/fisherman/Earnings.jsx
import { useState, useCallback } from 'react'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'
import { useFishermanPolling } from './hooks/useFishermanPolling'

const php = (v) => Number(v ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

export default function Earnings() {
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const [applied, setApplied] = useState({ from: '', to: '' })

  const summaryFetcher = useCallback(() => getEarningsSummary(applied.from || undefined, applied.to || undefined), [applied])
  const ledgerFetcher  = useCallback(() => getEarningsLedger(applied.from || undefined, applied.to || undefined), [applied])

  const { data: summary, loading: sl } = useFishermanPolling(summaryFetcher, [applied])
  const { data: rows,    loading: ll } = useFishermanPolling(ledgerFetcher,  [applied])

  const apply = () => setApplied({ from, to })
  const ledger = Array.isArray(rows) ? rows : []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Finance</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Earnings.</em></h1>
          <p className="page__sub">Cash collected vs credit outstanding (utang).</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-row" style={{ flex: 1, minWidth: 140 }}>
            <label>From</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-row" style={{ flex: 1, minWidth: 140 }}>
            <label>To</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn--primary btn--sm" onClick={apply}>Apply</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid--kpi" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi__label">Total Gross</div>
          <div className="kpi__value">{sl ? '…' : php(summary?.totalGross)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Cash Collected</div>
          <div className="kpi__value" style={{ color: 'var(--safe)' }}>{sl ? '…' : php(summary?.cashCollected)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Outstanding (Utang)</div>
          <div className="kpi__value" style={{ color: 'var(--caution)' }}>{sl ? '…' : php(summary?.creditOutstanding)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Orders</div>
          <div className="kpi__value">{sl ? '…' : (summary?.orderCount ?? 0)}</div>
        </div>
      </div>

      {/* Ledger table */}
      {ll ? (
        <div className="empty" style={{ padding: '40px 0' }}><div className="empty__title">Loading…</div></div>
      ) : ledger.length === 0 ? (
        <div className="empty" style={{ padding: '48px 0' }}>
          <div className="empty__title">No earnings in this period</div>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Species</th>
                <th style={{ textAlign: 'right' }}>Qty (kg)</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(r => (
                <tr key={r.orderId}>
                  <td><span className="kbd">#{r.orderId}</span></td>
                  <td className="data">{r.date ? new Date(r.date).toLocaleDateString('en-PH') : '—'}</td>
                  <td>{r.speciesName || '—'}</td>
                  <td className="data" style={{ textAlign: 'right' }}>{r.qtyKg ?? '—'}</td>
                  <td className="data" style={{ textAlign: 'right' }}>{php(r.gross)}</td>
                  <td>
                    <span className={`chip ${r.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>
                      {r.paymentMethod === 'CASH' ? 'Cash' : 'Utang'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test**

```bash
npm test -- --run src/fisherman/__tests__/Earnings.test.jsx
# Expected: PASS
```

- [ ] **Step 5: Add "Mark as Paid" to vendor/ProcurementOrders.jsx**

In `frontend/src/vendor/ProcurementOrders.jsx`:
1. Add import: `import { settleOrder } from './api/procurement'` (add `settleOrder` to vendor's procurement api: `export const settleOrder = (id, body) => apiPut('/vendor/procurement-orders/' + id + '/settle', body)`)
2. Add state: `const [settleModal, setSettleModal] = useState(null)` and `const [settlePayment, setSettlePayment] = useState('CASH')`
3. In COMPLETED orders row — add button: `{!order.settledAt && <button className="btn btn--accent btn--sm" onClick={() => setSettleModal(order)}>Mark as Paid</button>}`
4. Add settle modal component inline — payment method radio (CASH / CREDIT) + confirm button

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(earnings): Earnings.jsx + vendor Mark as Paid flow"
```

---

## Phase 4 — Profile + SMS Safety

### Task 4.1: api.yaml — Fisherman Profile endpoints

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Add to api.yaml**

Add tag:
```yaml
  - name: Fisherman Profile
    description: Fisherman vessel and safety contact management
```

Add endpoints:
```yaml
  /fisherman/profile:
    get:
      tags: [Fisherman Profile]
      operationId: getFishermanProfile
      summary: Get fisherman profile
      responses:
        '200':
          description: Profile
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FishermanProfile' }
      security: [{ bearerAuth: [] }]
    put:
      tags: [Fisherman Profile]
      operationId: updateFishermanProfile
      summary: Update fisherman profile
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/FishermanProfileUpdateRequest' }
      responses:
        '200':
          description: Updated profile
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FishermanProfile' }
      security: [{ bearerAuth: [] }]
```

Add schemas:
```yaml
    FishermanProfile:
      type: object
      properties:
        fullName:               { type: string }
        email:                  { type: string }
        vesselName:             { type: string, nullable: true }
        landingSite:            { type: string, nullable: true }
        emergencyContactName:   { type: string, nullable: true }
        emergencyContactPhone:  { type: string, nullable: true }

    FishermanProfileUpdateRequest:
      type: object
      properties:
        vesselName:             { type: string, nullable: true }
        landingSite:            { type: string, nullable: true }
        emergencyContactName:   { type: string, nullable: true }
        emergencyContactPhone:  { type: string, nullable: true }
```

- [ ] **Step 2: Regenerate**

```bash
cd backend && ./mvnw generate-sources
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(profile): api.yaml — fisherman profile endpoints"
```

---

### Task 4.2: V44 migration + User.java fields

**Files:**
- Create: `backend/.../db/migration/V44__fisherman_profile_fields.sql`
- Modify: `backend/.../domain/User.java`

- [ ] **Step 1: Create migration**

```sql
-- V44__fisherman_profile_fields.sql
ALTER TABLE users
  ADD COLUMN vessel_name VARCHAR(100),
  ADD COLUMN landing_site VARCHAR(100),
  ADD COLUMN emergency_contact_name VARCHAR(100),
  ADD COLUMN emergency_contact_phone VARCHAR(20);
```

- [ ] **Step 2: Add fields to User.java** — after `avatarUrl`:

```java
    @Column(name = "vessel_name", length = 100)
    private String vesselName;

    @Column(name = "landing_site", length = 100)
    private String landingSite;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;
```

Add getters/setters for all four fields.

- [ ] **Step 3: Commit**

```bash
git add backend/src/
git commit -m "feat(profile): V44 migration + User.java — vessel, landing site, emergency contact"
```

---

### Task 4.3: SmsService + TextbeeSmsService (TDD)

**Files:**
- Create: `backend/.../service/SmsService.java`
- Create: `backend/.../service/TextbeeSmsService.java`
- Create: `backend/.../service/TextbeeSmsServiceTest.java`
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Write failing test — carrier routing**

```java
// TextbeeSmsServiceTest.java
package com.mermaid.app.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.web.client.RestTemplate;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TextbeeSmsServiceTest {

    @Mock RestTemplate restTemplate;
    TextbeeSmsService service;

    @BeforeEach void setup() {
        service = new TextbeeSmsService(
            "test-api-key", "globe-device-id", "smart-device-id",
            "https://api.textbee.dev", restTemplate
        );
    }

    @Test
    void globe_prefix_0917_routes_to_globe_device() {
        when(restTemplate.postForObject(contains("globe-device-id"), any(), eq(Object.class)))
            .thenReturn(null);
        service.send("09171234567", "Test");
        verify(restTemplate).postForObject(contains("globe-device-id"), any(), eq(Object.class));
    }

    @Test
    void smart_prefix_0919_routes_to_smart_device() {
        when(restTemplate.postForObject(contains("smart-device-id"), any(), eq(Object.class)))
            .thenReturn(null);
        service.send("09191234567", "Test");
        verify(restTemplate).postForObject(contains("smart-device-id"), any(), eq(Object.class));
    }

    @Test
    void unknown_prefix_defaults_to_globe_device() {
        when(restTemplate.postForObject(contains("globe-device-id"), any(), eq(Object.class)))
            .thenReturn(null);
        service.send("09991234567", "Test");
        verify(restTemplate).postForObject(contains("globe-device-id"), any(), eq(Object.class));
    }
}
```

- [ ] **Step 2: Run to verify fails**

```bash
./mvnw test -Dtest=TextbeeSmsServiceTest
# Expected: FAIL — TextbeeSmsService does not exist
```

- [ ] **Step 3: Create SmsService interface**

```java
// SmsService.java
package com.mermaid.app.service;

public interface SmsService {
    void send(String toNumber, String message);
}
```

- [ ] **Step 4: Implement TextbeeSmsService**

```java
// TextbeeSmsService.java
package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.Set;

@Service
public class TextbeeSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(TextbeeSmsService.class);

    private static final Set<String> GLOBE_PREFIXES = Set.of("0917","0918","0916","0915","0905","0906");
    private static final Set<String> SMART_PREFIXES = Set.of("0919","0920","0921","0928","0929","0930","0939");

    private final String apiKey;
    private final String globeDeviceId;
    private final String smartDeviceId;
    private final String baseUrl;
    private final RestTemplate restTemplate;

    public TextbeeSmsService(
            @Value("${sms.textbee.api-key}") String apiKey,
            @Value("${sms.textbee.globe-device-id}") String globeDeviceId,
            @Value("${sms.textbee.smart-device-id}") String smartDeviceId,
            @Value("${sms.textbee.base-url:https://api.textbee.dev}") String baseUrl,
            RestTemplate restTemplate) {
        this.apiKey = apiKey;
        this.globeDeviceId = globeDeviceId;
        this.smartDeviceId = smartDeviceId;
        this.baseUrl = baseUrl;
        this.restTemplate = restTemplate;
    }

    @Override
    public void send(String toNumber, String message) {
        String deviceId = routeDevice(toNumber);
        String url = baseUrl + "/api/v1/gateway/devices/" + deviceId + "/send-sms";
        Map<String, Object> body = Map.of(
            "recipients", new String[]{ toNumber },
            "message", message
        );
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("x-api-key", apiKey);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        var entity = new org.springframework.http.HttpEntity<>(body, headers);
        restTemplate.postForObject(url, entity, Object.class);
        log.info("SMS sent to {} via device {}", toNumber, deviceId);
    }

    private String routeDevice(String phone) {
        if (phone == null || phone.length() < 4) return globeDeviceId;
        String prefix = phone.substring(0, 4);
        if (SMART_PREFIXES.contains(prefix)) return smartDeviceId;
        return globeDeviceId;
    }
}
```

- [ ] **Step 5: Add config to application.properties**

```properties
# SMS — textbee gateway
sms.textbee.api-key=${SMS_TEXTBEE_API_KEY:}
sms.textbee.globe-device-id=${SMS_TEXTBEE_GLOBE_DEVICE_ID:}
sms.textbee.smart-device-id=${SMS_TEXTBEE_SMART_DEVICE_ID:}
sms.textbee.base-url=https://api.textbee.dev
```

- [ ] **Step 6: Register RestTemplate as a bean** — add to any `@Configuration` class or create one:

```java
// In backend, any @Configuration class:
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```

- [ ] **Step 7: Run tests**

```bash
./mvnw test -Dtest=TextbeeSmsServiceTest
# Expected: PASS
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/
git commit -m "feat(sms): SmsService interface + TextbeeSmsService with Globe/Smart carrier routing"
```

---

### Task 4.4: TripService SMS injection (TDD)

**Files:**
- Modify: `backend/.../service/TripService.java`
- Create: `backend/.../service/TripServiceSmsTest.java`

- [ ] **Step 1: Write failing test**

```java
// TripServiceSmsTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceSmsTest {

    @Mock TripRepository tripRepo;
    @Mock TripMapper tripMapper;
    @Mock UserRepository userRepo;
    @Mock SmsService smsService;
    @InjectMocks TripService service;

    @Test
    void startTrip_sends_sms_to_emergency_contact() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        user.setVesselName("MV Diwata");
        user.setEmergencyContactPhone("09171234567");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        Trip savedTrip = new Trip();
        savedTrip.setId(10L);
        savedTrip.setFishermanId(1L);
        savedTrip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.save(any())).thenReturn(savedTrip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        service.startTrip(req, 1L);

        verify(smsService).send(eq("09171234567"), contains("Isidro Cruz"));
    }

    @Test
    void startTrip_skips_sms_when_emergency_contact_is_null() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        // no emergencyContactPhone set
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        Trip savedTrip = new Trip();
        savedTrip.setId(10L);
        savedTrip.setFishermanId(1L);
        savedTrip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.save(any())).thenReturn(savedTrip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        service.startTrip(req, 1L);

        verify(smsService, never()).send(any(), any());
    }

    @Test
    void startTrip_does_not_propagate_sms_exception() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        user.setEmergencyContactPhone("09171234567");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("SMS failed")).when(smsService).send(any(), any());

        Trip savedTrip = new Trip();
        savedTrip.setFishermanId(1L);
        savedTrip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.save(any())).thenReturn(savedTrip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest();
        // Should NOT throw:
        service.startTrip(req, 1L);
    }

    @Test
    void endTrip_sends_return_sms() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Isidro Cruz");
        user.setEmergencyContactPhone("09171234567");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        Trip trip = new Trip();
        trip.setId(5L);
        trip.setFishermanId(1L);
        trip.setStatus(TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(5L, 1L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        service.endTrip(5L, null, 1L);

        verify(smsService).send(eq("09171234567"), contains("returned safely"));
    }
}
```

- [ ] **Step 2: Run to verify fails**

```bash
./mvnw test -Dtest=TripServiceSmsTest
# Expected: FAIL — TripService constructor does not take SmsService
```

- [ ] **Step 3: Inject SmsService into TripService and add SMS calls**

In `TripService.java`:

Add field and constructor param:
```java
    private final SmsService smsService;

    public TripService(TripRepository tripRepo, TripMapper tripMapper,
                       UserRepository userRepo, SmsService smsService) {
        this.tripRepo = tripRepo;
        this.tripMapper = tripMapper;
        this.userRepo = userRepo;
        this.smsService = smsService;
    }
```

In `startTrip()`, locate the existing line `return tripMapper.toModel(saved, resolveFishermanName(fishermanId));` (line 61) and insert ONE line **immediately before it** — do not duplicate the return:
```java
        sendDepartureSms(fishermanId, saved);  // insert before existing return; use `saved`, not `trip`
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId)); // existing line — do not add a second return
```

In `endTrip()`, same — insert ONE line immediately before the existing return at line 135:
```java
        sendReturnSms(fishermanId);  // insert before existing return
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId)); // existing line unchanged
```

Add private helpers:
```java
    private void sendDepartureSms(Long fishermanId, Trip trip) {
        try {
            User user = userRepo.findById(fishermanId).orElse(null);
            if (user == null || user.getEmergencyContactPhone() == null) return;
            String vessel = trip.getVesselName() != null ? trip.getVesselName()
                : (user.getVesselName() != null ? user.getVesselName() : "vessel");
            String time = java.time.format.DateTimeFormatter
                .ofPattern("hh:mm a").format(java.time.OffsetDateTime.now());
            String msg = user.getFullName() + " has departed for fishing at " + time
                + ". Vessel: " + vessel + ". Expected return: early morning. - MERMAID Safety";
            smsService.send(user.getEmergencyContactPhone(), msg);
        } catch (Exception e) {
            log.warn("Departure SMS failed: {}", e.getMessage());
        }
    }

    private void sendReturnSms(Long fishermanId) {
        try {
            User user = userRepo.findById(fishermanId).orElse(null);
            if (user == null || user.getEmergencyContactPhone() == null) return;
            String time = java.time.format.DateTimeFormatter
                .ofPattern("hh:mm a").format(java.time.OffsetDateTime.now());
            String msg = user.getFullName() + " has returned safely at " + time + ". - MERMAID Safety";
            smsService.send(user.getEmergencyContactPhone(), msg);
        } catch (Exception e) {
            log.warn("Return SMS failed: {}", e.getMessage());
        }
    }
```

- [ ] **Step 4: Run tests**

```bash
./mvnw test -Dtest=TripServiceSmsTest
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat(sms): TripService sends departure/return SMS via SmsService — non-blocking"
```

---

### Task 4.5: FishermanProfileController + Profile.jsx

**Files:**
- Create: `backend/.../controller/FishermanProfileController.java`
- Create: `frontend/src/fisherman/Profile.jsx`

- [ ] **Step 1: Implement FishermanProfileController**

```java
// FishermanProfileController.java
package com.mermaid.app.controller;

import com.mermaid.app.api.FishermanProfileApi;
import com.mermaid.app.domain.User;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.UserRepository;
import com.mermaid.app.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class FishermanProfileController implements FishermanProfileApi {

    private final UserRepository userRepo;

    public FishermanProfileController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    public ResponseEntity<FishermanProfile> getFishermanProfile() {
        Long fid = SecurityUtils.currentUserId();
        User user = userRepo.findById(fid)
            .orElseThrow(() -> new com.mermaid.app.exception.ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(toProfile(user));
    }

    @Override
    public ResponseEntity<FishermanProfile> updateFishermanProfile(FishermanProfileUpdateRequest req) {
        Long fid = SecurityUtils.currentUserId();
        User user = userRepo.findById(fid)
            .orElseThrow(() -> new com.mermaid.app.exception.ResourceNotFoundException("User not found"));
        if (req.getVesselName() != null)            user.setVesselName(nullable(req.getVesselName()));
        if (req.getLandingSite() != null)            user.setLandingSite(nullable(req.getLandingSite()));
        if (req.getEmergencyContactName() != null)  user.setEmergencyContactName(nullable(req.getEmergencyContactName()));
        if (req.getEmergencyContactPhone() != null) user.setEmergencyContactPhone(nullable(req.getEmergencyContactPhone()));
        userRepo.save(user);
        return ResponseEntity.ok(toProfile(user));
    }

    private FishermanProfile toProfile(User user) {
        FishermanProfile p = new FishermanProfile();
        p.setFullName(user.getFullName());
        p.setEmail(user.getEmail());
        p.setVesselName(user.getVesselName());
        p.setLandingSite(user.getLandingSite());
        p.setEmergencyContactName(user.getEmergencyContactName());
        p.setEmergencyContactPhone(user.getEmergencyContactPhone());
        return p;
    }

    private String nullable(Object val) {
        if (val instanceof org.openapitools.jackson.nullable.JsonNullable<?> jn) {
            return jn.isPresent() ? (String) jn.get() : null;
        }
        return val != null ? val.toString() : null;
    }
}
```

- [ ] **Step 2: Create Profile.jsx**

```jsx
// frontend/src/fisherman/Profile.jsx
import { useState, useEffect } from 'react'
import { getProfile, updateProfile } from './api/profile'

export default function Profile() {
  const [form, setForm] = useState({
    vesselName: '', landingSite: '', emergencyContactName: '', emergencyContactPhone: '',
  })
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    getProfile()
      .then(p => {
        setFullName(p.fullName || '')
        setForm({
          vesselName:            p.vesselName || '',
          landingSite:           p.landingSite || '',
          emergencyContactName:  p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
        })
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true); setSuccess(false); setError('')
    try {
      await updateProfile(form)
      setSuccess(true)
    } catch (e) {
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const smsPreview = `${fullName || 'You'} has departed for fishing. Vessel: ${form.vesselName || 'vessel'}. Expected return: early morning. - MERMAID Safety`

  if (loading) return <div className="page"><div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div></div>

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Account</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Profile.</em></h1>
          <p className="page__sub">Vessel details and safety contact.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary btn--sm" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ background: 'var(--safe-soft)', color: 'var(--safe)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          Profile saved.
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card__title" style={{ marginBottom: 16 }}>Vessel Info</div>
          <div className="form-grid">
            <div className="form-row">
              <label>Full name</label>
              <input className="input" value={fullName} disabled />
            </div>
            <div className="form-row">
              <label>Vessel name</label>
              <input className="input" value={form.vesselName} onChange={e => f('vesselName', e.target.value)} placeholder="e.g. MV Diwata" />
            </div>
            <div className="form-row">
              <label>Landing site</label>
              <input className="input" value={form.landingSite} onChange={e => f('landingSite', e.target.value)} placeholder="e.g. Navotas Fish Landing" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 16 }}>Safety Contact</div>
          <div className="form-grid">
            <div className="form-row">
              <label>Contact name</label>
              <input className="input" value={form.emergencyContactName} onChange={e => f('emergencyContactName', e.target.value)} placeholder="Contact person name" />
            </div>
            <div className="form-row">
              <label>Phone number</label>
              <input className="input" type="tel" value={form.emergencyContactPhone} onChange={e => f('emergencyContactPhone', e.target.value)} placeholder="09XX XXX XXXX" />
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--ink-3)', marginBottom: 4 }}>SMS preview on departure</div>
            {smsPreview}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build**

```bash
cd backend && ./mvnw clean package -DskipTests
# Expected: BUILD SUCCESS
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/ frontend/src/fisherman/Profile.jsx
git commit -m "feat(profile): FishermanProfileController + Profile.jsx — vessel + emergency contact"
```

---

## Phase 5 — Dispute Management

### Task 5.1: api.yaml — Order Disputes

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Add dispute endpoints and schemas**

Add tag:
```yaml
  - name: Order Disputes
    description: Dispute management for procurement orders
```

Add endpoints:
```yaml
  /fisherman/procurement-orders/{id}/dispute:
    post:
      tags: [Order Disputes]
      operationId: fishermanRaiseDispute
      parameters: [{ name: id, in: path, required: true, schema: { type: integer, format: int64 } }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/OrderDisputeRequest' }
      responses:
        '201':
          description: Dispute raised
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OrderDisputeDto' }
      security: [{ bearerAuth: [] }]
    get:
      tags: [Order Disputes]
      operationId: fishermanGetDispute
      parameters: [{ name: id, in: path, required: true, schema: { type: integer, format: int64 } }]
      responses:
        '200':
          description: Dispute details
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OrderDisputeDto' }
      security: [{ bearerAuth: [] }]

  /fisherman/procurement-orders/{id}/dispute/resolve:
    put:
      tags: [Order Disputes]
      operationId: fishermanResolveDispute
      parameters: [{ name: id, in: path, required: true, schema: { type: integer, format: int64 } }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/DisputeResolveRequest' }
      responses:
        '200':
          description: Dispute resolved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OrderDisputeDto' }
      security: [{ bearerAuth: [] }]

  /vendor/procurement-orders/{id}/dispute:
    post:
      tags: [Order Disputes]
      operationId: vendorRaiseDispute
      parameters: [{ name: id, in: path, required: true, schema: { type: integer, format: int64 } }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/OrderDisputeRequest' }
      responses:
        '201':
          description: Dispute raised
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OrderDisputeDto' }
      security: [{ bearerAuth: [] }]
    get:
      tags: [Order Disputes]
      operationId: vendorGetDispute
      parameters: [{ name: id, in: path, required: true, schema: { type: integer, format: int64 } }]
      responses:
        '200':
          description: Dispute details
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OrderDisputeDto' }
      security: [{ bearerAuth: [] }]

  /vendor/procurement-orders/{id}/dispute/resolve:
    put:
      tags: [Order Disputes]
      operationId: vendorResolveDispute
      parameters: [{ name: id, in: path, required: true, schema: { type: integer, format: int64 } }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/DisputeResolveRequest' }
      responses:
        '200':
          description: Dispute resolved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OrderDisputeDto' }
      security: [{ bearerAuth: [] }]
```

Add schemas:
```yaml
    OrderDisputeRequest:
      type: object
      properties:
        claimedWeightKg:  { type: number, format: double, nullable: true }
        claimedQuality:   { type: string, enum: [FRESH, SUBSTANDARD, DAMAGED], nullable: true }
        notes:            { type: string, nullable: true }

    DisputeResolveRequest:
      type: object
      required: [resolution]
      properties:
        resolution: { type: string }

    OrderDisputeDto:
      type: object
      properties:
        id:                { type: integer, format: int64 }
        orderId:           { type: integer, format: int64 }
        raisedBy:          { type: string }
        preDisputeStatus:  { type: string }
        status:            { type: string }
        claimedWeightKg:   { type: number, format: double, nullable: true }
        claimedQuality:    { type: string, nullable: true }
        notes:             { type: string, nullable: true }
        resolvedAt:        { type: string, format: date-time, nullable: true }
        resolution:        { type: string, nullable: true }
        createdAt:         { type: string, format: date-time }
```

- [ ] **Step 2: Regenerate**

```bash
cd backend && ./mvnw generate-sources
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(disputes): api.yaml — order dispute endpoints for fisherman and vendor"
```

---

### Task 5.2: V45 migration + OrderDispute entity + repository

**Files:**
- Create: `backend/.../db/migration/V45__order_disputes.sql`
- Create: `backend/.../domain/OrderDispute.java`
- Create: `backend/.../repository/OrderDisputeRepository.java`

- [ ] **Step 1: Create migration**

```sql
-- V45__order_disputes.sql
CREATE TABLE order_disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('FISHERMAN', 'VENDOR')),
  pre_dispute_status VARCHAR(20) NOT NULL,
  original_weight_kg DECIMAL(8,2),
  claimed_weight_kg DECIMAL(8,2),
  claimed_quality VARCHAR(20) CHECK (claimed_quality IN ('FRESH', 'SUBSTANDARD', 'DAMAGED')),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolved_at TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_disputes_order_id ON order_disputes(order_id);
```

- [ ] **Step 2: Create OrderDispute entity**

```java
// OrderDispute.java
package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "order_disputes")
public class OrderDispute {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "raised_by", nullable = false, length = 20)
    private String raisedBy;

    @Column(name = "pre_dispute_status", nullable = false, length = 20)
    private String preDisputeStatus;

    @Column(name = "original_weight_kg", precision = 8, scale = 2)
    private BigDecimal originalWeightKg;

    @Column(name = "claimed_weight_kg", precision = 8, scale = 2)
    private BigDecimal claimedWeightKg;

    @Column(name = "claimed_quality", length = 20)
    private String claimedQuality;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = OffsetDateTime.now(); }

    // Getters and setters for all fields
    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getRaisedBy() { return raisedBy; }
    public void setRaisedBy(String raisedBy) { this.raisedBy = raisedBy; }
    public String getPreDisputeStatus() { return preDisputeStatus; }
    public void setPreDisputeStatus(String preDisputeStatus) { this.preDisputeStatus = preDisputeStatus; }
    public BigDecimal getOriginalWeightKg() { return originalWeightKg; }
    public void setOriginalWeightKg(BigDecimal v) { this.originalWeightKg = v; }
    public BigDecimal getClaimedWeightKg() { return claimedWeightKg; }
    public void setClaimedWeightKg(BigDecimal v) { this.claimedWeightKg = v; }
    public String getClaimedQuality() { return claimedQuality; }
    public void setClaimedQuality(String v) { this.claimedQuality = v; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
```

- [ ] **Step 3: Create OrderDisputeRepository**

```java
// OrderDisputeRepository.java
package com.mermaid.app.repository;

import com.mermaid.app.domain.OrderDispute;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OrderDisputeRepository extends JpaRepository<OrderDispute, Long> {
    Optional<OrderDispute> findByOrderIdAndStatus(Long orderId, String status);
    boolean existsByOrderIdAndStatus(Long orderId, String status);
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/
git commit -m "feat(disputes): V45 migration, OrderDispute entity + repository"
```

---

### Task 5.3: DisputeService (TDD)

**Files:**
- Create: `backend/.../service/DisputeService.java`
- Create: `backend/.../service/DisputeServiceTest.java`

- [ ] **Step 1: Write failing tests**

```java
// DisputeServiceTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.model.OrderDisputeRequest;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.math.BigDecimal;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisputeServiceTest {

    @Mock OrderRepository orderRepo;
    @Mock OrderDisputeRepository disputeRepo;
    @Mock InventoryService inventoryService;
    @Mock org.springframework.context.ApplicationEventPublisher eventPublisher;
    @InjectMocks DisputeService service;

    private Order readyOrder(Long id, Long sellerId, Long buyerId) {
        Order o = new Order();
        o.setId(id); o.setSellerId(sellerId); o.setBuyerId(buyerId);
        o.setStatus("READY"); o.setKind(OrderKind.PROCUREMENT);
        o.setOrderedQtyKg(new BigDecimal("10")); o.setAgreedPricePerKg(new BigDecimal("50"));
        return o;
    }

    @Test
    void raise_sets_order_to_DISPUTED_and_captures_preDisputeStatus() {
        Order order = readyOrder(1L, 10L, 20L);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(disputeRepo.existsByOrderIdAndStatus(1L, "OPEN")).thenReturn(false);
        when(disputeRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        OrderDisputeRequest req = new OrderDisputeRequest();
        service.raise(1L, "FISHERMAN", req);

        ArgumentCaptor<OrderDispute> cap = ArgumentCaptor.forClass(OrderDispute.class);
        verify(disputeRepo).save(cap.capture());
        assertThat(cap.getValue().getPreDisputeStatus()).isEqualTo("READY");
        assertThat(cap.getValue().getRaisedBy()).isEqualTo("FISHERMAN");

        ArgumentCaptor<Order> orderCap = ArgumentCaptor.forClass(Order.class);
        verify(orderRepo).save(orderCap.capture());
        assertThat(orderCap.getValue().getStatus()).isEqualTo("DISPUTED");
    }

    @Test
    void raise_throws_400_when_order_not_in_READY_or_COMPLETED() {
        Order order = readyOrder(1L, 10L, 20L);
        order.setStatus("PENDING");
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.raise(1L, "FISHERMAN", new OrderDisputeRequest()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void raise_throws_409_when_open_dispute_already_exists() {
        Order order = readyOrder(1L, 10L, 20L);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(disputeRepo.existsByOrderIdAndStatus(1L, "OPEN")).thenReturn(true);

        assertThatThrownBy(() -> service.raise(1L, "FISHERMAN", new OrderDisputeRequest()))
            .isInstanceOf(com.mermaid.app.exception.ListingClosedException.class);
    }

    @Test
    void resolve_by_raising_party_throws_AccessDeniedException() {
        Order order = readyOrder(1L, 10L, 20L);
        order.setStatus("DISPUTED");
        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(1L); dispute.setRaisedBy("FISHERMAN"); dispute.setStatus("OPEN");
        dispute.setPreDisputeStatus("READY");

        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(disputeRepo.findByOrderIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(dispute));

        assertThatThrownBy(() -> service.resolve(1L, "FISHERMAN", "resolution"))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void resolve_from_READY_calls_addLotFromProcurement() {
        Order order = readyOrder(1L, 10L, 20L);
        order.setStatus("DISPUTED");
        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(1L); dispute.setRaisedBy("VENDOR"); dispute.setStatus("OPEN");
        dispute.setPreDisputeStatus("READY");

        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(disputeRepo.findByOrderIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(dispute));
        when(disputeRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.resolve(1L, "FISHERMAN", "resolved");

        verify(inventoryService).addLotFromProcurement(1L);
    }

    @Test
    void resolve_from_COMPLETED_does_NOT_call_addLotFromProcurement() {
        Order order = readyOrder(1L, 10L, 20L);
        order.setStatus("DISPUTED");
        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(1L); dispute.setRaisedBy("VENDOR"); dispute.setStatus("OPEN");
        dispute.setPreDisputeStatus("COMPLETED");

        when(orderRepo.findById(1L)).thenReturn(Optional.of(order));
        when(disputeRepo.findByOrderIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(dispute));
        when(disputeRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        service.resolve(1L, "FISHERMAN", "resolved");

        verify(inventoryService, never()).addLotFromProcurement(any());
    }
}
```

- [ ] **Step 2: Run to verify fails**

```bash
./mvnw test -Dtest=DisputeServiceTest
# Expected: FAIL
```

- [ ] **Step 3: Implement DisputeService**

```java
// DisputeService.java
package com.mermaid.app.service;

import com.mermaid.app.domain.*;
import com.mermaid.app.exception.*;
import com.mermaid.app.model.OrderDisputeRequest;
import com.mermaid.app.repository.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
public class DisputeService {

    private final OrderRepository orderRepo;
    private final OrderDisputeRepository disputeRepo;
    private final InventoryService inventoryService;
    private final ApplicationEventPublisher eventPublisher;

    public DisputeService(OrderRepository orderRepo, OrderDisputeRepository disputeRepo,
                          InventoryService inventoryService, ApplicationEventPublisher eventPublisher) {
        this.orderRepo = orderRepo;
        this.disputeRepo = disputeRepo;
        this.inventoryService = inventoryService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public OrderDispute raise(Long orderId, String raisedBy, OrderDisputeRequest req) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!"READY".equals(order.getStatus()) && !"COMPLETED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Cannot dispute order in status: " + order.getStatus());
        }
        if (disputeRepo.existsByOrderIdAndStatus(orderId, "OPEN")) {
            // Intentionally reusing ListingClosedException for 409 Conflict — GlobalExceptionHandler
            // maps it to HTTP 409. The alternative is a new DuplicateDisputeException, but that adds
            // a class for one edge case. Do NOT change to IllegalArgumentException (that maps to 400).
            throw new ListingClosedException("An open dispute already exists for order " + orderId);
        }

        OrderDispute dispute = new OrderDispute();
        dispute.setOrderId(orderId);
        dispute.setRaisedBy(raisedBy);
        dispute.setPreDisputeStatus(order.getStatus());
        dispute.setOriginalWeightKg(order.getOrderedQtyKg());
        if (req.getClaimedWeightKg() != null) dispute.setClaimedWeightKg(BigDecimal.valueOf(req.getClaimedWeightKg()));
        dispute.setClaimedQuality(req.getClaimedQuality());
        dispute.setNotes(req.getNotes());
        dispute.setStatus("OPEN");
        disputeRepo.save(dispute);

        order.setStatus("DISPUTED");
        orderRepo.save(order);

        return dispute;
    }

    @Transactional(readOnly = true)
    public OrderDispute getDispute(Long orderId) {
        return disputeRepo.findByOrderIdAndStatus(orderId, "OPEN")
            .or(() -> disputeRepo.findByOrderIdAndStatus(orderId, "RESOLVED"))
            .orElseThrow(() -> new ResourceNotFoundException("No dispute found for order: " + orderId));
    }

    @Transactional
    public OrderDispute resolve(Long orderId, String callerRole, String resolution) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        OrderDispute dispute = disputeRepo.findByOrderIdAndStatus(orderId, "OPEN")
            .orElseThrow(() -> new ResourceNotFoundException("No open dispute for order: " + orderId));

        if (dispute.getRaisedBy().equals(callerRole)) {
            throw new AccessDeniedException("The raising party cannot resolve their own dispute");
        }

        dispute.setStatus("RESOLVED");
        dispute.setResolvedAt(OffsetDateTime.now());
        dispute.setResolution(resolution);
        disputeRepo.save(dispute);

        if ("READY".equals(dispute.getPreDisputeStatus())) {
            inventoryService.addLotFromProcurement(orderId);
        }
        order.setStatus("COMPLETED");
        orderRepo.save(order);

        return dispute;
    }
}
```

- [ ] **Step 4: Run tests**

```bash
./mvnw test -Dtest=DisputeServiceTest
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat(disputes): DisputeService — raise, resolve, AccessDeniedException for raising party"
```

---

### Task 5.4: Dispute controllers

**Files:**
- Create: `backend/.../controller/FishermanDisputeController.java`
- Modify: `backend/.../controller/VendorProcurementController.java` (add dispute methods)

- [ ] **Step 1: Create FishermanDisputeController**

```java
// FishermanDisputeController.java
package com.mermaid.app.controller;

import com.mermaid.app.api.FishermanDisputeApi;  // or whichever interface was generated
import com.mermaid.app.domain.OrderDispute;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.DisputeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

// MANDATORY: After running generate-sources, check the generated interface name.
// The operationIds `fishermanRaiseDispute`, `fishermanGetDispute`, `fishermanResolveDispute`
// will produce a generated interface — find it in `com.mermaid.app.api.*` and use that name below.
// The controller MUST implement this interface so Spring MVC picks up the @RequestMapping annotations.
@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class FishermanDisputeController implements FishermanDisputeApi /* ← use actual generated interface name */ {

    private final DisputeService disputeService;

    public FishermanDisputeController(DisputeService disputeService) {
        this.disputeService = disputeService;
    }

    @Override
    public ResponseEntity<OrderDisputeDto> fishermanRaiseDispute(Long id, OrderDisputeRequest req) {
        OrderDispute d = disputeService.raise(id, "FISHERMAN", req);
        return ResponseEntity.status(201).body(toDto(d));
    }

    @Override
    public ResponseEntity<OrderDisputeDto> fishermanGetDispute(Long id) {
        return ResponseEntity.ok(toDto(disputeService.getDispute(id)));
    }

    @Override
    public ResponseEntity<OrderDisputeDto> fishermanResolveDispute(Long id, DisputeResolveRequest req) {
        OrderDispute d = disputeService.resolve(id, "FISHERMAN", req.getResolution());
        return ResponseEntity.ok(toDto(d));
    }

    private OrderDisputeDto toDto(OrderDispute d) {
        OrderDisputeDto dto = new OrderDisputeDto();
        dto.setId(d.getId());
        dto.setOrderId(d.getOrderId());
        dto.setRaisedBy(d.getRaisedBy());
        dto.setPreDisputeStatus(d.getPreDisputeStatus());
        dto.setStatus(d.getStatus());
        if (d.getClaimedWeightKg() != null) dto.setClaimedWeightKg(d.getClaimedWeightKg().doubleValue());
        dto.setClaimedQuality(d.getClaimedQuality());
        dto.setNotes(d.getNotes());
        dto.setResolvedAt(d.getResolvedAt());
        dto.setResolution(d.getResolution());
        dto.setCreatedAt(d.getCreatedAt());
        return dto;
    }
}
```

> Note: Check which API interface was generated for these operationIds. If the generator combined them differently, implement the generated interface. The `toDto()` method can be extracted to a shared location if both controllers need it.

- [ ] **Step 2: Add dispute methods to VendorProcurementController**

Add `DisputeService disputeService` to constructor and field. Then add:

```java
    // POST /vendor/procurement-orders/{id}/dispute
    public ResponseEntity<OrderDisputeDto> vendorRaiseDispute(Long id, OrderDisputeRequest req) {
        OrderDispute d = disputeService.raise(id, "VENDOR", req);
        return ResponseEntity.status(201).body(toDisputeDto(d));
    }

    // GET /vendor/procurement-orders/{id}/dispute
    public ResponseEntity<OrderDisputeDto> vendorGetDispute(Long id) {
        return ResponseEntity.ok(toDisputeDto(disputeService.getDispute(id)));
    }

    // PUT /vendor/procurement-orders/{id}/dispute/resolve
    public ResponseEntity<OrderDisputeDto> vendorResolveDispute(Long id, DisputeResolveRequest req) {
        OrderDispute d = disputeService.resolve(id, "VENDOR", req.getResolution());
        return ResponseEntity.ok(toDisputeDto(d));
    }

    private OrderDisputeDto toDisputeDto(OrderDispute d) { /* same as FishermanDisputeController.toDto() */ }
```

- [ ] **Step 3: Build**

```bash
./mvnw clean package -DskipTests
# Expected: BUILD SUCCESS
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/
git commit -m "feat(disputes): FishermanDisputeController + vendor dispute endpoints"
```

---

### Task 5.5: fisherman/Procurement.jsx — dispute UI

**Files:**
- Modify: `frontend/src/fisherman/Procurement.jsx`

- [ ] **Step 1: Add dispute modal and state to Procurement.jsx**

Add imports: `import { raiseDispute, getDispute, resolveDispute } from './api/procurement'`

Add state: `const [disputeModal, setDisputeModal] = useState(null)` — holds the order when open.
Add state: `const [disputeForm, setDisputeForm] = useState({ claimedWeightKg: '', claimedQuality: 'FRESH', notes: '' })`

Add "Flag Dispute" button on READY and COMPLETED orders in the actions area:
```jsx
{(order.status === 'READY' || order.status === 'COMPLETED') && (
  <button className="btn btn--ghost btn--sm"
    style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
    onClick={() => { setDisputeModal(order); setDisputeForm({ claimedWeightKg: order.qtyKg || '', claimedQuality: 'FRESH', notes: '' }) }}>
    Flag Dispute
  </button>
)}
```

For DISPUTED orders, poll the dispute to determine `raisedBy`:
```jsx
{order.status === 'DISPUTED' && <DisputeStatusCell orderId={order.id} />}
```

Add `DisputeStatusCell` inline component:
```jsx
function DisputeStatusCell({ orderId }) {
  const [dispute, setDispute] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getDispute(orderId).then(setDispute).catch(() => {})
  }, [orderId])

  if (!dispute) return <span className="status status--disputed">Disputed</span>

  if (dispute.raisedBy === 'FISHERMAN') {
    return <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Awaiting vendor resolution</span>
  }

  return (
    <button className="btn btn--accent btn--sm" disabled={busy}
      onClick={async () => {
        setBusy(true)
        try { await resolveDispute(orderId, { resolution: 'Resolved by fisherman' }) }
        catch {}
        finally { setBusy(false) }
      }}>
      Resolve Dispute
    </button>
  )
}
```

Add dispute modal:
```jsx
{disputeModal && (
  <div className="modal-overlay" onClick={() => setDisputeModal(null)}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
      <div className="modal__head">
        <div className="eyebrow">Dispute</div>
        <div className="modal__title">Flag a Dispute</div>
      </div>
      <div className="form-grid" style={{ padding: '16px 0 0' }}>
        <div className="form-row">
          <label>Original weight (kg)</label>
          <input className="input" value={disputeModal.qtyKg || ''} disabled />
        </div>
        <div className="form-row">
          <label>Your claimed weight (kg)</label>
          <input type="number" className="input" value={disputeForm.claimedWeightKg}
            onChange={e => setDisputeForm(p => ({ ...p, claimedWeightKg: e.target.value }))} />
        </div>
        <div className="form-row">
          <label>Quality</label>
          <div className="seg">
            {['FRESH','SUBSTANDARD','DAMAGED'].map(q => (
              <button key={q} className={`seg__btn${disputeForm.claimedQuality === q ? ' on' : ''}`}
                onClick={() => setDisputeForm(p => ({ ...p, claimedQuality: q }))}>
                {q.charAt(0) + q.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label>Notes</label>
          <textarea className="input" rows={2} value={disputeForm.notes}
            onChange={e => setDisputeForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </div>
      <div className="modal__foot">
        <button className="btn btn--ghost btn--sm" onClick={() => setDisputeModal(null)}>Cancel</button>
        <button className="btn btn--sm" style={{ background: 'var(--unsafe)', color: 'var(--paper)', border: 'none' }}
          onClick={async () => {
            try {
              await raiseDispute(disputeModal.id, {
                claimedWeightKg: parseFloat(disputeForm.claimedWeightKg) || undefined,
                claimedQuality: disputeForm.claimedQuality,
                notes: disputeForm.notes || undefined,
              })
              setDisputeModal(null)
              refetch()
            } catch {}
          }}>
          Submit Dispute
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/Procurement.jsx
git commit -m "feat(disputes): fisherman Procurement — Flag Dispute + Resolve Dispute UI"
```

---

### Task 5.6: vendor/ProcurementOrders.jsx — DISPUTED tab + resolve

**Files:**
- Modify: `frontend/src/vendor/ProcurementOrders.jsx`

- [ ] **Step 1: Add DISPUTED to vendor BUCKETS**

Find the BUCKETS array in `frontend/src/vendor/ProcurementOrders.jsx` (currently `['PENDING','ACCEPTED','READY','COMPLETED','CANCELLED']`) and add `'DISPUTED'`:

```js
const BUCKETS = ['PENDING','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED']
```

- [ ] **Step 2: Add vendor dispute actions**

Add imports: `import { raiseVendorDispute, getVendorDispute, resolveVendorDispute } from './api/procurement'`

Add to vendor's `frontend/src/vendor/api/procurement.js`:
```js
export const raiseVendorDispute   = (id, body) => apiPost(`/vendor/procurement-orders/${id}/dispute`, body)
export const getVendorDispute     = (id) => apiGet(`/vendor/procurement-orders/${id}/dispute`)
export const resolveVendorDispute = (id, body) => apiPut(`/vendor/procurement-orders/${id}/dispute/resolve`, body)
```

Add "Flag Dispute" button on READY and COMPLETED orders (same pattern as fisherman side, calls `raiseVendorDispute`).

For DISPUTED orders, inline `VendorDisputeStatusCell` component that:
- Fetches `getVendorDispute(orderId)`
- If `dispute.raisedBy === 'VENDOR'` → shows "Awaiting fisherman resolution"
- If `dispute.raisedBy === 'FISHERMAN'` → shows "Resolve Dispute" button → calls `resolveVendorDispute`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/
git commit -m "feat(disputes): vendor ProcurementOrders — DISPUTED tab, flag and resolve UI"
```

---

## Cleanup (post all phases)

- [ ] Run full test suite:

```bash
cd backend && ./mvnw test
cd ../frontend && npm test -- --run
```

- [ ] Run frontend lint:

```bash
cd frontend && npm run lint
```

- [ ] Commit any lint fixes:

```bash
git add frontend/src/
git commit -m "chore: lint fixes post fisherman modernization"
```

- [ ] Create final summary commit if needed:

```bash
git log --oneline fisherman-modernization ^master | head -30
# Review all commits in the branch before PR
```
