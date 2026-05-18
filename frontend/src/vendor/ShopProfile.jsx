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
  // Backend ShopProfileRequest uses `hoursJson` (free-form object). Wrap our typed array.
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

const inputStyle = {
  background: 'var(--bg-card-2)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-md, 10px)',
  color: 'var(--ink-1)',
  padding: '8px 12px',
  fontFamily: 'var(--font-ui, Rubik, sans-serif)',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: 'var(--ink-3)',
  fontFamily: 'var(--font-ui, Rubik, sans-serif)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function ShopProfile() {
  const [saved, setSaved] = useState(false)
  const [form, setForm]   = useState(null)

  const qc = useQueryClient()
  const shopQ    = useQuery({ queryKey: ['vendor', 'shop'],    queryFn: getShopProfile })
  const reviewsQ = useQuery({ queryKey: ['vendor', 'reviews', 'shop-kpi'], queryFn: () => listVendorReviews(0, 200) })
  const ordersQ  = useQuery({ queryKey: ['vendor', 'orders'],  queryFn: () => listInbox() })

  const updateMut = useMutation({
    mutationFn: updateShopProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor', 'shop'] }); setSaved(true); setTimeout(() => setSaved(false), 2200) },
  })

  if (shopQ.isLoading) return <div className="v-page"><CardSkeleton /></div>
  if (shopQ.error)     return <div className="v-page"><ApiError error={shopQ.error} onRetry={shopQ.refetch} /></div>
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

  // KPI derivations
  const reviewsList = reviewsQ.data?.content ?? reviewsQ.data ?? []
  const avgRating = Array.isArray(reviewsList) && reviewsList.length > 0
    ? (reviewsList.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewsList.length).toFixed(1)
    : null
  const ordersList = ordersQ.data?.content ?? ordersQ.data ?? []
  const totalOrders = Array.isArray(ordersList) ? ordersList.length : null

  return (
    <div className="v-page">
      {/* Banner strip */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-2) 100%)',
        borderRadius: 'var(--radius-lg, 14px)',
        padding: '32px 24px',
        marginBottom: 24,
        borderBottom: '3px solid var(--accent-lime)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circle */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'var(--accent-lime)', opacity: 0.04 }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>
              {resolved.displayName || 'Your Shop'}
            </h1>
            <p style={{ color: 'var(--ink-3)', marginTop: 6, fontSize: 14, fontFamily: 'var(--font-ui, Rubik, sans-serif)', margin: '6px 0 0' }}>
              {resolved.bio ? resolved.bio.slice(0, 80) + (resolved.bio.length > 80 ? '…' : '') : 'Manage your vendor profile'}
            </p>
            <p style={{ marginTop: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-lime)' }}>
              mermaid.ph{previewUrl || '/shop/your-shop'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="v-btn v-btn--ghost"
              onClick={() => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer') }}
              disabled={!resolved.slug && !shop.slug}
            >
              <I.Eye size={12} /> Preview
            </button>
            <button
              className="v-btn v-btn--primary"
              onClick={() => updateMut.mutate(toPayload(resolved))}
              disabled={updateMut.isPending}
            >
              <I.Check size={12} /> {updateMut.isPending ? 'Saving…' : (saved ? 'Saved!' : 'Save changes')}
            </button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Rating</div>
          <div className="v-kpi-cell__value">{avgRating ?? '—'}</div>
          <div className="v-kpi-cell__sub">avg from reviews</div>
        </div>
        <div className="v-kpi-cell">
          {/* listInbox has no page-size param; count reflects first-page results only */}
          <div className="v-kpi-cell__label">Orders (recent)</div>
          <div className="v-kpi-cell__value">{totalOrders != null ? totalOrders : '—'}</div>
          <div className="v-kpi-cell__sub">recent inbox</div>
        </div>
        <div className="v-kpi-cell">
          <div className="v-kpi-cell__label">Member Since</div>
          <div className="v-kpi-cell__value">{shop.createdAt ? new Date(shop.createdAt).getFullYear() : '—'}</div>
          <div className="v-kpi-cell__sub">joined</div>
        </div>
      </div>

      {/* Two-column form layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left column: Basic Info */}
        <div className="v-panel">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-1)', marginBottom: 16 }}>Basic Info</div>

          <div className="v-field">
            <label style={labelStyle}>Display name</label>
            <input className="v-input" value={resolved.displayName} onChange={setField('displayName')} style={inputStyle} />
          </div>

          <div className="v-field">
            <label style={labelStyle}>Public slug</label>
            <input className="v-input" value={resolved.slug} onChange={setField('slug')} style={inputStyle} />
          </div>

          <div className="v-field">
            <label style={labelStyle}>Bio</label>
            <textarea className="v-input" rows="3" value={resolved.bio} onChange={setField('bio')} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div className="v-field">
            <label style={labelStyle}>Pickup location</label>
            <input className="v-input" value={resolved.pickupLocation} onChange={setField('pickupLocation')} style={inputStyle} />
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-1)', marginBottom: 16, marginTop: 8 }}>Media</div>

          <div className="v-field">
            <label style={labelStyle}>Logo URL</label>
            <input className="v-input" value={resolved.logoUrl} onChange={setField('logoUrl')} style={inputStyle} />
          </div>

          <div className="v-field">
            <label style={labelStyle}>Banner URL</label>
            <input className="v-input" value={resolved.bannerUrl} onChange={setField('bannerUrl')} style={inputStyle} />
          </div>
        </div>

        {/* Right column: Business Hours */}
        <div className="v-panel">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-1)', marginBottom: 16 }}>Business Hours</div>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr auto', gap: '8px 6px', alignItems: 'center', fontSize: 12 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}></div>
            <div style={labelStyle}>Open</div>
            <div style={labelStyle}>Close</div>
            <div style={labelStyle}>Closed</div>
            {resolved.hoursDays.map((h, i) => (
              <div key={h.day} style={{ display: 'contents' }}>
                <strong style={{ color: 'var(--ink-2)', fontSize: 12 }}>{DAYS[i].label}</strong>
                <input
                  type="time"
                  className="v-input"
                  value={h.openTime}
                  onChange={(e) => setHour(i, 'openTime', e.target.value)}
                  disabled={h.closed}
                  style={{ ...inputStyle, padding: '6px 8px', opacity: h.closed ? 0.4 : 1 }}
                />
                <input
                  type="time"
                  className="v-input"
                  value={h.closeTime}
                  onChange={(e) => setHour(i, 'closeTime', e.target.value)}
                  disabled={h.closed}
                  style={{ ...inputStyle, padding: '6px 8px', opacity: h.closed ? 0.4 : 1 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!h.closed}
                    onChange={(e) => setHour(i, 'closed', e.target.checked)}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
