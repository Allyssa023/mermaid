import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut } from './api'
import StartTripModal from './components/StartTripModal'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const AnchorIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/>
    <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
  </svg>
)

const FishIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/>
    <path d="M18 12h.01"/><path d="M6.5 12C4 12 2.5 13.5 2 16c1-1 2.5-1.5 4.5-1.5"/>
  </svg>
)

const ShieldIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const CheckIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', display: 'block' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const VesselIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1"/>
    <path d="M4 18V6l4-2 4 2 4-2 4 2v12"/>
  </svg>
)

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (status === 'ACTIVE')     return 'active'
  if (status === 'COMPLETED')  return 'completed'
  if (status === 'PLANNED')    return 'planned'
  return 'cancelled'
}

function statusLabel(status) {
  if (status === 'ACTIVE')    return 'Active'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'PLANNED')   return 'Planned'
  return 'Cancelled'
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ height = '120px', radius = '14px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

// ── TripTabs ──────────────────────────────────────────────────────────────────

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
        Planned
      </button>
    </div>
  )
}

// ── CHECKLIST_FIELDS ──────────────────────────────────────────────────────────

const CHECKLIST_FIELDS = [
  { key: 'fuelChecked',         label: 'Fuel' },
  { key: 'engineChecked',       label: 'Engine' },
  { key: 'radioChecked',        label: 'Radio' },
  { key: 'lifeVestChecked',     label: 'Life Vest' },
  { key: 'weatherReviewed',     label: 'Weather' },
  { key: 'emergencyKitChecked', label: 'Emergency Kit' },
]

// ── SafetyChecklistSection ────────────────────────────────────────────────────

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
  const allDone = checkedCount === 6
  const barPct = (checkedCount / 6) * 100

  return (
    <div className="trips-card">
      <div className="trips-card__header">
        <span className="trips-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldIcon size={16} /> Safety Checklist
        </span>
        <div className="trips-checklist-progress">
          <div className="trips-checklist-bar-wrap">
            <div
              className="trips-checklist-bar-fill"
              style={{
                width: `${barPct}%`,
                background: allDone ? 'var(--safe)' : checkedCount > 0 ? 'var(--caution)' : 'var(--border-2)',
              }}
            />
          </div>
          <span className={`trips-checklist-count${allDone ? ' trips-checklist-count--full' : ''}`}>
            {checkedCount}/6
          </span>
        </div>
      </div>
      <div className="trips-card__body">
        <div className="trips-pill-grid">
          {CHECKLIST_FIELDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`trips-pill${values[key] ? ' trips-pill--checked' : ''}`}
              onClick={() => toggle(key)}
            >
              <span className="trips-pill__box">
                {values[key] && <CheckIcon size={10} />}
              </span>
              {label}
            </button>
          ))}
        </div>
        {saveError && <p className="trip-err" style={{ marginTop: 10 }}>{saveError}</p>}
        {trip.checklist?.checklistCompletedAt && !dirty && (
          <p className="checklist-saved" style={{ marginTop: 8 }}>
            Saved {fmtDate(trip.checklist.checklistCompletedAt)}
          </p>
        )}
        {dirty && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="trip-btn trip-btn--primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save Checklist'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AddCatchForm ──────────────────────────────────────────────────────────────

function AddCatchForm({ tripId, token, species, onAdded, onCancel }) {
  const [search, setSearch]             = useState('')
  const [selectedSpecies, setSelected]  = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [estimate, setEstimate]         = useState('')
  const [kg, setKg]                     = useState('')
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
    if (!selectedSpecies) { setError('Please select a species'); return }
    if (!estimate.trim()) { setError('Please provide a quantity estimate (e.g. 2 baskets)'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiPost(`/trips/${tripId}/catches`, token, {
        speciesId:           selectedSpecies.id,
        quantityEstimate:    estimate.trim(),
        quantityKg:          kg ? Number(kg) : undefined,
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
      {error && <p className="trip-err">{error}</p>}
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
          Estimate (e.g. 2 baskets) *
          <input
            className="trip-form__input"
            type="text"
            placeholder="Weight or volume estimate"
            value={estimate}
            onChange={e => setEstimate(e.target.value)}
            required
          />
        </label>
        <label className="trip-form__label">
          Weight (kg) <span style={{ opacity: 0.5, fontSize: '11px' }}>optional</span>
          <input
            className="trip-form__input"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.01"
            placeholder="e.g. 12.5"
            value={kg}
            onChange={e => setKg(e.target.value)}
          />
        </label>
      </div>
      <label className="trip-form__label">
        Price / kg <span style={{ opacity: 0.5, fontSize: '11px' }}>optional</span>
        <input
          className="trip-form__input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="₱ per kg"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
      </label>
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

// ── SettleCatchModal ──────────────────────────────────────────────────────────

function SettleCatchModal({ tripId, catchLog, token, onSettled, onCancel }) {
  const [kg, setKg]           = useState('')
  const [price, setPrice]     = useState('')
  const [buyer, setBuyer]     = useState('')
  const [submitting, setSub]  = useState(false)
  const [error, setError]     = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!kg || Number(kg) < 0.1) { setError('Weight must be at least 0.1'); return }
    if (!price || Number(price) < 0) { setError('Invalid price'); return }
    setSub(true)
    setError(null)
    try {
      await apiPut(`/trips/${tripId}/catches/${catchLog.id}/settle`, token, {
        settledKg:          Number(kg),
        settledPricePerKg:  Number(price),
        buyerName:          buyer.trim() || null,
      })
      onSettled()
    } catch (err) {
      setError(err.message)
    } finally {
      setSub(false)
    }
  }

  const total = kg && price ? (Number(kg) * Number(price)).toLocaleString('en-PH') : null

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Settle Catch</h3>
          <button className="modal__close" onClick={onCancel}><XIcon /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{catchLog.species?.commonName ?? catchLog.species}</div>
            <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
              Estimated: {catchLog.quantityEstimate || `${catchLog.quantityKg} kg`}
            </div>
          </div>
          {error && <p className="trip-err">{error}</p>}
          <div className="trip-form__group">
            <label className="trip-form__label">Actual weight (kg) *</label>
            <input className="trip-form__input" type="number" inputMode="decimal" min="0.1" step="0.01" value={kg} onChange={e => setKg(e.target.value)} required />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Agreed price / kg *</label>
            <input className="trip-form__input" type="number" inputMode="decimal" min="0" step="0.01" placeholder="₱" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
          {total && (
            <div style={{ background: 'var(--safe-dim)', border: '1px solid var(--safe-border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: 13, color: 'var(--safe)', fontWeight: 700 }}>
              Total: ₱{total}
            </div>
          )}
          <div className="trip-form__group">
            <label className="trip-form__label">Sold to (vendor name)</label>
            <input className="trip-form__input" type="text" placeholder="e.g. Aling Nena" value={buyer} onChange={e => setBuyer(e.target.value)} />
          </div>
          <div className="trip-form__actions" style={{ marginTop: 4 }}>
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onCancel} disabled={submitting}>Cancel</button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CatchLogsSection ──────────────────────────────────────────────────────────

function CatchLogsSection({ trip, token, species, catches, loading, error, onAdded, onRetry }) {
  const [showForm, setShowForm]     = useState(false)
  const [settleCatch, setSettle]    = useState(null)

  return (
    <div className="trips-card">
      <div className="trips-card__header">
        <span className="trips-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FishIcon size={16} /> Catch Logs
        </span>
        {catches.length > 0 && <span className="trips-card__count">{catches.length}</span>}
      </div>
      <div className="trips-card__body">
        {loading && <Skeleton height="60px" />}
        {error && (
          <div className="trip-err" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {error}
            <button className="trip-btn trip-btn--ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onRetry}>Retry</button>
          </div>
        )}
        {!loading && !error && catches.length === 0 && !showForm && (
          <p className="trips-card__empty">No catches logged yet.</p>
        )}
        {!loading && catches.length > 0 && (
          <div className="catch-log-list">
            {catches.map(c => (
              <div key={c.id} className="catch-log-item">
                <div className="catch-log-item__left">
                  <div className="catch-log-item__fish-icon"><FishIcon size={14} /></div>
                  <div>
                    <p className="catch-log-item__species">{c.species?.commonName ?? c.species}</p>
                    <p className="catch-log-item__qty">{c.quantityEstimate || `${c.quantityKg} kg`}</p>
                  </div>
                </div>
                <div className="catch-log-item__right">
                  {c.isSettled ? (
                    <>
                      <span className="catch-log-item__settled-total">
                        ₱{(c.settledKg * c.settledPricePerKg).toLocaleString('en-PH')}
                      </span>
                      <span className="catch-log-item__settled-detail">
                        {c.settledKg}kg × ₱{c.settledPricePerKg}
                      </span>
                    </>
                  ) : trip.status === 'COMPLETED' ? (
                    <button className="trip-btn trip-btn--ghost" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => setSettle(c)}>
                      Settle
                    </button>
                  ) : (
                    <>
                      <span className="catch-log-item__bfar">BFAR ₱—/kg</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Unsettled</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {showForm ? (
          <div style={{ marginTop: 12 }}>
            <AddCatchForm
              tripId={trip.id}
              token={token}
              species={species}
              onAdded={() => { setShowForm(false); onAdded() }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : (
          <button
            className="trip-btn trip-btn--primary"
            style={{ fontSize: '13px', padding: '8px 18px', alignSelf: 'flex-start', marginTop: catches.length > 0 ? 12 : 0 }}
            onClick={() => setShowForm(true)}
          >
            + Add Catch
          </button>
        )}
        {settleCatch && (
          <SettleCatchModal
            tripId={trip.id}
            catchLog={settleCatch}
            token={token}
            onSettled={() => { setSettle(null); onAdded() }}
            onCancel={() => setSettle(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── EndTripButton ─────────────────────────────────────────────────────────────

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
    <>
      <button className="trip-end-btn" onClick={() => setShowConfirm(true)}>
        <AlertTriangleIcon /> End Trip
      </button>
      {showConfirm && (
        <div className="confirm-overlay" onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="confirm-box">
            <p className="confirm-box__title">End this trip?</p>
            <p className="confirm-box__msg">
              This will mark the trip as completed. You won't be able to add more catches after ending.
            </p>
            {error && <p className="trip-err">{error}</p>}
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
              <button className="trip-btn trip-btn--ghost" onClick={() => { setShowConfirm(false); setError(null) }} disabled={ending}>
                Cancel
              </button>
              <button className="trip-btn trip-btn--danger" onClick={confirmEnd} disabled={ending}>
                {ending ? 'Ending…' : 'Confirm End Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── ActiveTripView ────────────────────────────────────────────────────────────

function TripHeroCard({ trip }) {
  const [duration, setDuration] = useState(fmtDuration(trip.startedAt))

  useEffect(() => {
    const id = setInterval(() => setDuration(fmtDuration(trip.startedAt)), 1000)
    return () => clearInterval(id)
  }, [trip.startedAt])

  return (
    <div className="trips-hero">
      <div className="trips-hero__top">
        <div>
          <div className="trips-hero__live">
            <span className="trips-hero__pulse" />
            Live
          </div>
          <div className="trips-hero__route" style={{ marginTop: 8 }}>
            {trip.departurePoint}
            <span className="trips-hero__arrow">→</span>
            {trip.targetArea}
          </div>
          {trip.vesselName && (
            <div className="trips-hero__vessel">
              <VesselIcon /> {trip.vesselName}
            </div>
          )}
        </div>
        <div className="trips-hero__timer-block">
          <p className="trips-hero__timer-label">Trip Duration</p>
          <p className="trips-hero__timer">{duration}</p>
        </div>
      </div>
      <div className="trips-hero__meta">
        <div className="trips-hero__meta-item">
          <span className="trips-hero__meta-label">Started</span>
          <span className="trips-hero__meta-value">{fmtDate(trip.startedAt)}</span>
        </div>
        {trip.notes && (
          <div className="trips-hero__meta-item">
            <span className="trips-hero__meta-label">Notes</span>
            <span className="trips-hero__meta-value">{trip.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ActiveTripView({ trip, token, species, catches, catchesLoading, catchesError,
  onTripStarted, onTripEnded, onChecklistSaved, onCatchAdded, onCatchesRetry }) {
  const [showModal, setShowModal] = useState(false)

  if (!trip) return (
    <>
      <div className="trips-empty-hero">
        <div className="trips-empty-hero__icon"><AnchorIcon /></div>
        <p className="trips-empty-hero__title">No Active Trip</p>
        <p className="trips-empty-hero__sub">Ready to set sail? Start a new trip below.</p>
        <button className="trip-btn trip-btn--primary" style={{ fontSize: '14px', padding: '10px 28px' }} onClick={() => setShowModal(true)}>
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
        <TripHeroCard trip={trip} />
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

// ── TripHistoryCard ───────────────────────────────────────────────────────────

function TripHistoryCard({ trip, token }) {
  const [open, setOpen]           = useState(false)
  const [catches, setCatches]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [fetched, setFetched]     = useState(false)
  const [settleCatch, setSettle]  = useState(null)

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
    <div className="history-card" style={{ flexDirection: 'column', padding: 0, gap: 0 }}>
      <button className="history-card__summary" onClick={expand}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
        <div className="history-card__left">
          <span className="history-card__route">{trip.departurePoint} → {trip.targetArea}</span>
          <span className="history-card__sub">
            {trip.vesselName && `${trip.vesselName} · `}
            {fmtDate(trip.startedAt)}
            {trip.endedAt && ` – ${fmtDate(trip.endedAt)}`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span className={`trip-status trip-status--${statusClass(trip.status)}`}>
            {statusLabel(trip.status)}
          </span>
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && (
        <div className="history-card__detail" style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p className="history-section-title">Safety Checklist</p>
            {cl ? (
              <div className="history-checklist" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CHECKLIST_FIELDS.map(({ key, label }) => (
                  <span key={key} className={`trip-status ${cl[key] ? 'trip-status--active' : 'trip-status--ended'}`}>
                    {cl[key] ? <CheckIcon size={10} /> : null} {label}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No checklist recorded.</p>
            )}
          </div>

          <div>
            <p className="history-section-title">Catch Logs</p>
            {loading && <Skeleton height="60px" />}
            {error && (
              <div className="trip-err" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {error}
                <button className="trip-btn trip-btn--ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={fetchCatches}>Retry</button>
              </div>
            )}
            {!loading && !error && catches.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No catches logged.</p>
            )}
            {!loading && catches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catches.map(c => (
                  <div key={c.id} className="catch-log-item">
                    <div className="catch-log-item__left">
                      <div className="catch-log-item__fish-icon"><FishIcon size={14} /></div>
                      <div>
                        <p className="catch-log-item__species">{c.species?.commonName ?? c.species}</p>
                        <p className="catch-log-item__qty">{c.quantityEstimate || `${c.quantityKg} kg`}</p>
                      </div>
                    </div>
                    <div className="catch-log-item__right">
                      {c.isSettled ? (
                        <>
                          <span className="catch-log-item__settled-total">
                            ₱{(c.settledKg * c.settledPricePerKg).toLocaleString('en-PH')}
                          </span>
                          <span className="catch-log-item__settled-detail">{c.settledKg}kg × ₱{c.settledPricePerKg}{c.buyerName ? ` · ${c.buyerName}` : ''}</span>
                        </>
                      ) : trip.status === 'COMPLETED' ? (
                        <button className="trip-btn trip-btn--ghost" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => setSettle(c)}>
                          Settle
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Unsettled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {settleCatch && (
            <SettleCatchModal
              tripId={trip.id}
              catchLog={settleCatch}
              token={token}
              onSettled={() => { setSettle(null); fetchCatches() }}
              onCancel={() => setSettle(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── TripHistoryList ───────────────────────────────────────────────────────────

function TripHistoryList({ trips, token, view }) {
  const completed = trips.filter(t => t.status === 'COMPLETED').length
  const cancelled = trips.filter(t => t.status === 'CANCELLED').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="history-stats">
        {view === 'past' ? (
          <>
            <div className="history-stat">
              <p className="history-stat__val">{trips.length}</p>
              <p className="history-stat__label">Total</p>
            </div>
            <div className="history-stat history-stat--completed">
              <p className="history-stat__val">{completed}</p>
              <p className="history-stat__label">Completed</p>
            </div>
            <div className="history-stat">
              <p className="history-stat__val" style={{ color: cancelled > 0 ? 'var(--unsafe)' : 'var(--text-1)' }}>{cancelled}</p>
              <p className="history-stat__label">Cancelled</p>
            </div>
          </>
        ) : (
          <div className="history-stat history-stat--planned">
            <p className="history-stat__val">{trips.length}</p>
            <p className="history-stat__label">Planned</p>
          </div>
        )}
      </div>

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

// ── MyTrips root ──────────────────────────────────────────────────────────────

// ── Trips Right Panel ─────────────────────────────────────────────────────────

function TripsPanel({ activeTrip, pastTrips, plannedTrips, catches }) {
  const completed = pastTrips.filter(t => t.status === 'COMPLETED').length
  const cancelled  = pastTrips.filter(t => t.status === 'CANCELLED').length

  return (
    <aside className="trips-panel">
      {activeTrip && (
        <div className="trips-panel-card trips-panel-card--live">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--safe)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--safe)', animation: 'live-pulse 2s infinite', display: 'inline-block' }} />
            Trip Active
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', lineHeight: 1.4 }}>
            {activeTrip.departurePoint}
            <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>→</span>
            {activeTrip.targetArea}
          </div>
          {activeTrip.vesselName && (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{activeTrip.vesselName}</div>
          )}
          {catches.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--safe)' }}>
              {catches.length} catch log{catches.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      <div className="trips-panel-card">
        <div className="trips-panel-card__title">Trip Stats</div>
        <div className="trips-panel-stat">
          <span>Completed</span>
          <span className="trips-panel-stat__val" style={{ color: 'var(--safe)' }}>{completed}</span>
        </div>
        <div className="trips-panel-stat">
          <span>Planned</span>
          <span className="trips-panel-stat__val" style={{ color: 'var(--accent)' }}>{plannedTrips.length}</span>
        </div>
        <div className="trips-panel-stat">
          <span>Cancelled</span>
          <span className="trips-panel-stat__val" style={{ color: 'var(--text-3)' }}>{cancelled}</span>
        </div>
        <div className="trips-panel-stat">
          <span>Total past</span>
          <span className="trips-panel-stat__val">{pastTrips.length}</span>
        </div>
      </div>

      <div className="trips-panel-card">
        <div className="trips-panel-card__title">Pro Tip</div>
        <p className="trips-panel-tip">
          Log catch weights during your trip so vendors see accurate quantities when you send catch alerts.
        </p>
      </div>
    </aside>
  )
}

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
        [...completed, ...cancelled].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      )
      setPlannedTrips([...planned].sort((a, b) => b.id - a.id))
      setFishSpecies(species)
      if (trip) loadCatches(trip.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, loadCatches])

  useEffect(() => { load() }, [load])

  function handleChecklistSaved(updatedChecklist) {
    setActiveTrip(t => ({ ...t, checklist: updatedChecklist }))
  }

  function handleCatchAdded() {
    if (activeTrip) loadCatches(activeTrip.id)
  }

  if (loading) return (
    <div className="trips-page">
      <div className="trips-main">
        <Skeleton height="40px" radius="12px" />
        <Skeleton height="180px" />
        <Skeleton height="120px" />
      </div>
    </div>
  )

  if (error) return (
    <div className="trips-page">
      <div className="trips-main">
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error__retry" onClick={load}>Retry</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="trips-page">
      <div className="trips-main">
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
            <span className="trips-page-header__active-chip">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--safe)', display: 'inline-block', marginRight: 5 }} />
              1 trip active
            </span>
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
            onTripStarted={load}
            onTripEnded={load}
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

      <TripsPanel
        activeTrip={activeTrip}
        pastTrips={pastTrips}
        plannedTrips={plannedTrips}
        catches={catches}
      />
    </div>
  )
}
