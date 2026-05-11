# Plan 3: Vendor Role Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all vendor role pages to real backend API calls — replacing every inline mock data constant. All `vendor/api/*.js` modules already exist; this plan wires the pages to them using React Query.

**Architecture:** Each vendor page follows the same pattern: remove mock constants → `useQuery` / `useMutation` → `Skeleton` on loading → `ApiError` on error. Vendor orders uses `OrderCard` from Plan 2 for Type A catch-alert orders, and the inline vendor-specific card for Type B storefront orders (already done in Plan 2).

**Tech Stack:** React 18, @tanstack/react-query v5, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-05-11-mock-to-real-data-integration-design.md` — Sections D9–D14

**Prerequisite:** Plan 1 (infrastructure) and Plan 2 (OrderCard, modals) must be complete.

---

## File Map

| Action | File |
|---|---|
| Modify | `frontend/src/vendor/Home.jsx` |
| Modify | `frontend/src/vendor/Inventory.jsx` |
| Modify | `frontend/src/vendor/StorefrontEditor.jsx` |
| Modify | `frontend/src/vendor/ProcurementFeed.jsx` |
| Modify | `frontend/src/vendor/ProcurementCart.jsx` |
| Modify | `frontend/src/vendor/ProcurementOrders.jsx` |
| Modify | `frontend/src/vendor/Analytics.jsx` |
| Modify | `frontend/src/vendor/Reviews.jsx` |
| Modify | `frontend/src/vendor/Payouts.jsx` |
| Modify | `frontend/src/vendor/Watchlist.jsx` |
| Modify | `frontend/src/vendor/ShopProfile.jsx` |
| Modify | `frontend/src/vendor/__tests__/Home.test.jsx` |
| Modify | `frontend/src/vendor/__tests__/Analytics.test.jsx` |
| Modify | `frontend/src/vendor/__tests__/Payouts.test.jsx` |

---

### Task 1: Wire vendor/Home.jsx

**Files:**
- Modify: `frontend/src/vendor/Home.jsx`
- Modify: `frontend/src/vendor/__tests__/Home.test.jsx`

The existing `Home.test.jsx` mocks `useVendorPolling`. Update it to mock `getVendorHome` and use `QueryClientProvider` instead.

- [ ] **Step 1: Update Home.test.jsx**

```jsx
// frontend/src/vendor/__tests__/Home.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'

vi.mock('../api/home', () => ({ getVendorHome: vi.fn() }))
import { getVendorHome } from '../api/home'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
}

const MOCK = {
  todayRevenue: 24800,
  openOrders: { new: 3, preparing: 4, ready: 2 },
  unreadNotifications: 4,
  lowStock: [{ speciesName: 'Yellowfin Tuna', remainingKg: 4.2 }],
  recentMatchedCatchAlerts: [{ id: 1, speciesName: 'Grouper', fishermanName: 'Ramiro', quantityKg: 3.2 }],
}

beforeEach(() => { vi.clearAllMocks(); getVendorHome.mockResolvedValue(MOCK) })

describe('Vendor Home', () => {
  it('renders revenue after load', async () => {
    wrap(<Home />)
    expect(await screen.findByText(/24,800/)).toBeInTheDocument()
  })
  it('renders low stock species', async () => {
    wrap(<Home />)
    expect(await screen.findByText(/Yellowfin Tuna/)).toBeInTheDocument()
  })
  it('renders loading skeleton', () => {
    getVendorHome.mockReturnValue(new Promise(() => {}))
    wrap(<Home />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })
  it('renders error', async () => {
    getVendorHome.mockRejectedValue(new Error('Server down'))
    wrap(<Home />)
    expect(await screen.findByText(/Server down/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && npx vitest run src/vendor/__tests__/Home.test.jsx
```

- [ ] **Step 3: Wire Home.jsx**

Open `frontend/src/vendor/Home.jsx`. Remove `const VENDOR_USER = {...}` and `const V_HOME = {...}` blocks. Remove `useVendorPolling` import. Add:

```jsx
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getVendorHome } from './api/home'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data reads:

```jsx
const { user } = useAuth()
const homeQ = useQuery({ queryKey: ['vendor', 'home'], queryFn: getVendorHome, refetchInterval: 60_000 })

if (homeQ.isLoading) return <div className="page"><StatTileSkeleton /><StatTileSkeleton /><TableRowSkeleton /></div>
if (homeQ.error) return <div className="page"><ApiError error={homeQ.error} onRetry={homeQ.refetch} /></div>

const h = homeQ.data ?? {}
const firstName = user?.fullName?.split(' ')[0] ?? 'Vendor'
```

Replace all `V_HOME.*` references with `h.*` and `VENDOR_USER.*` with `user.*`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/vendor/__tests__/Home.test.jsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/Home.jsx frontend/src/vendor/__tests__/Home.test.jsx
git commit -m "feat(vendor): wire Home.jsx to vendor home API"
```

---

### Task 2: Wire Inventory.jsx and StorefrontEditor.jsx

**Files:**
- Modify: `frontend/src/vendor/Inventory.jsx`
- Modify: `frontend/src/vendor/StorefrontEditor.jsx`

Both use `vendor/api/inventory.js` and `vendor/api/storefront.js` which already exist.

- [ ] **Step 1: Wire Inventory.jsx**

Open `frontend/src/vendor/Inventory.jsx`. Remove all inline mock blocks. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listInventoryLots, recordAdjustment, getAvailableKg } from './api/inventory'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import CrudModal from '../components/modals/CrudModal'
```

Replace data reads:

```jsx
const qc = useQueryClient()
const lotsQ    = useQuery({ queryKey: ['vendor', 'inventory'], queryFn: listInventoryLots })
const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

const adjustMut = useMutation({
  mutationFn: ({ speciesId, deltaKg, notes }) => recordAdjustment({ speciesId, deltaKg, notes }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] }),
})

if (lotsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
if (lotsQ.error) return <div className="page"><ApiError error={lotsQ.error} onRetry={lotsQ.refetch} /></div>

const lots    = lotsQ.data ?? []
const species = speciesQ.data ?? []
```

For the "Record Adjustment" action, open a `CrudModal` with a form (speciesId select, deltaKg input, notes textarea) and call `adjustMut.mutate(...)` on confirm.

- [ ] **Step 2: Wire StorefrontEditor.jsx**

Open `frontend/src/vendor/StorefrontEditor.jsx`. Remove all inline mock blocks. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listStorefrontListings, createStorefrontListing, updateStorefrontListing,
  deleteStorefrontListing, publishListing, unpublishListing,
} from './api/storefront'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import CrudModal from '../components/modals/CrudModal'
```

Replace data reads:

```jsx
const qc      = useQueryClient()
const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listStorefrontListings })
const speciesQ  = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })
const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })

const createMut  = useMutation({ mutationFn: createStorefrontListing,  onSuccess: invalidate })
const updateMut  = useMutation({ mutationFn: ({ id, ...body }) => updateStorefrontListing(id, body), onSuccess: invalidate })
const deleteMut  = useMutation({ mutationFn: deleteStorefrontListing,   onSuccess: invalidate })
const publishMut = useMutation({ mutationFn: publishListing,            onSuccess: invalidate })
const unpubMut   = useMutation({ mutationFn: unpublishListing,          onSuccess: invalidate })

if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
const listings = listingsQ.data ?? []
```

Each listing row gets Edit / Delete / Publish-toggle action buttons wired to their respective mutations. Edit/Create open a `CrudModal` with a form.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/Inventory.jsx frontend/src/vendor/StorefrontEditor.jsx
git commit -m "feat(vendor): wire Inventory and StorefrontEditor to real API"
```

---

### Task 3: Wire vendor procurement pages

**Files:**
- Modify: `frontend/src/vendor/ProcurementFeed.jsx`
- Modify: `frontend/src/vendor/ProcurementCart.jsx`
- Modify: `frontend/src/vendor/ProcurementOrders.jsx`

All use `vendor/api/procurement.js` which already exists.

- [ ] **Step 1: Wire ProcurementFeed.jsx**

Open `frontend/src/vendor/ProcurementFeed.jsx`. Remove all inline mock blocks. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { browseCatchAlerts, addToCart } from './api/procurement'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data reads:

```jsx
const qc = useQueryClient()
const alertsQ  = useQuery({ queryKey: ['vendor', 'catchAlerts'], queryFn: browseCatchAlerts })
const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

const addMut = useMutation({
  mutationFn: ({ alertId, qtyKg, notes }) => addToCart({ catchAlertId: alertId, qtyKg, notes }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'cart'] }),
})

if (alertsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
if (alertsQ.error) return <div className="page"><ApiError error={alertsQ.error} onRetry={alertsQ.refetch} /></div>
const alerts  = alertsQ.data ?? []
const species = speciesQ.data ?? []
```

- [ ] **Step 2: Wire ProcurementCart.jsx**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCart, updateCartItem, removeCartItem, checkoutCart } from './api/procurement'
```

```jsx
const qc = useQueryClient()
const cartQ = useQuery({ queryKey: ['vendor', 'cart'], queryFn: getCart })
const checkoutMut = useMutation({
  mutationFn: checkoutCart,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['vendor', 'cart'] })
    qc.invalidateQueries({ queryKey: ['vendor', 'procurementOrders'] })
  },
})
```

- [ ] **Step 3: Wire ProcurementOrders.jsx**

Vendor procurement orders are Type A catch-alert orders where the vendor is the buyer. Use `OrderCard` with `currentRole="VENDOR"` and `orderType="A"` so the correct action buttons appear (Initiate Handoff, Record Payment).

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listProcurementOrdersAsVendor } from './api/procurement'
import {
  initiateHandoff, confirmHandoff,
  recordPayment, cancelOrder, raiseDispute,
} from './api/orders'
import OrderCard from '../components/OrderCard'
import { OrderCardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const qc = useQueryClient()
const ordersQ = useQuery({ queryKey: ['vendor', 'procurementOrders'], queryFn: listProcurementOrdersAsVendor })

const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'procurementOrders'] })

const mutations = {
  initiateHandoff: (id, body) => initiateHandoff(id, body).then(invalidate),
  confirmHandoff:  (id)       => confirmHandoff(id).then(invalidate),
  recordPayment:   (id, body) => recordPayment(id, body).then(invalidate),
  cancelOrder:     (id, r)    => cancelOrder(id, r).then(invalidate),
  raiseDispute:    (id, body) => raiseDispute(id, body).then(invalidate),
}

if (ordersQ.isLoading) return <div className="page"><OrderCardSkeleton /><OrderCardSkeleton /></div>
if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>
const orders = ordersQ.data ?? []
```

Render each order with the shared `OrderCard`:

```jsx
{orders.length === 0 && <p className="empty-state">No procurement orders yet.</p>}
{orders.map(order => (
  <OrderCard
    key={order.id}
    order={order}
    currentRole="VENDOR"
    orderType="A"
    mutations={mutations}
  />
))}
```

Note: `vendor/api/orders.js` must export `initiateHandoff`, `confirmHandoff`, `recordPayment`, `cancelOrder`, `raiseDispute` — these are the same paths as `fisherman/api/orders.js`. If `vendor/api/orders.js` doesn't have them yet, add them (same function bodies).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/vendor/ProcurementFeed.jsx frontend/src/vendor/ProcurementCart.jsx frontend/src/vendor/ProcurementOrders.jsx
git commit -m "feat(vendor): wire procurement feed, cart, and orders to real API"
```

---

### Task 4: Wire Analytics.jsx

**Files:**
- Modify: `frontend/src/vendor/Analytics.jsx`
- Modify: `frontend/src/vendor/__tests__/Analytics.test.jsx`

- [ ] **Step 1: Update Analytics.test.jsx**

```jsx
// frontend/src/vendor/__tests__/Analytics.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Analytics from '../Analytics'

vi.mock('../api/analytics', () => ({
  getSalesSummary: vi.fn(),
  getRevenueBySpecies: vi.fn(),
  getProcurementSpend: vi.fn(),
}))

import { getSalesSummary, getRevenueBySpecies, getProcurementSpend } from '../api/analytics'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getSalesSummary.mockResolvedValue({ totalRevenue: 184320, ordersCount: 28, avgOrderValue: 6583 })
  getRevenueBySpecies.mockResolvedValue([{ speciesName: 'Yellowfin Tuna', revenue: 84000 }])
  getProcurementSpend.mockResolvedValue({ totalSpend: 42000, ordersCount: 12 })
})

describe('Analytics', () => {
  it('renders total revenue', async () => {
    wrap(<Analytics />)
    expect(await screen.findByText(/184,320/)).toBeInTheDocument()
  })
  it('renders species revenue row', async () => {
    wrap(<Analytics />)
    expect(await screen.findByText(/Yellowfin Tuna/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/vendor/__tests__/Analytics.test.jsx
```

- [ ] **Step 3: Wire Analytics.jsx**

Open `frontend/src/vendor/Analytics.jsx`. Remove all mock blocks. Add:

```jsx
import { useQuery } from '@tanstack/react-query'
import { getSalesSummary, getRevenueBySpecies, getProcurementSpend, getRepeatBuyers } from './api/analytics'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const [range, setRange] = useState('30')
const now  = new Date()
const to   = now.toISOString().split('T')[0]
const from = new Date(now - range * 86_400_000).toISOString().split('T')[0]

const summaryQ  = useQuery({ queryKey: ['vendor', 'analytics', 'summary', range],  queryFn: () => getSalesSummary(from, to) })
const speciesQ  = useQuery({ queryKey: ['vendor', 'analytics', 'species', range],  queryFn: () => getRevenueBySpecies(from, to) })
const spendQ    = useQuery({ queryKey: ['vendor', 'analytics', 'spend', range],    queryFn: () => getProcurementSpend(from, to) })

if (summaryQ.isLoading) return <div className="page"><StatTileSkeleton /><StatTileSkeleton /></div>
if (summaryQ.error) return <div className="page"><ApiError error={summaryQ.error} onRetry={summaryQ.refetch} /></div>
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/vendor/__tests__/Analytics.test.jsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/Analytics.jsx frontend/src/vendor/__tests__/Analytics.test.jsx
git commit -m "feat(vendor): wire Analytics.jsx to analytics API"
```

---

### Task 5: Wire Reviews.jsx, Payouts.jsx, Watchlist.jsx, ShopProfile.jsx

**Files:**
- Modify: `frontend/src/vendor/Reviews.jsx`
- Modify: `frontend/src/vendor/Payouts.jsx`
- Modify: `frontend/src/vendor/ShopProfile.jsx`
- Modify: `frontend/src/vendor/Watchlist.jsx`
- Modify: `frontend/src/vendor/__tests__/Payouts.test.jsx`

Apply the same pattern to each: remove inline mock constants, add `useQuery` with the corresponding API module function, add loading/error states.

- [ ] **Step 1: Wire Reviews.jsx**

```jsx
import { useQuery } from '@tanstack/react-query'
import { getReviews } from './api/reviews'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const reviewsQ = useQuery({ queryKey: ['vendor', 'reviews'], queryFn: getReviews })
if (reviewsQ.isLoading) return <div className="page"><TableRowSkeleton rows={4} /></div>
if (reviewsQ.error) return <div className="page"><ApiError error={reviewsQ.error} onRetry={reviewsQ.refetch} /></div>
const reviews = reviewsQ.data ?? []
```

- [ ] **Step 2: Update Payouts.test.jsx and wire Payouts.jsx**

```jsx
// frontend/src/vendor/__tests__/Payouts.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Payouts from '../Payouts'

vi.mock('../api/payouts', () => ({ getPayouts: vi.fn() }))
import { getPayouts } from '../api/payouts'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getPayouts.mockResolvedValue([{ id: 1, amount: 3500, method: 'GCASH', status: 'COMPLETED', createdAt: '2026-04-23T10:00:00Z' }])
})

describe('Payouts', () => {
  it('renders payout amount', async () => {
    wrap(<Payouts />)
    expect(await screen.findByText(/3,500/)).toBeInTheDocument()
  })
})
```

Wire Payouts.jsx:

```jsx
import { useQuery } from '@tanstack/react-query'
import { getPayouts } from './api/payouts'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const payoutsQ = useQuery({ queryKey: ['vendor', 'payouts'], queryFn: getPayouts })
if (payoutsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
if (payoutsQ.error) return <div className="page"><ApiError error={payoutsQ.error} onRetry={payoutsQ.refetch} /></div>
const payouts = payoutsQ.data ?? []
```

- [ ] **Step 3: Wire Watchlist.jsx**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from './api/watchlist'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const qc        = useQueryClient()
const watchlistQ = useQuery({ queryKey: ['vendor', 'watchlist'], queryFn: getWatchlist })
const removeMut  = useMutation({
  mutationFn: removeFromWatchlist,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'watchlist'] }),
})
```

- [ ] **Step 4: Wire ShopProfile.jsx**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getShop, updateShop } from './api/shop'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

```jsx
const qc     = useQueryClient()
const shopQ  = useQuery({ queryKey: ['vendor', 'shop'], queryFn: getShop })
const updateMut = useMutation({
  mutationFn: updateShop,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'shop'] }),
})
if (shopQ.isLoading) return <div className="page"><CardSkeleton /></div>
if (shopQ.error) return <div className="page"><ApiError error={shopQ.error} onRetry={shopQ.refetch} /></div>
const shop = shopQ.data ?? {}
```

- [ ] **Step 5: Run all vendor tests**

```bash
npx vitest run src/vendor/
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/vendor/Reviews.jsx frontend/src/vendor/Payouts.jsx frontend/src/vendor/Watchlist.jsx frontend/src/vendor/ShopProfile.jsx frontend/src/vendor/__tests__/Payouts.test.jsx
git commit -m "feat(vendor): wire Reviews, Payouts, Watchlist, ShopProfile to real API"
```

---

### Task 6: Final pass — remove all remaining vendor mock constants

- [ ] **Step 1: Grep for remaining mock data**

```bash
cd frontend
grep -rn "Inline mock data\|const VENDOR_USER\|const V_HOME\|const VENDOR_LISTINGS\|const VENDOR_BROWSE" src/vendor/
```

Expected: zero matches.

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run src/vendor/
```

Expected: all tests pass.

- [ ] **Step 3: Manual smoke test**

Log in as VENDOR. Visit every page in the vendor nav: Home, Inventory, Storefront, Orders Inbox, Procurement Feed, Procurement Cart, Procurement Orders, Analytics, Reviews, Payouts, Watchlist, Shop Profile. Each page should show real data or a clean empty state.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(vendor): all pages wired to real API — no remaining mock data"
```
