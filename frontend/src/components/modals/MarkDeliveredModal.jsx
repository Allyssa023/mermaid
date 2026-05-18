import { useState } from 'react'
import CrudModal from './CrudModal'

export default function MarkDeliveredModal({ order, onClose, onConfirm, loading }) {
  const isCOD = !order.payment
  const defaultAmount = (
    (order.orderedQtyKg ?? 0) * (order.agreedPricePerKg ?? 0) + (order.deliveryFee ?? 0)
  ).toFixed(2)
  const [codAmount, setCodAmount] = useState(defaultAmount)

  return (
    <CrudModal
      title="Mark as Delivered"
      onClose={onClose}
      onConfirm={() => onConfirm(isCOD ? { codAmount: Number(codAmount) } : {})}
      confirmLabel="Mark Delivered"
      loading={loading}
    >
      {isCOD ? (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Cash collected from buyer (₱)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={codAmount}
            onChange={e => setCodAmount(e.target.value)}
          />
        </div>
      ) : (
        <p>Confirm the order has been delivered to the buyer.</p>
      )}
    </CrudModal>
  )
}
