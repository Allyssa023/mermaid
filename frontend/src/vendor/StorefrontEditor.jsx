import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listListings, updateListing, deleteListing, publishListing, unpublishListing, uploadListingPhoto } from './api/storefront'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function StorefrontEditor() {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef(null)

  const qc = useQueryClient()
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
  const updateMut = useMutation({ mutationFn: ({ id, ...body }) => updateListing(id, body), onSuccess: () => { invalidate(); setModal(null) } })
  const deleteMut = useMutation({ mutationFn: deleteListing, onSuccess: invalidate })
  const publishMut = useMutation({ mutationFn: publishListing, onSuccess: invalidate })
  const unpubMut = useMutation({ mutationFn: unpublishListing, onSuccess: invalidate })

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
  const listings = listingsQ.data ?? []

  const statusChip = { PUBLISHED: 'safe', SOLD_OUT: 'unsafe', DRAFT: 'caution', UNPUBLISHED: '' }

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
    setSaveError('')
    updateMut.mutate({
      id: form.id,
      title: form.title.trim(),
      pricePerKg: Number(form.pricePerKg),
      minQtyKg: Number(form.minQtyKg) || undefined,
      description: form.description ?? null,
      photoUrl: form.photoUrl ?? null,
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
      setForm(f => ({ ...f, photoUrl: data.url }))
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
                        <button className="btn btn--sm btn--unsafe" onClick={() => { deleteMut.mutate(l.id); setDeleteConfirmId(null) }}>Confirm</button>
                        <button className="btn btn--sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn--ghost btn--sm btn--danger" onClick={() => setDeleteConfirmId(l.id)}>Delete</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => openModal(l)}><I.Edit size={11} /> Edit</button>
                        {l.status === 'DRAFT' || l.status === 'UNPUBLISHED'
                          ? <button className="btn btn--ghost btn--sm" onClick={() => publishMut.mutate(l.id)}>Publish</button>
                          : <button className="btn btn--ghost btn--sm" onClick={() => unpubMut.mutate(l.id)}>Unpublish</button>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
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
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => fileRef.current?.click()}>Change photo</button>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => fileRef.current?.click()}>Select photo</button>
                )}
                {photoError && (
                  <span style={{fontSize: 12, color: 'var(--color-unsafe)', marginTop: 4, display: 'block'}}>
                    {photoError}{' '}
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); fileRef.current?.click() }}>Retry</button>
                  </span>
                )}
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
              {saveError && <span style={{fontSize: 12, color: 'var(--color-unsafe)', marginRight: 'auto'}}>{saveError}</span>}
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={photoUploading}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
