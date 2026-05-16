import { useState } from 'react'
import OrderTimeline from './OrderTimeline'
import ConfirmOrderModal   from './modals/ConfirmOrderModal'
import InitiateHandoffModal from './modals/InitiateHandoffModal'
import ConfirmHandoffModal  from './modals/ConfirmHandoffModal'
import RecordPaymentModal   from './modals/RecordPaymentModal'
import ConfirmPaymentModal  from './modals/ConfirmPaymentModal'
import CancelOrderModal     from './modals/CancelOrderModal'
import DisputeModal         from './modals/DisputeModal'
import InitiatePayoutModal  from './modals/InitiatePayoutModal'
import PayHandoffModal      from './modals/PayHandoffModal'

function resolveViewerRole(viewerRole, currentRole) {
  if (viewerRole === 'BUYER' || viewerRole === 'SELLER') return viewerRole
  if (currentRole === 'BUYER') return 'BUYER'
  return 'SELLER'
}

function getPrimaryAction(order, viewerRole) {
  const { status, handoff, payment } = order

  if (status === 'PENDING') {
    return viewerRole === 'SELLER' ? 'CONFIRM_ORDER' : null
  }
  if (status === 'CONFIRMED') {
    if (viewerRole === 'SELLER') {
      if (!handoff)                                                            return 'INITIATE_HANDOFF'
      if (handoff.status === 'PENDING' && !handoff.confirmedBySeller)          return 'CONFIRM_HANDOFF'
      // After handoff is confirmed by both sides, the fisherman waits for the
      // buyer to pay via Xendit. No actionable button — info-only banner.
      if (handoff.status === 'CONFIRMED' && !payment)                          return 'AWAITING_BUYER_PAYMENT'
    }
    if (viewerRole === 'BUYER') {
      if (!handoff || (handoff.status === 'PENDING' && !handoff.confirmedByBuyer)) return 'CONFIRM_HANDOFF'
      if (handoff.status === 'CONFIRMED' && !payment)                          return 'PAY_HANDOFF'
      if (payment?.status === 'PENDING')                                       return 'CONFIRM_PAYMENT'
    }
  }
  if (status === 'COMPLETED') {
    if (viewerRole === 'SELLER') return 'PAYOUT'
    if (viewerRole === 'BUYER')  return 'LEAVE_REVIEW'
  }
  return null
}

function dispatchLabels(order) {
  if (order.dispatchMode === 'PICKUP') {
    return { initiate: 'Mark ready for pickup', confirm: 'Confirm I collected' }
  }
  if (order.dispatchMode === 'DELIVERY') {
    return { initiate: 'Out for delivery', confirm: 'Confirm delivered' }
  }
  return { initiate: 'Initiate Handoff', confirm: 'Confirm Handoff' }
}

function WhosTurnBanner({ order, viewerRole }) {
  const action = getPrimaryAction(order, viewerRole)
  if (action === 'AWAITING_BUYER_PAYMENT') return <div className="whos-turn">Waiting for buyer to pay</div>
  if (action) return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (order.status === 'PENDING'   && viewerRole === 'BUYER')  return <div className="whos-turn">Waiting for seller to confirm</div>
  if (order.status === 'CONFIRMED' && viewerRole === 'BUYER')  return <div className="whos-turn">Waiting for seller</div>
  if (order.status === 'CONFIRMED' && viewerRole === 'SELLER') return <div className="whos-turn">Waiting for buyer</div>
  return null
}

export default function OrderCard({ order, currentRole, viewerRole: viewerRoleProp, onAction, mutations = {} }) {
  const viewerRole = resolveViewerRole(viewerRoleProp, currentRole)
  const [modal, setModal]           = useState(null)
  const [expanded, setExpanded]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const action = getPrimaryAction(order, viewerRole)
  const labels = dispatchLabels(order)

  async function runMutation(fn) {
    setSubmitting(true)
    try { await fn() }
    finally { setSubmitting(false); setModal(null) }
  }

  const statusChip = (
    <span className={`chip chip--${order.status.toLowerCase()}`}>{order.status}</span>
  )

  const dispatchChip = order.dispatchMode && (
    <span className="chip chip--ink" style={{fontSize: 10, marginLeft: 6}}>
      {order.dispatchMode === 'PICKUP' ? 'Pickup' : 'Delivery'}
    </span>
  )

  const canCancel  = ['PENDING', 'CONFIRMED'].includes(order.status)
  const canDispute = order.status === 'CONFIRMED' && (!!order.handoff || !!order.payment)

  return (
    <div className="card order-card">
      <div className="order-card__head" onClick={() => setExpanded(v => !v)}>
        <span className="order-card__code">{order.orderCode}</span>
        {statusChip}
        {dispatchChip}
      </div>

      <div className="order-card__summary">
        <span>{order.species?.commonName ?? order.listing?.title}</span>
        <span>{order.orderedQtyKg} kg · ₱{order.agreedPricePerKg}/kg</span>
      </div>

      {expanded && (
        <OrderTimeline
          events={order.timeline ?? []}
          orderType="A"
          currentStatus={order.status}
        />
      )}

      <WhosTurnBanner order={order} viewerRole={viewerRole} />

      <div className="order-card__actions">
        {action === 'CONFIRM_ORDER'    && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_ORDER')}>Confirm Order</button>}
        {action === 'INITIATE_HANDOFF' && <button className="btn btn--primary btn--sm" onClick={() => setModal('INITIATE_HANDOFF')}>{labels.initiate}</button>}
        {action === 'CONFIRM_HANDOFF'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_HANDOFF')}>{labels.confirm}</button>}
        {action === 'RECORD_PAYMENT'   && <button className="btn btn--primary btn--sm" onClick={() => setModal('RECORD_PAYMENT')}>Record Payment</button>}
        {action === 'PAY_HANDOFF'      && <button className="btn btn--primary btn--sm" onClick={() => setModal('PAY_HANDOFF')}>Pay ₱{Number(order.handoff?.totalAmount ?? 0).toLocaleString()}</button>}
        {action === 'CONFIRM_PAYMENT'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_PAYMENT')}>Confirm Payment</button>}
        {action === 'PAYOUT'           && <button className="btn btn--ghost btn--sm" onClick={() => setModal('PAYOUT')}>Initiate Payout</button>}
        {action === 'LEAVE_REVIEW'     && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('REVIEW', order)}>Leave a Review</button>}
        {canDispute && (
          <button className="btn btn--ghost btn--sm" onClick={() => setModal('DISPUTE')}>Raise Dispute</button>
        )}
        {canCancel && (
          <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setModal('CANCEL')}>Cancel</button>
        )}
      </div>

      {modal === 'CONFIRM_ORDER'    && <ConfirmOrderModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmOrder?.(order.id))} onDecline={() => runMutation(() => mutations.cancelOrder?.(order.id, 'Declined by seller'))} />}
      {modal === 'INITIATE_HANDOFF' && <InitiateHandoffModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.initiateHandoff?.(order.id, body))} />}
      {modal === 'CONFIRM_HANDOFF'  && <ConfirmHandoffModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmHandoff?.(order.id))} onDispute={() => setModal('DISPUTE')} />}
      {modal === 'RECORD_PAYMENT'   && <RecordPaymentModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.recordPayment?.(order.id, body))} />}
      {modal === 'CONFIRM_PAYMENT'  && <ConfirmPaymentModal order={order} payment={order.payment} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmPayment?.(order.id))} />}
      {modal === 'CANCEL'           && <CancelOrderModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={(reason) => runMutation(() => mutations.cancelOrder?.(order.id, reason))} />}
      {modal === 'DISPUTE'          && <DisputeModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.raiseDispute?.(order.id, body))} />}
      {modal === 'PAYOUT'           && <InitiatePayoutModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.initiatePayout?.(order.id, body))} />}
      {modal === 'PAY_HANDOFF'      && <PayHandoffModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onSubmit={(method) => runMutation(async () => {
        const result = await mutations.createPaymentIntent?.(order.id, method)
        if (result?.redirectUrl) window.location = result.redirectUrl
      })} />}
    </div>
  )
}
