import { useState, useEffect } from 'react'
import { getProfile, updateProfile } from './api/profile'

export default function Profile() {
  const [form, setForm] = useState({
    vesselName: '', landingSite: '', emergencyContactName: '', emergencyContactPhone: '',
    gcashNumber: '', mayaNumber: '',
  })
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    getProfile()
      .then(p => {
        setFullName(p.fullName || '')
        setForm({
          vesselName:            p.vesselName || '',
          landingSite:           p.landingSite || '',
          emergencyContactName:  p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
          gcashNumber:           p.gcashNumber || '',
          mayaNumber:            p.mayaNumber || '',
        })
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true); setSuccess(false); setError('')
    try {
      await updateProfile(form)
      setSuccess(true)
    } catch (e) {
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const smsPreview = `${fullName || 'You'} has departed for fishing. Vessel: ${form.vesselName || 'vessel'}. Expected return: early morning. - MERMAID Safety`

  if (loading) return (
    <div className="page">
      <div className="empty" style={{ padding: '60px 0' }}><div className="empty__title">Loading…</div></div>
    </div>
  )

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Fisherman · Account</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>My <em>Profile.</em></h1>
          <p className="page__sub">Vessel details and safety contact.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary btn--sm" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ background: 'var(--safe-soft)', color: 'var(--safe)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          Profile saved.
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !form.gcashNumber && !form.mayaNumber && (
        <div style={{ background: 'var(--caution-soft)', border: '1px solid color-mix(in oklch, var(--caution), transparent 60%)', color: 'var(--caution)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Add a GCash or Maya number so vendors can pay you directly after procurement orders.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card__title" style={{ marginBottom: 16 }}>Vessel Info</div>
          <div className="form-grid">
            <div className="form-row">
              <label>Full name</label>
              <input className="input" value={fullName} disabled />
            </div>
            <div className="form-row">
              <label>Vessel name</label>
              <input className="input" value={form.vesselName}
                onChange={e => f('vesselName', e.target.value)}
                placeholder="e.g. MV Diwata" />
            </div>
            <div className="form-row">
              <label>Landing site</label>
              <input className="input" value={form.landingSite}
                onChange={e => f('landingSite', e.target.value)}
                placeholder="e.g. Navotas Fish Landing" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 16 }}>Safety Contact</div>
          <div className="form-grid">
            <div className="form-row">
              <label>Contact name</label>
              <input className="input" value={form.emergencyContactName}
                onChange={e => f('emergencyContactName', e.target.value)}
                placeholder="Contact person name" />
            </div>
            <div className="form-row">
              <label>Phone number</label>
              <input className="input" type="tel" value={form.emergencyContactPhone}
                onChange={e => f('emergencyContactPhone', e.target.value)}
                placeholder="09XX XXX XXXX" />
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 8, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SMS preview on departure</div>
            {smsPreview}
          </div>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>E-Wallet for Payouts</div>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16, lineHeight: 1.5 }}>
            Vendors send procurement payments directly to your GCash or Maya. Add at least one number to receive payouts.
          </p>
          <div className="form-grid">
            <div className="form-row">
              <label>GCash number</label>
              <input
                className="input"
                type="tel"
                value={form.gcashNumber}
                onChange={e => f('gcashNumber', e.target.value)}
                placeholder="09XX XXX XXXX"
                maxLength={11}
              />
            </div>
            <div className="form-row">
              <label>Maya number</label>
              <input
                className="input"
                type="tel"
                value={form.mayaNumber}
                onChange={e => f('mayaNumber', e.target.value)}
                placeholder="09XX XXX XXXX"
                maxLength={11}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
