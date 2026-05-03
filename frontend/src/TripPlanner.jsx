import { useState, useEffect, useCallback, useMemo } from 'react'
import './planner.css'
import { apiGet, apiPut } from './api'
import StartTripModal from './components/StartTripModal'
import InterestModal from './components/InterestModal'

// ── Icons ─────────────────────────────────────────────────────────────────────
const WavesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
  </svg>
)
const WindIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)
const ChevL = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ChevR = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const FishIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z"/>
    <path d="M18 12h.01"/>
    <path d="M6.5 12C4 12 1.5 9.5 2 6c.5-3 3-4 5 0"/>
  </svg>
)
const AnchorIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
  </svg>
)
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function startOfWeek(d) {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r
}

// ── Forecast projection ───────────────────────────────────────────────────────
function projectDayForecast(baseWave, baseWind, dayOffset) {
  const seed = (dayOffset * 7 + 3) % 11
  const waveVar = Math.sin(seed * 0.9) * 0.4 + (seed % 3 - 1) * 0.15
  const windVar = Math.cos(seed * 1.1) * 5 + (seed % 4 - 2) * 1.5
  return {
    wave: +Math.max(0.2, baseWave + waveVar).toFixed(2),
    wind: +Math.max(3, baseWind + windVar).toFixed(1),
  }
}

function riskFromWave(waveHeight) {
  if (waveHeight <= 1.0) return 'SAFE'
  if (waveHeight <= 2.0) return 'CAUTION'
  return 'UNSAFE'
}
function riskClass(level) {
  if (level === 'SAFE') return 'safe'
  if (level === 'CAUTION') return 'caution'
  return 'unsafe'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ height = '90px' }) {
  return <div className="planner-skeleton" style={{ height }} />
}

// ── Day Cell ──────────────────────────────────────────────────────────────────
function DayCell({ date, today, selectedDate, forecast, advisories, demands, trips, isBestDay, isMonthView, otherMonth, filters, onClick, onDrop, onDragStart }) {
  const isToday = sameDay(date, today)
  const isSelected = selectedDate && sameDay(date, selectedDate)
  const risk = forecast ? riskFromWave(forecast.wave) : null
  const rc = risk ? riskClass(risk) : ''

  const cls = [
    'cal-day',
    isMonthView && 'cal-day--month',
    isToday && 'cal-day--today',
    isSelected && 'cal-day--sel',
    otherMonth && 'cal-day--other',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      onClick={() => onClick(date)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (onDrop) onDrop(date) }}
    >
      {risk && <div className={`cal-day__bar cal-day__bar--${rc}`} />}
      {isBestDay && !otherMonth && (
        <span className="cal-day__best" title="Recommended day"><StarIcon /></span>
      )}
      <span className="cal-day__num">{date.getDate()}</span>

      {!isMonthView && forecast && (
        <div className="cal-day__forecast-mini">
          <WavesIcon /> {forecast.wave}m &nbsp;
          <WindIcon /> {forecast.wind}
        </div>
      )}

      <div className="cal-day__events">
        {filters.advisories && advisories.slice(0, isMonthView ? 1 : 2).map((a, i) => (
          <div key={i} className={`cal-day__event cal-day__event--advisory cal-day__event--${a.severity?.toLowerCase() || 'medium'}`}>
            <AlertIcon /> {a.title?.substring(0, isMonthView ? 14 : 20) || 'Advisory'}
            {(a.title?.length > (isMonthView ? 14 : 20)) ? '…' : ''}
          </div>
        ))}
        {filters.demands && demands.length > 0 && (
          <div className="cal-day__event cal-day__event--demand">
            <FishIcon /> {demands.length} demand{demands.length > 1 ? 's' : ''}
          </div>
        )}
        {filters.trips && trips.map((t, i) => (
          <div
            key={t.id || i}
            className="cal-day__event cal-day__event--trip"
            draggable={t.status === 'PLANNED'}
            onDragStart={() => { if (t.status === 'PLANNED' && onDragStart) onDragStart(t) }}
            style={{ cursor: t.status === 'PLANNED' ? 'grab' : 'default', opacity: t.status === 'COMPLETED' ? 0.6 : 1 }}
          >
            <AnchorIcon /> {t.targetArea || t.vesselName}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Side Panel (permanent right column) ──────────────────────────────────────
function SidePanel({ date, today, forecast, demands, plannedTrips, isBestDay, onSchedule, setPage }) {
  const risk = forecast ? riskFromWave(forecast.wave) : null
  const rc = risk ? riskClass(risk) : ''
  const d0 = new Date(date); d0.setHours(0,0,0,0)
  const t0 = new Date(today); t0.setHours(0,0,0,0)
  const isPast = d0 < t0

  return (
    <div className="planner-aside">
      {/* Card 1: Selected day */}
      <div className="planner-side-card">
        <div className="planner-side-eyebrow">Selected day</div>
        <h3 className="planner-side-date">
          {date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        <div className="planner-side-chips">
          {risk
            ? <span className={`planner-risk-chip planner-risk-chip--${rc}`}>{risk}</span>
            : <span className="planner-risk-chip planner-risk-chip--safe">—</span>
          }
          {isBestDay && <span className="planner-best-chip">Best of week</span>}
        </div>

        {forecast && (
          <div className="planner-day-forecast">
            <div className="planner-day-forecast__item">
              <div className="planner-day-forecast__label">Wave</div>
              <div className="planner-day-forecast__val">{forecast.wave}<small>m</small></div>
            </div>
            <div className="planner-day-forecast__item">
              <div className="planner-day-forecast__label">Wind</div>
              <div className="planner-day-forecast__val">{forecast.wind}<small>km/h</small></div>
            </div>
            <div className="planner-day-forecast__item">
              <div className="planner-day-forecast__label">Tide low</div>
              <div className="planner-day-forecast__val planner-day-forecast__val--sm">03:42</div>
            </div>
            <div className="planner-day-forecast__item">
              <div className="planner-day-forecast__label">Tide high</div>
              <div className="planner-day-forecast__val planner-day-forecast__val--sm">09:15</div>
            </div>
          </div>
        )}

        {!isPast && (
          <button className="planner-schedule-btn" onClick={onSchedule}>
            <PlusIcon /> Schedule trip for this day
          </button>
        )}
      </div>

      {/* Card 2: Open demand */}
      <div className="planner-side-card">
        <div className="planner-side-card__head">
          <div className="planner-side-card__title">Open demand</div>
          <div className="planner-side-card__sub">Vendors seeking catch</div>
        </div>
        {demands.length > 0 ? demands.slice(0, 3).map(l => (
          <div key={l.id} className="planner-demand-row">
            <div>
              <div className="planner-demand-species">{l.fishSpecies?.commonName || '—'}</div>
              <div className="planner-demand-meta">{l.vendorName} · {l.quantityKg}kg</div>
            </div>
            <div className="planner-demand-price">
              ₱{l.offerPricePerKg}<small>/kg</small>
            </div>
          </div>
        )) : (
          <div className="planner-side-empty">No open demand</div>
        )}
        {setPage && (
          <button className="planner-aside-link" onClick={() => setPage('market')}>
            See all in Marketplace <ArrowIcon />
          </button>
        )}
      </div>

      {/* Card 3: Upcoming trips */}
      <div className="planner-side-card">
        <div className="planner-side-card__title">Upcoming trips</div>
        <div className="planner-trips-list">
          {plannedTrips.length > 0 ? plannedTrips.slice(0, 3).map(t => {
            const d = t.startedAt ? new Date(t.startedAt) : null
            const mon = d ? d.toLocaleDateString('en', { month: 'short' }).toUpperCase() : '—'
            const day = d ? d.getDate() : '—'
            return (
              <div key={t.id} className="planner-trip-item">
                <div className="planner-trip-date-badge">
                  <div className="planner-trip-month">{mon}</div>
                  <div className="planner-trip-day">{day}</div>
                </div>
                <div className="planner-trip-info">
                  <div className="planner-trip-name">{t.targetArea || t.departurePoint || 'Trip'}</div>
                  <div className="planner-trip-meta">{t.vesselName || t.fishermanName || '—'}</div>
                </div>
                <span className="planner-planned-chip">Planned</span>
              </div>
            )
          }) : (
            <div className="planner-side-empty">No upcoming trips</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main TripPlanner ──────────────────────────────────────────────────────────
export default function TripPlanner({ token, setPage }) {
  const [view, setView] = useState('month')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [interestModal, setInterestModal] = useState(null)
  const [draggedTrip, setDraggedTrip] = useState(null)
  const [filters, setFilters] = useState({ advisories: true, demands: true, trips: true })

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  }, [])

  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })

  const [conditions, setConditions] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [listings, setListings] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cond, adv, mkl, t_comp, t_canc, t_plan, t_act] = await Promise.all([
        apiGet('/marine/conditions', token),
        apiGet('/advisories?activeOnly=true', token),
        apiGet('/marketplace/listings', token),
        apiGet('/trips?status=COMPLETED', token),
        apiGet('/trips?status=CANCELLED', token),
        apiGet('/trips?status=PLANNED', token),
        apiGet('/trips?status=ACTIVE', token),
      ])
      setConditions(cond)
      setAdvisories(adv)
      setListings(Array.isArray(mkl) ? mkl.filter(l => l.status === 'OPEN') : [])
      setTrips([...t_comp, ...t_canc, ...t_plan, ...t_act])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  // ── Calendar days ─────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    if (view === 'week') {
      const ws = startOfWeek(anchorDate)
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i))
    }
    const y = anchorDate.getFullYear(), m = anchorDate.getMonth()
    const start = startOfWeek(new Date(y, m, 1))
    const days = []
    let d = new Date(start)
    for (let i = 0; i < 42; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
    if (days.length > 35 && days[35].getMonth() !== m) days.splice(35, 7)
    return days
  }, [anchorDate, view])

  // ── Forecast baseline ─────────────────────────────────────────────────────
  const baseline = useMemo(() => {
    if (!conditions?.zones?.length) return { wave: 1.2, wind: 18 }
    const zones = conditions.zones
    const waves = zones.map(z => z.marine?.waveHeightM).filter(v => v != null)
    const winds = zones.map(z => z.weather?.windSpeedKmh).filter(v => v != null)
    return {
      wave: waves.length ? waves.reduce((a, b) => a + b, 0) / waves.length : 1.2,
      wind: winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : 18,
    }
  }, [conditions])

  // ── Forecast map ──────────────────────────────────────────────────────────
  const forecastMap = useMemo(() => {
    const map = {}
    calendarDays.forEach(d => {
      const diff = Math.round((d - today) / 86400000)
      if (diff === 0) {
        map[dateKey(d)] = { wave: +baseline.wave.toFixed(2), wind: +baseline.wind.toFixed(1) }
      } else {
        map[dateKey(d)] = projectDayForecast(baseline.wave, baseline.wind, diff)
      }
    })
    return map
  }, [calendarDays, baseline, today])

  // ── Advisory map ──────────────────────────────────────────────────────────
  const advisoryMap = useMemo(() => {
    const map = {}
    advisories.forEach(a => {
      const from = a.activeFrom ? new Date(a.activeFrom) : null
      const to   = a.activeTo   ? new Date(a.activeTo)   : null
      calendarDays.forEach(d => {
        const s = new Date(d); s.setHours(0,0,0,0)
        const e = new Date(d); e.setHours(23,59,59,999)
        if ((!from || e >= from) && (!to || s <= to)) {
          const k = dateKey(d)
          if (!map[k]) map[k] = []
          map[k].push(a)
        }
      })
    })
    return map
  }, [advisories, calendarDays])

  // ── Demand deadline map ───────────────────────────────────────────────────
  const demandMap = useMemo(() => {
    const map = {}
    listings.forEach(l => {
      if (!l.neededBy) return
      const k = dateKey(new Date(l.neededBy))
      if (!map[k]) map[k] = []
      map[k].push(l)
    })
    return map
  }, [listings])

  // ── Trip map ──────────────────────────────────────────────────────────────
  const tripMap = useMemo(() => {
    const map = {}
    trips.forEach(t => {
      if (!t.startedAt) return
      const k = dateKey(new Date(t.startedAt))
      if (!map[k]) map[k] = []
      map[k].push(t)
    })
    return map
  }, [trips])

  // ── Best days ─────────────────────────────────────────────────────────────
  const bestDays = useMemo(() => {
    const set = new Set()
    const candidates = []
    calendarDays.forEach(d => {
      const diff = Math.round((d - today) / 86400000)
      if (diff < 0) return
      const k = dateKey(d)
      const fc = forecastMap[k]
      if (!fc || riskFromWave(fc.wave) !== 'SAFE') return
      const dayAdvs = advisoryMap[k] || []
      if (dayAdvs.some(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')) return
      candidates.push({ k, wave: fc.wave })
    })
    if (!candidates.length) return set
    const minWave = Math.min(...candidates.map(c => c.wave))
    candidates.forEach(c => { if (c.wave <= minWave + 0.1) set.add(c.k) })
    return set
  }, [calendarDays, forecastMap, advisoryMap, today])

  // ── Derived lists for side panel ──────────────────────────────────────────
  const plannedTrips = useMemo(() =>
    trips
      .filter(t => t.status === 'PLANNED' && t.startedAt)
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)),
    [trips]
  )
  const openDemand = useMemo(() =>
    listings
      .filter(l => l.status === 'OPEN')
      .sort((a, b) => new Date(a.neededBy || '9999') - new Date(b.neededBy || '9999')),
    [listings]
  )

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(dir) {
    setAnchorDate(prev => {
      const d = new Date(prev)
      if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  function goToday() {
    const d = new Date(); d.setHours(0,0,0,0)
    setAnchorDate(d)
    setSelectedDate(d)
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  async function handleDrop(targetDate) {
    if (!draggedTrip) return
    const trip = draggedTrip
    setDraggedTrip(null)
    const dropTarget = new Date(targetDate); dropTarget.setHours(0,0,0,0)
    const todayDate = new Date(); todayDate.setHours(0,0,0,0)
    if (dropTarget < todayDate) { setError('Cannot reschedule to a past date.'); return }
    const dDate = new Date(trip.startedAt); dDate.setHours(0,0,0,0)
    if (sameDay(dDate, targetDate)) return
    try {
      const newStart = new Date(targetDate); newStart.setHours(8,0,0,0)
      await apiPut(`/trips/${trip.id}`, token, {
        departurePoint: trip.departurePoint, targetArea: trip.targetArea,
        vesselName: trip.vesselName, notes: trip.notes,
        status: trip.status, startedAt: newStart.toISOString(),
      })
      load()
    } catch(err) { setError('Failed to reschedule: ' + err.message) }
  }

  // ── Period label ──────────────────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`
    const ws = startOfWeek(anchorDate)
    const we = addDays(ws, 6)
    if (ws.getMonth() === we.getMonth())
      return `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`
    return `${MONTHS[ws.getMonth()].slice(0,3)} ${ws.getDate()} – ${MONTHS[we.getMonth()].slice(0,3)} ${we.getDate()}, ${we.getFullYear()}`
  }, [anchorDate, view])

  // ── Selected day data ─────────────────────────────────────────────────────
  const selKey = dateKey(selectedDate || today)
  const selForecast = forecastMap[selKey] || null
  const selIsBest = bestDays.has(selKey)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="planner">
      {/* Page header */}
      <div className="page__head" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Planning</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>Trip <em>Planner</em></h1>
          <p className="page__sub">Match upcoming days with forecasts, demand, and your capacity.</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </button>
          <button className="btn btn--primary" onClick={() => setShowScheduleModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New trip
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="planner-layout">
        {/* Left: nav + legend + calendar */}
        <div className="planner-left">
          {/* Navigation */}
          <div className="planner-nav">
            <div className="planner-nav__period">
              <button className="planner-nav__arrow" onClick={() => navigate(-1)}><ChevL /></button>
              <span className="planner-nav__label">{periodLabel}</span>
              <button className="planner-nav__arrow" onClick={() => navigate(1)}><ChevR /></button>
              <button className="planner-nav__today" onClick={goToday}>Today</button>
            </div>
            <div className="planner-view-toggle">
              <button className={`planner-view-toggle__btn${view === 'week' ? ' planner-view-toggle__btn--on' : ''}`} onClick={() => setView('week')}>Week</button>
              <button className={`planner-view-toggle__btn${view === 'month' ? ' planner-view-toggle__btn--on' : ''}`} onClick={() => setView('month')}>Month</button>
            </div>
          </div>

          {/* Filter legend */}
          <div className="planner-legend">
            <div className="planner-legend__item planner-legend__item--static">
              <span className="planner-legend__swatch planner-legend__swatch--safe" />
              Safe
            </div>
            <div className="planner-legend__item planner-legend__item--static">
              <span className="planner-legend__swatch planner-legend__swatch--caution" />
              Caution
            </div>
            <div className="planner-legend__item planner-legend__item--static">
              <span className="planner-legend__swatch planner-legend__swatch--unsafe" />
              Unsafe
            </div>
            <div
              className={`planner-legend__item${!filters.advisories ? ' planner-legend__item--off' : ''}`}
              onClick={() => setFilters(f => ({ ...f, advisories: !f.advisories }))}
            >
              <span className="planner-legend__swatch planner-legend__swatch--advisory" />
              Advisory
            </div>
            <div
              className={`planner-legend__item${!filters.demands ? ' planner-legend__item--off' : ''}`}
              onClick={() => setFilters(f => ({ ...f, demands: !f.demands }))}
            >
              <span className="planner-legend__swatch planner-legend__swatch--demand" />
              Demand
            </div>
            <div
              className={`planner-legend__item${!filters.trips ? ' planner-legend__item--off' : ''}`}
              onClick={() => setFilters(f => ({ ...f, trips: !f.trips }))}
            >
              <span className="planner-legend__swatch planner-legend__swatch--trip" />
              Trip
            </div>
            <div className="planner-legend__item planner-legend__item--static">
              <span style={{ color: 'var(--caution)', display: 'flex', alignItems: 'center' }}><StarIcon /></span>
              Best Day
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="db-error" style={{ margin: '0 0 12px' }}>
              <AlertIcon />
              <span>{error}</span>
              <button className="db-error__retry" onClick={load}>Retry</button>
            </div>
          )}

          {/* Calendar */}
          <div className="cal">
            <div className="cal__weekday">
              {DOW.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className={view === 'week' ? 'cal__grid cal__grid--week' : 'cal__grid'}>
              {loading
                ? Array.from({ length: view === 'week' ? 7 : 35 }, (_, i) => (
                    <Skeleton key={i} height={view === 'week' ? '180px' : '110px'} />
                  ))
                : calendarDays.map(d => {
                    const k = dateKey(d)
                    const otherMonth = view === 'month' && d.getMonth() !== anchorDate.getMonth()
                    return (
                      <DayCell
                        key={k}
                        date={d}
                        today={today}
                        selectedDate={selectedDate}
                        forecast={forecastMap[k] || null}
                        advisories={advisoryMap[k] || []}
                        demands={demandMap[k] || []}
                        trips={tripMap[k] || []}
                        isBestDay={bestDays.has(k)}
                        isMonthView={view === 'month'}
                        otherMonth={otherMonth}
                        filters={filters}
                        onClick={setSelectedDate}
                        onDragStart={setDraggedTrip}
                        onDrop={handleDrop}
                      />
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* Right: permanent side panel */}
        <SidePanel
          date={selectedDate || today}
          today={today}
          forecast={selForecast}
          demands={openDemand}
          plannedTrips={plannedTrips}
          isBestDay={selIsBest}
          onSchedule={() => setShowScheduleModal(true)}
          setPage={setPage}
        />
      </div>

      {/* Schedule Trip Modal */}
      {showScheduleModal && (
        <StartTripModal
          token={token}
          initialDate={selectedDate}
          initialStatus="PLANNED"
          onCreated={() => { setShowScheduleModal(false); load() }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Interest Modal */}
      {interestModal && (
        <InterestModal
          listing={interestModal}
          token={token}
          onSuccess={() => setInterestModal(null)}
          onClose={() => setInterestModal(null)}
        />
      )}
    </div>
  )
}
