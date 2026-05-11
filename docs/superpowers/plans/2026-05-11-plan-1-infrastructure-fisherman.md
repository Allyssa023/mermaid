# Plan 1: Infrastructure + Fisherman Role Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install React Query, build shared loading/error/skeleton infrastructure, and wire all fisherman role pages to real backend API calls — replacing every inline mock data constant.

**Architecture:** Each page gets its mock data constants removed and replaced with `useQuery` calls to existing `fisherman/api/` modules. Shared `Skeleton` and `ApiError` components handle loading/error states consistently. Lookup data (species, market locations) is cached globally via React Query.

**Tech Stack:** React 18, Vite, Vitest, @tanstack/react-query v5, @testing-library/react, Spring Boot backend at `/api` proxy

**Spec:** `docs/superpowers/specs/2026-05-11-mock-to-real-data-integration-design.md`

**Prerequisite for Plan 2:** This plan must be complete before Plan 2 starts (Plan 2 uses the Skeleton + ApiError components built here).

---

## File Map

| Action | File |
|---|---|
| Create | `frontend/src/lib/queryClient.js` |
| Modify | `frontend/src/App.jsx` |
| Create | `frontend/src/components/Skeleton.jsx` |
| Create | `frontend/src/components/ApiError.jsx` |
| Create | `frontend/src/api/lookup.js` |
| Create | `frontend/src/fisherman/api/marine.js` |
| Modify | `frontend/src/fisherman/api/trips.js` |
| Modify | `frontend/src/fisherman/Home.jsx` |
| Modify | `frontend/src/fisherman/Planner.jsx` |
| Modify | `frontend/src/fisherman/Trips.jsx` |
| Modify | `frontend/src/fisherman/CatchAlerts.jsx` |
| Create | `frontend/src/fisherman/api/marketplace.js` |
| Modify | `frontend/src/fisherman/Marketplace.jsx` |
| Modify | `frontend/src/fisherman/Earnings.jsx` |
| Modify | `frontend/src/fisherman/Procurement.jsx` |
| Modify | `frontend/src/fisherman/Profile.jsx` |
| Create | `frontend/src/fisherman/__tests__/Home.test.jsx` |
| Create | `frontend/src/fisherman/__tests__/Earnings.test.jsx` (already exists — update) |

---

### Task 1: Install React Query and create QueryClient

**Files:**
- Create: `frontend/src/lib/queryClient.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install @tanstack/react-query@5 @tanstack/react-query-devtools@5
```

Expected: `package.json` gains `@tanstack/react-query` and devtools.

- [ ] **Step 2: Create queryClient.js**

```js
// frontend/src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

- [ ] **Step 3: Wrap App.jsx in QueryClientProvider**

Open `frontend/src/App.jsx`. Add imports at the top:

```jsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
```

Wrap the return value of the top-level `App` component:

```jsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 4: Verify dev server still starts**

```bash
npm run dev
```

Expected: browser opens, login page renders, no console errors about QueryClient.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/queryClient.js frontend/src/App.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat: install React Query and wrap app in QueryClientProvider"
```

---

### Task 2: Create Skeleton and ApiError components

**Files:**
- Create: `frontend/src/components/Skeleton.jsx`
- Create: `frontend/src/components/ApiError.jsx`

- [ ] **Step 1: Create Skeleton.jsx**

```jsx
// frontend/src/components/Skeleton.jsx
import '../design-system.css'

export function Skeleton({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div
      className="skeleton-bar"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ gap: 12, display: 'flex', flexDirection: 'column' }}>
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={20} />
      <Skeleton width="55%" height={12} />
    </div>
  )
}

export function TableRowSkeleton({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton width={32} height={32} radius={8} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="40%" height={10} />
          </div>
          <Skeleton width={64} height={12} />
        </div>
      ))}
    </div>
  )
}

export function StatTileSkeleton() {
  return (
    <div className="stat-tile">
      <Skeleton width="50%" height={11} />
      <Skeleton width="35%" height={28} style={{ marginTop: 8 }} />
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="30%" height={12} />
        <Skeleton width={56} height={20} radius={12} />
      </div>
      <Skeleton width="55%" height={18} />
      <Skeleton width="45%" height={12} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <Skeleton width={100} height={32} radius={8} />
      </div>
    </div>
  )
}
```

Add the skeleton animation to `frontend/src/design-system.css` (append at bottom):

```css
/* Skeleton loader */
.skeleton-bar {
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s infinite;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- [ ] **Step 2: Create ApiError.jsx**

```jsx
// frontend/src/components/ApiError.jsx
export default function ApiError({ error, onRetry, compact = false }) {
  const msg = error?.message || 'Something went wrong'
  if (compact) {
    return (
      <div className="api-error api-error--compact">
        <span>{msg}</span>
        {onRetry && <button className="btn btn--ghost btn--sm" onClick={onRetry}>Retry</button>}
      </div>
    )
  }
  return (
    <div className="api-error">
      <p className="api-error__msg">{msg}</p>
      {onRetry && (
        <button className="btn btn--secondary" onClick={onRetry}>Try again</button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Skeleton.jsx frontend/src/components/ApiError.jsx frontend/src/design-system.css
git commit -m "feat: add Skeleton and ApiError shared components"
```

---

### Task 3: Create lookup.js (species + market locations)

**Files:**
- Create: `frontend/src/api/lookup.js`

- [ ] **Step 1: Create lookup.js**

```js
// frontend/src/api/lookup.js
// Use explicit .js extension to avoid ambiguity: src/api.js (utilities) vs src/api/ (directory)
import { apiGet } from '../api.js'

export const fetchSpecies        = () => apiGet('/species')
export const fetchMarketLocations = () => apiGet('/market-locations')
```

- [ ] **Step 2: Verify species endpoint works**

Start the backend (`cd backend && ./mvnw spring-boot:run`), then in browser devtools:

```js
fetch('/api/species', { credentials: 'include' }).then(r => r.json()).then(console.log)
```

Expected: array of `{ id, commonName, scientificName, active }` objects.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/lookup.js
git commit -m "feat: add lookup.js for species and market locations"
```

---

### Task 4: Create fisherman/api/marine.js and wire Home.jsx

**Files:**
- Create: `frontend/src/fisherman/api/marine.js`
- Modify: `frontend/src/fisherman/Home.jsx`
- Create: `frontend/src/fisherman/__tests__/Home.test.jsx`

- [ ] **Step 1: Create marine.js**

```js
// frontend/src/fisherman/api/marine.js
import { apiGet } from '../../api'

export const fetchAllConditions  = ()         => apiGet('/marine/conditions')
export const fetchZoneConditions = (zoneId)   => apiGet(`/marine/conditions/${zoneId}`)
export const fetchAdvisories     = (activeOnly = true) => apiGet(`/advisories?active=${activeOnly}`)
```

- [ ] **Step 2: Write failing test for Home**

```jsx
// frontend/src/fisherman/__tests__/Home.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'

vi.mock('../api/marine', () => ({
  fetchAllConditions: vi.fn(),
  fetchAdvisories: vi.fn(),
}))
vi.mock('../api/procurement', () => ({
  listProcurementOrders: vi.fn(),
}))

import { fetchAllConditions, fetchAdvisories } from '../api/marine'
import { listProcurementOrders } from '../api/procurement'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK_CONDITIONS = {
  zones: [
    { zoneId: 'verde', zoneName: 'Verde Passage', risk: { level: 'SAFE', score: 2, advisory: '' },
      marine: { waveHeightM: 0.9 }, weather: { windSpeedKmh: 18, windGustsKmh: 26 } },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchAllConditions.mockResolvedValue(MOCK_CONDITIONS)
  fetchAdvisories.mockResolvedValue([])
  listProcurementOrders.mockResolvedValue([])
})

describe('FishermanHomePage', () => {
  it('renders zone name after data loads', async () => {
    wrap(<Home setPage={vi.fn()} />)
    expect(await screen.findByText(/Verde Passage/i)).toBeInTheDocument()
  })

  it('renders skeleton while loading', () => {
    fetchAllConditions.mockReturnValue(new Promise(() => {}))
    wrap(<Home setPage={vi.fn()} />)
    expect(document.querySelector('.skeleton-bar')).toBeTruthy()
  })

  it('renders error when fetch fails', async () => {
    fetchAllConditions.mockRejectedValue(new Error('Network error'))
    wrap(<Home setPage={vi.fn()} />)
    expect(await screen.findByText(/Network error/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd frontend && npx vitest run src/fisherman/__tests__/Home.test.jsx
```

Expected: FAIL — Home still reads from mock constants, not from `fetchAllConditions`.

- [ ] **Step 4: Wire Home.jsx to real API**

Open `frontend/src/fisherman/Home.jsx`. Replace the top of the file:

Remove the `const USER = {...}`, `const SEA_STATUS = {...}`, `const FISHERMAN_PROCUREMENT_ORDERS = [...]` blocks.

Add imports:

```jsx
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { fetchAllConditions, fetchAdvisories } from './api/marine'
import { listProcurementOrders } from './api/procurement'
import { CardSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace the body of `FishermanHomePage`:

```jsx
export default function FishermanHomePage({ setPage }) {
  const { user } = useAuth()
  const [zoneIdx, setZoneIdx] = useState(0)

  const condQ = useQuery({ queryKey: ['marine', 'conditions'], queryFn: fetchAllConditions })
  const advQ  = useQuery({ queryKey: ['advisories', 'active'],  queryFn: () => fetchAdvisories(true) })
  const procQ = useQuery({ queryKey: ['fisherman', 'procurement', 'active'],
                           queryFn: () => listProcurementOrders() })

  if (condQ.isLoading) return <div className="page"><CardSkeleton /><CardSkeleton /></div>
  if (condQ.error)     return <div className="page"><ApiError error={condQ.error} onRetry={condQ.refetch} /></div>

  const zones    = condQ.data?.zones ?? []
  const zone     = zones[zoneIdx] ?? {}
  const advisories = advQ.data ?? []
  const pendingOrders = (procQ.data ?? []).filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED').slice(0, 3)

  // derive overall risk from zones
  const riskCounts = { SAFE: 0, CAUTION: 0, UNSAFE: 0 }
  zones.forEach(z => { riskCounts[z.risk?.level]++ })
  const overallTone = riskCounts.UNSAFE > 0 ? 'unsafe' : riskCounts.CAUTION > 0 ? 'caution' : 'safe'

  // rest of JSX remains unchanged — replace SEA_STATUS.zones with zones,
  // s.overall with overallTone, s.asOf with new Date().toLocaleTimeString(),
  // s.source with 'Open-Meteo via Marine Service',
  // USER.first with user?.fullName?.split(' ')[0] ?? 'Fisherman',
  // USER.vessel with user?.vesselName ?? ''
  // ... (keep all JSX, only replace data bindings)
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run src/fisherman/__tests__/Home.test.jsx
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/fisherman/api/marine.js frontend/src/fisherman/Home.jsx frontend/src/fisherman/__tests__/Home.test.jsx
git commit -m "feat(fisherman): wire Home.jsx to marine conditions + advisories API"
```

---

### Task 5: Extend trips.js with catch log functions and wire Trips.jsx

**Files:**
- Modify: `frontend/src/fisherman/api/trips.js`
- Modify: `frontend/src/fisherman/Trips.jsx`

- [ ] **Step 1: Extend trips.js**

```js
// frontend/src/fisherman/api/trips.js  (append to existing file)
export const listCatchLogs    = (tripId)            => apiGet(`/trips/${tripId}/catch-logs`)
export const createCatchLog   = (tripId, body)      => apiPost(`/trips/${tripId}/catch-logs`, null, body)
export const updateCatchLog   = (tripId, logId, body) => apiPut(`/trips/${tripId}/catch-logs/${logId}`, null, body)
export const deleteCatchLog   = (tripId, logId)     => apiDelete(`/trips/${tripId}/catch-logs/${logId}`)
export const settleCatchLog   = (tripId, logId, body) => apiPost(`/trips/${tripId}/catch-logs/${logId}/settle`, null, body)
export const getTrip          = (id)               => apiGet(`/trips/${id}`)
```

Also add `import { apiDelete } from '../../api'` if not already imported (check existing imports).

- [ ] **Step 2: Wire Trips.jsx**

Open `frontend/src/fisherman/Trips.jsx`. Remove the `const SPECIES = [...]`, `const ACTIVE_TRIP = {...}`, `const PAST_TRIPS = [...]`, `const PLANNED_TRIPS = [...]` blocks.

Add imports:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { listTrips, getTrip, startTrip, endTrip, saveChecklist,
         listCatchLogs, createCatchLog, updateCatchLog, deleteCatchLog } from './api/trips'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton, CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data constants with queries in the page component body:

```jsx
const qc = useQueryClient()
const tripsQ  = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })
const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

const activeTrip = (tripsQ.data ?? []).find(t => t.status === 'ACTIVE') ?? null
const pastTrips  = (tripsQ.data ?? []).filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED')
const plannedTrips = (tripsQ.data ?? []).filter(t => t.status === 'PLANNED')

const catchLogsQ = useQuery({
  queryKey: ['catchLogs', activeTrip?.id],
  queryFn: () => listCatchLogs(activeTrip.id),
  enabled: !!activeTrip,
})

if (tripsQ.isLoading) return <div className="page"><CardSkeleton /><TableRowSkeleton /></div>
if (tripsQ.error) return <div className="page"><ApiError error={tripsQ.error} onRetry={tripsQ.refetch} /></div>
```

Replace all remaining references to `ACTIVE_TRIP` with `activeTrip`, `PAST_TRIPS` with `pastTrips`, `PLANNED_TRIPS` with `plannedTrips`, `SPECIES` with `speciesQ.data ?? []`.

- [ ] **Step 3: Verify manually**

Start backend, log in as FISHERMAN role, navigate to Trips page. Confirm it shows real trips data (or empty state if no trips exist yet).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/fisherman/api/trips.js frontend/src/fisherman/Trips.jsx
git commit -m "feat(fisherman): wire Trips.jsx to trips + catch logs API"
```

---

### Task 6: Wire CatchAlerts.jsx

**Files:**
- Modify: `frontend/src/fisherman/CatchAlerts.jsx`

- [ ] **Step 1: Remove mock data and wire queries**

Open `frontend/src/fisherman/CatchAlerts.jsx`. Remove `const SPECIES = [...]` and `const CATCH_ALERTS = [...]` blocks.

Add imports:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCatchAlerts, createCatchAlert, cancelCatchAlert } from './api/catchAlerts'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace mock data reads in the component:

```jsx
const qc = useQueryClient()
const alertsQ  = useQuery({ queryKey: ['catchAlerts', 'own'], queryFn: listCatchAlerts })
const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

const cancelMutation = useMutation({
  mutationFn: (id) => cancelCatchAlert(id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['catchAlerts'] }),
})

if (alertsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
if (alertsQ.error) return <div className="page"><ApiError error={alertsQ.error} onRetry={alertsQ.refetch} /></div>

const alerts = alertsQ.data ?? []
const species = speciesQ.data ?? []
```

Replace all `CATCH_ALERTS` with `alerts` and `SPECIES` with `species` in JSX.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/CatchAlerts.jsx
git commit -m "feat(fisherman): wire CatchAlerts.jsx to catch alerts API"
```

---

### Task 7: Create fisherman/api/marketplace.js and wire Marketplace.jsx

**Files:**
- Create: `frontend/src/fisherman/api/marketplace.js`
- Modify: `frontend/src/fisherman/Marketplace.jsx`

- [ ] **Step 1: Create marketplace.js**

```js
// frontend/src/fisherman/api/marketplace.js
import { apiGet, apiPost } from '../../api'

export const browseDemandListings = (params = {}) => {
  const qs = new URLSearchParams()
  if (params.speciesId) qs.set('speciesId', params.speciesId)
  if (params.status)    qs.set('status', params.status)
  const q = qs.toString()
  return apiGet(`/fisherman/marketplace/demand-listings${q ? `?${q}` : ''}`)
}

export const expressInterest = (listingId, body) =>
  apiPost(`/fisherman/marketplace/demand-listings/${listingId}/interest`, null, body)

export const listMyInterests = () => apiGet('/fisherman/marketplace/interests')
```

- [ ] **Step 2: Wire Marketplace.jsx**

Open `frontend/src/fisherman/Marketplace.jsx`. Find and remove all inline mock data blocks. Add:

```jsx
import { useQuery } from '@tanstack/react-query'
import { browseDemandListings } from './api/marketplace'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace mock data reads:

```jsx
const [speciesFilter, setSpeciesFilter] = useState(null)
const listingsQ = useQuery({
  queryKey: ['fisherman', 'marketplace', speciesFilter],
  queryFn: () => browseDemandListings({ speciesId: speciesFilter, status: 'OPEN' }),
})
const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>

const listings = listingsQ.data ?? []
const species = speciesQ.data ?? []
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/fisherman/api/marketplace.js frontend/src/fisherman/Marketplace.jsx
git commit -m "feat(fisherman): wire Marketplace.jsx to demand listings API"
```

---

### Task 8: Wire Planner.jsx

**Files:**
- Modify: `frontend/src/fisherman/Planner.jsx`

Planner shows: advisories, past/planned trips (from trips API), and top demand listings.

- [ ] **Step 1: Remove mock data and wire queries**

Open `frontend/src/fisherman/Planner.jsx`. Remove all inline mock constant blocks.

Add imports:

```jsx
import { useQuery } from '@tanstack/react-query'
import { fetchAdvisories } from './api/marine'
import { listTrips } from './api/trips'
import { browseDemandListings } from './api/marketplace'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data reads:

```jsx
const advQ      = useQuery({ queryKey: ['advisories', 'active'], queryFn: () => fetchAdvisories(true) })
const tripsQ    = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })
const listingsQ = useQuery({ queryKey: ['fisherman', 'marketplace', null], queryFn: () => browseDemandListings({ status: 'OPEN' }) })

const advisories   = advQ.data ?? []
const pastTrips    = (tripsQ.data ?? []).filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED')
const plannedTrips = (tripsQ.data ?? []).filter(t => t.status === 'PLANNED')
const listings     = (listingsQ.data ?? []).slice(0, 3)
```

For the calendar: the `month`/`selected` state stays local (it's just UI state). Only the trip data being overlaid on the calendar changes.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/Planner.jsx
git commit -m "feat(fisherman): wire Planner.jsx to trips + advisories + listings API"
```

---

### Task 9: Wire Earnings.jsx

**Files:**
- Modify: `frontend/src/fisherman/Earnings.jsx`
- Modify: `frontend/src/fisherman/__tests__/Earnings.test.jsx`

- [ ] **Step 1: Write failing test**

Open `frontend/src/fisherman/__tests__/Earnings.test.jsx` and replace its contents:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EarningsPage from '../Earnings'

vi.mock('../api/earnings', () => ({
  getEarningsSummary: vi.fn(),
  getEarningsLedger: vi.fn(),
}))

import { getEarningsSummary, getEarningsLedger } from '../api/earnings'

function wrap(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK_SUMMARY = { totalGross: 184320, cashCollected: 142500, outstandingUtang: 41820, ordersCount: 28 }
const MOCK_LEDGER  = [
  { id: 1, date: '2026-04-23', orderCode: 'ORD-001', speciesName: 'Grouper', quantityKg: 4, gross: 2160, paymentMethod: 'UTANG' },
]

beforeEach(() => {
  vi.clearAllMocks()
  getEarningsSummary.mockResolvedValue(MOCK_SUMMARY)
  getEarningsLedger.mockResolvedValue(MOCK_LEDGER)
})

describe('EarningsPage', () => {
  it('renders total gross after data loads', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/184,320/)).toBeInTheDocument()
  })

  it('renders ledger row species', async () => {
    wrap(<EarningsPage />)
    expect(await screen.findByText(/Grouper/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/fisherman/__tests__/Earnings.test.jsx
```

- [ ] **Step 3: Wire Earnings.jsx**

Open `frontend/src/fisherman/Earnings.jsx`. Remove `const FISHERMAN_EARNINGS = {...}` block. Add:

```jsx
import { useQuery } from '@tanstack/react-query'
import { getEarningsSummary, getEarningsLedger } from './api/earnings'
import { StatTileSkeleton, TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data reads:

```jsx
const [range, setRange] = useState('30')
const now  = new Date()
const to   = now.toISOString().split('T')[0]
const from = new Date(now - range * 86_400_000).toISOString().split('T')[0]

const summaryQ = useQuery({
  queryKey: ['earnings', 'summary', range],
  queryFn: () => getEarningsSummary(from, to),
})
const ledgerQ = useQuery({
  queryKey: ['earnings', 'ledger', range],
  queryFn: () => getEarningsLedger(from, to),
})

if (summaryQ.isLoading) return <div className="page"><StatTileSkeleton /><TableRowSkeleton /></div>
if (summaryQ.error) return <div className="page"><ApiError error={summaryQ.error} onRetry={summaryQ.refetch} /></div>

const e = summaryQ.data ?? {}
const ledger = ledgerQ.data ?? []
```

Replace all `e.totalGross`, `e.cashCollected`, `e.outstandingUtang`, `e.ordersCount` references (already used `e.` — the object shape just changes from mock to real).

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/fisherman/__tests__/Earnings.test.jsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/fisherman/Earnings.jsx frontend/src/fisherman/__tests__/Earnings.test.jsx
git commit -m "feat(fisherman): wire Earnings.jsx to earnings summary + ledger API"
```

---

### Task 10: Wire Procurement.jsx

**Files:**
- Modify: `frontend/src/fisherman/Procurement.jsx`

- [ ] **Step 1: Remove mock data and wire queries**

Open `frontend/src/fisherman/Procurement.jsx`. Remove all inline mock blocks. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listProcurementOrders, acceptOrder, markReady,
  completeOrder, cancelOrder, raiseDispute,
} from './api/procurement'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data reads:

```jsx
const qc     = useQueryClient()
const [bucket, setBucket] = useState(null)
const ordersQ = useQuery({
  queryKey: ['fisherman', 'procurement', bucket],
  queryFn: () => listProcurementOrders(bucket),
})

if (ordersQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

const orders = ordersQ.data ?? []
```

Wire action buttons to mutations (one mutation per action; all call `qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] })` on success).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/Procurement.jsx
git commit -m "feat(fisherman): wire Procurement.jsx to procurement orders API"
```

---

### Task 11: Wire Profile.jsx

**Files:**
- Modify: `frontend/src/fisherman/Profile.jsx`

- [ ] **Step 1: Remove mock data and wire queries**

Open `frontend/src/fisherman/Profile.jsx`. Remove all mock user/profile constants. Add:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getProfile, updateProfile } from './api/profile'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
```

Replace data reads:

```jsx
const qc = useQueryClient()
const profileQ = useQuery({ queryKey: ['fisherman', 'profile'], queryFn: getProfile })
const updateMutation = useMutation({
  mutationFn: updateProfile,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['fisherman', 'profile'] }),
})

if (profileQ.isLoading) return <div className="page"><CardSkeleton /></div>
if (profileQ.error) return <div className="page"><ApiError error={profileQ.error} onRetry={profileQ.refetch} /></div>

const profile = profileQ.data ?? {}
```

Replace all references to mock `USER` object with `profile` fields.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/fisherman/Profile.jsx
git commit -m "feat(fisherman): wire Profile.jsx to fisherman profile API"
```

---

### Task 12: Final pass — remove all remaining fisherman mock constants

- [ ] **Step 1: Find any remaining mock constants**

```bash
cd frontend
grep -rn "Inline mock data\|const USER =\|const SEA_STATUS\|const ACTIVE_TRIP\|const PAST_TRIPS\|const PLANNED_TRIPS\|const CATCH_ALERTS\|const ORDERS\|const LISTINGS\|const CONVERSATIONS\|const ACTIVITY\|const FISHERMAN_EARNINGS\|const FISHERMAN_PROCUREMENT" src/fisherman/
```

Expected: zero matches. If any appear, trace back to the relevant task above and fix.

- [ ] **Step 2: Run all fisherman tests**

```bash
npx vitest run src/fisherman/
```

Expected: all tests pass.

- [ ] **Step 3: Manual smoke test**

Start backend + marine service. Log in as FISHERMAN. Visit every page in the nav rail: Dashboard, Trip Planner, My Trips, Catch Alerts, Marketplace, Earnings, Procurement, Profile. Confirm each page loads real data or shows a clean empty state.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(fisherman): all pages wired to real API — no remaining mock data"
```
