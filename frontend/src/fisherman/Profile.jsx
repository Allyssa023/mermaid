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
        <div style={{ background: 'var(--caution-soft, #fff9e6)', color: 'var(--caution, #b45309)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>⚠️</span>
          <span>Add a GCash or Maya number to receive vendor payouts directly to your e-wallet.</span>
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
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--ink-3)', marginBottom: 4 }}>SMS preview on departure</div>
            {smsPreview}
          </div>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 16 }}>E-Wallet for Payouts</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>
            Vendors can pay you directly to your GCash or Maya account after a PROCUREMENT order is completed.
          </div>
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
