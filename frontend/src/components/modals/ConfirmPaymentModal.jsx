// frontend/src/components/modals/ConfirmPaymentModal.jsx
import CrudModal from './CrudModal'

export default function ConfirmPaymentModal({ order, payment, onClose, onConfirm, loading }) {
  const isCredit = payment?.method === 'CREDIT'
  const isCash   = payment?.method === 'CASH'

  const title = isCredit
    ? `Confirm Credit — ${order.orderCode}`
    : `Confirm Payment — ${order.orderCode}`

  const confirmLabel = isCredit
    ? 'Confirm Credit & Settle'
    : 'Confirm & Settle Earnings'

  return (
    <CrudModal
      title={title}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      loading={loading}
    >
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        {isCredit
          ? 'The buyer recorded this as credit (pay later). Confirm to settle the order — this amount will appear as outstanding in your earnings until paid.'
          : isCash
            ? 'The buyer recorded a cash payment. Confirm that you received the cash to settle your earnings.'
            : <>The buyer has paid via <strong>{payment?.method?.replace('_', ' ') ?? 'Xendit'}</strong>. Confirm to settle this order and add the earnings to your balance.</>
        }
      </p>
      <div className="order-modal-row"><span>Amount</span><strong>&#8369;{payment?.amount?.toLocaleString('en-PH')}</strong></div>
      <div className="order-modal-row"><span>Method</span><strong>{payment?.method?.replace('_', ' ')}</strong></div>
      {payment?.proofReference && <div className="order-modal-row"><span>Reference</span><strong>{payment.proofReference}</strong></div>}
    </CrudModal>
  )
}
