import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { getShopProfile, updateShopProfile } from './api/shop'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const DAYS = [
  { k: 'mon', label: 'Mon' },
  { k: 'tue', label: 'Tue' },
  { k: 'wed', label: 'Wed' },
  { k: 'thu', label: 'Thu' },
  { k: 'fri', label: 'Fri' },
  { k: 'sat', label: 'Sat' },
  { k: 'sun', label: 'Sun' },
]

export default function ShopProfile() {
  const [saved, setSaved] = useState(false)
  const qc = useQueryClient()
  const shopQ = useQuery({ queryKey: ['vendor', 'shop'], queryFn: getShopProfile })
  const updateMut = useMutation({
    mutationFn: updateShopProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor', 'shop'] }); setSaved(true); setTimeout(() => setSaved(false), 2200) },
  })

  if (shopQ.isLoading) return <div className="page"><CardSkeleton /></div>
  if (shopQ.error) return <div className="page"><ApiError error={shopQ.error} onRetry={shopQ.refetch} /></div>
  const shop = shopQ.data ?? {}

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Shop</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>public shop</em></h1>
          <p className="page__sub">This is what buyers see at <span style={{fontFamily: 'var(--font-mono)', color: 'var(--accent)'}}>mermaid.ph/shop/{shop.slug ?? 'your-shop'}</span></p>
        </div>
        <div className="row" style={{gap: 8}}>
          <button className="btn"><I.Eye size={12} /> Preview</button>
          <button className="btn btn--primary" onClick={() => updateMut.mutate(shop)}><I.Check size={12} /> {saved ? 'Saved!' : 'Save changes'}</button>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Basic info</div></div>
          <div className="form-grid">
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Display name</label><input className="input" defaultValue={shop.displayName ?? ''} /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Public slug</label><input className="input" defaultValue={shop.slug ?? ''} /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Bio</label><textarea className="input" rows="3" defaultValue={shop.bio ?? ''}></textarea></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Pickup location</label><input className="input" defaultValue={shop.pickupLocation ?? ''} /></div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <div className="card">
            <div className="card__head"><div className="card__title">Media</div></div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Logo URL</label><input className="input" defaultValue={shop.logoUrl ?? ''} /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Banner URL</label><input className="input" defaultValue={shop.bannerUrl ?? ''} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card__head"><div className="card__title">Business hours</div></div>
            <div style={{display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'center', fontSize: 12}}>
              {DAYS.map(d => (
                <div key={d.k} style={{display: 'contents'}}>
                  <strong>{d.label}</strong>
                  <input className="input" defaultValue="06:00" />
                  <input className="input" defaultValue="18:00" />
                  <label style={{display: 'flex', alignItems: 'center', gap: 4}}><input type="checkbox" /> closed</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
