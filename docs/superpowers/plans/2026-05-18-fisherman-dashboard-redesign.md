# Fisherman Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 8 fisherman pages and the shell with the MERMAID v2 dark design system, hover-expand rail, and GSAP micro-animations — using real API data throughout, no mock data or placeholders.

**Architecture:** Keep `FishermanDashboard.jsx` as the `useState`-based SPA shell. Add a hover-expand rail (76px → 256px) with GSAP label animations, GSAP page transitions, and a design-token CSS file scoped to the fisherman shell. Each page owns its own `useQuery` hooks from existing `fisherman/api/*.js` modules. No backend changes.

**Tech Stack:** React 18, TanStack Query v5, GSAP 3, Vitest + RTL, existing `fisherman/api/*.js` modules, `src/api/lookup.js` for species dropdown.

**Spec:** `docs/superpowers/specs/2026-05-18-fisherman-dashboard-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/fisherman/fisherman-shell.css` | **Create** | Design tokens, rail CSS, modal base, skeleton shimmer |
| `frontend/src/fisherman/FishermanDashboard.jsx` | **Rewrite** | Shell: rail, active trip query, page transitions, profile dirty guard |
| `frontend/src/fisherman/Home.jsx` | **Rewrite** | Viewport-locked bento (conditions hero, advisories, zone carousel, catch alerts strip, trip console) |
| `frontend/src/fisherman/Trips.jsx` | **Redesign** | Timeline card list + Start Trip two-step modal |
| `frontend/src/fisherman/CatchAlerts.jsx` | **Redesign** | Alert card grid + Create Alert drawer |
| `frontend/src/fisherman/ActiveDeals.jsx` | **Redesign** | Deal cards by status + Counter Proposal modal |
| `frontend/src/fisherman/Orders.jsx` | **Redesign** | Order rows + inline stepper + confirm modals |
| `frontend/src/fisherman/Earnings.jsx` | **Redesign** | 4 stat cards + ledger rows |
| `frontend/src/fisherman/Messages.jsx` | **Rewrite** | Remove DM mode; deals-only sidebar + DealChatPane |
| `frontend/src/fisherman/Profile.jsx` | **Redesign** | Read-only fullName/email; editable fields + save |
| `frontend/src/fisherman/__tests__/FishermanDashboard.test.jsx` | **Create** | Shell: rail expand, active trip card, nav items |
| `frontend/src/fisherman/__tests__/Home.test.jsx` | **Update** | Zone names, risk badge, skeleton, catch alerts strip |
| `frontend/src/fisherman/__tests__/Trips.test.jsx` | **Update** | Trip cards, Start Trip button |
| `frontend/src/fisherman/__tests__/CatchAlerts.test.jsx` | **Create** | Alert cards, create button, species/hours fields |
| `frontend/src/fisherman/__tests__/ActiveDeals.test.jsx` | **Update** | Deal cards, status groups |
| `frontend/src/fisherman/__tests__/Orders.test.jsx` | **Create** | Order rows, confirm buttons |
| `frontend/src/fisherman/__tests__/Earnings.test.jsx` | **Update** | Stat card labels, ledger rows |
| `frontend/src/fisherman/__tests__/Messages.test.jsx` | **Create** | No DM tab; deal list renders |
| `frontend/src/fisherman/__tests__/Profile.test.jsx` | **Create** | Read-only email, editable vesselName |

---

## Task 1: Install GSAP + Design Tokens CSS

**Files:**
- Run: `frontend/` — `npm install gsap`
- Create: `frontend/src/fisherman/fisherman-shell.css`
- Modify: `frontend/src/fisherman/FishermanDashboard.jsx` (add import)

- [ ] **Step 1: Install GSAP**

```bash
cd frontend
npm install gsap
```

Expected: `gsap` appears in `package.json` dependencies.

- [ ] **Step 2: Create `fisherman-shell.css`**

Create `frontend/src/fisherman/fisherman-shell.css` with the full token set and rail/modal/skeleton CSS:

```css
/* ── Design tokens ──────────────────────────────────────────────────────── */
[data-fisherman-shell] {
  --bg-app:        #0e0820;
  --bg-canvas:     #1f1633;
  --bg-card:       #1a1230;
  --bg-card-2:     #221940;
  --bg-card-3:     #2a2050;
  --hairline:      rgba(255,255,255,0.08);
  --safe:          #6ee7b7;
  --caution:       #fcd34d;
  --unsafe:        #fb7185;
  --accent-lime:   #a3e635;
  --accent-violet: #7c3aed;
  --rail-w:        76px;
  --rail-w-open:   256px;
  /* DealChatPane bubble overrides */
  --accent-soft:   rgba(163,230,53,0.12);
  --paper-2:       rgba(139,92,246,0.15);
}

/* ── Shell layout ───────────────────────────────────────────────────────── */
[data-fisherman-shell] {
  display: flex;
  height: 100vh;
  background: var(--bg-app);
  color: #e2e8f0;
  font-family: 'Rubik', sans-serif;
  overflow: hidden;
}

/* ── Rail ───────────────────────────────────────────────────────────────── */
.f-rail {
  width: var(--rail-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--hairline);
  overflow: hidden;
  transition: width 250ms ease;
  z-index: 20;
}
[data-rail-open="true"] .f-rail { width: var(--rail-w-open); }

.f-rail__logo {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-lime);
  white-space: nowrap;
  overflow: hidden;
}

.f-rail__nav { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }

.f-rail__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 0;
  color: rgba(255,255,255,0.55);
  transition: color 150ms;
  white-space: nowrap;
  position: relative;
}
.f-rail__item:hover { color: rgba(255,255,255,0.85); }
.f-rail__item.active {
  color: var(--accent-lime);
  box-shadow: inset 3px 0 0 var(--accent-lime), 0 0 12px rgba(163,230,53,0.15);
}
.f-rail__item__icon { flex-shrink: 0; width: 20px; text-align: center; }
.f-rail__item__label { opacity: 0; pointer-events: none; font-size: 0.875rem; }
[data-rail-open="true"] .f-rail__item__label { pointer-events: auto; }

/* ── Active trip mini-card (rail bottom) ────────────────────────────────── */
.f-rail__trip-card {
  margin: 8px 10px 12px;
  padding: 10px 12px;
  background: var(--bg-card-3);
  border: 1px solid var(--hairline);
  border-radius: 10px;
  backdrop-filter: blur(12px);
  display: none;
  white-space: nowrap;
  overflow: hidden;
}
[data-rail-open="true"] .f-rail__trip-card { display: block; }
.f-rail__trip-card__label { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }
.f-rail__trip-card__value { font-size: 0.8rem; color: #e2e8f0; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; }
.f-rail__trip-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}
.badge--safe   { background: rgba(110,231,183,0.15); color: var(--safe); }
.badge--caution { background: rgba(252,211,77,0.15); color: var(--caution); }
.badge--unsafe  { background: rgba(251,113,133,0.15); color: var(--unsafe); }

/* ── Main content ───────────────────────────────────────────────────────── */
.f-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-canvas);
}
.f-topbar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--hairline);
  background: var(--bg-card);
}
.f-topbar__title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 1rem; }
.f-page-wrap { flex: 1; overflow: hidden; }

/* ── Cards & glass ──────────────────────────────────────────────────────── */
.f-card {
  background: var(--bg-card);
  border: 1px solid var(--hairline);
  border-radius: 14px;
  overflow: hidden;
}
.f-card--canvas { background: var(--bg-canvas); }
.f-card--2 { background: var(--bg-card-2); }
.f-card--glass {
  background: var(--bg-card-3);
  border: 1px solid var(--hairline);
  backdrop-filter: blur(16px);
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
.f-modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(14,8,32,0.7);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}
.f-modal {
  background: var(--bg-card);
  border: 1px solid var(--hairline);
  border-radius: 16px;
  width: min(440px, 92vw);
  padding: 28px;
}
.f-modal--wide { width: min(480px, 92vw); }
.f-modal__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem; font-weight: 600;
  margin-bottom: 20px;
}

/* ── Drawer ─────────────────────────────────────────────────────────────── */
.f-drawer {
  position: fixed; inset: 0; z-index: 100;
  display: flex; justify-content: flex-end;
}
.f-drawer__backdrop {
  position: absolute; inset: 0;
  background: rgba(14,8,32,0.7);
  backdrop-filter: blur(8px);
}
.f-drawer__panel {
  position: relative;
  width: min(420px, 100vw);
  height: 100%;
  background: var(--bg-card);
  border-left: 1px solid var(--hairline);
  display: flex; flex-direction: column;
  overflow-y: auto;
  padding: 28px;
}

/* ── Buttons ────────────────────────────────────────────────────────────── */
.f-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; padding: 8px 20px; border-radius: 8px;
  font-size: 0.875rem; font-weight: 500; cursor: pointer;
  border: none; transition: opacity 150ms;
}
.f-btn:hover { opacity: 0.85; }
.f-btn--primary { background: var(--accent-lime); color: #0e0820; }
.f-btn--secondary { background: var(--bg-card-2); color: rgba(255,255,255,0.7); }
.f-btn--danger { background: rgba(251,113,133,0.15); color: var(--unsafe); }
.f-btn--sm { padding: 5px 14px; font-size: 0.8rem; }

/* ── Form inputs ────────────────────────────────────────────────────────── */
.f-label { font-size: 0.75rem; color: rgba(255,255,255,0.45); margin-bottom: 4px; display: block; }
.f-input {
  width: 100%;
  background: var(--bg-card-2);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 8px 12px;
  color: #e2e8f0;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 150ms;
}
.f-input:focus { border-color: var(--accent-lime); }
.f-field { margin-bottom: 14px; }

/* ── Status chips ───────────────────────────────────────────────────────── */
.f-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; border-radius: 20px;
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
}
.f-chip--safe    { background: rgba(110,231,183,0.15); color: var(--safe); }
.f-chip--caution { background: rgba(252,211,77,0.15);  color: var(--caution); }
.f-chip--unsafe  { background: rgba(251,113,133,0.15); color: var(--unsafe); }
.f-chip--lime    { background: rgba(163,230,53,0.15);  color: var(--accent-lime); }
.f-chip--muted   { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.45); }

/* ── Skeleton ───────────────────────────────────────────────────────────── */
.skeleton-bar {
  height: 14px; border-radius: 6px;
  background: var(--bg-card-2);
  position: relative; overflow: hidden;
}
.skeleton-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}
/* GSAP shimmer targets .skeleton-shimmer <div> inside .skeleton-bar */
.skeleton-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}

/* ── Toast ──────────────────────────────────────────────────────────────── */
.f-toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 200;
  background: var(--bg-card-2); border: 1px solid rgba(163,230,53,0.3);
  border-radius: 10px; padding: 10px 18px;
  color: var(--accent-lime); font-size: 0.875rem;
}

/* ── Trips active pulse dot ─────────────────────────────────────────────── */
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent-lime);
  animation: pulse-anim 1.5s ease-in-out infinite;
}
@keyframes pulse-anim {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Error inline pill ──────────────────────────────────────────────────── */
.f-error {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(251,113,133,0.1);
  color: var(--unsafe); font-size: 0.8rem;
}
.f-error__retry { cursor: pointer; text-decoration: underline; margin-left: 4px; }
```

- [ ] **Step 3: Add import to `FishermanDashboard.jsx`**

Open `frontend/src/fisherman/FishermanDashboard.jsx` and add this import right after the existing `import '../design-system.css'` line:

```js
import './fisherman-shell.css'
```

- [ ] **Step 4: Verify dev server starts without error**

```bash
cd frontend && npm run dev
```

Expected: Vite dev server starts on port 5173, no CSS parse errors in console.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/fisherman/fisherman-shell.css frontend/src/fisherman/FishermanDashboard.jsx
git commit -m "feat(fisherman): install gsap and add design token CSS"
```

---

## Task 2: Shell — Hover-Expand Rail + Active Trip Mini-Card

**Files:**
- Modify: `frontend/src/fisherman/FishermanDashboard.jsx` (full rewrite)
- Create: `frontend/src/fisherman/__tests__/FishermanDashboard.test.jsx`

**Context:** `FishermanDashboard.jsx` currently has a 161-line SPA shell with a static icon-only rail. Rewrite it to add hover-expand behavior, GSAP label animations, and an active-trip query that powers the rail mini-card. The page component map and `NAV_ITEMS` stay the same.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/fisherman/__tests__/FishermanDashboard.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FishermanDashboard from '../FishermanDashboard'

vi.mock('gsap', () => ({
  default: {
    to: vi.fn().mockReturnValue({ kill: vi.fn() }),
    from: vi.fn().mockReturnValue({ kill: vi.fn() }),
    fromTo: vi.fn().mockReturnValue({ kill: vi.fn() }),
    killTweensOf: vi.fn(),
    set: vi.fn(),
  },
}))
vi.mock('../api/trips', () => ({
  listTrips: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, fullName: 'Isidro' }, loading: false }),
}))
vi.mock('../../context/StompContext', () => ({
  StompProvider: ({ children }) => <>{children}</>,
}))

// Stub all page components so they render without their own queries
vi.mock('../Home',        () => ({ default: () => <div data-testid="page-home" /> }))
vi.mock('../Trips',       () => ({ default: () => <div data-testid="page-trips" /> }))
vi.mock('../CatchAlerts', () => ({ default: () => <div data-testid="page-alerts" /> }))
vi.mock('../ActiveDeals', () => ({ default: () => <div data-testid="page-deals" /> }))
vi.mock('../Orders',      () => ({ default: () => <div data-testid="page-orders" /> }))
vi.mock('../Earnings',    () => ({ default: () => <div data-testid="page-earnings" /> }))
vi.mock('../Messages',    () => ({ default: () => <div data-testid="page-messages" /> }))
vi.mock('../Profile',     () => ({ default: () => <div data-testid="page-profile" /> }))

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('FishermanDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all 8 nav items', () => {
    wrap(<FishermanDashboard />)
    expect(screen.getAllByRole('button', { hidden: true }).length).toBeGreaterThanOrEqual(8)
  })

  it('starts on dashboard page', () => {
    wrap(<FishermanDashboard />)
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  })

  it('sets data-rail-open false initially', () => {
    const { container } = wrap(<FishermanDashboard />)
    expect(container.querySelector('[data-fisherman-shell]').getAttribute('data-rail-open')).toBe('false')
  })

  it('sets data-rail-open true on rail mouse enter', () => {
    const { container } = wrap(<FishermanDashboard />)
    const rail = container.querySelector('.f-rail')
    fireEvent.mouseEnter(rail)
    expect(container.querySelector('[data-fisherman-shell]').getAttribute('data-rail-open')).toBe('true')
  })

  it('navigates to trips page on nav click', () => {
    wrap(<FishermanDashboard />)
    fireEvent.click(screen.getByTestId('nav-trips'))
    expect(screen.getByTestId('page-trips')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/FishermanDashboard.test.jsx 2>&1 | tail -30
```

Expected: Multiple failures (no `data-fisherman-shell`, no `f-rail`, no `data-testid="nav-trips"`).

- [ ] **Step 3: Rewrite `FishermanDashboard.jsx`**

```jsx
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
  { id: 'dashboard', icon: 'Dashboard', label: 'Dashboard',     testId: 'nav-dashboard' },
  { id: 'trips',     icon: 'Anchor',    label: 'My Trips',      testId: 'nav-trips' },
  { id: 'alerts',    icon: 'Bell',      label: 'Catch Alerts',  testId: 'nav-alerts' },
  { id: 'deals',     icon: 'Users',     label: 'Deals',         testId: 'nav-deals' },
  { id: 'orders',    icon: 'Clipboard', label: 'Orders',        testId: 'nav-orders' },
  { id: 'earnings',  icon: 'Wallet',    label: 'Earnings',      testId: 'nav-earnings' },
  { id: 'messages',  icon: 'Message',   label: 'Messages',      testId: 'nav-messages' },
  { id: 'profile',   icon: 'User',      label: 'Profile',       testId: 'nav-profile' },
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

// App.jsx passes user and onLogout as props — keep the same signature
export default function FishermanDashboard({ user, onLogout }) {
  const [page, setPageState] = useState('dashboard')
  const [railOpen, setRailOpen] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(null) // { to: 'trips' }
  const pageRef = useRef(null)
  const labelRefs = useRef([])

  // Shell-level active trip query — shared with Home page via QueryClient cache
  const activeTripsQ = useQuery({
    queryKey: ['trips', 'ACTIVE'],
    queryFn: () => listTrips('ACTIVE'),
    select: (data) => (Array.isArray(data) ? data[0] : null),
    staleTime: 30_000,
  })
  const activeTrip = activeTripsQ.data ?? null

  // Page transition helper
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

  // Animate rail labels when rail opens
  useEffect(() => {
    const labels = labelRefs.current.filter(Boolean)
    if (!labels.length) return
    if (railOpen) {
      gsap.from(labels, { opacity: 0, x: -8, stagger: 0.04, duration: 0.2 })
    }
  }, [railOpen])

  // Elapsed timer for active trip
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
        {/* Rail */}
        <nav
          className="f-rail"
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
        >
          <div className="f-rail__logo">M</div>
          <div className="f-rail__nav">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={item.id}
                data-testid={item.testId}
                className={`f-rail__item${page === item.id ? ' active' : ''}`}
                onClick={() => navigateTo(item.id)}
                style={{ background: 'none' }}
              >
                <span className="f-rail__item__icon"><I name={item.icon} size={18} /></span>
                <span
                  className="f-rail__item__label"
                  ref={el => { labelRefs.current[i] = el }}
                >
                  {item.label}
                </span>
              </button>
            ))}
            {/* Sign Out — always at bottom of nav */}
            <button
              className="f-rail__item"
              onClick={onLogout}
              style={{ background: 'none', marginTop: 'auto' }}
              data-testid="nav-signout"
            >
              <span className="f-rail__item__icon"><I name="LogOut" size={18} /></span>
              <span className="f-rail__item__label">Sign Out</span>
            </button>
          </div>

          {/* Active trip mini-card — only visible when rail is open */}
          {activeTrip && (
            <div className="f-rail__trip-card">
              <div className="f-rail__trip-card__label">Active Trip</div>
              <div className="f-rail__trip-card__value">{activeTrip.departurePoint ?? 'En route'}</div>
              <div className="f-rail__trip-card__value" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>{elapsed}</div>
            </div>
          )}
        </nav>

        {/* Main */}
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

        {/* Unsaved changes confirm modal */}
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
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/FishermanDashboard.test.jsx 2>&1 | tail -30
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/FishermanDashboard.jsx frontend/src/fisherman/__tests__/FishermanDashboard.test.jsx
git commit -m "feat(fisherman): rewrite shell with hover-expand rail and GSAP page transitions"
```

---

## Task 3: Home Page — Viewport-Locked Bento

**Files:**
- Rewrite: `frontend/src/fisherman/Home.jsx`
- Update: `frontend/src/fisherman/__tests__/Home.test.jsx`

**Context:** Home must be viewport-locked (no scroll). 5 cards in a 2-row bento. Data: `fetchAllConditions()` (marine + zones), `fetchAdvisories(true)`, `listCatchAlerts()`, shell-passed `activeTrip` prop. Receives `setPage` and `activeTrip` props from shell.

- [ ] **Step 1: Update the test**

Replace `frontend/src/fisherman/__tests__/Home.test.jsx` with:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/marine', () => ({
  fetchAllConditions: vi.fn(),
  fetchAdvisories: vi.fn(),
}))
vi.mock('../api/catchAlerts', () => ({
  listCatchAlerts: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, fullName: 'Isidro' }, loading: false }),
}))

import { fetchAllConditions, fetchAdvisories } from '../api/marine'
import { listCatchAlerts } from '../api/catchAlerts'

const MOCK_CONDITIONS = {
  zones: [{
    zoneId: 'la_union', zoneName: 'La Union Coast', region: 'Ilocos',
    observedAt: '2026-05-18T06:00:00Z',
    risk: { level: 'SAFE', score: 2, factors: [], advisory: '' },
    marine: { waveHeightM: 0.8 },
    weather: { windSpeedKmh: 15, windGustsKmh: 22 },
    dataSource: 'open-meteo',
  }],
  generatedAt: '2026-05-18T06:00:00Z',
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchAllConditions.mockResolvedValue(MOCK_CONDITIONS)
  fetchAdvisories.mockResolvedValue([])
  listCatchAlerts.mockResolvedValue([])
})

describe('FishermanHomePage', () => {
  it('renders zone name in carousel', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/La Union Coast/i)).toBeInTheDocument()
  })

  it('renders SAFE risk badge', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/SAFE/i)).toBeInTheDocument()
  })

  it('renders wave height', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/0\.8/)).toBeInTheDocument()
  })

  it('renders skeleton while loading', () => {
    fetchAllConditions.mockReturnValue(new Promise(() => {}))
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })

  it('renders "No active advisories" when advisories empty', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/No active advisories/i)).toBeInTheDocument()
  })

  it('renders active trip console when activeTrip provided', async () => {
    const trip = { id: 1, departurePoint: 'San Juan Port', startedAt: new Date().toISOString() }
    fetchAllConditions.mockResolvedValue(MOCK_CONDITIONS)
    wrap(<Home setPage={vi.fn()} activeTrip={trip} />)
    expect(await screen.findByText(/San Juan Port/i)).toBeInTheDocument()
  })

  it('renders "Start a Trip" CTA when no active trip', async () => {
    wrap(<Home setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/Start a Trip/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Home.test.jsx 2>&1 | tail -30
```

Expected: Multiple failures.

- [ ] **Step 3: Rewrite `Home.jsx`**

Full rewrite. Follow the spec bento layout exactly. Key patterns:

```jsx
import { useRef, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { fetchAllConditions, fetchAdvisories } from './api/marine'
import { listCatchAlerts } from './api/catchAlerts'

const RISK_CLASS = { SAFE: 'f-chip--safe', CAUTION: 'f-chip--caution', UNSAFE: 'f-chip--unsafe' }

export default function FishermanHomePage({ setPage, activeTrip }) {
  const condQ = useQuery({ queryKey: ['marine', 'all'], queryFn: fetchAllConditions })
  const advQ  = useQuery({ queryKey: ['advisories'], queryFn: () => fetchAdvisories(true) })
  const alertQ = useQuery({ queryKey: ['fisherman', 'catch-alerts'], queryFn: listCatchAlerts })

  const zones    = condQ.data?.zones ?? []
  const advisories = advQ.data ?? []
  const alerts   = alertQ.data ?? []

  // Overall risk = worst across zones
  const RISK_ORDER = { UNSAFE: 2, CAUTION: 1, SAFE: 0 }
  const overallRisk = zones.reduce((worst, z) => {
    return (RISK_ORDER[z.risk?.level] ?? 0) > (RISK_ORDER[worst] ?? 0) ? z.risk.level : worst
  }, 'SAFE')

  // First zone stats for hero
  const heroZone = zones[0]

  // Zone carousel
  const [zoneIdx, setZoneIdx] = useState(0)
  const carouselRef = useRef(null)
  const carouselTimer = useRef(null)
  const advanceZone = (next) => {
    if (!carouselRef.current || zones.length < 2) return
    gsap.to(carouselRef.current, {
      opacity: 0, duration: 0.3,
      onComplete: () => {
        setZoneIdx(next)
        gsap.fromTo(carouselRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      },
    })
  }
  useEffect(() => {
    if (zones.length < 2) return
    carouselTimer.current = setInterval(() => {
      setZoneIdx(i => { const next = (i + 1) % zones.length; advanceZone(next); return i })
    }, 4000)
    return () => clearInterval(carouselTimer.current)
  }, [zones.length])

  // GSAP counter for hero numbers
  const waveRef = useRef(null)
  const windRef = useRef(null)
  const gustRef = useRef(null)
  useEffect(() => {
    if (!heroZone) return
    const animate = (ref, target) => {
      if (!ref.current) return
      const obj = { val: 0 }
      gsap.to(obj, { val: target, duration: 0.8, ease: 'power2.out',
        onUpdate: () => { if (ref.current) ref.current.textContent = obj.val.toFixed(1) } })
    }
    animate(waveRef, heroZone.marine?.waveHeightM ?? 0)
    animate(windRef, heroZone.weather?.windSpeedKmh ?? 0)
    animate(gustRef, heroZone.weather?.windGustsKmh ?? 0)
  }, [heroZone?.zoneId])

  // Trip console elapsed timer — shell passes activeTrip so no duplicate query
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!activeTrip?.startedAt) { setElapsed(''); return }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTrip.startedAt)) / 1000)
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [activeTrip])

  if (condQ.isLoading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton-bar" style={{ height: 80 }}>
          <div className="skeleton-shimmer" />
        </div>
      ))}
    </div>
  )

  const currentZone = zones[zoneIdx]

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: '40% 60%', gap: 16, padding: 16, overflow: 'hidden' }}>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Conditions hero */}
        <div className="f-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`f-chip ${RISK_CLASS[overallRisk] ?? 'f-chip--muted'}`} style={{ fontSize: '0.85rem', padding: '4px 14px' }}>
              {overallRisk}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>La Union — Overall</span>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 'auto' }}>
            {[
              { label: 'Wave (m)',  ref: waveRef },
              { label: 'Wind km/h', ref: windRef },
              { label: 'Gusts km/h', ref: gustRef },
            ].map(({ label, ref }) => (
              <div key={label}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', fontWeight: 700 }}>
                  <span ref={ref}>0.0</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {condQ.isError && <div className="f-error">Failed to load conditions<span className="f-error__retry" onClick={condQ.refetch}>Retry</span></div>}
        </div>

        {/* Advisories */}
        <div className="f-card" style={{ padding: 20, overflowY: 'auto' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Advisories</div>
          {advisories.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No active advisories</div>
            : advisories.map(a => (
                <div key={a.id} className={`f-chip ${a.severity === 'HIGH' ? 'f-chip--unsafe' : a.severity === 'MEDIUM' ? 'f-chip--caution' : 'f-chip--safe'}`}
                  style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderRadius: 8, padding: '6px 12px', maxWidth: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                </div>
              ))}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Zone carousel */}
        <div className="f-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Zones</div>
          <div ref={carouselRef} style={{ flex: 1 }}>
            {currentZone ? (
              <>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{currentZone.zoneName}</div>
                <span className={`f-chip ${RISK_CLASS[currentZone.risk?.level] ?? 'f-chip--muted'}`}>{currentZone.risk?.level}</span>
                <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  Wave {currentZone.marine?.waveHeightM ?? '—'} m · Wind {currentZone.weather?.windSpeedKmh ?? '—'} km/h
                </div>
              </>
            ) : <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No zone data</div>}
          </div>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {zones.map((_, i) => (
              <button key={i} onClick={() => { clearInterval(carouselTimer.current); advanceZone(i) }}
                style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: i === zoneIdx ? 'var(--accent-lime)' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
        </div>

        {/* Catch alerts strip */}
        <div className="f-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>My Alerts</div>
          {alertQ.isError && <div className="f-error">Failed<span className="f-error__retry" onClick={alertQ.refetch}>Retry</span></div>}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                borderBottom: '1px solid var(--hairline)', fontSize: '0.8rem' }}>
                <span>{a.species?.commonName ?? a.speciesName ?? '—'}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {a.quantityKg != null ? `${a.quantityKg} kg` : a.quantityEstimate ?? '—'}
                </span>
              </div>
            ))}
            {alerts.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No active alerts</div>}
          </div>
          <button className="f-btn f-btn--primary f-btn--sm" style={{ marginTop: 12 }} onClick={() => setPage('alerts')}>+ New Alert</button>
        </div>

        {/* Trip console */}
        <div className="f-card f-card--glass" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Trip Console</div>
          {activeTrip ? (
            <>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Departure</div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>{activeTrip.departurePoint ?? 'En route'}</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-lime)', marginBottom: 'auto' }}>
                {elapsed}
              </div>
              <button className="f-btn f-btn--danger f-btn--sm" style={{ marginTop: 16 }}>End Trip</button>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No active trip</div>
              <button className="f-btn f-btn--primary f-btn--sm" onClick={() => setPage('trips')}>Start a Trip</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Home.test.jsx 2>&1 | tail -30
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Home.jsx frontend/src/fisherman/__tests__/Home.test.jsx
git commit -m "feat(fisherman): rewrite Home page with bento layout and GSAP counters"
```

---

## Task 4: Trips Page — Timeline Redesign + Two-Step Start Modal

**Files:**
- Modify: `frontend/src/fisherman/Trips.jsx`
- Update: `frontend/src/fisherman/__tests__/Trips.test.jsx`

**Context:** Redesign using new card classes. Keep all existing API calls (`listTrips`, `startTrip`, `endTrip`, `saveChecklist`). Add a two-step modal: Step 1 = form fields, Step 2 = safety checklist. Status chip shows pulse dot for ACTIVE trips.

- [ ] **Step 1: Update the test**

Replace `frontend/src/fisherman/__tests__/Trips.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TripsPage from '../Trips'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/trips', () => ({
  listTrips: vi.fn(),
  startTrip: vi.fn(),
  endTrip: vi.fn(),
  saveChecklist: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listTrips } from '../api/trips'

const MOCK_TRIP = {
  id: 1, departurePoint: 'San Juan Port', targetArea: 'Manila Bay',
  startedAt: '2026-05-18T02:00:00Z', endedAt: null, status: 'ACTIVE',
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listTrips.mockResolvedValue([MOCK_TRIP])
})

describe('TripsPage', () => {
  it('renders trip departure point', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/San Juan Port/i)).toBeInTheDocument()
  })

  it('shows ACTIVE status chip', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/ACTIVE/i)).toBeInTheDocument()
  })

  it('shows Start New Trip button', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    expect(await screen.findByText(/Start New Trip/i)).toBeInTheDocument()
  })

  it('opens modal on Start New Trip click', async () => {
    wrap(<TripsPage setPage={vi.fn()} activeTrip={null} />)
    fireEvent.click(await screen.findByText(/Start New Trip/i))
    expect(screen.getByText(/Departure Point/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Trips.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Redesign `Trips.jsx`**

Rewrite keeping all existing `useMutation` wiring. Replace JSX structure:

- Outer wrapper: `<div className="page" style={{ padding: 24, overflowY: 'auto', height: '100%' }}>` 
- Header row: title + `<button className="f-btn f-btn--primary" onClick={() => setModal('start')}>Start New Trip</button>`
- Card list: on mount, run `gsap.from(cardEls, { opacity: 0, y: 16, stagger: 0.04, duration: 0.2 })` via `useEffect` + `ref` array
- Each trip card: `<div className="f-card" style={{ padding: 20, marginBottom: 12 }}>` containing:
  - Row: departure → target area + status chip (`<span className={`f-chip ${status === 'ACTIVE' ? 'f-chip--lime' : 'f-chip--muted'}`}>{status}</span>`) + pulse dot for ACTIVE (`<span className="pulse-dot" />`)
  - Sub-row: start time, end time or "In progress"

**Two-step Start Trip modal** (add state: `modal` = null | 'start' | 'checklist', `tripForm`, `createdTripId`):

Step 1 form fields: `departurePoint`, `targetArea`, `vesselName`, `notes` (all `<input className="f-input" />`).

On Step 1 submit: call `startTrip({ departurePoint, targetArea, vesselName, notes })`, on success set `createdTripId` and advance to `'checklist'` step.

Step 2: Render a list of safety checklist items as checkboxes. On confirm: call `saveChecklist(createdTripId, { items: checkedItems })`, close modal.

Modal wrapper:
```jsx
{modal && (
  <div className="f-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
    <div className="f-modal f-modal--wide">
      {modal === 'start' && <StartTripStep1 ... />}
      {modal === 'checklist' && <ChecklistStep2 ... />}
    </div>
  </div>
)}
```

GSAP modal entry: in `useEffect` on `modal` change, animate backdrop and panel:
```js
useEffect(() => {
  if (!modal) return
  gsap.fromTo('.f-modal-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.12 })
  gsap.fromTo('.f-modal', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' })
}, [modal])
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Trips.test.jsx 2>&1 | tail -20
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Trips.jsx frontend/src/fisherman/__tests__/Trips.test.jsx
git commit -m "feat(fisherman): redesign Trips page with dark cards and two-step start modal"
```

---

## Task 5: Catch Alerts Page — Card Grid + Create Drawer

**Files:**
- Modify: `frontend/src/fisherman/CatchAlerts.jsx`
- Create: `frontend/src/fisherman/__tests__/CatchAlerts.test.jsx`

**Context:** Card grid of alerts. Create Alert side drawer with required `speciesId` (dropdown from `fetchSpecies()`) and `expiresInHours`. Keep existing `cancelCatchAlert` mutation wiring.

- [ ] **Step 1: Write the test**

Create `frontend/src/fisherman/__tests__/CatchAlerts.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CatchAlerts from '../CatchAlerts'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/catchAlerts', () => ({
  listCatchAlerts: vi.fn(),
  createCatchAlert: vi.fn(),
  cancelCatchAlert: vi.fn(),
}))
vi.mock('../../../api/lookup', () => ({
  fetchSpecies: vi.fn().mockResolvedValue([{ id: 1, commonName: 'Bangus' }]),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listCatchAlerts } from '../api/catchAlerts'

const MOCK_ALERT = {
  id: 1, speciesName: 'Tuna', quantityKg: 12, askingPricePerKg: 280,
  status: 'ACTIVE', expiresAt: new Date(Date.now() + 3600000).toISOString(),
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listCatchAlerts.mockResolvedValue([MOCK_ALERT])
})

describe('CatchAlertsPage', () => {
  it('renders alert species name', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    expect(await screen.findByText(/Tuna/i)).toBeInTheDocument()
  })

  it('renders quantity kg', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    expect(await screen.findByText(/12 kg/i)).toBeInTheDocument()
  })

  it('shows Create Alert button', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    expect(await screen.findByText(/Create Alert/i)).toBeInTheDocument()
  })

  it('opens drawer on Create Alert click', async () => {
    wrap(<CatchAlerts setPage={vi.fn()} />)
    fireEvent.click(await screen.findByText(/Create Alert/i))
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/CatchAlerts.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Redesign `CatchAlerts.jsx`**

Keep existing `listCatchAlerts`, `createCatchAlert`, `cancelCatchAlert` calls. Replace JSX:

- Page wrapper: `<div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>`
- Header: title + `<button className="f-btn f-btn--primary">+ Create Alert</button>`
- Grid: `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>` — each alert is a `<div className="f-card" style={{ padding: 20 }}>` showing species, `quantityKg != null ? quantityKg + ' kg' : quantityEstimate`, asking price, and an ACTIVE/SOLD chip.
- GSAP card stagger on mount.
- **Drawer** (right side-panel): `fetchSpecies()` from `src/api/lookup.js` populates species dropdown. `expiresInHours` number input min=1 max=48. Optional: `quantityKg`, `landingSite`, `askingPricePerKg`, `notes`. Submit calls `createCatchAlert(body)`.
- Import `fetchSpecies` from `'../../api/lookup'` (note path: two levels up from `fisherman/`).

GSAP new card reveal in `onSuccess`:
```js
createMut.mutate(body, {
  onSuccess: () => {
    qc.invalidateQueries(['fisherman', 'catch-alerts'])
    setDrawer(false)
    // GSAP reveal applied in useEffect watching alerts array length
  }
})
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/CatchAlerts.test.jsx 2>&1 | tail -20
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/CatchAlerts.jsx frontend/src/fisherman/__tests__/CatchAlerts.test.jsx
git commit -m "feat(fisherman): redesign Catch Alerts page with card grid and create drawer"
```

---

## Task 6: Deals Page — Status Groups + Counter Proposal Modal

**Files:**
- Modify: `frontend/src/fisherman/ActiveDeals.jsx`
- Update: `frontend/src/fisherman/__tests__/ActiveDeals.test.jsx`

**Context:** Show deals from `listMyDeals()` (no status filter) grouped by all 5 statuses: NEGOTIATING, AGREED, REJECTED, EXPIRED, CANCELLED. Empty groups hidden. Counter Proposal modal: `qtyKg` + `pricePerKg` fields, calls `submitProposal(dealId, qtyKg, pricePerKg)`.

**Note on existing tests:** The current `ActiveDeals.test.jsx` tests `engageDeal`/`rejectDeal` behaviors tied to the old implementation. **Completely replace the file** with the test below — the old behavioral tests for `engageDeal` and `rejectDeal` are intentionally removed since those flows change in the redesign.

- [ ] **Step 1: Replace the test file**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ActiveDeals from '../ActiveDeals'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/deals', () => ({
  listMyDeals: vi.fn(),
  submitProposal: vi.fn(),
  acceptProposal: vi.fn(),
  rejectProposal: vi.fn(),
  cancelDeal: vi.fn(),
  getDeal: vi.fn(),
  listDealMessages: vi.fn(),
}))
vi.mock('../../components/DealChatPane', () => ({ default: () => <div data-testid="deal-chat" /> }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listMyDeals } from '../api/deals'

const MOCK_DEAL = {
  id: 1, status: 'NEGOTIATING',
  vendorName: 'Rosario Vendor',
  speciesName: 'Bangus', qtyKg: 10,
  latestProposalPricePerKg: 200,
  updatedAt: new Date().toISOString(),
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listMyDeals.mockResolvedValue([MOCK_DEAL])
})

describe('ActiveDealsPage', () => {
  it('renders vendor name', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    expect(await screen.findByText(/Rosario Vendor/i)).toBeInTheDocument()
  })

  it('shows NEGOTIATING group header', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    expect(await screen.findByText(/NEGOTIATING/i)).toBeInTheDocument()
  })

  it('does not show AGREED group when no agreed deals', async () => {
    wrap(<ActiveDeals setPage={vi.fn()} />)
    await screen.findByText(/Rosario Vendor/i)
    expect(screen.queryByText(/^AGREED$/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/ActiveDeals.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Redesign `ActiveDeals.jsx`**

Key changes:
- Fetch with `listMyDeals()` (no status arg — returns all).
- Group by status: `const groups = ['NEGOTIATING','AGREED','REJECTED','EXPIRED','CANCELLED']`. Render only groups with `deals.filter(d => d.status === g).length > 0`.
- Each group: a heading `<div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group}</div>` then the deal cards.
- Deal card: `<div className="f-card" style={{ padding: 18, marginBottom: 10, cursor: 'pointer' }} onClick={() => setActiveDeal(deal.id)}>`. Shows vendor name, species, qtyKg, latest proposal price.
- Counter proposal modal on "Counter" button: `qtyKg` + `pricePerKg` fields, submits `submitProposal(dealId, qtyKg, pricePerKg)`.
- GSAP card stagger on mount.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/ActiveDeals.test.jsx 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/ActiveDeals.jsx frontend/src/fisherman/__tests__/ActiveDeals.test.jsx
git commit -m "feat(fisherman): redesign Deals page with status groups and counter proposal modal"
```

---

## Task 7: Orders Page — Stepper Redesign

**Files:**
- Modify: `frontend/src/fisherman/Orders.jsx`
- Create: `frontend/src/fisherman/__tests__/Orders.test.jsx`

**Context:** Order rows from `listOrders()`. Inline stepper showing handoff + payment sub-steps. Confirm modals for `confirmHandoff(id)` and `confirmPayment(id)`. Keep all existing mutations.

- [ ] **Step 1: Write the test**

Create `frontend/src/fisherman/__tests__/Orders.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrdersPage from '../Orders'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/orders', () => ({
  listOrders: vi.fn(),
  confirmOrder: vi.fn(), cancelOrder: vi.fn(),
  initiateHandoff: vi.fn(), confirmHandoff: vi.fn(),
  recordPayment: vi.fn(), confirmPayment: vi.fn(),
  raiseDispute: vi.fn(), initiateOrderPayout: vi.fn(),
}))
vi.mock('../api/procurement', () => ({
  acceptOrder: vi.fn(), markReady: vi.fn(), completeOrder: vi.fn(),
  cancelOrder: vi.fn(),
}))
vi.mock('../../components/OrderCard', () => ({ default: (props) => <div data-testid="order-card">{props.order?.vendorName}</div> }))
vi.mock('../../components/Skeleton', () => ({ OrderCardSkeleton: () => <div data-testid="order-skeleton" /> }))
vi.mock('../../components/ApiError', () => ({ default: () => <div data-testid="api-error" /> }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))

import { listOrders } from '../api/orders'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listOrders.mockResolvedValue([{ id: 1, vendorName: 'Test Vendor', status: 'PENDING' }])
})

describe('OrdersPage', () => {
  it('renders order card after data loads', async () => {
    wrap(<OrdersPage setPage={vi.fn()} />)
    expect(await screen.findByTestId('order-card')).toBeInTheDocument()
  })

  it('renders vendor name in order card', async () => {
    wrap(<OrdersPage setPage={vi.fn()} />)
    expect(await screen.findByText(/Test Vendor/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Orders.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Redesign `Orders.jsx`**

**Note:** `Orders.jsx` uses the shared `<OrderCard>` component from `src/components/OrderCard.jsx`. Rather than duplicating logic, this task applies the design system via the wrapper:

- Outer wrapper: `<div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>` with `background: var(--bg-canvas)`.
- Status filter chips row: `<div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>` with filter buttons styled as `f-chip`.
- Order list: GSAP stagger on mount via `useEffect` + `ref` array.
- Each order wraps `<OrderCard>` inside a `<div className="f-card" style={{ marginBottom: 12 }}>` to apply the dark card background.
- Pass all existing mutation props to `OrderCard` unchanged.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Orders.test.jsx 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Orders.jsx frontend/src/fisherman/__tests__/Orders.test.jsx
git commit -m "feat(fisherman): redesign Orders page with dark card wrappers and stagger animation"
```

---

## Task 8: Earnings Page — 4 Stat Cards + Ledger

**Files:**
- Modify: `frontend/src/fisherman/Earnings.jsx`
- Update: `frontend/src/fisherman/__tests__/Earnings.test.jsx`

**Context:** 4 stat cards (`totalGross`, `cashCollected`, `creditOutstanding`, `orderCount`) with GSAP counter animation. Ledger rows below from `getEarningsLedger()`.

- [ ] **Step 1: Replace the test file**

**Completely replace** `frontend/src/fisherman/__tests__/Earnings.test.jsx` with the full file below (do not add snippets to the existing file):

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EarningsPage from '../Earnings'

vi.mock('gsap', () => ({
  default: {
    to: vi.fn().mockImplementation((obj, opts) => { if (opts?.onUpdate) opts.onUpdate(); return {} }),
    from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn(),
  },
}))
vi.mock('../api/earnings', () => ({
  getEarningsSummary: vi.fn(),
  getEarningsLedger: vi.fn(),
}))

import { getEarningsSummary, getEarningsLedger } from '../api/earnings'

const MOCK_SUMMARY = { totalGross: 184320, cashCollected: 142500, creditOutstanding: 41820, orderCount: 28 }
const MOCK_LEDGER = [
  { orderId: 1, date: '2026-04-23', vendorName: 'Test Vendor', speciesName: 'Grouper',
    qtyKg: 4, gross: 2160, paymentMethod: 'UTANG', status: 'SETTLED', settledAt: null },
]

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getEarningsSummary.mockResolvedValue(MOCK_SUMMARY)
  getEarningsLedger.mockResolvedValue(MOCK_LEDGER)
})

describe('EarningsPage', () => {
  it('renders "Total Gross" label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Total Gross/i)).toBeInTheDocument()
  })
  it('renders "Cash Collected" label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Cash Collected/i)).toBeInTheDocument()
  })
  it('renders "Credit Outstanding" label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Credit Outstanding/i)).toBeInTheDocument()
  })
  it('renders "Orders" stat label', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/^Orders$/i)).toBeInTheDocument()
  })
  it('renders ledger row species', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Grouper/)).toBeInTheDocument()
  })
  it('renders ledger vendor name', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Test Vendor/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Earnings.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Redesign `Earnings.jsx`**

Replace the current JSX with:

```jsx
import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'

const STATS = [
  { key: 'totalGross',        label: 'Total Gross',         prefix: '₱' },
  { key: 'cashCollected',     label: 'Cash Collected',      prefix: '₱' },
  { key: 'creditOutstanding', label: 'Credit Outstanding',  prefix: '₱' },
  { key: 'orderCount',        label: 'Orders',              prefix: ''  },
]

export default function EarningsPage() {
  const summaryQ = useQuery({ queryKey: ['fisherman', 'earnings', 'summary'], queryFn: getEarningsSummary })
  const ledgerQ  = useQuery({ queryKey: ['fisherman', 'earnings', 'ledger'],  queryFn: getEarningsLedger })

  const statRefs = useRef([])

  useEffect(() => {
    if (!summaryQ.data) return
    STATS.forEach(({ key, prefix }, i) => {
      const el = statRefs.current[i]
      if (!el) return
      const target = summaryQ.data[key] ?? 0
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target, duration: 0.8, ease: 'power2.out',
        onUpdate: () => {
          if (!el) return
          el.textContent = key === 'orderCount'
            ? String(Math.round(obj.val))
            : `${prefix}${obj.val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
      })
    })
  }, [summaryQ.data])

  const summary = summaryQ.data
  const ledger  = ledgerQ.data ?? []

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', marginBottom: 20 }}>Earnings</div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {STATS.map(({ key, label, prefix }, i) => (
          <div key={key} className="f-card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
            <div
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-lime)' }}
              ref={el => { statRefs.current[i] = el }}
            >
              {summary ? `${prefix}${key === 'orderCount' ? (summary[key] ?? 0) : (summary[key] ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Ledger */}
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 12 }}>Transactions</div>
      {ledgerQ.isError && <div className="f-error">Failed to load ledger<span className="f-error__retry" onClick={ledgerQ.refetch}>Retry</span></div>}
      <div className="f-card">
        {ledger.length === 0
          ? <div style={{ padding: 20, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>No transactions yet</div>
          : ledger.map(row => (
              <div key={row.orderId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid var(--hairline)', fontSize: '0.875rem' }}>
                <div>
                  <div>{row.speciesName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{row.vendorName} · {row.qtyKg} kg</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>
                    ₱{(row.gross ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{row.paymentMethod}</div>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Earnings.test.jsx 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Earnings.jsx frontend/src/fisherman/__tests__/Earnings.test.jsx
git commit -m "feat(fisherman): redesign Earnings page with GSAP stat counters and ledger rows"
```

---

## Task 9: Messages Page — Remove DM Mode, Deals-Only Redesign

**Files:**
- Rewrite: `frontend/src/fisherman/Messages.jsx`
- Create: `frontend/src/fisherman/__tests__/Messages.test.jsx`

**Context:** Remove the DM tab and all `getChatUsers`/`getConversation`/`mode` state. Keep deal list + `DealChatPane`. Override `--accent-soft` and `--paper-2` in the fisherman shell CSS (already done in Task 1). Unread tracking via `readLastViewed`/`writeLastViewed`.

- [ ] **Step 1: Write the test**

Create `frontend/src/fisherman/__tests__/Messages.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MessagesPage from '../Messages'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/deals', () => ({
  listMyDeals: vi.fn(),
  getDeal: vi.fn(),
  listDealMessages: vi.fn(),
  submitProposal: vi.fn(),
  acceptProposal: vi.fn(),
  rejectProposal: vi.fn(),
}))
vi.mock('../../components/DealChatPane', () => ({ default: () => <div data-testid="deal-chat-pane" /> }))
vi.mock('../../utils/dealsLocalStorage', () => ({
  readLastViewed: vi.fn().mockReturnValue(new Date(0)),
  writeLastViewed: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false }),
}))
vi.mock('../../context/StompContext', () => ({
  useStomp: vi.fn().mockReturnValue({ subscribe: vi.fn(), send: vi.fn() }),
}))

import { listMyDeals } from '../api/deals'

const MOCK_DEAL = {
  id: 1, status: 'NEGOTIATING',
  vendorName: 'Rosario',
  speciesName: 'Bangus',
  lastMessageAt: new Date().toISOString(),
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  listMyDeals.mockResolvedValue([MOCK_DEAL])
})

describe('MessagesPage', () => {
  it('renders vendor name in deal list', async () => {
    wrap(<MessagesPage />)
    expect(await screen.findByText(/Rosario/i)).toBeInTheDocument()
  })

  it('does NOT render a DM tab or contact list', async () => {
    wrap(<MessagesPage />)
    await screen.findByText(/Rosario/i)
    expect(screen.queryByText(/Direct Message/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Conversations/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Messages.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Rewrite `Messages.jsx`**

Remove: `getChatUsers`, `getConversation`, `mode`, `activeUserId`, `draft`, `localMsgs`, contact list rendering, DM send logic.

Keep: `listMyDeals`, `getDeal`, `listDealMessages`, `submitProposal`, `acceptProposal`, `rejectProposal`, `DealChatPane`, `readLastViewed`, `writeLastViewed`, STOMP subscription.

```jsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import DealChatPane from '../components/DealChatPane'
import {
  getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal, listMyDeals,
} from './api/deals'
import { readLastViewed, writeLastViewed } from '../utils/dealsLocalStorage'

const fishermanDealsApi = { getDeal, listDealMessages, submitProposal, acceptProposal, rejectProposal }

export default function MessagesPage() {
  const { user } = useAuth()
  const myId = user?.id
  const [activeDealId, setActiveDealId] = useState(null)

  const dealsQ = useQuery({
    queryKey: ['deals', 'mine'],
    queryFn: () => listMyDeals(),
  })
  const deals = dealsQ.data ?? []

  const selectDeal = (id) => {
    setActiveDealId(id)
    writeLastViewed(id)
  }

  const isUnread = (deal) => {
    if (!deal.lastMessageAt) return false
    return new Date(deal.lastMessageAt) > readLastViewed(deal.id)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Deal sidebar */}
      <div style={{ width: 280, flexShrink: 0, background: 'var(--bg-card)', borderRight: '1px solid var(--hairline)', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, borderBottom: '1px solid var(--hairline)' }}>
          Deal Conversations
        </div>
        {deals.map(deal => (
          <button
            key={deal.id}
            onClick={() => selectDeal(deal.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '14px 20px', background: 'none', border: 'none',
              borderBottom: '1px solid var(--hairline)', cursor: 'pointer', textAlign: 'left',
              boxShadow: deal.id === activeDealId ? 'inset 3px 0 0 var(--accent-lime)' : 'none',
              background: deal.id === activeDealId ? 'var(--bg-card-2)' : 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: deal.id === activeDealId ? 600 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deal.vendorName ?? 'Vendor'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {deal.speciesName ?? '—'}
              </div>
            </div>
            {isUnread(deal) && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-lime)', flexShrink: 0 }} />
            )}
          </button>
        ))}
        {deals.length === 0 && (
          <div style={{ padding: 20, color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center' }}>
            No deal conversations yet
          </div>
        )}
      </div>

      {/* Chat pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)', overflow: 'hidden' }}>
        {activeDealId
          ? <DealChatPane dealId={activeDealId} currentUserId={myId} apiClient={fishermanDealsApi} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
              Select a conversation
            </div>
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Messages.test.jsx 2>&1 | tail -20
```

Expected: Both tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Messages.jsx frontend/src/fisherman/__tests__/Messages.test.jsx
git commit -m "feat(fisherman): rewrite Messages page as deals-only conversation view"
```

---

## Task 10: Profile Page — Read-Only Fields Redesign

**Files:**
- Modify: `frontend/src/fisherman/Profile.jsx`
- Create: `frontend/src/fisherman/__tests__/Profile.test.jsx`

**Context:** `fullName` and `email` are read-only labels. Editable fields: `vesselName`, `landingSite`, `emergencyContactName`, `emergencyContactPhone`, `gcashNumber`, `mayaNumber`. Shell's `setProfileDirty` prop tracks unsaved changes. Save calls `updateProfile(body)`.

- [ ] **Step 1: Write the test**

Create `frontend/src/fisherman/__tests__/Profile.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FishermanProfilePage from '../Profile'

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), killTweensOf: vi.fn() },
}))
vi.mock('../api/profile', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}))
vi.mock('../../components/Skeleton', () => ({ CardSkeleton: () => <div data-testid="skeleton" /> }))
vi.mock('../../components/ApiError', () => ({ default: () => <div data-testid="api-error" /> }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, fullName: 'Isidro Cruz', email: 'isidro@test.com' }, loading: false }),
}))

import { getProfile } from '../api/profile'

const MOCK_PROFILE = {
  fullName: 'Isidro Cruz', email: 'isidro@test.com',
  vesselName: 'MV Dagat', landingSite: 'San Juan Port',
  emergencyContactName: null, emergencyContactPhone: null,
  gcashNumber: null, mayaNumber: null,
}

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getProfile.mockResolvedValue(MOCK_PROFILE)
})

describe('FishermanProfilePage', () => {
  it('displays fullName as read-only text', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    expect(await screen.findByText(/Isidro Cruz/i)).toBeInTheDocument()
  })

  it('email is NOT in an editable input', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    await screen.findByText(/Isidro Cruz/i)
    const emailInput = screen.queryByDisplayValue(/isidro@test\.com/i)
    expect(emailInput?.tagName?.toLowerCase()).not.toBe('input')
  })

  it('renders vesselName in an input', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    expect(await screen.findByDisplayValue(/MV Dagat/i)).toBeInTheDocument()
  })

  it('Save Profile button exists', async () => {
    wrap(<FishermanProfilePage setPage={vi.fn()} setProfileDirty={vi.fn()} />)
    expect(await screen.findByText(/Save Profile/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Profile.test.jsx 2>&1 | tail -20
```

- [ ] **Step 3: Redesign `Profile.jsx`**

Keep existing `getProfile`/`updateProfile`/`useMutation` logic. Replace JSX:

- Remove `walletModal` state (the separate wallet modal — inline the GCash/Maya fields directly).
- `fullName` and `email`: render as plain `<div>` labels, not `<input>`.
- Editable fields: wrap each in `<div className="f-field"><label className="f-label">{label}</label><input className="f-input" ref={fieldRef} onFocus={animateFocus} onBlur={animateBlur} /></div>`.
- GSAP field focus: 
  ```js
  const animateFocus = (e) => gsap.to(e.target, { boxShadow: '0 0 0 2px rgba(163,230,53,0.4)', duration: 0.15 })
  const animateBlur  = (e) => gsap.to(e.target, { boxShadow: '0 0 0 2px transparent',         duration: 0.15 })
  ```
- On any field change: call `setProfileDirty(true)` (prop from shell).
- On save success: call `setProfileDirty(false)`, show lime toast `<div className="f-toast">Profile updated</div>` for 2.2s.
- Form layout: two-column grid of fields: vesselName, landingSite, emergencyContactName, emergencyContactPhone, gcashNumber, mayaNumber.
- Save button: `<button className="f-btn f-btn--primary">Save Profile</button>`.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/Profile.test.jsx 2>&1 | tail -20
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Profile.jsx frontend/src/fisherman/__tests__/Profile.test.jsx
git commit -m "feat(fisherman): redesign Profile page with read-only identity fields and GSAP focus"
```

---

## Task 11: Full Test Suite + Visual Smoke Check

**Files:** No new files — run all tests and do a browser check.

- [ ] **Step 1: Run all fisherman tests**

```bash
cd frontend && npm test -- --reporter=verbose src/fisherman/__tests__/ 2>&1 | tail -40
```

Expected: All tests pass, 0 failures.

- [ ] **Step 2: Run full frontend test suite**

```bash
cd frontend && npm test 2>&1 | tail -20
```

Expected: All existing tests still pass — no regressions.

- [ ] **Step 3: Start dev server and smoke-check each page**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`, log in as a fisherman, and verify each page:
- [ ] Rail collapses to 76px on mouse leave, expands to 256px on hover — labels animate in
- [ ] Home bento renders all 5 cards; no placeholder text visible; zone carousel advances
- [ ] Trips page shows trip cards with status chips; "Start New Trip" opens two-step modal
- [ ] Catch Alerts shows alert grid; "Create Alert" opens drawer with species dropdown and hours field
- [ ] Deals shows status-grouped cards; no empty group headers visible
- [ ] Orders shows order rows wrapped in dark cards
- [ ] Earnings shows 4 stat cards labeled "Total Gross", "Cash Collected", "Credit Outstanding", "Orders"
- [ ] Messages shows deal list on left, no DM tab; selecting a deal loads DealChatPane
- [ ] Profile shows fullName/email as plain text, vesselName in editable input

- [ ] **Step 4: Final commit**

Stage only the files modified by this plan (do not use `git add -A` — verify what's staged first):

```bash
git add \
  frontend/src/fisherman/fisherman-shell.css \
  frontend/src/fisherman/FishermanDashboard.jsx \
  frontend/src/fisherman/Home.jsx \
  frontend/src/fisherman/Trips.jsx \
  frontend/src/fisherman/CatchAlerts.jsx \
  frontend/src/fisherman/ActiveDeals.jsx \
  frontend/src/fisherman/Orders.jsx \
  frontend/src/fisherman/Earnings.jsx \
  frontend/src/fisherman/Messages.jsx \
  frontend/src/fisherman/Profile.jsx \
  frontend/src/fisherman/__tests__/FishermanDashboard.test.jsx \
  frontend/src/fisherman/__tests__/Home.test.jsx \
  frontend/src/fisherman/__tests__/Trips.test.jsx \
  frontend/src/fisherman/__tests__/CatchAlerts.test.jsx \
  frontend/src/fisherman/__tests__/ActiveDeals.test.jsx \
  frontend/src/fisherman/__tests__/Orders.test.jsx \
  frontend/src/fisherman/__tests__/Earnings.test.jsx \
  frontend/src/fisherman/__tests__/Messages.test.jsx \
  frontend/src/fisherman/__tests__/Profile.test.jsx \
  frontend/package.json \
  frontend/package-lock.json
git commit -m "feat(fisherman): complete dashboard redesign — all 8 pages + shell"
```
