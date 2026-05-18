import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTrips, startTrip, endTrip, saveChecklist, createCatchLog } from './api/trips'

// ── Safety checklist items ────────────────────────────────────────────────────

const SAFETY_ITEMS = [
  'Life jacket secured',
  'VHF radio functional',
  'Fuel sufficient',
  'Weather checked',
  'Float plan filed',
  'First aid kit on board',
]

// ── Trips Page ────────────────────────────────────────────────────────────────

export default function TripsPage({ setPage, activeTrip: _activeTripProp }) {
  const [modal, setModal] = useState(null)
  const [tripForm, setTripForm] = useState({
    departurePoint: '',
    targetArea: '',
    vesselName: '',
    notes: '',
  })
  const [createdTripId, setCreatedTripId] = useState(null)
  const [checkedItems, setCheckedItems] = useState([])
  const [formError, setFormError] = useState(null)

  const cardsRef = useRef(null)
  const qc = useQueryClient()

  const tripsQ = useQuery({
    queryKey: ['trips'],
    queryFn: () => listTrips(),
  })

  const trips = tripsQ.data ?? []

  // GSAP card stagger on mount / data load
  useEffect(() => {
    if (!cardsRef.current) return
    const cardEls = cardsRef.current.querySelectorAll('.f-card')
    if (cardEls.length === 0) return
    gsap.from(cardEls, { opacity: 0, y: 16, stagger: 0.04, duration: 0.2 })
  }, [trips.length])

  // GSAP modal entrance
  useEffect(() => {
    if (!modal) return
    gsap.fromTo('.f-modal-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.12 })
    gsap.fromTo('.f-modal', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' })
  }, [modal])

  const startMut = useMutation({
    mutationFn: () => startTrip(tripForm),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      setCreatedTripId(result.id)
      setCheckedItems([])
      setModal('checklist')
      setFormError(null)
    },
    onError: (e) => setFormError(e.message),
  })

  const checklistMut = useMutation({
    mutationFn: () => saveChecklist(createdTripId, { items: checkedItems }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      setModal(null)
      setTripForm({ departurePoint: '', targetArea: '', vesselName: '', notes: '' })
      setCreatedTripId(null)
      setCheckedItems([])
    },
    onError: (e) => setFormError(e.message),
  })

  const endMut = useMutation({
    mutationFn: (tripId) => endTrip(tripId, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })

  function toggleItem(item) {
    setCheckedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  function handleStartSubmit(e) {
    e.preventDefault()
    setFormError(null)
    startMut.mutate()
  }

  function handleChecklistConfirm() {
    setFormError(null)
    checklistMut.mutate()
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>My Trips</h2>
        <button
          className="f-btn f-btn--primary"
          onClick={() => {
            setFormError(null)
            setModal('start')
          }}
        >
          Start New Trip
        </button>
      </div>

      {/* Trip cards */}
      {tripsQ.isLoading && (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 16 }}>Loading trips…</div>
      )}

      {!tripsQ.isLoading && trips.length === 0 && (
        <div className="f-card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          No trips yet. Start your first trip above.
        </div>
      )}

      <div ref={cardsRef}>
        {trips.map((trip) => {
          const { id, departurePoint, targetArea, startedAt, endedAt, status } = trip
          const startLabel = startedAt
            ? new Date(startedAt).toLocaleString('en-PH', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
            : '—'
          const endLabel = endedAt
            ? new Date(endedAt).toLocaleString('en-PH', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
            : 'In progress'

          return (
            <div
              key={id}
              className="f-card"
              style={{ padding: 20, marginBottom: 12 }}
            >
              {/* Row 1: route + status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {departurePoint ?? '—'} → {targetArea ?? '—'}
                </span>
                <span
                  className={`f-chip ${status === 'ACTIVE' ? 'f-chip--lime' : 'f-chip--muted'}`}
                >
                  {status}
                </span>
                {status === 'ACTIVE' && <span className="pulse-dot" />}
              </div>

              {/* Row 2: timestamps */}
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)' }}>
                <span>Started: {startLabel}</span>
                <span>Ended: {endLabel}</span>
              </div>

              {/* End trip action for active trips */}
              {status === 'ACTIVE' && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="f-btn f-btn--danger f-btn--sm"
                    onClick={() => endMut.mutate(id)}
                    disabled={endMut.isPending}
                  >
                    {endMut.isPending ? 'Ending…' : 'End Trip'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="f-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div className="f-modal f-modal--wide">
            {/* Step 1: Start Trip form */}
            {modal === 'start' && (
              <>
                <div className="f-modal__title">Start New Trip</div>

                {formError && (
                  <p style={{ color: 'var(--unsafe, #e53e3e)', fontSize: 13, margin: '0 0 12px' }}>
                    {formError}
                  </p>
                )}

                <form onSubmit={handleStartSubmit}>
                  <div className="f-field">
                    <label className="f-label">Departure Point</label>
                    <input
                      className="f-input"
                      placeholder="e.g. San Juan Port"
                      value={tripForm.departurePoint}
                      onChange={(e) => setTripForm(f => ({ ...f, departurePoint: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="f-field">
                    <label className="f-label">Target Area</label>
                    <input
                      className="f-input"
                      placeholder="e.g. Manila Bay"
                      value={tripForm.targetArea}
                      onChange={(e) => setTripForm(f => ({ ...f, targetArea: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="f-field">
                    <label className="f-label">Vessel Name</label>
                    <input
                      className="f-input"
                      placeholder="e.g. Sta. Ana"
                      value={tripForm.vesselName}
                      onChange={(e) => setTripForm(f => ({ ...f, vesselName: e.target.value }))}
                    />
                  </div>

                  <div className="f-field">
                    <label className="f-label">Notes</label>
                    <input
                      className="f-input"
                      placeholder="Any additional notes…"
                      value={tripForm.notes}
                      onChange={(e) => setTripForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="f-btn f-btn--secondary"
                      onClick={() => setModal(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="f-btn f-btn--primary"
                      disabled={startMut.isPending}
                    >
                      {startMut.isPending ? 'Starting…' : 'Next'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Step 2: Safety checklist */}
            {modal === 'checklist' && (
              <>
                <div className="f-modal__title">Safety Checklist</div>

                {formError && (
                  <p style={{ color: 'var(--unsafe, #e53e3e)', fontSize: 13, margin: '0 0 12px' }}>
                    {formError}
                  </p>
                )}

                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 16px' }}>
                  Confirm all safety items before departing.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {SAFETY_ITEMS.map((item) => (
                    <label
                      key={item}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checkedItems.includes(item)}
                        onChange={() => toggleItem(item)}
                        style={{ width: 16, height: 16 }}
                      />
                      {item}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="f-btn f-btn--secondary"
                    onClick={() => setModal(null)}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className="f-btn f-btn--primary"
                    onClick={handleChecklistConfirm}
                    disabled={checklistMut.isPending}
                  >
                    {checklistMut.isPending ? 'Saving…' : 'Confirm & Go'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Named export preserved for AddCatchModal.test.jsx backward compatibility
export function AddCatchModal({ tripId, species, onSaved, onClose }) {
  const [speciesId, setSpeciesId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const saveMut = useMutation({
    mutationFn: () => createCatchLog(tripId, { speciesId: Number(speciesId), quantityKg: Number(quantity), pricePerKg: Number(price), notes }),
    onSuccess: () => { onSaved?.() },
  })

  const isValid = speciesId && Number(quantity) > 0 && Number(price) > 0

  return (
    <div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-species">Species</label>
        <select id="acm-species" className="f-input" value={speciesId} onChange={e => setSpeciesId(e.target.value)}>
          <option value="">Select…</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
        </select>
      </div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-qty">Quantity (kg)</label>
        <input id="acm-qty" className="f-input" type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
      </div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-price">Price per kg (₱)</label>
        <input id="acm-price" className="f-input" type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-notes">Notes</label>
        <input id="acm-notes" className="f-input" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="f-btn f-btn--secondary" onClick={onClose}>Cancel</button>
        <button className="f-btn f-btn--primary" disabled={!isValid || saveMut.isPending} onClick={() => saveMut.mutate()}>
          Save Catch
        </button>
      </div>
    </div>
  )
}
