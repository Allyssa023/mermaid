import { useState, useEffect } from 'react'
import { listListings, createListing, updateListing, deleteListing, publishListing, unpublishListing } from './api/storefront'
import { listLots } from './api/inventory'
import { apiGet } from '../api'

const STATUS_COLORS = {
  DRAFT:       { bg: 'var(--surface-2, #f4f4f4)',         color: 'var(--ink-3)' },
  PUBLISHED:   { bg: 'rgba(34,197,94,0.12)',              color: 'var(--safe, #16a34a)' },
  UNPUBLISHED: { bg: 'rgba(107,114,128,0.12)',            color: 'var(--ink-3)' },
  SOLD_OUT:    { bg: 'rgba(245,165,35,0.12)',             color: 'var(--warn, #d97706)' },
}

const BLANK_FORM = {
  speciesId: '', title: '', description: '', pricePerKg: '', minQtyKg: '0.5',
  photoUrl: '', lotIds: [],
}

export default function StorefrontEditor() {
  const [listings, setListings]       = useState([])
  const [species, setSpecies]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [modal, setModal]             = useState(null)   // null | 'new' | listing object
  const [form, setForm]               = useState(BLANK_FORM)
  const [lots, setLots]               = useState([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]       = useState(false)

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

  const openNew = () => {
    setForm(BLANK_FORM)
    setSubmitError('')
    setModal('new')
  }

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
    setSubmitError('')
    setModal(listing)
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
      if (isEditing) {
        await updateListing(modal.id, body)
      } else {
        await createListing(body)
      }
      setModal(null)
      loadListings()
    } catch (err) {
      setSubmitError(err.message || 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async (listing) => {
    try { await publishListing(listing.id); loadListings() } catch (err) { setError(err.message || 'Publish failed.') }
  }

  const handleUnpublish = async (listing) => {
    try { await unpublishListing(listing.id); loadListings() } catch (err) { setError(err.message || 'Unpublish failed.') }
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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Listings</h2>
        <button
          onClick={openNew}
          style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--accent, #0070f3)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          + New listing
        </button>
      </div>

      {error && <div style={{ color: 'var(--unsafe, red)', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>Loading listings…</div>
      ) : listings.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>No listings yet — create one to start selling.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-3, #eee)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>Title</th>
                <th style={{ padding: '8px 10px' }}>Species</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price/kg</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Min qty</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
                <th style={{ padding: '8px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => {
                const sc = STATUS_COLORS[l.status] || STATUS_COLORS.DRAFT
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--surface-2, #f4f4f4)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{l.title}</td>
                    <td style={{ padding: '8px 10px' }}>{speciesName(l.speciesId)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₱{l.pricePerKg}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.minQtyKg} kg</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ ...sc, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(l)} style={actionBtn}>Edit</button>
                        {l.status === 'PUBLISHED' ? (
                          <button onClick={() => handleUnpublish(l)} style={actionBtn}>Unpublish</button>
                        ) : (l.status === 'DRAFT' || l.status === 'UNPUBLISHED') ? (
                          <button onClick={() => handlePublish(l)} style={actionBtn}>Publish</button>
                        ) : null}
                        <button onClick={() => setDeleteTarget(l)} style={{ ...actionBtn, color: 'var(--unsafe, red)', borderColor: 'var(--unsafe, red)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New / Edit modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--paper, #fff)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>{isEditing ? `Edit: ${modal.title}` : 'New listing'}</h3>
            <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <label style={labelStyle}>
                Species
                <select
                  required
                  value={form.speciesId}
                  onChange={e => setForm(f => ({ ...f, speciesId: e.target.value, lotIds: [] }))}
                  style={inputStyle}
                >
                  <option value="">Select species…</option>
                  {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                Title
                <input
                  required maxLength={200}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Description (optional)
                <textarea
                  maxLength={1000} rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Price / kg (₱)
                  <input
                    required type="number" min="0" step="0.01"
                    value={form.pricePerKg}
                    onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Min qty (kg)
                  <input
                    required type="number" min="0.1" step="0.1"
                    value={form.minQtyKg}
                    onChange={e => setForm(f => ({ ...f, minQtyKg: e.target.value }))}
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={labelStyle}>
                Photo URL (optional)
                <input
                  type="url" maxLength={500}
                  value={form.photoUrl}
                  onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <div>
                <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                  Inventory lots
                  {form.speciesId ? '' : <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}> — select a species first</span>}
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
                            border: `1px solid ${checked ? 'var(--accent, #0070f3)' : 'var(--surface-3, #ddd)'}`,
                            background: checked ? 'rgba(0,112,243,0.06)' : undefined,
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
                            style={{ accentColor: 'var(--accent, #0070f3)' }}
                          />
                          <span style={{ flex: 1 }}>
                            Lot #{lot.id}
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
                  <div style={{ fontSize: 11, color: 'var(--warn, orange)', marginTop: 4 }}>
                    All selected lots are empty — listing cannot be published.
                  </div>
                )}
              </div>

              {submitError && <div style={{ color: 'var(--unsafe, red)', fontSize: 13 }}>{submitError}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--surface-3)', background: 'transparent', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--accent, #0070f3)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 210 }}>
          <div style={{ background: 'var(--paper, #fff)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Delete listing?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 20 }}>
              "<strong>{deleteTarget.title}</strong>" will be removed and hidden from buyers. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--surface-3)', background: 'transparent', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--unsafe, #e11d48)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
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

const actionBtn = {
  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--surface-3, #ddd)',
  background: 'transparent', cursor: 'pointer', fontSize: 12,
}
const labelStyle = { fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }
const inputStyle  = { marginTop: 2, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--surface-3)', fontSize: 13, width: '100%', boxSizing: 'border-box' }
