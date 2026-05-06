# Phase 0 — Refactor & Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `BuyerDashboard.jsx` (3,358 lines) into per-route files under `frontend/src/buyer/`; scaffold `frontend/src/vendor/` with empty per-route files; wire routes in `App.jsx`. **No behavior changes** for buyer; vendor pages render placeholders.

**Architecture:** Move-only refactor. Each top-level `*View` function in `BuyerDashboard.jsx` becomes a file in `frontend/src/buyer/`. Shared subcomponents (modals, layout pieces, helpers) move to `frontend/src/buyer/components/` and `frontend/src/buyer/utils/`. Buyer route mounting moves into `frontend/src/buyer/BuyerDashboard.jsx` (now a thin router). Vendor scaffolding mirrors the structure with empty pages.

**Tech Stack:** React 18, Vite, react-router-dom v6, Vitest + RTL, ESLint.

**Spec reference:** `docs/superpowers/specs/2026-05-05-vendor-modernization-design.md` §5.5, §9 Phase 0.

---

## File Structure

### Buyer split — `frontend/src/buyer/`

| File | Source in `BuyerDashboard.jsx` |
|---|---|
| `BuyerDashboard.jsx` (thin router) | `function BuyerDashboard` + `<Routes>` block |
| `BuyerLayout.jsx` | `function BuyerLayout`, `Rail`, `Topbar`, `PAGE_LABELS` |
| `Home.jsx` | `function DashboardView` |
| `Marketplace.jsx` | `function BrowseView` |
| `ListingDetail.jsx` | `function ListingDetailView`, `function VendorStorefrontView` (the latter renamed and stays here for now — note: spec Phase 5 will replace this with public shop page) |
| `Cart.jsx` | `function CartView` |
| `Checkout.jsx` | `function CheckoutView`, `function InstantCheckoutView` |
| `Orders.jsx` | `function OrdersView` |
| `Favorites.jsx` | `function SavedVendorsView` |
| `Profile.jsx` | `function ProfileView` |
| `PublicShop.jsx` | New file — placeholder body returning `<div>Coming in Phase 5</div>` |
| `components/OrderModal.jsx` | `function OrderModal`, `useEscapeToClose` (shared hook lives here) |
| `components/ReviewModal.jsx` | `function ReviewModal`, `function StarPicker` |
| `components/OrderTimelineModal.jsx` | `function OrderTimelineModal`, `STATUS_META` |
| `components/FavoriteHeart.jsx` | `function FavoriteHeart`, `function SavedCountBadge` |
| `components/ImageUpload.jsx` | `function ImageUpload` |
| `components/NotificationsBell.jsx` | `function NotificationsBell` |
| `components/MessagesRoute.jsx` | `function MessagesRoute` |
| `utils/format.js` | `fmt`, `fmtPrice`, `fmtDateTime`, `timeAgo` |

### Vendor scaffold — `frontend/src/vendor/`

Each placeholder is `export default function PageName() { return <div>Vendor: PageName (Phase N)</div> }`.

| File | Phase that fills it |
|---|---|
| `VendorDashboard.jsx` (thin router) | Phase 0 (this plan) |
| `VendorLayout.jsx` | Phase 0 (sidebar shell, no features) |
| `Home.jsx` | Phase 6 |
| `StorefrontEditor.jsx` | Phase 1 |
| `OrdersInbox.jsx` | Phase 2 |
| `ProcurementFeed.jsx` | Phase 3 |
| `ProcurementCart.jsx` | Phase 3 |
| `ProcurementOrders.jsx` | Phase 3 |
| `Inventory.jsx` | Phase 1 |
| `Watchlist.jsx` | Phase 4 |
| `ShopProfile.jsx` | Phase 5 |
| `Analytics.jsx` | Phase 6 |
| `Reviews.jsx` | Phase 5 |
| `Payouts.jsx` | Phase 6 |
| `hooks/usePushNotifications.js` | Phase 4 |
| `hooks/useVendorPolling.js` | Phase 2 |

### Modified files

- `frontend/src/App.jsx` — wrap VENDOR branch in `BrowserRouter` (mirroring BUYER); replace `<VendorDashboard ...>` import to use new `vendor/VendorDashboard.jsx`.
- `frontend/src/VendorDashboard.jsx` — **moved verbatim** to `frontend/src/vendor/legacy/VendorDashboard.legacy.jsx` and kept temporarily as an unused-import-free reference until vendor pages take over (Phase 1+ replaces it). For Phase 0, the new `vendor/VendorDashboard.jsx` thin router is mounted instead.
- `frontend/src/BuyerDashboard.jsx` — **deleted** after content moves to `frontend/src/buyer/`. The new entry point is `frontend/src/buyer/BuyerDashboard.jsx`.

---

## Task 1: Worktree + branch + baseline

**Files:** none (git operations).

- [ ] **Step 1: Verify clean working tree**

Run: `git status`
Expected: clean.

- [ ] **Step 2: Create branch**

Run: `git checkout -b modern_vendor_phase0`
Expected: branch switched.

- [ ] **Step 3: Run baseline frontend tests / lint / build**

Run: `cd frontend && npm install && npm run lint && npm run build`
Expected: passes (record any pre-existing warnings; we will not introduce new ones).

- [ ] **Step 4: Commit baseline tag (no changes)**

Just record current head: `git rev-parse HEAD > /tmp/phase0-baseline.txt`. Skip if not desired.

---

## Task 2: Create `frontend/src/buyer/utils/format.js`

**Files:** Create `frontend/src/buyer/utils/format.js`.

- [ ] **Step 1: Create the file**

```js
export function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtPrice(p) {
  if (p == null) return '—'
  return `₱${Number(p).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgo(dt) {
  if (!dt) return ''
  const diffMin = Math.floor((Date.now() - new Date(dt).getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}
```

> Source: copy the bodies of `fmt`, `fmtPrice`, `fmtDateTime`, `timeAgo` from `frontend/src/BuyerDashboard.jsx`. Keep behavior identical.

- [ ] **Step 2: Verify**

Run: `cd frontend && npx vitest run --reporter=verbose 2>&1 | head -40` (no tests yet for this file — just confirm import compiles via build later).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/buyer/utils/format.js
git commit -m "refactor(buyer): extract format utils to buyer/utils/format.js"
```

---

## Task 3: Move shared modals + components to `frontend/src/buyer/components/`

**Files:** Create one file per component listed in File Structure above.

- [ ] **Step 1: For each component (`OrderModal`, `ReviewModal`, `OrderTimelineModal`, `FavoriteHeart`, `ImageUpload`, `NotificationsBell`, `MessagesRoute`):**
  1. Create `frontend/src/buyer/components/<Name>.jsx`.
  2. Copy the function body and any helper it owns (e.g., `useEscapeToClose` lives in `OrderModal.jsx`; `StarPicker` in `ReviewModal.jsx`; `STATUS_META` in `OrderTimelineModal.jsx`; `SavedCountBadge` in `FavoriteHeart.jsx`).
  3. Replace inlined helpers (`fmt`, `fmtPrice`, etc.) with `import { fmt, fmtPrice } from '../utils/format'`.
  4. Default-export the main component; named-export sub-helpers if used elsewhere.
  5. Preserve all CSS class names, prop signatures, and behavior verbatim.

- [ ] **Step 2: Run lint after each batch of two files**

Run: `cd frontend && npm run lint -- src/buyer`
Expected: zero errors (warnings allowed if pre-existing pattern).

- [ ] **Step 3: Commit per logical batch (or one commit at the end)**

```bash
git add frontend/src/buyer/components/
git commit -m "refactor(buyer): extract shared modals + components to buyer/components/"
```

---

## Task 4: Move each `*View` function to a per-route file

**Files:** Create one file per row in the buyer split table (excluding components/utils).

- [ ] **Step 1: For each route file (`Home.jsx`, `Marketplace.jsx`, `ListingDetail.jsx`, `Cart.jsx`, `Checkout.jsx`, `Orders.jsx`, `Favorites.jsx`, `Profile.jsx`):**
  1. Create the file under `frontend/src/buyer/`.
  2. Copy the corresponding `*View` function body from `BuyerDashboard.jsx`.
  3. Update imports: components from `./components/<Name>`, utils from `./utils/format`, contexts from `../context/...`, API from `../api`.
  4. Default-export.
  5. Verify no inlined helpers remain — extract any straggler to `utils/format.js`.

- [ ] **Step 2: Create `BuyerLayout.jsx`**

Move `BuyerLayout`, `Rail`, `Topbar`, `PAGE_LABELS` to `frontend/src/buyer/BuyerLayout.jsx`. Default-export `BuyerLayout`.

- [ ] **Step 3: Create `PublicShop.jsx` placeholder**

```jsx
export default function PublicShop() {
  return <div style={{ padding: 24 }}>Public shop page — coming in Phase 5.</div>
}
```

- [ ] **Step 4: Build to catch missing imports**

Run: `cd frontend && npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/buyer/
git commit -m "refactor(buyer): split BuyerDashboard.jsx views into per-route files"
```

---

## Task 5: Replace `BuyerDashboard.jsx` with thin router

**Files:** Create `frontend/src/buyer/BuyerDashboard.jsx`. Delete `frontend/src/BuyerDashboard.jsx`.

- [ ] **Step 1: Create the new entry**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import BuyerLayout from './BuyerLayout'
import Home from './Home'
import Marketplace from './Marketplace'
import ListingDetail from './ListingDetail'
import Cart from './Cart'
import Checkout from './Checkout'
import Orders from './Orders'
import Favorites from './Favorites'
import Profile from './Profile'
import PublicShop from './PublicShop'
import MessagesRoute from './components/MessagesRoute'

export default function BuyerDashboard({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/shop/:vendorIdOrSlug" element={<PublicShop />} />
      <Route path="/" element={<BuyerLayout user={user} onLogout={onLogout} />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Home user={user} />} />
        <Route path="marketplace" element={<Marketplace user={user} />} />
        <Route path="marketplace/:listingId" element={<ListingDetail user={user} />} />
        <Route path="cart" element={<Cart user={user} />} />
        <Route path="checkout" element={<Checkout user={user} />} />
        <Route path="checkout/instant" element={<Checkout user={user} instant />} />
        <Route path="orders" element={<Orders user={user} />} />
        <Route path="favorites" element={<Favorites user={user} />} />
        <Route path="messages/*" element={<MessagesRoute user={user} />} />
        <Route path="profile" element={<Profile user={user} />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
    </Routes>
  )
}
```

> If the original `BuyerDashboard.jsx` had additional routes (saved/quick-order/etc.), copy those route lines exactly. Verify by diffing the original `<Routes>` block.

- [ ] **Step 2: Delete the old file**

```bash
git rm frontend/src/BuyerDashboard.jsx
```

- [ ] **Step 3: Update import in `frontend/src/App.jsx`**

Change `import BuyerDashboard from './BuyerDashboard'` to `import BuyerDashboard from './buyer/BuyerDashboard'`.

- [ ] **Step 4: Build**

Run: `cd frontend && npm run build`
Expected: success.

- [ ] **Step 5: Manual smoke test**

Run: `cd frontend && npm run dev` and log in as a BUYER demo user (V25 seed). Visit each route: `/home`, `/marketplace`, click a listing, `/cart`, `/checkout`, `/orders`, `/favorites`, `/profile`. Verify no behavioral regression vs pre-refactor.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/buyer/BuyerDashboard.jsx
git commit -m "refactor(buyer): mount buyer routes via buyer/BuyerDashboard.jsx"
```

---

## Task 6: Run existing buyer tests; fix imports only

**Files:** any `*.test.{js,jsx}` under `frontend/src/` referencing the old paths.

- [ ] **Step 1: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: only failures should be import-path mismatches (e.g., tests importing from `'../BuyerDashboard'`). Note: if there are no buyer tests, this task is verification only.

- [ ] **Step 2: Update imports**

Replace `from '../BuyerDashboard'` (or relative variants) with the appropriate new path. **Do NOT change test assertions.**

- [ ] **Step 3: Re-run**

Run: `cd frontend && npx vitest run`
Expected: same number of passing tests as the baseline (Task 1).

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "test(buyer): update import paths after BuyerDashboard split"
```

---

## Task 7: Scaffold `frontend/src/vendor/`

**Files:** Create all files in the vendor scaffold table.

- [ ] **Step 1: Create empty placeholder per page**

For each page in the scaffold list, create:

```jsx
export default function <PageName>() {
  return <div style={{ padding: 24 }}>Vendor: <PageName /> — coming in Phase <N>.</div>
}
```

- [ ] **Step 2: Create `VendorLayout.jsx`**

Minimal sidebar shell, no behavior:

```jsx
import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: 'home',         label: 'Home' },
  { to: 'storefront',   label: 'Storefront' },
  { to: 'orders',       label: 'Orders' },
  { to: 'procurement',  label: 'Procurement' },
  { to: 'inventory',    label: 'Inventory' },
  { to: 'watchlist',    label: 'Watchlist' },
  { to: 'shop-profile', label: 'Shop profile' },
  { to: 'analytics',    label: 'Analytics' },
  { to: 'reviews',      label: 'Reviews' },
  { to: 'payouts',      label: 'Payouts' },
]

export default function VendorLayout({ user, onLogout }) {
  return (
    <div className="vendor-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, padding: 16, borderRight: '1px solid #eee' }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>{user?.fullName || 'Vendor'}</div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
            display: 'block', padding: '8px 12px', borderRadius: 6,
            background: isActive ? '#eef' : 'transparent', textDecoration: 'none', color: '#222',
          })}>{n.label}</NavLink>
        ))}
        <button onClick={onLogout} style={{ marginTop: 24 }}>Log out</button>
      </nav>
      <main style={{ flex: 1 }}><Outlet /></main>
    </div>
  )
}
```

- [ ] **Step 3: Create `VendorDashboard.jsx` thin router**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import VendorLayout from './VendorLayout'
import Home from './Home'
import StorefrontEditor from './StorefrontEditor'
import OrdersInbox from './OrdersInbox'
import ProcurementFeed from './ProcurementFeed'
import ProcurementCart from './ProcurementCart'
import ProcurementOrders from './ProcurementOrders'
import Inventory from './Inventory'
import Watchlist from './Watchlist'
import ShopProfile from './ShopProfile'
import Analytics from './Analytics'
import Reviews from './Reviews'
import Payouts from './Payouts'

export default function VendorDashboard({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/" element={<VendorLayout user={user} onLogout={onLogout} />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home"           element={<Home />} />
        <Route path="storefront"     element={<StorefrontEditor />} />
        <Route path="orders"         element={<OrdersInbox />} />
        <Route path="procurement"    element={<ProcurementFeed />} />
        <Route path="procurement/cart"   element={<ProcurementCart />} />
        <Route path="procurement/orders" element={<ProcurementOrders />} />
        <Route path="inventory"      element={<Inventory />} />
        <Route path="watchlist"      element={<Watchlist />} />
        <Route path="shop-profile"   element={<ShopProfile />} />
        <Route path="analytics"      element={<Analytics />} />
        <Route path="reviews"        element={<Reviews />} />
        <Route path="payouts"        element={<Payouts />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 4: Update `App.jsx` for VENDOR branch**

Change the VENDOR branch from `<VendorDashboard user={user} ...>` to wrap in `<BrowserRouter>` (mirror BUYER), and import from `'./vendor/VendorDashboard'`.

```jsx
if (user.role === 'VENDOR') {
  return (
    <>
      <BrowserRouter>
        <VendorDashboard user={user} onLogout={logout} />
      </BrowserRouter>
      <ThemeToggle />
    </>
  )
}
```

- [ ] **Step 5: Move legacy vendor file**

```bash
mkdir -p frontend/src/vendor/legacy
git mv frontend/src/VendorDashboard.jsx frontend/src/vendor/legacy/VendorDashboard.legacy.jsx
```

Then change the import in `App.jsx` to point at the new vendor router (already done in Step 4 — just confirm). The legacy file is no longer referenced from anywhere; it stays as a reference until Phase 1 starts pulling pieces out.

- [ ] **Step 6: Build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: success.

- [ ] **Step 7: Manual smoke**

Run: `npm run dev`. Log in as a VENDOR demo user. Confirm: sidebar renders, each nav link navigates to a placeholder body without console errors, `/vendor/home` is the default.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/vendor frontend/src/App.jsx
git commit -m "feat(vendor): scaffold frontend/src/vendor/ with empty per-route pages"
```

---

## Task 8: Final verification

- [ ] **Step 1: Diff check — no behavior changes for buyer**

Run: `git diff main -- frontend/src/buyer | head -200` and confirm changes are pure moves (function bodies are byte-identical to their pre-split source).

- [ ] **Step 2: Run all tests**

Run: `cd frontend && npx vitest run`
Expected: same passing count as Task 1 baseline.

- [ ] **Step 3: Run lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: success, no new warnings.

- [ ] **Step 4: Manual QA against `docs/superpowers/specs/2026-05-05-vendor-modernization-design.md` §8.3 item 5**

Buyer regression: full buyer flow (browse → cart → checkout → orders) works. Re-confirm.

---

## Exit criteria (matches spec §9 Phase 0)

- ✅ Existing buyer tests pass with no new tests added.
- ✅ Vendor routes return placeholder pages.
- ✅ Clean diff — no behavior changes.

## Notes for the executor

- **Preserve byte-identical function bodies** during the split. The whole point of Phase 0 is provable absence of behavior change. If you find yourself wanting to "improve" a function during the move — STOP. Make a note for a future cleanup PR; do not change it here.
- **Do not introduce new dependencies.** No new npm packages.
- **CSS class names stay the same.** The existing `buyer.css`, `design-system.css`, `handoff.css` continue to apply.
- **Cart/Favorites contexts and `BrowserRouter` wrapping in `App.jsx`** stays unchanged for the BUYER branch. Only the import path changes.
