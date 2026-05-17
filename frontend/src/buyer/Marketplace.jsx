import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { I } from '../icons'
import { fetchListings } from './api/marketplace'
import { useCart } from '../context/CartContext'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Marketplace({ setPage, setBuyNow }) {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null)
  const [search, setSearch]   = useState('')
  const [cartModal, setCartModal] = useState(null)
  const [qty, setQty]         = useState(1)
  const [notes, setNotes]     = useState('')
  const [addErr, setAddErr]   = useState('')

  const { addItem } = useCart()

  const listingsQ = useQuery({
    queryKey: ['buyerListings'],
    queryFn: () => fetchListings({ size: 100 }),
    staleTime: 30_000,
  })

  const addToCartMut = useMutation({
    mutationFn: () => addItem({ listingId: cartModal?.id, quantityKg: Number(qty), notes: notes || null }),
    onSuccess: () => { setCartModal(null); setAddErr('') },
    onError: (e) => setAddErr(e?.message ?? 'Could not add to cart'),
  })

  const allListings = useMemo(
    () => listingsQ.data?.content ?? listingsQ.data ?? [],
    [listingsQ.data],
  )

  // Species chips derived from ALL listings
  const speciesChips = useMemo(() => {
    const map = new Map()
    for (const l of allListings) {
      if (!map.has(l.speciesId))
        map.set(l.speciesId, { speciesId: l.speciesId, speciesName: l.speciesName, count: 0 })
      map.get(l.speciesId).count++
    }
    return Array.from(map.values())
  }, [allListings])

  // Filtered listings for display
  const listings = useMemo(() => {
    let r = allListings
    if (selectedSpeciesId) r = r.filter(l => l.speciesId === selectedSpeciesId)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(l => l.title?.toLowerCase().includes(q) || l.vendorName?.toLowerCase().includes(q))
    }
    return r
  }, [allListings, selectedSpeciesId, search])

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton /></div>
  if (listingsQ.error)     return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>

  return (
    <div className="page">
      {/* Page header */}
      <div className="page__head">
        <div>
          <div className="eyebrow">Marketplace</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Fresh from the <em>coast</em></h1>
          <p className="page__sub">
            {listings.length} listing{listings.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => setPage('bcart')}>
            <I.Cart size={12} /> Cart
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginTop: 18, padding: '14px 18px' }}>
        <div className="search-input">
          <I.Search size={14} />
          <input
            placeholder="Search species or vendor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Species chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, marginBottom: 14 }}>
        <button
          className={`chip${!selectedSpeciesId ? ' chip--safe' : ''}`}
          style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
          onClick={() => setSelectedSpeciesId(null)}
        >
          All
        </button>
        {speciesChips.map(sp => (
          <button
            key={sp.speciesId}
            className={`chip${selectedSpeciesId === sp.speciesId ? ' chip--safe' : ''}`}
            style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
            onClick={() => setSelectedSpeciesId(s => s === sp.speciesId ? null : sp.speciesId)}
          >
            {sp.speciesName}{' '}
            <span className="muted-data" style={{ fontSize: 10 }}>({sp.count})</span>
          </button>
        ))}
      </div>

      {/* Listings grid */}
      <div className="buyer-grid">
        {listings.map(l => {
          const availKg = l.availableKg ?? 0
          return (
            <div key={l.id} className="buyer-card">
              <div className="buyer-card__hero" style={l.photoUrl ? {backgroundImage: `url(${l.photoUrl})`} : {}}>
                {!l.photoUrl && <I.Fish size={32} style={{opacity:0.3}} />}
              </div>

              <div className="buyer-card__body">
                <div className="buyer-card__species">{l.title ?? l.speciesName}</div>
                <div className="buyer-card__vendor">{l.vendorName}</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ₱{l.pricePerKg}<small>/kg</small>
                  </span>
                  <span className={`chip chip--${availKg > 0 ? 'safe' : 'unsafe'}`} style={{ fontSize: 10 }}>
                    {availKg > 0 ? `${availKg} kg` : 'Sold out'}
                  </span>
                </div>
                {l.deliveryFee > 0 && (
                  <span className="muted-data" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                    + ₱{l.deliveryFee} delivery fee
                  </span>
                )}
              </div>

              <div className="buyer-card__foot">
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={availKg <= 0}
                  onClick={() => { setCartModal(l); setQty(l.minQtyKg ?? 1); setNotes(''); setAddErr('') }}
                >
                  Add to cart
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  disabled={availKg <= 0}
                  onClick={() => { setBuyNow({ listing: l }); setPage('bcheckout') }}
                >
                  Order now
                </button>
              </div>
            </div>
          )
        })}

        {listings.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1', padding: '32px 0' }}>No listings found.</div>
        )}
      </div>

      {/* Add to cart modal */}
      {cartModal && (
        <div className="modal-overlay" onClick={() => setCartModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">{cartModal.vendorName}</div>
                <h2 className="modal__title" style={{ marginTop: 4 }}>{cartModal.title ?? cartModal.speciesName}</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setCartModal(null)}>
                <I.X size={14} />
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="form-row form-row--2col">
                <div>
                  <label>Quantity (kg)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    min={cartModal.minQtyKg ?? 0.1}
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                  />
                </div>
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

            {addErr && <p style={{ color: 'var(--unsafe)', fontSize: 12, marginTop: 8 }}>{addErr}</p>}

            <div className="modal__foot">
              <button className="btn" onClick={() => setCartModal(null)}>Cancel</button>
              <button
                className="btn btn--primary"
                disabled={addToCartMut.isPending}
                onClick={() => addToCartMut.mutate()}
              >
                {addToCartMut.isPending ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
