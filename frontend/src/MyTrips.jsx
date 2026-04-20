import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from './api'
import StartTripModal from './components/StartTripModal'

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
  if (status === 'PLANNED') return 'planned'
  return 'cancelled'
}

function statusLabel(status) {
  if (status === 'ACTIVE') return '● Active'
  if (status === 'COMPLETED') return '✓ Completed'
  if (status === 'PLANNED') return '🗓 Planned'
  return '✕ Cancelled'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ height = '120px', radius = '14px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

// ─── TripTabs ─────────────────────────────────────────────────────────────────

function TripTabs({ active, onChange, hasActiveTrip }) {
  return (
    <div className="trips-tabs">
      <button
        className={`trips-tab${active === 'active' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('active')}
      >
        Active Trip
        {hasActiveTrip && <span className="trips-tab__dot" />}
      </button>
      <button
        className={`trips-tab${active === 'past' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('past')}
      >
        Past Trips
      </button>
      <button
        className={`trips-tab${active === 'planned' ? ' trips-tab--on' : ''}`}
        onClick={() => onChange('planned')}
      >
        Planned Trips
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
    <div className="trip-header-v2">
      <div className="trip-header-v2__top">
        <span className={`trip-status trip-status--${statusClass(trip.status)}`}>
          {statusLabel(trip.status)}
        </span>
      </div>

      <div>
        <p className="trip-header-v2__route">
          {trip.departurePoint}
          <span className="trip-header-v2__arrow"> → </span>
          {trip.targetArea}
        </p>
        {trip.vesselName && (
          <p className="trip-header-v2__vessel">{trip.vesselName}</p>
        )}
      </div>

      <div className="trip-header-v2__duration-block">
        <p className="trip-header-v2__duration-label">Trip Duration</p>
        <p className="trip-duration-hero">{duration}</p>
      </div>

      <div className="trip-header-v2__meta">
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

  const checkedCount = Object.values(values).filter(Boolean).length

  return (
    <div className="trips-card">
      <div className="trips-card__header">
        <span className="trips-card__title">🛡 Safety Checklist</span>
        <span className={`checklist-progress${checkedCount === 6 ? ' checklist-progress--full' : ''}`}>
          {checkedCount}/6
        </span>
      </div>
      <div className="trips-card__body">
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
        {dirty && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="trip-btn trip-btn--primary"
              disabled={saving}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save Checklist'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AddCatchForm ─────────────────────────────────────────────────────────────

function AddCatchForm({ tripId, token, species, onAdded, onCancel, prefill }) {
  const [search, setSearch]             = useState(prefill?.species?.commonName ?? '')
  const [selectedSpecies, setSelected]  = useState(prefill?.species ?? null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [estimate, setEstimate]         = useState(prefill?.quantityEstimate ?? '')
  const [quantity, setQuantity]         = useState(prefill?.quantityKg != null ? String(prefill.quantityKg) : '')
  const [price, setPrice]               = useState(prefill?.estimatedPricePerKg != null ? String(prefill.estimatedPricePerKg) : '')
  const [notes, setNotes]               = useState(prefill?.notes ?? '')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)

  const isEdit = !!prefill?.id
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
    if (!selectedSpecies) { setError('Please select a species'); return }
    if (!estimate.trim() && !quantity) { setError('Enter at least an estimate or kg amount'); return }
    if (quantity && Number(quantity) < 0.1) { setError('If entering kg, must be at least 0.1 kg'); return }
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        speciesId:           selectedSpecies.id,
        quantityEstimate:    estimate.trim() || null,
        quantityKg:          quantity ? Number(quantity) : null,
        estimatedPricePerKg: price ? Number(price) : null,
        notes:               notes.trim() || null,
      }
      if (isEdit) {
        await apiPut(`/trips/${tripId}/catches/${prefill.id}`, token, body)
      } else {
        await apiPost(`/trips/${tripId}/catches`, token, body)
      }
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
      <label className="trip-form__label">
        Estimate *
        <input
          className="trip-form__input"
          placeholder='"2 baskets", "3 bilog", "1 sack"'
          value={estimate}
          onChange={e => setEstimate(e.target.value)}
        />
      </label>
      <div className="catch-form__row">
        <label className="trip-form__label">
          Actual kg (optional)
          <input
            className="trip-form__input"
            type="number"
            min="0.1"
            step="0.01"
            placeholder="if known"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
        </label>
        <label className="trip-form__label">
          Price / kg (optional)
          <input
            className="trip-form__input"
            type="number"
            min="0"
            step="0.01"
            placeholder="₱"
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
          {submitting ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Catch')}
        </button>
      </div>
    </form>
  )
}

// ─── SettleCatchModal ─────────────────────────────────────────────────────────

function SettleCatchModal({ tripId, catchLog, token, onSettled, onClose }) {
  const [settledKg, setSettledKg]       = useState('')
  const [settledPrice, setSettledPrice] = useState('')
  const [vendorNote, setVendorNote]     = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!settledKg || Number(settledKg) <= 0) { setError('Enter actual weight'); return }
    if (!settledPrice || Number(settledPrice) < 0) { setError('Enter agreed price'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiPut(`/trips/${tripId}/catches/${catchLog.id}/settle`, token, {
        settledKg:          Number(settledKg),
        settledPricePerKg:  Number(settledPrice),
        settledWithVendorId: null,
      })
      onSettled()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const total = settledKg && settledPrice
    ? (Number(settledKg) * Number(settledPrice)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  return (
    <div className="confirm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box" style={{ maxWidth: '380px' }}>
        <p className="confirm-box__title">Settle Catch</p>
        <p className="confirm-box__msg" style={{ marginBottom: '4px' }}>
          {catchLog.species.commonName} · {catchLog.quantityEstimate || `${catchLog.quantityKg} kg`}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 16px' }}>
          BFAR Reference: ₱ — (available in Feature 2)
        </p>
        {error && <p style={{ color: '#FCA5A5', fontSize: '13px', margin: '0 0 8px' }}>{error}</p>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label className="trip-form__label">
            Actual weight (kg) *
            <input
              className="trip-form__input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 28.5"
              value={settledKg}
              onChange={e => setSettledKg(e.target.value)}
            />
          </label>
          <label className="trip-form__label">
            Agreed price / kg *
            <input
              className="trip-form__input"
              type="number"
              min="0"
              step="0.01"
              placeholder="₱ per kg"
              value={settledPrice}
              onChange={e => setSettledPrice(e.target.value)}
            />
          </label>
          <label className="trip-form__label">
            Sold to (optional)
            <input
              className="trip-form__input"
              placeholder="Vendor name or leave blank"
              value={vendorNote}
              onChange={e => setVendorNote(e.target.value)}
            />
          </label>
          {total && (
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#6EE7B7', margin: 0 }}>
              Total: ₱{total}
            </p>
          )}
          <div className="trip-form__actions">
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Settling…' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CatchCard ────────────────────────────────────────────────────────────────

function CatchCard({ catchLog, tripId, token, tripActive, species, onChanged }) {
  const [showSettle, setShowSettle] = useState(false)
  const [showEdit, setShowEdit]     = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [deleteErr, setDeleteErr]   = useState(null)

  async function handleDelete() {
    if (!window.confirm(`Delete ${catchLog.species.commonName} catch?`)) return
    setDeleting(true)
    setDeleteErr(null)
    try {
      await apiDelete(`/trips/${tripId}/catches/${catchLog.id}`, token)
      onChanged()
    } catch (err) {
      setDeleteErr(err.message)
      setDeleting(false)
    }
  }

  const settled = catchLog.isSettled

  return (
    <>
      <div className="catch-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="catch-card__species">{catchLog.species.commonName}</p>
            {catchLog.quantityEstimate && (
              <p className="catch-card__detail">"{catchLog.quantityEstimate}"</p>
            )}
            {catchLog.quantityKg != null && (
              <p className="catch-card__detail">{catchLog.quantityKg} kg</p>
            )}
            {catchLog.notes && (
              <p className="catch-card__detail" style={{ opacity: 0.6 }}>{catchLog.notes}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {settled ? (
              <span style={{
                fontSize: '11px', fontWeight: 600, color: '#6EE7B7',
                background: 'rgba(110,231,183,0.12)', borderRadius: '6px', padding: '2px 8px',
              }}>
                ✓ Settled
              </span>
            ) : (
              <span style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 8px',
              }}>
                Not settled
              </span>
            )}
          </div>
        </div>

        {settled && (
          <div style={{ fontSize: '13px', color: '#6EE7B7', paddingTop: '2px' }}>
            {catchLog.settledKg} kg × ₱{catchLog.settledPricePerKg}/kg
            {' '}= ₱{(catchLog.settledKg * catchLog.settledPricePerKg).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
        )}

        {deleteErr && (
          <p style={{ color: '#FCA5A5', fontSize: '12px', margin: 0 }}>{deleteErr}</p>
        )}

        {tripActive && (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {!settled && (
              <button
                className="trip-btn trip-btn--primary"
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={() => setShowSettle(true)}
              >
                Settle
              </button>
            )}
            <button
              className="trip-btn trip-btn--ghost"
              style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={() => setShowEdit(v => !v)}
            >
              Edit
            </button>
            <button
              className="trip-btn trip-btn--danger"
              style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        )}

        {showEdit && (
          <AddCatchForm
            tripId={tripId}
            token={token}
            species={species}
            prefill={catchLog}
            onAdded={() => { setShowEdit(false); onChanged() }}
            onCancel={() => setShowEdit(false)}
          />
        )}
      </div>

      {showSettle && (
        <SettleCatchModal
          tripId={tripId}
          catchLog={catchLog}
          token={token}
          onSettled={() => { setShowSettle(false); onChanged() }}
          onClose={() => setShowSettle(false)}
        />
      )}
    </>
  )
}

// ─── CatchLogsSection ─────────────────────────────────────────────────────────

function CatchLogsSection({ trip, token, species, catches, loading, error, onAdded, onRetry }) {
  const [showForm, setShowForm] = useState(false)
  const tripActive = trip.status === 'ACTIVE'

  return (
    <div className="trips-card">
      <div className="trips-card__header">
        <span className="trips-card__title">🐟 Catch Logs</span>
        {catches.length > 0 && (
          <span className="trips-card__count">{catches.length}</span>
        )}
      </div>
      <div className="trips-card__body">
        {loading && <Skeleton height="60px" />}
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
        {!loading && !error && catches.length === 0 && !showForm && (
          <p className="trips-card__empty">No catches logged yet.</p>
        )}
        {!loading && catches.length > 0 && (
          <div className="catch-list">
            {catches.map(c => (
              <CatchCard
                key={c.id}
                catchLog={c}
                tripId={trip.id}
                token={token}
                tripActive={tripActive}
                species={species}
                onChanged={onAdded}
              />
            ))}
          </div>
        )}
        {tripActive && (
          showForm ? (
            <AddCatchForm
              tripId={trip.id}
              token={token}
              species={species}
              onAdded={() => { setShowForm(false); onAdded() }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              className="trip-btn trip-btn--primary"
              style={{ fontSize: '13px', padding: '8px 18px', alignSelf: 'flex-start' }}
              onClick={() => setShowForm(true)}
            >
              + Add Catch
            </button>
          )
        )}
      </div>
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
    <div>
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

// ─── ActiveTripView ──────────────────────────────────────────────────────────

function ActiveTripView({ trip, token, species, catches, catchesLoading, catchesError,
  onTripStarted, onTripEnded, onChecklistSaved, onCatchAdded, onCatchesRetry }) {
  const [showModal, setShowModal] = useState(false)

  if (!trip) return (
    <>
      <div className="trip-empty">
        <span className="trip-empty__icon">⚓</span>
        <p className="trip-empty__msg">No active trip. Ready to set sail?</p>
        <button className="trip-empty__btn" onClick={() => setShowModal(true)}>
          Start New Trip
        </button>
      </div>
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
    <div className="trips-active-grid">
      <div className="trips-active-col">
        <TripHeaderCard trip={trip} />
        <EndTripButton tripId={trip.id} token={token} onEnded={onTripEnded} />
      </div>
      <div className="trips-active-col">
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
      </div>
    </div>
  )
}

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
        <div className="history-card__left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
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
                    <th>Estimate</th>
                    <th>Kg</th>
                    <th>Settlement</th>
                  </tr>
                </thead>
                <tbody>
                  {catches.map(c => (
                    <tr key={c.id}>
                      <td>{c.species.commonName}</td>
                      <td>{c.quantityEstimate || '—'}</td>
                      <td>{c.quantityKg != null ? `${c.quantityKg} kg` : '—'}</td>
                      <td>
                        {c.isSettled
                          ? <span style={{ color: '#6EE7B7' }}>
                              ✓ {c.settledKg}kg × ₱{c.settledPricePerKg}/kg
                            </span>
                          : <span style={{ color: 'rgba(255,255,255,0.35)' }}>Not settled</span>
                        }
                      </td>
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

function TripHistoryList({ trips, token, view }) {
  const completed = trips.filter(t => t.status === 'COMPLETED').length
  const cancelled = trips.filter(t => t.status === 'CANCELLED').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {view === 'past' ? (
        <div className="history-stats">
          <div className="history-stat">
            <p className="history-stat__val">{trips.length}</p>
            <p className="history-stat__label">Total</p>
          </div>
          <div className="history-stat history-stat--completed">
            <p className="history-stat__val">{completed}</p>
            <p className="history-stat__label">Completed</p>
          </div>
          <div className="history-stat">
            <p className="history-stat__val">{cancelled}</p>
            <p className="history-stat__label">Cancelled</p>
          </div>
        </div>
      ) : (
        <div className="history-stats">
          <div className="history-stat history-stat--planned">
            <p className="history-stat__val">{trips.length}</p>
            <p className="history-stat__label">Planned</p>
          </div>
        </div>
      )}
      {trips.length === 0 ? (
        <div className="trips-empty-history">
          <p>{view === 'planned' ? 'No planned trips. Use the Trip Planner to schedule one.' : 'No past trips yet.'}</p>
        </div>
      ) : (
        <div className="history-list">
          {trips.map(t => <TripHistoryCard key={t.id} trip={t} token={token} />)}
        </div>
      )}
    </div>
  )
}

// ─── MyTrips root ─────────────────────────────────────────────────────────────

export default function MyTrips({ token }) {
  const [activeTab, setActiveTab]           = useState('active')
  const [activeTrip, setActiveTrip]         = useState(null)
  const [pastTrips, setPastTrips]           = useState([])
  const [plannedTrips, setPlannedTrips]     = useState([])
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
      const [activeList, completed, cancelled, planned, species] = await Promise.all([
        apiGet('/trips?status=ACTIVE', token),
        apiGet('/trips?status=COMPLETED', token),
        apiGet('/trips?status=CANCELLED', token),
        apiGet('/trips?status=PLANNED', token),
        apiGet('/lookups/fish-species', token),
      ])
      const trip = activeList[0] ?? null
      setActiveTrip(trip)
      setPastTrips(
        [...completed, ...cancelled].sort((a, b) =>
          new Date(b.startedAt) - new Date(a.startedAt)
        )
      )
      setPlannedTrips(
        [...planned].sort((a, b) => b.id - a.id)
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
      <div className="trips-page-header">
        <div>
          <h2 className="trips-page-header__title">My Trips</h2>
          <p className="trips-page-header__sub">
            {pastTrips.length > 0
              ? `${pastTrips.length} past trip${pastTrips.length !== 1 ? 's' : ''} · ${plannedTrips.length} planned`
              : 'Track your fishing trips and catch logs'}
          </p>
        </div>
        {activeTrip && (
          <span className="trips-page-header__active-chip">● 1 trip active</span>
        )}
      </div>

      <TripTabs active={activeTab} onChange={setActiveTab} hasActiveTrip={!!activeTrip} />

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
      ) : activeTab === 'past' ? (
        <TripHistoryList trips={pastTrips} token={token} view="past" />
      ) : (
        <TripHistoryList trips={plannedTrips} token={token} view="planned" />
      )}
    </div>
  )
}
