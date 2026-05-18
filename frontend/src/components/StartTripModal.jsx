import { useState, useMemo } from 'react'
import { apiPost, apiPut } from '../api'
import { I } from '../icons'

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
    if (!municipality) { setError('Please select a municipality'); return }
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
        departurePoint: departurePoint ? `${departurePoint}, ${municipality}` : municipality || null,
        targetArea:     targetArea || null,
        vesselName:     vesselName.trim() || null,
        notes:          notes.trim() || null,
        status:         initialStatus,
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
    <div className="f-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="f-modal f-modal--wide">

        {/* Header */}
        <div className="f-modal__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {isPlanned ? 'Schedule Trip' : 'Start a Trip'}
            {!isPlanned && (
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                Step {step} of {totalSteps} — {step === 1 ? 'Trip Details' : 'Safety Checklist'}
              </div>
            )}
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', padding: 4 }} onClick={onClose}><I.X size={16} /></button>
        </div>

        {/* ── Step 1: Trip Details ── */}
        {step === 1 && (
          <form onSubmit={isPlanned ? submit : handleNext}>
            {error && <p style={{ color: 'var(--unsafe)', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

            <div className="f-field">
              <label className="f-label">Municipality *</label>
              <select className="f-input" value={municipality} onChange={e => handleMunicipalityChange(e.target.value)} required>
                <option value="">Select municipality…</option>
                {LA_UNION_DATA.map(m => <option key={m.municipality} value={m.municipality}>{m.municipality}</option>)}
              </select>
            </div>

            <div className="f-field">
              <label className="f-label">Departure Point</label>
              <select className="f-input" value={departurePoint} onChange={e => setDeparturePoint(e.target.value)} disabled={!municipality}>
                <option value="">{municipality ? 'Select departure point… (optional)' : 'Select municipality first'}</option>
                {departureOptions.map(dp => <option key={dp} value={dp}>{dp}</option>)}
              </select>
            </div>

            <div className="f-field">
              <label className="f-label">Target Area</label>
              <select className="f-input" value={targetArea} onChange={e => setTargetArea(e.target.value)} disabled={!municipality}>
                <option value="">{municipality ? 'Select target area… (optional)' : 'Select municipality first'}</option>
                {targetOptions.map(ta => <option key={ta} value={ta}>{ta}</option>)}
              </select>
            </div>

            <div className="f-field">
              <label className="f-label">Vessel Name</label>
              <input className="f-input" placeholder="e.g. M/B Ligaya" value={vesselName} onChange={e => setVesselName(e.target.value)} maxLength={100} />
            </div>

            <div className="f-field">
              <label className="f-label">Notes</label>
              <textarea className="f-input" style={{ resize: 'vertical', minHeight: 80 }} placeholder="Any notes for this trip…" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn--lime" disabled={submitting}>
                {isPlanned ? (submitting ? 'Scheduling…' : 'Schedule Trip') : 'Next: Safety Check →'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Safety Checklist ── */}
        {step === 2 && (
          <form onSubmit={submit}>
            {error && <p style={{ color: 'var(--unsafe)', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

            <p style={{ fontSize: '13px', color: 'var(--ink-3)', margin: '0 0 16px' }}>
              Confirm all safety items are in order before departing. All items must be checked.
            </p>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--hairline-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(checkedCount / CHECKLIST_FIELDS.length) * 100}%`, background: allChecked ? 'var(--safe)' : 'var(--accent-lime)', borderRadius: 99, transition: 'width 0.3s ease, background 0.3s ease' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: allChecked ? 'var(--safe)' : 'var(--ink-3)' }}>
                {checkedCount}/{CHECKLIST_FIELDS.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
              {CHECKLIST_FIELDS.map(({ key, label, desc }) => {
                const on = checklist[key]
                return (
                  <div key={key} className={`f-checklist-item${on ? ' f-checklist-item--on' : ''}`} onClick={() => toggleCheck(key)} style={{ cursor: 'pointer' }}>
                    <div className="f-checklist-item__box">{on && <I.Check size={10} />}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--ink-1)' : 'var(--ink-2)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {!allChecked && (
              <p style={{ fontSize: '12px', color: 'var(--unsafe)', background: 'var(--unsafe-soft)', padding: '8px 12px', borderRadius: 6, margin: '0 0 20px' }}>
                ⚠ Complete all {CHECKLIST_FIELDS.length} safety checks to enable departure.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--ghost" onClick={() => { setStep(1); setError(null) }} disabled={submitting}>
                ← Back
              </button>
              <button type="submit" className="btn btn--lime" disabled={submitting || !allChecked} style={{ opacity: allChecked ? 1 : 0.45 }}>
                {submitting ? 'Starting…' : 'Start Trip'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
