// ─── My Trips ───────────────────────────────────────────────────────────
function TripsPage() {
  const [tab, setTab] = useState('active');
  const t = ACTIVE_TRIP;

  const checklistItems = [
    { k: 'fuel', label: 'Fuel topped off' },
    { k: 'engine', label: 'Engine check' },
    { k: 'radio', label: 'Radio comms OK' },
    { k: 'lifeVest', label: 'Life vests (x4)' },
    { k: 'weather', label: 'Weather briefed' },
    { k: 'emergencyKit', label: 'Emergency kit' },
    { k: 'ice', label: 'Ice & cooler loaded' },
    { k: 'bait', label: 'Bait & lures' },
  ];
  const checkedCount = checklistItems.filter(it => t.checklist[it.k]).length;

  const totalKg = t.catches.reduce((a, c) => a + c.kg, 0);
  const totalRevenue = t.catches.reduce((a, c) => a + c.kg * c.price, 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Trips</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            <em>My</em> Trips
          </h1>
          <p className="page__sub">24 total logged · ₱214,600 lifetime revenue</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Receipt size={14} /> Export log</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Start trip</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'active', label: 'Active', count: 1 },
          { id: 'planned', label: 'Planned', count: PLANNED_TRIPS.length },
          { id: 'past', label: 'Past', count: PAST_TRIPS.length },
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
        <div className="trips-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Active trip hero */}
            <div className="active-trip">
              <div className="active-trip__head">
                <div>
                  <div className="row" style={{gap: 8}}>
                    <span className="chip chip--safe chip--dot">ACTIVE</span>
                    <span className="kbd">{t.id}</span>
                  </div>
                  <h2 className="active-trip__title" style={{marginTop: 8}}>{t.name}</h2>
                  <div className="active-trip__meta">
                    <span><I.Anchor size={11} style={{verticalAlign:-1, marginRight:4}} /> {t.vessel}</span>
                    <span><I.Users size={11} style={{verticalAlign:-1, marginRight:4}} /> {t.crew} crew</span>
                    <span><I.MapPin size={11} style={{verticalAlign:-1, marginRight:4}} /> {t.zone}</span>
                    <span><I.Clock size={11} style={{verticalAlign:-1, marginRight:4}} /> Departed {t.departed}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="active-trip__timer">
                    {String(t.durationH).padStart(2,'0')}:{String(t.durationM).padStart(2,'0')}:47
                    <small>elapsed</small>
                  </div>
                </div>
              </div>

              <div className="active-trip__grid">
                <div className="tile">
                  <div className="tile__label">Distance</div>
                  <div className="tile__value">{t.distance}<small>nm</small></div>
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
                  <div className="tile__value">{t.fuel}<small>%</small></div>
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
                  <div className="card__sub">{t.catches.length} entries · {totalKg.toFixed(1)}kg total</div>
                </div>
                <button className="btn btn--sm"><I.Plus size={12} /> Add entry</button>
              </div>
              <div className="catch-log">
                {t.catches.slice().reverse().map((c, i) => (
                  <div key={i} className="catch-entry">
                    <div className="catch-entry__dot" />
                    <div>
                      <div className="catch-entry__species">{c.species}</div>
                      <div className="catch-entry__meta">{c.ts} · {c.qty}{c.note ? ` · ${c.note}` : ''}</div>
                    </div>
                    <div className="catch-entry__qty">{c.kg}<small style={{color:'var(--ink-4)'}}>kg</small></div>
                    <div className="catch-entry__price">₱{c.price}<small>/kg</small></div>
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
                  <div key={it.k} className={`check-item${t.checklist[it.k] ? ' check-item--on' : ''}`}>
                    <div className="check-item__box">
                      {t.checklist[it.k] && <I.Check size={10} />}
                    </div>
                    <span>{it.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current conditions */}
            <div className="card">
              <div className="card__title">Right now at {t.zone}</div>
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

            {/* Crew */}
            <div className="card">
              <div className="card__title">Crew aboard</div>
              <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8}}>
                {[
                  { name: 'Ramiro Delgado', role: 'Captain · You', a: 'RD' },
                  { name: 'Jomar Santos',    role: 'First mate',     a: 'JS' },
                  { name: 'Elias Cruz',      role: 'Deckhand',       a: 'EC' },
                ].map(p => (
                  <div key={p.name} className="row" style={{gap: 10}}>
                    <div style={{width: 30, height: 30, borderRadius: 8, background: 'var(--paper-3)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600}}>{p.a}</div>
                    <div>
                      <div style={{fontSize: 13, fontWeight: 500}}>{p.name}</div>
                      <div style={{fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'past' && (
        <div>
          {PAST_TRIPS.map(tp => (
            <div key={tp.id} className="trip-card">
              <div className="trip-card__date">
                <div className="trip-card__month">{tp.month}</div>
                <div className="trip-card__day">{tp.day}</div>
              </div>
              <div>
                <div className="trip-card__name">{tp.name}</div>
                <div className="trip-card__sub">{tp.id} · {tp.zone} · {tp.crew} crew</div>
              </div>
              <div className="trip-card__stat">
                <div className="v">{tp.durationH.toFixed(1)}h</div>
                <div className="l">Duration</div>
              </div>
              <div className="trip-card__stat">
                <div className="v">{tp.catchKg}<small style={{fontSize: 12, color: 'var(--ink-4)'}}>kg</small></div>
                <div className="l">Catch</div>
              </div>
              <div className="trip-card__stat">
                <div className="v">₱{(tp.revenue/1000).toFixed(1)}k</div>
                <div className="l">Revenue</div>
              </div>
              <span className={`chip ${tp.status === 'CANCELLED' ? 'chip--unsafe' : 'chip--safe'} chip--dot`}>
                {tp.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'planned' && (
        <div>
          {PLANNED_TRIPS.map(tp => (
            <div key={tp.id} className="trip-card">
              <div className="trip-card__date">
                <div className="trip-card__month">{tp.month}</div>
                <div className="trip-card__day">{tp.day}</div>
              </div>
              <div>
                <div className="trip-card__name">{tp.name}</div>
                <div className="trip-card__sub">{tp.id} · {tp.zone} · Depart {tp.depart}</div>
              </div>
              <div className="trip-card__stat">
                <div className="v">{tp.crew}</div>
                <div className="l">Crew</div>
              </div>
              <span className="chip chip--accent chip--dot">PLANNED</span>
              <button className="btn btn--sm">Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.TripsPage = TripsPage;
