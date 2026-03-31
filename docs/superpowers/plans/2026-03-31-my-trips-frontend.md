# My Trips Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "My Trips" view for the MERMAID Fisherman Dashboard — start trips, manage the safety checklist, log catches, end trips, and view trip history.

**Architecture:** A new `MyTrips.jsx` component is rendered by `FishermanDashboard.jsx` when `activeNav === 'trips'`. All trip state and API calls live in `MyTrips.jsx`. A new `api.js` shared module extracts the duplicate `apiGet` definition and adds `apiPost`/`apiPut`.

**Tech Stack:** React 18 (hooks), Vite dev server, Spring Boot REST API at `/api`, existing `dashboard.css` (extended in-place with trip styles).

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `frontend/src/api.js` | Shared `apiGet`, `apiPost`, `apiPut` helpers |
| Modify | `frontend/src/FishermanDashboard.jsx` | Import from `api.js`, render `<MyTrips>` when `activeNav === 'trips'` |
| Create | `frontend/src/MyTrips.jsx` | All trip components and state |
| Modify | `frontend/src/dashboard.css` | Append trip-specific styles |

---

## Task 1: Extract shared API helpers

**Files:**
- Create: `frontend/src/api.js`
- Modify: `frontend/src/FishermanDashboard.jsx` (lines 4–12)

- [ ] **Step 1: Create `frontend/src/api.js`**

```js
const API_BASE = '/api'

export async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiPost(path, token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export async function apiPut(path, token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}
```

- [ ] **Step 2: Update `FishermanDashboard.jsx` imports — remove local `apiGet`**

At the top of `FishermanDashboard.jsx`, find and replace:

```js
import { useState, useEffect, useCallback } from 'react'
import './dashboard.css'

const API_BASE = '/api'

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}
```

With:

```js
import { useState, useEffect, useCallback } from 'react'
import './dashboard.css'
import { apiGet } from './api'
```

- [ ] **Step 3: Verify dashboard still loads**

Run: `cd frontend && npm run dev`

Log in as a fisherman. Conditions and advisories load normally. No console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api.js frontend/src/FishermanDashboard.jsx
git commit -m "refactor: extract apiGet to shared api.js, add apiPost and apiPut"
```

---

## Task 2: Scaffold MyTrips and wire into dashboard navigation

**Files:**
- Create: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/FishermanDashboard.jsx`

- [ ] **Step 1: Create `frontend/src/MyTrips.jsx` with placeholder**

```jsx
export default function MyTrips({ token }) {
  return (
    <div className="trips-page">
      <p style={{ color: 'rgba(255,255,255,0.5)', padding: '32px 0' }}>
        My Trips — coming soon
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Import MyTrips in `FishermanDashboard.jsx`**

Add after the existing imports at the top:

```js
import MyTrips from './MyTrips'
```

- [ ] **Step 3: Wrap dashboard main content in navigation conditional**

In `FishermanDashboard.jsx`, find the `<main className="db-main">` opening tag and the line after it:

```jsx
      <main className="db-main">

        {/* ── Top bar ── */}
        <header className="db-topbar">
```

Replace with:

```jsx
      <main className="db-main">
        {activeNav === 'trips' ? (
          <MyTrips token={token} />
        ) : (
          <>

        {/* ── Top bar ── */}
        <header className="db-topbar">
```

Then find the closing `</main>` tag (at the very end of the JSX, after the last `</section>`):

```jsx
        </section>

      </main>
```

Replace with:

```jsx
        </section>

          </>
        )}
      </main>
```

- [ ] **Step 4: Verify navigation wiring**

Run: `cd frontend && npm run dev`

Log in. Click "My Trips" in the sidebar — main area shows "My Trips — coming soon". Click "Dashboard" — conditions view returns. No console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/FishermanDashboard.jsx
git commit -m "feat: wire MyTrips placeholder into dashboard navigation"
```

---

## Task 3: MyTrips root — data loading and tab structure

**Files:**
- Modify: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/dashboard.css`

- [ ] **Step 1: Replace `MyTrips.jsx` with root component, helpers, tabs, and placeholders**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { apiGet } from './api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(startedAt) {
  const ms = Math.max(0, Date.now() - new Date(startedAt).getTime())
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function statusClass(status) {
  if (status === 'ACTIVE') return 'active'
  if (status === 'COMPLETED') return 'completed'
  return 'cancelled'
}

function statusLabel(status) {
  if (status === 'ACTIVE') return '● Active'
  if (status === 'COMPLETED') return '✓ Completed'
  return '✕ Cancelled'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ height = '120px', radius = '14px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

// ─── TripTabs ─────────────────────────────────────────────────────────────────

function TripTabs({ active, onChange }) {
  return (
    <div className="trips-tabs">
      <button
        className={`trips-tab${active === 'active' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('active')}
      >
        Active Trip
      </button>
      <button
        className={`trips-tab${active === 'history' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('history')}
      >
        History
      </button>
    </div>
  )
}

// ─── Placeholders (replaced in later tasks) ──────────────────────────────────

function ActiveTripView({ trip, token, species, catches, catchesLoading, catchesError,
  onTripStarted, onTripEnded, onChecklistSaved, onCatchAdded, onCatchesRetry }) {
  return (
    <div style={{ color: 'rgba(255,255,255,0.4)', padding: '24px 0' }}>
      Active trip view — coming soon
    </div>
  )
}

function TripHistoryList({ trips, token }) {
  return (
    <div style={{ color: 'rgba(255,255,255,0.4)', padding: '24px 0' }}>
      Trip history — coming soon
    </div>
  )
}

// ─── MyTrips root ─────────────────────────────────────────────────────────────

export default function MyTrips({ token }) {
  const [activeTab, setActiveTab]       = useState('active')
  const [activeTrip, setActiveTrip]     = useState(null)
  const [history, setHistory]           = useState([])
  const [catches, setCatches]           = useState([])
  const [fishSpecies, setFishSpecies]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [catchesLoading, setCatchesLoading] = useState(false)
  const [catchesError, setCatchesError]     = useState(null)

  const loadCatches = useCallback(async (tripId) => {
    setCatchesLoading(true)
    setCatchesError(null)
    try {
      const data = await apiGet(`/trips/${tripId}/catches`, token)
      setCatches(data)
    } catch (err) {
      setCatchesError(err.message)
    } finally {
      setCatchesLoading(false)
    }
  }, [token])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [activeList, completed, cancelled, species] = await Promise.all([
        apiGet('/trips?status=ACTIVE', token),
        apiGet('/trips?status=COMPLETED', token),
        apiGet('/trips?status=CANCELLED', token),
        apiGet('/lookups/fish-species', token),
      ])
      const trip = activeList[0] ?? null
      setActiveTrip(trip)
      setHistory(
        [...completed, ...cancelled].sort((a, b) =>
          new Date(b.startedAt) - new Date(a.startedAt)
        )
      )
      setFishSpecies(species)
      if (trip) loadCatches(trip.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, loadCatches])

  useEffect(() => { load() }, [load])

  function handleTripStarted() { load() }
  function handleTripEnded()   { load() }
  function handleChecklistSaved(updatedChecklist) {
    setActiveTrip(t => ({ ...t, checklist: updatedChecklist }))
  }
  function handleCatchAdded() {
    if (activeTrip) loadCatches(activeTrip.id)
  }

  if (loading) return (
    <div className="trips-page">
      <Skeleton height="40px" radius="12px" />
      <Skeleton height="180px" />
      <Skeleton height="120px" />
    </div>
  )

  if (error) return (
    <div className="trips-page">
      <div className="db-error">
        <span>{error}</span>
        <button className="db-error__retry" onClick={load}>Retry</button>
      </div>
    </div>
  )

  return (
    <div className="trips-page">
      <TripTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'active' ? (
        <ActiveTripView
          trip={activeTrip}
          token={token}
          species={fishSpecies}
          catches={catches}
          catchesLoading={catchesLoading}
          catchesError={catchesError}
          onTripStarted={handleTripStarted}
          onTripEnded={handleTripEnded}
          onChecklistSaved={handleChecklistSaved}
          onCatchAdded={handleCatchAdded}
          onCatchesRetry={() => activeTrip && loadCatches(activeTrip.id)}
        />
      ) : (
        <TripHistoryList trips={history} token={token} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Append tab CSS to `frontend/src/dashboard.css`**

```css
/* ════════════════════════════════════
   MY TRIPS
   ════════════════════════════════════ */
.trips-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Tab bar ── */
.trips-tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
  width: fit-content;
}
.trips-tab {
  padding: 8px 20px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  transition: background 0.18s, color 0.18s;
}
.trips-tab--on {
  background: rgba(14, 116, 144, 0.22);
  color: #7DD3FC;
}
.trips-tab:hover:not(.trips-tab--on) {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}
```

- [ ] **Step 3: Verify tabs and loading states**

Run: `cd frontend && npm run dev`

Navigate to My Trips. Skeleton placeholders render while data loads. Two tab buttons appear. Switching tabs shows placeholder text for each. Page-level API error shows banner with Retry. No console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/dashboard.css
git commit -m "feat: add MyTrips tab structure and data loading"
```

---

## Task 4: EmptyState and StartTripModal

**Files:**
- Modify: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/dashboard.css`

- [ ] **Step 1: Update the import line at the top of `MyTrips.jsx`**

Replace:
```js
import { apiGet } from './api'
```
With:
```js
import { apiGet, apiPost } from './api'
```

- [ ] **Step 2: Add `EmptyState` component in `MyTrips.jsx`**

Add before `ActiveTripView`:

```jsx
// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onStart }) {
  return (
    <div className="trip-empty">
      <span className="trip-empty__icon">⚓</span>
      <p className="trip-empty__msg">No active trip. Ready to set sail?</p>
      <button className="trip-empty__btn" onClick={onStart}>Start Trip</button>
    </div>
  )
}
```

- [ ] **Step 3: Add `StartTripModal` component in `MyTrips.jsx`**

Add after `EmptyState`, before `ActiveTripView`:

```jsx
// ─── StartTripModal ───────────────────────────────────────────────────────────

function StartTripModal({ token, onCreated, onClose }) {
  const [departurePoint, setDeparturePoint] = useState('')
  const [targetArea, setTargetArea]         = useState('')
  const [vesselName, setVesselName]         = useState('')
  const [notes, setNotes]                   = useState('')
  const [error, setError]                   = useState(null)
  const [submitting, setSubmitting]         = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (departurePoint.trim().length < 2) { setError('Departure point must be at least 2 characters'); return }
    if (targetArea.trim().length < 2)     { setError('Target area must be at least 2 characters'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiPost('/trips', token, {
        departurePoint: departurePoint.trim(),
        targetArea:     targetArea.trim(),
        vesselName:     vesselName.trim() || null,
        notes:          notes.trim() || null,
      })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="trip-modal">
        <div className="trip-modal__header">
          <h2 className="trip-modal__title">Start a Trip</h2>
          <button className="trip-modal__close" onClick={onClose}>✕</button>
        </div>
        <form className="trip-form" onSubmit={submit}>
          {error && <p style={{ color: '#FCA5A5', fontSize: '13px', margin: 0 }}>{error}</p>}
          <label className="trip-form__label">
            Departure Point *
            <input
              className="trip-form__input"
              placeholder="e.g. Navotas Fish Port"
              value={departurePoint}
              onChange={e => setDeparturePoint(e.target.value)}
              maxLength={150}
              required
            />
          </label>
          <label className="trip-form__label">
            Target Area *
            <input
              className="trip-form__input"
              placeholder="e.g. Manila Bay Zone A"
              value={targetArea}
              onChange={e => setTargetArea(e.target.value)}
              maxLength={150}
              required
            />
          </label>
          <label className="trip-form__label">
            Vessel Name
            <input
              className="trip-form__input"
              placeholder="e.g. M/B Ligaya"
              value={vesselName}
              onChange={e => setVesselName(e.target.value)}
              maxLength={100}
            />
          </label>
          <label className="trip-form__label">
            Notes
            <textarea
              className="trip-form__textarea"
              placeholder="Any notes for this trip…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>
          <div className="trip-form__actions">
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Starting…' : 'Start Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Replace `ActiveTripView` placeholder with no-trip branch**

Replace:

```jsx
function ActiveTripView({ trip, token, species, catches, catchesLoading, catchesError,
  onTripStarted, onTripEnded, onChecklistSaved, onCatchAdded, onCatchesRetry }) {
  return (
    <div style={{ color: 'rgba(255,255,255,0.4)', padding: '24px 0' }}>
      Active trip view — coming soon
    </div>
  )
}
```

With:

```jsx
function ActiveTripView({ trip, token, species, catches, catchesLoading, catchesError,
  onTripStarted, onTripEnded, onChecklistSaved, onCatchAdded, onCatchesRetry }) {
  const [showModal, setShowModal] = useState(false)

  if (!trip) return (
    <>
      <EmptyState onStart={() => setShowModal(true)} />
      {showModal && (
        <StartTripModal
          token={token}
          onCreated={() => { setShowModal(false); onTripStarted() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>
        Trip active — more components coming in next tasks
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Append CSS for empty state, modal, form, and shared buttons**

Append to `frontend/src/dashboard.css`:

```css
/* ── Empty state ── */
.trip-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 24px;
  text-align: center;
}
.trip-empty__icon { font-size: 3rem; opacity: 0.45; }
.trip-empty__msg  { font-size: 15px; color: rgba(255, 255, 255, 0.5); }
.trip-empty__btn {
  padding: 12px 28px;
  background: #0e7490;
  color: #fff;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}
.trip-empty__btn:hover { background: #0891b2; }

/* ── Modal ── */
.trip-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(4px);
}
.trip-modal {
  background: #0d1f35;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.trip-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.trip-modal__title { font-size: 1.1rem; font-weight: 700; color: #fff; }
.trip-modal__close { color: rgba(255, 255, 255, 0.4); font-size: 20px; line-height: 1; }
.trip-modal__close:hover { color: rgba(255, 255, 255, 0.8); }

/* ── Form ── */
.trip-form { display: flex; flex-direction: column; gap: 12px; }
.trip-form__label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}
.trip-form__input,
.trip-form__textarea {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  transition: border-color 0.2s;
}
.trip-form__input:focus,
.trip-form__textarea:focus { outline: none; border-color: #0e7490; }
.trip-form__textarea { resize: vertical; min-height: 70px; }
.trip-form__actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }

/* ── Shared trip buttons ── */
.trip-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  transition: background 0.2s, opacity 0.2s;
}
.trip-btn--primary { background: #0e7490; color: #fff; }
.trip-btn--primary:hover:not(:disabled) { background: #0891b2; }
.trip-btn--ghost   { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); }
.trip-btn--ghost:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.trip-btn--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #FCA5A5;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.trip-btn--danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); }
.trip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 6: Verify empty state and modal**

Run: `cd frontend && npm run dev`

Navigate to My Trips → Active Trip. If no active trip exists: anchor icon, "No active trip" message, and "Start Trip" button appear. Click "Start Trip" — modal opens with 4 fields. Click backdrop or ✕ — modal closes. Submit with blank departure point — inline error shown, modal stays open. Submit with valid data — `POST /trips` called, trip appears in active view placeholder.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/dashboard.css
git commit -m "feat: add EmptyState and StartTripModal"
```

---

## Task 5: TripHeaderCard and SafetyChecklistSection

**Files:**
- Modify: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/dashboard.css`

- [ ] **Step 1: Update import to include `apiPut`**

Replace:
```js
import { apiGet, apiPost } from './api'
```
With:
```js
import { apiGet, apiPost, apiPut } from './api'
```

- [ ] **Step 2: Add `TripHeaderCard` component in `MyTrips.jsx`**

Add before `EmptyState`:

```jsx
// ─── TripHeaderCard ───────────────────────────────────────────────────────────

function TripHeaderCard({ trip }) {
  const [duration, setDuration] = useState(fmtDuration(trip.startedAt))

  useEffect(() => {
    const id = setInterval(() => setDuration(fmtDuration(trip.startedAt)), 1000)
    return () => clearInterval(id)
  }, [trip.startedAt])

  return (
    <div className="trip-header">
      <div className="trip-header__top">
        <span className={`trip-status trip-status--${statusClass(trip.status)}`}>
          {statusLabel(trip.status)}
        </span>
        <span className="trip-duration">{duration}</span>
      </div>
      <div className="trip-header__meta">
        <div className="trip-meta-row">
          <span>From:</span>
          <strong>{trip.departurePoint}</strong>
          <span>→ To:</span>
          <strong>{trip.targetArea}</strong>
        </div>
        {trip.vesselName && (
          <div className="trip-meta-row">
            <span>Vessel:</span>
            <strong>{trip.vesselName}</strong>
          </div>
        )}
        <div className="trip-meta-row">
          <span>Started:</span>
          <strong>{fmtDate(trip.startedAt)}</strong>
        </div>
        {trip.notes && (
          <div className="trip-meta-row">
            <span>Notes:</span>
            <strong>{trip.notes}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `CHECKLIST_FIELDS` constant and `SafetyChecklistSection` component**

Add after `TripHeaderCard`, before `EmptyState`:

```jsx
const CHECKLIST_FIELDS = [
  { key: 'fuelChecked',         label: 'Fuel' },
  { key: 'engineChecked',       label: 'Engine' },
  { key: 'radioChecked',        label: 'Radio' },
  { key: 'lifeVestChecked',     label: 'Life Vest' },
  { key: 'weatherReviewed',     label: 'Weather' },
  { key: 'emergencyKitChecked', label: 'Emergency Kit' },
]

// ─── SafetyChecklistSection ───────────────────────────────────────────────────

function SafetyChecklistSection({ trip, token, onSaved }) {
  const [open, setOpen]           = useState(false)
  const [dirty, setDirty]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [values, setValues]       = useState({
    fuelChecked:         trip.checklist?.fuelChecked         ?? false,
    engineChecked:       trip.checklist?.engineChecked       ?? false,
    radioChecked:        trip.checklist?.radioChecked        ?? false,
    lifeVestChecked:     trip.checklist?.lifeVestChecked     ?? false,
    weatherReviewed:     trip.checklist?.weatherReviewed     ?? false,
    emergencyKitChecked: trip.checklist?.emergencyKitChecked ?? false,
  })

  function toggle(key) {
    setValues(v => ({ ...v, [key]: !v[key] }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await apiPut(`/trips/${trip.id}/checklist`, token, values)
      setDirty(false)
      onSaved(updated)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`trip-section${open ? ' trip-section--open' : ''}`}>
      <button className="trip-section__head" onClick={() => setOpen(o => !o)}>
        <span className="trip-section__title">🛡 Safety Checklist</span>
        <span className="trip-section__chevron">▾</span>
      </button>
      {open && (
        <div className="trip-section__body">
          <div className="checklist-grid">
            {CHECKLIST_FIELDS.map(({ key, label }) => (
              <label
                key={key}
                className={`checklist-item${values[key] ? ' checklist-item--checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={values[key]}
                  onChange={() => toggle(key)}
                />
                {label}
              </label>
            ))}
          </div>
          {saveError && (
            <p style={{ color: '#FCA5A5', fontSize: '13px', margin: 0 }}>{saveError}</p>
          )}
          {trip.checklist?.checklistCompletedAt && !dirty && (
            <p className="checklist-saved">✓ Saved {fmtDate(trip.checklist.checklistCompletedAt)}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="trip-btn trip-btn--primary"
              disabled={!dirty || saving}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save Checklist'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update `ActiveTripView` to render header and checklist**

Replace the placeholder return in `ActiveTripView` (the `return` block for when `trip` exists):

```jsx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <TripHeaderCard trip={trip} />
      <SafetyChecklistSection trip={trip} token={token} onSaved={onChecklistSaved} />
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>
        Catch logs — coming in next task
      </p>
    </div>
  )
```

- [ ] **Step 5: Append CSS for trip header, status badges, section, and checklist**

Append to `frontend/src/dashboard.css`:

```css
/* ── Trip header card ── */
.trip-header {
  background: rgba(14, 116, 144, 0.12);
  border: 1px solid rgba(14, 116, 144, 0.3);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.trip-header__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.trip-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.trip-status--active    { background: rgba(34,197,94,0.15);  color: #86efac; border: 1px solid rgba(34,197,94,0.25); }
.trip-status--completed { background: rgba(125,211,252,0.1); color: #7DD3FC; border: 1px solid rgba(125,211,252,0.2); }
.trip-status--cancelled { background: rgba(239,68,68,0.08);  color: #FCA5A5; border: 1px solid rgba(239,68,68,0.2); }
.trip-duration {
  font-size: 1.4rem;
  font-weight: 700;
  color: #7DD3FC;
  font-variant-numeric: tabular-nums;
}
.trip-header__meta { display: flex; flex-direction: column; gap: 4px; }
.trip-meta-row { display: flex; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.6); flex-wrap: wrap; }
.trip-meta-row strong { color: rgba(255,255,255,0.85); font-weight: 500; }

/* ── Collapsible section ── */
.trip-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
}
.trip-section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.18s;
  width: 100%;
  text-align: left;
}
.trip-section__head:hover { background: rgba(255, 255, 255, 0.04); }
.trip-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.trip-section__chevron { transition: transform 0.2s; color: rgba(255, 255, 255, 0.3); }
.trip-section--open .trip-section__chevron { transform: rotate(180deg); }
.trip-section__body {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Checklist ── */
.checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.checklist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.checklist-item:hover { background: rgba(255, 255, 255, 0.06); }
.checklist-item--checked {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.2);
  color: rgba(255, 255, 255, 0.9);
}
.checklist-item input[type="checkbox"] { accent-color: #22c55e; width: 16px; height: 16px; }
.checklist-saved { font-size: 12px; color: rgba(125, 211, 252, 0.7); padding: 4px 0 0; }
```

- [ ] **Step 6: Verify header and checklist**

Run: `cd frontend && npm run dev`

With an active trip, verify: header card shows "● ACTIVE" badge, departure → target area, vessel name if set, start time, and the duration counter increments every second. Click "Safety Checklist" to expand. Check a box — "Save Checklist" button enables. Save — `PUT /trips/{id}/checklist` called, "✓ Saved {timestamp}" appears. Saving again with no changes keeps button disabled.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/dashboard.css
git commit -m "feat: add TripHeaderCard with duration counter and SafetyChecklistSection"
```

---

## Task 6: CatchLogsSection and AddCatchForm

**Files:**
- Modify: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/dashboard.css`

- [ ] **Step 1: Add `AddCatchForm` component in `MyTrips.jsx`**

Add before `ActiveTripView`:

```jsx
// ─── AddCatchForm ─────────────────────────────────────────────────────────────

function AddCatchForm({ tripId, token, species, onAdded, onCancel }) {
  const [search, setSearch]             = useState('')
  const [selectedSpecies, setSelected]  = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [quantity, setQuantity]         = useState('')
  const [price, setPrice]               = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)

  const filtered = species.filter(s =>
    s.commonName.toLowerCase().includes(search.toLowerCase())
  )

  function selectSpecies(s) {
    setSelected(s)
    setSearch(s.commonName)
    setShowDropdown(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!selectedSpecies)                  { setError('Please select a species'); return }
    if (!quantity || Number(quantity) < 0.1) { setError('Quantity must be at least 0.1 kg'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiPost(`/trips/${tripId}/catches`, token, {
        speciesId:            selectedSpecies.id,
        quantityKg:           Number(quantity),
        estimatedPricePerKg:  price ? Number(price) : null,
        notes:                notes.trim() || null,
      })
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="catch-form" onSubmit={submit}>
      {error && <p style={{ color: '#FCA5A5', fontSize: '13px', margin: 0 }}>{error}</p>}
      <div className="species-search-wrap">
        <input
          className="trip-form__input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="Search species…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {showDropdown && filtered.length > 0 && (
          <div className="species-dropdown">
            {filtered.slice(0, 20).map(s => (
              <div key={s.id} className="species-option" onMouseDown={() => selectSpecies(s)}>
                {s.commonName}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="catch-form__row">
        <label className="trip-form__label">
          Quantity (kg) *
          <input
            className="trip-form__input"
            type="number"
            min="0.1"
            step="0.01"
            placeholder="0.00"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
          />
        </label>
        <label className="trip-form__label">
          Price / kg
          <input
            className="trip-form__input"
            type="number"
            min="0"
            step="0.01"
            placeholder="optional"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </label>
      </div>
      <input
        className="trip-form__input"
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="trip-form__actions">
        <button type="button" className="trip-btn trip-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Catch'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Add `CatchLogsSection` component in `MyTrips.jsx`**

Add after `AddCatchForm`, before `ActiveTripView`:

```jsx
// ─── CatchLogsSection ─────────────────────────────────────────────────────────

function CatchLogsSection({ trip, token, species, catches, loading, error, onAdded, onRetry }) {
  const [open, setOpen]         = useState(false)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className={`trip-section${open ? ' trip-section--open' : ''}`}>
      <button className="trip-section__head" onClick={() => setOpen(o => !o)}>
        <span className="trip-section__title">
          🐟 Catch Logs
          {catches.length > 0 && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              {' '}({catches.length})
            </span>
          )}
        </span>
        <span className="trip-section__chevron">▾</span>
      </button>
      {open && (
        <div className="trip-section__body">
          {loading && <div className="skeleton" style={{ height: '60px' }} />}
          {error && (
            <div style={{ color: '#FCA5A5', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              {error}
              <button
                className="trip-btn trip-btn--ghost"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={onRetry}
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && catches.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13.5px' }}>No catches logged yet.</p>
          )}
          {!loading && catches.length > 0 && (
            <div className="catch-list">
              {catches.map(c => (
                <div key={c.id} className="catch-card">
                  <div>
                    <p className="catch-card__species">{c.species.commonName}</p>
                    {c.notes && <p className="catch-card__detail">{c.notes}</p>}
                  </div>
                  <div className="catch-card__qty">
                    <div>{c.quantityKg} kg</div>
                    {c.estimatedPricePerKg && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        ₱{c.estimatedPricePerKg}/kg
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!showForm && (
            <div>
              <button
                className="trip-btn trip-btn--primary"
                style={{ fontSize: '13px', padding: '8px 18px' }}
                onClick={() => setShowForm(true)}
              >
                + Add Catch
              </button>
            </div>
          )}
          {showForm && (
            <AddCatchForm
              tripId={trip.id}
              token={token}
              species={species}
              onAdded={() => { setShowForm(false); onAdded() }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `ActiveTripView` — replace catch placeholder with `CatchLogsSection`**

In the `ActiveTripView` return (for when trip exists), replace:

```jsx
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>
        Catch logs — coming in next task
      </p>
```

With:

```jsx
      <CatchLogsSection
        trip={trip}
        token={token}
        species={species}
        catches={catches}
        loading={catchesLoading}
        error={catchesError}
        onAdded={onCatchAdded}
        onRetry={onCatchesRetry}
      />
```

- [ ] **Step 4: Append CSS for catch logs and species search**

Append to `frontend/src/dashboard.css`:

```css
/* ── Catch logs ── */
.catch-list { display: flex; flex-direction: column; gap: 8px; }
.catch-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
}
.catch-card__species { font-size: 14px; font-weight: 500; color: #fff; }
.catch-card__detail  { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 2px; }
.catch-card__qty     { font-size: 14px; font-weight: 600; color: #7DD3FC; text-align: right; }

/* ── Add catch form ── */
.catch-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: rgba(14, 116, 144, 0.08);
  border: 1px solid rgba(14, 116, 144, 0.2);
  border-radius: 12px;
}
.catch-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* ── Species search ── */
.species-search-wrap { position: relative; }
.species-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #0d1f35;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  max-height: 180px;
  overflow-y: auto;
  z-index: 20;
  margin-top: 4px;
  scrollbar-width: thin;
}
.species-option {
  padding: 9px 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: background 0.15s;
}
.species-option:hover { background: rgba(14, 116, 144, 0.25); color: #fff; }
```

- [ ] **Step 5: Verify catch logs**

Run: `cd frontend && npm run dev`

With an active trip, expand "Catch Logs". Shows "No catches logged yet." Click "+ Add Catch". Type a species name — dropdown filters in real time. Select a species. Enter 0 quantity — client-side error. Enter 0.5 kg. Submit — `POST /trips/{id}/catches` called, new catch card appears. Cancel closes the form without submitting.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/dashboard.css
git commit -m "feat: add CatchLogsSection and AddCatchForm with searchable species"
```

---

## Task 7: EndTripButton

**Files:**
- Modify: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/dashboard.css`

- [ ] **Step 1: Add `EndTripButton` component in `MyTrips.jsx`**

Add before `ActiveTripView`:

```jsx
// ─── EndTripButton ────────────────────────────────────────────────────────────

function EndTripButton({ tripId, token, onEnded }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [notes, setNotes]             = useState('')
  const [ending, setEnding]           = useState(false)
  const [error, setError]             = useState(null)

  async function confirmEnd() {
    setEnding(true)
    setError(null)
    try {
      await apiPost(`/trips/${tripId}/end`, token, { notes: notes.trim() || null })
      onEnded()
    } catch (err) {
      setError(err.message)
      setEnding(false)
    }
  }

  return (
    <div className="end-trip-wrap">
      <button
        className="trip-btn trip-btn--danger"
        style={{ width: '100%' }}
        onClick={() => setShowConfirm(true)}
      >
        End Trip
      </button>
      {showConfirm && (
        <div
          className="confirm-overlay"
          onClick={e => e.target === e.currentTarget && setShowConfirm(false)}
        >
          <div className="confirm-box">
            <p className="confirm-box__title">End this trip?</p>
            <p className="confirm-box__msg">
              This will mark the trip as completed. You won't be able to add more catches after ending.
            </p>
            {error && <p style={{ color: '#FCA5A5', fontSize: '13px', margin: 0 }}>{error}</p>}
            <label className="trip-form__label">
              Notes (optional)
              <textarea
                className="trip-form__textarea"
                placeholder="Any final notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={500}
              />
            </label>
            <div className="trip-form__actions">
              <button
                className="trip-btn trip-btn--ghost"
                onClick={() => { setShowConfirm(false); setError(null) }}
                disabled={ending}
              >
                Cancel
              </button>
              <button
                className="trip-btn trip-btn--danger"
                onClick={confirmEnd}
                disabled={ending}
              >
                {ending ? 'Ending…' : 'Confirm End Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `EndTripButton` to `ActiveTripView`**

At the end of the `return` inside `ActiveTripView` (after `CatchLogsSection`), add:

```jsx
      <EndTripButton tripId={trip.id} token={token} onEnded={onTripEnded} />
```

- [ ] **Step 3: Append CSS for confirm dialog**

Append to `frontend/src/dashboard.css`:

```css
/* ── End trip ── */
.end-trip-wrap { margin-top: 8px; }
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(4px);
}
.confirm-box {
  background: #0d1f35;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 18px;
  padding: 28px;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.confirm-box__title { font-size: 1.05rem; font-weight: 700; color: #FCA5A5; }
.confirm-box__msg   { font-size: 13.5px; color: rgba(255, 255, 255, 0.55); }
```

- [ ] **Step 4: Verify end trip flow**

Run: `cd frontend && npm run dev`

With an active trip, click "End Trip" at the bottom. Red confirm dialog appears with notes textarea. Backdrop click or Cancel dismisses it. Click "Confirm End Trip" — `POST /trips/{id}/end` called, trip disappears from Active tab. Switch to History — ended trip appears at the top of the list.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/dashboard.css
git commit -m "feat: add EndTripButton with confirm dialog"
```

---

## Task 8: TripHistoryList and TripHistoryCard

**Files:**
- Modify: `frontend/src/MyTrips.jsx`
- Modify: `frontend/src/dashboard.css`

- [ ] **Step 1: Replace `TripHistoryList` placeholder with full implementation**

Replace the two placeholder functions at the bottom of `MyTrips.jsx` (before `export default function MyTrips`):

```jsx
// ─── TripHistoryCard ──────────────────────────────────────────────────────────

function TripHistoryCard({ trip, token }) {
  const [open, setOpen]       = useState(false)
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [fetched, setFetched] = useState(false)

  async function fetchCatches() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/trips/${trip.id}/catches`, token)
      setCatches(data)
      setFetched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function expand() {
    const next = !open
    setOpen(next)
    if (next && !fetched) fetchCatches()
  }

  const cl = trip.checklist

  return (
    <div className="history-card">
      <button className="history-card__summary" onClick={expand}>
        <div className="history-card__left">
          <span className="history-card__route">
            {trip.departurePoint} → {trip.targetArea}
          </span>
          <span className="history-card__sub">
            {trip.vesselName && `${trip.vesselName} · `}
            {fmtDate(trip.startedAt)}
            {trip.endedAt && ` – ${fmtDate(trip.endedAt)}`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`trip-status trip-status--${statusClass(trip.status)}`}>
            {statusLabel(trip.status)}
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.3)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none',
            display: 'inline-block',
          }}>▾</span>
        </div>
      </button>

      {open && (
        <div className="history-card__detail">
          {/* Checklist */}
          <div>
            <p className="history-section-title">Safety Checklist</p>
            {cl ? (
              <div className="history-checklist">
                {CHECKLIST_FIELDS.map(({ key, label }) => (
                  <span
                    key={key}
                    className={`history-check-item history-check-item--${cl[key] ? 'yes' : 'no'}`}
                  >
                    {cl[key] ? '✓' : '✕'} {label}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                No checklist recorded.
              </p>
            )}
          </div>

          {/* Catches */}
          <div>
            <p className="history-section-title">Catch Logs</p>
            {loading && <div className="skeleton" style={{ height: '60px' }} />}
            {error && (
              <div style={{ color: '#FCA5A5', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {error}
                <button
                  className="trip-btn trip-btn--ghost"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={fetchCatches}
                >
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && catches.length === 0 && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                No catches logged.
              </p>
            )}
            {!loading && catches.length > 0 && (
              <table className="catch-table">
                <thead>
                  <tr>
                    <th>Species</th>
                    <th>Qty (kg)</th>
                    <th>Price/kg</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {catches.map(c => (
                    <tr key={c.id}>
                      <td>{c.species.commonName}</td>
                      <td>{c.quantityKg}</td>
                      <td>{c.estimatedPricePerKg ? `₱${c.estimatedPricePerKg}` : '—'}</td>
                      <td>{c.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TripHistoryList ──────────────────────────────────────────────────────────

function TripHistoryList({ trips, token }) {
  if (trips.length === 0) {
    return (
      <div className="trips-empty-history">
        <p>No past trips yet. Your history will appear here after you end a trip.</p>
      </div>
    )
  }
  return (
    <div className="history-list">
      {trips.map(t => <TripHistoryCard key={t.id} trip={t} token={token} />)}
    </div>
  )
}
```

- [ ] **Step 2: Append CSS for history list and cards**

Append to `frontend/src/dashboard.css`:

```css
/* ── Trip history ── */
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
}
.history-card__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.18s;
  width: 100%;
  text-align: left;
}
.history-card__summary:hover { background: rgba(255, 255, 255, 0.04); }
.history-card__left { display: flex; flex-direction: column; gap: 4px; }
.history-card__route { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); }
.history-card__sub   { font-size: 12.5px; color: rgba(255, 255, 255, 0.4); }
.history-card__detail {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.history-section-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
}
.history-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.history-check-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
.history-check-item--yes { color: #86efac; }
.history-check-item--no  { color: rgba(255, 255, 255, 0.3); }
.catch-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.catch-table th {
  text-align: left;
  padding: 6px 10px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.catch-table td {
  padding: 8px 10px;
  color: rgba(255, 255, 255, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.catch-table tr:last-child td { border-bottom: none; }
.trips-empty-history {
  padding: 40px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
}
```

- [ ] **Step 3: Verify trip history**

Run: `cd frontend && npm run dev`

Navigate to History tab. With no past trips: "No past trips yet" message. After ending at least one trip: cards appear (newest first). Each collapsed card shows route, vessel, date range, status badge. Clicking expands it. Checklist shows ✓/✕ per item (or "No checklist recorded" if never saved). Catches load on first expand via `GET /trips/{id}/catches`. "No catches logged" if empty. Second expand uses cached data (no extra API call). Retry button on catch fetch error re-fetches.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/MyTrips.jsx frontend/src/dashboard.css
git commit -m "feat: add TripHistoryList and expandable TripHistoryCard with lazy catch loading"
```

---

## Manual QA Checklist

Run through these after all tasks are complete:

**Happy path:**
- [ ] No active trip → empty state → Start Trip modal → valid submit → active trip card appears
- [ ] Active trip → expand checklist → check all 6 boxes → Save → timestamp shows
- [ ] Active trip → expand catches → Add Catch → type species name → select → 0.5 kg → submit → card appears
- [ ] Active trip → End Trip → confirm with notes → trip moves to History
- [ ] History tab → card shows route + status → expand → checklist + catch table render

**Edge cases:**
- [ ] Start Trip with blank departure point shows "at least 2 characters" error; modal stays open
- [ ] Add Catch with no species selected shows "Please select a species"
- [ ] Add Catch with quantity 0 shows "at least 0.1 kg"
- [ ] History card with no catches shows "No catches logged"
- [ ] API failure on initial load shows error banner with Retry button
