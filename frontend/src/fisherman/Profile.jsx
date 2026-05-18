import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import gsap from 'gsap'
import { getProfile, updateProfile } from './api/profile'

export default function FishermanProfilePage({ setPage, setProfileDirty }) {
  const profileQ = useQuery({ queryKey: ['fisherman', 'profile'], queryFn: getProfile })
  const profile = profileQ.data

  const [form, setForm] = useState({
    vesselName: '',
    landingSite: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    gcashNumber: '',
    mayaNumber: '',
  })
  const [toast, setToast] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      vesselName: profile.vesselName ?? '',
      landingSite: profile.landingSite ?? '',
      emergencyContactName: profile.emergencyContactName ?? '',
      emergencyContactPhone: profile.emergencyContactPhone ?? '',
      gcashNumber: profile.gcashNumber ?? '',
      mayaNumber: profile.mayaNumber ?? '',
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

  const animateFocus = (e) =>
    gsap.to(e.target, { boxShadow: '0 0 0 2px rgba(163,230,53,0.4)', duration: 0.15 })
  const animateBlur = (e) =>
    gsap.to(e.target, { boxShadow: '0 0 0 2px transparent', duration: 0.15 })

  if (profileQ.isLoading) return <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)' }}>Loading…</div>

  const FIELDS = [
    { key: 'vesselName', label: 'Vessel Name' },
    { key: 'landingSite', label: 'Landing Site' },
    { key: 'emergencyContactName', label: 'Emergency Contact' },
    { key: 'emergencyContactPhone', label: 'Emergency Phone' },
    { key: 'gcashNumber', label: 'GCash Number' },
    { key: 'mayaNumber', label: 'Maya Number' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          marginBottom: 24,
        }}
      >
        Profile
      </div>

      {/* Read-only identity */}
      <div className="f-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
            Full Name
          </div>
          <div style={{ fontWeight: 600 }}>{profile?.fullName ?? '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
            Email
          </div>
          <div>{profile?.email ?? '—'}</div>
        </div>
      </div>

      {/* Editable fields */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="f-field">
            <label className="f-label">{label}</label>
            <input
              className="f-input"
              value={form[key]}
              onChange={e => setField(key, e.target.value)}
              onFocus={animateFocus}
              onBlur={animateBlur}
            />
          </div>
        ))}
      </div>

      <button
        className="f-btn f-btn--primary"
        onClick={() => updateMut.mutate(form)}
        disabled={updateMut.isPending}
      >
        {updateMut.isPending ? 'Saving…' : 'Save Profile'}
      </button>

      {toast && <div className="f-toast">Profile updated</div>}
    </div>
  )
}
