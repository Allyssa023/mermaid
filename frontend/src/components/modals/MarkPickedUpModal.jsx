import { useState } from 'react'
import CrudModal from './CrudModal'

export default function MarkPickedUpModal({ order, mode, onClose, onConfirm, loading }) {
  const isCOD = !order.payment && mode === 'PICKUP'
  const defaultAmount = (
    (order.orderedQtyKg ?? 0) * (order.agreedPricePerKg ?? 0) + (order.deliveryFee ?? 0)
  ).toFixed(2)
  const [codAmount, setCodAmount] = useState(defaultAmount)

  const title = mode === 'PREPARING' ? 'Start Packing' : 'Mark as Picked Up'
  const label = mode === 'PREPARING' ? 'Confirm Packing Started' : 'Mark Picked Up'

  const handleConfirm = () => {
    if (mode === 'PREPARING') { onConfirm(); return }
    onConfirm(isCOD ? { codAmount: Number(codAmount) } : {})
  }

  return (
    <CrudModal title={title} onClose={onClose} onConfirm={handleConfirm} confirmLabel={label} loading={loading}>
      {mode === 'PICKUP' && isCOD && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Cash collected (₱)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={codAmount}
            onChange={e => setCodAmount(e.target.value)}
          />
        </div>
      )}
      {mode === 'PICKUP' && !isCOD && (
        <p>Confirm the buyer has picked up their order.</p>
      )}
      {mode === 'PREPARING' && (
        <p>Confirm you have started packing this order.</p>
      )}
    </CrudModal>
  )
}
