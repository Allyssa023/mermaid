import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listLots, recordAdjustment } from './api/inventory'
import { createListing, listListings, uploadListingPhoto } from './api/storefront'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const ADJUST_REASONS = ['DAMAGED', 'SPOILAGE', 'CORRECTION', 'OTHER']

const freshnessPct = (ms) => Math.min(100, ((Date.now() - ms) / (6 * 86400 * 1000)) * 100)

export default function Inventory() {
  const [thr, setThr]               = useState(10)
  const [speciesFilter, setSpecies] = useState('')
  const [adjustLot, setAdjustLot]   = useState(null)
  const [listLot, setListLot]       = useState(null)
  const [filter, setFilter]         = useState('all')

  const qc = useQueryClient()
  const lotsQ    = useQuery({
    queryKey: ['vendor', 'inventory', speciesFilter],
    queryFn:  () => listLots(speciesFilter ? Number(speciesFilter) : undefined),
  })
  const speciesQ  = useQuery({ queryKey: ['lookup', 'species'], queryFn: fetchSpecies })
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })

  const invalidate       = () => qc.invalidateQueries({ queryKey: ['vendor', 'inventory'] })
  const invalidateStore  = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })

  if (lotsQ.isLoading) return <div className="page"><TableRowSkeleton rows={6} /></div>
  if (lotsQ.error)     return <div className="page"><ApiError error={lotsQ.error} onRetry={lotsQ.refetch} /></div>

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

  const listedLotIds = new Set(
    (listingsQ.data ?? []).flatMap(l => l.lotIds ?? [])
  )

  return (
    <div>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Your <em>lots</em></h1>
        </div>
        <div className="v-page-header__actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}><I.Filter size={12} /></span>
            <select
              style={{
                background: 'var(--bg-input, rgba(255,255,255,0.04))',
                border: '1px solid var(--hairline)',
                borderRadius: 8,
                padding: '5px 10px',
                color: 'var(--ink-1)',
                fontSize: 13,
              }}
              value={speciesFilter}
              onChange={e => setSpecies(e.target.value)}
            >
              <option value="">All species</option>
              {(speciesQ.data ?? []).map(s => (
                <option key={s.id} value={s.id}>{s.commonName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'On-hand kg',  value: `${onHandKg.toFixed(1)}kg` },
          { label: 'Cost value',  value: `₱${(costValue / 1000).toFixed(1)}k` },
          { label: 'Turnover %',  value: `${turnoverPct.toFixed(0)}%` },
          { label: 'Low stock',   value: lowStockCount },
          { label: 'Avg age',     value: `${avgAge.toFixed(1)}d` },
        ].map(({ label, value }) => (
          <div key={label} className="v-kpi-cell">
            <div className="v-kpi-cell__label">{label}</div>
            <div className="v-kpi-cell__value v-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
          Low threshold:
          <input
            type="number"
            value={thr}
            min={0}
            onChange={e => setThr(Number(e.target.value))}
            style={{
              background: 'var(--bg-input, rgba(255,255,255,0.04))',
              border: '1px solid var(--hairline)',
              borderRadius: 8,
              padding: '5px 10px',
              color: 'var(--ink-1)',
              width: 80,
              fontSize: 13,
            }}
          />
          kg
        </label>
        {[
          { id: 'all',     label: 'All' },
          { id: 'active',  label: 'Active' },
          { id: 'low',     label: 'Low' },
          { id: 'soldout', label: 'Sold out' },
        ].map(f => (
          <button
            key={f.id}
            className={`v-btn v-btn--ghost v-btn--sm${filter === f.id ? ' v-tab--on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lot rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredLots.map(lot => {
          const receivedMs = lot.receivedAt ? new Date(lot.receivedAt).getTime() : Date.now()
          const fPct = freshnessPct(receivedMs)
          const barColor = fPct < 50 ? 'var(--kelp)' : fPct < 80 ? 'var(--caution)' : 'var(--coral)'
          const isListed = listedLotIds.has(lot.id)
          return (
            <div key={lot.id} className="v-panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: 'var(--bg-card-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>
                🐟
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {lot.speciesName || lot.speciesCommonName || lot.speciesLocalName || `Lot #${lot.id}`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                  #{lot.id} · received {lot.receivedAt ? new Date(lot.receivedAt).toLocaleDateString() : '—'}
                  {lot.costPerKg ? ` · ₱${lot.costPerKg}/kg` : ''}
                </div>
                <div style={{ marginTop: 6, height: 4, background: 'var(--hairline)', borderRadius: 2, width: 120 }}>
                  <div style={{
                    height: 4, borderRadius: 2, background: barColor,
                    width: `${Math.max(4, 100 - fPct)}%`, transition: 'width 0.4s',
                  }} />
                </div>
              </div>
              <div className="v-mono" style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{(lot.remainingKg ?? 0).toFixed(1)}kg</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>of {(lot.initialKg ?? 0).toFixed(1)}kg</div>
                {(lot.remainingKg ?? 0) > 0 && (lot.remainingKg ?? 0) <= thr && (
                  <span className="v-chip v-chip--coral" style={{ fontSize: 10, marginTop: 2, display: 'inline-block' }}>Low</span>
                )}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setAdjustLot(lot)}>Adjust</button>
                {(lot.remainingKg ?? 0) === 0
                  ? <span className="v-chip v-chip--muted">Sold out</span>
                  : isListed
                    ? <span className="v-chip" style={{ fontSize: 11 }}>Listed</span>
                    : (
                      <button className="v-btn v-btn--sm" onClick={() => setListLot(lot)}>
                        List for sale
                      </button>
                    )
                }
              </div>
            </div>
          )
        })}
        {filteredLots.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32, fontSize: 14 }}>
            {lots.length === 0 ? 'No inventory yet — lots appear when procurement orders complete.' : 'No lots match this filter'}
          </div>
        )}
      </div>

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
  const [title, setTitle]               = useState(`${lot.speciesName} – Lot #${lot.id}`)
  const [price, setPrice]               = useState(lot.costPerKg ?? '')
  const [minQty, setMinQty]             = useState('0.5')
  const [deliveryFee, setDeliveryFee]   = useState('')
  const [description, setDescription]   = useState('')
  const [photoUrl, setPhotoUrl]         = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError]     = useState('')
  const [submitting, setBusy]           = useState(false)
  const [error, setError]               = useState('')
  const fileRef = useRef(null)

  const [currentSlot, setCurrentSlot] = useState(null)
  const [photoEyes,   setPhotoEyes]   = useState(null)
  const [photoGills,  setPhotoGills]  = useState(null)
  const [photoScales, setPhotoScales] = useState(null)
  const [photoBelly,  setPhotoBelly]  = useState(null)
  const [photoFlesh,  setPhotoFlesh]  = useState(null)

  const SLOT_SETTERS = {
    cover:  setPhotoUrl,
    eyes:   setPhotoEyes,
    gills:  setPhotoGills,
    scales: setPhotoScales,
    belly:  setPhotoBelly,
    flesh:  setPhotoFlesh,
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setPhotoError('File must be JPEG, PNG, or WebP under 5 MB'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('File must be JPEG, PNG, or WebP under 5 MB'); return }
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
    if (!photoUrl)            { setError('Please upload a photo first'); return }
    if (!photoEyes || !photoGills || !photoScales || !photoBelly || !photoFlesh) {
      setError('Please upload all 5 freshness photos')
      return
    }
    if (!title.trim())        { setError('Title is required'); return }
    if (!p || p <= 0)         { setError('Enter a valid price per kg'); return }
    if (!q || q < 0.1)        { setError('Minimum qty must be at least 0.1 kg'); return }
    setBusy(true)
    try {
      await onSubmit({
        speciesId: lot.speciesId,
        title: title.trim(),
        pricePerKg: p,
        minQtyKg: q,
        description: description || null,
        photoUrl,
        photoEyes,
        photoGills,
        photoScales,
        photoBelly,
        photoFlesh,
        lotIds: [lot.id],
        deliveryFee: deliveryFee ? Number(deliveryFee) : null,
      })
    } catch (e) {
      setError(e?.message ?? 'Failed to create listing')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000}}>
      <div className="card" onClick={e => e.stopPropagation()} style={{width: 'min(520px, 92vw)', padding: 22, maxHeight: '85vh', overflowY: 'auto'}}>
        <div className="card__head">
          <div>
            <div className="eyebrow">Lot #{lot.id} · {lot.remainingKg} kg available</div>
            <div className="card__title">List for sale</div>
            <div className="card__sub">Creates a storefront listing buyers can order from.</div>
          </div>
        </div>
        <div className="form-grid" style={{marginTop: 12}}>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Photo <span style={{color: 'var(--unsafe)', marginLeft: 2}}>*</span></label>
            {photoUploading ? (
              <span className="muted-data" style={{fontSize: 13}}>Uploading…</span>
            ) : photoUrl ? (
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <img src={photoUrl} alt="listing" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 6}} />
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Change photo</button>
              </div>
            ) : (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>
                Select photo (required)
              </button>
            )}
            {photoError && (
              <span style={{fontSize: 12, color: 'var(--unsafe)', marginTop: 4, display: 'block'}}>
                {photoError}{' '}
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); setCurrentSlot('cover'); fileRef.current?.click() }}>Retry</button>
              </span>
            )}
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Listing title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Selling price / kg (₱)</label>
            <input className="input" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 280" />
            {lot.costPerKg && <span style={{fontSize: 11, color: 'var(--muted)'}}>Cost basis: ₱{lot.costPerKg}/kg</span>}
          </div>
          <div className="form-row">
            <label>Min order qty (kg)</label>
            <input className="input" inputMode="decimal" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="0.5" />
          </div>
          <div className="form-row">
            <label>Delivery fee (₱, leave blank for pickup-only)</label>
            <input className="input" inputMode="decimal" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Description (optional)</label>
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} style={{resize: 'vertical'}} />
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label style={{ fontWeight: 600 }}>
              Freshness photos <span style={{ color: 'var(--unsafe)' }}>* all 5 required</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              {[
                { slot: 'eyes',   label: 'Eyes',   hint: 'Clear, bright pupils',           url: photoEyes   },
                { slot: 'gills',  label: 'Gills',  hint: 'Bright red, not brown',          url: photoGills  },
                { slot: 'scales', label: 'Scales', hint: 'Shiny, tight to skin',           url: photoScales },
                { slot: 'belly',  label: 'Belly',  hint: 'Firm, not swollen',              url: photoBelly  },
                { slot: 'flesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration',   url: photoFlesh  },
              ].map(({ slot, label, hint, url }, i) => {
                const isLast = i === 4
                return (
                  <div key={slot} style={{ gridColumn: isLast ? '1 / -1' : undefined, maxWidth: isLast ? '50%' : undefined }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                    <div className="muted-data" style={{ fontSize: 10, marginBottom: 6 }}>{hint}</div>
                    {url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={url} alt={label} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                        <button className="btn btn--ghost btn--sm" type="button"
                          onClick={() => { setCurrentSlot(slot); fileRef.current?.click() }}>Change</button>
                      </div>
                    ) : (
                      <button
                        className="btn btn--ghost btn--sm"
                        type="button"
                        style={{ border: '1.5px dashed var(--line)', width: '100%', padding: '12px 0' }}
                        onClick={() => { setCurrentSlot(slot); fileRef.current?.click() }}
                      >
                        Upload
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <input
          type="file"
          ref={fileRef}
          accept="image/jpeg,image/png,image/webp"
          style={{display: 'none'}}
          onChange={handlePhotoChange}
        />
        {error && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 8}}>{error}</p>}
        <div className="row" style={{marginTop: 18, gap: 8, justifyContent: 'flex-end'}}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={submitting || photoUploading || !photoUrl}>{submitting ? 'Creating…' : 'Create listing'}</button>
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
    <div className="modal-overlay" onClick={onClose} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000}}>
      <div className="card" onClick={e => e.stopPropagation()} style={{width: 'min(440px, 92vw)', padding: 22}}>
        <div className="card__head">
          <div>
            <div className="eyebrow">Lot #{lot.id}</div>
            <div className="card__title">Adjust {lot.speciesName}</div>
            <div className="card__sub">Remaining: {lot.remainingKg} kg</div>
          </div>
        </div>
        <div className="form-grid" style={{marginTop: 8}}>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Delta (kg) — negative deducts</label>
            <input className="input" inputMode="decimal" value={deltaKg} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. -2.5" />
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Reason</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {error && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 8}}>{error}</p>}
        <div className="row" style={{marginTop: 18, gap: 8, justifyContent: 'flex-end'}}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : 'Save adjustment'}</button>
        </div>
      </div>
    </div>
  )
}
