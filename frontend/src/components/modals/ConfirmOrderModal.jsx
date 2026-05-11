// frontend/src/components/modals/ConfirmOrderModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmOrderModal({ order, onClose, onConfirm, onDecline, loading }) {
  const total = (order.orderedQtyKg * order.agreedPricePerKg).toLocaleString('en-PH')
  return (
    <CrudModal
      title={`Confirm Order ${order.orderCode}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Confirm Order"
      loading={loading}
    >
      <div className="order-modal-row"><span>From</span><strong>{order.buyer?.fullName}</strong></div>
      <div className="order-modal-row"><span>Species</span><strong>{order.species?.commonName}</strong></div>
      <div className="order-modal-row"><span>Quantity</span><strong>{order.orderedQtyKg} kg</strong></div>
      <div className="order-modal-row"><span>Price</span><strong>&#8369;{order.agreedPricePerKg}/kg</strong></div>
      <div className="order-modal-row order-modal-row--total"><span>Total</span><strong>&#8369;{total}</strong></div>
      <div className="order-modal-row"><span>Dispatch</span><strong>{order.dispatchMode}</strong></div>
      <button className="btn btn--ghost btn--danger" onClick={onDecline} disabled={loading} style={{ marginTop: 8 }}>
        Decline Order
      </button>
    </CrudModal>
  )
}
