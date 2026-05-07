import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../api'
import { getShopProfile, updateShopProfile } from './api/shop'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
const SLUG_RE = /^[a-z][a-z0-9-]{2,49}$/

function defaultHours() {
  return Object.fromEntries(DAYS.map(d => [d, { open: '', close: '', closed: false }]))
}

function parseHours(raw) {
  if (!raw || typeof raw !== 'object') return defaultHours()
  const h = defaultHours()
  for (const d of DAYS) {
    if (raw[d]) {
      h[d] = { open: raw[d].open || '', close: raw[d].close || '', closed: !!raw[d].closed }
    }
  }
  return h
}

export default function ShopProfile() {
  const [profile, setProfile] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [bio, setBio] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [pickupLocationId, setPickupLocationId] = useState('')
  const [hours, setHours] = useState(defaultHours())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, locs] = await Promise.all([
        getShopProfile(),
        apiGet('/market-locations').catch(() => []),
      ])
      setProfile(p)
      setDisplayName(p.displayName || '')
      setSlug(p.slug || '')
      setBio(p.bio || '')
      setLogoUrl(p.logoUrl || '')
      setBannerUrl(p.bannerUrl || '')
      setPickupLocationId(p.pickupLocationId != null ? String(p.pickupLocationId) : '')
      setHours(parseHours(p.hoursJson))
      setLocations(Array.isArray(locs) ? locs : locs?.content || [])
    } catch (e) {
      setError(e.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const validateSlug = (value) => {
    if (!value) { setSlugError('Slug is required'); return false }
    if (!SLUG_RE.test(value)) {
      setSlugError('Slug must start with a letter, use only lowercase letters/digits/hyphens (3–50 chars)')
      return false
    }
    setSlugError('')
    return true
  }

  const handleSlugChange = (e) => {
    setSlug(e.target.value)
    validateSlug(e.target.value)
  }

  const updateHour = (day, field, value) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  const hoursToJson = () => {
    const result = {}
    for (const d of DAYS) {
      const h = hours[d]
      if (h.closed) {
        result[d] = { closed: true }
      } else if (h.open || h.close) {
        result[d] = { open: h.open, close: h.close, closed: false }
      }
    }
    return Object.keys(result).length ? result : null
  }

  const save = async () => {
    if (!validateSlug(slug)) return
    setSaving(true); setSaved(false); setError('')
    try {
      const body = {
        slug,
        displayName: displayName || undefined,
        bio: bio || null,
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
        pickupLocationId: pickupLocationId ? Number(pickupLocationId) : null,
        hoursJson: hoursToJson(),
      }
      const updated = await updateShopProfile(body)
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 24, color: '#6b7280' }}>Loading…</div>

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Shop Profile</h2>
        {profile?.slug && (
          <a
            href={`/shop/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}
          >
            Preview public page →
          </a>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
          Profile saved successfully.
        </div>
      )}

      <Field label="Display name">
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={80}
          style={inputStyle}
          placeholder="e.g. Rosario's Fresh Catch"
        />
      </Field>

      <Field label="Shop URL slug" error={slugError}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>shop/</span>
          <input
            value={slug}
            onChange={handleSlugChange}
            maxLength={50}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="your-shop-slug"
          />
        </div>
      </Field>

      <Field label="Bio">
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={3}
          maxLength={2000}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Tell buyers about your shop…"
        />
      </Field>

      <Field label="Logo URL">
        <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} style={inputStyle} placeholder="https://…" />
      </Field>

      <Field label="Banner URL">
        <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} style={inputStyle} placeholder="https://…" />
      </Field>

      <Field label="Pickup location">
        <select value={pickupLocationId} onChange={e => setPickupLocationId(e.target.value)} style={inputStyle}>
          <option value="">No pickup location</option>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name} — {l.municipality}</option>
          ))}
        </select>
      </Field>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
          Hours
        </label>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: i % 2 === 0 ? '#f9fafb' : '#fff', fontSize: 13,
            }}>
              <span style={{ width: 36, color: '#6b7280', fontWeight: 500 }}>{DAY_LABELS[d]}</span>
              <input
                type="checkbox"
                checked={hours[d].closed}
                onChange={e => updateHour(d, 'closed', e.target.checked)}
                id={`closed-${d}`}
              />
              <label htmlFor={`closed-${d}`} style={{ color: '#6b7280', marginRight: 8 }}>Closed</label>
              {!hours[d].closed && (
                <>
                  <input
                    type="time"
                    value={hours[d].open}
                    onChange={e => updateHour(d, 'open', e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px', fontSize: 13 }}
                  />
                  <span style={{ color: '#9ca3af' }}>–</span>
                  <input
                    type="time"
                    value={hours[d].close}
                    onChange={e => updateHour(d, 'close', e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px', fontSize: 13 }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving || !!slugError}
        style={{
          background: saving || slugError ? '#9ca3af' : '#2563eb',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 24px', fontSize: 15, cursor: saving ? 'wait' : 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
}
