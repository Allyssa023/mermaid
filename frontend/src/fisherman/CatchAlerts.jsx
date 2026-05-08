import { useState, useEffect, useCallback } from 'react'
import { I } from '../icons'
import { listCatchAlerts, createCatchAlert, cancelCatchAlert } from './api/catchAlerts'
import { apiGet, apiPost } from '../api'

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
    ACTIVE:    'chip chip--dot chip--safe',
    MATCHED:   'chip chip--dot chip--safe',
    EXPIRED:   'chip chip--dot',
    CANCELLED: 'chip chip--dot chip--unsafe',
  }
  return (
    <span className={map[status] ?? 'chip chip--dot'}>
      {status === 'ACTIVE' && <I.Check size={11} />}
      {status}
    </span>
  )
}

// ── Order Create Modal ─────────────────────────────────────────────────────────

function OrderCreateModal({ alert, onSuccess, onClose }) {
  const [agreedPrice,  setAgreedPrice]  = useState(alert.askingPricePerKg ?? '')
  const [estimate,     setEstimate]     = useState(alert.quantityEstimate ?? '')
  const [kg,           setKg]           = useState(alert.quantityKg ?? '')
  const [dispatchMode, setDispatch]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!agreedPrice) return setError('Agreed price is required.')
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        speciesId:        alert.species?.id,
        catchAlertId:     alert.id,
        agreedPricePerKg: Number(agreedPrice),
      }
      if (estimate)     body.orderedQtyEstimate = estimate
      if (kg)           body.orderedQtyKg       = Number(kg)
      if (dispatchMode) body.dispatchMode        = dispatchMode
      if (notes)        body.notes               = notes
      await apiPost('/orders', null, body)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const speciesName = alert.species?.commonName ?? '—'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">Make Offer</h3>
          <button className="btn btn--ghost btn--sm" onClick={onClose}><I.X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, var(--unsafe) 10%, transparent)', border: '1px solid var(--unsafe)', borderRadius: 6, fontSize: 13, color: 'var(--unsafe)' }}>
              {error}
            </div>
          )}
          <div style={{ background: 'var(--surface)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--ink)' }}>Species:</strong> {speciesName}</div>
            <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--ink)' }}>Fisherman:</strong> {alert.fisherman?.fullName ?? '—'}</div>
            {alert.landingSite && <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--ink)' }}>Landing site:</strong> {alert.landingSite}</div>}
            {alert.askingPricePerKg && <div><strong style={{ color: 'var(--ink)' }}>Asking price:</strong> ₱{alert.askingPricePerKg}/kg</div>}
          </div>
          <div className="form-row">
            <label className="form-row__label">Agreed Price (₱/kg) *</label>
            <input className="input" type="number" min="0" step="0.01" required inputMode="decimal"
              value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-row__label">Quantity Estimate</label>
            <input className="input" placeholder="e.g. 2 baskets"
              value={estimate} onChange={e => setEstimate(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-row__label">Weight (kg)</label>
            <input className="input" type="number" min="0" step="0.1" placeholder="Optional" inputMode="decimal"
              value={kg} onChange={e => setKg(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-row__label">Dispatch Mode</label>
            <select className="select" value={dispatchMode} onChange={e => setDispatch(e.target.value)}>
              <option value="">Not specified</option>
              <option value="PICKUP">Pickup</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>
          <div className="form-row">
            <label className="form-row__label">Notes</label>
            <textarea className="input" rows={2} placeholder="Optional"
              value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="modal__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Active Trip Section (fisherman) ───────────────────────────────────────────

function ActiveTripSection({ existingAlerts, onAlertsChanged }) {
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
        const trips = await apiGet('/trips?status=ACTIVE', null)
        const active = trips[0]
        if (!active) { setTrip(null); setLoading(false); return }
        setTrip(active)
        const logs = await apiGet(`/trips/${active.id}/catches`, null)
        setCatches(logs)
      } catch {
        // no active trip — silently skip
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [existingAlerts])

  async function alertAll() {
    const unalerted = catches.filter(c => !alertedCatchIds.has(c.id))
    if (unalerted.length === 0) return
    setAlerting(true)
    try {
      await Promise.all(unalerted.map(c =>
        createCatchAlert({
          speciesId:        c.species?.id,
          catchLogId:       c.id,
          quantityEstimate: c.quantityEstimate ?? undefined,
          quantityKg:       c.quantityKg ?? undefined,
          expiresInHours:   4,
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
    <div style={{ fontSize: 13, color: 'var(--ink-4)', padding: '12px 0' }}>Checking active trip…</div>
  )
  if (!trip) return null

  const unalerted  = catches.filter(c => !alertedCatchIds.has(c.id))
  const allAlerted = unalerted.length === 0 && catches.length > 0
  const isSent     = allAlerted || sent

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
            className="btn btn--primary"
            style={{ flexShrink: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={alertAll}
            disabled={alerting}
          >
            <I.Send size={14} />
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
                  <I.Fish size={14} />
                  <span className="ca-trip-banner__catch-name">{c.species?.commonName ?? '—'}</span>
                  <span className="ca-trip-banner__catch-qty">
                    {[c.quantityEstimate ? `~${c.quantityEstimate}` : null, c.quantityKg != null ? `${c.quantityKg} kg` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
                {alerted && (
                  <span className="ca-alerted-chip">
                    <I.Check size={12} /> Alerted
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

function AlertCard({ alert, role, onReload }) {
  const [cancelling, setCancelling] = useState(false)
  const [offerModal, setOfferModal] = useState(false)

  async function cancel() {
    setCancelling(true)
    try {
      await cancelCatchAlert(alert.id)
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
            {cancelling ? '…' : <I.X size={14} />}
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
          <I.Clock size={13} />
          <span style={{ color: urgent ? 'var(--unsafe)' : expired ? 'var(--ink-4)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
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
          alert={alert}
          onSuccess={() => { setOfferModal(false); onReload() }}
          onClose={() => setOfferModal(false)}
        />
      )}
    </div>
  )
}

// ── Fisherman Group Card (vendor view) ─────────────────────────────────────────

function FishermanCard({ fishermanName, alerts, onReload }) {
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
            <I.Clock size={12} /> expires {timeLeft}
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
                <I.Fish size={14} />
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
                  <I.Shield size={11} />
                  BFAR {a.bfarMinPrice ? `₱${a.bfarMinPrice}–${a.bfarMaxPrice}/kg` : '—'}
                </span>
                {a.landingSite && (
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <I.MapPin size={11} /> {a.landingSite}
                  </span>
                )}
                <button
                  className="btn btn--primary btn--sm"
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
          alert={offerAlert}
          onSuccess={() => { setOfferAlert(null); onReload() }}
          onClose={() => setOfferAlert(null)}
        />
      )}
    </div>
  )
}

// ── Vendor Grouped View ────────────────────────────────────────────────────────

function VendorGroupedView({ alerts, onReload }) {
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
        <div key={i} className="card" style={{ gap: 10 }}>
          <div className="skeleton" style={{ height: 18, width: '55%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '75%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}

// ── Alerts Summary Panel ───────────────────────────────────────────────────────

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
          <div className="ca-panel-card" style={{ borderColor: 'var(--caution)', background: 'color-mix(in srgb, var(--caution) 8%, transparent)' }}>
            <div className="ca-panel-card__title" style={{ color: 'var(--caution)' }}>Expiring Soon</div>
            <p className="ca-panel-tip" style={{ color: 'var(--caution)' }}>
              {expiring} alert{expiring !== 1 ? 's' : ''} expire within 1 hour. Go to an active trip and re-alert to extend visibility.
            </p>
          </div>
        )}

        <div className="ca-panel-card">
          <div className="ca-panel-card__title">How Alerts Work</div>
          <p className="ca-panel-tip">
            Alerts expire after <strong style={{ color: 'var(--ink-2)' }}>4 hours</strong>. Vendors browsing the marketplace see your catch and can send you order offers directly.
          </p>
        </div>
      </aside>
    )
  }

  // Vendor panel
  const fishermen        = new Set(alerts.map(a => a.fisherman?.id).filter(Boolean)).size
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
          Click <strong style={{ color: 'var(--ink-2)' }}>Make Offer</strong> on any catch row to propose a price. The fisherman will accept or decline.
        </p>
      </div>
    </aside>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CatchAlerts({ token, role }) {
  const [alerts,        setAlerts]     = useState([])
  const [loading,       setLoading]    = useState(false)
  const [error,         setError]      = useState(null)
  const [filterSpecies, setFilter]     = useState('')
  const [allSpecies,    setAllSpecies] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (role === 'FISHERMAN') {
        data = await listCatchAlerts()
      } else {
        data = await apiGet(
          `/marketplace/catch-alerts${filterSpecies ? `?speciesId=${filterSpecies}` : ''}`,
          null
        )
      }
      setAlerts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [role, filterSpecies])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (role === 'VENDOR') {
      apiGet('/lookups/fish-species', null).then(setAllSpecies).catch(() => {})
    }
  }, [role])

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
          <div className="eyebrow">Fisherman · Supply</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Catch <em>Alerts.</em></h1>
          <p className="page__sub">
            {role === 'FISHERMAN'
              ? 'Notify vendors about your fresh catch · alerts expire in 4h'
              : 'Live catch alerts from active fishing trips'}
          </p>
        </div>
        <div className="page__actions">
          {role === 'VENDOR' && (
            <select
              className="btn"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              value={filterSpecies}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="">All species</option>
              {allSpecies.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
            </select>
          )}
          <button className="btn" onClick={load} disabled={loading}>
            <I.Refresh size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
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
        <div style={{ padding: '12px 16px', background: 'color-mix(in srgb, var(--unsafe) 8%, transparent)', border: '1px solid var(--unsafe)', borderRadius: 6, marginBottom: 14, fontSize: 13, color: 'var(--unsafe)' }}>
          {error} <button className="btn btn--sm" style={{ marginLeft: 8 }} onClick={load}>Retry</button>
        </div>
      )}

      {role === 'FISHERMAN' && (
        <ActiveTripSection existingAlerts={alerts} onAlertsChanged={load} />
      )}

      {loading && alerts.length === 0 ? (
        <Skeleton />
      ) : alerts.length === 0 ? (
        <div className="empty">
          <I.Bell size={40} style={{ opacity: 0.3 }} />
          <div className="empty__title">
            {role === 'FISHERMAN' ? 'No alerts sent yet' : 'No active catch alerts'}
          </div>
          <p style={{ fontSize: 13, marginTop: 6, color: 'var(--ink-4)' }}>
            {role === 'FISHERMAN'
              ? 'Use the banner above to alert vendors from your active trip.'
              : 'Check back soon — fishermen will post when they have fresh catch.'}
          </p>
        </div>
      ) : role === 'VENDOR' ? (
        <VendorGroupedView alerts={alerts} onReload={load} />
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
                  <AlertCard key={a.id} alert={a} role={role} onReload={load} />
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
