// frontend/src/components/modals/ConfirmHandoffModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmHandoffModal({ order, handoff, viewerRole, onClose, onConfirm, onDispute, loading }) {
  const total = (handoff.actualQtyKg * handoff.finalPricePerKg).toLocaleString('en-PH')
  const isSeller = viewerRole === 'SELLER'

  // Seller (fisherman) is handing off; Buyer (vendor) is receiving.
  const counterpartyName = isSeller
    ? (order.buyer?.fullName ?? 'the buyer')
    : (order.seller?.fullName ?? 'the fisherman')
  const actionVerb = isSeller ? 'handed off' : 'received'
  const preposition = isSeller ? 'to' : 'from'

  return (
    <CrudModal
      title={`Confirm Handoff — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isSeller ? 'Confirm Handoff' : 'Confirm Receipt'}
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Confirm that you {actionVerb} the following {preposition} {counterpartyName}:
      </p>
      <div className="order-modal-row"><span>Actual weight</span><strong>{handoff.actualQtyKg} kg</strong></div>
      <div className="order-modal-row"><span>Final price</span><strong>&#8369;{handoff.finalPricePerKg}/kg</strong></div>
      <div className="order-modal-row order-modal-row--total"><span>Total owed</span><strong>&#8369;{total}</strong></div>
      <button className="btn btn--ghost btn--danger" onClick={onDispute} disabled={loading} style={{ marginTop: 8 }}>
        Raise Dispute
      </button>
    </CrudModal>
  )
}
