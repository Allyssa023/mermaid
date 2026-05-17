import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listLots, recordAdjustment } from './api/inventory'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const ADJUST_REASONS = ['DAMAGED', 'SPOILAGE', 'CORRECTION', 'OTHER']

export default function Inventory() {
  const [thr, setThr]               = useState(10)
  const [speciesFilter, setSpecies] = useState('')
  const [adjustLot, setAdjustLot]   = useState(null)

  const qc = useQueryClient()
  const lotsQ    = useQuery({
    queryKey: ['vendor', 'inventory', speciesFilter],
    queryFn:  () => listLots(speciesFilter ? Number(speciesFilter) : undefined),
  })
  const speciesQ = useQuery({ queryKey: ['lookup', 'species'], queryFn: fetchSpecies })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] })

  if (lotsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
  if (lotsQ.error)     return <div className="page"><ApiError error={lotsQ.error} onRetry={lotsQ.refetch} /></div>
  const lots = lotsQ.data ?? []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inventory</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>lots</em></h1>
          <p className="page__sub">Every batch received from fishermen, with remaining weight and cost basis.</p>
        </div>
      </div>
      <div className="row" style={{gap: 12, marginTop: 14, alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}>Low-stock threshold</span>
          <input className="input" style={{width: 80}} type="number" value={thr} onChange={e => setThr(+e.target.value)} />
          <span className="muted-data" style={{fontSize: 12}}>kg</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}><I.Filter size={12} /> Species</span>
          <select className="input" style={{width: 180}} value={speciesFilter} onChange={(e) => setSpecies(e.target.value)}>
            <option value="">All species</option>
            {(speciesQ.data ?? []).map(s => (
              <option key={s.id} value={s.id}>{s.commonName}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="card" style={{marginTop: 14}}>
        {lots.length === 0 ? (
          <div className="empty">
            <div className="empty__title">No inventory yet</div>
            <p>Inventory is added automatically when procurement orders are completed.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Lot</th><th>Species</th><th>Received</th><th>Initial</th><th>Remaining</th><th>Cost/kg</th><th></th></tr></thead>
            <tbody>
              {lots.map(l => {
                const low = l.remainingKg < thr
                return (
                  <tr key={l.id}>
                    <td><span className="kbd">{l.id}</span></td>
                    <td><strong>{l.speciesName}</strong></td>
                    <td className="muted-data">{new Date(l.receivedAt).toLocaleString()}</td>
                    <td>{l.initialKg} kg</td>
                    <td>
                      <span style={{fontFamily: 'var(--font-mono)'}}>{l.remainingKg} kg</span>
                      {low && <span className="chip chip--caution" style={{marginLeft: 6, fontSize: 10}}>Low</span>}
                    </td>
                    <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.costPerKg}</td>
                    <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm" onClick={() => setAdjustLot(l)}>Adjust</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {adjustLot && (
        <AdjustLotModal
          lot={adjustLot}
          onClose={() => setAdjustLot(null)}
          onSubmit={async (body) => {
            await recordAdjustment(adjustLot.id, body.deltaKg, body.reason, body.note)
            invalidate()
            setAdjustLot(null)
          }}
        />
      )}

    </div>
  )
}

function AdjustLotModal({ lot, onClose, onSubmit }) {
  const [deltaKg, setDelta]   = useState('')
  const [reason, setReason]   = useState('CORRECTION')
  const [note, setNote]       = useState('')
  const [submitting, setBusy] = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    const n = Number(deltaKg)
    if (!deltaKg || Number.isNaN(n)) { setError('Enter a numeric delta (negative to deduct)'); return }
    setBusy(true)
    try { await onSubmit({ deltaKg: n, reason, note }) }
    catch (e) { setError(e?.message ?? 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000}}>
      <div className="card" onClick={e => e.stopPropagation()} style={{width: 'min(440px, 92vw)', padding: 22}}>
        <div className="card__head">
          <div>
            <div className="eyebrow">Lot #{lot.id}</div>
            <div className="card__title">Adjust {lot.speciesName}</div>
            <div className="card__sub">Remaining: {lot.remainingKg} kg</div>
          </div>
        </div>
        <div className="form-grid" style={{marginTop: 8}}>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Delta (kg) — negative deducts</label>
            <input className="input" inputMode="decimal" value={deltaKg} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. -2.5" />
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Reason</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {error && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 8}}>{error}</p>}
        <div className="row" style={{marginTop: 18, gap: 8, justifyContent: 'flex-end'}}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : 'Save adjustment'}</button>
        </div>
      </div>
    </div>
  )
}

