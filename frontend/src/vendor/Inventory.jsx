import { useState, useEffect } from 'react'
import { listLots, recordAdjustment } from './api/inventory'
import { apiGet } from '../api'

const LOW_STOCK_KG = 5

export default function Inventory() {
  const [lots, setLots]             = useState([])
  const [species, setSpecies]       = useState([])
  const [speciesId, setSpeciesId]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [threshold, setThreshold]   = useState(LOW_STOCK_KG)
  const [modal, setModal]           = useState(null)
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

  const speciesName = (id) =>
    species.find(s => s.id === id || String(s.id) === String(id))?.commonName || `Species #${id}`

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Stock</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Inventory <em>Lots</em>
          </h1>
          <p className="page__sub">Manage your fish stock, adjust quantities, and track low-stock lots.</p>
        </div>
        <div className="page__actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
            <span className="eyebrow">Low-stock threshold</span>
            <input
              type="number" min="0" step="0.5"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value) || 0)}
              className="input"
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>kg</span>
          </label>
          <select
            value={speciesId}
            onChange={e => setSpeciesId(e.target.value)}
            className="input"
            style={{ width: 180 }}
          >
            <option value="">All species</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty" style={{ padding: '40px 0' }}>
            <div className="empty__title">Loading lots…</div>
          </div>
        ) : lots.length === 0 ? (
          <div className="empty" style={{ padding: '40px 0' }}>
            <div className="empty__title">No inventory lots</div>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>Received lots will appear here after procurement orders complete.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Species</th>
                <th>Received</th>
                <th>Initial</th>
                <th>Remaining</th>
                <th>Cost/kg</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lots.map(lot => {
                const isLow = lot.remainingKg <= threshold
                return (
                  <tr
                    key={lot.id}
                    style={{ background: isLow ? 'var(--caution-soft)' : undefined }}
                  >
                    <td>
                      <span className="kbd">#{lot.id}</span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{speciesName(lot.speciesId)}</td>
                    <td style={{ color: 'var(--ink-4)' }}>
                      {lot.receivedAt ? new Date(lot.receivedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="data">{lot.initialKg} kg</td>
                    <td>
                      <span className="data" style={{ color: isLow ? 'var(--caution)' : 'var(--ink-2)', fontWeight: isLow ? 600 : undefined }}>
                        {lot.remainingKg} kg
                      </span>
                      {isLow && <span className="chip chip--caution chip--dot" style={{ marginLeft: 8, fontSize: 10 }}>Low</span>}
                    </td>
                    <td className="data">
                      {lot.costPerKg != null ? `₱${lot.costPerKg}` : '—'}
                    </td>
                    <td>
                      <button className="btn btn--ghost btn--sm" onClick={() => openAdjust(lot)}>
                        Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Inventory adjustment</div>
                <h2 className="modal__title">Lot #{modal.id}</h2>
                <p className="modal__sub">{speciesName(modal.speciesId)} · Current: {modal.remainingKg} kg remaining</p>
              </div>
            </div>
            <form onSubmit={submitAdjust}>
              <div className="form-grid">
                <div className="form-row">
                  <label>Delta kg <span style={{ color: 'var(--ink-4)', fontStyle: 'italic', fontSize: 10 }}>(negative to deduct)</span></label>
                  <input
                    className="input"
                    type="number" step="0.01"
                    value={adjustForm.deltaKg}
                    onChange={e => setAdjustForm(f => ({ ...f, deltaKg: e.target.value }))}
                    required
                    placeholder="e.g. -5 or 10"
                  />
                </div>
                <div className="form-row">
                  <label>Reason</label>
                  <select
                    className="input"
                    value={adjustForm.reason}
                    onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                  >
                    <option value="ADJUSTMENT_CORRECTION">Correction</option>
                    <option value="ADJUSTMENT_LOSS">Loss</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Note (optional)</label>
                  <input
                    className="input"
                    type="text" maxLength="500"
                    value={adjustForm.note}
                    onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Reason for adjustment…"
                  />
                </div>
              </div>
              {submitError && (
                <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 10 }}>{submitError}</div>
              )}
              <div className="modal__foot">
                <button type="button" className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
