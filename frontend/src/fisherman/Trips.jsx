// frontend/src/fisherman/Trips.jsx
import { useState, useEffect, useCallback } from 'react'
import { listTrips, startTrip, endTrip } from './api/trips'

const CHECKLIST_ITEMS = [
  { key: 'lifeVestChecked',      label: 'Life vest on board' },
  { key: 'radioChecked',         label: 'Radio functional' },
  { key: 'fuelChecked',          label: 'Fuel level checked' },
  { key: 'engineChecked',        label: 'Engine checked' },
  { key: 'weatherReviewed',      label: 'Weather reviewed' },
  { key: 'emergencyKitChecked',  label: 'Emergency kit complete' },
]

export function StartTripModal({ onClose, onStarted }) {
  const [step, setStep]         = useState(1)
  const [vesselName, setVessel] = useState('')
  const [checked, setChecked]   = useState({})
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')

  const allChecked = CHECKLIST_ITEMS.every(i => checked[i.key])

  const toggle = (key) => setChecked(p => ({ ...p, [key]: !p[key] }))

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const body = {
        vesselName: vesselName || undefined,
        lifeVestChecked:     checked.lifeVestChecked,
        radioChecked:        checked.radioChecked,
        fuelChecked:         checked.fuelChecked,
        engineChecked:       checked.engineChecked,
        weatherReviewed:     checked.weatherReviewed,
        emergencyKitChecked: checked.emergencyKitChecked,
      }
      await startTrip(body)
      onStarted()
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to start trip.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">Safety</div>
            <div className="modal__title">{step === 1 ? 'Start Trip' : 'Safety Checklist'}</div>
          </div>
        </div>

        {step === 1 && (
          <div className="form-grid" style={{ padding: '16px 0 0' }}>
            <div className="form-row">
              <label>Vessel name</label>
              <input
                className="input"
                placeholder="Vessel name (optional)"
                value={vesselName}
                onChange={e => setVessel(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: '16px 0 0' }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
              Check all items before departing.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CHECKLIST_ITEMS.map(item => (
                <label key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${checked[item.key] ? 'var(--safe)' : 'var(--line)'}`,
                  background: checked[item.key] ? 'var(--safe-soft)' : undefined,
                  cursor: 'pointer', fontSize: 13,
                }}>
                  <input
                    type="checkbox"
                    checked={!!checked[item.key]}
                    onChange={() => toggle(item.key)}
                    style={{ accentColor: 'var(--safe)' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {err && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 8 }}>{err}</div>}

        <div className="modal__foot">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          {step === 1 ? (
            <button className="btn btn--primary btn--sm" onClick={() => setStep(2)}>Next</button>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              disabled={!allChecked || busy}
              onClick={submit}
            >
              {busy ? '…' : 'Start Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Trips() {
  const [trips, setTrips]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [busy, setBusy]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    listTrips().then(d => setTrips(Array.isArray(d) ? d : d?.content || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleEnd = async (tripId) => {
    setBusy(tripId)
    try { await endTrip(tripId, {}); load() }
    catch {}
    finally { setBusy(null) }
  }

  const activeTrip = trips.find(t => t.status === 'ACTIVE')

  return (
    <div className="page">
      {modal && <StartTripModal onClose={() => setModal(false)} onStarted={load} />}
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Safety</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Trips.</em></h1>
          <p className="page__sub">Departure log and safety checklist.</p>
        </div>
        <div className="page__actions">
          {!activeTrip && (
            <button className="btn btn--primary btn--sm" onClick={() => setModal(true)}>
              Start Trip
            </button>
          )}
        </div>
      </div>

      {activeTrip && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--safe)' }}>
          <div className="card__head">
            <div>
              <div className="eyebrow">Currently active</div>
              <div className="card__title">{activeTrip.vesselName || 'Active Trip'}</div>
              <div className="card__sub">
                Started {new Date(activeTrip.startedAt).toLocaleString('en-PH')}
              </div>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
              disabled={busy === activeTrip.id}
              onClick={() => handleEnd(activeTrip.id)}
            >
              {busy === activeTrip.id ? '…' : 'End Trip'}
            </button>
          </div>
        </div>
      )}

      {loading && trips.length === 0 ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : trips.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No trips yet</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Start your first trip when you're ready to depart.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }} onClick={() => setModal(true)}>Start Trip</button>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Vessel</th>
                <th>Departed</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.filter(t => t.status !== 'ACTIVE').map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.vesselName || `Trip #${t.id}`}</td>
                  <td className="data">{new Date(t.startedAt).toLocaleString('en-PH')}</td>
                  <td className="data">{t.endedAt ? new Date(t.endedAt).toLocaleString('en-PH') : '—'}</td>
                  <td><span className={`status status--${t.status?.toLowerCase()}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
