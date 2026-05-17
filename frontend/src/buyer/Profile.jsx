import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { getProfile, updateProfile } from './api/profile'
import { StatTileSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

export default function Profile() {
  const qc = useQueryClient()
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['buyerProfile'],
    queryFn: getProfile,
    staleTime: 5 * 60_000,
  })

  const [form, setForm] = useState(null)
  const editing = form != null
  const p = form ?? profile ?? {}

  const saveMut = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyerProfile'] }); setForm(null) },
  })

  if (isLoading) return <div className="page"><StatTileSkeleton /></div>
  if (error)     return <div className="page"><ApiError error={error} onRetry={refetch} /></div>

  const initials = (profile?.fullName ?? 'B').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>profile</em></h1>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="row" style={{gap: 20, alignItems: 'flex-start'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
            <div style={{width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 600}}>{initials}</div>
          </div>
          <div style={{flex: 1}}>
            <div className="form-grid">
              <div className="form-row">
                <label>Full name</label>
                <input className="input" value={p.fullName ?? ''} readOnly={!editing}
                  onChange={e => setForm(f => ({...f, fullName: e.target.value}))} />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input className="input" value={p.email ?? ''} disabled />
              </div>
              <div className="form-row">
                <label>Phone</label>
                <input className="input" value={p.phoneNumber ?? ''} readOnly={!editing}
                  onChange={e => setForm(f => ({...f, phoneNumber: e.target.value}))} />
              </div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Business name</label>
                <input className="input" value={p.businessName ?? ''} readOnly={!editing}
                  onChange={e => setForm(f => ({...f, businessName: e.target.value}))} />
              </div>
            </div>
            <div className="row" style={{gap: 8, marginTop: 14, justifyContent: 'flex-end'}}>
              {editing ? (
                <>
                  <button className="btn" onClick={() => setForm(null)}>Cancel</button>
                  <button className="btn btn--primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                    {saveMut.isPending ? 'Saving…' : 'Save profile'}
                  </button>
                </>
              ) : (
                <button className="btn btn--primary" onClick={() => setForm({...profile})}><I.Edit size={12} /> Edit profile</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
