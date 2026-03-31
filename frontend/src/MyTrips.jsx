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
  const [activeTab, setActiveTab]           = useState('active')
  const [activeTrip, setActiveTrip]         = useState(null)
  const [history, setHistory]               = useState([])
  const [catches, setCatches]               = useState([])
  const [fishSpecies, setFishSpecies]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
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
