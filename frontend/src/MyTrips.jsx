import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from './api'

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

// ─── Placeholders (replaced in later tasks) ──────────────────────────────────

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
