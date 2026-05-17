import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listLots, recordAdjustment } from './api/inventory'
import { createListing, listListings, uploadListingPhoto } from './api/storefront'
import { fetchSpecies } from '../api/lookup'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const ADJUST_REASONS = ['DAMAGED', 'SPOILAGE', 'CORRECTION', 'OTHER']

export default function Inventory() {
  const [thr, setThr]               = useState(10)
  const [speciesFilter, setSpecies] = useState('')
  const [adjustLot, setAdjustLot]   = useState(null)
  const [listLot, setListLot]       = useState(null)

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

  const listedLotIds = new Set(
    (listingsQ.data ?? []).flatMap(l => l.lotIds ?? [])
  )

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inventory</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>lots</em></h1>
          <p className="page__sub">Every batch received from fishermen, with remaining weight and cost basis.</p>
        </div>
      </div>
      <div className="row" style={{gap: 12, marginTop: 14, alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}>Low-stock threshold</span>
          <input className="input" style={{width: 80}} type="number" value={thr} onChange={e => setThr(+e.target.value)} />
          <span className="muted-data" style={{fontSize: 12}}>kg</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}><I.Filter size={12} /> Species</span>
          <select className="input" style={{width: 180}} value={speciesFilter} onChange={(e) => setSpecies(e.target.value)}>
            <option value="">All species</option>
            {(speciesQ.data ?? []).map(s => (
              <option key={s.id} value={s.id}>{s.commonName}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="card" style={{marginTop: 14}}>
        {lots.length === 0 ? (
          <div className="empty">
            <div className="empty__title">No inventory yet</div>
            <p>Inventory is added automatically when procurement orders are completed.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Lot</th><th>Species</th><th>Received</th><th>Initial</th><th>Remaining</th><th>Cost/kg</th><th></th><th></th></tr></thead>
            <tbody>
              {lots.map(l => {
                const low = l.remainingKg < thr
                return (
                  <tr key={l.id}>
                    <td><span className="kbd">{l.id}</span></td>
                    <td><strong>{l.speciesName}</strong></td>
                    <td className="muted-data">{new Date(l.receivedAt).toLocaleString()}</td>
                    <td>{l.initialKg} kg</td>
                    <td>
                      <span style={{fontFamily: 'var(--font-mono)'}}>{l.remainingKg} kg</span>
                      {low && <span className="chip chip--caution" style={{marginLeft: 6, fontSize: 10}}>Low</span>}
                    </td>
                    <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.costPerKg}</td>
                    <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm" onClick={() => setAdjustLot(l)}>Adjust</button></td>
                    <td style={{textAlign: 'right'}}>
                      {l.remainingKg > 0 && (
                        listedLotIds.has(l.id)
                          ? <span className="chip chip--safe" style={{fontSize: 11}}>Listed</span>
                          : (
                            <button className="btn btn--primary btn--sm" onClick={() => setListLot(l)}>
                              <I.Plus size={11} /> List for sale
                            </button>
                          )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
  const [description, setDescription]   = useState('')
  const [photoUrl, setPhotoUrl]         = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError]     = useState('')
  const [submitting, setBusy]           = useState(false)
  const [error, setError]               = useState('')
  const fileRef = useRef(null)

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
      setPhotoUrl(data.url)
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
    if (!title.trim())        { setError('Title is required'); return }
    if (!p || p <= 0)         { setError('Enter a valid price per kg'); return }
    if (!q || q < 0.1)        { setError('Minimum qty must be at least 0.1 kg'); return }
    setBusy(true)
    try {
      await onSubmit({ speciesId: lot.speciesId, title: title.trim(), pricePerKg: p, minQtyKg: q, description: description || null, photoUrl, lotIds: [lot.id] })
    } catch (e) {
      setError(e?.message ?? 'Failed to create listing')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000}}>
      <div className="card" onClick={e => e.stopPropagation()} style={{width: 'min(460px, 92vw)', padding: 22}}>
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
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => fileRef.current?.click()}>Change photo</button>
              </div>
            ) : (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => fileRef.current?.click()}>
                Select photo (required)
              </button>
            )}
            {photoError && (
              <span style={{fontSize: 12, color: 'var(--unsafe)', marginTop: 4, display: 'block'}}>
                {photoError}{' '}
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); fileRef.current?.click() }}>Retry</button>
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
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Description (optional)</label>
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} style={{resize: 'vertical'}} />
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
