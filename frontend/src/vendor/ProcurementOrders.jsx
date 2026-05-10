import { useState, useCallback } from 'react'
import { listProcurementOrders, cancelProcurementOrder, settleOrder, raiseDisputeVendor, getDisputeVendor, resolveDisputeVendor, initiateOrderPayout } from './api/procurement'
import { useVendorPolling } from './hooks/useVendorPolling'

const BUCKETS = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED', 'DISPUTED']

const STATUS_MAP = {
  PENDING:   'pending',
  ACCEPTED:  'active',
  READY:     'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED:  'disputed',
}

const QUALITY_OPTIONS = ['FRESH', 'SUBSTANDARD', 'DAMAGED']

export default function ProcurementOrders() {
  const [bucket, setBucket] = useState('PENDING')
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState(null)
  const [settleModal, setSettleModal] = useState(null)
  const [settlePayment, setSettlePayment] = useState('CASH')
  const [settling, setSettling] = useState(false)

  const [disputeTarget, setDisputeTarget]   = useState(null)
  const [disputeWeight, setDisputeWeight]   = useState('')
  const [disputeQuality, setDisputeQuality] = useState('')
  const [disputeNotes, setDisputeNotes]     = useState('')
  const [disputeError, setDisputeError]     = useState('')

  const [viewDispute, setViewDispute]           = useState(null)
  const [viewDisputeData, setViewDisputeData]   = useState(null)
  const [viewDisputeLoading, setViewDisputeLoading] = useState(false)
  const [resolveText, setResolveText]           = useState('')
  const [resolving, setResolving]               = useState(false)
  const [resolveError, setResolveError]         = useState('')

  const [payoutModal, setPayoutModal]     = useState(null)     // order being paid out
  const [payoutChannel, setPayoutChannel] = useState('PH_GCASH')
  const [payingOut, setPayingOut]         = useState(false)
  const [payoutError, setPayoutError]     = useState('')
  const [payoutSuccess, setPayoutSuccess] = useState(null)     // orderId of successful payout

  const fetcher = useCallback(() => listProcurementOrders(bucket), [bucket])
  const { data: orders = [], loading, refetch } = useVendorPolling(fetcher, 20000)

  const handleSettle = async () => {
    setSettling(true)
    try {
      await settleOrder(settleModal.id, { paymentMethod: settlePayment })
      setSettleModal(null)
      refetch()
    } catch {}
    finally { setSettling(false) }
  }

  const handleCancel = async (orderId) => {
    setCancelError(null)
    try {
      await cancelProcurementOrder(orderId, cancelReason || undefined)
      setCancellingId(null)
      setCancelReason('')
      refetch()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to cancel order.'
      setCancelError(msg)
    }
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
    if (disputeWeight)  body.claimedWeightKg = parseFloat(disputeWeight)
    if (disputeQuality) body.claimedQuality = disputeQuality
    if (disputeNotes)   body.notes = disputeNotes
    try {
      await raiseDisputeVendor(disputeTarget.id, body)
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
    setResolveText('')
    setResolveError('')
    try {
      const d = await getDisputeVendor(order.id)
      setViewDisputeData(d)
    } catch {}
    finally { setViewDisputeLoading(false) }
  }

  const handleResolve = async () => {
    if (!resolveText.trim()) { setResolveError('Resolution note is required.'); return }
    setResolving(true)
    setResolveError('')
    try {
      await resolveDisputeVendor(viewDispute.id, { resolution: resolveText })
      setViewDispute(null)
      refetch()
    } catch (e) {
      setResolveError(e.message || 'Failed to resolve dispute.')
    } finally { setResolving(false) }
  }

  const handlePayout = async () => {
    setPayingOut(true)
    setPayoutError('')
    try {
      await initiateOrderPayout(payoutModal.id, payoutChannel)
      setPayoutSuccess(payoutModal.id)
      setPayoutModal(null)
      refetch()
    } catch (e) {
      setPayoutError(e?.message || 'Payout failed. Check that the fisherman has an e-wallet number on file.')
    } finally {
      setPayingOut(false)
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Procurement</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Procurement <em>Orders</em>
          </h1>
          <p className="page__sub">Track orders placed with fishermen through the procurement feed.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div className="seg">
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
        </div>

        {loading && orders.length === 0 && (
          <div className="empty"><div className="empty__title">Loading…</div></div>
        )}
        {!loading && orders.length === 0 && (
          <div className="empty">
            <div className="empty__title">No {bucket.toLowerCase()} orders</div>
          </div>
        )}
      </div>

      {orders.map(order => {
        const canCancel = order.status === 'PENDING' || order.status === 'ACCEPTED'
        const isCancelOpen = cancellingId === order.id

        return (
          <div key={order.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card__head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}>
                    {order.speciesName ?? '(species unknown)'}
                  </span>
                  {order.isPreorder && <span className="chip chip--accent">Preorder</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {[
                    order.fishermanName ?? `Fisherman #${order.fishermanId}`,
                    order.qtyKg != null && `${order.qtyKg.toFixed(1)} kg`,
                    order.pricePerKg != null && `₱${order.pricePerKg.toFixed(2)}/kg`,
                  ].filter(Boolean).join(' · ')}
                </div>
                {order.notes && (
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic', marginTop: 4 }}>
                    "{order.notes}"
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Placed {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span className={`status status--${STATUS_MAP[order.status] || ''}`}>
                  <span className="status__dot" />{order.status}
                </span>
                <span className="kbd">#{order.id}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {order.status === 'COMPLETED' && !order.settledAt && (
                <button className="btn btn--accent btn--sm" onClick={() => { setSettleModal(order); setSettlePayment('CASH') }}>
                  Mark as Paid
                </button>
              )}
              {order.status === 'COMPLETED' && !order.payoutId && (
                <button
                  className="btn btn--accent btn--sm"
                  style={{ background: 'var(--safe)', borderColor: 'var(--safe)' }}
                  onClick={() => { setPayoutModal(order); setPayoutChannel('PH_GCASH'); setPayoutError('') }}
                >
                  Pay Fisherman
                </button>
              )}
              {order.payoutId && (
                <span style={{ fontSize: 12, color: 'var(--safe)', fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>
                  ✓ Payout sent
                </span>
              )}
              {payoutSuccess === order.id && !order.payoutId && (
                <span style={{ fontSize: 12, color: 'var(--safe)', alignSelf: 'center' }}>
                  ✓ Payout initiated
                </span>
              )}
              {(order.status === 'READY' || order.status === 'COMPLETED') && (
                <button className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--caution)', borderColor: 'var(--caution)' }}
                  onClick={() => openDisputeModal(order)}>
                  Raise Dispute
                </button>
              )}
              {order.status === 'DISPUTED' && (
                <button className="btn btn--ghost btn--sm"
                  onClick={() => openViewDispute(order)}>
                  View / Resolve Dispute
                </button>
              )}
              {canCancel && !isCancelOpen && (
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                  onClick={() => { setCancellingId(order.id); setCancelError(null) }}
                >
                  Cancel order
                </button>
              )}
            </div>

            {isCancelOpen && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--unsafe-soft)', borderRadius: 8 }}>
                <input
                  className="input"
                  placeholder="Reason for cancellation (optional)"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                {cancelError && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginBottom: 8 }}>{cancelError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn--sm"
                    style={{ background: 'var(--unsafe)', color: 'white', borderColor: 'var(--unsafe)' }}
                    onClick={() => handleCancel(order.id)}
                  >
                    Confirm Cancel
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setCancellingId(null); setCancelReason(''); setCancelError(null) }}
                  >
                    Keep order
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Mark as Paid modal */}
      {settleModal && (
        <div className="modal-overlay" onClick={() => setSettleModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal__head">
              <div className="modal__title">Mark as Paid — #{settleModal.id}</div>
            </div>
            <div style={{ padding: '12px 0' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Payment method</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['CASH', 'CREDIT'].map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" name="paymentMethod" value={m} checked={settlePayment === m} onChange={() => setSettlePayment(m)} />
                    {m === 'CASH' ? 'Cash' : 'Credit / Utang'}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setSettleModal(null)}>Cancel</button>
              <button className="btn btn--primary btn--sm" disabled={settling} onClick={handleSettle}>
                {settling ? 'Saving…' : 'Confirm'}
              </button>
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
                    placeholder={disputeTarget.qtyKg ? `Ordered: ${disputeTarget.qtyKg.toFixed(1)} kg` : 'e.g. 12.5'} />
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

      {/* Pay Fisherman modal */}
      {payoutModal && (
        <div className="modal-overlay" onClick={() => setPayoutModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal__head">
              <div className="modal__title">Pay Fisherman</div>
              <div className="modal__sub">
                Order #{payoutModal.id} · {payoutModal.speciesName}
              </div>
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 13, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ink-4)' }}>Fisherman</span>
                  <span style={{ fontWeight: 500 }}>{payoutModal.fishermanName ?? `#${payoutModal.fishermanId}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ink-4)' }}>Amount</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    ₱{((payoutModal.qtyKg || 0) * (payoutModal.pricePerKg || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                Send via
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['PH_GCASH', 'GCash'], ['PH_PAYMAYA', 'Maya']].map(([code, label]) => (
                  <label key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="payoutChannel"
                      value={code}
                      checked={payoutChannel === code}
                      onChange={() => setPayoutChannel(code)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-4)' }}>
                The fisherman must have their {payoutChannel === 'PH_GCASH' ? 'GCash' : 'Maya'} number saved in their profile.
              </div>
              {payoutError && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--unsafe)', background: 'var(--unsafe-soft)', padding: '8px 10px', borderRadius: 6 }}>
                  {payoutError}
                </div>
              )}
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setPayoutModal(null)}>Cancel</button>
              <button
                className="btn btn--primary btn--sm"
                disabled={payingOut}
                onClick={handlePayout}
              >
                {payingOut ? 'Sending…' : `Send payment`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View / Resolve dispute modal */}
      {viewDispute && (
        <div className="modal-overlay" onClick={() => setViewDispute(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal__head">
              <div className="modal__title">Dispute — Order #{viewDispute.id}</div>
            </div>
            <div style={{ padding: '8px 0 12px' }}>
              {viewDisputeLoading ? (
                <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
              ) : viewDisputeData ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, marginBottom: 16 }}>
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

                  {viewDisputeData.status === 'OPEN' && viewDisputeData.raisedBy !== 'VENDOR' && (
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Resolve dispute</div>
                      {resolveError && (
                        <div style={{ color: 'var(--unsafe)', fontSize: 12, marginBottom: 8 }}>{resolveError}</div>
                      )}
                      <textarea className="input" rows={3} value={resolveText}
                        onChange={e => setResolveText(e.target.value)}
                        placeholder="Describe the resolution…" style={{ resize: 'vertical', marginBottom: 8 }} />
                      <button className="btn btn--primary btn--sm" disabled={resolving} onClick={handleResolve}>
                        {resolving ? 'Resolving…' : 'Confirm Resolution'}
                      </button>
                    </div>
                  )}
                </>
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
