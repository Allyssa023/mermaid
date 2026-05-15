import { useState, useEffect } from 'react'
import { I } from '../icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTrips, endTrip,
         listCatchLogs, createCatchLog, deleteCatchLog } from './api/trips'
import { listCatchAlerts, createCatchAlert } from './api/catchAlerts'
import { fetchSpecies } from '../api/lookup'
import StartTripModal from '../components/StartTripModal'
import BfarBadge from '../components/BfarBadge'
import { TableRowSkeleton, CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKLIST_DISPLAY = [
  { k: 'fuelChecked',         label: 'Fuel topped off' },
  { k: 'engineChecked',       label: 'Engine check' },
  { k: 'radioChecked',        label: 'Radio comms OK' },
  { k: 'lifeVestChecked',     label: 'Life vests for all crew' },
  { k: 'weatherReviewed',     label: 'Weather briefed' },
  { k: 'emergencyKitChecked', label: 'Emergency kit on board' },
]

// ── Add Catch Modal ───────────────────────────────────────────────────────────

export function AddCatchModal({ tripId, species, onSaved, onClose }) {
  const [speciesId, setSpeciesId] = useState('')
  const [quantityKg, setQuantityKg] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [notes, setNotes]         = useState('')
  const [err, setErr]             = useState(null)

  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: () => {
      const qty = parseInt(quantityKg, 10)
      const price = parseInt(pricePerKg, 10)
      return createCatchLog(tripId, {
        speciesId: Number(speciesId),
        quantityEstimate: `${qty}kg`,
        quantityKg: qty,
        estimatedPricePerKg: price,
        notes: notes.trim() || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catchLogs', tripId] })
      onSaved()
    },
    onError: e => setErr(e.message),
  })

  return (
    <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="trip-modal">
        <div className="trip-modal__header">
          <h2 className="trip-modal__title">Log Catch Entry</h2>
          <button className="trip-modal__close" onClick={onClose}>✕</button>
        </div>
        <form className="trip-form" onSubmit={e => { e.preventDefault(); mut.mutate() }}>
          {err && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{err}</p>}

          <label className="trip-form__label">
            Species *
            <select
              className="trip-form__input"
              value={speciesId}
              onChange={e => setSpeciesId(e.target.value)}
              required
            >
              <option value="">Select species…</option>
              {species.map(s => (
                <option key={s.id} value={s.id}>{s.commonName}</option>
              ))}
            </select>
          </label>

          <label className="trip-form__label">
            Quantity (kg) *
            <input
              type="number"
              min="1"
              step="1"
              className="trip-form__input"
              placeholder="e.g. 30"
              value={quantityKg}
              onChange={e => setQuantityKg(e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
          </label>

          <label className="trip-form__label">
            Est. price/kg (₱) *
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                step="1"
                className="trip-form__input"
                style={{ flex: 1 }}
                placeholder="e.g. 250"
                value={pricePerKg}
                onChange={e => setPricePerKg(e.target.value.replace(/[^0-9]/g, ''))}
                required
              />
              {speciesId && (
                <BfarBadge speciesId={Number(speciesId)} agreedPrice={pricePerKg ? Number(pricePerKg) : null} />
              )}
            </div>
          </label>

          <label className="trip-form__label">
            Notes
            <textarea
              className="trip-form__textarea"
              placeholder="Quality, condition, notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={300}
            />
          </label>

          <div className="trip-form__actions">
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="trip-btn trip-btn--primary" disabled={mut.isPending || !speciesId || !quantityKg || parseInt(quantityKg, 10) < 1 || !pricePerKg || parseInt(pricePerKg, 10) < 1}>
              {mut.isPending ? 'Saving…' : 'Save Catch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── End Trip Modal ────────────────────────────────────────────────────────────

function EndTripModal({ trip, onEnded, onClose }) {
  const [notes, setNotes] = useState('')
  const [err, setErr]     = useState(null)
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => endTrip(trip.id, { notes: notes.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      onEnded()
    },
    onError: e => setErr(e.message),
  })

  return (
    <div className="trip-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="trip-modal">
        <div className="trip-modal__header">
          <h2 className="trip-modal__title">End Trip</h2>
          <button className="trip-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="trip-form">
          {err && <p style={{ color: 'var(--unsafe)', fontSize: 13 }}>{err}</p>}
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            End <strong>{trip.targetArea ?? 'this trip'}</strong>? The trip will be marked as Completed.
          </p>
          <label className="trip-form__label" style={{ marginTop: 16 }}>
            Notes (optional)
            <textarea
              className="trip-form__textarea"
              placeholder="Any notes about this trip…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>
          <div className="trip-form__actions">
            <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="trip-btn trip-btn--primary"
              style={{ background: 'var(--unsafe)' }}
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
            >
              {mut.isPending ? 'Ending…' : 'End Trip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

export default function TripsPage({ openModalTrigger = 0 }) {
  const [tab, setTab]           = useState('active')
  const [showStart, setShowStart] = useState(false)

  useEffect(() => {
    if (openModalTrigger > 0) setShowStart(true)
  }, [openModalTrigger])
  const [showAddCatch, setShowAddCatch] = useState(false)
  const [showEndTrip, setShowEndTrip]   = useState(false)
  const [now, setNow]           = useState(() => Date.now())
  const qc = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const tripsQ   = useQuery({ queryKey: ['trips'],            queryFn: () => listTrips() })
  const speciesQ = useQuery({ queryKey: ['species'],          queryFn: fetchSpecies })
  const alertsQ  = useQuery({ queryKey: ['catchAlerts', 'own'], queryFn: listCatchAlerts })

  const activeTrip = (tripsQ.data ?? []).find(t => t.status === 'ACTIVE') ?? null
  const pastTrips  = (tripsQ.data ?? []).filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED')

  const catchLogsQ = useQuery({
    queryKey: ['catchLogs', activeTrip?.id],
    queryFn: () => listCatchLogs(activeTrip?.id),
    enabled: !!activeTrip,
  })

  const deleteCatchMut = useMutation({
    mutationFn: ({ tripId, logId }) => deleteCatchLog(tripId, logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catchLogs', activeTrip?.id] }),
  })

  const postAlertsMut = useMutation({
    mutationFn: (catches) => Promise.all(
      catches.map(c => createCatchAlert({
        catchLogId:       c.id,
        speciesId:        c.species?.id,
        quantityKg:       (c.quantityKg != null && c.quantityKg >= 0.1) ? c.quantityKg : null,
        quantityEstimate: c.quantityEstimate ?? null,
        askingPricePerKg: c.estimatedPricePerKg ?? null,
        expiresInHours:   4,
        landingSite:      activeTrip?.departurePoint ?? null,
      }))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catchAlerts', 'own'] })
    },
  })

  if (tripsQ.isLoading) return <div className="page"><CardSkeleton /><TableRowSkeleton /></div>
  if (tripsQ.error) return <div className="page"><ApiError error={tripsQ.error} onRetry={tripsQ.refetch} /></div>

  const t = activeTrip

  // Catch log IDs that already have an active or matched alert — don't re-post these
  const alertedLogIds = new Set(
    (alertsQ.data ?? [])
      .filter(a => a.status === 'ACTIVE' || a.status === 'MATCHED')
      .map(a => a.catchLogId)
      .filter(Boolean)
  )

  const elapsed    = t?.startedAt ? Math.max(0, now - new Date(t.startedAt).getTime()) : 0
  const durationH  = Math.floor(elapsed / 3600000)
  const durationM  = Math.floor((elapsed % 3600000) / 60000)
  const durationS  = Math.floor((elapsed % 60000) / 1000)
  const checkedCount = t ? CHECKLIST_DISPLAY.filter(it => t.checklist?.[it.k]).length : 0
  const catches = catchLogsQ.data ?? []
  const totalKg = catches.reduce((a, c) => a + (c.quantityKg ?? 0), 0)
  const totalRevenue = catches.reduce((a, c) => a + (c.quantityKg ?? 0) * (c.estimatedPricePerKg ?? 0), 0)

  const speciesList = speciesQ.data ?? []

  return (
    <div className="page">
      {showStart && (
        <StartTripModal
          token={null}
          onCreated={() => { qc.invalidateQueries({ queryKey: ['trips'] }); setShowStart(false) }}
          onClose={() => setShowStart(false)}
        />
      )}
      {showAddCatch && t && (
        <AddCatchModal
          tripId={t.id}
          species={speciesList}
          onSaved={() => setShowAddCatch(false)}
          onClose={() => setShowAddCatch(false)}
        />
      )}
      {showEndTrip && t && (
        <EndTripModal
          trip={t}
          onEnded={() => setShowEndTrip(false)}
          onClose={() => setShowEndTrip(false)}
        />
      )}

      <div className="page__head">
        <div>
          <div className="eyebrow">Trips</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            <em>My</em> Trips
          </h1>
          <p className="page__sub">{(tripsQ.data ?? []).length} total logged</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Receipt size={14} /> Export log</button>
          {!activeTrip && (
            <button className="btn btn--primary" onClick={() => setShowStart(true)}>
              <I.Plus size={14} /> Start trip
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'active', label: 'Active', count: activeTrip ? 1 : 0 },
          { id: 'past',   label: 'Past',   count: pastTrips.length },
        ].map(x => (
          <button key={x.id}
            onClick={() => setTab(x.id)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: tab === x.id ? 'var(--ink)' : 'var(--ink-4)',
              borderBottom: tab === x.id ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {x.label}
            <span style={{
              marginLeft: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: tab === x.id ? 'var(--ink-3)' : 'var(--ink-4)',
            }}>{x.count}</span>
          </button>
        ))}
      </div>

      {tab === 'active' && (
        t ? (
          <div className="trips-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Active trip hero */}
              <div className="active-trip">
                <div className="active-trip__head">
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="chip chip--safe chip--dot">ACTIVE</span>
                      <span className="kbd">{`T-${t.id}`}</span>
                    </div>
                    <h2 className="active-trip__title" style={{ marginTop: 8 }}>{t.targetArea ?? 'Unnamed trip'}</h2>
                    <div className="active-trip__meta">
                      <span><I.Anchor size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{t.vesselName ?? '–'}</span>
                      <span><I.MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{t.targetArea ?? '–'}</span>
                      <span><I.Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                        Departed {new Date(t.startedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="active-trip__timer">
                      {String(durationH).padStart(2, '0')}:{String(durationM).padStart(2, '0')}:{String(durationS).padStart(2, '0')}
                      <small>elapsed</small>
                    </div>
                  </div>
                </div>

                <div className="active-trip__grid">
                  <div className="tile">
                    <div className="tile__label">Total catch</div>
                    <div className="tile__value">{totalKg.toFixed(1)}<small>kg</small></div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Est. value</div>
                    <div className="tile__value">₱{totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Entries</div>
                    <div className="tile__value">{catches.length}</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Duration</div>
                    <div className="tile__value">{durationH}h {durationM}m {durationS}s</div>
                  </div>
                </div>

                <div className="row" style={{ marginTop: 18, gap: 8 }}>
                  <button className="btn btn--accent" onClick={() => setShowAddCatch(true)}>
                    <I.Plus size={12} /> Log catch
                  </button>
                  {(() => {
                    const unalerted = catches.filter(c => !alertedLogIds.has(c.id))
                    const allPosted = catches.length > 0 && unalerted.length === 0
                    const label = postAlertsMut.isPending
                      ? 'Posting…'
                      : allPosted
                        ? 'All catches alerted'
                        : catches.length === 0
                          ? 'No catches yet'
                          : `Post ${unalerted.length} catch alert${unalerted.length !== 1 ? 's' : ''}`
                    return (
                      <button
                        className="btn"
                        onClick={() => postAlertsMut.mutate(unalerted)}
                        disabled={postAlertsMut.isPending || unalerted.length === 0}
                      >
                        <I.Bell size={12} /> {label}
                      </button>
                    )
                  })()}
                  <div className="spacer" />
                  <button className="btn btn--primary" onClick={() => setShowEndTrip(true)}>
                    End trip <I.Arrow size={12} />
                  </button>
                </div>
              </div>

              {/* Catch log */}
              <div className="card">
                <div className="card__head">
                  <div>
                    <div className="card__title">Catch log</div>
                    <div className="card__sub">{catches.length} entries · {totalKg.toFixed(1)}kg total</div>
                  </div>
                  <button className="btn btn--sm" onClick={() => setShowAddCatch(true)}>
                    <I.Plus size={12} /> Add entry
                  </button>
                </div>
                <div className="catch-log">
                  {catchLogsQ.isLoading && <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>Loading…</div>}
                  {catches.slice().reverse().map((c, i) => (
                    <div key={c.id ?? i} className="catch-entry" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="catch-entry__dot" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="catch-entry__species">{c.species?.commonName ?? '—'}</div>
                        <div className="catch-entry__meta">
                          {new Date(c.loggedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                          {c.quantityEstimate ? ` · ${c.quantityEstimate}` : ''}
                          {c.notes ? ` · ${c.notes}` : ''}
                        </div>
                      </div>
                      <div className="catch-entry__qty">{c.quantityKg ?? '–'}<small style={{ color: 'var(--ink-4)' }}>kg</small></div>
                      <div className="catch-entry__price">
                        {c.estimatedPricePerKg ? `₱${c.estimatedPricePerKg}` : '–'}<small>/kg</small>
                      </div>
                      <button
                        className="topbar__icon-btn"
                        title="Delete entry"
                        onClick={() => deleteCatchMut.mutate({ tripId: t.id, logId: c.id })}
                        disabled={deleteCatchMut.isPending}
                        style={{ color: 'var(--ink-4)' }}
                      >
                        <I.X size={12} />
                      </button>
                    </div>
                  ))}
                  {!catchLogsQ.isLoading && catches.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                      No catch entries yet. Tap "Add entry" to log your first catch.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Checklist */}
              <div className="card">
                <div className="card__head">
                  <div>
                    <div className="card__title">Pre-departure checklist</div>
                    <div className="card__sub">{checkedCount}/{CHECKLIST_DISPLAY.length} complete</div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 99,
                    background: `conic-gradient(var(--accent) ${(checkedCount / CHECKLIST_DISPLAY.length) * 360}deg, var(--line-soft) 0)`,
                    display: 'grid', placeItems: 'center',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 99, background: 'var(--surface)',
                      display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--ink-2)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {Math.round((checkedCount / CHECKLIST_DISPLAY.length) * 100)}%
                    </div>
                  </div>
                </div>
                <div className="check-list">
                  {CHECKLIST_DISPLAY.map(it => (
                    <div key={it.k} className={`check-item${t.checklist?.[it.k] ? ' check-item--on' : ''}`}>
                      <div className="check-item__box">
                        {t.checklist?.[it.k] && <I.Check size={10} />}
                      </div>
                      <span>{it.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>No active trip</div>
            <button className="btn btn--primary" onClick={() => setShowStart(true)}>
              <I.Plus size={14} /> Start a trip
            </button>
          </div>
        )
      )}

      {tab === 'past' && (
        <div>
          {pastTrips.map(tp => {
            const startDate = new Date(tp.startedAt)
            const day   = String(startDate.getDate()).padStart(2, '0')
            const month = startDate.toLocaleString('en-PH', { month: 'short' }).toUpperCase()
            let durationDisplay = '–'
            if (tp.startedAt && tp.endedAt) {
              const ms = new Date(tp.endedAt).getTime() - new Date(tp.startedAt).getTime()
              const h = Math.floor(ms / 3600000)
              const m = Math.floor((ms % 3600000) / 60000)
              durationDisplay = `${h}h ${m}m`
            }
            return (
              <div key={tp.id} className="trip-card">
                <div className="trip-card__date">
                  <div className="trip-card__month">{month}</div>
                  <div className="trip-card__day">{day}</div>
                </div>
                <div>
                  <div className="trip-card__name">{tp.targetArea ?? 'Unnamed trip'}</div>
                  <div className="trip-card__sub">{`T-${tp.id}`} · {tp.departurePoint ?? '–'}</div>
                </div>
                <div className="trip-card__stat">
                  <div className="v">{durationDisplay}</div>
                  <div className="l">Duration</div>
                </div>
                <div className="trip-card__stat">
                  <div className="v">–<small style={{ fontSize: 12, color: 'var(--ink-4)' }}>kg</small></div>
                  <div className="l">Catch</div>
                </div>
                <div className="trip-card__stat">
                  <div className="v">–</div>
                  <div className="l">Revenue</div>
                </div>
                <span className={`chip ${tp.status === 'CANCELLED' ? 'chip--unsafe' : 'chip--safe'} chip--dot`}>
                  {tp.status}
                </span>
              </div>
            )
          })}
          {pastTrips.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              No past trips yet.
            </div>
          )}
        </div>
      )}

    </div>
  )
}
