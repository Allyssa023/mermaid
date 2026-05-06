import { useState, useEffect } from 'react'
import { apiGet } from '../api'
import { listWatchlist, addWatchlist, removeWatchlist } from './api/watchlist'

function AddModal({ onClose, onAdded }) {
  const [species, setSpecies]   = useState([])
  const [locations, setLocations] = useState([])
  const [speciesId, setSpeciesId]     = useState('')
  const [locationId, setLocationId]   = useState('')
  const [radiusKm, setRadiusKm]       = useState('5')
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 360,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Add Watchlist Subscription</h3>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
          Get notified when a fisherman posts a catch alert matching your criteria.
        </p>

        <label style={{ fontSize: 13, color: '#374151' }}>Species (optional)</label>
        <select value={speciesId} onChange={e => setSpeciesId(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4, marginBottom: 12 }}>
          <option value="">Any species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.commonName || s.name}</option>)}
        </select>

        <label style={{ fontSize: 13, color: '#374151' }}>Market location (optional)</label>
        <select value={locationId} onChange={e => setLocationId(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4, marginBottom: 12 }}>
          <option value="">Any location</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {locationId && (
          <>
            <label style={{ fontSize: 13, color: '#374151' }}>Radius (km)</label>
            <input type="number" min="0.5" step="0.5" value={radiusKm}
              onChange={e => setRadiusKm(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4, marginBottom: 12 }} />
          </>
        )}

        {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={busy || !canSubmit} onClick={submit} style={{
            flex: 1, padding: '9px 0',
            background: canSubmit ? '#2563eb' : '#93c5fd',
            color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>
            {busy ? '…' : 'Add Subscription'}
          </button>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
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
    <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto' }}>
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={load} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Watchlist</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            Get notified when fishermen post matching catch alerts.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '8px 16px', background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
        }}>
          + Add subscription
        </button>
      </div>

      {err && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13 }}>{err}</div>}

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
          No subscriptions yet.
          <br />
          <button onClick={() => setShowAdd(true)} style={{
            marginTop: 12, padding: '8px 18px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}>Add your first subscription</button>
        </div>
      ) : (
        entries.map(e => (
          <div key={e.id} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '14px 16px', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              {e.speciesName && (
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Species: {e.speciesName}
                </div>
              )}
              {e.marketLocationName && (
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Near: {e.marketLocationName}
                  {e.radiusKm != null && (
                    <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 13 }}>
                      {' '}within {e.radiusKm} km
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                Added {new Date(e.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button onClick={() => handleRemove(e.id)} style={{
              padding: '6px 12px', background: 'none', border: '1px solid #e5e7eb',
              borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontSize: 13,
            }}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  )
}
