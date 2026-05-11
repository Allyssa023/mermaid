import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { getProfile, updateProfile } from './api/profile'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

// ── Component ─────────────────────────────────────────────────────────────────

export default function FishermanProfilePage() {
  const [saved, setSaved] = useState(false)

  const qc = useQueryClient()
  const profileQ = useQuery({ queryKey: ['fisherman', 'profile'], queryFn: getProfile })
  const updateMut = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fisherman', 'profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    },
  })

  // Hooks must come before early returns
  if (profileQ.isLoading) return <div className="page"><CardSkeleton /></div>
  if (profileQ.error) return <div className="page"><ApiError error={profileQ.error} onRetry={profileQ.refetch} /></div>

  const profile = profileQ.data ?? {}
  const noWallet = !profile.gcashNumber && !profile.mayaNumber

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>profile</em></h1>
          <p className="page__sub">Vessel info and how vendors pay you out.</p>
        </div>
        {saved && <span className="chip chip--safe" style={{alignSelf: 'flex-end'}}><I.Check size={11} /> Saved</span>}
      </div>

      {noWallet && (
        <div style={{marginTop: 14, padding: '12px 16px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8, color: 'var(--caution)', display: 'flex', alignItems: 'center', gap: 10}}>
          <I.Alert size={16} />
          <div><strong>Add an e-wallet to receive payouts.</strong> Vendors can't pay you digitally without one.</div>
        </div>
      )}

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Vessel & landing</div></div>
          <div className="form-grid">
            <div className="form-row">
              <label>Full name</label>
              <input className="input" defaultValue={profile.fullName ?? ''} />
            </div>
            <div className="form-row">
              <label>Vessel name</label>
              <input className="input" defaultValue={profile.vesselName ?? ''} />
            </div>
            <div className="form-row">
              <label>Primary landing site</label>
              <input className="input" defaultValue={profile.landingSite ?? ''} />
            </div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}>
              <label>Email</label>
              <input className="input" defaultValue={profile.email ?? ''} disabled />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head"><div className="card__title">Safety contact</div></div>
          <p className="muted-data" style={{fontSize: 12, marginTop: 0, marginBottom: 14}}>SMS sent if you don't return on schedule.</p>
          <div className="form-grid">
            <div className="form-row" style={{gridColumn: '1 / -1'}}>
              <label>Contact name</label>
              <input className="input" defaultValue={profile.emergencyContactName ?? ''} />
            </div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}>
              <label>Phone</label>
              <input className="input" defaultValue={profile.emergencyContactPhone ?? ''} />
            </div>
          </div>
          {profile.emergencyContactName && (
            <div style={{marginTop: 14, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)'}}>
              <span className="muted-data">SMS preview</span><br />
              "Hello {profile.emergencyContactName} — {profile.fullName} hasn't returned from {profile.landingSite || 'the landing site'} as planned (ETA 13:00). Please check on them. — Mermaid"
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">E-wallet for payouts</div>
            <div className="card__sub">Vendors pay you here when settling cash orders or utang.</div>
          </div>
          <button className="btn btn--sm"><I.Wallet size={12} /> Change</button>
        </div>
        {profile.gcashNumber ? (
          <div className="row" style={{gap: 16, alignItems: 'center'}}>
            <div style={{width: 56, height: 56, borderRadius: 12, background: 'oklch(0.7 0.14 220)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 13, letterSpacing: '0.5px'}}>GCash</div>
            <div style={{flex: 1}}>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 16}}>GCash · {profile.gcashNumber}</div>
              <div className="muted-data" style={{fontSize: 12, marginTop: 4}}>Verified · default payout</div>
            </div>
            <span className="status status--completed"><span className="status__dot" /> ACTIVE</span>
          </div>
        ) : profile.mayaNumber ? (
          <div className="row" style={{gap: 16, alignItems: 'center'}}>
            <div style={{width: 56, height: 56, borderRadius: 12, background: 'oklch(0.7 0.14 160)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 13, letterSpacing: '0.5px'}}>Maya</div>
            <div style={{flex: 1}}>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 16}}>Maya · {profile.mayaNumber}</div>
              <div className="muted-data" style={{fontSize: 12, marginTop: 4}}>Verified · default payout</div>
            </div>
            <span className="status status--completed"><span className="status__dot" /> ACTIVE</span>
          </div>
        ) : (
          <div className="muted-data">No e-wallet connected yet.</div>
        )}
      </div>

      <div className="row" style={{marginTop: 18, gap: 8, justifyContent: 'flex-end'}}>
        <button className="btn">Cancel</button>
        <button
          className="btn btn--primary"
          onClick={() => updateMut.mutate(profile)}
          disabled={updateMut.isPending}
        >
          {updateMut.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}
