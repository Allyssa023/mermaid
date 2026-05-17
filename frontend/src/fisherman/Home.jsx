import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { useAuth } from '../context/AuthContext'
import { fetchAllConditions, fetchAdvisories } from './api/marine'
import { listTrips, listCatchLogs } from './api/trips'
import { listProcurementOrders } from './api/procurement'
import { CardSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

// ── Helpers ───────────────────────────────────────────────────────────────────

function degToCompass(deg) {
  if (deg == null) return '—'
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function RiskDot({ risk }) {
  return <span className={`chip chip--dot chip--${risk}`} />
}

// ── Home page ─────────────────────────────────────────────────────────────────

export default function FishermanHomePage({ setPage, onStartTrip }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [selectedZoneIdx, setSelectedZoneIdx] = useState(0)
  const condQ  = useQuery({ queryKey: ['marine', 'conditions'], queryFn: () => fetchAllConditions() })
  const advQ   = useQuery({ queryKey: ['advisories', 'active'], queryFn: () => fetchAdvisories(true) })
  const procQ  = useQuery({ queryKey: ['fisherman', 'procurement', 'active'], queryFn: () => listProcurementOrders() })
  const tripsQ = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })

  const activeTrip = (tripsQ.data ?? []).find(t => t.status === 'ACTIVE') ?? null

  const catchLogsQ = useQuery({
    queryKey: ['catchLogs', activeTrip?.id],
    queryFn: () => listCatchLogs(activeTrip.id),
    enabled: !!activeTrip,
  })

  const startedAt = activeTrip?.startedAt ?? null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  useEffect(() => {
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['marine', 'conditions'] })
      qc.invalidateQueries({ queryKey: ['advisories', 'active'] })
      qc.invalidateQueries({ queryKey: ['fisherman', 'procurement', 'active'] })
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['catchLogs'] })
    }, 30000)
    return () => clearInterval(id)
  }, [qc])

  const { durationH, durationM, durationS } = useMemo(() => {
    if (!startedAt) return { durationH: 0, durationM: 0, durationS: 0 }
    const elapsed = Math.max(0, now - new Date(startedAt).getTime())
    return {
      durationH: Math.floor(elapsed / 3600000),
      durationM: Math.floor((elapsed % 3600000) / 60000),
      durationS: Math.floor((elapsed % 60000) / 1000),
    }
  }, [startedAt, now])

  if (condQ.isLoading) return <div className="page"><CardSkeleton /><CardSkeleton /></div>
  if (condQ.error)     return <div className="page"><ApiError error={condQ.error} onRetry={condQ.refetch} /></div>

  // ── Marine conditions ──────────────────────────────────────────────────────
  const zones = condQ.data?.zones ?? []
  const activeZoneIdx = Math.min(selectedZoneIdx, Math.max(0, zones.length - 1))
  const zone = zones[activeZoneIdx] ?? {}

  const waveH       = zone.marine?.waveHeightM ?? 0
  const swellH      = zone.marine?.swellHeightM ?? null
  const swellPeriod = zone.marine?.swellPeriodS ?? null
  const windSpeed   = zone.weather?.windSpeedKmh ?? 0
  const windDir     = degToCompass(zone.weather?.windDirectionDeg)
  const windGust    = zone.weather?.windGustsKmh ?? 0
  const rain        = zone.weather?.precipitationMm ?? 0
  const temp        = zone.weather?.temperatureC ?? 0
  const cloud       = zone.weather?.cloudCoverPct ?? 0
  const riskLevel   = (zone.risk?.level ?? 'SAFE').toLowerCase()
  const zoneAdvisory = zone.risk?.advisory ?? ''
  const zoneName    = zone.zoneName ?? ''
  const zoneRegion  = zone.region ?? ''

  const safeZones    = zones.filter(z => z.risk?.level === 'SAFE').length
  const cautionZones = zones.filter(z => z.risk?.level === 'CAUTION').length
  const avgWave      = zones.length ? +(zones.reduce((s, z) => s + (z.marine?.waveHeightM ?? 0), 0) / zones.length).toFixed(1) : 0
  const maxWind      = zones.length ? Math.max(...zones.map(z => z.weather?.windGustsKmh ?? 0)) : 0

  const overallTone  = zones.some(z => z.risk?.level === 'UNSAFE') ? 'unsafe'
                     : zones.some(z => z.risk?.level === 'CAUTION') ? 'caution'
                     : 'safe'
  const riskLabels   = { safe: 'Favorable', caution: 'Manageable', unsafe: 'Dangerous' }
  const riskLabel    = riskLabels[overallTone] ?? 'Unknown'
  const riskMsg      = overallTone === 'safe'    ? 'Conditions are favorable. Safe to fish.'
                     : overallTone === 'caution' ? 'Conditions are workable. Exercise caution.'
                     : 'Dangerous conditions. Avoid fishing.'
  const asOf         = condQ.data?.generatedAt
                       ? new Date(condQ.data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                       : '—'

  const apiAdvisories = advQ.data ?? []
  const advisories    = apiAdvisories.map(a => ({
    id: a.id,
    level: a.severity === 'CRITICAL' ? 'unsafe' : a.severity === 'HIGH' ? 'caution' : 'safe',
    text: a.message,
  }))

  // ── Active trip stats ──────────────────────────────────────────────────────
  const catches      = catchLogsQ.data ?? []
  const totalKg      = catches.reduce((s, c) => s + (c.quantityKg ?? 0), 0)
  const speciesCount = new Set(catches.map(c => c.speciesId).filter(Boolean)).size

  // ── Pending procurement ────────────────────────────────────────────────────
  const pendingOrders = (procQ.data ?? [])
    .filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED')
    .slice(0, 3)

  const firstName  = user?.fullName?.split(' ')[0] ?? 'Fisherman'
  const vesselName = user?.vesselName ?? ''

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Sea status · {asOf}</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Good morning, <em>{firstName}</em>
          </h1>
          <p className="page__sub">{vesselName ? `${vesselName} · ` : ''}Open-Meteo via Marine Service</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => qc.invalidateQueries()}><I.Refresh size={13} /> Refresh</button>
          <button className="btn btn--primary" onClick={() => activeTrip ? setPage('trips') : onStartTrip?.()}><I.Anchor size={13} /> {activeTrip ? 'View trip' : 'Start a trip'}</button>
        </div>
      </div>

      {/* Sea status hero */}
      <div className="card" style={{padding: 0, marginTop: 18, overflow: 'hidden'}}>
        <div style={{padding: '22px 28px', display: 'flex', alignItems: 'flex-start', gap: 24, borderBottom: '1px solid var(--line)'}}>
          <div style={{flex: 1}}>
            <div className="eyebrow">Overall risk</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6}}>
              <h2 style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 44, fontStyle: 'italic', color: `var(--${overallTone})`}}>{riskLabel}</h2>
              <RiskDot risk={overallTone} />
            </div>
            <p style={{margin: '8px 0 0', fontSize: 14, color: 'var(--ink-2)', maxWidth: 460, lineHeight: 1.55}}>{riskMsg}</p>
          </div>
          <div className="grid grid--kpi" style={{flex: 1.6, marginTop: 0}}>
            <div className="kpi"><div className="kpi__label">Safe zones</div><div className="kpi__value" style={{color: 'var(--safe)'}}>{safeZones}</div><div className="kpi__foot">of {zones.length}</div></div>
            <div className="kpi"><div className="kpi__label">Caution</div><div className="kpi__value" style={{color: 'var(--caution)'}}>{cautionZones}</div><div className="kpi__foot">advisory active</div></div>
            <div className="kpi"><div className="kpi__label">Avg wave</div><div className="kpi__value">{avgWave}<small>m</small></div><div className="kpi__foot">across grounds</div></div>
            <div className="kpi"><div className="kpi__label">Max wind</div><div className="kpi__value">{maxWind}<small>km/h</small></div><div className="kpi__foot">peak gusts</div></div>
          </div>
        </div>

        {/* Zone detail */}
        <div style={{padding: '20px 28px'}}>
          <div className="row" style={{justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <div>
              <div className="eyebrow">Fishing grounds</div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4}}>
                <h3 style={{margin: 0, fontSize: 20, fontFamily: 'var(--font-display)'}}>{zoneName || '—'}</h3>
                <span className="muted-data" style={{fontSize: 12}}>{zoneRegion}</span>
                <RiskDot risk={riskLevel} />
              </div>
            </div>
            <div className="row" style={{gap: 4}}>
              {zones.map((z, i) => (
                <button key={z.zoneId} className={`btn btn--sm ${i === activeZoneIdx ? 'btn--accent' : 'btn--ghost'}`}
                        style={{padding: '4px 10px', fontSize: 11}}
                        onClick={() => setSelectedZoneIdx(i)}>
                  {z.zoneName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid--kpi">
            <div className="kpi"><div className="kpi__label"><I.Wave size={11} /> Wave height</div><div className="kpi__value">{waveH}<small>m</small></div><div className="kpi__foot">{swellH ?? 0}m swell · {swellPeriod ?? 0}s</div></div>
            <div className="kpi"><div className="kpi__label"><I.Wind size={11} /> Wind</div><div className="kpi__value">{windSpeed}<small>km/h</small></div><div className="kpi__foot">{windDir} · gust {windGust}</div></div>
            <div className="kpi"><div className="kpi__label"><I.Thermo size={11} /> Sea temp</div><div className="kpi__value">{temp}<small>°C</small></div><div className="kpi__foot">{cloud}% cloud</div></div>
            <div className="kpi"><div className="kpi__label"><I.Drop size={11} /> Rain</div><div className="kpi__value">{rain}<small>mm</small></div><div className="kpi__foot">next 6h</div></div>
          </div>
          {zoneAdvisory && (
            <div style={{marginTop: 14, padding: '10px 14px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8, color: 'var(--caution)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8}}>
              <I.Alert size={14} /> <strong>Advisory:</strong> {zoneAdvisory}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid--kpi" style={{marginTop: 18, gridTemplateColumns: 'repeat(5, 1fr)'}}>
        {[
          { id: 'trips',       icon: 'Anchor',    label: 'My Trips' },
          { id: 'alerts',      icon: 'Bell',      label: 'Catch Alerts' },
          { id: 'orders',      icon: 'Clipboard', label: 'My Orders' },
          { id: 'procurement', icon: 'Receipt',   label: 'Procurement' },
          { id: 'earnings',    icon: 'Trend',     label: 'Earnings' },
        ].map(qa => {
          const Icon = I[qa.icon]
          return (
            <button key={qa.id} className="card" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--surface)', textAlign: 'left'}} onClick={() => setPage(qa.id)}>
              <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center'}}>
                <Icon size={15} />
              </div>
              <div style={{fontSize: 13, fontWeight: 500}}>{qa.label}</div>
            </button>
          )
        })}
      </div>

      {/* Active trip + advisories */}
      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {activeTrip ? (
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Active trip</div>
                <div className="card__sub">
                  {activeTrip.vesselName ?? '—'} · departed {new Date(activeTrip.startedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className="status status--active"><span className="status__dot" /> At sea</span>
            </div>
            <div className="grid grid--kpi" style={{marginTop: 4}}>
              <div className="kpi">
                <div className="kpi__label">Code</div>
                <div className="kpi__value" style={{fontFamily: 'var(--font-mono)', fontSize: 18}}>T-{activeTrip.id}</div>
                <div className="kpi__foot">{activeTrip.targetArea ?? activeTrip.departurePoint ?? '—'}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Catch so far</div>
                <div className="kpi__value">{catchLogsQ.isLoading ? '…' : `${totalKg.toFixed(1)} kg`}</div>
                <div className="kpi__foot">{catchLogsQ.isLoading ? '' : `${speciesCount} species logged`}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Catch entries</div>
                <div className="kpi__value">{catchLogsQ.isLoading ? '…' : catches.length}</div>
                <div className="kpi__foot">logged this trip</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Duration</div>
                <div className="kpi__value">{durationH}h {durationM}m {durationS}s</div>
                <div className="kpi__foot">elapsed</div>
              </div>
            </div>
            <div className="row" style={{gap: 8, marginTop: 14}}>
              <button className="btn btn--sm" onClick={() => setPage('trips')}>Open trip <I.Arrow size={11} /></button>
              <button className="btn btn--accent btn--sm" onClick={() => setPage('alerts')}><I.Plus size={11} /> Post catch alert</button>
            </div>
          </div>
        ) : (
          <div className="card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 12, textAlign: 'center'}}>
            <div style={{width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center'}}>
              <I.Anchor size={22} />
            </div>
            <div>
              <div style={{fontWeight: 600, fontSize: 15}}>No active trip</div>
              <div className="muted-data" style={{fontSize: 13, marginTop: 4}}>Start a trip to begin logging catches and posting alerts.</div>
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => onStartTrip?.()}><I.Plus size={12} /> Start a trip</button>
          </div>
        )}

        <div className="card">
          <div className="card__head">
            <div className="card__title">Advisories</div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {advQ.isLoading && <p style={{fontSize: 13, color: 'var(--ink-3)', margin: 0}}>Loading…</p>}
            {!advQ.isLoading && advisories.length === 0 && (
              <p style={{fontSize: 13, color: 'var(--ink-3)', margin: 0}}>No active advisories.</p>
            )}
            {advisories.map(a => (
              <div key={a.id} style={{display: 'flex', gap: 10, padding: '10px 12px', background: `var(--${a.level}-soft)`, border: `1px solid var(--${a.level})`, borderRadius: 8, fontSize: 13, color: `var(--${a.level})`}}>
                <I.Alert size={14} style={{flexShrink: 0, marginTop: 1}} />
                <span style={{color: 'var(--ink)'}}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending procurement orders */}
      {(procQ.data ?? []).length > 0 && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head">
            <div>
              <div className="card__title">Pending procurement orders</div>
              <div className="card__sub">{pendingOrders.length} awaiting action</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('procurement')}>Open procurement <I.Arrow size={11} /></button>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="muted-data" style={{padding: '12px 0', fontSize: 13}}>No pending orders.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>ID</th><th>Species</th><th>Qty</th><th>Total</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {pendingOrders.map(o => (
                  <tr key={o.id}>
                    <td><span className="kbd">#{o.id}</span></td>
                    <td>{o.speciesName ?? '—'}</td>
                    <td>{o.qtyKg != null ? `${o.qtyKg} kg` : '—'}</td>
                    <td>{o.qtyKg && o.pricePerKg ? `₱${(o.qtyKg * o.pricePerKg).toLocaleString('en-PH')}` : '—'}</td>
                    <td><span className={`chip ${o.paymentMethod === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>{o.paymentMethod ?? '—'}</span></td>
                    <td><span className={`status status--${o.status === 'PENDING' ? 'pending' : 'confirmed'}`}><span className="status__dot" /> {o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
