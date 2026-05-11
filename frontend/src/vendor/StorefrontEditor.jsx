import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listListings, createListing, updateListing, deleteListing, publishListing, unpublishListing } from './api/storefront'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function StorefrontEditor() {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})

  const qc = useQueryClient()
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })
  const createMut  = useMutation({ mutationFn: createListing,                          onSuccess: invalidate })
  const updateMut  = useMutation({ mutationFn: ({ id, ...body }) => updateListing(id, body), onSuccess: invalidate })
  const _deleteMut = useMutation({ mutationFn: deleteListing,                          onSuccess: invalidate })
  const publishMut = useMutation({ mutationFn: publishListing,                         onSuccess: invalidate })
  const unpubMut   = useMutation({ mutationFn: unpublishListing,                       onSuccess: invalidate })

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (listingsQ.error) return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
  const listings = listingsQ.data ?? []

  const statusChip = { PUBLISHED: 'safe', SOLD_OUT: 'unsafe', DRAFT: 'caution', UNPUBLISHED: '' }

  const openModal = (l) => {
    setForm(l ? { ...l } : {})
    setModal(l ?? { id: null })
  }

  const handleSave = () => {
    if (form.id) {
      updateMut.mutate({ id: form.id, title: form.title, speciesName: form.speciesName, pricePerKg: form.pricePerKg, minQtyKg: form.minQtyKg })
    } else {
      createMut.mutate({ title: form.title, speciesName: form.speciesName, pricePerKg: form.pricePerKg, minQtyKg: form.minQtyKg })
    }
    setModal(null)
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Storefront</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>listings</em></h1>
          <p className="page__sub">What buyers see in your shop. Pull from inventory lots.</p>
        </div>
        <button className="btn btn--primary" onClick={() => openModal(null)}><I.Plus size={12} /> New listing</button>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <table className="tbl">
          <thead><tr><th>Title</th><th>Species</th><th>Price/kg</th><th>Min qty</th><th>Lots</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {listings.map(l => (
              <tr key={l.id}>
                <td><strong>{l.title}</strong></td>
                <td className="muted-data">{l.speciesName}</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.pricePerKg}</td>
                <td className="muted-data">{l.minQtyKg} kg</td>
                <td>{(l.lots ?? []).length ? (l.lots ?? []).map(x => <span key={x} className="kbd" style={{marginRight: 4}}>{x}</span>) : <span className="muted-data">—</span>}</td>
                <td><span className={`chip ${statusChip[l.status] ? `chip--${statusChip[l.status]}` : ''}`}>{l.status}</span></td>
                <td style={{textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end'}}>
                  {l.status === 'DRAFT' || l.status === 'UNPUBLISHED'
                    ? <button className="btn btn--ghost btn--sm" onClick={() => publishMut.mutate(l.id)}>Publish</button>
                    : <button className="btn btn--ghost btn--sm" onClick={() => unpubMut.mutate(l.id)}>Unpublish</button>
                  }
                  <button className="btn btn--ghost btn--sm" onClick={() => openModal(l)}><I.Edit size={11} /> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">{form.id ? 'Edit listing' : 'New listing'}</div>
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
                <label>Species</label>
                <input className="input" value={form.speciesName ?? ''} onChange={e => setForm(f => ({ ...f, speciesName: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Price per kg</label>
                <input className="input" value={form.pricePerKg ?? ''} onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Minimum quantity</label>
                <input className="input" value={form.minQtyKg ?? ''} onChange={e => setForm(f => ({ ...f, minQtyKg: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Status</label>
                <input className="input" value={form.status ?? 'DRAFT'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
