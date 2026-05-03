import { useState, useEffect, useCallback } from 'react'
import './design-system.css'
import './light-compat.css'
import { apiGet, apiPost, apiPut } from './api'

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
    <div className={`alert-card${urgent ? ' alert-card--urgent' : ''}${alert.status === 'MATCHED' ? ' alert-card--matched' : ''}`}>
      <div className="alert-card__head">
        <div>
          <div className="row" style={{ gap: 6 }}>
            <span className="kbd">CA-{alert.id}</span>
            {urgent && <span className="chip chip--unsafe chip--dot">Expires soon</span>}
          </div>
          <h3 className="alert-card__species">{speciesName}</h3>
          <div className="alert-card__sub">
            {timeLeft ?? '—'}
            {alert.landingSite ? ` · ${alert.landingSite}` : ''}
          </div>
        </div>
        {role === 'FISHERMAN' && alert.status === 'ACTIVE' && (
          <button className="btn btn--sm btn--ghost" onClick={cancel} disabled={cancelling}>
            {cancelling ? '…' : '✕'}
          </button>
        )}
      </div>

      <div className="alert-card__stats">
        <div>
          <div className="l">Qty</div>
          <div className="v">{alert.quantityKg ?? '—'}<small>kg</small></div>
        </div>
        <div>
          <div className="l">Estimate</div>
          <div className="v">{alert.quantityEstimate ?? '—'}</div>
        </div>
        <div>
          <div className="l">Asking</div>
          <div className="v">{alert.askingPricePerKg != null ? `₱${alert.askingPricePerKg}` : '—'}<small>/kg</small></div>
        </div>
      </div>

      <div className="alert-card__foot">
        <div className="row" style={{ gap: 6 }}>
          <ClockIcon />
          <span style={{ color: urgent ? 'var(--unsafe)' : expired ? 'var(--ink-4)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {timeLeft ?? '—'}
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {matchCount > 0 && (
            <div className="alert-card__offers">
              {Array.from({ length: Math.min(3, matchCount) }, (_, i) => (
                <div key={i} className="alert-card__offer-avatar">
                  {String.fromCharCode(65 + i)}{String.fromCharCode(66 + i)}
                </div>
              ))}
              {matchCount > 3 && <div className="alert-card__offer-avatar">+{matchCount - 3}</div>}
            </div>
          )}
          {role === 'FISHERMAN' && matchCount > 0 && (
            <button className="btn btn--accent btn--sm">{matchCount} offer{matchCount !== 1 ? 's' : ''}</button>
          )}
          {role === 'VENDOR' && alert.status === 'ACTIVE' && (
            <button className="btn btn--accent btn--sm" onClick={() => setOfferModal(true)}>
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

  const activeAlerts  = alerts.filter(a => a.status === 'ACTIVE')
  const matchedAlerts = alerts.filter(a => a.status === 'MATCHED')
  const expiredAlerts = alerts.filter(a => a.status === 'EXPIRED' || a.status === 'CANCELLED' || isExpired(a.expiresAt))
  const totalKg       = alerts.reduce((s, a) => s + (a.quantityKg ?? 0), 0)
  const potentialRev  = alerts.reduce((s, a) => s + (a.quantityKg ?? 0) * (a.askingPricePerKg ?? 0), 0)
  const matchCount    = matchedAlerts.length
  const openOffers    = alerts.reduce((s, a) => s + (a.matchedListingIds?.length ?? 0), 0)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">{role === 'FISHERMAN' ? 'Fishing' : 'Market'}</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            Catch <em>Alerts</em>
          </h1>
          <p className="page__sub">
            {role === 'FISHERMAN'
              ? 'Notify vendors about your fresh catch · alerts expire in 4h'
              : 'Live catch alerts from active fishing trips'}
          </p>
        </div>
        <div className="page__actions">
          {role === 'VENDOR' && (
            <select className="btn" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} value={filterSpecies} onChange={e => setFilter(e.target.value)}>
              <option value="">All species</option>
              {allSpecies.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
            </select>
          )}
          <button className="btn" onClick={load} disabled={loading}>
            <RefreshIcon /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Active alerts</div>
          <div className="v">{activeAlerts.length}</div>
          <div className="s">Visible to vendors</div>
        </div>
        <div className="stat">
          <div className="l">Total offered</div>
          <div className="v">{totalKg > 0 ? `${totalKg.toFixed(0)}kg` : '—'}</div>
          <div className="s">Across all alerts</div>
        </div>
        <div className="stat">
          <div className="l">Potential revenue</div>
          <div className="v">{potentialRev > 0 ? `₱${Math.round(potentialRev).toLocaleString()}` : '—'}</div>
          <div className="s">At asking price</div>
        </div>
        <div className="stat">
          <div className="l">Open offers</div>
          <div className="v">{openOffers}</div>
          <div className="s">Awaiting response</div>
        </div>
        <div className="stat">
          <div className="l">Match rate</div>
          <div className="v">{alerts.length > 0 ? `${Math.round((matchCount / alerts.length) * 100)}%` : '—'}</div>
          <div className="s">{matchCount} matched / {alerts.length} total</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--unsafe-soft)', border: '1px solid var(--unsafe)', borderRadius: 'var(--r-md)', marginBottom: 14, fontSize: 13, color: 'var(--unsafe)' }}>
          {error} <button className="btn btn--sm" style={{ marginLeft: 8 }} onClick={load}>Retry</button>
        </div>
      )}

      {role === 'FISHERMAN' && (
        <ActiveTripSection token={token} existingAlerts={alerts} onAlertsChanged={load} />
      )}

      {loading && alerts.length === 0 ? (
        <Skeleton />
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-4)' }}>
          <AlertEmptyIcon />
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>
            {role === 'FISHERMAN' ? 'No alerts sent yet' : 'No active catch alerts'}
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {role === 'FISHERMAN'
              ? 'Use the banner above to alert vendors from your active trip.'
              : 'Check back soon — fishermen will post when they have fresh catch.'}
          </div>
        </div>
      ) : role === 'VENDOR' ? (
        <VendorGroupedView alerts={alerts} token={token} onReload={load} />
      ) : (
        <>
          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card__head">
                <div>
                  <div className="card__title">Active alerts</div>
                  <div className="card__sub">{activeAlerts.length} live · vendors notified in real-time</div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn btn--sm">Sort: Newest</button>
                </div>
              </div>
              <div className="alerts-grid">
                {activeAlerts.map(a => (
                  <AlertCard key={a.id} alert={a} role={role} token={token} onReload={load} />
                ))}
              </div>
            </div>
          )}

          {/* Matched alerts */}
          {matchedAlerts.length > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card__head">
                <div>
                  <div className="card__title">Matched · waiting to finalize</div>
                  <div className="card__sub">{matchedAlerts.length} ready to convert to orders</div>
                </div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Species</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {matchedAlerts.map(a => (
                    <tr key={a.id} className="row--link">
                      <td><span className="kbd">CA-{a.id}</span></td>
                      <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{a.species?.commonName ?? '—'}</td>
                      <td className="data">{a.quantityKg != null ? `${a.quantityKg}kg` : a.quantityEstimate ?? '—'}</td>
                      <td className="data">{a.askingPricePerKg != null ? `₱${a.askingPricePerKg}/kg` : '—'}</td>
                      <td><span className="chip chip--safe chip--dot">MATCHED</span></td>
                      <td><button className="btn btn--sm btn--accent">Create order</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expired alerts */}
          {expiredAlerts.length > 0 && (
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Expired</div>
                  <div className="card__sub">Past alerts · relist with one click</div>
                </div>
              </div>
              <table className="tbl">
                <thead>
                  <tr><th>ID</th><th>Species</th><th>Qty</th><th>Ask</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {expiredAlerts.map(a => (
                    <tr key={a.id}>
                      <td><span className="kbd">CA-{a.id}</span></td>
                      <td style={{ fontWeight: 500 }}>{a.species?.commonName ?? '—'}</td>
                      <td className="data">{a.quantityKg != null ? `${a.quantityKg}kg` : a.quantityEstimate ?? '—'}</td>
                      <td className="data">{a.askingPricePerKg != null ? `₱${a.askingPricePerKg}/kg` : '—'}</td>
                      <td><span className="chip chip--dot">{a.status}</span></td>
                      <td><button className="btn btn--sm">Relist</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
