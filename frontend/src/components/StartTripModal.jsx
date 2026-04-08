import { useState, useMemo } from 'react'
import { apiPost } from '../api'

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

export default function StartTripModal({ token, initialDate, initialStatus = 'ACTIVE', onCreated, onClose }) {
  const [municipality, setMunicipality]     = useState('')
  const [departurePoint, setDeparturePoint] = useState('')
  const [targetArea, setTargetArea]         = useState('')
  const [vesselName, setVesselName]         = useState('')
  const [notes, setNotes]                   = useState('')
  const [error, setError]                   = useState(null)
  const [submitting, setSubmitting]         = useState(false)

  const isPlanned = initialStatus === 'PLANNED'

  // Derived options based on selected municipality
  const selectedMuni = useMemo(
    () => LA_UNION_DATA.find(m => m.municipality === municipality) || null,
    [municipality]
  )

  const departureOptions = selectedMuni?.departurePoints ?? []
  const targetOptions = selectedMuni?.targetAreas ?? []

  function handleMunicipalityChange(val) {
    setMunicipality(val)
    setDeparturePoint('')
    setTargetArea('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!municipality)     { setError('Please select a municipality'); return }
    if (!departurePoint)   { setError('Please select a departure point'); return }
    if (!targetArea)       { setError('Please select a target area'); return }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        departurePoint: `${departurePoint}, ${municipality}`,
        targetArea:     targetArea,
        vesselName:     vesselName.trim() || null,
        notes:          notes.trim() || null,
        status:         initialStatus,
      }
      if (initialDate) {
        payload.startedAt = initialDate.toISOString()
      }
      
      await apiPost('/trips', token, payload)
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
          <h2 className="trip-modal__title">{isPlanned ? 'Schedule Trip' : 'Start a Trip'}</h2>
          <button className="trip-modal__close" onClick={onClose}>✕</button>
        </div>
        {isPlanned && initialDate && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--accent)' }}>
              Scheduling for <strong>{initialDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
            </p>
          </div>
        )}
        <form className="trip-form" onSubmit={submit}>
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
              {submitting ? (isPlanned ? 'Scheduling…' : 'Starting…') : (isPlanned ? 'Schedule Trip' : 'Start Trip')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
