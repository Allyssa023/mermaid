import { useState, useEffect } from 'react'
import { listListings, createListing, updateListing, deleteListing, publishListing, unpublishListing } from './api/storefront'
import { listLots } from './api/inventory'
import { apiGet } from '../api'

const STATUS_CLS = {
  PUBLISHED:   'chip chip--safe',
  SOLD_OUT:    'chip chip--caution',
  DRAFT:       'chip',
  UNPUBLISHED: 'chip',
}
const STATUS_LABEL = {
  PUBLISHED: 'Published', SOLD_OUT: 'Sold Out', DRAFT: 'Draft', UNPUBLISHED: 'Unpublished',
}

const BLANK_FORM = {
  speciesId: '', title: '', description: '', pricePerKg: '', minQtyKg: '0.5',
  photoUrl: '', lotIds: [],
}

export default function StorefrontEditor() {
  const [listings, setListings]           = useState([])
  const [species, setSpecies]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [modal, setModal]                 = useState(null)
  const [form, setForm]                   = useState(BLANK_FORM)
  const [lots, setLots]                   = useState([])
  const [lotsLoading, setLotsLoading]     = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState('')
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [deleting, setDeleting]           = useState(false)

  const loadListings = () => {
    setLoading(true); setError('')
    listListings()
      .then(d => setListings(Array.isArray(d) ? d : d?.content || []))
      .catch(e => setError(e.message || 'Failed to load listings.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    apiGet('/fish-species').then(d => setSpecies(Array.isArray(d) ? d : d?.content || [])).catch(() => {})
    loadListings()
  }, [])

  useEffect(() => {
    if (!form.speciesId) { setLots([]); return }
    setLotsLoading(true)
    listLots(form.speciesId, false)
      .then(d => setLots(Array.isArray(d) ? d : []))
      .catch(() => setLots([]))
      .finally(() => setLotsLoading(false))
  }, [form.speciesId])

  const openNew = () => { setForm(BLANK_FORM); setSubmitError(''); setModal('new') }

  const openEdit = (listing) => {
    setForm({
      speciesId:   String(listing.speciesId || ''),
      title:       listing.title || '',
      description: listing.description || '',
      pricePerKg:  listing.pricePerKg != null ? String(listing.pricePerKg) : '',
      minQtyKg:    listing.minQtyKg   != null ? String(listing.minQtyKg)   : '0.5',
      photoUrl:    listing.photoUrl   || '',
      lotIds:      listing.lotIds     || [],
    })
    setSubmitError(''); setModal(listing)
  }

  const isEditing = modal && modal !== 'new'

  const toggleLot = (id) =>
    setForm(f => ({
      ...f,
      lotIds: f.lotIds.includes(id) ? f.lotIds.filter(x => x !== id) : [...f.lotIds, id],
    }))

  const canPublish = form.lotIds.length > 0 && lots.some(l => form.lotIds.includes(l.id) && l.remainingKg > 0)

  const submitForm = async (e) => {
    e.preventDefault()
    setSubmitting(true); setSubmitError('')
    const body = {
      speciesId:   Number(form.speciesId),
      title:       form.title,
      description: form.description || undefined,
      pricePerKg:  parseFloat(form.pricePerKg),
      minQtyKg:    parseFloat(form.minQtyKg),
      photoUrl:    form.photoUrl || undefined,
      lotIds:      form.lotIds,
    }
    try {
      if (isEditing) await updateListing(modal.id, body)
      else           await createListing(body)
      setModal(null)
      loadListings()
    } catch (err) {
      setSubmitError(err.message || 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async (listing) => {
    try { await publishListing(listing.id); loadListings() }
    catch (err) { setError(err.message || 'Publish failed.') }
  }

  const handleUnpublish = async (listing) => {
    try { await unpublishListing(listing.id); loadListings() }
    catch (err) { setError(err.message || 'Unpublish failed.') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteListing(deleteTarget.id); setDeleteTarget(null); loadListings() }
    catch (err) { setError(err.message || 'Delete failed.') }
    finally { setDeleting(false) }
  }

  const speciesName = (id) => species.find(s => String(s.id) === String(id))?.commonName || `Species #${id}`

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Sales</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            My <em>Listings</em>
          </h1>
          <p className="page__sub">Manage your storefront listings visible to buyers.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary btn--sm" onClick={openNew}>+ New listing</button>
        </div>
      </div>

      {error && (
        <div style={{
          color: 'var(--unsafe)', padding: '10px 14px',
          background: 'var(--unsafe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty" style={{ padding: '60px 0' }}>
          <div className="empty__title">Loading listings…</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty" style={{ padding: '64px 0' }}>
          <div className="empty__title">No listings yet</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6 }}>Create a listing to start selling to buyers.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }} onClick={openNew}>
            + Create your first listing
          </button>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th>
                <th>Species</th>
                <th style={{ textAlign: 'right' }}>Price/kg</th>
                <th style={{ textAlign: 'right' }}>Min qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{l.title}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{speciesName(l.speciesId)}</td>
                  <td className="data" style={{ textAlign: 'right' }}>₱{l.pricePerKg}</td>
                  <td className="data" style={{ textAlign: 'right' }}>{l.minQtyKg} kg</td>
                  <td>
                    <span className={STATUS_CLS[l.status] || 'chip'}>
                      {STATUS_LABEL[l.status] || l.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(l)}>Edit</button>
                      {l.status === 'PUBLISHED' ? (
                        <button className="btn btn--ghost btn--sm" onClick={() => handleUnpublish(l)}>Unpublish</button>
                      ) : (l.status === 'DRAFT' || l.status === 'UNPUBLISHED') ? (
                        <button className="btn btn--ghost btn--sm" onClick={() => handlePublish(l)}>Publish</button>
                      ) : null}
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{ color: 'var(--unsafe)', borderColor: 'var(--unsafe)' }}
                        onClick={() => setDeleteTarget(l)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Storefront</div>
                <div className="modal__title">{isEditing ? `Edit: ${modal.title}` : 'New listing'}</div>
              </div>
            </div>
            <form onSubmit={submitForm}>
              <div className="form-grid" style={{ padding: '16px 0 0' }}>
                <div className="form-row">
                  <label>Species</label>
                  <select required className="input"
                    value={form.speciesId}
                    onChange={e => setForm(f => ({ ...f, speciesId: e.target.value, lotIds: [] }))}>
                    <option value="">Select species…</option>
                    {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Title</label>
                  <input required maxLength={200} className="input"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label>Description (optional)</label>
                  <textarea maxLength={1000} rows={3} className="input"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-row" style={{ flex: 1 }}>
                    <label>Price / kg (₱)</label>
                    <input required type="number" min="0" step="0.01" className="input"
                      value={form.pricePerKg}
                      onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
                  </div>
                  <div className="form-row" style={{ flex: 1 }}>
                    <label>Min qty (kg)</label>
                    <input required type="number" min="0.1" step="0.1" className="input"
                      value={form.minQtyKg}
                      onChange={e => setForm(f => ({ ...f, minQtyKg: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <label>Photo URL (optional)</label>
                  <input type="url" maxLength={500} className="input"
                    value={form.photoUrl}
                    onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 500, color: 'var(--ink-2)' }}>
                    Inventory lots
                    {!form.speciesId && <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}> — select a species first</span>}
                  </div>
                  {lotsLoading ? (
                    <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Loading lots…</div>
                  ) : !form.speciesId ? null : lots.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>No available lots for this species.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {lots.map(lot => {
                        const checked = form.lotIds.includes(lot.id)
                        const empty   = lot.remainingKg <= 0
                        return (
                          <label
                            key={lot.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '7px 10px', borderRadius: 8,
                              border: `1px solid ${checked ? 'var(--accent)' : 'var(--line)'}`,
                              background: checked ? 'var(--accent-soft)' : undefined,
                              cursor: empty ? 'not-allowed' : 'pointer',
                              opacity: empty ? 0.5 : 1,
                              fontSize: 12,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={empty}
                              onChange={() => !empty && toggleLot(lot.id)}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <span style={{ flex: 1 }}>
                              <span className="kbd">Lot #{lot.id}</span>
                              {lot.receivedAt ? ` · received ${new Date(lot.receivedAt).toLocaleDateString()}` : ''}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: empty ? 'var(--ink-4)' : undefined }}>
                              {lot.remainingKg} kg {empty ? '(empty)' : ''}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {form.speciesId && form.lotIds.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                      Tip: a listing without lots cannot be published.
                    </div>
                  )}
                  {form.speciesId && !canPublish && form.lotIds.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--caution)', marginTop: 4 }}>
                      All selected lots are empty — listing cannot be published.
                    </div>
                  )}
                </div>
              </div>
              {submitError && (
                <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 8 }}>{submitError}</div>
              )}
              <div className="modal__foot">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
                  {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Storefront</div>
                <div className="modal__title">Delete listing?</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '12px 0 20px' }}>
              "<strong>{deleteTarget.title}</strong>" will be removed and hidden from buyers. This cannot be undone.
            </p>
            <div className="modal__foot">
              <button className="btn btn--ghost btn--sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn btn--sm"
                style={{ background: 'var(--unsafe)', color: 'var(--paper)', border: 'none' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
