import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listLots, recordAdjustment } from './api/inventory'
import { createListing, listListings, uploadListingPhoto } from './api/storefront'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const ADJUST_REASONS = ['DAMAGED', 'SPOILAGE', 'CORRECTION', 'OTHER']

function PageHead({ eyebrow, title, em, sub, actions }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="section-title">{title} {em && <em>{em}</em>}</h1>
        {sub && <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 560 }}>{sub}</p>}
      </div>
      <div className="page__actions">{actions}</div>
    </div>
  )
}

export default function Inventory() {
  const [thr, setThr]               = useState(10)
  const [speciesFilter, setSpecies] = useState('')
  const [adjustLot, setAdjustLot]   = useState(null)
  const [listLot, setListLot]       = useState(null)
  const [filter, setFilter]         = useState('active')
  const [page, setPage]             = useState(0)
  const LOTS_PAGE_SIZE              = 10

  const qc = useQueryClient()
  const lotsQ    = useQuery({
    queryKey: ['vendor', 'inventory', speciesFilter],
    queryFn:  () => listLots(speciesFilter ? Number(speciesFilter) : undefined, true),
  })
  const speciesQ  = useQuery({ queryKey: ['lookup', 'species'], queryFn: fetchSpecies })
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })

  const invalidate      = () => qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] })
  const invalidateStore = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })

  if (lotsQ.isLoading) return <div className="content"><TableRowSkeleton rows={6} /></div>
  if (lotsQ.error)     return <div className="content"><ApiError error={lotsQ.error} onRetry={lotsQ.refetch} /></div>

  const lots = lotsQ.data ?? []

  const onHandKg      = lots.reduce((s, l) => s + (l.remainingKg ?? 0), 0)
  const costValue     = lots.reduce((s, l) => s + ((l.remainingKg ?? 0) * (l.costPerKg ?? 0)), 0)
  const initialTotal  = lots.reduce((s, l) => s + (l.initialKg ?? 0), 0)
  const turnoverPct   = initialTotal > 0 ? ((initialTotal - onHandKg) / initialTotal * 100) : 0
  const lowStockCount = lots.filter(l => (l.remainingKg ?? 0) <= thr && (l.remainingKg ?? 0) > 0).length
  const avgAge = lots.length > 0
    ? lots.reduce((s, l) => s + ((Date.now() - new Date(l.receivedAt || Date.now()).getTime()) / 86400000), 0) / lots.length
    : 0

  const filteredLots = lots.filter(l => {
    if (filter === 'low')     return (l.remainingKg ?? 0) <= thr && (l.remainingKg ?? 0) > 0
    if (filter === 'soldout') return (l.remainingKg ?? 0) === 0
    if (filter === 'active')  return (l.remainingKg ?? 0) > 0
    return true
  })

  const listedLotIds = new Set((listingsQ.data ?? []).flatMap(l => l.lotIds ?? []))

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={`Inventory · ${lots.length} lots`}
        title="Your"
        em="lots"
        sub="Every batch received from fishermen, with remaining weight, cost basis, and shelf state."
        actions={<>
          <button className="btn"><I.Note size={13} /> Export</button>
          <button className="btn btn--primary" onClick={() => {}}><I.Plus size={13} /> Adjust lot</button>
        </>}
      />

      <div className="kpi-strip">
        <div className="cell"><div className="l">On-hand</div><div className="v">{onHandKg.toFixed(1)}<small>kg</small></div><div className="s">across {lots.length} lots</div></div>
        <div className="cell"><div className="l">Cost value</div><div className="v">₱{(costValue / 1000).toFixed(1)}<small>k</small></div><div className="s">at landed cost</div></div>
        <div className="cell"><div className="l">Turnover</div><div className="v">{turnoverPct.toFixed(0)}<small>%</small></div><div className="s">sold of received</div></div>
        <div className="cell"><div className="l">Low stock</div><div className="v">{lowStockCount}</div><div className="s">≤ {thr}kg threshold</div></div>
        <div className="cell"><div className="l">Avg age</div><div className="v">{avgAge.toFixed(1)}<small>d</small></div><div className="s">since landed</div></div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <label style={{ margin: 0 }}>Threshold</label>
          <input type="number" value={thr} min={0} onChange={e => setThr(Number(e.target.value))} style={{ width: 80 }} />
          <span style={{ color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>kg</span>
        </div>
        <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <label style={{ margin: 0 }}>Species</label>
          <select value={speciesFilter} onChange={e => setSpecies(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">All species</option>
            {(speciesQ.data ?? []).map(s => (
              <option key={s.id} value={s.id}>{s.commonName}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <div className="filter-pills">
          {[
            { id: 'active',  label: 'Active'   },
            { id: 'low',     label: 'Low'      },
            { id: 'soldout', label: 'Sold out' },
            { id: 'all',     label: 'All'      },
          ].map(f => (
            <span
              key={f.id}
              className={`pill-btn${filter === f.id ? ' on' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => { setFilter(f.id); setPage(0) }}
            >
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredLots.slice(page * LOTS_PAGE_SIZE, (page + 1) * LOTS_PAGE_SIZE).map(lot => {
          const remaining = lot.remainingKg ?? 0
          const initial   = lot.initialKg ?? 0
          const pct       = initial > 0 ? Math.round((remaining / initial) * 100) : 0
          const isLow     = remaining <= thr && remaining > 0
          const isEmpty   = remaining === 0
          const isListed  = listedLotIds.has(lot.id)

          return (
            <div key={lot.id} className={`lot-row${isEmpty ? ' is-empty' : ''}`}>
              <div className="lot-row__icon">🐟</div>
              <div className="lot-row__identity">
                <div className="lot-row__name">{lot.speciesCommonName ?? lot.speciesName ?? `Lot #${lot.id}`}</div>
                <div className="lot-row__sub">#{lot.id} · {lot.speciesLocalName ?? lot.speciesName ?? '—'}</div>
              </div>
              <div className="lot-row__metric">
                <div className="lot-row__val">
                  {lot.receivedAt ? new Date(lot.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                </div>
                <div className="lot-row__label">received</div>
              </div>
              <div className="lot-row__metric">
                <div className={`lot-row__val${isLow || isEmpty ? ' lot-row__val--warn' : ''}`}>
                  {remaining.toFixed(1)}<small style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 400, marginLeft: 2 }}>/{initial.toFixed(1)}kg</small>
                </div>
                <div className={`lot-row__meter${isLow || isEmpty ? ' low' : ''}`}>
                  <span style={{ width: isEmpty ? '4%' : pct + '%' }} />
                </div>
              </div>
              <div className="lot-row__metric">
                <div className="lot-row__val" style={{ color: 'var(--accent-lime)' }}>
                  {lot.costPerKg ? `₱${lot.costPerKg}` : '—'}
                </div>
                <div className="lot-row__label">per kg</div>
              </div>
              <div className="lot-row__actions">
                <button className="btn btn--sm btn--ghost" onClick={() => setAdjustLot(lot)}>Adjust</button>
                {isEmpty ? (
                  <span className="chip chip--done" style={{ padding: '4px 10px' }}>Sold out</span>
                ) : isListed ? (
                  <span className="chip chip--ready" style={{ padding: '4px 10px' }}>Listed</span>
                ) : (
                  <button className="btn btn--sm btn--primary" onClick={() => setListLot(lot)}>
                    <I.Plus size={11} /> List
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filteredLots.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted-2)', padding: 40, fontSize: 13 }}>
            {lots.length === 0
              ? 'No inventory yet — lots appear when procurement orders complete.'
              : 'No lots match this filter.'}
          </div>
        )}
      </div>
      {filteredLots.length > LOTS_PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 4px', borderTop: '1px solid var(--line)' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {page * LOTS_PAGE_SIZE + 1}–{Math.min((page + 1) * LOTS_PAGE_SIZE, filteredLots.length)} of {filteredLots.length}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LOTS_PAGE_SIZE >= filteredLots.length}>Next →</button>
        </div>
      )}

      {adjustLot && (
        <AdjustLotModal
          lot={adjustLot}
          onClose={() => setAdjustLot(null)}
          onSubmit={async (body) => {
            await recordAdjustment(adjustLot.id, body.deltaKg, body.reason, body.note)
            invalidate()
            setAdjustLot(null)
          }}
        />
      )}

      {listLot && (
        <ListForSaleModal
          lot={listLot}
          onClose={() => setListLot(null)}
          onSubmit={async (body) => {
            await createListing(body)
            invalidateStore()
            invalidate()
            setListLot(null)
          }}
        />
      )}
    </div>
  )
}

function ListForSaleModal({ lot, onClose, onSubmit }) {
  const [title, setTitle]           = useState(`${lot.speciesName} – Lot #${lot.id}`)
  const [price, setPrice]           = useState(lot.costPerKg ?? '')
  const [minQty, setMinQty]         = useState('0.5')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl]     = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [submitting, setBusy]       = useState(false)
  const [error, setError]           = useState('')
  const fileRef = useRef(null)

  const [currentSlot, setCurrentSlot] = useState(null)
  const [photoEyes,   setPhotoEyes]   = useState(null)
  const [photoGills,  setPhotoGills]  = useState(null)
  const [photoScales, setPhotoScales] = useState(null)
  const [photoBelly,  setPhotoBelly]  = useState(null)
  const [photoFlesh,  setPhotoFlesh]  = useState(null)

  const SLOT_SETTERS = {
    cover: setPhotoUrl, eyes: setPhotoEyes, gills: setPhotoGills,
    scales: setPhotoScales, belly: setPhotoBelly, flesh: setPhotoFlesh,
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setPhotoError('File must be JPEG, PNG, or WebP under 5 MB'); return }
    if (file.size > 5 * 1024 * 1024)  { setPhotoError('File must be JPEG, PNG, or WebP under 5 MB'); return }
    setPhotoError('')
    setPhotoUploading(true)
    try {
      const data = await uploadListingPhoto(file)
      const setter = SLOT_SETTERS[currentSlot] ?? setPhotoUrl
      setter(data.url)
    } catch {
      setPhotoError('Upload failed — try again')
    } finally {
      setPhotoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async () => {
    const p = Number(price)
    const q = Number(minQty)
    if (!photoUrl)                                                              { setError('Please upload a photo first'); return }
    if (!photoEyes || !photoGills || !photoScales || !photoBelly || !photoFlesh) { setError('Please upload all 5 freshness photos'); return }
    if (!title.trim())  { setError('Title is required'); return }
    if (!p || p <= 0)   { setError('Enter a valid price per kg'); return }
    if (!q || q < 0.1)  { setError('Minimum qty must be at least 0.1 kg'); return }
    setBusy(true)
    try {
      await onSubmit({
        speciesId: lot.speciesId,
        title: title.trim(),
        pricePerKg: p,
        minQtyKg: q,
        description: description || null,
        photoUrl, photoEyes, photoGills, photoScales, photoBelly, photoFlesh,
        lotIds: [lot.id],
        deliveryFee: deliveryFee ? Number(deliveryFee) : null,
      })
    } catch (e) {
      setError(e?.message ?? 'Failed to create listing')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 92vw)', padding: 22, maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="card__head">
          <div>
            <div className="eyebrow">Lot #{lot.id} · {lot.remainingKg} kg available</div>
            <div className="card__title">List for sale</div>
            <div className="card__sub">Creates a storefront listing buyers can order from.</div>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Photo <span style={{ color: 'var(--coral)', marginLeft: 2 }}>*</span></label>
            {photoUploading ? (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Uploading…</span>
            ) : photoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={photoUrl} alt="listing" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Change photo</button>
              </div>
            ) : (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>
                Select photo (required)
              </button>
            )}
            {photoError && (
              <span style={{ fontSize: 12, color: 'var(--coral)', marginTop: 4, display: 'block' }}>
                {photoError}{' '}
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); setCurrentSlot('cover'); fileRef.current?.click() }}>Retry</button>
              </span>
            )}
          </div>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Listing title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Selling price / kg (₱)</label>
            <input className="input" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 280" />
            {lot.costPerKg && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cost basis: ₱{lot.costPerKg}/kg</span>}
          </div>
          <div className="form-row">
            <label>Min order qty (kg)</label>
            <input className="input" inputMode="decimal" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="0.5" />
          </div>
          <div className="form-row">
            <label>Delivery fee (₱, leave blank for pickup-only)</label>
            <input className="input" inputMode="decimal" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Description (optional)</label>
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontWeight: 600 }}>
              Freshness photos <span style={{ color: 'var(--coral)' }}>* all 5 required</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              {[
                { slot: 'eyes',   label: 'Eyes',   hint: 'Clear, bright pupils',          url: photoEyes   },
                { slot: 'gills',  label: 'Gills',  hint: 'Bright red, not brown',         url: photoGills  },
                { slot: 'scales', label: 'Scales', hint: 'Shiny, tight to skin',          url: photoScales },
                { slot: 'belly',  label: 'Belly',  hint: 'Firm, not swollen',             url: photoBelly  },
                { slot: 'flesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration',  url: photoFlesh  },
              ].map(({ slot, label, hint, url }, i) => {
                const isLast = i === 4
                return (
                  <div key={slot} style={{ gridColumn: isLast ? '1 / -1' : undefined, maxWidth: isLast ? '50%' : undefined }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{hint}</div>
                    {url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={url} alt={label} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                        <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot(slot); fileRef.current?.click() }}>Change</button>
                      </div>
                    ) : (
                      <button className="btn btn--ghost btn--sm" type="button" style={{ border: '1.5px dashed var(--hairline)', width: '100%', padding: '12px 0' }} onClick={() => { setCurrentSlot(slot); fileRef.current?.click() }}>
                        Upload
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
        {error && <p style={{ color: 'var(--coral)', fontSize: 12, marginTop: 8 }}>{error}</p>}
        <div className="row" style={{ marginTop: 18, gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={submitting || photoUploading || !photoUrl}>
            {submitting ? 'Creating…' : 'Create listing'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdjustLotModal({ lot, onClose, onSubmit }) {
  const [deltaKg, setDelta]   = useState('')
  const [reason, setReason]   = useState('CORRECTION')
  const [note, setNote]       = useState('')
  const [submitting, setBusy] = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    const n = Number(deltaKg)
    if (!deltaKg || Number.isNaN(n)) { setError('Enter a numeric delta (negative to deduct)'); return }
    setBusy(true)
    try { await onSubmit({ deltaKg: n, reason, note }) }
    catch (e) { setError(e?.message ?? 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 92vw)', padding: 22 }}>
        <div className="card__head">
          <div>
            <div className="eyebrow">Lot #{lot.id}</div>
            <div className="card__title">Adjust {lot.speciesName}</div>
            <div className="card__sub">Remaining: {lot.remainingKg} kg</div>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 8 }}>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Delta (kg) — negative deducts</label>
            <input className="input" inputMode="decimal" value={deltaKg} onChange={e => setDelta(e.target.value)} placeholder="e.g. -2.5" />
          </div>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Reason</label>
            <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-row" style={{ gridColumn: '1 / -1' }}>
            <label>Note (optional)</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        {error && <p style={{ color: 'var(--coral)', fontSize: 12, marginTop: 8 }}>{error}</p>}
        <div className="row" style={{ marginTop: 18, gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}
