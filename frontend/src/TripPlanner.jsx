import { useState, useEffect, useCallback, useMemo } from 'react'
import './planner.css'
import { apiGet, apiPut } from './api'
import StartTripModal from './components/StartTripModal'
import InterestModal from './components/InterestModal'

// ── Icons (SVG, no emoji) ────────────────────────────────────────────────────

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
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z"/>
    <path d="M18 12h.01"/>
    <path d="M6.5 12C4 12 1.5 9.5 2 6c.5-3 3-4 5 0"/>
  </svg>
)
const AnchorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
  </svg>
)
const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)

// ── Helpers ──────────────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d) {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  r.setHours(0,0,0,0)
  return r
}

function fmtShortDate(d) {
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtWeekday(d) {
  return d.toLocaleDateString('en-PH', { weekday: 'long' })
}

// ── Forecast projection ──────────────────────────────────────────────────────

function projectDayForecast(baseWave, baseWind, dayOffset) {
  // Simulate daily variation using a hash-like seed from offset
  const seed = (dayOffset * 7 + 3) % 11
  const waveVar = Math.sin(seed * 0.9) * 0.4 + (seed % 3 - 1) * 0.15
  const windVar = Math.cos(seed * 1.1) * 5 + (seed % 4 - 2) * 1.5
  const wave = Math.max(0.2, baseWave + waveVar)
  const wind = Math.max(3, baseWind + windVar)
  return { wave: +wave.toFixed(2), wind: +wind.toFixed(1) }
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

function Skeleton({ height = '180px', radius = '14px' }) {
  return <div className="skeleton" style={{ height, borderRadius: radius }} />
}

// ── Day Cell ──────────────────────────────────────────────────────────────────

function DayCell({ date, today, selectedDate, forecast, advisories, demands, trips, isBestDay, isMonthView, otherMonth, filters, onClick, onDrop, onDragStart }) {
  const isToday = sameDay(date, today)
  const isSelected = selectedDate && sameDay(date, selectedDate)
  const risk = forecast ? riskFromWave(forecast.wave) : null
  const rc = risk ? riskClass(risk) : ''

  const cellCls = [
    'day-cell',
    isMonthView && 'day-cell--month',
    isToday && 'day-cell--today',
    isSelected && 'day-cell--selected',
    otherMonth && 'day-cell--other-month',
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={cellCls} 
      onClick={() => onClick(date)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        if (onDrop) onDrop(date)
      }}
    >
      {/* Risk color strip at top */}
      {risk && <div className={`day-cell__risk-bg day-cell__risk-bg--${rc}`} />}

      {/* Best Day star */}
      {isBestDay && <span className="day-cell__best" title="Recommended day"><StarIcon /></span>}

      {/* Day number */}
      <span className="day-cell__num">{date.getDate()}</span>

      {/* Risk chip */}
      {risk && (
        <span className={`day-cell__risk-chip day-cell__risk-chip--${rc}`}>
          {risk === 'SAFE' ? '✓' : risk === 'CAUTION' ? '!' : '✕'} {risk}
        </span>
      )}

      {/* Mini forecast stats (week view only) */}
      {!isMonthView && forecast && (
        <div className="day-cell__forecast">
          <WavesIcon /> {forecast.wave}m
          <WindIcon /> {forecast.wind} km/h
        </div>
      )}

      {/* Dot indicators (month view for advisories/demands) */}
      {isMonthView && ((filters.advisories && advisories.length > 0) || (filters.demands && demands.length > 0)) && (
        <div className="day-cell__dots">
          {filters.advisories && advisories.length > 0 && <span className="day-cell__dot day-cell__dot--advisory" title={`${advisories.length} advisory`} />}
          {filters.demands && demands.length > 0 && <span className="day-cell__dot day-cell__dot--demand" title={`${demands.length} demand`} />}
        </div>
      )}

      {/* Events */}
      <div className="day-cell__events" style={isMonthView ? { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' } : undefined}>
        {!isMonthView && filters.advisories && advisories.slice(0, 2).map((a, i) => (
          <div key={i} className={`day-event--advisory day-event--advisory-${a.severity?.toLowerCase()}`}>
            <AlertIcon /> {a.title?.substring(0, 22) || 'Advisory'}{a.title?.length > 22 ? '…' : ''}
          </div>
        ))}
        {!isMonthView && filters.demands && demands.length > 0 && (
          <div className="day-event--demand">
            <FishIcon /> {demands.length} demand{demands.length > 1 ? 's' : ''} due
          </div>
        )}
        {filters.trips && trips.map((t, i) => (
          <div 
            key={t.id || i} 
            className="day-event--trip" 
            draggable={t.status === 'PLANNED'} 
            onDragStart={e => {
              if (t.status === 'PLANNED' && onDragStart) onDragStart(t)
            }}
            style={{ cursor: t.status === 'PLANNED' ? 'grab' : 'default', opacity: t.status === 'COMPLETED' ? 0.6 : 1 }}
          >
            <AnchorIcon /> {t.vesselName || t.targetArea}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ date, forecast, advisories, demands, trips, isBestDay, onClose, onSchedule, onInterest }) {
  const risk = forecast ? riskFromWave(forecast.wave) : null
  const rc = risk ? riskClass(risk) : ''

  return (
    <div className="planner-detail">
      <div className="planner-detail__header">
        <div>
          <p className="planner-detail__date">{fmtShortDate(date)}</p>
          <p className="planner-detail__weekday">{fmtWeekday(date)}</p>
        </div>
        <button className="planner-detail__close" onClick={onClose}><XIcon /></button>
      </div>

      { (() => {
          const today = new Date();
          today.setHours(0,0,0,0);
          const isPast = date < today;
          if (isPast) return null;

          return (
            <div style={{ padding: '0 18px 14px' }}>
              <button 
                onClick={onSchedule}
                style={{ width: '100%', padding: '10px', background: 'var(--accent)', color: '#000', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Schedule Trip
              </button>
            </div>
          );
      })() }

      {/* Forecast */}
      <div className="planner-detail__section">
        <p className="planner-detail__section-title">
          {isBestDay && <span style={{ color: 'var(--caution)', marginRight: 6 }}><StarIcon /></span>}
          Sea Forecast
          {isBestDay && <span style={{ color: 'var(--caution)', fontSize: 11, marginLeft: 6, fontWeight: 600 }}>Recommended</span>}
        </p>
        {forecast ? (
          <div className="detail-forecast">
            <div className="detail-forecast__risk">
              <span className={`day-cell__risk-chip day-cell__risk-chip--${rc}`}>
                {risk === 'SAFE' ? '✓' : risk === 'CAUTION' ? '!' : '✕'} {risk}
              </span>
            </div>
            <div className="detail-forecast__stats">
              <div className="detail-forecast__stat">
                <WavesIcon /> Wave: <strong>{forecast.wave}m</strong>
              </div>
              <div className="detail-forecast__stat">
                <WindIcon /> Wind: <strong>{forecast.wind} km/h</strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="detail-empty">No forecast data available</p>
        )}
      </div>

      {/* Advisories */}
      <div className="planner-detail__section">
        <p className="planner-detail__section-title">Advisories ({advisories.length})</p>
        {advisories.length > 0 ? advisories.map((a, i) => (
          <div key={i} className="detail-item">
            <div className="detail-item__head">
              <span className="detail-item__title">{a.title}</span>
              <span className={`day-cell__risk-chip day-cell__risk-chip--${riskClass(a.severity === 'LOW' ? 'SAFE' : a.severity === 'MEDIUM' ? 'CAUTION' : 'UNSAFE')}`}>
                {a.severity}
              </span>
            </div>
            <p className="detail-item__sub">{a.affectedArea}</p>
            {a.message && <p className="detail-item__sub" style={{ marginTop: 4, color: 'var(--text-3)' }}>{a.message}</p>}
          </div>
        )) : (
          <p className="detail-empty">No active advisories</p>
        )}
      </div>

      {/* Demand Deadlines */}
      <div className="planner-detail__section">
        <p className="planner-detail__section-title">Demand Deadlines ({demands.length})</p>
        {demands.length > 0 ? demands.map((d, i) => (
          <div key={i} className="detail-item">
            <div className="detail-item__head">
              <span className="detail-item__title">{d.fishSpecies?.commonName}</span>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                ₱{d.offerPricePerKg}/kg
              </span>
            </div>
            <p className="detail-item__sub">
              {d.vendorName || 'Vendor'} · {d.marketLocation?.name} · {d.quantityKg} kg
            </p>
            {d.status === 'OPEN' && (
              <button 
                onClick={() => onInterest(d)}
                style={{ marginTop: 8, padding: '4px 10px', fontSize: 11, background: 'rgba(0, 201, 212, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4, cursor: 'pointer' }}
              >
                Express Interest
              </button>
            )}
          </div>
        )) : (
          <p className="detail-empty">No demand deadlines</p>
        )}
      </div>

      {/* Past Trips */}
      <div className="planner-detail__section">
        <p className="planner-detail__section-title">Trips ({trips.length})</p>
        {trips.length > 0 ? trips.map((t, i) => (
          <div key={i} className="detail-item">
            <div className="detail-item__head">
              <span className="detail-item__title">{t.departurePoint} → {t.targetArea}</span>
              <span className={`day-cell__risk-chip day-cell__risk-chip--${t.status === 'COMPLETED' ? 'safe' : 'caution'}`}>
                {t.status}
              </span>
            </div>
            {t.vesselName && <p className="detail-item__sub">{t.vesselName}</p>}
          </div>
        )) : (
          <p className="detail-empty">No trips on this day</p>
        )}
      </div>
    </div>
  )
}

// ── Main TripPlanner ──────────────────────────────────────────────────────────

export default function TripPlanner({ token }) {
  const [view, setView] = useState('week') // 'week' | 'month'
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [interestModal, setInterestModal] = useState(null)
  const [draggedTrip, setDraggedTrip] = useState(null)
  const [filters, setFilters] = useState({
    advisories: true,
    demands: true,
    trips: true
  })
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date()
    d.setHours(0,0,0,0)
    return d
  })
  const [selectedDate, setSelectedDate] = useState(null)
  const [conditions, setConditions] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [listings, setListings] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0,0,0,0)
    return d
  }, [])

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
      setListings(mkl.filter(l => l.status === 'OPEN'))
      setTrips([...t_comp, ...t_canc, ...t_plan, ...t_act])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  // ── Compute calendar days ─────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    if (view === 'week') {
      const weekStart = startOfWeek(anchorDate)
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    }
    // Month view
    const y = anchorDate.getFullYear()
    const m = anchorDate.getMonth()
    const firstOfMonth = new Date(y, m, 1)
    const startDate = startOfWeek(firstOfMonth)
    const days = []
    let d = new Date(startDate)
    // fill 6 rows max
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    // trim trailing week if unnecessary
    if (days.length > 35) {
      const lastWeekStart = days[35]
      if (lastWeekStart.getMonth() !== m) {
        days.splice(35, 7)
      }
    }
    return days
  }, [anchorDate, view])

  // ── Forecast baseline from marine conditions ──────────────────────────────

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

  // ── Build forecast map ─────────────────────────────────────────────────────

  const forecastMap = useMemo(() => {
    const map = {}
    calendarDays.forEach(d => {
      const diff = Math.round((d - today) / 86400000)
      if (diff === 0) {
        // Use real data for today
        map[dateKey(d)] = { wave: +baseline.wave.toFixed(2), wind: +baseline.wind.toFixed(1) }
      } else if (diff > 0 && diff <= 7) {
        map[dateKey(d)] = projectDayForecast(baseline.wave, baseline.wind, diff)
      } else if (diff > 7) {
        // beyond 7 days — still project but less certain
        map[dateKey(d)] = projectDayForecast(baseline.wave, baseline.wind, diff)
      }
      // past days without data get no forecast
    })
    return map
  }, [calendarDays, baseline, today])

  // ── Build advisory map ─────────────────────────────────────────────────────

  const advisoryMap = useMemo(() => {
    const map = {}
    advisories.forEach(a => {
      const from = a.activeFrom ? new Date(a.activeFrom) : null
      const to = a.activeTo ? new Date(a.activeTo) : null
      calendarDays.forEach(d => {
        const dayStart = new Date(d)
        dayStart.setHours(0,0,0,0)
        const dayEnd = new Date(d)
        dayEnd.setHours(23,59,59,999)
        const isActive = (!from || dayEnd >= from) && (!to || dayStart <= to)
        if (isActive) {
          const k = dateKey(d)
          if (!map[k]) map[k] = []
          map[k].push(a)
        }
      })
    })
    return map
  }, [advisories, calendarDays])

  // ── Build demand deadline map ──────────────────────────────────────────────

  const demandMap = useMemo(() => {
    const map = {}
    listings.forEach(l => {
      if (!l.neededBy) return
      const nb = new Date(l.neededBy)
      const k = dateKey(nb)
      if (!map[k]) map[k] = []
      map[k].push(l)
    })
    return map
  }, [listings])

  // ── Build trip map ─────────────────────────────────────────────────────────

  const tripMap = useMemo(() => {
    const map = {}
    trips.forEach(t => {
      if (!t.startedAt) return
      const d = new Date(t.startedAt)
      const k = dateKey(d)
      if (!map[k]) map[k] = []
      map[k].push(t)
    })
    return map
  }, [trips])

  // ── Best day computation ───────────────────────────────────────────────────

  const bestDays = useMemo(() => {
    const set = new Set()
    calendarDays.forEach(d => {
      const diff = Math.round((d - today) / 86400000)
      if (diff < 0) return // past days can't be best
      const k = dateKey(d)
      const fc = forecastMap[k]
      if (!fc) return
      const risk = riskFromWave(fc.wave)
      if (risk !== 'SAFE') return
      // No HIGH/CRITICAL advisories
      const dayAdvs = advisoryMap[k] || []
      if (dayAdvs.some(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')) return
      // Has at least one demand within 2 days
      const hasDemand = listings.some(l => {
        if (!l.neededBy) return false
        const nb = new Date(l.neededBy)
        const dayDiff = Math.round((nb - d) / 86400000)
        return dayDiff >= 0 && dayDiff <= 2
      })
      if (hasDemand) set.add(k)
    })
    return set
  }, [calendarDays, forecastMap, advisoryMap, listings, today])

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigate(dir) {
    setAnchorDate(prev => {
      const d = new Date(prev)
      if (view === 'week') {
        d.setDate(d.getDate() + dir * 7)
      } else {
        d.setMonth(d.getMonth() + dir)
      }
      return d
    })
  }

  function goToday() {
    const d = new Date()
    d.setHours(0,0,0,0)
    setAnchorDate(d)
  }

  // ── Drag and Drop ──────────────────────────────────────────────────────────

  async function handleDrop(targetDate) {
    if (!draggedTrip) return
    const trip = draggedTrip
    setDraggedTrip(null)
    
    const dropTarget = new Date(targetDate)
    dropTarget.setHours(0,0,0,0)
    const todayDate = new Date()
    todayDate.setHours(0,0,0,0)
    if (dropTarget < todayDate) {
      setError("Cannot reschedule a trip to a past date.")
      return
    }

    // Only update if it's placed on a new date
    const dDate = new Date(trip.startedAt)
    dDate.setHours(0,0,0,0)
    if (sameDay(dDate, targetDate)) return
    
    // Attempt api call
    try {
      const newStart = new Date(targetDate)
      newStart.setHours(8,0,0,0) // default 8am for dropped jobs
      await apiPut(`/trips/${trip.id}`, token, {
        departurePoint: trip.departurePoint,
        targetArea: trip.targetArea,
        vesselName: trip.vesselName,
        notes: trip.notes,
        status: trip.status,
        startedAt: newStart.toISOString(),
      })
      load() // Refresh trips
    } catch(err) {
      setError("Failed to reschedule trip: " + err.message)
    }
  }

  function handleInterestSuccess() {
    setInterestModal(null)
  }

  // ── Period label ───────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (view === 'month') {
      return `${MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`
    }
    const ws = startOfWeek(anchorDate)
    const we = addDays(ws, 6)
    if (ws.getMonth() === we.getMonth()) {
      return `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`
    }
    return `${MONTHS[ws.getMonth()].slice(0,3)} ${ws.getDate()} – ${MONTHS[we.getMonth()].slice(0,3)} ${we.getDate()}, ${we.getFullYear()}`
  }, [anchorDate, view])

  // ── Selected day data ──────────────────────────────────────────────────────

  const selKey = selectedDate ? dateKey(selectedDate) : null
  const selForecast = selKey ? forecastMap[selKey] : null
  const selAdvisories = selKey ? (advisoryMap[selKey] || []) : []
  const selDemands = selKey ? (demandMap[selKey] || []) : []
  const selTrips = selKey ? (tripMap[selKey] || []) : []
  const selIsBest = selKey ? bestDays.has(selKey) : false

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="planner">
      {/* Header */}
      <div className="planner-header">
        <div className="planner-header__left">
          <h1 className="planner-header__title">Trip Planner</h1>
          <p className="planner-header__sub">Plan your fishing trips around weather, advisories, and market demand</p>
        </div>
        <div className="planner-header__right">
          <button
            className="planner-nav__today"
            onClick={load}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

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

      {/* Legend */}
      <div className="planner-legend">
        <div className="planner-legend__item planner-legend__item--static">
          <span className="planner-legend__swatch" style={{ background: 'var(--safe)' }} />
          Safe
        </div>
        <div className="planner-legend__item planner-legend__item--static">
          <span className="planner-legend__swatch" style={{ background: 'var(--caution)' }} />
          Caution
        </div>
        <div className="planner-legend__item planner-legend__item--static">
          <span className="planner-legend__swatch" style={{ background: 'var(--unsafe)' }} />
          Unsafe
        </div>
        <div 
          className={`planner-legend__item${!filters.advisories ? ' planner-legend__item--off' : ''}`}
          onClick={() => setFilters(f => ({...f, advisories: !f.advisories}))}
        >
          <span className="planner-legend__swatch" style={{ background: 'var(--amber)' }} />
          Advisory
        </div>
        <div 
          className={`planner-legend__item${!filters.demands ? ' planner-legend__item--off' : ''}`}
          onClick={() => setFilters(f => ({...f, demands: !f.demands}))}
        >
          <span className="planner-legend__swatch" style={{ background: 'var(--accent)' }} />
          Demand
        </div>
        <div 
          className={`planner-legend__item${!filters.trips ? ' planner-legend__item--off' : ''}`}
          onClick={() => setFilters(f => ({...f, trips: !f.trips}))}
        >
          <span className="planner-legend__swatch" style={{ background: '#7DD3FC' }} />
          Trip
        </div>
        <div className="planner-legend__item planner-legend__item--static">
          <span style={{ color: 'var(--caution)', display: 'flex', alignItems: 'center' }}><StarIcon /></span>
          Best Day
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="db-error" style={{ margin: '0 28px' }}>
          <AlertIcon />
          <span>{error}</span>
          <button className="db-error__retry" onClick={load}>Retry</button>
        </div>
      )}

      {/* Calendar body */}
      <div className="planner-body">
        <div className="planner-grid-wrap">
          {/* DOW headers */}
          <div className="planner-dow">
            {DOW.map(d => <div key={d} className="planner-dow__label">{d}</div>)}
          </div>

          {/* Grid */}
          {loading ? (
            <div className={view === 'week' ? 'planner-week-grid' : 'planner-month-grid'}>
              {Array.from({ length: view === 'week' ? 7 : 35 }, (_, i) => (
                <Skeleton
                  key={i}
                  height={view === 'week' ? '180px' : '90px'}
                />
              ))}
            </div>
          ) : (
            <div className={view === 'week' ? 'planner-week-grid' : 'planner-month-grid'}>
              {calendarDays.map(d => {
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
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedDate && !loading && (
          <DetailPanel
            date={selectedDate}
            forecast={selForecast}
            advisories={selAdvisories}
            demands={selDemands}
            trips={selTrips}
            isBestDay={selIsBest}
            onClose={() => setSelectedDate(null)}
            onSchedule={() => setShowScheduleModal(true)}
            onInterest={setInterestModal}
          />
        )}
      </div>
      
      {/* Schedule Trip Modal */}
      {showScheduleModal && (
        <StartTripModal
          token={token}
          initialDate={selectedDate}
          initialStatus="PLANNED"
          onCreated={() => {
            setShowScheduleModal(false)
            load()
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Interest Modal */}
      {interestModal && (
        <InterestModal
          listing={interestModal}
          token={token}
          onSuccess={handleInterestSuccess}
          onClose={() => setInterestModal(null)}
        />
      )}
    </div>
  )
}
