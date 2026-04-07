import { useState } from 'react'
import { apiPost } from '../api'

export default function StartTripModal({ token, initialDate, initialStatus = 'ACTIVE', onCreated, onClose }) {
  const [departurePoint, setDeparturePoint] = useState('')
  const [targetArea, setTargetArea]         = useState('')
  const [vesselName, setVesselName]         = useState('')
  const [notes, setNotes]                   = useState('')
  const [error, setError]                   = useState(null)
  const [submitting, setSubmitting]         = useState(false)

  const isPlanned = initialStatus === 'PLANNED'

  async function submit(e) {
    e.preventDefault()
    if (departurePoint.trim().length < 2) { setError('Departure point must be at least 2 characters'); return }
    if (targetArea.trim().length < 2)     { setError('Target area must be at least 2 characters'); return }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        departurePoint: departurePoint.trim(),
        targetArea:     targetArea.trim(),
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
              {submitting ? (isPlanned ? 'Scheduling…' : 'Starting…') : (isPlanned ? 'Schedule Trip' : 'Start Trip')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
