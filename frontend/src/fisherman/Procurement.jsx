import { useState, useCallback } from 'react'
import { listProcurementOrders, acceptOrder, markReady, completeOrder, cancelOrder, raiseDispute, getDispute } from './api/procurement'
import { useFishermanPolling } from './hooks/useFishermanPolling'

const BUCKETS = ['PENDING','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED']

const STATUS_CLS = {
  PENDING: 'status--pending', ACCEPTED: 'status--confirmed', READY: 'status--active',
  COMPLETED: 'status--completed', CANCELLED: 'status--cancelled', DISPUTED: 'status--disputed',
}

const QUALITY_OPTIONS = ['FRESH', 'SUBSTANDARD', 'DAMAGED']

export default function Procurement() {
  const [bucket, setBucket]       = useState('PENDING')
  const [busy, setBusy]           = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const [disputeTarget, setDisputeTarget] = useState(null)
  const [disputeWeight, setDisputeWeight] = useState('')
  const [disputeQuality, setDisputeQuality] = useState('')
  const [disputeNotes, setDisputeNotes]   = useState('')
  const [disputeError, setDisputeError]   = useState('')

  const [viewDispute, setViewDispute]   = useState(null)
  const [viewDisputeData, setViewDisputeData] = useState(null)
  const [viewDisputeLoading, setViewDisputeLoading] = useState(false)

  const fetcher = useCallback(() => listProcurementOrders(bucket), [bucket])
  const { data, loading, error, isStale, refetch } = useFishermanPolling(fetcher, [bucket])
  const orders = Array.isArray(data) ? data : []

  const act = async (action, id, extra) => {
    setBusy(id)
    try { await action(id, extra); refetch() }
    catch {}
    finally { setBusy(null) }
  }

  const openDisputeModal = (order) => {
    setDisputeTarget(order)
    setDisputeWeight('')
    setDisputeQuality('')
    setDisputeNotes('')
    setDisputeError('')
  }

  const submitDispute = async () => {
    setDisputeError('')
    const body = {}
    if (disputeWeight) body.claimedWeightKg = parseFloat(disputeWeight)
    if (disputeQuality) body.claimedQuality = disputeQuality
    if (disputeNotes)   body.notes = disputeNotes
    try {
      await raiseDispute(disputeTarget.id, body)
      setDisputeTarget(null)
      setBucket('DISPUTED')
      refetch()
    } catch (e) {
      setDisputeError(e.message || 'Failed to raise dispute.')
    }
  }

  const openViewDispute = async (order) => {
    setViewDispute(order)
    setViewDisputeData(null)
    setViewDisputeLoading(true)
    try {
      const d = await getDispute(order.id)
      setViewDisputeData(d)
    } catch {}
    finally { setViewDisputeLoading(false) }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Sales</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Vendor <em>Orders.</em></h1>
          <p className="page__sub">Orders from vendors — accept, prepare, complete.</p>
        </div>
        <div className="page__actions">
          {isStale && <span className="chip chip--caution chip--dot">Stale</span>}
          <button className="btn btn--ghost btn--sm" onClick={refetch}>Refresh</button>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 16 }}>
        {BUCKETS.map(b => (
          <button
            key={b}
            className={`seg__btn${bucket === b ? ' on' : ''}`}
            onClick={() => setBucket(b)}
          >
            {b.charAt(0) + b.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--unsafe)', background: 'var(--unsafe-soft)', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error.message || 'Failed to load orders.'}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
      ) : orders.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No {bucket.toLowerCase()} orders</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(order => (
            <div key={order.id} className="card">
              <div className="card__head">
                <div>
                  {order.isPreorder && (
                    <span className="chip chip--accent" style={{ marginBottom: 4, display: 'inline-block' }}>Preorder</span>
                  )}
                  <div className="card__title">
                    {order.speciesName}
                    <span className="kbd" style={{ marginLeft: 8, fontSize: 11 }}>#{order.id}</span>
                  </div>
                  <div className="card__sub">
                    from {order.vendorName || `Vendor #${order.fishermanId}`}
                    {order.qtyKg != null && ` · ${order.qtyKg} kg`}
                    {order.pricePerKg != null && ` · ₱${order.pricePerKg}/kg`}
                  </div>
                  {order.paymentMethod && (
                    <span className={`chip ${order.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                      {order.paymentMethod === 'CASH' ? 'Cash' : 'Credit / Utang'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`status ${STATUS_CLS[order.status] || ''}`}>{order.status}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {order.status === 'PENDING' && (
                      <>
                        <button className="btn btn--accent btn--sm" disabled={busy === order.id}
                          onClick={() => act(acceptOrder, order.id)}>Accept</button>
                        <button className="btn btn--ghost btn--sm"
                          style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                          onClick={() => { setCancelTarget(order); setCancelReason('') }}>Cancel</button>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button className="btn btn--primary btn--sm" disabled={busy === order.id}
                        onClick={() => act(markReady, order.id)}>Mark Ready</button>
                    )}
                    {order.status === 'READY' && (
                      <>
                        <button className="btn btn--primary btn--sm" disabled={busy === order.id}
                          onClick={() => act(completeOrder, order.id)}>Complete</button>
                        <button className="btn btn--ghost btn--sm"
                          style={{ color: 'var(--caution)', borderColor: 'var(--caution)' }}
                          onClick={() => openDisputeModal(order)}>Dispute</button>
                      </>
                    )}
                    {order.status === 'COMPLETED' && (
                      <button className="btn btn--ghost btn--sm"
                        style={{ color: 'var(--caution)', borderColor: 'var(--caution)' }}
                        onClick={() => openDisputeModal(order)}>Dispute</button>
                    )}
                    {order.status === 'DISPUTED' && (
                      <button className="btn btn--ghost btn--sm"
                        onClick={() => openViewDispute(order)}>View Dispute</button>
                    )}
                  </div>
                </div>
              </div>
              {order.notes && (
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal__head">
              <div className="modal__title">Cancel order?</div>
            </div>
            <div className="form-row" style={{ padding: '12px 0' }}>
              <label>Reason (optional)</label>
              <input className="input" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setCancelTarget(null)}>Back</button>
              <button
                className="btn btn--sm"
                style={{ background: 'var(--unsafe)', color: 'var(--paper)', border: 'none' }}
                onClick={() => { act(cancelOrder, cancelTarget.id, cancelReason || undefined); setCancelTarget(null) }}
              >Cancel Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Raise dispute modal */}
      {disputeTarget && (
        <div className="modal-overlay" onClick={() => setDisputeTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal__head">
              <div className="modal__title">Raise Dispute</div>
              <div className="modal__sub">Order #{disputeTarget.id} · {disputeTarget.speciesName}</div>
            </div>
            <div style={{ padding: '4px 0 12px' }}>
              {disputeError && (
                <div style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                  {disputeError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-row">
                  <label>Claimed weight (kg) <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>optional</span></label>
                  <input className="input" type="number" min="0" step="0.1"
                    value={disputeWeight} onChange={e => setDisputeWeight(e.target.value)}
                    placeholder={disputeTarget.qtyKg ? `Ordered: ${disputeTarget.qtyKg} kg` : 'e.g. 12.5'} />
                </div>
                <div className="form-row">
                  <label>Quality claim <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>optional</span></label>
                  <select className="input" value={disputeQuality} onChange={e => setDisputeQuality(e.target.value)}>
                    <option value="">— none —</option>
                    {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Notes <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>optional</span></label>
                  <textarea className="input" rows={3} value={disputeNotes}
                    onChange={e => setDisputeNotes(e.target.value)}
                    placeholder="Describe the issue…" style={{ resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setDisputeTarget(null)}>Cancel</button>
              <button
                className="btn btn--sm"
                style={{ background: 'var(--caution)', color: 'var(--paper)', border: 'none' }}
                onClick={submitDispute}
              >Raise Dispute</button>
            </div>
          </div>
        </div>
      )}

      {/* View dispute modal */}
      {viewDispute && (
        <div className="modal-overlay" onClick={() => setViewDispute(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal__head">
              <div className="modal__title">Dispute Details</div>
              <div className="modal__sub">Order #{viewDispute.id}</div>
            </div>
            <div style={{ padding: '8px 0 12px' }}>
              {viewDisputeLoading ? (
                <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
              ) : viewDisputeData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-4)' }}>Status</span>
                    <span className={`status ${viewDisputeData.status === 'OPEN' ? 'status--disputed' : 'status--completed'}`}>
                      {viewDisputeData.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-4)' }}>Raised by</span>
                    <span>{viewDisputeData.raisedBy}</span>
                  </div>
                  {viewDisputeData.claimedWeightKg != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--ink-4)' }}>Claimed weight</span>
                      <span>{viewDisputeData.claimedWeightKg} kg</span>
                    </div>
                  )}
                  {viewDisputeData.claimedQuality && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--ink-4)' }}>Quality claim</span>
                      <span>{viewDisputeData.claimedQuality}</span>
                    </div>
                  )}
                  {viewDisputeData.notes && (
                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}>
                      {viewDisputeData.notes}
                    </div>
                  )}
                  {viewDisputeData.resolution && (
                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                      <div style={{ color: 'var(--ink-4)', fontSize: 11, marginBottom: 4 }}>Resolution</div>
                      <div>{viewDisputeData.resolution}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>No dispute found.</div>
              )}
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setViewDispute(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
