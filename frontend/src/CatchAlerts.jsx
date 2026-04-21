import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut } from './api'

// ── Icons ──────────────────────────────────────────────────────────────────────

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const FishIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
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

function StatusChip({ status }) {
  const colors = {
    ACTIVE:    { bg: '#d1fae5', color: '#065f46' },
    MATCHED:   { bg: '#dbeafe', color: '#1e40af' },
    EXPIRED:   { bg: '#f3f4f6', color: '#6b7280' },
    CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
  }
  const s = colors[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {status === 'ACTIVE' && <CheckIcon />}
      {status}
    </span>
  )
}

// ── Order Create Modal (vendor makes offer on an alert) ───────────────────────

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
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#334155' }}>
            <div><strong>Species:</strong> {speciesName}</div>
            <div><strong>Fisherman:</strong> {alert.fisherman?.fullName ?? '—'}</div>
            {alert.landingSite && <div><strong>Landing site:</strong> {alert.landingSite}</div>}
            {alert.askingPricePerKg && <div><strong>Asking price:</strong> ₱{alert.askingPricePerKg}/kg</div>}
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Agreed Price (₱/kg) *</label>
            <input className="trip-form__input" type="number" min="0" step="0.01" required
              value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Quantity Estimate</label>
            <input className="trip-form__input" placeholder="e.g. 2 baskets"
              value={estimate} onChange={e => setEstimate(e.target.value)} />
          </div>
          <div className="trip-form__group">
            <label className="trip-form__label">Weight (kg)</label>
            <input className="trip-form__input" type="number" min="0" step="0.1" placeholder="Optional"
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
    <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>Checking active trip…</div>
  )
  if (!trip) return null

  const unalerted = catches.filter(c => !alertedCatchIds.has(c.id))
  const allAlerted = unalerted.length === 0 && catches.length > 0

  return (
    <div style={{
      background: allAlerted || sent ? '#f0fdf4' : '#eff6ff',
      border: `1px solid ${allAlerted || sent ? '#86efac' : '#bfdbfe'}`,
      borderRadius: 12, padding: '16px 20px', marginBottom: 24,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: allAlerted || sent ? '#166534' : '#1e40af' }}>
            {allAlerted || sent ? 'Vendors have been notified' : 'Notify vendors about your catch'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            {catches.length === 0
              ? 'No catches logged yet — add catches in My Trips first.'
              : allAlerted || sent
                ? `All ${catches.length} catch${catches.length > 1 ? 'es' : ''} are visible to vendors.`
                : `${catches.length} catch${catches.length > 1 ? 'es' : ''} ready · tap to alert all vendors at once`}
          </div>
        </div>

        {catches.length > 0 && !allAlerted && !sent && (
          <button
            className="trip-btn trip-btn--primary"
            style={{ flexShrink: 0, fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={alertAll}
            disabled={alerting}
          >
            <SendIcon />
            {alerting ? 'Alerting vendors…' : 'Alert All Vendors'}
          </button>
        )}
      </div>

      {/* Catch summary list (read-only preview) */}
      {catches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {catches.map(c => {
            const alerted = alertedCatchIds.has(c.id)
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: '#fff', borderRadius: 7,
                border: '1px solid #e2e8f0', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FishIcon />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.species?.commonName ?? '—'}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {[c.quantityEstimate ? `~${c.quantityEstimate}` : null, c.quantityKg != null ? `${c.quantityKg} kg` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
                {(alerted || sent) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#059669' }}>
                    <CheckIcon /> Alerted
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

// ── Fisherman Card (vendor view — grouped by fisherman) ───────────────────────

function FishermanCard({ fishermanId, fishermanName, alerts, token, onReload }) {
  const [offerAlert, setOfferAlert] = useState(null)

  const earliest = alerts.reduce((min, a) =>
    new Date(a.expiresAt) < new Date(min.expiresAt) ? a : min, alerts)
  const timeLeft = fmtTimeLeft(earliest.expiresAt)

  const initials = fishermanName
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Fisherman header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: '#dbeafe',
          color: '#1e40af', fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{fishermanName}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ClockIcon /> expires {timeLeft}
          </div>
        </div>
        <StatusChip status="ACTIVE" />
      </div>

      {/* Catches from this fisherman */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
          Available Catch
        </div>
        {alerts.map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: '#f8fafc', borderRadius: 8, gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <FishIcon />
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{a.species?.commonName ?? '—'}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                  {[a.quantityEstimate ? `~${a.quantityEstimate}` : null, a.quantityKg != null ? `${a.quantityKg} kg` : null]
                    .filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {a.askingPricePerKg != null && (
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>₱{a.askingPricePerKg}/kg</span>
              )}
              {a.landingSite && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.landingSite}</span>
              )}
              <button
                className="trip-btn trip-btn--primary"
                style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => setOfferAlert(a)}
              >
                Make Offer
              </button>
            </div>
          </div>
        ))}
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

// ── Alert Card (fisherman's sent alerts list) ──────────────────────────────────

function AlertCard({ alert, role, token, onReload }) {
  const [cancelling,  setCancelling]  = useState(false)
  const [offerModal,  setOfferModal]  = useState(false)

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

  const speciesName    = alert.species?.commonName ?? '—'
  const timeLeft       = fmtTimeLeft(alert.expiresAt)

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FishIcon />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{speciesName}</span>
        </div>
        <StatusChip status={alert.status} />
      </div>

      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
        {role === 'VENDOR' && <span>Fisherman: <strong>{alert.fisherman?.fullName ?? '—'}</strong></span>}
        {alert.quantityEstimate && <span>~{alert.quantityEstimate}</span>}
        {alert.quantityKg != null && <span>{alert.quantityKg} kg</span>}
        {alert.landingSite && <span>{alert.landingSite}</span>}
        {alert.askingPricePerKg != null && <span>₱{alert.askingPricePerKg}/kg</span>}
        {role === 'FISHERMAN' && alert.matchedListingIds?.length > 0 && (
          <span style={{ color: '#2563eb' }}>
            Matches {alert.matchedListingIds.length} listing{alert.matchedListingIds.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
          <ClockIcon /><span>{timeLeft}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {role === 'FISHERMAN' && alert.status === 'ACTIVE' && (
            <button className="trip-btn trip-btn--ghost" style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={cancel} disabled={cancelling}>
              {cancelling ? '…' : 'Cancel'}
            </button>
          )}
          {role === 'VENDOR' && alert.status === 'ACTIVE' && (
            <button className="trip-btn trip-btn--primary" style={{ fontSize: 12, padding: '3px 10px' }}
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CatchAlerts({ token, role }) {
  const [alerts,       setAlerts]      = useState([])
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState(null)
  const [filterSpecies, setFilter]     = useState('')
  const [allSpecies,   setAllSpecies]  = useState([])

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
    <div style={{ padding: '32px 36px', maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BellIcon />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {role === 'FISHERMAN' ? 'Alert Vendors' : 'Browse Catch Alerts'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {role === 'VENDOR' && (
            <select className="trip-form__select"
              style={{ fontSize: 13, padding: '6px 10px', width: 180 }}
              value={filterSpecies} onChange={e => setFilter(e.target.value)}>
              <option value="">All species</option>
              {allSpecies.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
            </select>
          )}
          <button className="trip-btn trip-btn--ghost" style={{ fontSize: 13 }} onClick={load} disabled={loading}>
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="trip-err" style={{ marginBottom: 16 }}>
          {error} <button className="trip-btn trip-btn--ghost" style={{ marginLeft: 8, fontSize: 12 }} onClick={load}>Retry</button>
        </div>
      )}

      {/* Active trip quick-alert section (fisherman only) */}
      {role === 'FISHERMAN' && (
        <ActiveTripSection token={token} existingAlerts={alerts} onAlertsChanged={load} />
      )}

      {/* List */}
      {loading && alerts.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : alerts.length === 0 ? (
        <div style={{
          background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12,
          padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13,
        }}>
          {role === 'FISHERMAN'
            ? 'No alerts sent yet. Use the section above to alert vendors from your active trip.'
            : 'No active catch alerts right now. Check back soon.'}
        </div>
      ) : role === 'VENDOR' ? (
        /* Vendor: group by fisherman */
        <VendorGroupedView alerts={alerts} token={token} onReload={load} />
      ) : (
        /* Fisherman: flat list of own alerts */
        <>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              My Sent Alerts
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map(a => (
              <AlertCard key={a.id} alert={a} role={role} token={token} onReload={load} />
            ))}
          </div>
        </>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
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
