import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listLots, recordAdjustment } from './api/inventory'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Inventory() {
  const [thr, setThr] = useState(10)

  const qc = useQueryClient()
  const lotsQ = useQuery({ queryKey: ['vendor', 'inventory'], queryFn: listLots })
  const _adjustMut = useMutation({
    mutationFn: ({ lotId, deltaKg, reason }) => recordAdjustment(lotId, deltaKg, reason, ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] }),
  })

  if (lotsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
  if (lotsQ.error) return <div className="page"><ApiError error={lotsQ.error} onRetry={lotsQ.refetch} /></div>
  const lots = lotsQ.data ?? []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inventory</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>lots</em></h1>
          <p className="page__sub">Every batch received, with remaining weight and cost basis.</p>
        </div>
        <button className="btn btn--primary"><I.Plus size={12} /> Receive lot</button>
      </div>
      <div className="row" style={{gap: 12, marginTop: 14, alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}>Low-stock threshold</span>
          <input className="input" style={{width: 80}} type="number" value={thr} onChange={e => setThr(+e.target.value)} />
          <span className="muted-data" style={{fontSize: 12}}>kg</span>
        </div>
        <button className="btn btn--sm"><I.Filter size={12} /> Species</button>
      </div>
      <div className="card" style={{marginTop: 14}}>
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
                  <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">Adjust</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
