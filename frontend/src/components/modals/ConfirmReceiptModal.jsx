import CrudModal from './CrudModal'

export default function ConfirmReceiptModal({ onClose, onConfirm, loading }) {
  return (
    <CrudModal
      title="Confirm Receipt"
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="I Received My Order"
      loading={loading}
    >
      <p>Confirm you have received your order in good condition.</p>
    </CrudModal>
  )
}
