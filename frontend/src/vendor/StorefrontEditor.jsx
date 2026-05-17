import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listListings, updateListing, deleteListing, publishListing, unpublishListing, uploadListingPhoto } from './api/storefront'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const SLOT_FORM_KEYS = {
  cover:  'photoUrl',
  eyes:   'photoEyes',
  gills:  'photoGills',
  scales: 'photoScales',
  belly:  'photoBelly',
  flesh:  'photoFlesh',
}

export default function StorefrontEditor() {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef(null)
  const [currentSlot, setCurrentSlot] = useState(null)

  const qc = useQueryClient()
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
  const updateMut = useMutation({ mutationFn: ({ id, ...body }) => updateListing(id, body), onSuccess: () => { invalidate(); setModal(null) }, onError: (err) => setSaveError(err.message || 'Save failed') })
  const deleteMut = useMutation({ mutationFn: deleteListing, onSuccess: () => { invalidate(); setDeleteConfirmId(null) } })
  const republishMut = useMutation({ mutationFn: publishListing, onSuccess: invalidate })
  const unpubMut = useMutation({ mutationFn: unpublishListing, onSuccess: invalidate })

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
  const listings = listingsQ.data ?? []

  const statusChip = { PUBLISHED: 'safe', SOLD_OUT: 'unsafe', UNPUBLISHED: '' }

  const openModal = (l) => {
    setForm({ ...l })
    setSaveError('')
    setPhotoError('')
    setPhotoUploading(false)
    setModal(l)
  }

  const handleSave = () => {
    if (!form.title?.trim()) { setSaveError('Title is required'); return }
    const p = Number(form.pricePerKg)
    if (!p || p <= 0) { setSaveError('Enter a valid price per kg'); return }
    const mStr = form.minQtyKg
    const m = mStr !== '' && mStr != null ? Number(mStr) : undefined
    if (m !== undefined && (isNaN(m) || m < 0.1)) { setSaveError('Minimum order qty must be at least 0.1 kg'); return }
    setSaveError('')
    updateMut.mutate({
      id: form.id,
      title: form.title.trim(),
      pricePerKg: Number(form.pricePerKg),
      minQtyKg: m,
      description: form.description ?? null,
      photoUrl: form.photoUrl ?? null,
      photoEyes:   form.photoEyes   ?? null,
      photoGills:  form.photoGills  ?? null,
      photoScales: form.photoScales ?? null,
      photoBelly:  form.photoBelly  ?? null,
      photoFlesh:  form.photoFlesh  ?? null,
    })
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setPhotoError('Only JPEG, PNG, or WebP images are allowed'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Image must be 5 MB or smaller'); return }
    setPhotoError('')
    setPhotoUploading(true)
    try {
      const data = await uploadListingPhoto(file)
      const key = SLOT_FORM_KEYS[currentSlot] ?? 'photoUrl'
      setForm(f => ({ ...f, [key]: data.url }))
    } catch {
      setPhotoError('Upload failed — try again')
    } finally {
      setPhotoUploading(false)
      // reset input so same file can be re-selected after error
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Storefront</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>listings</em></h1>
          <p className="page__sub">What buyers see in your shop. Pull from inventory lots.</p>
        </div>
      </div>
      <div className="card" style={{marginTop: 18}}>
        {listings.length === 0 ? (
          <p className="muted-data" style={{padding: '32px 16px', textAlign: 'center'}}>
            No listings yet. Head to your Inventory tab to list a lot for sale.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th>
                <th>Species</th>
                <th>Price/kg</th>
                <th>Min qty</th>
                <th>Available</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.title}</strong></td>
                  <td className="muted-data">{l.speciesName}</td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.pricePerKg}</td>
                  <td className="muted-data">{l.minQtyKg} kg</td>
                  <td className="muted-data">{l.availableKg ? `${l.availableKg} kg` : '—'}</td>
                  <td><span className={`chip ${statusChip[l.status] ? `chip--${statusChip[l.status]}` : ''}`}>{l.status}</span></td>
                  <td style={{textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end'}}>
                    {deleteConfirmId === l.id ? (
                      <>
                        <span className="muted-data" style={{fontSize: 12}}>Delete this listing?</span>
                        <button className="btn btn--sm btn--danger" onClick={() => { deleteMut.mutate(l.id); setDeleteConfirmId(null) }}>Confirm</button>
                        <button className="btn btn--sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setDeleteConfirmId(l.id)}>Delete</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => openModal(l)}><I.Edit size={11} /> Edit</button>
                        {(l.status === 'PUBLISHED' || l.status === 'SOLD_OUT')
                          ? <button className="btn btn--ghost btn--sm" onClick={() => unpubMut.mutate(l.id)}>Unpublish</button>
                          : l.status === 'UNPUBLISHED'
                            ? <button className="btn btn--ghost btn--sm" onClick={() => republishMut.mutate(l.id)}>Re-publish</button>
                            : null
                        }
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540, maxHeight: '90vh', overflowY: 'auto'}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Edit listing</div>
                <h2 className="modal__title">{form.title || 'Untitled listing'}</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setModal(null)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Title</label>
                <input className="input" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Price per kg ₱</label>
                <input className="input" type="number" min="0" step="0.01" value={form.pricePerKg ?? ''} onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Min order qty kg</label>
                <input className="input" type="number" min="0" step="0.01" value={form.minQtyKg ?? ''} onChange={e => setForm(f => ({ ...f, minQtyKg: e.target.value }))} />
              </div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Description</label>
                <textarea className="input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{resize: 'vertical'}} />
              </div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Photo</label>
                {photoUploading ? (
                  <span className="muted-data" style={{fontSize: 13}}>Uploading…</span>
                ) : form.photoUrl ? (
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <img src={form.photoUrl} alt="listing" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 6}} />
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Change photo</button>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Select photo</button>
                )}
                {photoError && (
                  <span style={{fontSize: 12, color: 'var(--unsafe)', marginTop: 4, display: 'block'}}>
                    {photoError}{' '}
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); setCurrentSlot('cover'); fileRef.current?.click() }}>Retry</button>
                  </span>
                )}
              </div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label style={{ fontWeight: 600 }}>Freshness photos</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {[
                    { slot: 'eyes',   label: 'Eyes',   hint: 'Clear, bright pupils',           formKey: 'photoEyes'   },
                    { slot: 'gills',  label: 'Gills',  hint: 'Bright red, not brown',          formKey: 'photoGills'  },
                    { slot: 'scales', label: 'Scales', hint: 'Shiny, tight to skin',           formKey: 'photoScales' },
                    { slot: 'belly',  label: 'Belly',  hint: 'Firm, not swollen',              formKey: 'photoBelly'  },
                    { slot: 'flesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration',   formKey: 'photoFlesh'  },
                  ].map(({ slot, label, hint, formKey }, i) => {
                    const url = form[formKey]
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
            {/* always rendered so ref is always valid */}
            <input
              type="file"
              ref={fileRef}
              accept="image/jpeg,image/png,image/webp"
              style={{display: 'none'}}
              onChange={handlePhotoChange}
            />
            <div className="modal__foot">
              {saveError && <span style={{fontSize: 12, color: 'var(--unsafe)', marginRight: 'auto'}}>{saveError}</span>}
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={photoUploading}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
