import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import { apiGet, apiPost, apiPut } from './api'
import { I } from './icons'
import StartTripModal from './components/StartTripModal'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const AnchorIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/>
    <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
  </svg>
)

const FishIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/>
    <path d="M18 12h.01"/><path d="M6.5 12C4 12 2.5 13.5 2 16c1-1 2.5-1.5 4.5-1.5"/>
  </svg>
)

const ShieldIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const CheckIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', display: 'block' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const VesselIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1"/>
    <path d="M4 18V6l4-2 4 2 4-2 4 2v12"/>
  </svg>
)

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(startedAt) {
  const ms = Math.max(0, Date.now() - new Date(startedAt).getTime())
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function statusClass(status) {
  if (status === 'ACTIVE')     return 'active'
  if (status === 'COMPLETED')  return 'completed'
  if (status === 'PLANNED')    return 'planned'
  return 'cancelled'
}

function statusLabel(status) {
  if (status === 'ACTIVE')    return 'Active'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'PLANNED')   return 'Planned'
  return 'Cancelled'
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ height = '120px', radius = '14px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

// ── TripTabs ──────────────────────────────────────────────────────────────────

function TripTabs({ active, onChange, hasActiveTrip, pastCount, plannedCount }) {
  const tabs = [
    { id: 'active',  label: 'Active',  count: hasActiveTrip ? 1 : null },
    { id: 'planned', label: 'Planned', count: plannedCount },
    { id: 'past',    label: 'Past',    count: pastCount },
  ]
  return (
    <div className="row" style={{ gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
      {tabs.map(t => (
        <button key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: active === t.id ? 'var(--ink)' : 'var(--ink-4)',
            borderBottom: active === t.id ? '2px solid var(--ink)' : '2px solid transparent',
            marginBottom: -1,
          }}>
          {t.label}
          {t.count != null && (
            <span style={{
              marginLeft: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: active === t.id ? 'var(--ink-3)' : 'var(--ink-4)',
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── CHECKLIST_FIELDS ──────────────────────────────────────────────────────────

const CHECKLIST_FIELDS = [
  { key: 'fuelChecked',         label: 'Fuel' },
  { key: 'engineChecked',       label: 'Engine' },
  { key: 'radioChecked',        label: 'Radio' },
  { key: 'lifeVestChecked',     label: 'Life Vest' },
  { key: 'weatherReviewed',     label: 'Weather' },
  { key: 'emergencyKitChecked', label: 'Emergency Kit' },
]

// ── SafetyChecklistSection ────────────────────────────────────────────────────

function SafetyChecklistSection({ trip, token, onSaved }) {
  const [dirty, setDirty]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [values, setValues]       = useState({
    fuelChecked:         trip.checklist?.fuelChecked         ?? false,
    engineChecked:       trip.checklist?.engineChecked       ?? false,
    radioChecked:        trip.checklist?.radioChecked        ?? false,
    lifeVestChecked:     trip.checklist?.lifeVestChecked     ?? false,
    weatherReviewed:     trip.checklist?.weatherReviewed     ?? false,
    emergencyKitChecked: trip.checklist?.emergencyKitChecked ?? false,
  })

  function toggle(key) {
    setValues(v => ({ ...v, [key]: !v[key] }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await apiPut(`/trips/${trip.id}/checklist`, token, values)
      setDirty(false)
      onSaved(updated)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const checkedCount = Object.values(values).filter(Boolean).length
  const allDone = checkedCount === 6
  const barPct = (checkedCount / 6) * 100

  const pct = Math.round((checkedCount / 6) * 100)

  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Pre-departure checklist</div>
          <div className="card__sub">{checkedCount}/6 complete</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 99,
          background: `conic-gradient(var(--accent) ${(checkedCount / 6) * 360}deg, var(--line-soft) 0)`,
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 99, background: 'var(--surface)',
            display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600,
            color: 'var(--ink-2)', fontFamily: 'var(--font-mono)',
          }}>
            {pct}%
          </div>
        </div>
      </div>
      <div className="check-list">
        {CHECKLIST_FIELDS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`check-item${values[key] ? ' check-item--on' : ''}`}
            onClick={() => toggle(key)}
            style={{ cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: 0 }}
          >
            <div className="check-item__box">
              {values[key] && <CheckIcon size={10} />}
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {saveError && <p className="trip-err" style={{ marginTop: 10 }}>{saveError}</p>}
      {dirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn--accent btn--sm" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save Checklist'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── AddCatchForm ──────────────────────────────────────────────────────────────

function AddCatchForm({ tripId, token, species, onAdded, onCancel }) {
  const [search, setSearch]             = useState('')
  const [selectedSpecies, setSelected]  = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [estimate, setEstimate]         = useState('')
  const [kg, setKg]                     = useState('')
  const [price, setPrice]               = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)

  const filtered = species.filter(s =>
    s.commonName.toLowerCase().includes(search.toLowerCase())
  )

  function selectSpecies(s) {
    setSelected(s)
    setSearch(s.commonName)
    setShowDropdown(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!selectedSpecies) { setError('Please select a species'); return }
    if (!estimate.trim()) { setError('Please provide a quantity estimate (e.g. 2 baskets)'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiPost(`/trips/${tripId}/catches`, token, {
        speciesId:           selectedSpecies.id,
        quantityEstimate:    estimate.trim(),
        quantityKg:          kg ? Number(kg) : undefined,
        estimatedPricePerKg: price ? Number(price) : null,
        notes:               notes.trim() || null,
      })
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="catch-form" onSubmit={submit}>
      {error && <p className="trip-err">{error}</p>}
      <div className="species-search-wrap">
        <input
          className="trip-form__input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="Search species…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {showDropdown && filtered.length > 0 && (
          <div className="species-dropdown">
            {filtered.slice(0, 20).map(s => (
              <div key={s.id} className="species-option" onMouseDown={() => selectSpecies(s)}>
                {s.commonName}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="catch-form__row">
        <label className="trip-form__label">
          Estimate (e.g. 2 baskets) *
          <input
            className="trip-form__input"
            type="text"
            placeholder="Weight or volume estimate"
            value={estimate}
            onChange={e => setEstimate(e.target.value)}
            required
          />
        </label>
        <label className="trip-form__label">
          Weight (kg) <span style={{ opacity: 0.5, fontSize: '11px' }}>optional</span>
          <input
            className="trip-form__input"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.01"
            placeholder="e.g. 12.5"
            value={kg}
            onChange={e => setKg(e.target.value)}
          />
        </label>
      </div>
      <label className="trip-form__label">
        Price / kg <span style={{ opacity: 0.5, fontSize: '11px' }}>optional</span>
        <input
          className="trip-form__input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="₱ per kg"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
      </label>
      <input
        className="trip-form__input"
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="trip-form__actions">
        <button type="button" className="trip-btn trip-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Catch'}
        </button>
      </div>
    </form>
  )
}

// ── SettleCatchModal ──────────────────────────────────────────────────────────

function SettleCatchModal({ tripId, catchLog, token, onSettled, onCancel }) {
  const [kg, setKg]           = useState('')
  const [price, setPrice]     = useState('')
  const [buyer, setBuyer]     = useState('')
  const [submitting, setSub]  = useState(false)
  const [error, setError]     = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!kg || Number(kg) < 0.1) { setError('Weight must be at least 0.1'); return }
    if (!price || Number(price) < 0) { setError('Invalid price'); return }
    setSub(true)
    setError(null)
    try {
      await apiPut(`/trips/${tripId}/catches/${catchLog.id}/settle`, token, {
        settledKg:          Number(kg),
        settledPricePerKg:  Number(price),
        buyerName:          buyer.trim() || null,
      })
      onSettled()
    } catch (err) {
      setError(err.message)
    } finally {
      setSub(false)
    }
  }

  const total = kg && price ? (Number(kg) * Number(price)).toLocaleString('en-PH') : null

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Settle Catch</h3>
          <button className="modal__close" onClick={onCancel}><XIcon /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{catchLog.species?.commonName ?? catchLog.species}</div>
            <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
              Estimated: {catchLog.quantityEstimate || `${catchLog.quantityKg} kg`}
            </div>
          </div>
          {error && <p className="trip-err">{error}</p>}
          <div className="trip-form__group">
            <label className="trip-form__label">Actual weight (kg) *</label>
            <input className="trip-form__input" type="number" inputMode="decimal" min="0.1" step="0.01" value={kg} onChange={e => setKg(e.target.value)} required />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Agreed price / kg *</label>
            <input className="trip-form__input" type="number" inputMode="decimal" min="0" step="0.01" placeholder="₱" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
          {total && (
            <div style={{ background: 'var(--safe-dim)', border: '1px solid var(--safe-border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: 13, color: 'var(--safe)', fontWeight: 700 }}>
              Total: ₱{total}
            </div>
          )}
          <div className="trip-form__group">
            <label className="trip-form__label">Sold to (vendor name)</label>
            <input className="trip-form__input" type="text" placeholder="e.g. Aling Nena" value={buyer} onChange={e => setBuyer(e.target.value)} />
          </div>
          <div className="trip-form__actions" style={{ marginTop: 4 }}>
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onCancel} disabled={submitting}>Cancel</button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CatchLogsSection ──────────────────────────────────────────────────────────

function CatchLogsSection({ trip, token, species, catches, loading, error, onAdded, onRetry, formTrigger = 0 }) {
  const [showForm, setShowForm]     = useState(false)
  const [settleCatch, setSettle]    = useState(null)

  useEffect(() => { if (formTrigger > 0) setShowForm(true) }, [formTrigger])

  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Catch log</div>
          <div className="card__sub">{catches.length} entries</div>
        </div>
        <button className="btn btn--sm" onClick={() => setShowForm(true)}><FishIcon size={12} /> Add entry</button>
      </div>

      {loading && <Skeleton height="60px" />}
      {error && (
        <div className="trip-err" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {error}
          <button className="btn btn--sm" onClick={onRetry}>Retry</button>
        </div>
      )}
      {!loading && !error && catches.length === 0 && !showForm && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', padding: '8px 0' }}>No catches logged yet.</p>
      )}
      {!loading && catches.length > 0 && (
        <div className="catch-log">
          {[...catches].reverse().map(c => (
            <div key={c.id} className="catch-entry">
              <div className="catch-entry__dot" />
              <div>
                <div className="catch-entry__species">{c.species?.commonName ?? c.species}</div>
                <div className="catch-entry__meta">
                  {c.quantityEstimate ?? ''}
                  {c.notes ? ` · ${c.notes}` : ''}
                </div>
              </div>
              {c.quantityKg != null && (
                <div className="catch-entry__qty">{c.quantityKg}<small style={{ color: 'var(--ink-4)' }}>kg</small></div>
              )}
              {c.isSettled ? (
                <div className="catch-entry__price">₱{c.settledPricePerKg}<small>/kg</small></div>
              ) : trip.status === 'COMPLETED' ? (
                <button className="btn btn--sm btn--ghost" onClick={() => setSettle(c)}>Settle</button>
              ) : (
                c.estimatedPricePerKg != null && (
                  <div className="catch-entry__price">₱{c.estimatedPricePerKg}<small>/kg</small></div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: 12 }}>
          <AddCatchForm
            tripId={trip.id}
            token={token}
            species={species}
            onAdded={() => { setShowForm(false); onAdded() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {settleCatch && (
        <SettleCatchModal
          tripId={trip.id}
          catchLog={settleCatch}
          token={token}
          onSettled={() => { setSettle(null); onAdded() }}
          onCancel={() => setSettle(null)}
        />
      )}
    </div>
  )
}

// ── EndTripButton ─────────────────────────────────────────────────────────────

function EndTripButton({ tripId, token, onEnded }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [notes, setNotes]             = useState('')
  const [ending, setEnding]           = useState(false)
  const [error, setError]             = useState(null)

  async function confirmEnd() {
    setEnding(true)
    setError(null)
    try {
      await apiPost(`/trips/${tripId}/end`, token, { notes: notes.trim() || null })
      onEnded()
    } catch (err) {
      setError(err.message)
      setEnding(false)
    }
  }

  return (
    <>
      <button className="trip-end-btn" onClick={() => setShowConfirm(true)}>
        <AlertTriangleIcon /> End Trip
      </button>
      {showConfirm && (
        <div className="confirm-overlay" onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="confirm-box">
            <p className="confirm-box__title">End this trip?</p>
            <p className="confirm-box__msg">
              This will mark the trip as completed. You won't be able to add more catches after ending.
            </p>
            {error && <p className="trip-err">{error}</p>}
            <label className="trip-form__label">
              Notes (optional)
              <textarea
                className="trip-form__textarea"
                placeholder="Any final notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={500}
              />
            </label>
            <div className="trip-form__actions">
              <button className="trip-btn trip-btn--ghost" onClick={() => { setShowConfirm(false); setError(null) }} disabled={ending}>
                Cancel
              </button>
              <button className="trip-btn trip-btn--danger" onClick={confirmEnd} disabled={ending}>
                {ending ? 'Ending…' : 'Confirm End Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── ZoneConditionsCard ────────────────────────────────────────────────────────

function ZoneConditionsCard({ zones, targetArea }) {
  if (!zones?.length || !targetArea) return null
  const match = zones.find(z =>
    z.zoneName?.toLowerCase().includes(targetArea.toLowerCase()) ||
    targetArea.toLowerCase().includes(z.zoneName?.toLowerCase() ?? '')
  ) ?? zones[0]

  const r = match.risk?.level ?? 'SAFE'
  const rCls = r === 'SAFE' ? 'safe' : r === 'CAUTION' ? 'caution' : 'unsafe'

  return (
    <div className="card">
      <div className="card__head" style={{ marginBottom: 12 }}>
        <div>
          <div className="card__title">Right now at zone</div>
          <div className="card__sub">{match.zoneName} · {match.region}</div>
        </div>
        <span className={`chip chip--${rCls} chip--dot`}>{r}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Wave', value: match.marine?.waveHeightM != null ? match.marine.waveHeightM.toFixed(1) : '—', unit: 'm' },
          { label: 'Wind', value: match.weather?.windSpeedKmh != null ? Math.round(match.weather.windSpeedKmh) : '—', unit: 'km/h' },
          { label: 'Air',  value: match.weather?.temperatureC != null ? Math.round(match.weather.temperatureC) : '—', unit: '°C' },
          { label: 'Rain', value: match.weather?.precipitationMm != null ? match.weather.precipitationMm.toFixed(1) : '—', unit: 'mm' },
        ].map(item => (
          <div key={item.label} className="tile">
            <div className="tile__label">{item.label}</div>
            <div className="tile__value">{item.value}<small>{item.unit}</small></div>
          </div>
        ))}
      </div>
      {match.risk?.advisory && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.5 }}>
          {match.risk.advisory}
        </p>
      )}
    </div>
  )
}

// ── ActiveTripView ────────────────────────────────────────────────────────────

function TripHeroCard({ trip, catches, onEndTrip }) {
  const [duration, setDuration] = useState(fmtDuration(trip.startedAt))

  useEffect(() => {
    const id = setInterval(() => setDuration(fmtDuration(trip.startedAt)), 1000)
    return () => clearInterval(id)
  }, [trip.startedAt])

  const totalKg = catches.reduce((a, c) => a + (c.quantityKg ?? 0), 0)
  const totalRevenue = catches.reduce((a, c) => a + (c.quantityKg ?? 0) * (c.estimatedPricePerKg ?? 0), 0)

  return (
    <div className="active-trip">
      <div className="active-trip__head">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <span className="chip chip--safe chip--dot">ACTIVE</span>
          </div>
          <h2 className="active-trip__title" style={{ marginTop: 8 }}>
            {trip.departurePoint} → {trip.targetArea}
          </h2>
          <div className="active-trip__meta">
            {trip.vesselName && <span><VesselIcon /> {trip.vesselName}</span>}
            <span><ClockIcon /> Departed {fmtDate(trip.startedAt)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="active-trip__timer">
            {duration}
            <small>elapsed</small>
          </div>
        </div>
      </div>

      <div className="active-trip__grid">
        <div className="tile">
          <div className="tile__label">Catches</div>
          <div className="tile__value">{catches.length}</div>
        </div>
        <div className="tile">
          <div className="tile__label">Total catch</div>
          <div className="tile__value">{totalKg > 0 ? totalKg.toFixed(1) : '—'}<small>kg</small></div>
        </div>
        <div className="tile">
          <div className="tile__label">Est. value</div>
          <div className="tile__value">{totalRevenue > 0 ? `₱${Math.round(totalRevenue).toLocaleString()}` : '—'}</div>
        </div>
        {trip.notes && (
          <div className="tile">
            <div className="tile__label">Notes</div>
            <div className="tile__value" style={{ fontSize: 12 }}>{trip.notes}</div>
          </div>
        )}
      </div>

    </div>
  )
}

function ActiveTripView({ trip, token, species, catches, catchesLoading, catchesError,
  onTripStarted, onTripEnded, onChecklistSaved, onCatchAdded, onCatchesRetry,
  setPage, zones, pastTrips, plannedTrips }) {
  const [showModal, setShowModal]     = useState(false)
  const [formTrigger, setFormTrigger] = useState(0)

  if (!trip) return (
    <>
      <div className="trips-empty-hero">
        <div className="trips-empty-hero__icon"><AnchorIcon /></div>
        <p className="trips-empty-hero__title">No Active Trip</p>
        <p className="trips-empty-hero__sub">Ready to set sail? Start a new trip below.</p>
        <button className="trip-btn trip-btn--primary" style={{ fontSize: '14px', padding: '10px 28px' }} onClick={() => setShowModal(true)}>
          Start New Trip
        </button>
      </div>
      {showModal && (
        <StartTripModal
          token={token}
          onCreated={() => { setShowModal(false); onTripStarted() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )

  return (
    <div className="trips-grid">
      {/* LEFT column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <TripHeroCard trip={trip} catches={catches} />

        {/* Action row */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--accent" onClick={() => setFormTrigger(t => t + 1)}>
            <FishIcon size={12} /> Log catch
          </button>
          {setPage && (
            <button className="btn" onClick={() => setPage('catch-alerts')}>
              <I.Bell size={12} /> Post catch alert
            </button>
          )}
          <button className="btn" disabled title="Coming soon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Share location
          </button>
          <div style={{ flex: 1 }} />
          <EndTripButton tripId={trip.id} token={token} onEnded={onTripEnded} />
        </div>

        <CatchLogsSection
          trip={trip}
          token={token}
          species={species}
          catches={catches}
          loading={catchesLoading}
          error={catchesError}
          onAdded={onCatchAdded}
          onRetry={onCatchesRetry}
          formTrigger={formTrigger}
        />
      </div>

      {/* RIGHT column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <SafetyChecklistSection trip={trip} token={token} onSaved={onChecklistSaved} />
        <ZoneConditionsCard zones={zones} targetArea={trip.targetArea} />
        <TripsPanel
          activeTrip={trip}
          pastTrips={pastTrips}
          plannedTrips={plannedTrips}
          catches={catches}
        />
      </div>
    </div>
  )
}

// ── TripHistoryCard ───────────────────────────────────────────────────────────

function TripHistoryCard({ trip, token }) {
  const [open, setOpen]           = useState(false)
  const [catches, setCatches]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [fetched, setFetched]     = useState(false)
  const [settleCatch, setSettle]  = useState(null)

  async function fetchCatches() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/trips/${trip.id}/catches`, token)
      setCatches(data)
      setFetched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function expand() {
    const next = !open
    setOpen(next)
    if (next && !fetched) fetchCatches()
  }

  const cl = trip.checklist

  const startDate = trip.startedAt ? new Date(trip.startedAt) : null
  const month = startDate ? startDate.toLocaleDateString('en', { month: 'short' }).toUpperCase() : '—'
  const day = startDate ? startDate.getDate() : '—'

  return (
    <>
      <div className="trip-card" onClick={expand} style={{ cursor: 'pointer' }}>
        <div className="trip-card__date">
          <div className="trip-card__month">{month}</div>
          <div className="trip-card__day">{day}</div>
        </div>
        <div>
          <div className="trip-card__name">{trip.departurePoint} → {trip.targetArea}</div>
          <div className="trip-card__sub">{trip.vesselName ? `${trip.vesselName} · ` : ''}{trip.crew || ''}</div>
        </div>
        {trip.endedAt && trip.startedAt && (
          <div className="trip-card__stat">
            <div className="v">{((new Date(trip.endedAt) - new Date(trip.startedAt)) / 3_600_000).toFixed(1)}h</div>
            <div className="l">Duration</div>
          </div>
        )}
        <span className={`chip chip--${trip.status === 'CANCELLED' ? 'unsafe' : trip.status === 'ACTIVE' ? 'safe' : 'ink'} chip--dot`}>
          {trip.status}
        </span>
        <ChevronIcon open={open} />
      </div>

      {open && (
        <div style={{ padding: '14px 18px', background: 'var(--paper)', borderRadius: '0 0 12px 12px', marginTop: -8, border: '1px solid var(--line)', borderTop: 'none', marginBottom: 4 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checklist</div>
            {cl ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CHECKLIST_FIELDS.map(({ key, label }) => (
                  <span key={key} className={`chip ${cl[key] ? 'chip--safe' : ''}`} style={{ fontSize: 11 }}>
                    {cl[key] ? <CheckIcon size={9} /> : null} {label}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>No checklist recorded.</p>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Catch logs</div>
            {loading && <Skeleton height="40px" />}
            {error && <div className="trip-err">{error} <button className="btn btn--sm" onClick={fetchCatches}>Retry</button></div>}
            {!loading && !error && catches.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>No catches logged.</p>
            )}
            {!loading && catches.length > 0 && (
              <div className="catch-log">
                {catches.map(c => (
                  <div key={c.id} className="catch-entry">
                    <div className="catch-entry__dot" />
                    <div>
                      <div className="catch-entry__species">{c.species?.commonName ?? c.species}</div>
                      <div className="catch-entry__meta">{c.quantityEstimate ?? ''}</div>
                    </div>
                    {c.quantityKg != null && (
                      <div className="catch-entry__qty">{c.quantityKg}<small style={{ color: 'var(--ink-4)' }}>kg</small></div>
                    )}
                    {c.isSettled ? (
                      <div className="catch-entry__price">₱{c.settledPricePerKg}<small>/kg</small></div>
                    ) : trip.status === 'COMPLETED' ? (
                      <button className="btn btn--sm btn--ghost" onClick={e => { e.stopPropagation(); setSettle(c) }}>Settle</button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {settleCatch && (
            <SettleCatchModal
              tripId={trip.id}
              catchLog={settleCatch}
              token={token}
              onSettled={() => { setSettle(null); fetchCatches() }}
              onCancel={() => setSettle(null)}
            />
          )}
        </div>
      )}
    </>
  )
}

// ── TripHistoryList ───────────────────────────────────────────────────────────

function TripHistoryList({ trips, token, view }) {
  const completed = trips.filter(t => t.status === 'COMPLETED').length
  const cancelled = trips.filter(t => t.status === 'CANCELLED').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="history-stats">
        {view === 'past' ? (
          <>
            <div className="history-stat">
              <p className="history-stat__val">{trips.length}</p>
              <p className="history-stat__label">Total</p>
            </div>
            <div className="history-stat history-stat--completed">
              <p className="history-stat__val">{completed}</p>
              <p className="history-stat__label">Completed</p>
            </div>
            <div className="history-stat">
              <p className="history-stat__val" style={{ color: cancelled > 0 ? 'var(--unsafe)' : 'var(--text-1)' }}>{cancelled}</p>
              <p className="history-stat__label">Cancelled</p>
            </div>
          </>
        ) : (
          <div className="history-stat history-stat--planned">
            <p className="history-stat__val">{trips.length}</p>
            <p className="history-stat__label">Planned</p>
          </div>
        )}
      </div>

      {trips.length === 0 ? (
        <div className="trips-empty-history">
          <p>{view === 'planned' ? 'No planned trips. Use the Trip Planner to schedule one.' : 'No past trips yet.'}</p>
        </div>
      ) : (
        <div className="history-list">
          {trips.map(t => <TripHistoryCard key={t.id} trip={t} token={token} />)}
        </div>
      )}
    </div>
  )
}

// ── MyTrips root ──────────────────────────────────────────────────────────────

// ── Trips Right Panel ─────────────────────────────────────────────────────────

function TripsPanel({ activeTrip, pastTrips, plannedTrips, catches }) {
  const completed = pastTrips.filter(t => t.status === 'COMPLETED').length
  const cancelled  = pastTrips.filter(t => t.status === 'CANCELLED').length

  return (
    <aside className="trips-panel">
      {activeTrip && (
        <div className="trips-panel-card trips-panel-card--live">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--safe)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--safe)', animation: 'live-pulse 2s infinite', display: 'inline-block' }} />
            Trip Active
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', lineHeight: 1.4 }}>
            {activeTrip.departurePoint}
            <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>→</span>
            {activeTrip.targetArea}
          </div>
          {activeTrip.vesselName && (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{activeTrip.vesselName}</div>
          )}
          {catches.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--safe)' }}>
              {catches.length} catch log{catches.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      <div className="trips-panel-card">
        <div className="trips-panel-card__title">Trip Stats</div>
        <div className="trips-panel-stat">
          <span>Completed</span>
          <span className="trips-panel-stat__val" style={{ color: 'var(--safe)' }}>{completed}</span>
        </div>
        <div className="trips-panel-stat">
          <span>Planned</span>
          <span className="trips-panel-stat__val" style={{ color: 'var(--accent)' }}>{plannedTrips.length}</span>
        </div>
        <div className="trips-panel-stat">
          <span>Cancelled</span>
          <span className="trips-panel-stat__val" style={{ color: 'var(--text-3)' }}>{cancelled}</span>
        </div>
        <div className="trips-panel-stat">
          <span>Total past</span>
          <span className="trips-panel-stat__val">{pastTrips.length}</span>
        </div>
      </div>

      <div className="trips-panel-card">
        <div className="trips-panel-card__title">Pro Tip</div>
        <p className="trips-panel-tip">
          Log catch weights during your trip so vendors see accurate quantities when you send catch alerts.
        </p>
      </div>
    </aside>
  )
}

export default function MyTrips({ token, setPage, zones = [] }) {
  const [activeTab, setActiveTab]           = useState('active')
  const [activeTrip, setActiveTrip]         = useState(null)
  const [pastTrips, setPastTrips]           = useState([])
  const [plannedTrips, setPlannedTrips]     = useState([])
  const [catches, setCatches]               = useState([])
  const [fishSpecies, setFishSpecies]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [catchesLoading, setCatchesLoading] = useState(false)
  const [catchesError, setCatchesError]     = useState(null)

  const loadCatches = useCallback(async (tripId) => {
    setCatchesLoading(true)
    setCatchesError(null)
    try {
      const data = await apiGet(`/trips/${tripId}/catches`, token)
      setCatches(data)
    } catch (err) {
      setCatchesError(err.message)
    } finally {
      setCatchesLoading(false)
    }
  }, [token])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [activeList, completed, cancelled, planned, species] = await Promise.all([
        apiGet('/trips?status=ACTIVE', token),
        apiGet('/trips?status=COMPLETED', token),
        apiGet('/trips?status=CANCELLED', token),
        apiGet('/trips?status=PLANNED', token),
        apiGet('/lookups/fish-species', token),
      ])
      const trip = activeList[0] ?? null
      setActiveTrip(trip)
      setPastTrips(
        [...completed, ...cancelled].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      )
      setPlannedTrips([...planned].sort((a, b) => b.id - a.id))
      setFishSpecies(species)
      if (trip) loadCatches(trip.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, loadCatches])

  useEffect(() => { load() }, [load])

  function handleChecklistSaved(updatedChecklist) {
    setActiveTrip(t => ({ ...t, checklist: updatedChecklist }))
  }

  function handleCatchAdded() {
    if (activeTrip) loadCatches(activeTrip.id)
  }

  if (loading) return (
    <div className="page">
      <Skeleton height="40px" radius="12px" />
      <Skeleton height="180px" />
      <Skeleton height="120px" />
    </div>
  )

  if (error) return (
    <div className="page">
      <div className="trip-err" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {error}
        <button className="btn btn--sm" onClick={load}>Retry</button>
      </div>
    </div>
  )

  const totalPast = pastTrips.length
  const lifetimeRevenue = pastTrips.reduce((sum, t) => sum + (t.totalRevenue ?? 0), 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Trips</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            <em>My</em> Trips
          </h1>
          <p className="page__sub">
            {totalPast} total logged{lifetimeRevenue > 0 ? ` · ₱${lifetimeRevenue.toLocaleString()} lifetime revenue` : ''}
          </p>
        </div>
        <div className="page__actions">
          <button className="btn" disabled title="Coming soon">
            <I.Receipt size={14} /> Export log
          </button>
          <button className="btn btn--primary" onClick={() => setActiveTab('active')}>
            <I.Plus size={14} /> Start trip
          </button>
        </div>
      </div>

      <TripTabs
        active={activeTab}
        onChange={setActiveTab}
        hasActiveTrip={!!activeTrip}
        pastCount={pastTrips.length}
        plannedCount={plannedTrips.length}
      />

      {activeTab === 'active' ? (
        <ActiveTripView
          trip={activeTrip}
          token={token}
          species={fishSpecies}
          catches={catches}
          catchesLoading={catchesLoading}
          catchesError={catchesError}
          onTripStarted={load}
          onTripEnded={load}
          onChecklistSaved={handleChecklistSaved}
          onCatchAdded={handleCatchAdded}
          onCatchesRetry={() => activeTrip && loadCatches(activeTrip.id)}
          setPage={setPage}
          zones={zones}
          pastTrips={pastTrips}
          plannedTrips={plannedTrips}
        />
      ) : activeTab === 'planned' ? (
        <TripHistoryList trips={plannedTrips} token={token} view="planned" />
      ) : (
        <TripHistoryList trips={pastTrips} token={token} view="past" />
      )}
    </div>
  )
}
