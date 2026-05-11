import { useState } from 'react'
import OrderTimeline from './OrderTimeline'
import ConfirmOrderModal   from './modals/ConfirmOrderModal'
import InitiateHandoffModal from './modals/InitiateHandoffModal'
import ConfirmHandoffModal  from './modals/ConfirmHandoffModal'
import RecordPaymentModal   from './modals/RecordPaymentModal'
import ConfirmPaymentModal  from './modals/ConfirmPaymentModal'
import CancelOrderModal     from './modals/CancelOrderModal'
import DisputeModal         from './modals/DisputeModal'

function getPrimaryAction(order, role, orderType) {
  const { status, handoff, payment } = order
  if (orderType === 'B') {
    if (role === 'VENDOR') {
      if (status === 'NEW')       return 'ACCEPT'
      if (status === 'PREPARING') return 'MARK_READY'
      if (status === 'READY')     return 'COMPLETE'
      if (status === 'COMPLETED') return 'PAYOUT'
    }
    if (role === 'BUYER') {
      if (status === 'READY')     return 'CONFIRM_RECEIPT'
      if (status === 'COMPLETED') return 'LEAVE_REVIEW'
    }
    return null
  }
  // Type A
  if (role === 'FISHERMAN') {
    if (status === 'PENDING')                                                  return 'CONFIRM_ORDER'
    if (status === 'CONFIRMED' && handoff?.status === 'PENDING')               return 'CONFIRM_HANDOFF'
    if (status === 'CONFIRMED' && payment?.status === 'PENDING')               return 'CONFIRM_PAYMENT'
    if (status === 'COMPLETED')                                                return 'VIEW_EARNINGS'
  }
  if (role === 'VENDOR') {
    if (status === 'CONFIRMED' && !handoff)                                    return 'INITIATE_HANDOFF'
    if (status === 'CONFIRMED' && handoff?.status === 'CONFIRMED' && !payment) return 'RECORD_PAYMENT'
    if (status === 'COMPLETED')                                                return 'PAYOUT'
  }
  return null
}

function WhosTurnBanner({ order, role, orderType }) {
  const action = getPrimaryAction(order, role, orderType)
  if (action) return <div className="whos-turn whos-turn--yours">Your turn</div>
  if (order.status === 'PENDING' && role !== 'FISHERMAN') return <div className="whos-turn">Waiting for fisherman to confirm</div>
  if (order.status === 'CONFIRMED' && role !== 'VENDOR')  return <div className="whos-turn">Waiting for vendor</div>
  return null
}

export default function OrderCard({ order, currentRole, orderType = 'A', onAction, mutations = {} }) {
  const [modal, setModal]           = useState(null)
  const [expanded, setExpanded]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const action = getPrimaryAction(order, currentRole, orderType)

  async function runMutation(fn) {
    setSubmitting(true)
    try { await fn() }
    finally { setSubmitting(false); setModal(null) }
  }

  const statusChip = (
    <span className={`chip chip--${order.status.toLowerCase()}`}>{order.status}</span>
  )

  const canCancel = orderType === 'A'
    ? (order.status === 'PENDING' || order.status === 'CONFIRMED')
    : (order.status === 'NEW' || order.status === 'PREPARING')

  return (
    <div className="card order-card">
      <div className="order-card__head" onClick={() => setExpanded(v => !v)}>
        <span className="order-card__code">{order.orderCode}</span>
        {statusChip}
      </div>

      <div className="order-card__summary">
        <span>{order.species?.commonName ?? order.listing?.title}</span>
        {orderType === 'A' && <span>{order.orderedQtyKg} kg · ₱{order.agreedPricePerKg}/kg</span>}
      </div>

      {expanded && (
        <OrderTimeline
          events={order.timeline ?? []}
          orderType={orderType}
          currentStatus={order.status}
        />
      )}

      <WhosTurnBanner order={order} role={currentRole} orderType={orderType} />

      <div className="order-card__actions">
        {action === 'CONFIRM_ORDER'    && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_ORDER')}>Confirm Order</button>}
        {action === 'CONFIRM_HANDOFF'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_HANDOFF')}>Confirm Handoff</button>}
        {action === 'CONFIRM_PAYMENT'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_PAYMENT')}>Confirm Payment</button>}
        {action === 'INITIATE_HANDOFF' && <button className="btn btn--primary btn--sm" onClick={() => setModal('INITIATE_HANDOFF')}>Initiate Handoff</button>}
        {action === 'RECORD_PAYMENT'   && <button className="btn btn--primary btn--sm" onClick={() => setModal('RECORD_PAYMENT')}>Record Payment</button>}
        {action === 'VIEW_EARNINGS'    && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('EARNINGS')}>View in Earnings</button>}
        {action === 'ACCEPT'           && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.accept?.(order.id))}>Accept Order</button>}
        {action === 'MARK_READY'       && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.markReady?.(order.id))}>Mark Ready</button>}
        {action === 'COMPLETE'         && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.complete?.(order.id))}>Complete Order</button>}
        {action === 'CONFIRM_RECEIPT'  && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.confirmReceipt?.(order.id))}>Confirm Receipt</button>}
        {action === 'LEAVE_REVIEW'     && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('REVIEW', order)}>Leave a Review</button>}
        {action === 'PAYOUT'           && <button className="btn btn--ghost btn--sm" onClick={() => onAction?.('PAYOUT', order)}>Initiate Payout</button>}
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
    </div>
  )
}
