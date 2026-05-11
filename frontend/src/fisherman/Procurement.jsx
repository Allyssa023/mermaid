import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import {
  listProcurementOrders, acceptOrder, markReady,
  completeOrder, cancelOrder, raiseDispute,
} from './api/procurement'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProcurementPage({ setPage }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('PENDING')
  const buckets = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED', 'DISPUTED']

  const ordersQ = useQuery({
    queryKey: ['fisherman', 'procurement', tab],
    queryFn: () => listProcurementOrders(tab),
  })

  const acceptMut   = useMutation({ mutationFn: (id) => acceptOrder(id),   onSuccess: () => qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] }) })
  const readyMut    = useMutation({ mutationFn: (id) => markReady(id),     onSuccess: () => qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] }) })
  const completeMut = useMutation({ mutationFn: (id) => completeOrder(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] }) })
  const cancelMut   = useMutation({ mutationFn: (id) => cancelOrder(id, 'Fisherman declined'), onSuccess: () => qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] }) })
  const disputeMut  = useMutation({ mutationFn: (id) => raiseDispute(id, { notes: 'Dispute raised' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['fisherman', 'procurement'] }) })

  if (ordersQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (ordersQ.error) return <div className="page"><ApiError error={ordersQ.error} onRetry={ordersQ.refetch} /></div>

  const orders = ordersQ.data ?? []

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor orders</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>procurement</em> inbox</h1>
          <p className="page__sub">Orders vendors placed against your catch. Confirm, prepare, complete.</p>
        </div>
      </div>

      <div className="seg" style={{marginTop: 14, alignSelf: 'flex-start'}}>
        {buckets.map(b => (
          <button key={b} className={tab === b ? 'on' : ''} onClick={() => setTab(b)}>
            {b[0] + b.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty" style={{marginTop: 32}}>
          <div className="empty__title">No {tab.toLowerCase()} orders</div>
          <p>Vendors who place orders against your catch will appear here.</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12, marginTop: 18}}>
          {orders.map(o => {
            const total = (o.qtyKg ?? 0) * (o.pricePerKg ?? 0)
            const placedAt = o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'
            return (
              <div key={o.id} className="card" style={{display: 'flex', flexDirection: 'column'}}>
                <div className="card__head">
                  <div>
                    <div className="row" style={{gap: 6, alignItems: 'center'}}>
                      <span className="kbd">VO-{o.id}</span>
                      <span className={`chip ${o.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`} style={{fontSize: 10}}>{o.paymentMethod ?? 'N/A'}</span>
                      {o.isPreorder && <span className="chip chip--accent" style={{fontSize: 10}}>Pre-order</span>}
                    </div>
                    <div className="card__title" style={{fontSize: 18, marginTop: 6}}>{o.speciesName}</div>
                    {o.fishermanName && <div className="card__sub">{o.fishermanName}</div>}
                  </div>
                  <span className={`status status--${o.status === 'PENDING' ? 'pending' : o.status === 'ACCEPTED' ? 'confirmed' : o.status === 'READY' ? 'active' : o.status === 'COMPLETED' ? 'completed' : o.status === 'DISPUTED' ? 'disputed' : 'cancelled'}`}>
                    <span className="status__dot" /> {o.status}
                  </span>
                </div>
                <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                  <div className="kpi"><div className="kpi__label">Quantity</div><div className="kpi__value">{o.qtyKg}<small>kg</small></div></div>
                  <div className="kpi"><div className="kpi__label">Price/kg</div><div className="kpi__value">₱{o.pricePerKg}</div></div>
                  <div className="kpi"><div className="kpi__label">Total</div><div className="kpi__value" style={{color: 'var(--accent)'}}>₱{total.toLocaleString()}</div></div>
                </div>
                <div className="muted-data" style={{fontSize: 12, marginTop: 8}}>
                  Placed <strong style={{color: 'var(--ink)'}}>{placedAt}</strong>
                  {o.settledAt && <> · settled {new Date(o.settledAt).toLocaleString()}</>}
                </div>
                {o.notes && <div style={{marginTop: 8, fontSize: 13, color: 'var(--ink-2)', borderLeft: '2px solid var(--line)', paddingLeft: 10}}>{o.notes}</div>}
                <div className="row" style={{gap: 8, marginTop: 14}}>
                  {o.status === 'PENDING' && (<>
                    <button className="btn btn--sm btn--accent" style={{flex: 1}} onClick={() => acceptMut.mutate(o.id)} disabled={acceptMut.isPending}>Accept</button>
                    <button className="btn btn--sm btn--ghost"  style={{flex: 1}} onClick={() => cancelMut.mutate(o.id)}  disabled={cancelMut.isPending}>Decline</button>
                  </>)}
                  {o.status === 'ACCEPTED' && (
                    <button className="btn btn--sm btn--accent" style={{flex: 1}} onClick={() => readyMut.mutate(o.id)} disabled={readyMut.isPending}>Mark ready</button>
                  )}
                  {o.status === 'READY' && (<>
                    <button className="btn btn--sm btn--accent" style={{flex: 1}} onClick={() => completeMut.mutate(o.id)} disabled={completeMut.isPending}>Mark completed</button>
                    <button className="btn btn--sm btn--ghost"  style={{flex: 1}} onClick={() => disputeMut.mutate(o.id)}  disabled={disputeMut.isPending}>Report dispute</button>
                  </>)}
                  {o.status === 'COMPLETED' && (
                    <span className="chip chip--safe" style={{flex: 1, textAlign: 'center', padding: '6px 0'}}>Completed</span>
                  )}
                  {o.status === 'CANCELLED' && (
                    <span className="chip chip--neutral" style={{flex: 1, textAlign: 'center', padding: '6px 0'}}>Cancelled</span>
                  )}
                  {o.status === 'DISPUTED' && (
                    <span className="chip chip--caution" style={{flex: 1, textAlign: 'center', padding: '6px 0'}}>In dispute</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
