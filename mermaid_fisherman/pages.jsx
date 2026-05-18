/* All other pages — Trips, Alerts, Deals, Orders, Earnings, Messages, Profile */

// ============================================================
// TRIPS
// ============================================================
function TripsPage({ setPage }) {
  const [tab, setTab] = React.useState("active");
  const t = DATA.activeTrip;
  const elapsed = Date.now() - t.startedAt;
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  const totalKg = DATA.catchLogs.reduce((a, c) => a + c.quantityKg, 0);
  const totalRev = DATA.catchLogs.reduce((a, c) => a + c.quantityKg * c.pricePerKg, 0);
  const checklist = [
    { k: "fuelChecked", label: "Fuel topped off" },
    { k: "engineChecked", label: "Engine check" },
    { k: "radioChecked", label: "Radio comms OK" },
    { k: "lifeVestChecked", label: "Life vests for all crew" },
    { k: "weatherReviewed", label: "Weather briefed" },
    { k: "emergencyKitChecked", label: "Emergency kit on board" },
  ];
  const checkedCount = checklist.filter(c => t.checklist[c.k]).length;

  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Operations · {DATA.pastTrips.length + 1} logged</div>
          <h1 className="page__title">My <em className="chip-lime">Trips</em></h1>
          <p className="page__sub">Track active voyages, pre-departure checklist, and historical hauls.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><window.I.Download size={12} /> Export log</button>
          {!t && <button className="btn btn--primary"><window.I.Plus size={12} /> Start trip</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tabs__item ${tab === "active" ? "tabs__item--on" : ""}`} onClick={() => setTab("active")}>
          Active <span className="tabs__item-count">{t ? 1 : 0}</span>
        </button>
        <button className={`tabs__item ${tab === "past" ? "tabs__item--on" : ""}`} onClick={() => setTab("past")}>
          Past <span className="tabs__item-count">{DATA.pastTrips.length}</span>
        </button>
      </div>

      {tab === "active" && t && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Active trip hero */}
            <div className="card" style={{ background: "radial-gradient(ellipse 60% 50% at 0% 0%, rgba(106, 95, 193, 0.22), transparent 60%), var(--bg-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className="chip chip--lime"><span className="chip__dot" style={{ background: "var(--ink-deep)" }} />ACTIVE</span>
                    <span className="kbd">{t.code}</span>
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>{t.targetArea}</h2>
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
                    <span><window.I.Anchor size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{t.vesselName}</span>
                    <span><window.I.MapPin size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{t.departurePoint}</span>
                    <span><window.I.Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Departed {new Date(t.startedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span><window.I.Users size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{t.crew} crew</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-code)", fontSize: 32, fontWeight: 600, color: "var(--accent-lime)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 }}>Elapsed</div>
                </div>
              </div>

              <div className="grid grid--kpi">
                <div className="kpi"><div className="kpi__label"><window.I.Fish size={11} /> Total catch</div><div className="kpi__value">{totalKg.toFixed(1)}<small>kg</small></div><div className="kpi__foot">{DATA.catchLogs.length} entries</div></div>
                <div className="kpi"><div className="kpi__label"><window.I.Wallet size={11} /> Est. value</div><div className="kpi__value">₱{(totalRev / 1000).toFixed(1)}<small>k</small></div><div className="kpi__foot">at logged prices</div></div>
                <div className="kpi"><div className="kpi__label"><window.I.Trend size={11} /> Catch rate</div><div className="kpi__value">{(totalKg / (h + m / 60)).toFixed(1)}<small>kg/h</small></div><div className="kpi__foot">above avg</div></div>
                <div className="kpi"><div className="kpi__label"><window.I.Compass size={11} /> Species</div><div className="kpi__value">{new Set(DATA.catchLogs.map(c => c.species)).size}</div><div className="kpi__foot">logged this trip</div></div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button className="btn btn--lime"><window.I.Plus size={12} /> Log catch</button>
                <div style={{ flex: 1 }} />
                <button className="btn btn--ghost"><window.I.Camera size={12} /> Photo log</button>
                <button className="btn btn--primary">End trip & alert vendors <window.I.Arrow size={12} /></button>
              </div>
            </div>

            {/* Catch log */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Catch log</div>
                  <div className="card__sub">{DATA.catchLogs.length} entries · {totalKg.toFixed(1)}kg total · est. ₱{totalRev.toLocaleString()}</div>
                </div>
                <button className="btn btn--sm"><window.I.Plus size={11} /> Add entry</button>
              </div>
              <table className="tbl">
                <thead><tr><th>Time</th><th>Species</th><th>Qty</th><th>₱/kg</th><th>Value</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {DATA.catchLogs.slice().reverse().map(c => (
                    <tr key={c.id}>
                      <td className="mono">{c.loggedAt}</td>
                      <td><strong>{c.species}</strong></td>
                      <td className="mono">{c.quantityKg}kg</td>
                      <td className="mono">₱{c.pricePerKg}</td>
                      <td className="mono"><strong>₱{(c.quantityKg * c.pricePerKg).toLocaleString()}</strong></td>
                      <td style={{ fontSize: 11, color: "var(--ink-4)" }}>{c.notes || "—"}</td>
                      <td><button className="topbar__icon-btn" style={{ width: 28, height: 28 }}><window.I.X size={11} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Checklist */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Pre-departure checklist</div>
                  <div className="card__sub">{checkedCount}/{checklist.length} complete</div>
                </div>
                <div style={{ position: "relative", width: 44, height: 44 }}>
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent-lime)" strokeWidth="3"
                      strokeDasharray={`${(checkedCount / checklist.length) * 113.1} 113.1`}
                      strokeDashoffset="0" transform="rotate(-90 22 22)" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "var(--font-code)", fontSize: 10, fontWeight: 700, color: "var(--accent-lime)" }}>
                    {Math.round((checkedCount / checklist.length) * 100)}%
                  </div>
                </div>
              </div>
              {checklist.map(it => (
                <div key={it.k} className={`checklist-item ${t.checklist[it.k] ? "checklist-item--on" : ""}`}>
                  <div className="checklist-item__box">{t.checklist[it.k] && <window.I.Check size={10} />}</div>
                  <span>{it.label}</span>
                </div>
              ))}
            </div>

            {/* Zone conditions */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Zone conditions</div>
                  <div className="card__sub">{t.targetArea}</div>
                </div>
                <span className="chip chip--safe"><span className="chip__dot" />SAFE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="kpi"><div className="kpi__label"><window.I.Wave size={10} /> Wave</div><div className="kpi__value" style={{ fontSize: 18 }}>{DATA.zones[0].waveM}<small>m</small></div></div>
                <div className="kpi"><div className="kpi__label"><window.I.Wind size={10} /> Wind</div><div className="kpi__value" style={{ fontSize: 18 }}>{DATA.zones[0].windKmh}<small>km/h</small></div></div>
                <div className="kpi"><div className="kpi__label"><window.I.Thermo size={10} /> Temp</div><div className="kpi__value" style={{ fontSize: 18 }}>{DATA.zones[0].tempC}<small>°C</small></div></div>
                <div className="kpi"><div className="kpi__label"><window.I.Drop size={10} /> Rain</div><div className="kpi__value" style={{ fontSize: 18 }}>{DATA.zones[0].rainMm}<small>mm</small></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "past" && (
        <div className="card card--flush">
          <table className="tbl">
            <thead>
              <tr><th>Date</th><th>Trip</th><th>Vessel/Port</th><th>Duration</th><th>Catch</th><th>Revenue</th><th>Status</th></tr>
            </thead>
            <tbody>
              {DATA.pastTrips.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.date}</strong></td>
                  <td><span className="kbd">{p.code}</span> <span style={{ marginLeft: 8 }}>{p.area}</span></td>
                  <td style={{ color: "var(--ink-3)" }}>{p.departure}</td>
                  <td className="mono">{p.durationH}h {p.durationM}m</td>
                  <td className="mono">{p.kg ? `${p.kg}kg` : "—"}</td>
                  <td className="mono">{p.revenue ? `₱${p.revenue.toLocaleString()}` : "—"}</td>
                  <td><span className={`chip chip--${p.status === "CANCELLED" ? "unsafe" : "safe"}`}><span className="chip__dot" />{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CATCH ALERTS
// ============================================================
function CatchAlertsPage() {
  const active = DATA.catchAlerts.filter(a => a.status === "ACTIVE" || a.status === "MATCHED");
  const sold = DATA.catchAlerts.filter(a => a.status === "SOLD");
  const expired = DATA.catchAlerts.filter(a => a.status === "EXPIRED");
  const totalKg = active.reduce((s, a) => s + a.quantityKg, 0);
  const potentialRev = active.reduce((s, a) => s + a.quantityKg * a.askingPricePerKg, 0);

  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Market-side · let vendors come to you</div>
          <h1 className="page__title">Catch <em className="chip-lime">Alerts</em></h1>
          <p className="page__sub">Post live catches — vendors get notified in real-time and bid for your haul.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><window.I.Refresh size={12} /> Refresh</button>
          <button className="btn btn--lime"><window.I.Plus size={12} /> New alert</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 22 }}>
        <div className="kpi"><div className="kpi__label">Active</div><div className="kpi__value">{active.length}</div><div className="kpi__foot">Of {DATA.catchAlerts.length} total</div></div>
        <div className="kpi"><div className="kpi__label">Offered</div><div className="kpi__value">{totalKg}<small>kg</small></div><div className="kpi__foot">Across {active.length} listings</div></div>
        <div className="kpi"><div className="kpi__label">Potential rev</div><div className="kpi__value" style={{ color: "var(--accent-lime)" }}>₱{(potentialRev / 1000).toFixed(1)}<small>k</small></div><div className="kpi__foot">At asking</div></div>
        <div className="kpi"><div className="kpi__label">Open offers</div><div className="kpi__value">{active.reduce((s, a) => s + a.offers, 0)}</div><div className="kpi__foot">From vendors</div></div>
        <div className="kpi"><div className="kpi__label">Sold</div><div className="kpi__value" style={{ color: "var(--safe)" }}>{sold.length}</div><div className="kpi__foot">Last 30d</div></div>
      </div>

      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Active alerts</div>
            <div className="card__sub">{active.length} live to vendor network</div>
          </div>
          <div className="seg">
            <button className="on">All</button>
            <button>Active</button>
            <button>Matched</button>
            <button>Sold</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {DATA.catchAlerts.map(a => (
            <div key={a.id} className="card" style={{
              padding: 18,
              background: a.urgent ? "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(251, 113, 133, 0.12), transparent 60%), var(--bg-card)" : "var(--bg-card)",
              borderColor: a.urgent ? "rgba(251, 113, 133, 0.32)" : "var(--hairline)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span className="kbd">CA-{a.id}</span>
                    {a.urgent && <span className="chip chip--unsafe"><span className="chip__dot" />Expires soon</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "#fff" }}>{a.species}</div>
                </div>
                <span className={`chip chip--${a.status === "MATCHED" ? "safe" : a.status === "ACTIVE" ? "lime" : a.status === "SOLD" ? "safe" : "unsafe"}`}>
                  <span className="chip__dot" />{a.status}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, paddingBottom: 14, borderBottom: "1px solid var(--hairline-2)" }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>Quantity</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "#fff", marginTop: 2 }}>{a.quantityKg}<small style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--ink-4)", fontWeight: 500 }}>kg</small></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>Asking</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "#fff", marginTop: 2 }}>₱{a.askingPricePerKg}<small style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--ink-4)", fontWeight: 500 }}>/kg</small></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>{a.status === "SOLD" ? "Sold for" : "Total"}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: a.status === "SOLD" ? "var(--accent-lime)" : "#fff", marginTop: 2 }}>
                    ₱{(a.soldFor || a.quantityKg * a.askingPricePerKg).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {a.status === "SOLD" ? (
                    <span><window.I.Verified size={11} style={{ verticalAlign: -1, color: "var(--safe)", marginRight: 4 }} />Sold to {a.vendor}</span>
                  ) : a.expiresIn ? (
                    <span><window.I.Clock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Expires in {a.expiresIn}</span>
                  ) : "—"}
                </div>
                {a.offers > 0 && a.status !== "SOLD" && a.status !== "EXPIRED" && (
                  <span className="chip chip--violet"><span className="chip__dot" />{a.offers} {a.offers === 1 ? "offer" : "offers"}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DEALS
// ============================================================
function DealsPage({ setPage }) {
  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Vendor negotiations</div>
          <h1 className="page__title">Active <em className="chip-lime">Deals</em></h1>
          <p className="page__sub">Proposals, engagements, and pending handoffs with your vendor network.</p>
        </div>
        <div className="page__actions">
          <div className="seg">
            <button className="on">All</button>
            <button>Proposals</button>
            <button>Engaged</button>
            <button>Handoff</button>
          </div>
        </div>
      </div>

      <div className="grid grid--kpi" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi__label">Engaged</div><div className="kpi__value" style={{ color: "var(--safe)" }}>{DATA.deals.filter(d => d.status === "ENGAGED").length}</div><div className="kpi__foot">deals running</div></div>
        <div className="kpi"><div className="kpi__label">Proposals</div><div className="kpi__value" style={{ color: "var(--caution)" }}>{DATA.deals.filter(d => d.status === "PROPOSAL").length}</div><div className="kpi__foot">awaiting your response</div></div>
        <div className="kpi"><div className="kpi__label">Awaiting handoff</div><div className="kpi__value">{DATA.deals.filter(d => d.status === "AWAITING_HANDOFF").length}</div><div className="kpi__foot">pickup scheduled</div></div>
        <div className="kpi"><div className="kpi__label">Total value</div><div className="kpi__value">₱{(DATA.deals.reduce((s, d) => s + d.quantityKg * d.agreedPrice, 0) / 1000).toFixed(1)}<small>k</small></div><div className="kpi__foot">across all deals</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {DATA.deals.map(d => (
          <div key={d.id} className="card card--hover" style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg, #fa7faa, #6a5fc1)", display: "grid", placeItems: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{d.vendorAvatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{d.vendor}</div>
                  {d.unread > 0 && <div style={{ width: 16, height: 16, borderRadius: 99, background: "var(--accent-lime)", color: "var(--ink-deep)", fontSize: 9, fontWeight: 700, display: "grid", placeItems: "center" }}>{d.unread}</div>}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-4)" }}>Deal D-{d.id} · {d.lastActivity}</div>
              </div>
              <span className={`chip chip--${d.status === "ENGAGED" ? "safe" : d.status === "PROPOSAL" ? "caution" : "violet"}`}>
                <span className="chip__dot" />{d.status.replace(/_/g, " ")}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "12px 0", borderTop: "1px solid var(--hairline-2)", borderBottom: "1px solid var(--hairline-2)" }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Species</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{d.species}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Volume</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "var(--font-code)" }}>{d.quantityKg}kg</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Agreed</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-lime)", fontFamily: "var(--font-code)" }}>₱{d.agreedPrice}/kg</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn btn--sm btn--ghost" onClick={() => setPage("messages")}><window.I.Message size={11} /> Chat</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn--sm btn--primary">Open deal <window.I.Arrow size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ORDERS
// ============================================================
function OrdersPage() {
  const [filter, setFilter] = React.useState("ALL");
  const filtered = filter === "ALL" ? DATA.orders : DATA.orders.filter(o => o.status === filter);

  const stats = {
    pending: DATA.orders.filter(o => o.status === "PENDING").length,
    confirmed: DATA.orders.filter(o => o.status === "CONFIRMED").length,
    completed: DATA.orders.filter(o => o.status === "COMPLETED").length,
    disputed: DATA.orders.filter(o => o.status === "DISPUTED").length,
  };
  const totalValue = DATA.orders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + o.qtyKg * o.pricePerKg, 0);

  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Operations</div>
          <h1 className="page__title"><em className="chip-lime">Orders</em></h1>
          <p className="page__sub">Status flow · pickup handoff · payment confirmation · payout</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost"><window.I.Download size={12} /> Export</button>
          <button className="btn btn--ghost"><window.I.Filter size={12} /> Filter</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 22 }}>
        <div className="kpi"><div className="kpi__label">Pending</div><div className="kpi__value" style={{ color: "var(--caution)" }}>{stats.pending}</div><div className="kpi__foot">awaiting confirmation</div></div>
        <div className="kpi"><div className="kpi__label">Confirmed</div><div className="kpi__value">{stats.confirmed}</div><div className="kpi__foot">in progress</div></div>
        <div className="kpi"><div className="kpi__label">Completed</div><div className="kpi__value" style={{ color: "var(--safe)" }}>{stats.completed}</div><div className="kpi__foot">last 30d</div></div>
        <div className="kpi"><div className="kpi__label">Disputed</div><div className="kpi__value" style={{ color: "var(--unsafe)" }}>{stats.disputed}</div><div className="kpi__foot">needs response</div></div>
        <div className="kpi"><div className="kpi__label">Total value</div><div className="kpi__value">₱{(totalValue / 1000).toFixed(1)}<small>k</small></div><div className="kpi__foot">all orders</div></div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "DISPUTED"].map(s => (
          <button key={s} className={`tabs__item ${filter === s ? "tabs__item--on" : ""}`} onClick={() => setFilter(s)}>
            {s} <span className="tabs__item-count">{s === "ALL" ? DATA.orders.length : DATA.orders.filter(o => o.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="card card--flush">
        <table className="tbl">
          <thead>
            <tr><th>Order</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Price</th><th>Total</th><th>Payment</th><th>Handoff</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td><span className="kbd">{o.code}</span><div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>{o.createdAt}</div></td>
                <td><strong>{o.vendor}</strong></td>
                <td>{o.species}</td>
                <td className="mono">{o.qtyKg}kg</td>
                <td className="mono">₱{o.pricePerKg}</td>
                <td className="mono"><strong>₱{(o.qtyKg * o.pricePerKg).toLocaleString()}</strong></td>
                <td><span className={`chip chip--${o.payment === "CASH" ? "safe" : "caution"}`}>{o.payment}</span></td>
                <td>{o.handoff ? <span className={`chip chip--${o.handoff === "CONFIRMED" ? "safe" : "violet"}`}><span className="chip__dot" />{o.handoff}</span> : <span className="muted">—</span>}</td>
                <td><span className={`chip chip--${o.status === "COMPLETED" ? "safe" : o.status === "DISPUTED" ? "unsafe" : o.status === "PENDING" ? "caution" : "violet"}`}><span className="chip__dot" />{o.status}</span></td>
                <td><button className="topbar__icon-btn" style={{ width: 28, height: 28 }}><window.I.More size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// EARNINGS
// ============================================================
function EarningsPage() {
  const [range, setRange] = React.useState("30d");
  const e = DATA.earnings;
  const max = Math.max(...e.monthlyChart.map(x => x.value));

  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Money</div>
          <h1 className="page__title">Your <em className="chip-lime">Earnings</em></h1>
          <p className="page__sub">Track every kilo sold and what you've collected.</p>
        </div>
        <div className="page__actions">
          <div className="seg">
            {["7d", "30d", "90d", "1y"].map(r => (
              <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn btn--ghost"><window.I.Download size={12} /> Export</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi__label">Total gross</div><div className="kpi__value">₱{e.totalGross.toLocaleString()}</div><div className="kpi__foot">Last 30 days</div></div>
        <div className="kpi"><div className="kpi__label">Cash collected</div><div className="kpi__value" style={{ color: "var(--safe)" }}>₱{e.cashCollected.toLocaleString()}</div><div className="kpi__foot">{Math.round(e.cashCollected / e.totalGross * 100)}% of gross</div></div>
        <div className="kpi"><div className="kpi__label">Outstanding</div><div className="kpi__value" style={{ color: "var(--caution)" }}>₱{e.creditOutstanding.toLocaleString()}</div><div className="kpi__foot">unpaid credit</div></div>
        <div className="kpi"><div className="kpi__label">Avg / order</div><div className="kpi__value">₱{e.avgPerOrder.toLocaleString()}</div><div className="kpi__foot">{e.orderCount} orders</div></div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Daily earnings</div>
            <div className="card__sub">Last 30 days · cash + credit combined</div>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)" }}><span style={{ width: 8, height: 8, borderRadius: 99, background: "rgba(106, 95, 193, 0.6)" }} />Earlier</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)" }}><span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent-lime)" }} />Last 5 days</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 180, marginBottom: 8 }}>
          {e.monthlyChart.map((d, i) => {
            const h = (d.value / max) * 100;
            return (
              <div key={i} style={{ flex: 1, height: `${Math.max(h, 2)}%`, background: d.value === 0 ? "rgba(255,255,255,0.05)" : i >= 25 ? "var(--accent-lime)" : "rgba(106, 95, 193, 0.55)", borderRadius: "3px 3px 0 0", transition: "all 200ms" }} title={`Day ${d.day}: ₱${d.value.toLocaleString()}`} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-code)" }}>
          <span>May 1</span><span>May 5</span><span>May 10</span><span>May 15</span><span>May 20</span><span>May 25</span><span>May 30</span>
        </div>
      </div>

      <div className="card card--flush">
        <div style={{ padding: 22, borderBottom: "1px solid var(--hairline)" }}>
          <div className="card__title">Order ledger</div>
          <div className="card__sub">Recent completed transactions</div>
        </div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Order</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Gross</th><th>Payment</th></tr></thead>
          <tbody>
            {e.ledger.map(r => (
              <tr key={r.orderId}>
                <td className="mono" style={{ color: "var(--ink-3)" }}>{r.date}</td>
                <td><span className="kbd">O-{r.orderId}</span></td>
                <td><strong>{r.vendor}</strong></td>
                <td>{r.species}</td>
                <td className="mono">{r.qtyKg}kg</td>
                <td className="mono"><strong>₱{r.gross.toLocaleString()}</strong></td>
                <td><span className={`chip chip--${r.paymentMethod === "CASH" ? "safe" : "caution"}`}>{r.paymentMethod}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// MESSAGES
// ============================================================
function MessagesPage() {
  const [selected, setSelected] = React.useState(DATA.messages[0]);

  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Vendor coordination</div>
          <h1 className="page__title"><em className="chip-lime">Messages</em></h1>
          <p className="page__sub">Real-time chat with vendors, BFAR officials, and your network.</p>
        </div>
      </div>

      <div className="card card--flush" style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 230px)", minHeight: 540, overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--hairline)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid var(--hairline)" }}>
            <div className="topbar__search" style={{ width: "100%" }}>
              <window.I.Search size={13} />
              <input placeholder="Search conversations" />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {DATA.messages.map(m => (
              <div key={m.id} className={`message-row ${selected.id === m.id ? "message-row--on" : ""}`} onClick={() => setSelected(m)} style={{ borderRadius: 0, padding: "12px 16px" }}>
                <div className="message-row__avatar">{m.initials}</div>
                <div className="message-row__body">
                  <div className="message-row__head">
                    <div className="message-row__name">{m.with}</div>
                    <div className="message-row__time">{m.time}</div>
                  </div>
                  <div className="message-row__preview">{m.lastMsg}</div>
                </div>
                {m.unread > 0 && <div className="message-row__unread" />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 18, borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="message-row__avatar" style={{ width: 38, height: 38 }}>{selected.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{selected.with}</div>
              <div style={{ fontSize: 11, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--safe)" }} />Online · BFAR verified
              </div>
            </div>
            <button className="topbar__icon-btn"><window.I.Phone size={14} /></button>
            <button className="topbar__icon-btn"><window.I.More size={14} /></button>
          </div>
          <div style={{ flex: 1, padding: 22, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
            {DATA.chatThread.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble--${m.from}`} style={{ alignSelf: m.from === "out" ? "flex-end" : "flex-start" }}>
                {m.text}
                <div className="chat-bubble__time">{m.time}</div>
              </div>
            ))}
            <div style={{ alignSelf: "center", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4, padding: "10px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 99, marginTop: 8 }}>
              Today, 12:42 PM
            </div>
          </div>
          <div style={{ padding: 16, borderTop: "1px solid var(--hairline)", display: "flex", gap: 8 }}>
            <div className="topbar__search" style={{ width: "100%" }}>
              <input placeholder="Type a message…" />
            </div>
            <button className="btn btn--lime"><window.I.Send size={12} /> Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE
// ============================================================
function ProfilePage() {
  const u = DATA.user;
  return (
    <div className="fade-in">
      <div className="page__head">
        <div>
          <div className="eyebrow"><span className="dot" />Account</div>
          <h1 className="page__title">Your <em className="chip-lime">Profile</em></h1>
          <p className="page__sub">Vessel info, BFAR registration, and account preferences.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Edit profile</button>
          <button className="btn btn--primary">Save changes</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 22 }}>
        {/* Profile card */}
        <div className="card" style={{ textAlign: "center", background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(106, 95, 193, 0.2), transparent 60%), var(--bg-card)" }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, margin: "0 auto 16px", background: "linear-gradient(135deg, #fa7faa, #6a5fc1)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, boxShadow: "0 12px 32px rgba(106, 95, 193, 0.4)" }}>
            {u.initials}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{u.fullName}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>@{u.handle} · Fisherman since {u.memberSince}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
            {u.bfarVerified && <span className="chip chip--lime"><window.I.Verified size={10} />BFAR verified</span>}
            <span className="chip chip--safe"><window.I.Star size={10} />{u.rating} rating</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, paddingTop: 18, borderTop: "1px solid var(--hairline)" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "#fff" }}>{u.completedTrips}</div>
              <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>Trips</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--accent-lime)" }}>14.2k</div>
              <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>kg sold</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "#fff" }}>32</div>
              <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>Vendors</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Vessel information</div>
                <div className="card__sub">Registered with BFAR Region IV-A</div>
              </div>
              <span className="chip chip--violet"><window.I.Verified size={10} />Verified</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Vessel name" value={u.vesselName} />
              <Field label="Vessel ID" value="MV-2024-LCN-0418" mono />
              <Field label="Home port" value={u.homePort} />
              <Field label="License class" value="Municipal · 3GT" />
              <Field label="Hull type" value="Bangka (outrigger)" />
              <Field label="Max crew" value="6" mono />
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Contact</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Phone" value="+63 917 555 0184" mono />
              <Field label="Email" value="mateo.v@mermaid.ph" mono />
              <Field label="Region" value="CALABARZON" />
              <Field label="Languages" value="Tagalog, English" />
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Preferences</div>
            </div>
            <Toggle label="Push notifications for catch alert matches" on />
            <Toggle label="SMS alerts for marine advisories" on />
            <Toggle label="Email weekly earnings summary" on={false} />
            <Toggle label="Show BFAR badge on public profile" on />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 13, color: "#fff", fontFamily: mono ? "var(--font-code)" : "var(--font-ui)" }}>{value}</div>
    </div>
  );
}

function Toggle({ label, on }) {
  const [v, setV] = React.useState(on);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--hairline-2)" }}>
      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{label}</span>
      <button onClick={() => setV(!v)} style={{ width: 36, height: 20, padding: 2, background: v ? "var(--accent-lime)" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 99, cursor: "pointer", position: "relative", transition: "background 150ms" }}>
        <div style={{ width: 16, height: 16, borderRadius: 99, background: v ? "var(--ink-deep)" : "#fff", marginLeft: v ? 16 : 0, transition: "margin 150ms" }} />
      </button>
    </div>
  );
}

window.TripsPage = TripsPage;
window.CatchAlertsPage = CatchAlertsPage;
window.DealsPage = DealsPage;
window.OrdersPage = OrdersPage;
window.EarningsPage = EarningsPage;
window.MessagesPage = MessagesPage;
window.ProfilePage = ProfilePage;
