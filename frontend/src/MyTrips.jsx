import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut } from './api'

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
    if (!selectedSpecies)                    { setError('Please select a species'); return }
    if (!quantity || Number(quantity) < 0.1) { setError('Quantity must be at least 0.1 kg'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiPost(`/trips/${tripId}/catches`, token, {
        speciesId:           selectedSpecies.id,
        quantityKg:          Number(quantity),
        estimatedPricePerKg: price ? Number(price) : null,
        notes:               notes.trim() || null,
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
      <TripHeaderCard trip={trip} />
      <SafetyChecklistSection trip={trip} token={token} onSaved={onChecklistSaved} />
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
      <EndTripButton tripId={trip.id} token={token} onEnded={onTripEnded} />
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
