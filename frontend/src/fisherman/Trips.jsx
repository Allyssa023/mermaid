import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTrips, getTrip, startTrip, endTrip, saveChecklist,
         listCatchLogs, createCatchLog, updateCatchLog, deleteCatchLog } from './api/trips'
import { fetchSpecies } from '../api/lookup.js'
import { TableRowSkeleton, CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const [tab, setTab] = useState('active')
  const qc = useQueryClient()

  const tripsQ   = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })
  const speciesQ = useQuery({ queryKey: ['species'], queryFn: fetchSpecies })

  const activeTrip   = (tripsQ.data ?? []).find(t => t.status === 'ACTIVE') ?? null
  const pastTrips    = (tripsQ.data ?? []).filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED')
  const plannedTrips = (tripsQ.data ?? []).filter(t => t.status === 'PLANNED')

  const catchLogsQ = useQuery({
    queryKey: ['catchLogs', activeTrip?.id],
    queryFn: () => listCatchLogs(activeTrip.id),
    enabled: !!activeTrip,
  })

  if (tripsQ.isLoading) return <div className="page"><CardSkeleton /><TableRowSkeleton /></div>
  if (tripsQ.error) return <div className="page"><ApiError error={tripsQ.error} onRetry={tripsQ.refetch} /></div>

  const t = activeTrip

  const checklistItems = [
    { k: 'fuel',         label: 'Fuel topped off' },
    { k: 'engine',       label: 'Engine check' },
    { k: 'radio',        label: 'Radio comms OK' },
    { k: 'lifeVest',     label: 'Life vests (x4)' },
    { k: 'weather',      label: 'Weather briefed' },
    { k: 'emergencyKit', label: 'Emergency kit' },
    { k: 'ice',          label: 'Ice & cooler loaded' },
    { k: 'bait',         label: 'Bait & lures' },
  ]
  const checkedCount = t ? checklistItems.filter(it => t.checklist?.[it.k]).length : 0

  const catches = catchLogsQ.data ?? []
  const totalKg = catches.reduce((a, c) => a + (c.quantityKg ?? 0), 0)
  const totalRevenue = catches.reduce((a, c) => a + (c.quantityKg ?? 0) * (c.estimatedPricePerKg ?? 0), 0)

  const elapsed = t ? Date.now() - new Date(t.startedAt).getTime() : 0
  const durationH = Math.floor(elapsed / 3600000)
  const durationM = Math.floor((elapsed % 3600000) / 60000)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Trips</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            <em>My</em> Trips
          </h1>
          <p className="page__sub">
            {(tripsQ.data ?? []).length} total logged
          </p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Receipt size={14} /> Export log</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Start trip</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'active',  label: 'Active',  count: activeTrip ? 1 : 0 },
          { id: 'planned', label: 'Planned', count: plannedTrips.length },
          { id: 'past',    label: 'Past',    count: pastTrips.length },
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
                    <div className="row" style={{gap: 8}}>
                      <span className="chip chip--safe chip--dot">ACTIVE</span>
                      <span className="kbd">{`T-${t.id}`}</span>
                    </div>
                    <h2 className="active-trip__title" style={{marginTop: 8}}>{t.targetArea ?? 'Unnamed trip'}</h2>
                    <div className="active-trip__meta">
                      <span><I.Anchor size={11} style={{verticalAlign:-1, marginRight:4}} /> {t.vesselName ?? '–'}</span>
                      <span><I.MapPin size={11} style={{verticalAlign:-1, marginRight:4}} /> {t.targetArea ?? '–'}</span>
                      <span><I.Clock size={11} style={{verticalAlign:-1, marginRight:4}} /> Departed {new Date(t.startedAt).toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="active-trip__timer">
                      {String(durationH).padStart(2,'0')}:{String(durationM).padStart(2,'0')}
                      <small>elapsed</small>
                    </div>
                  </div>
                </div>

                <div className="active-trip__grid">
                  <div className="tile">
                    <div className="tile__label">Distance</div>
                    <div className="tile__value">–</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Total catch</div>
                    <div className="tile__value">{totalKg.toFixed(1)}<small>kg</small></div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Est. value</div>
                    <div className="tile__value">₱{totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Fuel left</div>
                    <div className="tile__value">–</div>
                  </div>
                </div>

                <div className="row" style={{marginTop: 18, gap: 8}}>
                  <button className="btn btn--accent"><I.Plus size={12} /> Log catch</button>
                  <button className="btn"><I.Bell size={12} /> Post catch alert</button>
                  <button className="btn"><I.MapPin size={12} /> Share location</button>
                  <div className="spacer" />
                  <button className="btn btn--primary">End trip <I.Arrow size={12} /></button>
                </div>
              </div>

              {/* Catch log */}
              <div className="card">
                <div className="card__head">
                  <div>
                    <div className="card__title">Catch log</div>
                    <div className="card__sub">{catches.length} entries · {totalKg.toFixed(1)}kg total</div>
                  </div>
                  <button className="btn btn--sm"><I.Plus size={12} /> Add entry</button>
                </div>
                <div className="catch-log">
                  {catches.slice().reverse().map((c, i) => (
                    <div key={c.id ?? i} className="catch-entry">
                      <div className="catch-entry__dot" />
                      <div>
                        <div className="catch-entry__species">{c.species?.commonName}</div>
                        <div className="catch-entry__meta">
                          {new Date(c.loggedAt).toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'})}
                          {c.quantityEstimate ? ` · ${c.quantityEstimate}` : ''}
                          {c.notes ? ` · ${c.notes}` : ''}
                        </div>
                      </div>
                      <div className="catch-entry__qty">{c.quantityKg ?? 0}<small style={{color:'var(--ink-4)'}}>kg</small></div>
                      <div className="catch-entry__price">₱{c.estimatedPricePerKg ?? 0}<small>/kg</small></div>
                    </div>
                  ))}
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
                    <div className="card__sub">{checkedCount}/{checklistItems.length} complete</div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 99,
                    background: `conic-gradient(var(--accent) ${(checkedCount/checklistItems.length)*360}deg, var(--line-soft) 0)`,
                    display: 'grid', placeItems: 'center',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 99, background: 'var(--surface)',
                      display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--ink-2)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {Math.round((checkedCount/checklistItems.length)*100)}%
                    </div>
                  </div>
                </div>
                <div className="check-list">
                  {checklistItems.map(it => (
                    <div key={it.k} className={`check-item${t.checklist?.[it.k] ? ' check-item--on' : ''}`}>
                      <div className="check-item__box">
                        {t.checklist?.[it.k] && <I.Check size={10} />}
                      </div>
                      <span>{it.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current conditions */}
              <div className="card">
                <div className="card__title">Right now at {t.targetArea ?? '–'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="tile">
                    <div className="tile__label">Wave</div>
                    <div className="tile__value">0.8<small>m</small></div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Wind</div>
                    <div className="tile__value">12<small>km/h SW</small></div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Water</div>
                    <div className="tile__value">26<small>°C</small></div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Visibility</div>
                    <div className="tile__value">8<small>km</small></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="card" style={{padding:32, textAlign:'center', color:'var(--ink-3)'}}>No active trip</div>
        )
      )}

      {tab === 'past' && (
        <div>
          {pastTrips.map(tp => {
            const startDate = new Date(tp.startedAt)
            const day = String(startDate.getDate()).padStart(2, '0')
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
                  <div className="trip-card__sub">{`T-${tp.id}`} · {tp.targetArea ?? '–'}</div>
                </div>
                <div className="trip-card__stat">
                  <div className="v">{durationDisplay}</div>
                  <div className="l">Duration</div>
                </div>
                <div className="trip-card__stat">
                  <div className="v">–<small style={{fontSize: 12, color: 'var(--ink-4)'}}>kg</small></div>
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
        </div>
      )}

      {tab === 'planned' && (
        <div>
          {plannedTrips.map(tp => {
            const startDate = new Date(tp.startedAt)
            const day = String(startDate.getDate()).padStart(2, '0')
            const month = startDate.toLocaleString('en-PH', { month: 'short' }).toUpperCase()
            return (
              <div key={tp.id} className="trip-card">
                <div className="trip-card__date">
                  <div className="trip-card__month">{month}</div>
                  <div className="trip-card__day">{day}</div>
                </div>
                <div>
                  <div className="trip-card__name">{tp.targetArea ?? 'Unnamed trip'}</div>
                  <div className="trip-card__sub">{`T-${tp.id}`} · {tp.targetArea ?? '–'}</div>
                </div>
                <span className="chip chip--accent chip--dot">PLANNED</span>
                <button className="btn btn--sm">Edit</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
