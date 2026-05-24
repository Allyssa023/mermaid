import { useRef, useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts'
import gsap from 'gsap'
import { I } from '../icons'
import { fetchAllConditions, fetchAdvisories } from './api/marine'
import { listCatchAlerts } from './api/catchAlerts'
import { endTrip, listCatchLogs } from './api/trips'

const RISK_ORDER = { UNSAFE: 2, CAUTION: 1, SAFE: 0 }

const ADVISORY_ICON = { CRITICAL: 'Alert', HIGH: 'Wave', MEDIUM: 'Wind', LOW: 'Drop', INFO: 'Alert' }
const ADVISORY_TONE = { CRITICAL: 'unsafe', HIGH: 'unsafe', MEDIUM: 'caution', LOW: 'safe', INFO: 'violet' }

function overallLabel(risk) {
  return risk === 'UNSAFE' ? 'Dangerous' : risk === 'CAUTION' ? 'Manageable' : 'Favorable'
}

function overallMsg(risk, safeCount, cautionCount, total) {
  if (risk === 'UNSAFE') return `Dangerous conditions in part of La Union — review zone breakdown before sailing.`
  if (risk === 'CAUTION') return `Mixed conditions across La Union — ${cautionCount} zone${cautionCount !== 1 ? 's' : ''} under advisory.`
  return `Conditions favorable across La Union — ${safeCount} of ${total} zones cleared for fishing.`
}

// ── Zone Carousel ─────────────────────────────────────────────────────────
function ZoneCarousel({ zones }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef(null)

  const changeZone = (newIdx) => {
    if (!trackRef.current) return setIdx(newIdx)
    gsap.to(trackRef.current, {
      opacity: 0, x: -15, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        setIdx(newIdx)
        gsap.fromTo(trackRef.current, 
          { opacity: 0, x: 15 }, 
          { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
        )
      }
    })
  }

  useEffect(() => {
    if (paused || zones.length < 2) return
    const id = setInterval(() => {
      changeZone((idx + 1) % zones.length)
    }, 5000)
    return () => clearInterval(id)
  }, [paused, zones.length, idx])

  const zone = zones[idx]
  const riskLow = (zone?.risk?.level ?? 'safe').toLowerCase()

  return (
    <div
      className="zone-car"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="zone-car__head">
        <div>
          <div className="card__title">Per-zone breakdown</div>
          <div className="card__sub">Specific conditions · auto-cycling</div>
        </div>
        <div className="zone-car__nav">
          <button className="btn btn--sm btn--ghost btn--icon"
            onClick={() => changeZone((idx - 1 + zones.length) % zones.length)}>
            <I.ChevL size={13} />
          </button>
          <div className="zone-car__dots">
            {zones.map((_, i) => (
              <button key={i} className={`zone-car__dot${i === idx ? ' zone-car__dot--on' : ''}`}
                onClick={() => changeZone(i)} />
            ))}
          </div>
          <button className="btn btn--sm btn--ghost btn--icon"
            onClick={() => changeZone((idx + 1) % zones.length)}>
            <I.ChevR size={13} />
          </button>
        </div>
      </div>

      <div className="zone-car__viewport">
        {zone ? (
          <div className="zone-car__slide" ref={trackRef}>
            <div className="zone-car__header">
              <div className="zone-car__header-left">
                <div className={`zone-car__pip zone-car__pip--${riskLow}`}>
                  <I.Compass size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="zone-car__slide-name">{zone.zoneName}</div>
                  <div className="zone-car__slide-region">{zone.region ?? 'Region I'}</div>
                </div>
              </div>
              <span className={`chip chip--${riskLow}`}>
                <span className="chip__dot" />{zone.risk?.level ?? '—'}
              </span>
            </div>

            <div className="zone-car__primary-grid">
              <div className="zone-car__primary-metric">
                <div className="zone-car__primary-label"><I.Wave size={12} /> Wave</div>
                <div className="zone-car__primary-val">
                  {zone.marine?.waveHeightM ?? '—'}<small>m</small>
                </div>
              </div>
              <div className="zone-car__primary-metric">
                <div className="zone-car__primary-label"><I.Wind size={12} /> Wind</div>
                <div className="zone-car__primary-val">
                  {zone.weather?.windSpeedKmh ?? '—'}<small>km/h</small>
                </div>
              </div>
              <div className="zone-car__primary-metric">
                <div className="zone-car__primary-label"><I.Wind size={12} /> Gusts</div>
                <div className="zone-car__primary-val">
                  {zone.weather?.windGustsKmh ?? '—'}<small>km/h</small>
                </div>
              </div>
            </div>

            <div className="zone-car__secondary-grid">
              <div className="zone-car__secondary-metric">
                <div className="zone-car__secondary-label">Temp</div>
                <div className="zone-car__secondary-val">{zone.weather?.temperatureC ?? '—'}°C</div>
              </div>
              <div className="zone-car__secondary-metric">
                <div className="zone-car__secondary-label">Precip</div>
                <div className="zone-car__secondary-val">{zone.weather?.precipitationMm ?? '0'} mm</div>
              </div>
              <div className="zone-car__secondary-metric">
                <div className="zone-car__secondary-label">Clouds</div>
                <div className="zone-car__secondary-val">{zone.weather?.cloudCoverPct ?? '0'}%</div>
              </div>
              <div className="zone-car__secondary-metric">
                <div className="zone-car__secondary-label">Swell Period</div>
                <div className="zone-car__secondary-val">{zone.marine?.swellPeriodS ?? '—'}s</div>
              </div>
            </div>

            {zone.risk?.advisory && (
              <div className="zone-car__advisory">
                <I.Alert size={12} />
                <strong>Advisory:</strong> {zone.risk.advisory}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>No zone data</div>
        )}
      </div>
    </div>
  )
}

// ── Active Trip Promo ──────────────────────────────────────────────────────
function TripPromo({ activeTrip, overallRisk, setPage }) {
  const qc = useQueryClient()
  const [elapsed, setElapsed] = useState({ h: 0, m: 0 })
  const timerRef = useRef(null)

  const catchQ = useQuery({
    queryKey: ['trips', activeTrip?.id, 'catches'],
    queryFn: () => listCatchLogs(activeTrip.id),
    enabled: !!activeTrip?.id,
  })
  const catchLogs = catchQ.data ?? []
  const totalKg = catchLogs.reduce((s, c) => s + (c.quantityKg ?? 0), 0)
  const speciesCount = new Set(catchLogs.map(c => c.speciesId ?? c.species)).size
  const progressPct = Math.min(95, ((elapsed.h * 60 + elapsed.m) / 720) * 100)

  useEffect(() => {
    if (!activeTrip?.startedAt) return
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTrip.startedAt)) / 1000)
      setElapsed({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60) })
    }
    tick(); const id = setInterval(tick, 30_000); return () => clearInterval(id)
  }, [activeTrip?.startedAt])

  useEffect(() => {
    if (!timerRef.current) return
    gsap.to(timerRef.current, { scale: 1.03, repeat: -1, yoyo: true, duration: 2, ease: 'sine.inOut' })
    return () => gsap.killTweensOf(timerRef.current)
  }, [activeTrip?.id])

  const endMut = useMutation({
    mutationFn: () => endTrip(activeTrip.id, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', 'ACTIVE'] }),
  })

  if (!activeTrip) {
    return (
      <div className="promo-card" style={{ justifyContent: 'center' }}>
        <div className="promo-card__head">
          <div className="promo-card__brand">
            <div className="promo-card__brand-mark">M</div>
            Mermaid
          </div>
        </div>
        <div className="promo-empty">
          <div style={{ color: 'var(--ink-3)', fontSize: 32 }}><I.Anchor size={32} /></div>
          <div className="promo-empty__label">No active trip</div>
          <button className="promo-card__btn promo-card__btn--lime" onClick={() => setPage('trips')}>
            <I.Plus size={12} /> Start a Trip
          </button>
        </div>
      </div>
    )
  }

  const tripCode = `T-${activeTrip.id}`
  const hStr = String(elapsed.h).padStart(2, '0')
  const mStr = String(elapsed.m).padStart(2, '0')

  return (
    <div className="promo-card">
      <div className="promo-card__head">
        <div className="promo-card__brand">
          <div className="promo-card__brand-mark">M</div>
          Mermaid
        </div>
        <span className="promo-card__tag">
          <span className="promo-card__tag-dot" /> LIVE
        </span>
      </div>

      <div className="promo-card__title">Active Trip</div>
      <div className="promo-card__trip-meta">
        <kbd>{tripCode}</kbd>
        <span>·</span>
        <span style={{ color: 'var(--ink-3)' }}>{activeTrip.targetArea ?? activeTrip.departurePoint ?? 'En route'}</span>
      </div>

      <div className="promo-card__stat-grid">
        <div>
          <div className="promo-card__stat-label">Total Catch</div>
          <div className="promo-card__stat-value">
            {totalKg.toFixed(1)}<small>kg</small>
          </div>
          <div className="promo-card__stat-foot">{speciesCount} species · {catchLogs.length} entries</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="promo-card__stat-label">Elapsed</div>
          <div className="promo-card__stat-timer" ref={timerRef}>{hStr}:{mStr}</div>
          <div className="promo-card__stat-foot">{activeTrip.vesselName ?? '—'}</div>
        </div>
      </div>

      <div className="promo-card__progress">
        <div className="promo-card__progress-track">
          <div className="promo-card__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="promo-card__progress-labels">
          <span>Depart</span>
          <span>Target 12h</span>
        </div>
      </div>

      <div className="promo-card__actions">
        <button className="promo-card__btn promo-card__btn--lime" onClick={() => setPage('trips')}>
          <I.Plus size={12} /> Log Catch Entry
        </button>
        <button className="promo-card__btn promo-card__btn--ghost" onClick={() => setPage('trips')}>
          <I.Eye size={12} /> View Full Trip
        </button>
      </div>
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
export default function FishermanHomePage({ setPage, activeTrip }) {
  const condQ  = useQuery({ queryKey: ['marine', 'all'], queryFn: fetchAllConditions })
  const advQ   = useQuery({ queryKey: ['advisories'],    queryFn: () => fetchAdvisories(true) })
  const alertQ = useQuery({ queryKey: ['fisherman', 'catch-alerts'], queryFn: listCatchAlerts })

  const zones      = condQ.data?.zones ?? []
  const advisories = advQ.data ?? []
  const alerts     = alertQ.data ?? []

  const overallRisk = zones.reduce((worst, z) =>
    (RISK_ORDER[z.risk?.level] ?? 0) > (RISK_ORDER[worst] ?? 0) ? z.risk.level : worst
  , 'SAFE')
  const safeCount    = zones.filter(z => z.risk?.level === 'SAFE').length
  const cautionCount = zones.filter(z => z.risk?.level === 'CAUTION').length
  const avgWave = zones.length ? (zones.reduce((s, z) => s + (z.marine?.waveHeightM ?? 0), 0) / zones.length).toFixed(1) : '—'
  const maxWind = zones.length ? Math.max(...zones.map(z => z.weather?.windSpeedKmh ?? 0)) : '—'
  const maxGust = zones.length ? Math.max(...zones.map(z => z.weather?.windGustsKmh ?? 0)) : '—'

  const riskLow = overallRisk.toLowerCase()

  // Advisory auto-cycling and GSAP animations
  const [activeAdvIndex, setActiveAdvIndex] = useState(0)
  const advContentRef = useRef(null)
  const advIconRef = useRef(null)

  useEffect(() => {
    if (advisories.length <= 1) return
    const interval = setInterval(() => {
      if (!advContentRef.current) return
      gsap.to(advContentRef.current, { 
        x: -20, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          setActiveAdvIndex(prev => (prev + 1) % advisories.length)
          gsap.fromTo(advContentRef.current, 
            { x: 20, opacity: 0 }, 
            { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 }
          )
        }
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [advisories.length])
  
  useEffect(() => {
    if (!advIconRef.current) return
    const ctx = gsap.context(() => {
      gsap.to(advIconRef.current, {
        x: 8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1
      })
    }, advIconRef)
    return () => ctx.revert()
  }, [activeAdvIndex])

  // GSAP counter animation for KPIs
  const avgWaveRef = useRef(null)
  const maxWindRef = useRef(null)
  const maxGustRef = useRef(null)
  const [forecastPeriod, setForecastPeriod] = useState('NOW')

  const baseWave = parseFloat(avgWave) || 0.6
  const forecastData = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const h = i + 1
      const wave = Math.max(0.1, baseWave + Math.sin(i * 0.5) * 0.4 + (Math.random() * 0.15))
      return { time: `+${h}h`, wave: parseFloat(wave.toFixed(2)) }
    })
  }, [baseWave])

  const visibleData = useMemo(() => {
    if (forecastPeriod === 'NOW') return forecastData.slice(0, 6)
    if (forecastPeriod === '+6H') return forecastData.slice(4, 12)
    return forecastData
  }, [forecastData, forecastPeriod])
  useEffect(() => {
    if (!zones.length) return
    const animate = (ref, val) => {
      if (!ref.current || typeof val !== 'number') return
      const obj = { v: 0 }
      gsap.to(obj, { v: val, duration: 0.8, ease: 'power2.out',
        onUpdate: () => { if (ref.current) ref.current.textContent = obj.v.toFixed(1) } })
    }
    animate(avgWaveRef, parseFloat(avgWave))
    animate(maxWindRef, maxWind)
    animate(maxGustRef, maxGust)
  }, [condQ.dataUpdatedAt])

  if (condQ.isLoading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[80, 200, 160].map((h, i) => (
        <div key={i} className="skeleton-bar" style={{ height: h }}>
          <div className="skeleton-shimmer" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="dash fade-in">
      {/* Page header */}
      <div className="dash__head">
        <div>
          <div className="eyebrow">
            <span className="dot" />Region I · Ilocos · Live Marine Ops
          </div>
          <h1 className="dash__title">
            La Union <em className="chip-lime">Conditions</em>
          </h1>
        </div>
        <div className="dash__actions">
          <div className="seg">
            <button className={forecastPeriod === 'NOW' ? 'on' : ''} onClick={() => setForecastPeriod('NOW')}>Now</button>
            <button className={forecastPeriod === '+6H' ? 'on' : ''} onClick={() => setForecastPeriod('+6H')}>+6h</button>
            <button className={forecastPeriod === '+24H' ? 'on' : ''} onClick={() => setForecastPeriod('+24H')}>+24h</button>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => condQ.refetch()}>
            <I.Refresh size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Hero row: Overall + Advisories */}
      <div className="dash__hero-row">
        {/* Overall conditions hero */}
        <div className={`overall-hero overall-hero--${riskLow}`}>
          <div className="overall-hero__top">
            <div className="overall-hero__main">
            <div className="overall-hero__head" style={{ justifyContent: 'flex-start' }}>
              <div className="overall-hero__region">
                <I.MapPin size={11} /> La Union · {zones.length} zones
              </div>
              <div className="overall-hero__time" style={{ marginLeft: '6px' }}>
                <I.Clock size={9} /> Live data
              </div>
            </div>
            <div className="overall-hero__status-row">
              <div className={`overall-hero__pulse overall-hero__pulse--${riskLow}`}>
                <div className="overall-hero__pulse-ring" />
                <div className="overall-hero__pulse-ring overall-hero__pulse-ring--2" />
                <I.Compass size={32} />
              </div>
              <div>
                <div className="overall-hero__verdict-eyebrow">Overall fishing conditions</div>
                <h2 className={`overall-hero__verdict overall-hero__verdict--${riskLow}`}>
                  {overallLabel(overallRisk)}
                </h2>
                <div className="overall-hero__verdict-tag">
                  <span className={`chip chip--${riskLow}`}>
                    <span className="chip__dot" />{overallRisk}
                  </span>
                </div>
              </div>
            </div>
            <p className="overall-hero__msg">
              {overallMsg(overallRisk, safeCount, cautionCount, zones.length)}
            </p>
          </div>

          <div className="overall-hero__kpis">
            <div className="overall-kpi">
              <div className="overall-kpi__label">Safe zones</div>
              <div className="overall-kpi__value" style={{ color: 'var(--safe)' }}>
                {safeCount}<small>/{zones.length}</small>
              </div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Caution</div>
              <div className="overall-kpi__value" style={{ color: cautionCount > 0 ? 'var(--caution)' : 'var(--ink-3)' }}>
                {cautionCount}
              </div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Avg wave</div>
              <div className="overall-kpi__value">
                <span ref={avgWaveRef}>{avgWave}</span><small>m</small>
              </div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Max wind</div>
              <div className="overall-kpi__value">
                <span ref={maxWindRef}>{maxWind}</span><small>km/h</small>
              </div>
              <div className="overall-kpi__foot">gust <span ref={maxGustRef}>{maxGust}</span></div>
            </div>
          </div>
          </div>

          <div className="overall-hero__chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-violet)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-violet)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--ink-4)', fontSize: 10, fontFamily: 'var(--font-code)' }} 
                  dy={10} 
                  minTickGap={15}
                />
                <YAxis 
                  domain={['dataMin - 0.2', 'dataMax + 0.2']} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--ink-4)', fontSize: 10, fontFamily: 'var(--font-code)' }}
                  tickFormatter={(val) => val.toFixed(1)}
                  dx={-10}
                  width={25}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--hairline)', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: 'var(--accent-lime)', fontWeight: 600, fontFamily: 'var(--font-code)' }}
                  labelStyle={{ color: 'var(--ink-3)', marginBottom: '4px' }}
                  formatter={(val) => [`${val}m`, 'Wave Height']}
                  labelFormatter={(label) => `Forecast ${label}`}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="wave" 
                  stroke="var(--accent-lime)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorWave)" 
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advisories */}
        {(() => {
          const activeAdv = advisories[activeAdvIndex]
          const tone = activeAdv ? (ADVISORY_TONE[activeAdv.severity] ?? 'muted') : 'muted'
          const iconKey = activeAdv ? (ADVISORY_ICON[activeAdv.severity] ?? 'Alert') : 'Alert'
          const Icon = I[iconKey] ?? I.Alert

          return (
            <div className={`advisory-card advisory-card--${tone}`}>
              <div className="advisory-card__head">
                <div>
                  <div className="card__title">Advisories</div>
                  <div className="card__sub">{advisories.length} active · Region I</div>
                </div>
                {advisories.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length > 0 && (
                  <span className="chip chip--unsafe" style={{ padding: '3px 8px', flexShrink: 0 }}>
                    <span className="chip__dot" />
                    {advisories.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length} HIGH
                  </span>
                )}
              </div>
              
              <div className="advisory-rich" ref={advContentRef}>
                {advisories.length === 0 ? (
                  <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>No active advisories</div>
                ) : (
                  <>
                    <div className={`advisory-rich__icon advisory-rich__icon--${tone}`} ref={advIconRef}>
                      <Icon size={64} />
                    </div>
                    <div>
                      <div className="advisory-rich__title">{activeAdv.title}</div>
                      <div className="advisory-rich__meta">Active in your region</div>
                      <span className={`advisory-rich__sev advisory-rich__sev--${tone}`}>
                        {activeAdv.severity}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {advisories.length > 1 && (
                <div className="advisory-dots">
                  {advisories.map((_, i) => (
                    <div key={i} className={`advisory-dots__dot ${i === activeAdvIndex ? 'active' : ''}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Bottom row: Zone carousel + Catch alerts + Trip promo */}
      <div className="dash__bottom dash__bottom--3col">
        {/* Zone Carousel */}
        {zones.length > 0 ? (
          <ZoneCarousel zones={zones} />
        ) : (
          <div className="zone-car">
            <div className="card__title">Per-zone breakdown</div>
            <div style={{ color: 'var(--ink-4)', fontSize: 12, flex: 1, display: 'flex', alignItems: 'center' }}>
              No zone data available
            </div>
          </div>
        )}

        {/* Catch alerts */}
        <div className="dash__card">
          <div className="card__head">
            <div>
              <div className="card__title">Catch alerts</div>
              <div className="card__sub">
                {alerts.filter(a => a.status === 'ACTIVE').length} live
              </div>
            </div>
            <button className="btn btn--sm btn--ghost btn--icon" onClick={() => setPage('alerts')}>
              <I.Arrow size={11} />
            </button>
          </div>
          <div className="dash__alerts">
            {alertQ.isError && (
              <div className="f-error">
                Failed<span className="f-error__retry" onClick={alertQ.refetch}>Retry</span>
              </div>
            )}
            {alerts.length === 0 && !alertQ.isError && (
              <div style={{ color: 'var(--ink-4)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                No active alerts
              </div>
            )}
            {alerts.slice(0, 5).map(a => {
              const statusTone = a.status === 'MATCHED' || a.status === 'SOLD' ? 'safe'
                : a.status === 'ACTIVE' ? 'lime'
                : 'muted'
              return (
                <div key={a.id} className="dash__alert-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.species?.commonName ?? a.speciesName ?? '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-code)', marginTop: 1 }}>
                      {a.quantityKg != null ? `${a.quantityKg}kg` : a.quantityEstimate ?? '—'}
                      {a.askingPricePerKg != null && ` · ₱${a.askingPricePerKg}/kg`}
                    </div>
                  </div>
                  <span className={`chip chip--${statusTone}`} style={{ fontSize: 9, padding: '2px 7px', flexShrink: 0 }}>
                    <span className="chip__dot" />{a.status}
                  </span>
                </div>
              )
            })}
            {alerts.length > 5 && (
              <button onClick={() => setPage('alerts')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-lime)', fontSize: 11, padding: '4px 0', textAlign: 'left' }}>
                +{alerts.length - 5} more →
              </button>
            )}
          </div>
        </div>

        {/* Trip promo / no-trip CTA */}
        <TripPromo activeTrip={activeTrip} overallRisk={overallRisk} setPage={setPage} />
      </div>
    </div>
  )
}
