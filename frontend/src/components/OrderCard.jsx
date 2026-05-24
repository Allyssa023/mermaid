import { useState } from 'react'
import OrderTimeline from './OrderTimeline'
import ConfirmOrderModal   from './modals/ConfirmOrderModal'
import InitiateHandoffModal from './modals/InitiateHandoffModal'
import ConfirmHandoffModal  from './modals/ConfirmHandoffModal'
import RecordPaymentModal   from './modals/RecordPaymentModal'
import ConfirmPaymentModal  from './modals/ConfirmPaymentModal'
import InitiatePayoutModal  from './modals/InitiatePayoutModal'
import PayHandoffModal      from './modals/PayHandoffModal'
import MarkPickedUpModal   from './modals/MarkPickedUpModal'
import MarkDeliveredModal  from './modals/MarkDeliveredModal'
import ConfirmReceiptModal from './modals/ConfirmReceiptModal'

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
      if (order.kind === 'RETAIL') return 'MARK_PREPARING'
      // PROCUREMENT: fisherman hands off fish, then confirms payment from vendor
      if (!handoff) return 'INITIATE_HANDOFF'
      if (payment && payment.status !== 'SETTLED') return 'CONFIRM_PAYMENT'
      return null
    }
    if (viewerRole === 'BUYER') {
      if (handoff?.status === 'PENDING' && !handoff.confirmedByBuyer) return 'CONFIRM_HANDOFF'
      if (handoff?.status === 'CONFIRMED' && !payment)                return 'PAY_HANDOFF'
      if (payment?.status === 'PENDING')                              return 'AWAITING_PAYMENT_CONFIRM'
      if (payment?.status === 'CONFIRMED')                            return 'AWAITING_PAYMENT_CONFIRM'
    }
    return null
  }
  if (status === 'PREPARING') {
    if (viewerRole === 'SELLER') {
      return order.dispatchMode === 'DELIVERY' ? 'DISPATCH' : 'MARK_READY'
    }
    return null
  }
  if (status === 'READY') {
    if (viewerRole === 'SELLER') return 'COMPLETE_PICKUP'
    return null
  }
  if (status === 'OUT_FOR_DELIVERY') {
    // Buyer must confirm receipt first; vendor waits
    if (viewerRole === 'BUYER')  return 'CONFIRM_RECEIPT'
    if (viewerRole === 'SELLER') return 'AWAITING_BUYER_RECEIPT'
    return null
  }
  if (status === 'AWAITING_RECEIPT') {
    if (order.dispatchMode === 'DELIVERY') {
      // Buyer already confirmed receipt; vendor finalises with mark-delivered
      if (viewerRole === 'SELLER') return 'MARK_DELIVERED'
      return null
    }
    // Pickup: vendor handed off, buyer confirms
    if (viewerRole === 'SELLER') return 'AWAITING_BUYER_RECEIPT'
    if (viewerRole === 'BUYER')  return 'CONFIRM_RECEIPT'
    return null
  }
  if (status === 'COMPLETED') {
    return null
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
  if (action === 'AWAITING_BUYER_PAYMENT')  return <div className="whos-turn">Waiting for buyer to pay</div>
  if (action === 'AWAITING_PAYMENT_CONFIRM') return <div className="whos-turn">Payment processing — awaiting confirmation</div>
  if (action === 'AWAITING_BUYER_RECEIPT')  return <div className="whos-turn">Waiting for buyer to confirm receipt</div>
  if (action === 'MARK_PREPARING')   return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (action === 'DISPATCH')         return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (action === 'MARK_DELIVERED')   return <div className="whos-turn whos-turn--yours">Your turn — confirm the delivery</div>
  if (action === 'COMPLETE_PICKUP')  return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (action === 'CONFIRM_RECEIPT')  return <div className="whos-turn whos-turn--yours">Your turn — confirm you received your order</div>
  if (action) return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (order.status === 'PENDING'           && viewerRole === 'BUYER')  return <div className="whos-turn">Waiting for seller to confirm</div>
  if (order.status === 'CONFIRMED'         && viewerRole === 'BUYER')  return <div className="whos-turn">Waiting for seller</div>
  if (order.status === 'CONFIRMED'         && viewerRole === 'SELLER') return <div className="whos-turn">Waiting for buyer</div>
  if (order.status === 'PREPARING'         && viewerRole === 'BUYER')  return <div className="whos-turn">Your order is being prepared</div>
  if (order.status === 'OUT_FOR_DELIVERY'  && viewerRole === 'BUYER')  return <div className="whos-turn whos-turn--yours">Your turn — confirm you received your order</div>
  if (order.status === 'AWAITING_RECEIPT'  && viewerRole === 'BUYER' && order.dispatchMode === 'DELIVERY') return <div className="whos-turn">Receipt confirmed — waiting for vendor to mark delivered</div>
  if (order.status === 'AWAITING_RECEIPT'  && viewerRole === 'BUYER') return <div className="whos-turn whos-turn--yours">Your turn — confirm you received your order</div>
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

  const STATUS_CHIP_MOD = {
    PENDING: 'chip--new', CONFIRMED: 'chip--prep', PREPARING: 'chip--prep',
    READY: 'chip--ready', OUT_FOR_DELIVERY: 'chip--ready', AWAITING_RECEIPT: 'chip--ready',
    COMPLETED: 'chip--done', CANCELLED: 'chip--cancel', DISPUTED: 'chip--neg',
  }
  const statusChip = (
    <span className={`chip ${STATUS_CHIP_MOD[order.status] ?? 'chip--done'}`}>
      <span className="chip__dot" />{order.status}
    </span>
  )

  const dispatchChip = order.dispatchMode && (
    <span className="chip chip--ink" style={{fontSize: 10, marginLeft: 6}}>
      {order.dispatchMode === 'PICKUP' ? 'Pickup' : 'Delivery'}
    </span>
  )

  return (
    <div className="card order-card">
      <div className="order-card__head" onClick={() => setExpanded(v => !v)}>
        <span className="order-card__code">{order.orderCode}</span>
        {statusChip}
        {dispatchChip}
      </div>

      <div className="order-card__summary">
        <span>{order.species?.commonName ?? order.listing?.title ?? order.speciesName ?? '—'}</span>
        <span>{order.orderedQtyKg ?? '—'} kg · ₱{order.agreedPricePerKg ?? '—'}/kg</span>
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
        {action === 'MARK_PREPARING'   && <button className="btn btn--primary btn--sm" onClick={() => setModal('MARK_PREPARING')}>Start Packing</button>}
        {action === 'MARK_READY'       && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.markReady?.(order.id))}>Ready for Pickup</button>}
        {action === 'DISPATCH'         && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.dispatchRider?.(order.id))}>Rider Dispatched</button>}
        {action === 'COMPLETE_PICKUP'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('COMPLETE_PICKUP')}>Mark Picked Up</button>}
        {action === 'MARK_DELIVERED'   && <button className="btn btn--primary btn--sm" onClick={() => setModal('MARK_DELIVERED')}>Mark Delivered</button>}
        {action === 'CONFIRM_RECEIPT'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_RECEIPT')}>I Received My Order</button>}
      </div>

      {modal === 'CONFIRM_ORDER'    && <ConfirmOrderModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmOrder?.(order.id))} onDecline={() => runMutation(() => mutations.cancelOrder?.(order.id, 'Declined by seller'))} />}
      {modal === 'INITIATE_HANDOFF' && <InitiateHandoffModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.initiateHandoff?.(order.id, body))} />}
      {modal === 'CONFIRM_HANDOFF'  && <ConfirmHandoffModal order={order} handoff={order.handoff} viewerRole={viewerRole} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmHandoff?.(order.id))} />}
      {modal === 'RECORD_PAYMENT'   && <RecordPaymentModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.recordPayment?.(order.id, body))} />}
      {modal === 'CONFIRM_PAYMENT'  && <ConfirmPaymentModal order={order} payment={order.payment} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmPayment?.(order.id))} />}
      {modal === 'PAYOUT'           && <InitiatePayoutModal order={order} loading={submitting} onClose={() => setModal(null)} onSubmit={(body) => runMutation(() => mutations.initiatePayout?.(order.id, body))} />}
      {modal === 'MARK_PREPARING'   && <MarkPickedUpModal order={order} mode="PREPARING" loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.markPreparing?.(order.id))} />}
      {modal === 'COMPLETE_PICKUP'  && <MarkPickedUpModal order={order} mode="PICKUP" loading={submitting} onClose={() => setModal(null)} onConfirm={(body) => runMutation(() => mutations.completePickup?.(order.id, body))} />}
      {modal === 'MARK_DELIVERED'   && <MarkDeliveredModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={(body) => runMutation(() => mutations.markDelivered?.(order.id, body))} />}
      {modal === 'CONFIRM_RECEIPT'  && <ConfirmReceiptModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmReceipt?.(order.id))} />}
      {modal === 'PAY_HANDOFF'      && <PayHandoffModal order={order} handoff={order.handoff} loading={submitting} onClose={() => setModal(null)} onSubmit={(method, isXendit) => runMutation(async () => {
        if (isXendit) {
          const result = await mutations.createPaymentIntent?.(order.id, method)
          if (result?.redirectUrl) window.location = result.redirectUrl
        } else {
          // CASH or CREDIT — record payment directly, no Xendit redirect
          const amount = order.handoff?.totalAmount ?? (order.orderedQtyKg * order.agreedPricePerKg)
          await mutations.recordPayment?.(order.id, { method, amount, reference: '' })
        }
      })} />}
    </div>
  )
}
