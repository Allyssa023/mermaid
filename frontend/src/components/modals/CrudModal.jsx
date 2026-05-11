// frontend/src/components/modals/CrudModal.jsx
import { useEffect, useRef } from 'react'

export default function CrudModal({
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmDestructive = false,
  loading = false,
  disabled = false,
  children,
}) {
  const overlayRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <span className="modal__title">{title}</span>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal__body">{children}</div>
        {onConfirm && (
          <div className="modal__foot">
            <button className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={`btn ${confirmDestructive ? 'btn--danger' : 'btn--primary'}`}
              onClick={onConfirm}
              disabled={disabled || loading}
            >
              {loading ? <span className="spinner" /> : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
