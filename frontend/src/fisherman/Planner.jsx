import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

// ── Inline mock data ─────────────────────────────────────────────────────────

const ADVISORIES = [
  { id: 1, severity: 'HIGH',   affectedArea: 'Sibuyan Sea', title: 'Tropical Depression Emong',
    message: 'Sustained winds 65 km/h; gusts to 90 km/h. Cancel all offshore trips through Friday.', ts: '2h ago' },
  { id: 2, severity: 'MEDIUM', affectedArea: 'Balayan Bay', title: 'Small-craft advisory',
    message: 'Wave heights 1.5–2.0m expected between 14:00–20:00. Exercise caution.', ts: '5h ago' },
]

const PAST_TRIPS = [
  { id: 2811, date: '2026-04-18', day: '18', month: 'APR', name: 'Balayan Bay Night Run',  zone: 'Balayan Bay',        status: 'COMPLETED' },
  { id: 2807, date: '2026-04-15', day: '15', month: 'APR', name: 'Verde Island Morning',   zone: 'Verde Passage',      status: 'COMPLETED' },
  { id: 2802, date: '2026-04-11', day: '11', month: 'APR', name: 'Tayabas Scout Trip',     zone: 'Tayabas Bay',        status: 'COMPLETED' },
  { id: 2794, date: '2026-04-07', day: '07', month: 'APR', name: 'Sibuyan Deepwater',      zone: 'Sibuyan Sea',        status: 'CANCELLED' },
  { id: 2788, date: '2026-04-03', day: '03', month: 'APR', name: 'Batangas Channel Dawn',  zone: 'Batangas Channel',   status: 'COMPLETED' },
]

const PLANNED_TRIPS = [
  { id: 2821, date: '2026-04-25', day: '25', month: 'APR', name: 'Verde Island Long Run',  zone: 'Verde Island Passage', status: 'PLANNED', crew: 4, depart: '03:30' },
  { id: 2823, date: '2026-04-28', day: '28', month: 'APR', name: 'Tayabas Grouper Hunt',   zone: 'Tayabas Bay',          status: 'PLANNED', crew: 3, depart: '04:15' },
]

const LISTINGS = [
  { id: 512, species: 'Yellowfin Tuna',      vendor: 'Marina Seafoods',    qty: 60,  price: 400 },
  { id: 510, species: 'Mahi-mahi',           vendor: 'Bay City Market',    qty: 40,  price: 270 },
  { id: 509, species: 'Spanish Mackerel',    vendor: 'J. Aquino & Sons',   qty: 25,  price: 340 },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [month, setMonth] = useState(new Date(2026, 3, 1)) // April 2026
  const [selected, setSelected] = useState(new Date(2026, 3, 23))

  // Build 42-cell grid
  const firstDow    = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate()
  const prevDays    = new Date(month.getFullYear(), month.getMonth(), 0).getDate()

  const cells = []
  for (let i = 0; i < firstDow; i++) {
    cells.push({ date: new Date(month.getFullYear(), month.getMonth()-1, prevDays - firstDow + 1 + i), other: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(month.getFullYear(), month.getMonth(), d), other: false })
  }
  while (cells.length < 42) {
    const n = cells.length - firstDow - daysInMonth + 1
    cells.push({ date: new Date(month.getFullYear(), month.getMonth()+1, n), other: true })
  }

  function forecastFor(date) {
    const day  = date.getDate()
    const seed = (day * 7 + month.getMonth()*13) % 23
    const wave = Math.max(0.3, 0.8 + Math.sin(seed * 0.7) * 0.9)
    const wind = Math.max(5, 14 + Math.cos(seed * 0.8) * 12)
    const risk = wave <= 1.1 ? 'SAFE' : wave <= 1.9 ? 'CAUTION' : 'UNSAFE'
    const isBest = wave < 0.9 && wind < 14 && !cells.find(c => c.other && c.date.getDate() === day)
    return { wave: +wave.toFixed(1), wind: Math.round(wind), risk, isBest }
  }

  const tripsByDay = {}
  ;[...PAST_TRIPS, ...PLANNED_TRIPS].forEach(t => {
    const key = t.date
    tripsByDay[key] = tripsByDay[key] || []
    tripsByDay[key].push(t)
  })

  const advisoriesByDay = { '2026-04-23': [ADVISORIES[0]], '2026-04-24': [ADVISORIES[1]] }

  const selF = forecastFor(selected)
  const monthLabel = month.toLocaleDateString('en', { month: 'long', year: 'numeric' })

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Planning</div>
          <h1 className="page__title" style={{marginTop: 4}}>Trip <em>Planner</em></h1>
          <p className="page__sub">Match upcoming days with forecasts, demand, and your capacity.</p>
        </div>
        <div className="page__actions">
          <div className="row" style={{gap: 4}}>
            <button className="btn btn--sm"><I.Filter size={12} /> Filters</button>
            <button className="btn btn--sm">Month</button>
            <button className="btn btn--sm btn--ghost">Week</button>
          </div>
          <button className="btn btn--primary"><I.Plus size={14} /> New trip</button>
        </div>
      </div>

      <div className="planner-grid">
        {/* Calendar */}
        <div className="cal">
          <div className="cal__head">
            <div className="cal__title">{monthLabel}</div>
            <div className="cal__nav">
              <button className="btn btn--sm btn--ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}><I.ChevL size={14} /></button>
              <button className="btn btn--sm btn--ghost" onClick={() => setMonth(new Date(2026, 3, 1))}>Today</button>
              <button className="btn btn--sm btn--ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}><I.ChevR size={14} /></button>
            </div>
          </div>
          <div className="cal__weekday">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="cal__grid">
            {cells.map((c, i) => {
              const f = forecastFor(c.date)
              const today = c.date.toDateString() === new Date(2026, 3, 23).toDateString()
              const sel   = c.date.toDateString() === selected.toDateString()
              const dateKey = `${c.date.getFullYear()}-${String(c.date.getMonth()+1).padStart(2,'0')}-${String(c.date.getDate()).padStart(2,'0')}`
              const trips = tripsByDay[dateKey] || []
              const advs  = advisoriesByDay[dateKey] || []
              return (
                <div key={i}
                     className={`cal-day${c.other ? ' cal-day--other' : ''}${today ? ' cal-day--today' : ''}${sel ? ' cal-day--sel' : ''}`}
                     onClick={() => setSelected(c.date)}>
                  <div className="row" style={{justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <span className="cal-day__num">{c.date.getDate()}</span>
                    {f.isBest && !c.other && <span className="cal-day__best" title="Best conditions"><I.Star size={12} /></span>}
                  </div>
                  {!c.other && (
                    <div className={`cal-day__bar cal-day__bar--${f.risk.toLowerCase()}`} />
                  )}
                  {!c.other && trips.length > 0 && (
                    <div className="cal-day__event cal-day__event--trip">
                      <I.Anchor size={9} style={{marginRight:3, verticalAlign:-1}} />
                      {trips[0].name.split(' ').slice(0,2).join(' ')}
                    </div>
                  )}
                  {!c.other && advs.length > 0 && (
                    <div className="cal-day__event cal-day__event--advisory">
                      <I.Alert size={9} style={{marginRight:3, verticalAlign:-1}} />
                      {advs[0].title.substring(0, 18)}{advs[0].title.length > 18 ? '…' : ''}
                    </div>
                  )}
                  {!c.other && f.risk !== 'SAFE' && trips.length === 0 && advs.length === 0 && (
                    <div style={{marginTop: 'auto', fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>
                      {f.wave}m · {f.wind}km/h
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="side-panel">
          {/* Selected day detail */}
          <div className="card">
            <div className="eyebrow">Selected day</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 4, letterSpacing: '-0.01em' }}>
              {selected.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <div className="row" style={{ marginTop: 8 }}>
              <span className={`chip chip--${selF.risk === 'SAFE' ? 'safe' : selF.risk === 'CAUTION' ? 'caution' : 'unsafe'} chip--dot`}>{selF.risk}</span>
              {selF.isBest && <span className="chip chip--accent chip--dot">Best of week</span>}
            </div>

            <div className="day-forecast">
              <div className="day-forecast__item">
                <div className="label">Wave</div>
                <div className="val">{selF.wave}<small>m</small></div>
              </div>
              <div className="day-forecast__item">
                <div className="label">Wind</div>
                <div className="val">{selF.wind}<small>km/h</small></div>
              </div>
              <div className="day-forecast__item">
                <div className="label">Tide low</div>
                <div className="val">03:42</div>
              </div>
              <div className="day-forecast__item">
                <div className="label">Tide high</div>
                <div className="val">09:15</div>
              </div>
            </div>

            <button className="btn btn--accent" style={{width: '100%', justifyContent: 'center'}}>
              <I.Plus size={12} /> Schedule trip for this day
            </button>
          </div>

          {/* Demand on this day */}
          <div className="card">
            <div className="card__head" style={{marginBottom: 10}}>
              <div>
                <div className="card__title">Open demand</div>
                <div className="card__sub">Vendors seeking on this day</div>
              </div>
            </div>
            {LISTINGS.map(l => (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '10px 0', borderBottom: '1px dashed var(--line-soft)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{l.species}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{l.vendor} · {l.qty}kg</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>
                  ₱{l.price}<small style={{fontSize:10, color:'var(--ink-4)', fontFamily:'var(--font-mono)', marginLeft:2}}>/kg</small>
                </div>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" style={{marginTop: 10}}>See all in Marketplace <I.Arrow size={12} /></button>
          </div>

          {/* Upcoming trips */}
          <div className="card">
            <div className="card__title">Upcoming trips</div>
            <div style={{marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10}}>
              {PLANNED_TRIPS.map(t => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, padding: 10, background: 'var(--paper)', borderRadius: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)'}}>{t.month}</div>
                    <div style={{fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1}}>{t.day}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      Depart {t.depart} · {t.crew} crew
                    </div>
                  </div>
                  <span className="chip chip--accent chip--dot">Planned</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
