/* Dashboard — Overall La Union hero + Active Trip Console promo + zone carousel */

function ActiveTripPromo({ trip, totalKg, hours, minutes, speciesCount, entriesCount, onView, onLogCatch }) {
  const progressPct = Math.min(95, (hours / 12) * 100);
  return (
    <div className="promo-card">
      <div className="promo-card__head">
        <div className="promo-card__brand">
          <div className="promo-card__brand-mark">M</div>
          Mermaid<sup style={{ fontSize: 7, marginLeft: 1 }}>®</sup>
        </div>
        <span className="promo-card__tag">
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 99, background: "var(--ink-deep)", marginRight: 4 }} />
          LIVE
        </span>
      </div>
      <div className="promo-card__title">Active Trip</div>
      <div className="promo-card__trip-meta">
        <span className="kbd">{trip.code}</span>
        <span>·</span>
        <span style={{ color: "var(--ink-2)" }}>{trip.targetArea}</span>
      </div>

      <div className="promo-card__stat-grid">
        <div>
          <div className="promo-card__stat-label">Total catch</div>
          <div className="promo-card__stat-value">
            {totalKg.toFixed(1)}<small>kg</small>
          </div>
          <div className="promo-card__stat-foot">{speciesCount} species · {entriesCount} entries</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="promo-card__stat-label">Elapsed</div>
          <div className="promo-card__stat-timer">
            {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
          </div>
          <div className="promo-card__stat-foot">{trip.vesselName}</div>
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
        <button className="promo-card__btn promo-card__btn--lime" onClick={onLogCatch}>
          <window.I.Plus size={12} /> Log Catch Entry
        </button>
        <button className="promo-card__btn promo-card__btn--ghost" onClick={onView}>
          <window.I.Eye size={12} /> View Full Trip
        </button>
      </div>
    </div>
  );
}

function ZoneCarousel({ zones, selectedIdx, setSelectedIdx }) {
  const [paused, setPaused] = React.useState(false);

  // Auto-advance every 4 seconds
  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSelectedIdx(i => (i + 1) % zones.length);
    }, 4000);
    return () => clearInterval(id);
  }, [paused, zones.length, setSelectedIdx]);

  return (
    <div
      className="zone-car"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="zone-car__head">
        <div>
          <div className="card__title">Per-zone breakdown</div>
          <div className="card__sub">Specific conditions across La Union · auto-cycling</div>
        </div>
        <div className="zone-car__nav">
          <button className="topbar__icon-btn" style={{ width: 30, height: 30 }} onClick={() => setSelectedIdx(i => (i - 1 + zones.length) % zones.length)}>
            <window.I.ChevronLeft size={14} />
          </button>
          <div className="zone-car__dots">
            {zones.map((_, i) => (
              <button
                key={i}
                className={`zone-car__dot ${i === selectedIdx ? "zone-car__dot--on" : ""}`}
                onClick={() => setSelectedIdx(i)}
                aria-label={`Zone ${i + 1}`}
              />
            ))}
          </div>
          <button className="topbar__icon-btn" style={{ width: 30, height: 30 }} onClick={() => setSelectedIdx(i => (i + 1) % zones.length)}>
            <window.I.ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="zone-car__viewport">
        <div className="zone-car__track" style={{ transform: `translateX(-${selectedIdx * 100}%)` }}>
          {zones.map((z) => (
            <div key={z.id} className="zone-car__slide">
              <div className="zone-car__slide-left">
                <div className={`zone-car__pip zone-car__pip--${z.risk.toLowerCase()}`}>
                  <window.I.Compass size={14} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="zone-car__slide-name">{z.name}</div>
                  <div className="zone-car__slide-region">{z.region}</div>
                </div>
                <span className={`chip chip--${z.risk.toLowerCase()}`} style={{ marginLeft: "auto" }}>
                  <span className="chip__dot" />{z.risk}
                </span>
              </div>
              <div className="zone-car__slide-grid">
                <div className="zone-car__metric">
                  <div className="zone-car__metric-label"><window.I.Wave size={10} /> Wave</div>
                  <div className="zone-car__metric-val">{z.waveM}<small>m</small></div>
                </div>
                <div className="zone-car__metric">
                  <div className="zone-car__metric-label"><window.I.Wind size={10} /> Wind</div>
                  <div className="zone-car__metric-val">{z.windKmh}<small>km/h</small></div>
                </div>
                <div className="zone-car__metric">
                  <div className="zone-car__metric-label"><window.I.Thermo size={10} /> Temp</div>
                  <div className="zone-car__metric-val">{z.tempC}<small>°C</small></div>
                </div>
                <div className="zone-car__metric">
                  <div className="zone-car__metric-label"><window.I.Drop size={10} /> Rain</div>
                  <div className="zone-car__metric-val">{z.rainMm}<small>mm</small></div>
                </div>
                <div className="zone-car__metric">
                  <div className="zone-car__metric-label"><window.I.Compass size={10} /> Swell</div>
                  <div className="zone-car__metric-val">{z.swellM}<small>m</small></div>
                </div>
                <div className="zone-car__metric zone-car__metric--spark">
                  <div className="zone-car__metric-label">24h trend</div>
                  <div style={{ height: 28, marginTop: 2 }}>
                    <window.Sparkline data={z.spark} color={z.sparkColor} height={28} showDot />
                  </div>
                </div>
              </div>
              {z.advisory && (
                <div className="zone-car__advisory">
                  <window.I.Alert size={11} />
                  <strong>Advisory:</strong> {z.advisory}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ setPage }) {
  const [selectedZone, setSelectedZone] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const totalKg = DATA.catchLogs.reduce((s, c) => s + c.quantityKg, 0);
  const speciesCount = new Set(DATA.catchLogs.map(c => c.species)).size;
  const entriesCount = DATA.catchLogs.length;
  const elapsed = now - DATA.activeTrip.startedAt;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);

  // Overall La Union aggregate
  const zones = DATA.zones;
  const safeCount = zones.filter(z => z.risk === "SAFE").length;
  const cautionCount = zones.filter(z => z.risk === "CAUTION").length;
  const unsafeCount = zones.filter(z => z.risk === "UNSAFE").length;
  const overallRisk = unsafeCount > 0 ? "UNSAFE" : cautionCount > 0 ? "CAUTION" : "SAFE";
  const overallLabel = overallRisk === "SAFE" ? "Favorable" : overallRisk === "CAUTION" ? "Manageable" : "Dangerous";
  const overallMsg = overallRisk === "SAFE"
    ? `Conditions favorable across La Union — ${safeCount} of ${zones.length} zones cleared for fishing.`
    : overallRisk === "CAUTION"
    ? `Mixed conditions across La Union — ${cautionCount} zone${cautionCount !== 1 ? "s" : ""} under advisory.`
    : `Dangerous conditions in part of La Union — review zone breakdown before sailing.`;

  const avgWave = (zones.reduce((s, z) => s + z.waveM, 0) / zones.length).toFixed(1);
  const maxWind = Math.max(...zones.map(z => z.windKmh));
  const maxGust = Math.max(...zones.map(z => z.windGust));
  const avgTemp = (zones.reduce((s, z) => s + z.tempC, 0) / zones.length).toFixed(1);
  const totalRain = zones.reduce((s, z) => s + z.rainMm, 0).toFixed(1);

  return (
    <div className="dash fade-in">
      {/* Compact page head */}
      <div className="dash__head">
        <div>
          <div className="eyebrow">
            <span className="dot" />Region I · Ilocos · live marine ops
          </div>
          <h1 className="dash__title">La Union <em className="chip-lime">Conditions</em></h1>
        </div>
        <div className="dash__actions">
          <div className="seg">
            <button className="on">Now</button>
            <button>+6h</button>
            <button>+24h</button>
          </div>
          <button className="btn btn--ghost"><window.I.Refresh size={11} /> Refresh</button>
        </div>
      </div>

      {/* HERO bento row: Overall LU + Advisories */}
      <div className="dash__hero-row dash__hero-row--2col">
        <div className={`overall-hero overall-hero--${overallRisk.toLowerCase()}`}>
          <div className="overall-hero__main">
            <div className="overall-hero__head">
              <div className="overall-hero__region">
                <window.I.MapPin size={12} /> La Union · 4 zones · 18 communities
              </div>
              <div className="overall-hero__time">
                <window.I.Clock size={10} />Updated 45m ago
              </div>
            </div>
            <div className="overall-hero__status-row">
              <div className={`overall-hero__pulse overall-hero__pulse--${overallRisk.toLowerCase()}`}>
                <div className="overall-hero__pulse-ring" />
                <div className="overall-hero__pulse-ring overall-hero__pulse-ring--2" />
                <window.I.Compass size={26} />
              </div>
              <div>
                <div className="overall-hero__verdict-eyebrow">
                  Overall fishing conditions
                </div>
                <h2 className={`overall-hero__verdict overall-hero__verdict--${overallRisk.toLowerCase()}`}>
                  {overallLabel}
                </h2>
                <div className="overall-hero__verdict-tag">
                  <span className={`chip chip--${overallRisk.toLowerCase()}`}>
                    <span className="chip__dot" />{overallRisk}
                  </span>
                </div>
              </div>
            </div>
            <p className="overall-hero__msg">{overallMsg}</p>
          </div>

          <div className="overall-hero__kpis">
            <div className="overall-kpi">
              <div className="overall-kpi__label">Safe zones</div>
              <div className="overall-kpi__value" style={{ color: "var(--safe)" }}>{safeCount}<small>/{zones.length}</small></div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Caution</div>
              <div className="overall-kpi__value" style={{ color: cautionCount > 0 ? "var(--caution)" : "var(--ink-2)" }}>{cautionCount}</div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Avg wave</div>
              <div className="overall-kpi__value">{avgWave}<small>m</small></div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Max wind</div>
              <div className="overall-kpi__value">{maxWind}<small>km/h</small></div>
              <div className="overall-kpi__foot">gust {maxGust}</div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Avg temp</div>
              <div className="overall-kpi__value">{avgTemp}<small>°C</small></div>
            </div>
            <div className="overall-kpi">
              <div className="overall-kpi__label">Rain 6h</div>
              <div className="overall-kpi__value">{totalRain}<small>mm</small></div>
            </div>
          </div>
        </div>

        {/* Advisories card */}
        <div className="advisory-card">
          <div className="advisory-card__head">
            <div>
              <div className="card__title">Advisories</div>
              <div className="card__sub">{DATA.advisories.length} active · Region I</div>
            </div>
            <span className="chip chip--caution" style={{ padding: "3px 8px" }}>
              <span className="chip__dot" />{DATA.advisories.filter(a => a.severity === "HIGH").length} HIGH
            </span>
          </div>
          <div className="advisory-card__list">
            {DATA.advisories.map(a => {
              const Icon = window.I[a.icon] || window.I.Alert;
              const tone = a.severity === "HIGH" ? "unsafe" : a.severity === "MEDIUM" ? "caution" : a.severity === "LOW" ? "safe" : "violet";
              return (
                <div key={a.id} className={`advisory-item advisory-item--${tone}`}>
                  <div className={`advisory-item__icon advisory-item__icon--${tone}`}>
                    <Icon size={12} />
                  </div>
                  <div className="advisory-item__body">
                    <div className="advisory-item__title">{a.title}</div>
                    <div className="advisory-item__meta">{a.area} · {a.issuedAt}</div>
                  </div>
                  <span className={`advisory-item__sev advisory-item__sev--${tone}`}>{a.severity}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row — Carousel + Catch alerts + Active Trip (rightmost) */}
      <div className="dash__bottom dash__bottom--3col">
        <ZoneCarousel
          zones={zones}
          selectedIdx={selectedZone}
          setSelectedIdx={setSelectedZone}
        />

        <div className="card dash__card">
          <div className="card__head">
            <div>
              <div className="card__title">Catch alerts</div>
              <div className="card__sub">{DATA.catchAlerts.filter(a => a.status === "ACTIVE" || a.status === "MATCHED").length} live</div>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => setPage("alerts")}>
              <window.I.Arrow size={10} />
            </button>
          </div>
          <div className="dash__alerts">
            {DATA.catchAlerts.slice(0, 5).map(a => (
              <div key={a.id} className="dash__alert-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.species}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-code)" }}>{a.quantityKg}kg · ₱{a.askingPricePerKg}/kg</div>
                </div>
                <span className={`chip chip--${a.status === "MATCHED" || a.status === "SOLD" ? "safe" : a.status === "ACTIVE" ? "lime" : "unsafe"}`} style={{ fontSize: 9, padding: "2px 7px" }}>
                  <span className="chip__dot" />{a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ActiveTripPromo
          trip={DATA.activeTrip}
          totalKg={totalKg}
          hours={hours}
          minutes={minutes}
          speciesCount={speciesCount}
          entriesCount={entriesCount}
          onView={() => setPage("trips")}
          onLogCatch={() => setPage("trips")}
        />
      </div>
    </div>
  );
}

window.DashboardPage = DashboardPage;
