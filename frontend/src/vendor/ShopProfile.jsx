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

  if (loading) return (
    <div className="page">
      <div className="empty" style={{ padding: '60px 0' }}>
        <div className="empty__title">Loading…</div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · Profile</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Shop <em>Profile</em>
          </h1>
          <p className="page__sub">Customize your public shop page visible to buyers.</p>
        </div>
        <div className="page__actions">
          {profile?.slug && (
            <a
              href={`/shop/${profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--sm"
            >
              Preview public page →
            </a>
          )}
          <button
            onClick={save}
            disabled={saving || !!slugError}
            className="btn btn--primary"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
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
      {saved && (
        <div style={{
          color: 'var(--safe)', padding: '10px 14px',
          background: 'var(--safe-soft)', borderRadius: 8,
          marginBottom: 16, fontSize: 13,
        }}>
          Profile saved successfully.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Basic Info</div>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Display Name</label>
              <input
                className="input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={80}
                placeholder="e.g. Rosario's Fresh Catch"
              />
            </div>
            <div className="form-row">
              <label>Shop URL Slug</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>shop/</span>
                <input
                  className="input"
                  value={slug}
                  onChange={handleSlugChange}
                  maxLength={50}
                  placeholder="your-shop-slug"
                  style={{ flex: 1 }}
                />
              </div>
              {slugError && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--unsafe)' }}>{slugError}</p>}
            </div>
            <div className="form-row">
              <label>Bio</label>
              <textarea
                className="input"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Tell buyers about your shop…"
              />
            </div>
            <div className="form-row">
              <label>Pickup Location</label>
              <select
                className="input"
                value={pickupLocationId}
                onChange={e => setPickupLocationId(e.target.value)}
              >
                <option value="">No pickup location</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.municipality}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card__head">
              <div className="card__title">Media</div>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Logo URL</label>
                <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="form-row">
                <label>Banner URL</label>
                <input className="input" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Business Hours</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < DAYS.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    fontSize: 13,
                  }}
                >
                  <span style={{ width: 36, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {DAY_LABELS[d]}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-4)', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={hours[d].closed}
                      onChange={e => updateHour(d, 'closed', e.target.checked)}
                    />
                    Closed
                  </label>
                  {!hours[d].closed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                      <input
                        type="time"
                        value={hours[d].open}
                        onChange={e => updateHour(d, 'open', e.target.value)}
                        className="input"
                        style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                      />
                      <span style={{ color: 'var(--ink-4)' }}>–</span>
                      <input
                        type="time"
                        value={hours[d].close}
                        onChange={e => updateHour(d, 'close', e.target.value)}
                        className="input"
                        style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
