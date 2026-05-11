// frontend/src/components/modals/ConfirmPaymentModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmPaymentModal({ order, payment, onClose, onConfirm, loading }) {
  return (
    <CrudModal
      title={`Confirm Payment Received — ${order.orderCode}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Yes, I Received Payment"
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Confirm that you have received payment for this order.
      </p>
      <div className="order-modal-row"><span>Amount</span><strong>&#8369;{payment?.amount?.toLocaleString('en-PH')}</strong></div>
      <div className="order-modal-row"><span>Method</span><strong>{payment?.method?.replace('_', ' ')}</strong></div>
      {payment?.reference && <div className="order-modal-row"><span>Reference</span><strong>{payment.reference}</strong></div>}
    </CrudModal>
  )
}
