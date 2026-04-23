// ─── Dashboard ─────────────────────────────────────────────────────────
function SparkLine({ data, color = 'var(--accent)', height = 28 }) {
  const w = 90, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(' L ')}`;
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={areaPath} fill={color} opacity="0.1" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForecastChart({ data }) {
  const w = 600, h = 160, p = { l: 32, r: 12, t: 12, b: 22 };
  const iw = w - p.l - p.r, ih = h - p.t - p.b;
  const waves = data.map(d => d.wave), winds = data.map(d => d.wind);
  const wMin = 0, wMax = Math.max(...waves) * 1.25;
  const sMin = 0, sMax = Math.max(...winds) * 1.25;

  const waveLine = data.map((d, i) => {
    const x = p.l + (i / (data.length - 1)) * iw;
    const y = p.t + ih - ((d.wave - wMin) / (wMax - wMin)) * ih;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const windLine = data.map((d, i) => {
    const x = p.l + (i / (data.length - 1)) * iw;
    const y = p.t + ih - ((d.wind - sMin) / (sMax - sMin)) * ih;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const yTicks = 4;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {/* grid */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = p.t + (ih / yTicks) * i;
        return <line key={i} className="grid-line" x1={p.l} x2={w-p.r} y1={y} y2={y} />;
      })}
      {/* y labels (wave scale) */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = (wMax - (wMax - wMin) * (i / yTicks)).toFixed(1);
        const y = p.t + (ih / yTicks) * i;
        return <text key={i} className="axis" x={p.l - 8} y={y + 3} textAnchor="end">{val}m</text>;
      })}
      {/* x labels */}
      {[0, 6, 12, 18, 23].map(i => {
        const x = p.l + (i / (data.length - 1)) * iw;
        return <text key={i} className="axis" x={x} y={h - 6} textAnchor="middle">{i === 0 ? 'Now' : `+${i}h`}</text>;
      })}
      {/* wave area */}
      <path d={`M ${waveLine.join(' L ')} L ${p.l+iw},${p.t+ih} L ${p.l},${p.t+ih} Z`} className="wave-path" />
      <path d={`M ${waveLine.join(' L ')}`} className="wave-path" fill="none" />
      {/* wind line */}
      <path d={`M ${windLine.join(' L ')}`} className="wind-path" fill="none" />
    </svg>
  );
}

function KPI({ label, value, unit, delta, deltaDir, spark }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}{unit ? <sup>{unit}</sup> : null}</div>
      <div className="kpi__foot">
        {delta && (
          <span className={deltaDir === 'up' ? 'delta-up' : 'delta-down'}>
            {deltaDir === 'up' ? '↑' : '↓'} {delta}
          </span>
        )}
        <span className="muted" style={{fontSize:11, fontFamily:'var(--font-mono)'}}>vs last week</span>
      </div>
      {spark && <div className="kpi__spark"><SparkLine data={spark} /></div>}
    </div>
  );
}

function DashboardPage({ setPage }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const overall = 'CAUTION';

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">{greet}, {USER.first}</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Today on the <em>water</em>.
          </h1>
          <p className="page__sub">{USER.vessel} · {USER.port} · License {USER.license}</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Calendar size={14} /> Plan trip</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Start trip</button>
        </div>
      </div>

      {/* Hero status */}
      <div className="hero" style={{ marginBottom: 18 }}>
        <div>
          <div className="hero__eyebrow">Sea Status · {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
          <h2 className="hero__headline">
            Conditions are <em>manageable</em> — two zones flagged, five safe.
          </h2>
          <p className="hero__sub">
            Verde Passage and Batangas Channel remain the best bets this morning. A small-craft advisory
            is active in Balayan Bay through 20:00; steer clear of Sibuyan Sea while TD Emong passes.
          </p>
          <div className="hero__row">
            <span className="chip chip--caution chip--dot">2 zones caution</span>
            <span className="chip chip--safe chip--dot">4 zones safe</span>
            <span className="chip chip--unsafe chip--dot">1 zone unsafe</span>
            <span className="chip chip--dot">Updated 4 min ago</span>
          </div>
        </div>
        <div className="hero__weather">
          <div className="hero__weather-item">
            <div className="eyebrow">Wave</div>
            <div className="data">0.8<small>m</small></div>
          </div>
          <div className="hero__weather-item">
            <div className="eyebrow">Wind</div>
            <div className="data">12<small>km/h SW</small></div>
          </div>
          <div className="hero__weather-item">
            <div className="eyebrow">Air</div>
            <div className="data">28<small>°C</small></div>
          </div>
          <div className="hero__weather-item">
            <div className="eyebrow">Tide</div>
            <div className="data">Low<small> · 09:15</small></div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid--kpi" style={{ marginBottom: 18 }}>
        <KPI label="Catch this week" value="312" unit="kg" delta="18%" deltaDir="up"
             spark={[24, 32, 28, 41, 38, 52, 58, 62]} />
        <KPI label="Revenue" value="₱54,280" delta="12%" deltaDir="up"
             spark={[3200, 4100, 3800, 5200, 4400, 6100, 6800, 7200]} />
        <KPI label="Avg price / kg" value="₱294" delta="₱8" deltaDir="up"
             spark={[270, 280, 285, 290, 282, 295, 298, 294]} />
        <KPI label="Trips completed" value="4" delta="1" deltaDir="up"
             spark={[1, 2, 3, 2, 3, 4, 3, 4]} />
      </div>

      {/* Main grid: chart + zone list + activity + advisories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Forecast chart */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">24-hour sea forecast</div>
                <div className="card__sub">Wave height (solid) · Wind speed (dashed)</div>
              </div>
              <div className="row">
                <span className="chip chip--accent chip--dot">Wave m</span>
                <span className="chip chip--caution chip--dot">Wind km/h</span>
              </div>
            </div>
            <ForecastChart data={FORECAST_24H} />
          </div>

          {/* Zone list */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Zone conditions</div>
                <div className="card__sub">6 zones monitored · tap for detail</div>
              </div>
              <button className="btn btn--sm btn--ghost">View map <I.Arrow size={12} /></button>
            </div>
            <div className="zone-list">
              {ZONES.map(z => (
                <div key={z.id} className="zone-row">
                  <div>
                    <div className="zone-row__name">{z.name}</div>
                    <div className="zone-row__region">{z.region}</div>
                  </div>
                  <div className="zone-row__metric">
                    {z.wave}m<small>wave</small>
                  </div>
                  <div className="zone-row__metric">
                    {z.wind}<small>km/h</small>
                  </div>
                  <div className="zone-row__metric">
                    {z.temp}°<small>air</small>
                  </div>
                  <span className={`chip chip--${z.risk === 'SAFE' ? 'safe' : z.risk === 'CAUTION' ? 'caution' : 'unsafe'} chip--dot`}>
                    {z.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active trip preview */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Active trip</div>
                <div className="card__sub">{ACTIVE_TRIP.id} · {ACTIVE_TRIP.name}</div>
              </div>
              <button className="btn btn--sm" onClick={() => setPage('trips')}>Open trip <I.Arrow size={12} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <div className="tile">
                <div className="tile__label">Duration</div>
                <div className="tile__value">{ACTIVE_TRIP.durationH}h {ACTIVE_TRIP.durationM}m</div>
              </div>
              <div className="tile">
                <div className="tile__label">Distance</div>
                <div className="tile__value">{ACTIVE_TRIP.distance}<small>nm</small></div>
              </div>
              <div className="tile">
                <div className="tile__label">Fuel</div>
                <div className="tile__value">{ACTIVE_TRIP.fuel}<small>%</small></div>
              </div>
              <div className="tile">
                <div className="tile__label">Catches</div>
                <div className="tile__value">{ACTIVE_TRIP.catches.length}</div>
              </div>
              <div className="tile">
                <div className="tile__label">ETA back</div>
                <div className="tile__value">{ACTIVE_TRIP.expectedReturn}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Advisories */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Active advisories</div>
                <div className="card__sub">{ADVISORIES.length} open · PAGASA + BFAR feeds</div>
              </div>
              <span className="chip chip--ink">{ADVISORIES.length}</span>
            </div>
            <div className="adv-list">
              {ADVISORIES.map(a => {
                const cls = a.sev === 'LOW' ? 'low' : a.sev === 'MED' ? 'med' : 'high';
                return (
                  <div key={a.id} className="adv-item">
                    <div className={`adv-item__icon adv-item__icon--${cls}`}><I.Alert size={14} /></div>
                    <div>
                      <div className="adv-item__title">{a.title}</div>
                      <div className="adv-item__msg">{a.msg}</div>
                      <div className="adv-item__meta">{a.area}</div>
                    </div>
                    <div className="adv-item__time">{a.ts}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Activity</div>
                <div className="card__sub">Latest across your operation</div>
              </div>
              <button className="btn btn--sm btn--ghost">See all</button>
            </div>
            <div className="adv-list">
              {ACTIVITY.slice(0, 5).map((a, i) => (
                <div key={i} className="adv-item">
                  <div className={`adv-item__icon adv-item__icon--${
                    a.type === 'advisory' ? 'high' : a.type === 'catch' ? 'med' : 'low'
                  }`}>
                    {a.type === 'offer'     && <I.Store size={14} />}
                    {a.type === 'catch'     && <I.Fish size={14} />}
                    {a.type === 'order'     && <I.Clipboard size={14} />}
                    {a.type === 'advisory'  && <I.Alert size={14} />}
                    {a.type === 'listing'   && <I.Store size={14} />}
                    {a.type === 'trip'      && <I.Anchor size={14} />}
                    {a.type === 'system'    && <I.Shield size={14} />}
                  </div>
                  <div>
                    <div className="adv-item__title"><strong>{a.who}</strong> {a.what}</div>
                  </div>
                  <div className="adv-item__time">{a.ts}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's best window */}
          <div className="card card--paper">
            <div className="card__head" style={{marginBottom: 8}}>
              <div className="card__title">Today's best window</div>
              <I.Star size={14} style={{color: 'var(--caution)'}} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1 }}>05:00 – 11:00</div>
              <div className="chip chip--safe chip--dot">Safe</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.5 }}>
              Verde Passage and Batangas Channel. Wave &lt;1m, wind 8–14 km/h SW.
              Tide rising through mid-morning — good for nearshore operations.
            </p>
            <button className="btn btn--accent mt-12" onClick={() => setPage('planner')}>
              Plan trip for this window <I.Arrow size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardPage = DashboardPage;
