import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut } from './api'
import './catch-alerts.css'

// ── Icons ──────────────────────────────────────────────────────────────────────

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const FishIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/>
    <path d="M18 12h.01"/><path d="M6.5 12C4 12 2.5 13.5 2 16c1-1 2.5-1.5 4.5-1.5"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const CheckIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
)
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)
const MapPinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const AlertEmptyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTimeLeft(expiresAt) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function isUrgent(expiresAt) {
  if (!expiresAt) return false
  const diff = new Date(expiresAt) - Date.now()
  return diff > 0 && diff < 3_600_000
}

function isExpired(expiresAt) {
  if (!expiresAt) return false
  return new Date(expiresAt) - Date.now() <= 0
}

function StatusChip({ status }) {
  const map = {
    ACTIVE:    'ca-chip--active',
    MATCHED:   'ca-chip--matched',
    EXPIRED:   'ca-chip--expired',
    CANCELLED: 'ca-chip--cancelled',
  }
  return (
    <span className={`ca-chip ${map[status] ?? 'ca-chip--expired'}`}>
      {status === 'ACTIVE' && <CheckIcon size={11} />}
      {status}
    </span>
  )
}

// ── Order Create Modal ─────────────────────────────────────────────────────────

function OrderCreateModal({ alert, token, onSuccess, onClose }) {
  const [agreedPrice, setAgreedPrice] = useState(alert.askingPricePerKg ?? '')
  const [estimate,    setEstimate]    = useState(alert.quantityEstimate ?? '')
  const [kg,          setKg]          = useState(alert.quantityKg ?? '')
  const [dispatchMode, setDispatch]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!agreedPrice) return setError('Agreed price is required.')
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        speciesId: alert.species?.id,
        catchAlertId: alert.id,
        agreedPricePerKg: Number(agreedPrice),
      }
      if (estimate)     body.orderedQtyEstimate = estimate
      if (kg)           body.orderedQtyKg       = Number(kg)
      if (dispatchMode) body.dispatchMode        = dispatchMode
      if (notes)        body.notes               = notes
      await apiPost('/orders', token, body)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const speciesName = alert.species?.commonName ?? '—'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Make Offer</h3>
          <button className="modal__close" onClick={onClose}><XIcon /></button>
        </div>
        <form onSubmit={submit} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="trip-err">{error}</div>}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-1)' }}>Species:</strong> {speciesName}</div>
            <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-1)' }}>Fisherman:</strong> {alert.fisherman?.fullName ?? '—'}</div>
            {alert.landingSite && <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-1)' }}>Landing site:</strong> {alert.landingSite}</div>}
            {alert.askingPricePerKg && <div><strong style={{ color: 'var(--text-1)' }}>Asking price:</strong> ₱{alert.askingPricePerKg}/kg</div>}
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Agreed Price (₱/kg) *</label>
            <input className="trip-form__input" type="number" min="0" step="0.01" required inputMode="decimal"
              value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Quantity Estimate</label>
            <input className="trip-form__input" placeholder="e.g. 2 baskets"
              value={estimate} onChange={e => setEstimate(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Weight (kg)</label>
            <input className="trip-form__input" type="number" min="0" step="0.1" placeholder="Optional" inputMode="decimal"
              value={kg} onChange={e => setKg(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Dispatch Mode</label>
            <select className="trip-form__select" value={dispatchMode} onChange={e => setDispatch(e.target.value)}>
              <option value="">Not specified</option>
              <option value="PICKUP">Pickup</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Notes</label>
            <textarea className="trip-form__input" rows={2} placeholder="Optional"
              value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Active Trip Section (fisherman) ───────────────────────────────────────────

function ActiveTripSection({ token, existingAlerts, onAlertsChanged }) {
  const [trip,     setTrip]    = useState(null)
  const [catches,  setCatches] = useState([])
  const [loading,  setLoading] = useState(true)
  const [alerting, setAlerting] = useState(false)
  const [sent,     setSent]    = useState(false)

  const alertedCatchIds = new Set(
    existingAlerts.filter(a => a.catchLogId != null).map(a => a.catchLogId)
  )

  useEffect(() => {
    setSent(false)
    async function load() {
      setLoading(true)
      try {
        const trips = await apiGet('/trips?status=ACTIVE', token)
        const active = trips[0]
        if (!active) { setTrip(null); setLoading(false); return }
        setTrip(active)
        const logs = await apiGet(`/trips/${active.id}/catches`, token)
        setCatches(logs)
      } catch {
        // no active trip — silently skip
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, existingAlerts])

  async function alertAll() {
    const unalerted = catches.filter(c => !alertedCatchIds.has(c.id))
    if (unalerted.length === 0) return
    setAlerting(true)
    try {
      await Promise.all(unalerted.map(c =>
        apiPost('/fisherman/catch-alerts', token, {
          speciesId: c.species?.id,
          catchLogId: c.id,
          quantityEstimate: c.quantityEstimate ?? undefined,
          quantityKg: c.quantityKg ?? undefined,
          expiresInHours: 4,
        })
      ))
      setSent(true)
      onAlertsChanged()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setAlerting(false)
    }
  }

  if (loading) return (
    <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>Checking active trip…</div>
  )
  if (!trip) return null

  const unalerted = catches.filter(c => !alertedCatchIds.has(c.id))
  const allAlerted = unalerted.length === 0 && catches.length > 0
  const isSent = allAlerted || sent

  return (
    <div className={`ca-trip-banner${isSent ? ' ca-trip-banner--sent' : ''}`}>
      <div className="ca-trip-banner__top">
        <div>
          <div className="ca-trip-banner__heading">
            {isSent ? 'Vendors have been notified' : 'Notify vendors about your catch'}
          </div>
          <div className="ca-trip-banner__sub">
            {catches.length === 0
              ? 'No catches logged yet — add catches in My Trips first.'
              : isSent
                ? `All ${catches.length} catch${catches.length > 1 ? 'es' : ''} are visible to vendors.`
                : `${catches.length} catch${catches.length > 1 ? 'es' : ''} ready · tap to alert all vendors at once`}
          </div>
        </div>
        {catches.length > 0 && !isSent && (
          <button
            className="trip-btn trip-btn--primary"
            style={{ flexShrink: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={alertAll}
            disabled={alerting}
          >
            <SendIcon />
            {alerting ? 'Alerting vendors…' : 'Alert All Vendors'}
          </button>
        )}
      </div>

      {catches.length > 0 && (
        <div className="ca-trip-banner__catch-rows">
          {catches.map(c => {
            const alerted = alertedCatchIds.has(c.id) || sent
            return (
              <div key={c.id} className="ca-trip-banner__catch-row">
                <div className="ca-trip-banner__catch-left">
                  <FishIcon size={14} />
                  <span className="ca-trip-banner__catch-name">{c.species?.commonName ?? '—'}</span>
                  <span className="ca-trip-banner__catch-qty">
                    {[c.quantityEstimate ? `~${c.quantityEstimate}` : null, c.quantityKg != null ? `${c.quantityKg} kg` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
                {alerted && (
                  <span className="ca-alerted-chip">
                    <CheckIcon size={12} /> Alerted
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Alert Card (fisherman's sent alerts list) ──────────────────────────────────

function AlertCard({ alert, role, token, onReload }) {
  const [cancelling, setCancelling] = useState(false)
  const [offerModal, setOfferModal] = useState(false)

  async function cancel() {
    setCancelling(true)
    try {
      await apiPut(`/fisherman/catch-alerts/${alert.id}/cancel`, token)
      onReload()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const speciesName = alert.species?.commonName ?? '—'
  const timeLeft    = fmtTimeLeft(alert.expiresAt)
  const urgent      = isUrgent(alert.expiresAt)
  const expired     = isExpired(alert.expiresAt)
  const matchCount  = alert.matchedListingIds?.length ?? 0

  return (
    <div className="ca-card">
      <div className="ca-card__header">
        <div className="ca-card__species">
          <span className="ca-card__species-icon"><FishIcon size={16} /></span>
          {speciesName}
        </div>
        <StatusChip status={alert.status} />
      </div>

      <div className="ca-card__meta">
        {role === 'VENDOR' && (
          <span className="ca-card__meta-item">Fisherman: <strong style={{ marginLeft: 4, color: 'var(--text-1)' }}>{alert.fisherman?.fullName ?? '—'}</strong></span>
        )}
        {alert.quantityEstimate && <span className="ca-card__meta-item">~{alert.quantityEstimate}</span>}
        {alert.quantityKg != null && <span className="ca-card__meta-item">{alert.quantityKg} kg</span>}
        {alert.landingSite && (
          <span className="ca-card__meta-item"><MapPinIcon /> {alert.landingSite}</span>
        )}
        {alert.askingPricePerKg != null && (
          <span className="ca-card__meta-item" style={{ fontWeight: 600, color: 'var(--text-1)' }}>₱{alert.askingPricePerKg}/kg</span>
        )}
      </div>

      <div className="ca-card__footer">
        <div className="ca-card__expiry">
          <ClockIcon />
          <span className={expired ? 'ca-card__expiry--expired' : urgent ? 'ca-card__expiry--urgent' : ''}>
            {timeLeft ?? '—'}
          </span>
        </div>
        <div className="ca-card__badges">
          <span className="ca-badge-bfar">
            <ShieldIcon />
            BFAR {alert.bfarMinPrice ? `₱${alert.bfarMinPrice}–${alert.bfarMaxPrice}/kg` : '—'}
          </span>
          {role === 'FISHERMAN' && (
            <span className="ca-badge-match">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div className="ca-card__actions">
          {role === 'FISHERMAN' && alert.status === 'ACTIVE' && (
            <button className="trip-btn trip-btn--ghost" style={{ fontSize: 12, padding: '3px 10px', color: 'var(--unsafe)' }}
              onClick={cancel} disabled={cancelling}>
              {cancelling ? '…' : 'Cancel'}
            </button>
          )}
          {role === 'VENDOR' && alert.status === 'ACTIVE' && (
            <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '5px 14px' }}
              onClick={() => setOfferModal(true)}>
              Make Offer
            </button>
          )}
        </div>
      </div>

      {offerModal && (
        <OrderCreateModal
          alert={alert} token={token}
          onSuccess={() => { setOfferModal(false); onReload() }}
          onClose={() => setOfferModal(false)}
        />
      )}
    </div>
  )
}

// ── Fisherman Group Card (vendor view) ─────────────────────────────────────────

function FishermanCard({ fishermanName, alerts, token, onReload }) {
  const [offerAlert, setOfferAlert] = useState(null)

  const earliest = alerts.reduce((min, a) =>
    new Date(a.expiresAt) < new Date(min.expiresAt) ? a : min, alerts)
  const timeLeft = fmtTimeLeft(earliest.expiresAt)

  const initials = fishermanName
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="ca-fisherman-group">
      <div className="ca-fisherman-group__header">
        <div className="ca-fisherman-group__avatar">{initials}</div>
        <div style={{ flex: 1 }}>
          <div className="ca-fisherman-group__name">{fishermanName}</div>
          <div className="ca-fisherman-group__sub">
            <ClockIcon /> expires {timeLeft}
          </div>
        </div>
        <StatusChip status="ACTIVE" />
      </div>

      <div>
        <div className="ca-catches-label">Available Catch</div>
        <div className="ca-catch-rows">
          {alerts.map(a => (
            <div key={a.id} className="ca-catch-row">
              <div className="ca-catch-row__left">
                <FishIcon size={14} />
                <div>
                  <span className="ca-catch-row__species">{a.species?.commonName ?? '—'}</span>
                  <span className="ca-catch-row__qty">
                    {[a.quantityEstimate ? `~${a.quantityEstimate}` : null, a.quantityKg != null ? `${a.quantityKg} kg` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>
              <div className="ca-catch-row__right">
                {a.askingPricePerKg != null && (
                  <span className="ca-catch-row__price">₱{a.askingPricePerKg}/kg</span>
                )}
                <span className="ca-badge-bfar">
                  <ShieldIcon />
                  BFAR {a.bfarMinPrice ? `₱${a.bfarMinPrice}–${a.bfarMaxPrice}/kg` : '—'}
                </span>
                {a.landingSite && (
                  <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPinIcon /> {a.landingSite}
                  </span>
                )}
                <button
                  className="trip-btn trip-btn--primary"
                  style={{ fontSize: 12, padding: '5px 14px' }}
                  onClick={() => setOfferAlert(a)}
                >
                  Make Offer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {offerAlert && (
        <OrderCreateModal
          alert={offerAlert} token={token}
          onSuccess={() => { setOfferAlert(null); onReload() }}
          onClose={() => setOfferAlert(null)}
        />
      )}
    </div>
  )
}

// ── Vendor Grouped View ────────────────────────────────────────────────────────

function VendorGroupedView({ alerts, token, onReload }) {
  const byFisherman = alerts.reduce((acc, a) => {
    const id = a.fisherman?.id ?? 'unknown'
    if (!acc[id]) acc[id] = { fishermanId: id, fishermanName: a.fisherman?.fullName ?? 'Unknown', alerts: [] }
    acc[id].alerts.push(a)
    return acc
  }, {})

  const groups = Object.values(byFisherman)

  return (
    <div className="ca-group-feed">
      <div className="ca-section-label">
        {groups.length} fisherman{groups.length !== 1 ? 'men' : ''} with catch available
      </div>
      {groups.map(g => (
        <FishermanCard
          key={g.fishermanId}
          fishermanId={g.fishermanId}
          fishermanName={g.fishermanName}
          alerts={g.alerts}
          token={token}
          onReload={onReload}
        />
      ))}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="ca-card" style={{ gap: 10 }}>
          <div className="skeleton" style={{ height: 18, width: '55%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '75%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}

// ── Alerts Right Panel ─────────────────────────────────────────────────────────

function AlertsPanel({ alerts, role, allSpecies }) {
  const now      = Date.now()
  const active   = alerts.filter(a => a.status === 'ACTIVE').length
  const matched  = alerts.filter(a => a.status === 'MATCHED').length
  const expiring = alerts.filter(a => {
    if (a.status !== 'ACTIVE' || !a.expiresAt) return false
    const diff = new Date(a.expiresAt) - now
    return diff > 0 && diff < 3_600_000
  }).length

  if (role === 'FISHERMAN') {
    return (
      <aside className="ca-panel">
        <div className="ca-panel-card">
          <div className="ca-panel-card__title">Alert Summary</div>
          <div className="ca-panel-stat">
            <span>Active</span>
            <span className="ca-panel-stat__val ca-panel-stat__val--accent">{active}</span>
          </div>
          <div className="ca-panel-stat">
            <span>Matched by vendor</span>
            <span className="ca-panel-stat__val ca-panel-stat__val--safe">{matched}</span>
          </div>
          <div className="ca-panel-stat">
            <span>Expiring soon</span>
            <span className={`ca-panel-stat__val${expiring > 0 ? ' ca-panel-stat__val--caution' : ''}`}>{expiring}</span>
          </div>
          <div className="ca-panel-stat">
            <span>Total sent</span>
            <span className="ca-panel-stat__val">{alerts.length}</span>
          </div>
        </div>

        {expiring > 0 && (
          <div className="ca-panel-card" style={{ borderColor: 'var(--caution-border)', background: 'var(--caution-dim)' }}>
            <div className="ca-panel-card__title" style={{ color: 'var(--caution)' }}>Expiring Soon</div>
            <p className="ca-panel-tip" style={{ color: 'var(--caution)' }}>
              {expiring} alert{expiring !== 1 ? 's' : ''} expire within 1 hour. Go to an active trip and re-alert to extend visibility.
            </p>
          </div>
        )}

        <div className="ca-panel-card">
          <div className="ca-panel-card__title">How Alerts Work</div>
          <p className="ca-panel-tip">
            Alerts expire after <strong style={{ color: 'var(--text-2)' }}>4 hours</strong>. Vendors browsing the marketplace see your catch and can send you order offers directly.
          </p>
        </div>
      </aside>
    )
  }

  // Vendor panel
  const fishermen = new Set(alerts.map(a => a.fisherman?.id).filter(Boolean)).size
  const speciesAvailable = new Set(alerts.map(a => a.species?.id).filter(Boolean)).size

  return (
    <aside className="ca-panel">
      <div className="ca-panel-card">
        <div className="ca-panel-card__title">Market Overview</div>
        <div className="ca-panel-stat">
          <span>Active fishermen</span>
          <span className="ca-panel-stat__val ca-panel-stat__val--accent">{fishermen}</span>
        </div>
        <div className="ca-panel-stat">
          <span>Species available</span>
          <span className="ca-panel-stat__val">{speciesAvailable}</span>
        </div>
        <div className="ca-panel-stat">
          <span>Total alerts</span>
          <span className="ca-panel-stat__val">{alerts.length}</span>
        </div>
      </div>

      {allSpecies.length > 0 && (
        <div className="ca-panel-card">
          <div className="ca-panel-card__title">Browse by Species</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allSpecies.slice(0, 7).map(s => {
              const count = alerts.filter(a => a.species?.id === s.id).length
              return (
                <div key={s.id} className="ca-panel-stat">
                  <span>{s.commonName}</span>
                  {count > 0 && <span className="ca-panel-stat__val ca-panel-stat__val--accent" style={{ fontSize: 13 }}>{count}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="ca-panel-card">
        <div className="ca-panel-card__title">Making an Offer</div>
        <p className="ca-panel-tip">
          Click <strong style={{ color: 'var(--text-2)' }}>Make Offer</strong> on any catch row to propose a price. The fisherman will accept or decline.
        </p>
      </div>
    </aside>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CatchAlerts({ token, role }) {
  const [alerts,        setAlerts]      = useState([])
  const [loading,       setLoading]     = useState(false)
  const [error,         setError]       = useState(null)
  const [filterSpecies, setFilter]      = useState('')
  const [allSpecies,    setAllSpecies]  = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const path = role === 'FISHERMAN'
        ? '/fisherman/catch-alerts'
        : `/marketplace/catch-alerts${filterSpecies ? `?speciesId=${filterSpecies}` : ''}`
      setAlerts(await apiGet(path, token))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, role, filterSpecies])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (role === 'VENDOR') {
      apiGet('/lookups/fish-species', token).then(setAllSpecies).catch(() => {})
    }
  }, [token, role])

  return (
    <div className="ca-page">
      <div className="ca-main">
        {/* Header */}
        <div className="ca-header">
          <div className="ca-header__left">
            <div className="ca-header__icon"><BellIcon /></div>
            <div>
              <div className="ca-header__title">
                {role === 'FISHERMAN' ? 'Alert Vendors' : 'Browse Catch Alerts'}
              </div>
              <div className="ca-header__sub">
                {role === 'FISHERMAN'
                  ? 'Notify wet market vendors about your fresh catch'
                  : 'Live catch alerts from active fishing trips'}
              </div>
            </div>
          </div>
          <div className="ca-header__controls">
            {role === 'VENDOR' && (
              <select className="ca-filter-select" value={filterSpecies} onChange={e => setFilter(e.target.value)}>
                <option value="">All species</option>
                {allSpecies.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
              </select>
            )}
            <button className="ca-refresh-btn" onClick={load} disabled={loading}>
              <RefreshIcon />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="ca-error">
            {error}
            <button className="trip-btn trip-btn--ghost" style={{ marginLeft: 8, fontSize: 12 }} onClick={load}>Retry</button>
          </div>
        )}

        {/* Active trip quick-alert banner (fisherman only) */}
        {role === 'FISHERMAN' && (
          <ActiveTripSection token={token} existingAlerts={alerts} onAlertsChanged={load} />
        )}

        {/* Content */}
        {loading && alerts.length === 0 ? (
          <Skeleton />
        ) : alerts.length === 0 ? (
          <div className="ca-empty">
            <div className="ca-empty__icon"><AlertEmptyIcon /></div>
            <div className="ca-empty__msg">
              {role === 'FISHERMAN'
                ? 'No alerts sent yet'
                : 'No active catch alerts right now'}
            </div>
            <div className="ca-empty__sub">
              {role === 'FISHERMAN'
                ? 'Use the banner above to alert vendors from your active trip.'
                : 'Check back soon — fishermen will post when they have fresh catch.'}
            </div>
          </div>
        ) : role === 'VENDOR' ? (
          <VendorGroupedView alerts={alerts} token={token} onReload={load} />
        ) : (
          <>
            <div className="ca-section-label">My Sent Alerts</div>
            <div className="ca-feed">
              {alerts.map(a => (
                <AlertCard key={a.id} alert={a} role={role} token={token} onReload={load} />
              ))}
            </div>
          </>
        )}
      </div>

      <AlertsPanel alerts={alerts} role={role} allSpecies={allSpecies} />
    </div>
  )
}
