import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listListings, updateListing, deleteListing, publishListing, unpublishListing, uploadListingPhoto, getStorefrontStats } from './api/storefront'
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
  const [tab, setTab] = useState('all')

  const qc = useQueryClient()
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })
  const statsQ = useQuery({ queryKey: ['storefront-stats'], queryFn: getStorefrontStats })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
  const updateMut = useMutation({ mutationFn: ({ id, ...body }) => updateListing(id, body), onSuccess: () => { invalidate(); setModal(null) }, onError: (err) => setSaveError(err.message || 'Save failed') })
  const deleteMut = useMutation({ mutationFn: deleteListing, onSuccess: () => { invalidate(); setDeleteConfirmId(null) } })
  const republishMut = useMutation({ mutationFn: publishListing, onSuccess: invalidate })
  const unpubMut = useMutation({ mutationFn: unpublishListing, onSuccess: invalidate })

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
  const listings = listingsQ.data ?? []
  const stats = statsQ.data

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

  const filteredListings = listings.filter(l => {
    if (tab === 'active')  return l.status === 'PUBLISHED' || l.status === 'SOLD_OUT'
    if (tab === 'drafts')  return l.status === 'DRAFT'
    if (tab === 'paused')  return l.status === 'UNPUBLISHED'
    return true
  })

  const statusColor = { PUBLISHED: 'kelp', DRAFT: 'muted', UNPUBLISHED: 'coral', SOLD_OUT: 'caution' }

  return (
    <div>
      {/* Page header */}
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Your public <em>listings</em></h1>
        </div>
        <div className="v-page-header__actions">
          <button
            className="v-btn v-btn--ghost v-btn--sm"
            onClick={() => window.open(`/shop/`, '_blank')}
          >
            Preview shop
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total listings', value: listings.length },
          { label: 'Views (cumulative)', value: stats?.totalViews ?? '—' },
          { label: 'Active', value: listings.filter(l => l.status === 'PUBLISHED' || l.status === 'SOLD_OUT').length },
          { label: 'Drafts', value: listings.filter(l => l.status === 'DRAFT').length },
          { label: 'Paused', value: listings.filter(l => l.status === 'UNPUBLISHED').length },
        ].map(({ label, value }) => (
          <div key={label} className="v-kpi-cell">
            <div className="v-kpi-cell__label">{label}</div>
            <div className="v-kpi-cell__value v-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Tab strip */}
      <div className="v-tabs">
        {['all', 'active', 'drafts', 'paused'].map(t => (
          <button key={t} className={`v-tab${tab === t ? ' v-tab--on' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Listing grid */}
      {filteredListings.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
          No listings here. Head to your Inventory tab to list a lot for sale.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {filteredListings.map(listing => {
            const viewCount = stats?.byListing?.find(b => b.listingId === listing.id)?.views ?? 0
            return (
              <div key={listing.id} className="v-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 120, background: 'var(--bg-card-3)', position: 'relative', overflow: 'hidden' }}>
                  {listing.photoUrl
                    ? <img src={listing.photoUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🐟</div>}
                  <span
                    className={`v-chip v-chip--${statusColor[listing.status] || 'muted'}`}
                    style={{ position: 'absolute', top: 8, left: 8 }}
                  >
                    {listing.status}
                  </span>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{listing.title}</div>
                  <div className="v-mono" style={{ fontSize: 13, color: 'var(--accent-lime)' }}>
                    ₱{listing.pricePerKg}/kg
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-4)', margin: '6px 0 10px' }}>
                    <span>{listing.availableKg ?? '—'}kg stock</span>
                    <span>{viewCount} views</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {deleteConfirmId === listing.id ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>Delete?</span>
                        <button
                          className="v-btn v-btn--sm"
                          style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}
                          onClick={() => { deleteMut.mutate(listing.id); setDeleteConfirmId(null) }}
                        >Confirm</button>
                        <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => openModal(listing)}>
                          <I.Edit size={11} /> Edit
                        </button>
                        {listing.status === 'PUBLISHED' || listing.status === 'SOLD_OUT'
                          ? <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => unpubMut.mutate(listing.id)}>Unpublish</button>
                          : listing.status === 'UNPUBLISHED'
                            ? <button className="v-btn v-btn--primary v-btn--sm" onClick={() => republishMut.mutate(listing.id)}>Re-publish</button>
                            : null}
                        <button
                          className="v-btn v-btn--ghost v-btn--sm"
                          style={{ color: 'var(--coral)', marginLeft: 'auto' }}
                          onClick={() => setDeleteConfirmId(listing.id)}
                        >Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Edit listing</div>
                <h2 className="modal__title">{form.title || 'Untitled listing'}</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setModal(null)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
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
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label>Photo</label>
                {photoUploading ? (
                  <span className="muted-data" style={{ fontSize: 13 }}>Uploading…</span>
                ) : form.photoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={form.photoUrl} alt="listing" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Change photo</button>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Select photo</button>
                )}
                {photoError && (
                  <span style={{ fontSize: 12, color: 'var(--unsafe)', marginTop: 4, display: 'block' }}>
                    {photoError}{' '}
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); setCurrentSlot('cover'); fileRef.current?.click() }}>Retry</button>
                  </span>
                )}
              </div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 600 }}>Freshness photos</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {[
                    { slot: 'eyes',   label: 'Eyes',   hint: 'Clear, bright pupils',          formKey: 'photoEyes'   },
                    { slot: 'gills',  label: 'Gills',  hint: 'Bright red, not brown',         formKey: 'photoGills'  },
                    { slot: 'scales', label: 'Scales', hint: 'Shiny, tight to skin',          formKey: 'photoScales' },
                    { slot: 'belly',  label: 'Belly',  hint: 'Firm, not swollen',             formKey: 'photoBelly'  },
                    { slot: 'flesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration',  formKey: 'photoFlesh'  },
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
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <div className="modal__foot">
              {saveError && <span style={{ fontSize: 12, color: 'var(--unsafe)', marginRight: 'auto' }}>{saveError}</span>}
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={photoUploading}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
