import { useState, useEffect, useMemo } from 'react'
import gsap from 'gsap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listTrips, startTrip, endTrip, saveChecklist, listCatchLogs, createCatchLog, deleteCatchLog } from './api/trips'
import { fetchAllConditions } from './api/marine'
import { fetchSpecies } from '../api/lookup'
import StartTripModal from '../components/StartTripModal'

const CHECKLIST_FIELDS = [
  { key: 'fuelChecked', label: 'Fuel topped off', desc: 'Sufficient fuel for the entire trip' },
  { key: 'engineChecked', label: 'Engine check', desc: 'Engine checked and running properly' },
  { key: 'radioChecked', label: 'Radio comms OK', desc: 'Communication radio is operational' },
  { key: 'lifeVestChecked', label: 'Life vests for all crew', desc: 'Life vests available for all crew' },
  { key: 'weatherReviewed', label: 'Weather briefed', desc: 'Current weather forecast reviewed' },
  { key: 'emergencyKitChecked', label: 'Emergency kit on board', desc: 'Emergency kit and first-aid on board' },
]

const PAGE_SIZE = 10

function TripTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const h = Math.floor(elapsed / 3600000)
  const m = Math.floor((elapsed % 3600000) / 60000)
  const s = Math.floor((elapsed % 60000) / 1000)
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--font-code)', fontSize: 32, fontWeight: 600, color: 'var(--accent-lime)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 }}>Elapsed</div>
    </div>
  )
}

function Pager({ page, total, onPage }) {
  if (total <= 1) return null
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="pager__info">{page} of {total}</span>
      <button className="pager__btn" disabled={page >= total} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

export default function TripsPage() {
  const [tab, setTab] = useState('active')
  const [modal, setModal] = useState(null)
  const [tripForm, setTripForm] = useState({ departurePoint: '', targetArea: '', vesselName: '', notes: '' })
  const [createdTripId, setCreatedTripId] = useState(null)
  const [checkedItems, setCheckedItems] = useState([])
  const [formError, setFormError] = useState(null)
  const [pastPage, setPastPage] = useState(1)
  const [catchForm, setCatchForm] = useState({ speciesId: '', quantityKg: '', pricePerKg: '', notes: '' })
  const [catchSubmitAttempted, setCatchSubmitAttempted] = useState(false)
  const [endTripNotes, setEndTripNotes] = useState('')
  const qc = useQueryClient()

  const tripsQ = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })
  const trips = tripsQ.data ?? []
  const activeTrip = trips.find(t => t.status === 'ACTIVE')
  const pastTrips = trips.filter(t => t.status !== 'ACTIVE')

  const catchLogsQ = useQuery({
    queryKey: ['trips', activeTrip?.id, 'catches'],
    queryFn: () => listCatchLogs(activeTrip.id),
    enabled: !!activeTrip,
  })
  const catchLogs = catchLogsQ.data ?? []

  const municipality = activeTrip?.departurePoint?.split(',').pop()?.trim()

  const conditionsQ = useQuery({ queryKey: ['marine', 'conditions'], queryFn: fetchAllConditions })
  const zones = useMemo(() => {
    if (!conditionsQ.data || !Array.isArray(conditionsQ.data.zones)) return []
    return conditionsQ.data.zones.map(z => ({
      id: z.id,
      name: z.zoneName,
      region: z.region,
      riskLevel: z.risk?.level,
      advisory: z.risk?.advisory,
      waveHeightM: z.marine?.waveHeightM,
      swellHeightM: z.marine?.swellHeightM,
      windSpeedKmh: z.weather?.windSpeedKmh,
      windGustsKmh: z.weather?.windGustsKmh,
      temperatureC: z.weather?.temperatureC,
      precipitationMm: z.weather?.precipitationMm,
    }))
  }, [conditionsQ.data])

  const zone = activeTrip ? (zones.find(z => z.region === municipality || z.name.includes(municipality)) ?? zones[0]) : null

  const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

  useEffect(() => {
    if (!modal) return
    gsap.fromTo('.f-modal-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.12 })
    gsap.fromTo('.f-modal', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' })
  }, [modal])

  const totalKg = useMemo(() => catchLogs.reduce((s, c) => s + (c.quantityKg ?? 0), 0), [catchLogs])
  const totalRev = useMemo(() => catchLogs.reduce((s, c) => s + (c.quantityKg ?? 0) * (c.estimatedPricePerKg ?? 0), 0), [catchLogs])
  const uniqueSpeciesCount = useMemo(() => new Set(catchLogs.map(c => c.speciesId ?? c.species?.id)).size, [catchLogs])

  const catchRateKgH = useMemo(() => {
    if (!activeTrip?.startedAt || totalKg === 0) return 0
    // eslint-disable-next-line react-hooks/purity
    const h = (Date.now() - new Date(activeTrip.startedAt).getTime()) / 3600000
    // Use a minimum of 1 hour for the rate calculation to prevent huge spikes right after starting the trip
    return totalKg / Math.max(1, h)
  }, [totalKg, activeTrip?.startedAt])

  const startMut = useMutation({
    mutationFn: () => startTrip(tripForm),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      setCreatedTripId(result.id)
      setCheckedItems([])
      setModal('checklist')
      setFormError(null)
    },
    onError: (e) => setFormError(e.message),
  })

  const checklistMut = useMutation({
    mutationFn: () => saveChecklist(createdTripId, { items: checkedItems }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      setModal(null)
      setTripForm({ departurePoint: '', targetArea: '', vesselName: '', notes: '' })
      setCreatedTripId(null)
      setCheckedItems([])
    },
    onError: (e) => setFormError(e.message),
  })

  const endMut = useMutation({
    mutationFn: () => endTrip(activeTrip.id, { notes: endTripNotes.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['catchAlerts', 'own'] })
      setModal(null)
      setEndTripNotes('')
    },
  })

  const addCatchMut = useMutation({
    mutationFn: () => {
      const qty = Number(catchForm.quantityKg)
      return createCatchLog(activeTrip.id, {
        speciesId: Number(catchForm.speciesId),
        quantityEstimate: `${qty}kg`,
        quantityKg: qty,
        estimatedPricePerKg: Number(catchForm.pricePerKg),
        notes: catchForm.notes?.trim() || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', activeTrip.id, 'catches'] })
      setModal(null)
      setCatchForm({ speciesId: '', quantityKg: '', pricePerKg: '', notes: '' })
      setCatchSubmitAttempted(false)
    },
  })

  const deleteCatchMut = useMutation({
    mutationFn: ({ logId }) => deleteCatchLog(activeTrip.id, logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', activeTrip?.id, 'catches'] }),
  })



  const totalPastPages = Math.max(1, Math.ceil(pastTrips.length / PAGE_SIZE))
  const pagedPast = pastTrips.slice((pastPage - 1) * PAGE_SIZE, pastPage * PAGE_SIZE)

  const catchValid = catchForm.speciesId && Number(catchForm.quantityKg) >= 0.1 && Number(catchForm.pricePerKg) >= 0 && catchForm.pricePerKg !== ''

  const riskColor = (r) => r === 'UNSAFE' ? 'var(--unsafe)' : r === 'CAUTION' ? 'var(--caution)' : 'var(--safe)'
  const riskChip = (r) => r === 'UNSAFE' ? 'chip--unsafe' : r === 'CAUTION' ? 'chip--caution' : 'chip--safe'

  return (
    <div className="fade-in" style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Operations · {trips.length} logged</div>
          <h1 className="page__title">My <em className="chip-lime">Trips</em></h1>
          <p className="page__sub">Track active voyages, pre-departure checklist, and historical hauls.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><I.Note size={12} /> Export log</button>
          {!activeTrip && (
            <button className="btn btn--lime" onClick={() => { setFormError(null); setModal('start') }}>
              <I.Plus size={12} /> Start New Trip
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tabs__item${tab === 'active' ? ' tabs__item--on' : ''}`} onClick={() => setTab('active')}>
          Active <span className="tabs__item-count">{activeTrip ? 1 : 0}</span>
        </button>
        <button className={`tabs__item${tab === 'past' ? ' tabs__item--on' : ''}`} onClick={() => setTab('past')}>
          Past <span className="tabs__item-count">{pastTrips.length}</span>
        </button>
      </div>

      {tab === 'active' && (
        <>
          {!activeTrip && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(194,239,78,0.08)', border: '1.5px dashed rgba(194,239,78,0.35)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--accent-lime)' }}>
                <I.Anchor size={22} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>No active trip</div>
              <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: '0 0 16px' }}>Start a trip to begin logging your catch.</p>
              <button className="btn btn--lime" onClick={() => { setFormError(null); setModal('start') }}>
                <I.Plus size={12} /> Start New Trip
              </button>
            </div>
          )}

          {activeTrip && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {/* Active trip hero */}
                <div className="card" style={{ background: 'radial-gradient(ellipse 60% 50% at 0% 0%, rgba(106,95,193,0.22), transparent 60%), var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span className="chip chip--lime"><span className="chip__dot" />ACTIVE</span>
                        <kbd>{activeTrip.id ? `TRP-${activeTrip.id}` : '—'}</kbd>
                      </div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>
                        {municipality || 'Unknown area'}
                      </h2>
                      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink-4)', marginTop: 6, flexWrap: 'wrap' }}>
                        {activeTrip.vesselName && <span><I.Anchor size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{activeTrip.vesselName}</span>}
                        {activeTrip.departurePoint && <span><I.MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{activeTrip.departurePoint}</span>}
                        {activeTrip.startedAt && (
                          <span>
                            <I.Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                            Departed {new Date(activeTrip.startedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {activeTrip.startedAt && <TripTimer startedAt={activeTrip.startedAt} />}
                  </div>

                  {/* 4-KPI grid */}
                  <div className="grid--kpi" style={{ marginBottom: 18 }}>
                    <div className="kpi">
                      <div className="kpi__label"><I.Fish size={11} /> Total catch</div>
                      <div className="kpi__value">{totalKg.toFixed(1)}<small>kg</small></div>
                      <div className="kpi__foot">{catchLogs.length} entries</div>
                    </div>
                    <div className="kpi">
                      <div className="kpi__label"><I.Wallet size={11} /> Est. value</div>
                      <div className="kpi__value">₱{(totalRev / 1000).toFixed(1)}<small>k</small></div>
                      <div className="kpi__foot">at logged prices</div>
                    </div>
                    <div className="kpi">
                      <div className="kpi__label"><I.Trend size={11} /> Catch rate</div>
                      <div className="kpi__value">{catchRateKgH.toFixed(1)}<small>kg/h</small></div>
                      <div className="kpi__foot">this trip</div>
                    </div>
                    <div className="kpi">
                      <div className="kpi__label"><I.Compass size={11} /> Species</div>
                      <div className="kpi__value">{uniqueSpeciesCount}</div>
                      <div className="kpi__foot">logged this trip</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--lime" onClick={() => setModal('addCatch')}>
                      <I.Plus size={12} /> Log catch
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      className="btn btn--sm"
                      style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', borderColor: 'rgba(251,113,133,0.3)' }}
                      onClick={() => { setEndTripNotes(''); setModal('endTrip') }}
                      disabled={endMut.isPending}
                    >
                      {endMut.isPending ? 'Ending…' : <>End trip <I.Arrow size={11} /></>}
                    </button>
                  </div>
                </div>

                {/* Catch log table */}
                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">Catch log</div>
                      <div className="card__sub">{catchLogs.length} entries · {totalKg.toFixed(1)}kg total · est. ₱{totalRev.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</div>
                    </div>
                  </div>
                  {catchLogs.length === 0 ? (
                    <div className="empty">No catch logged yet. Start by logging your first catch.</div>
                  ) : (
                    <table className="tbl">
                      <thead>
                        <tr><th>Time</th><th>Species</th><th>Qty</th><th>₱/kg</th><th>Value</th><th>Notes</th><th></th></tr>
                      </thead>
                      <tbody>
                        {[...catchLogs].reverse().map(c => (
                          <tr key={c.id}>
                            <td className="mono" style={{ color: 'var(--ink-3)' }}>
                              {c.loggedAt ? new Date(c.loggedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td><strong>{c.species?.commonName ?? c.speciesName ?? '—'}</strong></td>
                            <td className="mono">{c.quantityKg != null ? `${c.quantityKg}kg` : (c.quantityEstimate ?? '—')}</td>
                            <td className="mono">{c.estimatedPricePerKg != null ? `₱${c.estimatedPricePerKg}` : '—'}</td>
                            <td className="mono"><strong>{c.quantityKg != null && c.estimatedPricePerKg != null ? `₱${(c.quantityKg * c.estimatedPricePerKg).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '—'}</strong></td>
                            <td style={{ fontSize: 11, color: 'var(--ink-4)' }}>{c.notes || '—'}</td>
                            <td>
                              <button
                                className="f-topbar__icon-btn"
                                style={{ width: 28, height: 28 }}
                                onClick={() => deleteCatchMut.mutate({ logId: c.id })}
                                disabled={deleteCatchMut.isPending}
                              >
                                <I.X size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {/* Checklist */}
                {(() => {
                  const currentCheckedCount = activeTrip ? CHECKLIST_FIELDS.filter(f => activeTrip.checklist?.[f.key]).length : 0
                  return (
                    <div className="card">
                      <div className="card__head">
                        <div>
                          <div className="card__title">Pre-departure checklist</div>
                          <div className="card__sub">{currentCheckedCount}/{CHECKLIST_FIELDS.length} complete</div>
                        </div>
                        <div style={{ position: 'relative', width: 44, height: 44 }}>
                          <svg width="44" height="44" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent-lime)" strokeWidth="3"
                              strokeDasharray={`${(currentCheckedCount / CHECKLIST_FIELDS.length) * 113.1} 113.1`}
                              strokeDashoffset="0" transform="rotate(-90 22 22)" strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-code)', fontSize: 10, fontWeight: 700, color: 'var(--accent-lime)' }}>
                            {Math.round((currentCheckedCount / CHECKLIST_FIELDS.length) * 100)}%
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {CHECKLIST_FIELDS.map(it => {
                          const on = activeTrip?.checklist?.[it.key]
                          return (
                            <div key={it.key} className={`f-checklist-item${on ? ' f-checklist-item--on' : ''}`} style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--hairline)', cursor: 'default' }}>
                              <div className="f-checklist-item__box">{on && <I.Check size={10} />}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--ink-1)' : 'var(--ink-2)' }}>{it.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{it.desc}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Zone conditions */}
                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">Zone conditions</div>
                      <div className="card__sub">{activeTrip.targetArea ?? zone?.zoneName ?? 'Current zone'}</div>
                    </div>
                    {zone && <span className={`chip ${riskChip(zone.riskLevel)}`}><span className="chip__dot" />{zone.riskLevel ?? 'SAFE'}</span>}
                  </div>
                  {!zone ? (
                    <div className="empty" style={{ padding: '20px 0' }}>Conditions unavailable</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="kpi">
                        <div className="kpi__label"><I.Wave size={10} /> Wave</div>
                        <div className="kpi__value" style={{ fontSize: 18 }}>{zone.waveHeightM?.toFixed(1) ?? '—'}<small>m</small></div>
                      </div>
                      <div className="kpi">
                        <div className="kpi__label"><I.Wind size={10} /> Wind</div>
                        <div className="kpi__value" style={{ fontSize: 18 }}>{zone.windSpeedKmh?.toFixed(0) ?? '—'}<small>km/h</small></div>
                      </div>
                      <div className="kpi">
                        <div className="kpi__label"><I.Wind size={10} /> Gusts</div>
                        <div className="kpi__value" style={{ fontSize: 18 }}>{zone.windGustsKmh?.toFixed(0) ?? '—'}<small>km/h</small></div>
                      </div>
                      <div className="kpi">
                        <div className="kpi__label"><I.Shield size={10} /> Risk</div>
                        <div className="kpi__value" style={{ fontSize: 18, color: riskColor(zone.riskLevel) }}>{zone.riskLevel ?? '—'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'past' && (
        <>
          {pastTrips.length === 0 ? (
            <div className="empty">No past trips yet.</div>
          ) : (
            <>
              <div className="card card--flush">
                <table className="tbl">
                  <thead>
                    <tr><th>Date</th><th>Trip</th><th>Vessel / Port</th><th>Duration</th><th>Catch</th><th>Revenue</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {pagedPast.map(p => {
                      const durationMs = p.startedAt && p.endedAt ? new Date(p.endedAt) - new Date(p.startedAt) : null
                      const dH = durationMs != null ? Math.floor(durationMs / 3600000) : null
                      const dM = durationMs != null ? Math.floor((durationMs % 3600000) / 60000) : null
                      return (
                        <tr key={p.id}>
                          <td><strong>{p.startedAt ? new Date(p.startedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}</strong></td>
                          <td><kbd>TRP-{p.id}</kbd> <span style={{ marginLeft: 8 }}>{p.targetArea ?? '—'}</span></td>
                          <td style={{ color: 'var(--ink-3)' }}>{[p.vesselName, p.departurePoint].filter(Boolean).join(' / ') || '—'}</td>
                          <td className="mono">{dH != null ? `${dH}h ${dM}m` : '—'}</td>
                          <td className="mono">{p.totalCatchKg != null ? `${p.totalCatchKg}kg` : '—'}</td>
                          <td className="mono">{p.totalRevenue != null ? `₱${Number(p.totalRevenue).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '—'}</td>
                          <td><span className={`chip ${p.status === 'ENDED' ? 'chip--safe' : p.status === 'CANCELLED' ? 'chip--unsafe' : 'chip--muted'}`}><span className="chip__dot" />{p.status}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={pastPage} total={totalPastPages} onPage={setPastPage} />
            </>
          )}
        </>
      )}

      {modal === 'start' && (
        <StartTripModal
          initialStatus="ACTIVE"
          onCreated={() => {
            setModal(null)
            qc.invalidateQueries({ queryKey: ['trips'] })
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal && modal !== 'start' && (
        <div
          className="f-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModal(null)
              setCatchSubmitAttempted(false)
              setEndTripNotes('')
            }
          }}
        >
          <div className="f-modal f-modal--wide">
            {modal === 'addCatch' && (() => {
              const qtyNum = Number(catchForm.quantityKg)
              const priceNum = Number(catchForm.pricePerKg)
              const errSpecies = !catchForm.speciesId ? 'Select a species.' : null
              const errQty = !catchForm.quantityKg
                ? 'Enter the quantity in kg.'
                : (Number.isNaN(qtyNum) || qtyNum < 0.1) ? 'Quantity must be at least 0.1 kg.' : null
              const errPrice = catchForm.pricePerKg === ''
                ? 'Enter the estimated price per kg.'
                : (Number.isNaN(priceNum) || priceNum < 0) ? 'Price must be 0 or greater.' : null
              const showErrors = catchSubmitAttempted
              const fieldErrStyle = { color: 'var(--unsafe)', fontSize: 11, marginTop: 4 }
              return (
                <>
                  <div className="f-modal__title">Log Catch</div>
                  {addCatchMut.isError && (
                    <div style={{
                      background: 'var(--unsafe-soft)', color: 'var(--unsafe)',
                      border: '1px solid rgba(251,113,133,0.3)', borderRadius: 8,
                      padding: '10px 12px', fontSize: 12, marginBottom: 12,
                    }}>
                      {addCatchMut.error?.message || 'Could not save catch. Please try again.'}
                    </div>
                  )}
                  <div className="f-field">
                    <label className="f-label">Species</label>
                    <select className="f-input" value={catchForm.speciesId} onChange={e => setCatchForm(f => ({ ...f, speciesId: e.target.value }))}>
                      <option value="">Select…</option>
                      {(speciesQ.data ?? []).map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
                    </select>
                    {showErrors && errSpecies && <div style={fieldErrStyle}>{errSpecies}</div>}
                  </div>
                  <div className="f-field">
                    <label className="f-label">Quantity (kg)</label>
                    <input className="f-input" type="number" min="0.1" step="0.01" value={catchForm.quantityKg}
                      onChange={e => setCatchForm(f => ({ ...f, quantityKg: e.target.value }))} />
                    {showErrors && errQty && <div style={fieldErrStyle}>{errQty}</div>}
                  </div>
                  <div className="f-field">
                    <label className="f-label">Price per kg (₱)</label>
                    <input className="f-input" type="number" min="0" step="0.01" value={catchForm.pricePerKg}
                      onChange={e => setCatchForm(f => ({ ...f, pricePerKg: e.target.value }))} />
                    {showErrors && errPrice && <div style={fieldErrStyle}>{errPrice}</div>}
                  </div>
                  <div className="f-field">
                    <label className="f-label">Notes</label>
                    <input className="f-input" maxLength={500} value={catchForm.notes}
                      onChange={e => setCatchForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="btn btn--ghost" onClick={() => { setModal(null); setCatchSubmitAttempted(false) }}>Cancel</button>
                    <button className="btn btn--lime" disabled={addCatchMut.isPending} onClick={() => {
                      setCatchSubmitAttempted(true)
                      if (catchValid) addCatchMut.mutate()
                    }}>
                      {addCatchMut.isPending ? 'Saving…' : 'Save Catch'}
                    </button>
                  </div>
                </>
              )
            })()}

            {modal === 'endTrip' && (
              <>
                <div className="f-modal__title">End Trip</div>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 14px' }}>
                  End <strong style={{ color: 'var(--ink-1)' }}>{activeTrip?.targetArea ?? municipality ?? 'this trip'}</strong>? The trip will be marked as Completed.
                </p>

                {catchLogs.length > 0 ? (
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: 'rgba(194,239,78,0.06)',
                    border: '1px solid rgba(194,239,78,0.25)',
                    marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent-lime)' }}>
                      <I.Bell size={11} /> Vendors will be notified
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                      {catchLogs.length} catch alert{catchLogs.length !== 1 ? 's' : ''} will be posted ({totalKg.toFixed(1)} kg total) — expires in 4 hours.
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                      {[...new Set(catchLogs.map(c => c.species?.commonName ?? c.speciesName).filter(Boolean))].join(', ') || '—'}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--bg-card)', border: '1px dashed var(--hairline)',
                    fontSize: 12, color: 'var(--ink-3)', marginBottom: 14,
                  }}>
                    No catches logged — no vendor alerts will be posted.
                  </div>
                )}

                <div className="f-field">
                  <label className="f-label">Notes (optional)</label>
                  <textarea
                    className="f-input"
                    style={{ resize: 'vertical', minHeight: 80 }}
                    placeholder="Any notes about this trip…"
                    value={endTripNotes}
                    onChange={e => setEndTripNotes(e.target.value)}
                    maxLength={500}
                  />
                </div>

                {endMut.isError && (
                  <div style={{
                    background: 'var(--unsafe-soft)', color: 'var(--unsafe)',
                    border: '1px solid rgba(251,113,133,0.3)', borderRadius: 8,
                    padding: '10px 12px', fontSize: 12, marginTop: 12,
                  }}>
                    {endMut.error?.message || 'Could not end trip. Please try again.'}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn--ghost" onClick={() => { setModal(null); setEndTripNotes('') }} disabled={endMut.isPending}>
                    Cancel
                  </button>
                  <button
                    className="btn btn--sm"
                    style={{ background: 'var(--unsafe-soft)', color: 'var(--unsafe)', borderColor: 'rgba(251,113,133,0.3)' }}
                    onClick={() => endMut.mutate()}
                    disabled={endMut.isPending}
                  >
                    {endMut.isPending ? 'Ending…' : <>Confirm End Trip <I.Arrow size={11} /></>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AddCatchModal({ tripId, species, onSaved, onClose }) {
  const [speciesId, setSpeciesId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const saveMut = useMutation({
    mutationFn: () => {
      const qty = Number(quantity)
      return createCatchLog(tripId, {
        speciesId: Number(speciesId),
        quantityEstimate: `${qty}kg`,
        quantityKg: qty,
        estimatedPricePerKg: Number(price),
        notes: notes?.trim() || null,
      })
    },
    onSuccess: () => { onSaved?.() },
  })
  const isValid = speciesId && Number(quantity) > 0 && Number(price) > 0
  return (
    <div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-species">Species</label>
        <select id="acm-species" className="f-input" value={speciesId} onChange={e => setSpeciesId(e.target.value)}>
          <option value="">Select…</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
        </select>
      </div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-qty">Quantity (kg)</label>
        <input id="acm-qty" className="f-input" type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
      </div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-price">Price per kg (₱)</label>
        <input id="acm-price" className="f-input" type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      <div className="f-field">
        <label className="f-label" htmlFor="acm-notes">Notes</label>
        <input id="acm-notes" className="f-input" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn--lime" disabled={!isValid || saveMut.isPending} onClick={() => saveMut.mutate()}>
          Save Catch
        </button>
      </div>
    </div>
  )
}
