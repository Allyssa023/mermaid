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

// Map API status to display class
const statusClass = (status) => {
  if (status === 'PUBLISHED')   return 'active'
  if (status === 'DRAFT')       return 'draft'
  if (status === 'UNPUBLISHED') return 'paused'
  if (status === 'SOLD_OUT')    return 'active'
  return 'draft'
}

const statusLabel = (status) => {
  if (status === 'PUBLISHED')   return 'Active'
  if (status === 'DRAFT')       return 'Draft'
  if (status === 'UNPUBLISHED') return 'Paused'
  if (status === 'SOLD_OUT')    return 'Sold out'
  return status
}

export default function StorefrontEditor() {
  const [modal, setModal]               = useState(null)
  const [form, setForm]                 = useState({})
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [saveError, setSaveError]       = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError]     = useState('')
  const fileRef                         = useRef(null)
  const [currentSlot, setCurrentSlot]   = useState(null)
  const [tab, setTab]                   = useState('all')

  const qc          = useQueryClient()
  const listingsQ   = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })
  const statsQ      = useQuery({ queryKey: ['storefront-stats'], queryFn: getStorefrontStats })
  const invalidate  = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })

  const updateMut   = useMutation({
    mutationFn: ({ id, ...body }) => updateListing(id, body),
    onSuccess:  () => { invalidate(); setModal(null) },
    onError:    (err) => setSaveError(err.message || 'Save failed'),
  })
  const deleteMut   = useMutation({ mutationFn: deleteListing,   onSuccess: () => { invalidate(); setDeleteConfirmId(null) } })
  const republishMut = useMutation({ mutationFn: publishListing,  onSuccess: invalidate })
  const unpubMut    = useMutation({ mutationFn: unpublishListing, onSuccess: invalidate })

  if (listingsQ.isLoading) return <div className="content"><TableRowSkeleton rows={5} /></div>
  if (listingsQ.error)     return <div className="content"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>

  const listings = listingsQ.data ?? []
  const stats    = statsQ.data

  const activeCount = listings.filter(l => l.status === 'PUBLISHED' || l.status === 'SOLD_OUT').length
  const draftCount  = listings.filter(l => l.status === 'DRAFT').length
  const pausedCount = listings.filter(l => l.status === 'UNPUBLISHED').length

  const views30d = stats?.totalViews ?? listings.reduce((a, l) => a + (l.viewCount ?? 0), 0)
  const sold30d  = listings.reduce((a, l) => a + (l.soldKg ?? l.sold30d ?? 0), 0)

  const filteredListings = listings.filter(l => {
    if (tab === 'active')  return l.status === 'PUBLISHED' || l.status === 'SOLD_OUT'
    if (tab === 'drafts')  return l.status === 'DRAFT'
    if (tab === 'paused')  return l.status === 'UNPUBLISHED'
    return true
  })

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
      id:          form.id,
      title:       form.title.trim(),
      pricePerKg:  Number(form.pricePerKg),
      minQtyKg:    m,
      description: form.description ?? null,
      photoUrl:    form.photoUrl    ?? null,
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
      const key  = SLOT_FORM_KEYS[currentSlot] ?? 'photoUrl'
      setForm(f => ({ ...f, [key]: data.url }))
    } catch {
      setPhotoError('Upload failed — try again')
    } finally {
      setPhotoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="content">
      <PageHead
        eyebrow={<>Storefront <span className="pill">{activeCount} active</span></>}
        title="Your public"
        em="listings"
        sub="The shopfront buyers see — pricing, freshness photos, and pickup windows."
        actions={<>
          <button className="btn" onClick={() => window.open('/shop/', '_blank')}>
            <I.Eye size={13} /> Preview shop
          </button>
          <button className="btn btn--primary" onClick={() => {}}>
            <I.Plus size={13} /> New listing
          </button>
        </>}
      />

      <div className="kpi-strip">
        <div className="cell">
          <div className="l">Listings</div>
          <div className="v">{listings.length}</div>
          <div className="s">{activeCount} active · {draftCount} draft</div>
        </div>
        <div className="cell">
          <div className="l">Views · 30d</div>
          <div className="v">{Number(views30d).toLocaleString()}</div>
          <div className="s">cumulative</div>
        </div>
        <div className="cell">
          <div className="l">Sold · 30d</div>
          <div className="v">{Number(sold30d).toFixed(0)}<small>kg</small></div>
          <div className="s">across {activeCount} SKUs</div>
        </div>
        <div className="cell">
          <div className="l">Conversion</div>
          <div className="v">—<small>%</small></div>
          <div className="s">view → order</div>
        </div>
        <div className="cell">
          <div className="l">Avg rating</div>
          <div className="v">—<small>★</small></div>
          <div className="s">reviews · 30d</div>
        </div>
      </div>

      <div className="seg-tabs" style={{ alignSelf: 'flex-start' }}>
        <button className={tab === 'all'    ? 'on' : ''} onClick={() => setTab('all')}>
          All <span className="badge">{listings.length}</span>
        </button>
        <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>
          Active <span className="badge">{activeCount}</span>
        </button>
        <button className={tab === 'drafts' ? 'on' : ''} onClick={() => setTab('drafts')}>
          Drafts
        </button>
        <button className={tab === 'paused' ? 'on' : ''} onClick={() => setTab('paused')}>
          Paused
        </button>
      </div>

      {filteredListings.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          No listings here. Head to your Inventory tab to list a lot for sale.
        </div>
      ) : (
        <div className="listing-grid">
          {filteredListings.map(listing => {
            const viewCount  = stats?.byListing?.find(b => b.listingId === listing.id)?.views ?? listing.viewCount ?? 0
            const soldKg     = listing.soldKg ?? listing.sold30d ?? 0
            const speciesName = listing.speciesName ?? listing.speciesLocalName ?? ''
            const cls        = statusClass(listing.status)
            return (
              <div key={listing.id} className="listing-card">
                <div className="listing-card__photo">
                  <span className={`listing-card__status ${cls}`}>{statusLabel(listing.status)}</span>
                  <div className="listing-card__menu">⋮</div>
                  {listing.photoUrl
                    ? <img src={listing.photoUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    : <div className="listing-card__fish">🐟</div>
                  }
                  <div className="listing-card__price">₱{listing.pricePerKg}/kg</div>
                </div>
                <div className="listing-card__body">
                  <span className="listing-card__code">#{listing.id}{speciesName ? ` · ${speciesName}` : ''}</span>
                  <div className="listing-card__title">{listing.title}</div>
                  <div className="listing-card__stats">
                    <div className="listing-card__stat">
                      <span className="l">Stock</span>
                      <span className="v">{listing.availableKg ?? '—'}<span style={{ color: 'var(--muted-2)' }}>kg</span></span>
                    </div>
                    <div className="listing-card__stat">
                      <span className="l">Sold 30d</span>
                      <span className="v">{soldKg}<span style={{ color: 'var(--muted-2)' }}>kg</span></span>
                    </div>
                    <div className="listing-card__stat">
                      <span className="l">Views</span>
                      <span className="v">{viewCount}</span>
                    </div>
                  </div>
                </div>
                <div className="listing-card__actions">
                  {deleteConfirmId === listing.id ? (
                    <>
                      <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', flex: 1 }}>Delete?</span>
                      <button
                        className="btn btn--sm"
                        style={{ background: 'rgba(255,138,107,0.18)', color: 'var(--coral)', borderColor: 'rgba(255,138,107,0.4)' }}
                        onClick={() => { deleteMut.mutate(listing.id); setDeleteConfirmId(null) }}
                      >Confirm</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn--sm btn--ghost" onClick={() => openModal(listing)}>
                        <I.Edit size={11} /> Edit
                      </button>
                      {(listing.status === 'PUBLISHED' || listing.status === 'SOLD_OUT')
                        ? <button className="btn btn--sm" onClick={() => unpubMut.mutate(listing.id)}>Unpublish</button>
                        : listing.status === 'UNPUBLISHED'
                          ? <button className="btn btn--sm btn--primary" onClick={() => republishMut.mutate(listing.id)}>Re-publish</button>
                          : null
                      }
                      <button
                        className="btn btn--sm btn--ghost"
                        style={{ color: 'var(--coral)', marginLeft: 'auto' }}
                        onClick={() => setDeleteConfirmId(listing.id)}
                      >
                        <I.Trash size={11} />
                      </button>
                    </>
                  )}
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
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Uploading…</span>
                ) : form.photoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={form.photoUrl} alt="listing" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Change photo</button>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}>Select photo</button>
                )}
                {photoError && (
                  <span style={{ fontSize: 12, color: 'var(--coral)', marginTop: 4, display: 'block' }}>
                    {photoError}{' '}
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setPhotoError(''); setCurrentSlot('cover'); fileRef.current?.click() }}>Retry</button>
                  </span>
                )}
              </div>
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 600 }}>Freshness photos</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {[
                    { slot: 'eyes',   label: 'Eyes',   hint: 'Clear, bright pupils',         formKey: 'photoEyes'   },
                    { slot: 'gills',  label: 'Gills',  hint: 'Bright red, not brown',        formKey: 'photoGills'  },
                    { slot: 'scales', label: 'Scales', hint: 'Shiny, tight to skin',         formKey: 'photoScales' },
                    { slot: 'belly',  label: 'Belly',  hint: 'Firm, not swollen',            formKey: 'photoBelly'  },
                    { slot: 'flesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration', formKey: 'photoFlesh'  },
                  ].map(({ slot, label, hint, formKey }, i) => {
                    const url    = form[formKey]
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
                          <button
                            className="btn btn--ghost btn--sm"
                            type="button"
                            style={{ border: '1.5px dashed var(--hairline)', width: '100%', padding: '12px 0' }}
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
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <div className="modal__foot">
              {saveError && <span style={{ fontSize: 12, color: 'var(--coral)', marginRight: 'auto' }}>{saveError}</span>}
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={photoUploading}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
