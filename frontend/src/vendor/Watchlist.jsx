import { useState, useEffect } from 'react'
import { apiGet } from '../api'
import { listWatchlist, addWatchlist, removeWatchlist } from './api/watchlist'

function AddModal({ onClose, onAdded }) {
  const [species, setSpecies]     = useState([])
  const [locations, setLocations] = useState([])
  const [speciesId, setSpeciesId]   = useState('')
  const [locationId, setLocationId] = useState('')
  const [radiusKm, setRadiusKm]     = useState('5')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  useEffect(() => {
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
    apiGet('/market-locations').then(d => setLocations(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
  }, [])

  const canSubmit = speciesId || locationId

  const submit = async () => {
    if (!canSubmit) { setErr('Select at least a species or a market location.'); return }
    setBusy(true); setErr('')
    try {
      await addWatchlist(
        speciesId ? +speciesId : undefined,
        locationId ? +locationId : undefined,
        locationId && radiusKm ? parseFloat(radiusKm) : undefined,
      )
      onAdded()
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to add subscription.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">New subscription</div>
            <h2 className="modal__title">Add to Watchlist</h2>
            <p className="modal__sub">Get notified when a fisherman posts a catch alert matching your criteria.</p>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Species (optional)</label>
            <select className="input" value={speciesId} onChange={e => setSpeciesId(e.target.value)}>
              <option value="">Any species</option>
              {species.map(s => <option key={s.id} value={s.id}>{s.commonName || s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Market location (optional)</label>
            <select className="input" value={locationId} onChange={e => setLocationId(e.target.value)}>
              <option value="">Any location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          {locationId && (
            <div className="form-row">
              <label>Radius (km)</label>
              <input className="input" type="number" min="0.5" step="0.5" value={radiusKm} onChange={e => setRadiusKm(e.target.value)} />
            </div>
          )}
        </div>
        {err && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 10 }}>{err}</div>}
        <div className="modal__foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" disabled={busy || !canSubmit} onClick={submit}>
            {busy ? '…' : 'Add Subscription'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Watchlist() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [err, setErr]         = useState('')

  const load = () => {
    setLoading(true)
    listWatchlist()
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(e => setErr(e.message || 'Failed to load watchlist.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleRemove = async (id) => {
    try {
      await removeWatchlist(id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      setErr(e.message || 'Failed to remove.')
    }
  }

  return (
    <div className="page">
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={load} />}

      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Alerts</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Catch <em>Watchlist</em>
          </h1>
          <p className="page__sub">Get notified when fishermen post catch alerts matching your criteria.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            + Add subscription
          </button>
        </div>
      </div>

      {err && (
        <div style={{ color: 'var(--unsafe)', padding: '10px 14px', background: 'var(--unsafe-soft)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {err}
        </div>
      )}

      {loading ? (
        <div className="empty" style={{ padding: '48px 0' }}>
          <div className="empty__title">Loading…</div>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty" style={{ padding: '48px 0' }}>
          <div className="empty__title">No subscriptions yet</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Add a subscription to get notified when fishermen post matching catch alerts.</p>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)} style={{ marginTop: 16 }}>
            Add your first subscription
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                {e.speciesName && (
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>
                    Species: <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{e.speciesName}</em>
                  </div>
                )}
                {e.marketLocationName && (
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)', marginTop: e.speciesName ? 2 : 0 }}>
                    Near: {e.marketLocationName}
                    {e.radiusKm != null && (
                      <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 13 }}> within {e.radiusKm} km</span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Added {new Date(e.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                className="btn btn--ghost btn--sm"
                style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)', flexShrink: 0 }}
                onClick={() => handleRemove(e.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
