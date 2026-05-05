import { useState, useEffect } from 'react'
import { apiGet, apiPatch } from '../api'
import { fmt } from './utils/format'
import ImageUpload from './components/ImageUpload'

export default function Profile({ user, onProfileUpdated }) {
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)

  function load() {
    setLoading(true)
    apiGet('/buyer/profile')
      .then(p => {
        setProfile(p)
        setFullName(p.fullName || '')
        setAvatarUrl(p.avatarUrl || null)
      })
      .catch(e => setError(e?.message || 'Failed to load profile.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = await apiPatch('/buyer/profile', null, {
        fullName: fullName.trim() || undefined,
        avatarUrl,
      })
      setProfile(updated)
      setSuccess('Profile saved.')
      onProfileUpdated?.(updated)
      setTimeout(() => setSuccess(''), 2500)
    } catch (e) {
      setError(e?.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(url) {
    setAvatarUrl(url)
    // Auto-persist avatar so the upload feels immediate.
    setSaving(true); setError('')
    try {
      const updated = await apiPatch('/buyer/profile', null, { avatarUrl: url })
      setProfile(updated)
      onProfileUpdated?.(updated)
    } catch (e) {
      setError(e?.message || 'Could not update avatar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page__head">
          <div>
            <div className="eyebrow">Account</div>
            <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Profile</em></h1>
          </div>
        </div>
        <div className="card" style={{ marginTop: 18, padding: 20 }}>
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
          <div className="skeleton" style={{ height: 96, marginTop: 12, width: 96, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 16, marginTop: 16 }} />
        </div>
      </div>
    )
  }

  const dirty = (fullName.trim() !== (profile?.fullName || '').trim())

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Profile</em></h1>
          <p className="page__sub">
            Member since {profile?.memberSince ? fmt(profile.memberSince) : '—'} · {profile?.totalOrders || 0} orders ·{' '}
            {profile?.totalReviews || 0} reviews · {profile?.totalFavorites || 0} saved
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, padding: 20 }}>
        <div className="label">Avatar</div>
        <div style={{ marginTop: 8 }}>
          <ImageUpload
            value={avatarUrl}
            onChange={handleAvatarChange}
            subDir="avatars"
            label="Upload avatar"
          />
        </div>

        <div className="label" style={{ marginTop: 18 }}>Full name</div>
        <input
          className="input"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          maxLength={200}
          style={{ marginTop: 6 }}
        />

        <div className="label" style={{ marginTop: 14 }}>Email</div>
        <input
          className="input"
          value={profile?.email || ''}
          disabled
          style={{ marginTop: 6, opacity: 0.65 }}
        />
        <div className="muted-data" style={{ fontSize: 11, marginTop: 4 }}>
          Email changes are not supported yet.
        </div>

        {error && <div style={{ color: 'var(--unsafe)', fontSize: 13, marginTop: 12 }}>{error}</div>}
        {success && <div style={{ color: 'var(--safe, #22a37e)', fontSize: 13, marginTop: 12 }}>{success}</div>}

        <div className="row" style={{ gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button className="btn btn--accent" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
