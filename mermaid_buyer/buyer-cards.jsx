// MERMAID Buyer Dashboard — Page cards
// Globals: React, I, BUYER_DATA, BUYER_SPARK, Sparkline, Waveform, MiniBars, ICart, IHeart

const fmtPesoB = (v) => "₱" + v.toLocaleString();

function BuyerKpiCard(props) {
  // reuse same KpiCard component contract from cards.jsx — but copy here for safety
  const { kind, value, valueSuffix = "", currency = "", label, badgeTitle, badgeEyebrow,
          iconKey, deltaPct, sparkData, sparkColor, lastLabel, rows } = props;
  const IconC = I[iconKey] || I.Activity;
  const up = deltaPct >= 0;
  return (
    <div className="kpi">
      <div className="kpi__head">
        <div className="kpi__badge">
          <div className="kpi__badge-icon" style={{color: sparkColor}}>
            <IconC size={16}/>
          </div>
          <div className="kpi__badge-text">
            <span className="kpi__badge-eyebrow">{badgeEyebrow}</span>
            <span className="kpi__badge-title">{badgeTitle}</span>
          </div>
        </div>
        <button className="kpi__arrow"><I.External size={11}/></button>
      </div>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">
        {currency && <small>{currency}</small>}
        {value}
        {valueSuffix && <small>{valueSuffix}</small>}
      </div>
      <div className={`kpi__delta ${up ? "kpi__delta--up" : "kpi__delta--down"}`}>
        <span className="kpi__delta-dot"/>
        <strong>{up ? "+" : ""}{deltaPct}%</strong>
        <span className="muted" style={{fontSize:11}}>vs last 7d</span>
      </div>
      {rows ? (
        <div className="kpi__rows">
          <div className="kpi__rows-head">
            <span>{rows.headLeft || "Item"}</span>
            <span>{rows.headRight || "Value"}</span>
          </div>
          {rows.items.map((r, i) => (
            <div key={i} className="kpi-row">
              <span className="kpi-row__dot" style={{background: r.color || sparkColor}}/>
              <div className="kpi-row__text">
                <span className="kpi-row__title">{r.title}</span>
                <span className="kpi-row__sub">{r.sub}</span>
              </div>
              <span className="kpi-row__value mono">{r.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="kpi__spark">
          <Sparkline data={sparkData} color={sparkColor} height={64} label={lastLabel}/>
        </div>
      )}
    </div>
  );
}

function BuyerPromoCard() {
  // BFAR reference prices vs the buyer's last purchase per species.
  // Real regulatory data shape — useful for purchasing decisions, no upsell.
  const rows = [
    { sp: "Yellowfin Tuna", ref: 500, yours: 480, init: "YT", c: "linear-gradient(135deg,#fbbf24,#f87171)" },
    { sp: "Bangus",         ref: 260, yours: 220, init: "BG", c: "linear-gradient(135deg,#5eead4,#38bdf8)" },
    { sp: "Tilapia",        ref: 180, yours: 180, init: "TI", c: "linear-gradient(135deg,#a78bfa,#6a5fc1)" },
    { sp: "Squid",          ref: 300, yours: 280, init: "SQ", c: "linear-gradient(135deg,#fa7faa,#f97316)" },
    { sp: "Lapu-Lapu",      ref: 750, yours: 720, init: "LL", c: "linear-gradient(135deg,#fbbf24,#f59e0b)" },
  ];
  return (
    <div className="bfar-card">
      <div className="bfar-card__head">
        <div className="bfar-card__brand">
          <span className="bfar-card__seal">BFAR</span>
          <span className="bfar-card__live">
            <span/> Synced 06:00
          </span>
        </div>
        <button className="icon-btn"><I.External size={12}/></button>
      </div>

      <div className="bfar-card__title">Today's <em>ceilings</em></div>
      <div className="bfar-card__sub">₱/kg · regulator vs your last buy</div>

      <div className="bfar-card__table">
        <div className="bfar-card__th">
          <span>Species</span>
          <span style={{textAlign:"right"}}>Ceiling</span>
          <span style={{textAlign:"right"}}>You paid</span>
        </div>
        {rows.map(r => {
          const d = r.yours - r.ref;
          const cls = d < 0 ? "bfar-row__delta--good" : d > 0 ? "bfar-row__delta--bad" : "bfar-row__delta--flat";
          const sign = d < 0 ? "−" : d > 0 ? "+" : "=";
          return (
            <div key={r.sp} className="bfar-row">
              <div className="bfar-row__sp">
                <span className="bfar-row__avatar" style={{background: r.c}}>{r.init}</span>
                <span>{r.sp}</span>
              </div>
              <div className="bfar-row__ref mono">₱{r.ref}</div>
              <div className="bfar-row__price">
                <span className="mono">₱{r.yours}</span>
                <span className={`bfar-row__delta ${cls}`}>
                  {sign}{Math.abs(d) || "0"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="bfar-card__foot">
        See full price index <I.ArrowRight size={11}/>
      </button>
    </div>
  );
}

function BuyerFeaturedCard() {
  const f = BUYER_DATA.featured;
  const soldPct = (f.soldKg / f.totalListedKg);
  return (
    <div className="detail-card">
      <div className="detail-card__left">
        <div className="detail-card__head">
          <div className="detail-card__heading">Featured fresh catch · for you</div>
          <div className="detail-card__head-tools">
            <button className="icon-btn"><I.Refresh size={14}/></button>
            <button className="icon-btn"><IHeart size={14}/></button>
            <button className="icon-btn"><I.External size={14}/></button>
            <button className="icon-btn"><I.More size={14}/></button>
          </div>
        </div>

        <div className="detail-card__meta">
          <div className="detail-card__updated">
            Harvested <span className="mono">{f.harvestHrsAgo}h ago</span> · {f.market}
          </div>

          <div className="detail-card__title-row">
            <div className="detail-card__title">
              <em style={{fontStyle:"normal", color:"var(--accent-lime)"}}>{f.species}</em>
            </div>
            <span className="species-mark" style={{background: f.avatar, color:"#150f23"}}>
              <I.Fish size={16}/>
            </span>
            <div className="detail-card__title-tools">
              <button className="profile-link"><I.Store size={11}/> {f.vendor} <I.ArrowRight size={10}/></button>
            </div>
          </div>

          <div>
            <div className="balance-label">Price · per kg</div>
            <div className="balance-value">
              ₱{f.pricePerKg}
              <small>BFAR ref ₱{f.bfarRefPerKg} · {f.availableKg.toFixed(2)}kg available</small>
            </div>
            <div className="balance-actions">
              <button className="btn btn--lime" style={{padding:"9px 22px"}}>Buy now</button>
              <button className="btn" style={{padding:"9px 22px"}}><ICart size={11}/> Add to cart</button>
              <button className="btn btn--ghost" style={{padding:"9px 22px"}}><IHeart size={11}/> Save vendor</button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-card__right">
        <div className="period-head">
          <div>
            <div className="period-title">Freshness window</div>
            <div className="period-sub">{f.window}</div>
          </div>
          <span className="period-pill">96 / 100</span>
        </div>
        <span className="period-tag">{f.expires}</span>
        <Waveform progress={f.expiresPct} score={f.freshnessScore}/>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--on-dark-muted)", fontFamily:"var(--font-code)"}}>
          <span>0h · Harvested</span>
          <span>18h · Best-by</span>
          <span>36h · Peak gone</span>
        </div>
      </div>

      {/* Sub-metrics row */}
      <div style={{gridColumn:"1 / -1"}}>
        <div className="metrics-row">
          <div className="metric-col">
            <div className="metric-col__head">
              <div>
                <div className="metric-col__label">Freshness</div>
                <div className="metric-col__sub">Cold-chain score</div>
              </div>
              <I.ChevronDown size={14} className="metric-col__chev"/>
            </div>
            <div className="metric-card">
              <div className="metric-card__head">
                <span className="metric-card__title">Freshness score</span>
                <span className="metric-card__chip">LIVE</span>
              </div>
              <div className="metric-card__value">
                <span style={{color:"var(--aqua)"}}>96<small style={{fontSize:13, color:"var(--on-dark-muted)"}}>/100</small></span>
              </div>
              <div className="metric-card__bar"><div className="metric-card__bar-fill" style={{width:"96%"}}/></div>
            </div>
          </div>

          <div className="metric-col">
            <div className="metric-col__head">
              <div>
                <div className="metric-col__label">Vendor</div>
                <div className="metric-col__sub">Rep & rating</div>
              </div>
              <I.ChevronDown size={14} className="metric-col__chev"/>
            </div>
            <div className="metric-card">
              <div className="metric-card__head">
                <span className="metric-card__title">Rating</span>
                <span className="metric-card__chip">{f.reviewCount}</span>
              </div>
              <div className="metric-card__value">
                {f.rating}<small style={{fontSize:13, color:"var(--on-dark-muted)"}}>/5</small>
                <span className="metric-card__delta metric-card__delta--up">+0.2</span>
              </div>
              <div className="metric-card__inline">
                <I.Star size={10} style={{color:"var(--warning)"}}/> <strong>{f.reviewCount}</strong> reviews · 30d
              </div>
            </div>
          </div>

          <div className="metric-col">
            <div className="metric-col__head">
              <div>
                <div className="metric-col__label">Distance</div>
                <div className="metric-col__sub">From your address</div>
              </div>
              <I.ChevronDown size={14} className="metric-col__chev"/>
            </div>
            <div className="metric-card">
              <div className="metric-card__head">
                <span className="metric-card__title">Delivery / pickup</span>
                <span className="metric-card__chip">24H</span>
              </div>
              <div className="metric-card__value">
                {f.distanceKm}<span style={{fontSize:13, color:"var(--on-dark-muted)", fontWeight:500, marginLeft:4}}>km</span>
              </div>
              <div className="metric-card__inline">
                <I.MapPin size={10}/> <strong>{f.market}</strong>
              </div>
            </div>
          </div>

          <div className="metric-col">
            <div className="metric-col__head">
              <div>
                <div className="metric-col__label">Stock</div>
                <div className="metric-col__sub">Sell-through · 24h</div>
              </div>
              <I.ChevronDown size={14} className="metric-col__chev"/>
            </div>
            <div className="metric-card">
              <div className="metric-card__head">
                <span className="metric-card__title">Sold / listed</span>
                <span className="metric-card__chip">24H</span>
              </div>
              <div className="metric-card__value">
                {f.soldKg.toFixed(1)}<small style={{fontSize:13, color:"var(--on-dark-muted)"}}>/{f.totalListedKg}kg</small>
              </div>
              <div className="metric-card__inline">
                <MiniBars data={[2,4,3,6,5,7,8,9]} color="#5eead4"/> <strong>{Math.round(soldPct*100)}%</strong> sold
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Buyer marine advisory — same data shape, slightly different copy
function BuyerAdvisoryCard() {
  const a = BUYER_DATA.advisory;
  const dotClass = a.level === "safe" ? "state-dot--safe" : a.level === "warn" ? "state-dot--warn" : "state-dot--danger";
  return (
    <div className="card advisory">
      <div className="card__head">
        <div>
          <div className="card__title">Marine advisory · vendor zones</div>
          <div className="card__sub">{a.zoneName} · next bulletin {a.nextAdvisoryHrs}h</div>
        </div>
        <div className="card__tools">
          <button className="icon-btn"><I.MapPin size={13}/></button>
          <button className="icon-btn"><I.Refresh size={13}/></button>
          <button className="icon-btn"><I.More size={13}/></button>
        </div>
      </div>

      <div className="advisory__hero">
        <div className="advisory__hero-head">
          <span className="advisory__live">live</span>
          <span className="advisory__hero-zone">Z4-A · vendor pier · ETA on track</span>
        </div>
        <div className="advisory__hero-state">
          <span className={`state-dot ${dotClass}`}/>
          {a.state}
        </div>
        <div className="advisory__hero-metrics">
          <div>
            <div className="advisory-stat__label"><I.Wind size={10} style={{verticalAlign:-1}}/> Wind</div>
            <div className="advisory-stat__value">{a.windKt}<small> kt {a.windDir}</small></div>
          </div>
          <div>
            <div className="advisory-stat__label"><I.Waves size={10} style={{verticalAlign:-1}}/> Sea</div>
            <div className="advisory-stat__value">{a.seaState}</div>
          </div>
          <div>
            <div className="advisory-stat__label"><I.Thermometer size={10} style={{verticalAlign:-1}}/> SST</div>
            <div className="advisory-stat__value">{a.sst}<small>°C</small></div>
          </div>
          <div>
            <div className="advisory-stat__label"><I.Droplet size={10} style={{verticalAlign:-1}}/> Tide</div>
            <div className="advisory-stat__value">{a.tide}</div>
          </div>
          <div>
            <div className="advisory-stat__label"><I.Eye size={10} style={{verticalAlign:-1}}/> Vis.</div>
            <div className="advisory-stat__value">{a.visibility}</div>
          </div>
          <div>
            <div className="advisory-stat__label"><I.Compass size={10} style={{verticalAlign:-1}}/> Zone</div>
            <div className="advisory-stat__value">4-A</div>
          </div>
        </div>
      </div>

      <div className="advisory__list">
        {a.items.map((it, i) => {
          const iconKind = it.kind === "warn" ? "AlertTri" : it.kind === "danger" ? "AlertTri" : "Bell";
          const IconC = I[iconKind] || I.Bell;
          return (
            <div key={i} className="advisory-row">
              <div className={`advisory-row__icon advisory-row__icon--${it.kind}`}>
                <IconC size={14}/>
              </div>
              <div className="advisory-row__main">
                <div className="advisory-row__title">{it.title}</div>
                <div className="advisory-row__sub">{it.sub}</div>
              </div>
              <div className="advisory-row__time">{it.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuyerOrdersTable() {
  const [tab, setTab] = React.useState("all");
  const tabs = [
    { key: "all",      label: "All",       count: BUYER_DATA.orders.length },
    { key: "pending",  label: "Pending",   count: BUYER_DATA.orders.filter(o => o.status==="pending").length },
    { key: "confirmed",label: "Confirmed", count: BUYER_DATA.orders.filter(o => o.status==="confirmed").length },
    { key: "completed",label: "Completed", count: BUYER_DATA.orders.filter(o => o.status==="completed").length },
    { key: "cancelled",label: "Cancelled", count: BUYER_DATA.orders.filter(o => o.status==="cancelled").length },
  ];
  const list = tab === "all" ? BUYER_DATA.orders : BUYER_DATA.orders.filter(o => o.status === tab);
  const chipClass = {
    pending: "status-chip--new", confirmed: "status-chip--prep",
    completed: "status-chip--done", cancelled: "status-chip--cancel",
  };

  return (
    <div className="card orders-card">
      <div className="orders-card__head">
        <div>
          <div className="card__title">My orders</div>
          <div className="card__sub">Across {new Set(BUYER_DATA.orders.map(o=>o.vendor)).size} vendors · synced live</div>
        </div>
        <div className="orders-card__tabs">
          {tabs.map(t => (
            <button key={t.key}
              className={`orders-tab ${tab === t.key ? "orders-tab--on" : ""}`}
              onClick={() => setTab(t.key)}>
              {t.label} <span className="orders-tab__count">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{gap:6}}>
          <button className="btn btn--sm"><I.Filter size={11}/> Filter</button>
          <button className="btn btn--lime btn--sm">Reorder favorites <I.ArrowRight size={11}/></button>
        </div>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th>Order</th>
            <th>Species · Vendor</th>
            <th style={{textAlign:"right"}}>Qty</th>
            <th style={{textAlign:"right"}}>Total</th>
            <th>ETA / Handoff</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(o => (
            <tr key={o.code}>
              <td><span className="kbd-mono">{o.code}</span></td>
              <td>
                <div className="cell-species">
                  <div className="cell-species__avatar" style={{background: o.avatar}}>{o.initials}</div>
                  <div className="cell-species__main">
                    <span className="cell-species__name">{o.species}</span>
                    <span className="cell-species__buyer">{o.vendor}</span>
                  </div>
                </div>
              </td>
              <td className="cell-mono" style={{textAlign:"right"}}>{o.qty} <span className="muted">kg</span></td>
              <td className="cell-money" style={{textAlign:"right"}}>₱{o.total.toLocaleString()}</td>
              <td className="cell-mono" style={{fontSize:12}}>{o.eta}</td>
              <td>
                <span className={`status-chip ${chipClass[o.status] || ""}`}>
                  {o.status[0].toUpperCase()+o.status.slice(1)}
                </span>
              </td>
              <td style={{textAlign:"right"}}>
                <button className="icon-btn"><I.More size={14}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketplaceGrid() {
  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Marketplace · fresh today</div>
          <div className="card__sub">Recommendations based on your past orders + saved vendors</div>
        </div>
        <div className="row" style={{gap:6}}>
          <button className="btn btn--sm"><I.Filter size={11}/> All ports</button>
          <button className="btn btn--sm">Browse all <I.ArrowRight size={11}/></button>
        </div>
      </div>
      <div className="catch-grid">
        {BUYER_DATA.marketplace.map(c => (
          <div key={c.id} className="catch-card">
            <div className="catch-card__head">
              <div className="cell-species__avatar" style={{background: c.avatar, width:24, height:24, borderRadius:6, fontSize:10}}>{c.initials}</div>
              <span className="catch-card__id">LST-{c.id}</span>
              {c.recommended && <span className="catch-card__match">for you</span>}
              <div className="spacer"/>
              <button className="icon-btn"><IHeart size={12}/></button>
            </div>
            <div className="catch-card__species">{c.species}</div>
            <div className="catch-card__fisherman"><I.Store size={11}/> {c.vendor}</div>
            <div className="catch-card__zone"><I.MapPin size={10}/> {c.market}</div>
            <div className="catch-card__bottom">
              <span className="catch-card__qty">{c.qty}<small> kg left</small></span>
              <span className="catch-card__price">₱{c.price}/kg</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedVendorsCard() {
  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Saved vendors</div>
          <div className="card__sub">{BUYER_DATA.saved.filter(s=>s.active).length} listing fresh now</div>
        </div>
        <button className="btn btn--sm">All saved <I.ArrowRight size={11}/></button>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        {BUYER_DATA.saved.map(s => (
          <div key={s.name} className="inv-row" style={{alignItems:"center"}}>
            <div className="inv-row__avatar" style={{background: s.avatar}}>{s.initials}</div>
            <div className="inv-row__main">
              <div className="inv-row__name">{s.name}</div>
              <div className="inv-row__sub">
                <I.Star size={9} style={{verticalAlign:-1, color:"var(--warning)"}}/> {s.rating} · {s.orders} orders · {s.handle}
              </div>
            </div>
            {s.active
              ? <span className="inv-row__chip inv-row__chip--ok">live</span>
              : <span className="inv-row__chip inv-row__chip--low">paused</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BuyerActivityCard() {
  return (
    <div className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Activity</div>
          <div className="card__sub">Across orders, vendor chats, payments</div>
        </div>
        <div className="card__tools">
          <button className="icon-btn"><I.Filter size={13}/></button>
          <button className="icon-btn"><I.More size={13}/></button>
        </div>
      </div>
      <div className="activity">
        {BUYER_DATA.activity.map((a, i) => {
          const ikey = a.kind === "order" ? "Inbox" :
                       a.kind === "alert" ? "Fish" :
                       a.kind === "review" ? "Star" :
                       a.kind === "dispute" ? "Message" : "Bolt";
          const IconC = I[ikey] || I.Bell;
          return (
            <div key={i} className="activity__row">
              <div className={`activity__icon activity__icon--${a.kind}`}><IconC size={14}/></div>
              <div className="activity__main">
                <div className="activity__title"><strong>{a.title}</strong> · <span className="muted">{a.body}</span></div>
                <div className="activity__time">{a.time} ago</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.BuyerKpiCard = BuyerKpiCard;
window.BuyerPromoCard = BuyerPromoCard;
window.BuyerFeaturedCard = BuyerFeaturedCard;
window.BuyerAdvisoryCard = BuyerAdvisoryCard;
window.BuyerOrdersTable = BuyerOrdersTable;
window.MarketplaceGrid = MarketplaceGrid;
window.SavedVendorsCard = SavedVendorsCard;
window.BuyerActivityCard = BuyerActivityCard;
