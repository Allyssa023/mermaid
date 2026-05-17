import { useState, useEffect } from 'react'
import { fetchListingDetail } from '../../buyer/api/marketplace'
import { useCart } from '../../context/CartContext'
import CrudModal from './CrudModal'

export default function AddToCartModal({ listing, onClose }) {
  const { addItem } = useCart()
  const [qty, setQty]               = useState(listing.minQtyKg ?? 1)
  const [notes, setNotes]           = useState('')
  const [err, setErr]               = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [freshStock, setFreshStock] = useState(null)
  const [checking, setChecking]     = useState(true)

  useEffect(() => {
    setChecking(true)
    fetchListingDetail(listing.id)
      .then(detail => {
        const l = detail?.listing ?? detail
        setFreshStock({ availableKg: l?.availableKg ?? listing.availableKg, minQtyKg: l?.minQtyKg ?? listing.minQtyKg })
        setQty(l?.minQtyKg ?? listing.minQtyKg ?? 1)
      })
      .catch(() => setFreshStock({ availableKg: listing.availableKg, minQtyKg: listing.minQtyKg }))
      .finally(() => setChecking(false))
  }, [listing.id])

  async function handleConfirm() {
    const n = Number(qty)
    const avail = freshStock?.availableKg ?? 0
    const min   = freshStock?.minQtyKg    ?? 0
    if (!n || n <= 0)   { setErr('Quantity must be greater than 0'); return }
    if (min && n < min) { setErr(`Minimum order is ${min} kg`); return }
    if (n > avail)      { setErr(`Only ${avail} kg available`); return }
    setSubmitting(true)
    setErr('')
    try {
      await addItem({ listingId: listing.id, quantityKg: n, notes: notes || null })
      onClose()
    } catch (e) {
      setErr(e?.message ?? 'Could not add to cart')
    } finally {
      setSubmitting(false)
    }
  }

  const soldOut = !checking && (freshStock?.availableKg ?? 0) <= 0

  return (
    <CrudModal
      title={`Add to cart — ${listing.title ?? listing.speciesName}`}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel={soldOut ? 'Sold out' : 'Add to cart'}
      loading={submitting || checking}
      disabled={soldOut}
    >
      <div className="form-grid">
        <div className="form-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Quantity (kg)
            {checking && <span className="muted-data" style={{ fontSize: 11 }}>checking stock…</span>}
            {!checking && freshStock && (
              <span className={`chip chip--${freshStock.availableKg > 0 ? 'safe' : 'unsafe'}`} style={{ fontSize: 10 }}>
                {freshStock.availableKg > 0 ? `${freshStock.availableKg} kg available` : 'Sold out'}
              </span>
            )}
          </label>
          <input
            className="input"
            type="number"
            step="0.1"
            min={freshStock?.minQtyKg ?? 0.1}
            max={freshStock?.availableKg ?? undefined}
            value={qty}
            disabled={checking || soldOut}
            onChange={e => { setQty(e.target.value); setErr('') }}
          />
        </div>
        <div className="form-row">
          <label>Notes (optional)</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
      {err && <p style={{ color: 'var(--unsafe)', fontSize: 12, marginTop: 8 }}>{err}</p>}
    </CrudModal>
  )
}
