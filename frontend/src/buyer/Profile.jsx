import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { getProfile, updateProfile } from './api/profile'
import { PageHead } from './components/PageHead'

const TIER_LABEL = (orders) => orders >= 50 ? 'PRO' : orders >= 20 ? 'STANDARD' : 'BASIC'

const PREF_ITEMS = [
  { label: 'Order updates',   sub: 'Get notified on status changes' },
  { label: 'New listings',    sub: 'Fresh catch alerts from saved vendors' },
  { label: 'Price alerts',    sub: 'When prices drop below your target' },
  { label: 'Deal reminders',  sub: 'Remind you of pending cart items' },
]

function FieldRow({ label, value, onChange, editing, editable = true, type = 'text' }) {
  return (
    <div className="display-field">
      <div className="display-field__label">{label}</div>
      {editing && editable ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="display-field__value"
          style={{ background: 'var(--layer-3)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 12px', outline: 'none', width: '100%' }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--hairline)'}
        />
      ) : (
        <div className="display-field__value" style={{ opacity: !editable ? 0.5 : 1 }}>{value ?? '—'}</div>
      )}
    </div>
  )
}

function AboutTab({ profile, editing, setEditing, form, setForm, onSave, isSaving, saveError }) {
  const p = form ?? profile ?? {}
  return (
    <div className="split-2">
      <div className="card">
        <div className="card__head">
          <div className="card__title">Contact</div>
          {!editing && (
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
              <I.Edit size={12} /> Edit
            </button>
          )}
        </div>
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <FieldRow label="Full name"     value={p.fullName}     type="text"  editing={editing} onChange={v => setForm(f => ({ ...f, fullName: v }))} />
          <FieldRow label="Email"         value={p.email}        type="email" editing={editing} editable={false} />
          <FieldRow label="Phone"         value={p.phoneNumber}  type="tel"   editing={editing} onChange={v => setForm(f => ({ ...f, phoneNumber: v }))} />
          <FieldRow label="Business name" value={p.businessName} type="text"  editing={editing} onChange={v => setForm(f => ({ ...f, businessName: v }))} />
        </div>
        {editing && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(false); setForm(null) }}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
        {saveError && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{saveError}</p>}
      </div>
      <div className="card">
        <div className="card__title" style={{ marginBottom: 12 }}>Identity</div>
        {[
          { label: 'Full name',    verified: true },
          { label: 'Email',        verified: true },
          { label: 'Phone number', verified: !!profile?.phoneNumber },
          { label: 'Government ID', verified: false },
        ].map((item, i) => (
          <div key={i} className="kyc-row">
            <div className="kyc-row__avatar">{item.label.slice(0, 1)}</div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--on-dark)' }}>{item.label}</div>
            <span className={`status-chip ${item.verified ? 'status-chip--done' : 'status-chip--new'}`}>
              {item.verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BusinessTab({ profile }) {
  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <div className="card__title" style={{ marginBottom: 14 }}>Business details</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Business name" value={profile?.businessName} editing={false} />
        <FieldRow label="Business type" value="Buyer / Reseller" editing={false} editable={false} />
      </div>
    </div>
  )
}

function PrefsTab() {
  const [prefs, setPrefs] = useState([true, true, false, false])
  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <div className="card__title" style={{ marginBottom: 14 }}>Notification preferences</div>
      {PREF_ITEMS.map((item, i) => (
        <div key={i} className="pref-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--on-dark)' }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>{item.sub}</div>
          </div>
          <div
            className={`toggle-ref${prefs[i] ? ' toggle-ref--on' : ''}`}
            onClick={() => setPrefs(p => p.map((v, j) => j === i ? !v : v))}
          />
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line no-unused-vars
function PlaceholderTab({ icon: Icon, title }) {
  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <div className="empty-state" style={{ padding: 48 }}>
        <Icon size={32} />
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Coming soon</div>
      </div>
    </div>
  )
}

const TABS = ['About', 'Business', 'Preferences', 'Payments', 'Security']

export default function Profile() {
  const qc = useQueryClient()
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['buyerProfile'],
    queryFn: getProfile,
    staleTime: 5 * 60_000,
  })

  const [tab, setTab]     = useState('About')
  const [editing, setEditing] = useState(false)
  const [form, setForm]   = useState(null)

  const saveMut = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyerProfile'] }); setEditing(false); setForm(null) },
  })

  const initials = (profile?.fullName ?? 'B').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const joinDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' }) : '—'
  const tierLabel = TIER_LABEL(profile?.totalOrders ?? 0)
  const handle = (profile?.email ?? 'buyer').split('@')[0]

  if (isLoading) {
    return (
      <div className="page-wrap">
        <PageHead eyebrow="Account · profile" title="My" lime="profile" />
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted-2)', fontSize: 12 }}>Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrap">
        <PageHead eyebrow="Account · profile" title="My" lime="profile" />
        <div className="empty-state">
          <I.User size={32} />
          <div style={{ color: 'var(--danger)' }}>Failed to load profile</div>
          <button className="btn btn--primary btn--sm" onClick={refetch}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <PageHead
        eyebrow="Account · profile"
        title="My"
        lime="profile"
        tools={
          <button className="btn btn--ghost btn--sm" onClick={() => setEditing(e => !e)}>
            <I.Edit size={12} /> {editing ? 'Cancel edit' : 'Edit profile'}
          </button>
        }
      />

      <div className="card profile-hero" style={{ marginTop: 24 }}>
        <div className="profile-hero__avatar" style={{ background: 'linear-gradient(135deg,#5eead4,#14b8a6)' }}>
          {initials}
        </div>
        <div className="profile-hero__main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--on-dark)' }}>{profile?.fullName ?? '—'}</h2>
            <span className="tier-tag">{tierLabel}</span>
            <span className="kbd-mono">@{handle}</span>
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            {profile?.businessName ? `${profile.businessName} · ` : ''}Joined {joinDate} · {profile?.totalOrders ?? 0} orders all time
          </div>
          <div className="profile-hero__stats">
            <div>
              <div className="advisory-stat__label">All-time spend</div>
              <div className="vendor-card__stat-val mono">₱{((profile?.totalSpent ?? 0) / 1000).toFixed(1)}k</div>
            </div>
            <div>
              <div className="advisory-stat__label">Avg rating given</div>
              <div className="vendor-card__stat-val">
                <I.Star size={11} style={{ color: 'var(--warning)' }} /> —
              </div>
            </div>
            <div>
              <div className="advisory-stat__label">Saved vendors</div>
              <div className="vendor-card__stat-val mono">—</div>
            </div>
            <div>
              <div className="advisory-stat__label">Streak</div>
              <div className="vendor-card__stat-val mono" style={{ color: 'var(--accent-lime)' }}>—</div>
            </div>
          </div>
        </div>
      </div>

      <div className="orders-card__tabs" style={{ marginTop: 24 }}>
        {TABS.map(t => (
          <button key={t} className={`orders-tab${tab === t ? ' orders-tab--on' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'About' && (
          <AboutTab
            profile={profile}
            editing={editing}
            setEditing={setEditing}
            form={form ?? profile}
            setForm={setForm}
            onSave={() => saveMut.mutate()}
            isSaving={saveMut.isPending}
            saveError={saveMut.isError ? (saveMut.error?.message ?? 'Failed to save') : null}
          />
        )}
        {tab === 'Business'     && <BusinessTab profile={profile} />}
        {tab === 'Preferences'  && <PrefsTab />}
        {tab === 'Payments'     && <PlaceholderTab icon={I.Clipboard} title="Payment methods" />}
        {tab === 'Security'     && <PlaceholderTab icon={I.Settings} title="Security settings" />}
      </div>
    </div>
  )
}
