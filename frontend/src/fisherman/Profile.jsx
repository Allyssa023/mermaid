import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { getProfile, updateProfile } from './api/profile'
import { getFishermanAnalytics } from './api/earnings'

const EDITABLE_FIELDS = [
  { key: 'vesselName',            label: 'Vessel name',         placeholder: 'e.g. Sta. Ana' },
  { key: 'landingSite',           label: 'Home port / landing', placeholder: 'e.g. Lucena Port' },
  { key: 'emergencyContactName',  label: 'Emergency contact',   placeholder: 'Full name' },
  { key: 'emergencyContactPhone', label: 'Emergency phone',     placeholder: '+63 9XX XXX XXXX' },
  { key: 'gcashNumber',           label: 'GCash number',        placeholder: '+63 9XX XXX XXXX' },
  { key: 'mayaNumber',            label: 'Maya number',         placeholder: '+63 9XX XXX XXXX' },
]

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 13, color: '#fff' }}>
        {value || <span style={{ color: 'var(--ink-4)' }}>Not set</span>}
      </div>
    </div>
  )
}

function Toggle({ label, on: initialOn }) {
  const [v, setV] = useState(initialOn)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--hairline-2)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
      <button onClick={() => setV(!v)} style={{ width: 36, height: 20, padding: 2, background: v ? 'var(--accent-lime)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 99, cursor: 'pointer', position: 'relative', transition: 'background 150ms' }}>
        <div style={{ width: 16, height: 16, borderRadius: 99, background: v ? 'var(--ink-deep)' : '#fff', marginLeft: v ? 16 : 0, transition: 'margin 150ms' }} />
      </button>
    </div>
  )
}

export default function FishermanProfilePage({ setProfileDirty }) {
  const { user } = useAuth()
  const profileQ   = useQuery({ queryKey: ['fisherman', 'profile'],    queryFn: getProfile })
  const analyticsQ = useQuery({ queryKey: ['fisherman', 'analytics'],  queryFn: getFishermanAnalytics })
  const profile    = profileQ.data
  const analytics  = analyticsQ.data

  const [form, setForm] = useState({
    vesselName: '', landingSite: '', emergencyContactName: '',
    emergencyContactPhone: '', gcashNumber: '', mayaNumber: '',
  })
  const [toast, setToast] = useState(false)

  useEffect(() => {
    if (!profile) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      vesselName:            profile.vesselName            ?? '',
      landingSite:           profile.landingSite            ?? '',
      emergencyContactName:  profile.emergencyContactName  ?? '',
      emergencyContactPhone: profile.emergencyContactPhone ?? '',
      gcashNumber:           profile.gcashNumber            ?? '',
      mayaNumber:            profile.mayaNumber             ?? '',
    })
  }, [profile])

  const updateMut = useMutation({
    mutationFn: (body) => updateProfile(body),
    onSuccess: () => {
      setProfileDirty?.(false)
      setToast(true)
      setTimeout(() => setToast(false), 2200)
    },
  })

  const setField = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setProfileDirty?.(true)
  }

  if (profileQ.isLoading) return <div style={{ padding: 24, color: 'var(--ink-3)' }}>Loading…</div>

  const displayName = profile?.fullName ?? user?.fullName ?? 'Fisherman'
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const handle      = (profile?.username ?? profile?.email?.split('@')[0] ?? 'fisherman').toLowerCase()

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : user?.createdAt
      ? new Date(user.createdAt).getFullYear()
      : null

  const trips    = analytics?.completedTrips ?? analytics?.tripCount  ?? '—'
  const kgSold   = analytics?.totalKgSold    ?? analytics?.kgSold     ?? '—'
  const vendors  = analytics?.uniqueVendors   ?? analytics?.vendorCount ?? '—'
  const rating   = analytics?.averageRating   ?? profile?.rating        ?? null

  return (
    <div className="fade-in" style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Account</div>
          <h1 className="page__title">Your <em className="chip-lime">Profile</em></h1>
          <p className="page__sub">Vessel info, BFAR registration, and account preferences.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Edit profile</button>
          <button className="btn btn--lime" onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>
            {updateMut.isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 22 }}>
        {/* Profile card */}
        <div className="card" style={{ textAlign: 'center', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(106,95,193,0.2), transparent 60%), var(--bg-card)' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #fa7faa, #6a5fc1)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700,
            boxShadow: '0 12px 32px rgba(106,95,193,0.4)', color: '#fff',
          }}>
            {initials}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
            @{handle}{memberSince ? ` · Fisherman since ${memberSince}` : ''}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
            <span className="chip chip--lime"><I.Shield size={10} />BFAR verified</span>
            {rating && <span className="chip chip--safe"><I.Star size={10} />{rating} rating</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingTop: 18, borderTop: '1px solid var(--hairline)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: '#fff' }}>{trips}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Trips</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--accent-lime)' }}>
                {typeof kgSold === 'number' ? `${(kgSold / 1000).toFixed(1)}k` : kgSold}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>kg sold</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: '#fff' }}>{vendors}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Vendors</div>
            </div>
          </div>
        </div>

        {/* Detail cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Identity */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Identity</div>
                <div className="card__sub">Read-only account info</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Full name" value={profile?.fullName ?? user?.fullName} />
              <Field label="Email"     value={profile?.email    ?? user?.email} />
            </div>
          </div>

          {/* Vessel & fishing info */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Vessel & fishing info</div>
                <div className="card__sub">Edit and save below</div>
              </div>
              <span className="chip chip--violet"><I.Shield size={10} />Verified</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {EDITABLE_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="f-field" style={{ margin: 0 }}>
                  <label className="f-label">{label}</label>
                  <input className="f-input" placeholder={placeholder} value={form[key]}
                    onChange={e => setField(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="card">
            <div className="card__head">
              <div className="card__title">Preferences</div>
            </div>
            <Toggle label="Push notifications for catch alert matches" on />
            <Toggle label="SMS alerts for marine advisories" on />
            <Toggle label="Email weekly earnings summary" on={false} />
            <Toggle label="Show BFAR badge on public profile" on />
          </div>
        </div>
      </div>

      {toast && <div className="f-toast">Profile updated</div>}
    </div>
  )
}
