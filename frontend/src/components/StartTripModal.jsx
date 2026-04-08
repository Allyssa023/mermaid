import { useState, useMemo } from 'react'
import { apiPost, apiPut } from '../api'

// ── La Union Municipality → Departure Points → Target Areas reference data ──
const LA_UNION_DATA = [
  {
    municipality: 'Agoo',
    departurePoints: ['Sta. Rita Central', 'Sta. Rita West', 'Sta. Rita Sur', 'San Francisco', 'San Agustin East'],
    targetAreas: ['Lingayen Gulf off Agoo', 'Sta. Rita–Gumacbao nearshore zone'],
  },
  {
    municipality: 'Aringay',
    departurePoints: ['Samara', 'Sta. Lucia', 'San Antonio', 'San Simon East', 'San Simon West', 'Pangao-aoan East', 'Pangao-aoan West', 'Sta. Cecilia', 'Sto. Rosario East', 'Sto. Rosario West', 'Sta. Rita East', 'Sta. Rita West'],
    targetAreas: ['Lingayen Gulf off Aringay', 'Aringay communal-water belt', 'Samara nearshore fishing area'],
  },
  {
    municipality: 'Caba',
    departurePoints: ['San Carlos', 'Santiago Norte', 'Santiago Sur', 'Wenceslao'],
    targetAreas: ['Lingayen Gulf off Caba', 'Caba River mouth', 'Antaguing River mouth'],
  },
  {
    municipality: 'Santo Tomas',
    departurePoints: ['Damortis', 'Balaoc', 'Baybay', 'Cupang', 'Casilagan', 'Raois', 'Ubagan'],
    targetAreas: ['Lingayen Gulf off Santo Tomas', 'Ilocos Coast off Santo Tomas', 'Raois nearshore waters', 'Capengpeng River area', 'Casilagan River area'],
  },
  {
    municipality: 'Rosario',
    departurePoints: ['Bani', 'Damortis', 'Rabon'],
    targetAreas: ['Southern Lingayen Gulf', 'Agoo–Damortis coastal zone', 'Rosario nearshore fishing grounds'],
  },
  {
    municipality: 'Bauang',
    departurePoints: ['Pudoc', 'Baccuit', 'Bauang town-center coast'],
    targetAreas: ['Bauang nearshore coast', 'Bauang River mouth'],
  },
  {
    municipality: 'City of San Fernando',
    departurePoints: ['Ilocanos Sur Community Fish Landing Center'],
    targetAreas: ['San Fernando coastal waters', 'West Philippine Sea side off San Fernando'],
  },
  {
    municipality: 'San Juan',
    departurePoints: ['Urbiztondo', 'Ili Norte', 'Ili Sur', 'Santo Rosario', 'Taboc', 'Santa Rosa'],
    targetAreas: ['San Juan nearshore coast', 'Western beach corridor off San Juan'],
  },
  {
    municipality: 'Bacnotan',
    departurePoints: ['Baroro', 'Poblacion coast', 'Paratong coast'],
    targetAreas: ['Baroro River mouth', 'Bacnotan nearshore waters'],
  },
  {
    municipality: 'Balaoan',
    departurePoints: ['Paraoir', 'Almeida'],
    targetAreas: ['Balaoan north coastal nearshore waters', 'Paraoir–Almeida fishing grounds', 'Sea-urchin grounds'],
  },
  {
    municipality: 'Bangar',
    departurePoints: ['Bangar coastal barangays', 'Amburayan River mouth'],
    targetAreas: ['Bangar coastal waters', 'Amburayan estuary', 'Amburayan river mouth zone'],
  },
  {
    municipality: 'Luna',
    departurePoints: ['Darigayos', 'Oaqui', 'Rimos coastal belt', 'Luna Community Fish Landing Center'],
    targetAreas: ['Luna nearshore waters', 'Darigayos–Oaqui fishing grounds', 'Northern coastal fishing grounds'],
  },
]

const CHECKLIST_FIELDS = [
  { key: 'fuelChecked',         label: 'Fuel',          desc: 'Sufficient fuel for the entire trip' },
  { key: 'engineChecked',       label: 'Engine',        desc: 'Engine checked and running properly' },
  { key: 'radioChecked',        label: 'Radio / Comms', desc: 'Communication radio is operational' },
  { key: 'lifeVestChecked',     label: 'Life Vests',    desc: 'Life vests available for all crew' },
  { key: 'weatherReviewed',     label: 'Weather',       desc: 'Current weather forecast reviewed' },
  { key: 'emergencyKitChecked', label: 'Emergency Kit', desc: 'Emergency kit and first-aid on board' },
]

export default function StartTripModal({ token, initialDate, initialStatus = 'ACTIVE', onCreated, onClose }) {
  const isPlanned = initialStatus === 'PLANNED'

  // Step 1 — trip details
  const [municipality, setMunicipality]     = useState('')
  const [departurePoint, setDeparturePoint] = useState('')
  const [targetArea, setTargetArea]         = useState('')
  const [vesselName, setVesselName]         = useState('')
  const [notes, setNotes]                   = useState('')

  // Step 2 — safety checklist (only for ACTIVE trips)
  const [step, setStep] = useState(1)
  const [checklist, setChecklist] = useState({
    fuelChecked:         false,
    engineChecked:       false,
    radioChecked:        false,
    lifeVestChecked:     false,
    weatherReviewed:     false,
    emergencyKitChecked: false,
  })

  const [error, setError]         = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedMuni     = useMemo(() => LA_UNION_DATA.find(m => m.municipality === municipality) || null, [municipality])
  const departureOptions = selectedMuni?.departurePoints ?? []
  const targetOptions    = selectedMuni?.targetAreas ?? []
  const checkedCount     = Object.values(checklist).filter(Boolean).length
  const allChecked       = checkedCount === CHECKLIST_FIELDS.length

  function handleMunicipalityChange(val) {
    setMunicipality(val)
    setDeparturePoint('')
    setTargetArea('')
  }

  function toggleCheck(key) {
    setChecklist(c => ({ ...c, [key]: !c[key] }))
  }

  // Validate step 1 and advance to checklist step
  function handleNext(e) {
    e.preventDefault()
    setError(null)
    if (!municipality)   { setError('Please select a municipality'); return }
    if (!departurePoint) { setError('Please select a departure point'); return }
    if (!targetArea)     { setError('Please select a target area'); return }
    setStep(2)
  }

  async function submit(e) {
    e.preventDefault()
    if (!isPlanned && !allChecked) {
      setError('Please complete the entire safety checklist before starting.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        departurePoint: `${departurePoint}, ${municipality}`,
        targetArea,
        vesselName: vesselName.trim() || null,
        notes:      notes.trim() || null,
        status:     initialStatus,
      }
      if (initialDate) payload.startedAt = initialDate.toISOString()

      const trip = await apiPost('/trips', token, payload)

      // Save checklist immediately for active trips
      if (!isPlanned && trip?.id) {
        await apiPut(`/trips/${trip.id}/checklist`, token, checklist)
      }

      onCreated()
    } catch (err) {
      setError(err.message)
      // If error happened on step 2, stay on step 2
    } finally {
      setSubmitting(false)
    }
  }

  const totalSteps = isPlanned ? 1 : 2

  return (
    <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="trip-modal">

        {/* Header */}
        <div className="trip-modal__header">
          <div>
            <h2 className="trip-modal__title">
              {isPlanned ? 'Schedule Trip' : 'Start a Trip'}
            </h2>
            {!isPlanned && (
              <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Step {step} of {totalSteps} — {step === 1 ? 'Trip Details' : 'Safety Checklist'}
              </p>
            )}
          </div>
          <button className="trip-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator (active trips only) */}
        {!isPlanned && (
          <div style={{ display: 'flex', gap: 0, margin: '0 0 20px', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-2)' }}>
            {['Trip Details', 'Safety Check'].map((label, i) => {
              const s = i + 1
              const done = step > s
              const active = step === s
              return (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    background: active ? 'var(--accent-dim)' : done ? 'rgba(0,229,160,0.08)' : 'transparent',
                    borderRight: i === 0 ? '1px solid var(--border-2)' : 'none',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700,
                    background: active ? 'var(--accent)' : done ? 'var(--safe)' : 'var(--border-2)',
                    color: active || done ? '#fff' : 'var(--text-3)',
                  }}>
                    {done ? '✓' : s}
                  </span>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: active ? 'var(--accent)' : done ? 'var(--safe)' : 'var(--text-3)',
                  }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {isPlanned && initialDate && (
          <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>
            Scheduling for <strong>{initialDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
          </p>
        )}

        {/* ── Step 1: Trip Details ── */}
        {step === 1 && (
          <form className="trip-form" onSubmit={isPlanned ? submit : handleNext}>
            {error && <p style={{ color: '#FCA5A5', fontSize: '13px', margin: 0 }}>{error}</p>}

            <label className="trip-form__label">
              Municipality *
              <select
                className="trip-form__input"
                value={municipality}
                onChange={e => handleMunicipalityChange(e.target.value)}
                required
              >
                <option value="">Select municipality…</option>
                {LA_UNION_DATA.map(m => (
                  <option key={m.municipality} value={m.municipality}>{m.municipality}</option>
                ))}
              </select>
            </label>

            <label className="trip-form__label">
              Departure Point *
              <select
                className="trip-form__input"
                value={departurePoint}
                onChange={e => setDeparturePoint(e.target.value)}
                disabled={!municipality}
                required
              >
                <option value="">{municipality ? 'Select departure point…' : 'Select municipality first'}</option>
                {departureOptions.map(dp => (
                  <option key={dp} value={dp}>{dp}</option>
                ))}
              </select>
            </label>

            <label className="trip-form__label">
              Target Area *
              <select
                className="trip-form__input"
                value={targetArea}
                onChange={e => setTargetArea(e.target.value)}
                disabled={!municipality}
                required
              >
                <option value="">{municipality ? 'Select target area…' : 'Select municipality first'}</option>
                {targetOptions.map(ta => (
                  <option key={ta} value={ta}>{ta}</option>
                ))}
              </select>
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
                {isPlanned
                  ? (submitting ? 'Scheduling…' : 'Schedule Trip')
                  : 'Next: Safety Check →'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Safety Checklist ── */}
        {step === 2 && (
          <form className="trip-form" onSubmit={submit}>
            {error && <p style={{ color: '#FCA5A5', fontSize: '13px', margin: 0 }}>{error}</p>}

            <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 4px', lineHeight: 1.5 }}>
              Confirm all safety items are in order before departing. All items must be checked.
            </p>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--border-2)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(checkedCount / CHECKLIST_FIELDS.length) * 100}%`,
                  background: allChecked ? 'var(--safe)' : 'var(--accent)',
                  borderRadius: 99,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
                color: allChecked ? 'var(--safe)' : 'var(--text-3)',
              }}>
                {checkedCount}/{CHECKLIST_FIELDS.length}
              </span>
            </div>

            <div className="checklist-grid" style={{ marginTop: 8 }}>
              {CHECKLIST_FIELDS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className={`checklist-item${checklist[key] ? ' checklist-item--checked' : ''}`}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={() => toggleCheck(key)}
                    style={{ display: 'none' }}
                  />
                  <span style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${checklist[key] ? 'var(--safe)' : 'var(--border-2)'}`,
                    background: checklist[key] ? 'var(--safe)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#061220', fontSize: '11px', fontWeight: 900,
                    transition: 'all 0.15s ease',
                  }}>
                    {checklist[key] && '✓'}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: checklist[key] ? 'var(--text-1)' : 'var(--text-2)' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 1 }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {!allChecked && (
              <p style={{ fontSize: '12px', color: 'rgba(255,183,39,0.85)', background: 'rgba(255,183,39,0.08)', border: '1px solid rgba(255,183,39,0.2)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                ⚠ Complete all {CHECKLIST_FIELDS.length} safety checks to enable departure.
              </p>
            )}

            <div className="trip-form__actions">
              <button
                type="button"
                className="trip-btn trip-btn--ghost"
                onClick={() => { setStep(1); setError(null) }}
                disabled={submitting}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="trip-btn trip-btn--primary"
                disabled={submitting || !allChecked}
                style={{ opacity: allChecked ? 1 : 0.45 }}
              >
                {submitting ? 'Starting…' : 'Start Trip'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
