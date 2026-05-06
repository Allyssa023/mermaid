import { useState, useEffect } from 'react'
import { listLots, recordAdjustment } from './api/inventory'
import { apiGet } from '../api'

const LOW_STOCK_KG = 5

export default function Inventory() {
  const [lots, setLots]           = useState([])
  const [species, setSpecies]     = useState([])
  const [speciesId, setSpeciesId] = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [threshold, setThreshold] = useState(LOW_STOCK_KG)
  const [modal, setModal]         = useState(null)
  const [adjustForm, setAdjustForm] = useState({ deltaKg: '', reason: 'ADJUSTMENT_CORRECTION', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true); setError('')
    listLots(speciesId || undefined, true)
      .then(d => setLots(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load lots.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [speciesId])

  const openAdjust = (lot) => {
    setModal(lot)
    setAdjustForm({ deltaKg: '', reason: 'ADJUSTMENT_CORRECTION', note: '' })
    setSubmitError('')
  }

  const submitAdjust = async (e) => {
    e.preventDefault()
    if (!adjustForm.deltaKg) return
    setSubmitting(true); setSubmitError('')
    try {
      await recordAdjustment(modal.id, parseFloat(adjustForm.deltaKg), adjustForm.reason, adjustForm.note || undefined)
      setModal(null)
      load()
    } catch (err) {
      setSubmitError(err.message || 'Adjustment failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const speciesName = (id) => species.find(s => s.id === id || String(s.id) === String(id))?.commonName || `Species #${id}`

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Inventory Lots</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            Low-stock threshold (kg):
            <input
              type="number" min="0" step="0.5"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value) || 0)}
              style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--surface-3, #ddd)', fontSize: 13 }}
            />
          </label>
          <select
            value={speciesId}
            onChange={e => setSpeciesId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--surface-3, #ddd)', fontSize: 13 }}
          >
            <option value="">All species</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
          </select>
        </div>
      </div>

      {error && <div style={{ color: 'var(--unsafe, red)', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>Loading lots…</div>
      ) : lots.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>No inventory lots found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-3, #eee)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>ID</th>
                <th style={{ padding: '8px 10px' }}>Species</th>
                <th style={{ padding: '8px 10px' }}>Received</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Initial kg</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Remaining kg</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cost/kg</th>
                <th style={{ padding: '8px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lots.map(lot => {
                const isLow = lot.remainingKg <= threshold
                return (
                  <tr
                    key={lot.id}
                    style={{
                      borderBottom: '1px solid var(--surface-2, #f4f4f4)',
                      background: isLow ? 'rgba(245,165,35,0.08)' : undefined,
                    }}
                  >
                    <td style={{ padding: '8px 10px', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{lot.id}</td>
                    <td style={{ padding: '8px 10px' }}>{speciesName(lot.speciesId)}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--ink-4)' }}>
                      {lot.receivedAt ? new Date(lot.receivedAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{lot.initialKg}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: isLow ? 'var(--warn, orange)' : undefined, fontWeight: isLow ? 600 : undefined }}>
                        {lot.remainingKg}
                        {isLow && ' ⚠'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {lot.costPerKg != null ? `₱${lot.costPerKg}` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => openAdjust(lot)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--surface-3, #ddd)',
                          background: 'transparent', cursor: 'pointer', fontSize: 12
                        }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{ background: 'var(--paper, #fff)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>Adjust Lot #{modal.id} — {speciesName(modal.speciesId)}</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>
              Current remaining: <strong>{modal.remainingKg} kg</strong>
            </p>
            <form onSubmit={submitAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13 }}>
                Delta kg (negative to deduct)
                <input
                  type="number" step="0.01"
                  value={adjustForm.deltaKg}
                  onChange={e => setAdjustForm(f => ({ ...f, deltaKg: e.target.value }))}
                  required
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--surface-3)' }}
                />
              </label>
              <label style={{ fontSize: 13 }}>
                Reason
                <select
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--surface-3)' }}
                >
                  <option value="ADJUSTMENT_CORRECTION">Correction</option>
                  <option value="ADJUSTMENT_LOSS">Loss</option>
                </select>
              </label>
              <label style={{ fontSize: 13 }}>
                Note (optional)
                <input
                  type="text" maxLength="500"
                  value={adjustForm.note}
                  onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--surface-3)' }}
                />
              </label>
              {submitError && <div style={{ color: 'var(--unsafe, red)', fontSize: 13 }}>{submitError}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)}
                  style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--surface-3)', background: 'transparent', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--accent, #0070f3)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
