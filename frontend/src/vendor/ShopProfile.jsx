import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { getShopProfile, updateShopProfile } from './api/shop'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const DAYS = [
  { k: 'MON', label: 'Mon' },
  { k: 'TUE', label: 'Tue' },
  { k: 'WED', label: 'Wed' },
  { k: 'THU', label: 'Thu' },
  { k: 'FRI', label: 'Fri' },
  { k: 'SAT', label: 'Sat' },
  { k: 'SUN', label: 'Sun' },
]

const defaultDay = (k) => ({ day: k, openTime: '06:00', closeTime: '18:00', closed: false })
const defaultWeek = () => DAYS.map(d => defaultDay(d.k))

function hoursFromShop(shop) {
  const list = Array.isArray(shop?.hoursJson?.days) ? shop.hoursJson.days : null
  if (!list || list.length === 0) return defaultWeek()
  const byDay = Object.fromEntries(list.map(h => [h.day, h]))
  return DAYS.map(d => ({ ...defaultDay(d.k), ...(byDay[d.k] ?? {}) }))
}

function toPayload(resolved) {
  // Backend ShopProfileRequest uses `hoursJson` (free-form object). Wrap our typed array.
  return {
    displayName: resolved.displayName,
    slug:        resolved.slug,
    bio:         resolved.bio,
    logoUrl:     resolved.logoUrl,
    bannerUrl:   resolved.bannerUrl,
    hoursJson:   { days: resolved.hoursDays },
  }
}

export default function ShopProfile() {
  const [saved, setSaved] = useState(false)
  const [form, setForm]   = useState(null)

  const qc = useQueryClient()
  const shopQ = useQuery({ queryKey: ['vendor', 'shop'], queryFn: getShopProfile })
  const updateMut = useMutation({
    mutationFn: updateShopProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor', 'shop'] }); setSaved(true); setTimeout(() => setSaved(false), 2200) },
  })

  if (shopQ.isLoading) return <div className="page"><CardSkeleton /></div>
  if (shopQ.error)     return <div className="page"><ApiError error={shopQ.error} onRetry={shopQ.refetch} /></div>
  const shop = shopQ.data ?? {}

  const resolved = form ?? {
    displayName:    shop.displayName ?? '',
    slug:           shop.slug ?? '',
    bio:            shop.bio ?? '',
    pickupLocation: shop.pickupLocation ?? '',
    logoUrl:        shop.logoUrl ?? '',
    bannerUrl:      shop.bannerUrl ?? '',
    hoursDays:  hoursFromShop(shop),
  }

  const setField = (key) => (e) => setForm(f => ({ ...(f ?? resolved), [key]: e.target.value }))
  const setHour  = (idx, key, val) =>
    setForm(f => {
      const base = f ?? resolved
      const next = base.hoursDays.map((h, i) => i === idx ? { ...h, [key]: val } : h)
      return { ...base, hoursDays: next }
    })

  const previewUrl = `/shop/${resolved.slug || shop.slug || ''}`

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Shop</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>public shop</em></h1>
          <p className="page__sub">This is what buyers see at <span style={{fontFamily: 'var(--font-mono)', color: 'var(--accent)'}}>mermaid.ph{previewUrl || '/shop/your-shop'}</span></p>
        </div>
        <div className="row" style={{gap: 8}}>
          <button
            className="btn"
            onClick={() => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer') }}
            disabled={!resolved.slug && !shop.slug}
          >
            <I.Eye size={12} /> Preview
          </button>
          <button
            className="btn btn--primary"
            onClick={() => updateMut.mutate(toPayload(resolved))}
            disabled={updateMut.isPending}
          >
            <I.Check size={12} /> {updateMut.isPending ? 'Saving…' : (saved ? 'Saved!' : 'Save changes')}
          </button>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Basic info</div></div>
          <div className="form-grid">
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Display name</label><input className="input" value={resolved.displayName} onChange={setField('displayName')} /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Public slug</label><input className="input" value={resolved.slug} onChange={setField('slug')} /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Bio</label><textarea className="input" rows="3" value={resolved.bio} onChange={setField('bio')} /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Pickup location</label><input className="input" value={resolved.pickupLocation} onChange={setField('pickupLocation')} /></div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <div className="card">
            <div className="card__head"><div className="card__title">Media</div></div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Logo URL</label><input className="input" value={resolved.logoUrl} onChange={setField('logoUrl')} /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Banner URL</label><input className="input" value={resolved.bannerUrl} onChange={setField('bannerUrl')} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card__head"><div className="card__title">Business hours</div></div>
            <div style={{display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'center', fontSize: 12}}>
              {resolved.hoursDays.map((h, i) => (
                <div key={h.day} style={{display: 'contents'}}>
                  <strong>{DAYS[i].label}</strong>
                  <input
                    type="time"
                    className="input"
                    value={h.openTime}
                    onChange={(e) => setHour(i, 'openTime', e.target.value)}
                    disabled={h.closed}
                  />
                  <input
                    type="time"
                    className="input"
                    value={h.closeTime}
                    onChange={(e) => setHour(i, 'closeTime', e.target.value)}
                    disabled={h.closed}
                  />
                  <label style={{display: 'flex', alignItems: 'center', gap: 4}}>
                    <input
                      type="checkbox"
                      checked={!!h.closed}
                      onChange={(e) => setHour(i, 'closed', e.target.checked)}
                    /> closed
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
