import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { getShopProfile, updateShopProfile } from './api/shop'
import { listVendorReviews } from './api/reviews'
import { listInbox } from './api/orders'
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
  return {
    displayName:    resolved.displayName,
    slug:           resolved.slug,
    bio:            resolved.bio,
    logoUrl:        resolved.logoUrl,
    bannerUrl:      resolved.bannerUrl,
    pickupLocation: resolved.pickupLocation,
    hoursJson:      { days: resolved.hoursDays },
  }
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

export default function ShopProfile() {
  const [saved, setSaved] = useState(false)
  const [form, setForm]   = useState(null)

  const qc = useQueryClient()
  const shopQ    = useQuery({ queryKey: ['vendor', 'shop'],               queryFn: getShopProfile })
  const reviewsQ = useQuery({ queryKey: ['vendor', 'reviews', 'shop-kpi'], queryFn: () => listVendorReviews(0, 200) })
  const ordersQ  = useQuery({ queryKey: ['vendor', 'orders'],             queryFn: () => listInbox() })

  const updateMut = useMutation({
    mutationFn: updateShopProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'shop'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    },
  })

  if (shopQ.isLoading) return <div className="content"><CardSkeleton /></div>
  if (shopQ.error)     return <div className="content"><ApiError error={shopQ.error} onRetry={shopQ.refetch} /></div>
  const shop = shopQ.data ?? {}

  const resolved = form ?? {
    displayName:    shop.displayName    ?? '',
    slug:           shop.slug           ?? '',
    bio:            shop.bio            ?? '',
    pickupLocation: shop.pickupLocation ?? '',
    logoUrl:        shop.logoUrl        ?? '',
    bannerUrl:      shop.bannerUrl      ?? '',
    hoursDays:      hoursFromShop(shop),
  }

  const setField = (key) => (e) => setForm(f => ({ ...(f ?? resolved), [key]: e.target.value }))
  const setHour  = (idx, key, val) =>
    setForm(f => {
      const base = f ?? resolved
      const next = base.hoursDays.map((h, i) => i === idx ? { ...h, [key]: val } : h)
      return { ...base, hoursDays: next }
    })

  const previewUrl = `/shop/${resolved.slug || shop.slug || ''}`

  const reviewsList  = reviewsQ.data?.content ?? reviewsQ.data ?? []
  const avgRating    = Array.isArray(reviewsList) && reviewsList.length > 0
    ? (reviewsList.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewsList.length).toFixed(1)
    : null
  const ordersList   = ordersQ.data?.content ?? ordersQ.data ?? []
  const totalOrders  = Array.isArray(ordersList) ? ordersList.length : null
  const logoInitials = (resolved.displayName || shop.displayName || 'S').slice(0, 1).toUpperCase()

  return (
    <div className="content view-body">
      <PageHead
        eyebrow="Shop"
        title="Your"
        em="public shop"
        sub={<>This is what buyers see at <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-lime)' }}>mermaid.ph{previewUrl}</span></>}
        actions={<>
          <button
            className="btn btn--ghost"
            onClick={() => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer') }}
            disabled={!resolved.slug && !shop.slug}
          >
            <I.Eye size={13} /> Preview
          </button>
          <button
            className="btn btn--primary"
            onClick={() => updateMut.mutate(toPayload(resolved))}
            disabled={updateMut.isPending}
          >
            <I.Check size={13} /> {updateMut.isPending ? 'Saving…' : (saved ? 'Saved!' : 'Save changes')}
          </button>
        </>}
      />

      <div style={{ position: 'relative', paddingBottom: 46 }}>
        <div className="shop-banner">
          <div className="shop-banner__edit">
            <button className="btn btn--sm btn--ghost" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
              <I.Settings size={11} /> Change banner
            </button>
          </div>
        </div>
        <div className="shop-logo">{logoInitials}</div>
      </div>

      <div className="kpi-strip">
        <div className="cell"><div className="l">Avg rating</div><div className="v">{avgRating ?? '—'}</div><div className="s">from reviews</div></div>
        <div className="cell"><div className="l">Orders (recent)</div><div className="v">{totalOrders ?? '—'}</div><div className="s">recent inbox</div></div>
        <div className="cell"><div className="l">Member since</div><div className="v">{shop.createdAt ? new Date(shop.createdAt).getFullYear() : '—'}</div><div className="s">joined</div></div>
      </div>

      <div className="cols-2">
        <div className="panel" style={{ padding: 22 }}>
          <div className="panel__title" style={{ marginBottom: 14 }}>Basic info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Display name</label>
              <input value={resolved.displayName} onChange={setField('displayName')} />
            </div>
            <div className="field">
              <label>Public slug</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '10px 12px', background: 'var(--panel-3)', border: '1px solid var(--hairline)', borderRight: 0, borderRadius: '10px 0 0 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  mermaid.ph/shop/
                </span>
                <input value={resolved.slug} onChange={setField('slug')} style={{ borderRadius: '0 10px 10px 0', flex: 1 }} />
              </div>
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea
                value={resolved.bio}
                onChange={setField('bio')}
                rows={4}
                style={{ resize: 'vertical', background: 'var(--panel-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 12px', color: 'var(--ink-on-dark)', font: '500 13px var(--font-ui)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div className="field">
              <label>Pickup location</label>
              <input value={resolved.pickupLocation} onChange={setField('pickupLocation')} />
            </div>
            <div className="field">
              <label>Logo URL</label>
              <input value={resolved.logoUrl} onChange={setField('logoUrl')} />
            </div>
            <div className="field">
              <label>Banner URL</label>
              <input value={resolved.bannerUrl} onChange={setField('bannerUrl')} />
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 22 }}>
          <div className="panel__title" style={{ marginBottom: 6 }}>Business hours</div>
          <div className="panel__sub" style={{ marginBottom: 14, marginLeft: 0 }}>Buyers see these on your public shop page.</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {resolved.hoursDays.map((h, i) => (
              <div key={h.day} className="hours-row">
                <div className="hours-row__day">{DAYS[i].label}</div>
                <input type="time" value={h.openTime}  onChange={e => setHour(i, 'openTime',  e.target.value)} disabled={h.closed} />
                <input type="time" value={h.closeTime} onChange={e => setHour(i, 'closeTime', e.target.value)} disabled={h.closed} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Closed</span>
                  <div className={`toggle${h.closed ? ' on' : ''}`} onClick={() => setHour(i, 'closed', !h.closed)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
