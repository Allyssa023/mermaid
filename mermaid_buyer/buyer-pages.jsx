// MERMAID Buyer Dashboard — Subpages for non-home tabs
// Globals: React, I, ICart, IHeart, BUYER_DATA, BUYER_SPARK,
//          Sparkline, Waveform, MiniBars,
//          MarketplaceGrid, SavedVendorsCard, BuyerActivityCard,
//          BuyerOrdersTable, BuyerAdvisoryCard

const { useState: useSP, useMemo: useMP } = React;

const fmtP = (n) => "₱" + n.toLocaleString();

/* =====================================================================
   Generic header for non-home pages
   ===================================================================== */
function PageHead({ eyebrow, title, lime, sub, tools, onBack }) {
  return (
    <div className="page-head">
      <div className="page-head__eyebrow">
        {onBack && (
          <button className="filter-pill" onClick={onBack} style={{padding:"4px 10px"}}>
            <I.ChevronLeft size={11}/> <strong>Dashboard</strong>
          </button>
        )}
        {eyebrow}
        {sub && <span className="page-head__count">{sub}</span>}
      </div>
      <div className="page-head__row">
        <h1 className="page-head__title">
          {title}{" "}
          {lime && (
            <em style={{background:"var(--accent-lime)", color:"var(--ink-deep)",
                        padding:"0 10px", borderRadius:6}}>{lime}</em>
          )}
        </h1>
        {tools && <div className="page-head__filters">{tools}</div>}
      </div>
    </div>
  );
}

/* =====================================================================
   Marketplace — full browsing surface
   ===================================================================== */
const MKT_FILTERS = {
  port: ["All ports", "Navotas", "Dagupan", "Cebu", "Legazpi", "Pangasinan"],
  fresh: ["Any", "Today's haul", "Within 24h", "Within 48h"],
  range: ["Any size", "Under 10kg", "10–30kg", "30kg+"],
  sort: ["Freshness", "Price ↑", "Price ↓", "Distance", "Trending"],
};

function MarketplacePage({ onBack }) {
  const [activeSort, setActiveSort] = useSP("Freshness");
  const [savedIds, setSavedIds] = useSP(new Set([4820, 4817]));
  const [activePort, setActivePort] = useSP("All ports");
  const items = BUYER_DATA.marketplace;
  // Repeat to give a fuller grid feel
  const expanded = useMP(() => {
    const more = [
      { id: 4815, species: "Maya-maya", vendor: "Pier 12 Fishhouse", market: "Navotas · 4.2km", qty: 11, price: 540, freshness: 91, recommended: false, avatar: "linear-gradient(135deg,#f472b6,#ec4899)", initials: "MY" },
      { id: 4814, species: "Tanguigue", vendor: "Aqua Pearl Seafoods", market: "Navotas · 4.2km", qty: 7, price: 380, freshness: 95, recommended: true, avatar: "linear-gradient(135deg,#60a5fa,#3b82f6)", initials: "TG" },
      { id: 4813, species: "Tilapia", vendor: "Bay Currents Catch", market: "Dagupan · ship", qty: 64, price: 180, freshness: 93, recommended: false, avatar: "linear-gradient(135deg,#a78bfa,#6a5fc1)", initials: "TI" },
      { id: 4812, species: "Sapsap", vendor: "Tideline Coastal", market: "Pangasinan · ship", qty: 22, price: 95, freshness: 87, recommended: false, avatar: "linear-gradient(135deg,#c2ef4e,#84cc16)", initials: "SP" },
    ];
    return [...items, ...more];
  }, []);
  const filtered = activePort === "All ports" ? expanded : expanded.filter(c => c.market.startsWith(activePort));
  const toggleSave = (id) => {
    setSavedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <>
      <PageHead
        eyebrow="Browse · marketplace"
        title="Today's freshest"
        lime="haul"
        sub={`${filtered.length} listings live`}
        onBack={onBack}
        tools={
          <>
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>Within 24h</strong></button>
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>All species</strong></button>
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>Trending</strong></button>
          </>
        }/>

      <div className="mkt-shell">
        {/* Left filter rail */}
        <aside className="mkt-side">
          <div className="filter-block">
            <div className="filter-block__title">Port</div>
            <div className="filter-block__list">
              {MKT_FILTERS.port.map(p => (
                <button key={p}
                  className={`filter-row ${activePort === p ? "filter-row--on" : ""}`}
                  onClick={() => setActivePort(p)}>
                  <span className="filter-row__dot"/>{p}
                  <span className="filter-row__count">
                    {p === "All ports" ? expanded.length : expanded.filter(c => c.market.startsWith(p)).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-block__title">Freshness</div>
            <div className="filter-block__list">
              {MKT_FILTERS.fresh.map((p, i) => (
                <button key={p} className={`filter-row ${i === 1 ? "filter-row--on" : ""}`}>
                  <span className="filter-row__dot"/>{p}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-block__title">Price · ₱/kg</div>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              <div className="range-track">
                <div className="range-track__fill" style={{left:"15%", right:"35%"}}/>
                <div className="range-track__pin" style={{left:"15%"}}/>
                <div className="range-track__pin" style={{left:"65%"}}/>
              </div>
              <div className="range-labels"><span>₱95</span><span>₱720</span></div>
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-block__title">Vendor rating</div>
            <div className="filter-block__list">
              {[4.5, 4.0, 3.5, "Any"].map((p, i) => (
                <button key={p} className={`filter-row ${i === 0 ? "filter-row--on" : ""}`}>
                  <span className="filter-row__dot"/>{typeof p === "number" ? `${p}+ stars` : p}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-block__title">Quick filters</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {["BFAR-priced", "Cold-chain", "Pickup", "Delivery", "Bulk", "Premium"].map(t => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="mkt-main">
          {/* Sort + view */}
          <div className="mkt-bar">
            <div className="row" style={{gap:6, flexWrap:"wrap"}}>
              <span className="muted" style={{fontSize:11, marginRight:4}}>Sort</span>
              {MKT_FILTERS.sort.map(s => (
                <button key={s}
                  className={`pill ${activeSort === s ? "pill--on" : ""}`}
                  onClick={() => setActiveSort(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="row" style={{gap:6}}>
              <button className="icon-btn" title="Grid view"><I.Dashboard size={14}/></button>
              <button className="icon-btn" title="List view"><I.Layers size={14}/></button>
              <button className="icon-btn" title="Map view"><I.MapPin size={14}/></button>
            </div>
          </div>

          {/* Hero strip */}
          <div className="mkt-hero">
            <div className="mkt-hero__main">
              <div className="page-head__eyebrow">
                Pinned · best match for you
                <span className="page-head__count">96 score</span>
              </div>
              <div className="mkt-hero__title">
                <span className="species-mark" style={{background:"linear-gradient(135deg,#fbbf24,#f87171)", color:"#150f23"}}>
                  <I.Fish size={18}/>
                </span>
                Yellowfin Tuna · <span className="muted" style={{fontWeight:500}}>Aqua Pearl Seafoods</span>
              </div>
              <div className="mkt-hero__sub">
                Harvested 6h ago · Navotas · 24kg available · BFAR ref ₱500
              </div>
              <div className="balance-actions">
                <button className="btn btn--lime" style={{padding:"8px 18px"}}>Buy now · {fmtP(480)}/kg</button>
                <button className="btn"><ICart size={11}/> Add to cart</button>
              </div>
            </div>
            <div className="mkt-hero__price">
              <div className="balance-label">Per kilo</div>
              <div className="balance-value" style={{fontSize:48}}>₱480<small>BFAR ₱500</small></div>
              <div className="muted" style={{fontSize:11}}>You save ₱20/kg vs reference price</div>
            </div>
          </div>

          {/* Catch grid */}
          <div className="catch-grid catch-grid--big">
            {filtered.map(c => (
              <article key={c.id} className="catch-card catch-card--big">
                <div className="catch-card__head">
                  <div className="cell-species__avatar" style={{background: c.avatar, width:34, height:34, borderRadius:8, fontSize:11}}>{c.initials}</div>
                  <span className="catch-card__id">LST-{c.id}</span>
                  {c.recommended && <span className="catch-card__match">for you</span>}
                  <div className="spacer"/>
                  <button className={`icon-btn ${savedIds.has(c.id) ? "icon-btn--saved" : ""}`} onClick={() => toggleSave(c.id)}>
                    <IHeart size={13}/>
                  </button>
                </div>
                <div className="catch-card__species">{c.species}</div>
                <div className="catch-card__fisherman"><I.Store size={11}/> {c.vendor}</div>
                <div className="catch-card__zone"><I.MapPin size={10}/> {c.market}</div>

                <div className="catch-card__freshness">
                  <div className="catch-card__fresh-label">
                    <span>Freshness</span><strong>{c.freshness}/100</strong>
                  </div>
                  <div className="metric-card__bar" style={{margin:0}}>
                    <div className="metric-card__bar-fill" style={{width: `${c.freshness}%`}}/>
                  </div>
                </div>

                <div className="catch-card__bottom">
                  <span className="catch-card__qty">{c.qty}<small> kg left</small></span>
                  <span className="catch-card__price">{fmtP(c.price)}/kg</span>
                </div>
                <div className="catch-card__cta">
                  <button className="btn btn--sm btn--lime" style={{flex:1, padding:"7px 10px"}}><ICart size={11}/> Add</button>
                  <button className="btn btn--sm" style={{flex:1, padding:"7px 10px"}}>Quick view</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================================================================
   Cart — vendor-grouped line items + summary
   ===================================================================== */
const CART_GROUPS = [
  {
    vendor: "Aqua Pearl Seafoods",
    handle: "@aqua_pearl",
    rating: 4.8,
    market: "Navotas Fish Port · 4.2km",
    eta: "Today · 14:00–17:00",
    items: [
      { id:"LST-2107", species: "Yellowfin Tuna", initials: "YT", avatar:"linear-gradient(135deg,#fbbf24,#f87171)", qty: 4.2, price: 480, freshness: 96 },
      { id:"LST-2104", species: "Shrimp",         initials: "SH", avatar:"linear-gradient(135deg,#f472b6,#ec4899)", qty: 2.0, price: 540, freshness: 92 },
    ],
  },
  {
    vendor: "Bay Currents Catch",
    handle: "@bay_currents",
    rating: 4.6,
    market: "Dagupan pier · ship to QC",
    eta: "Tomorrow · 09:00–12:00",
    items: [
      { id:"LST-2099", species: "Bangus", initials: "BG", avatar:"linear-gradient(135deg,#5eead4,#38bdf8)", qty: 12, price: 220, freshness: 94 },
    ],
  },
  {
    vendor: "Tideline Coastal",
    handle: "@tideline",
    rating: 4.5,
    market: "Pangasinan · ship",
    eta: "Tomorrow · 13:00 cold-chain",
    items: [
      { id:"LST-2095", species: "Squid", initials: "SQ", avatar:"linear-gradient(135deg,#fa7faa,#f97316)", qty: 9, price: 260, freshness: 90 },
    ],
  },
];

function CartPage({ onBack }) {
  const [qtys, setQtys] = useSP(() => {
    const o = {};
    CART_GROUPS.forEach(g => g.items.forEach(i => o[i.id] = i.qty));
    return o;
  });
  const setQty = (id, v) => setQtys(q => ({ ...q, [id]: Math.max(0.5, +v.toFixed(2)) }));

  const all = CART_GROUPS.flatMap(g => g.items);
  const subtotal = all.reduce((s, i) => s + (qtys[i.id] || 0) * i.price, 0);
  const handling = Math.round(subtotal * 0.02);
  const coldChain = 180;
  const total = subtotal + handling + coldChain;

  return (
    <>
      <PageHead
        eyebrow="Cart"
        title="Ready to check"
        lime="out"
        sub={`${all.length} items · ${CART_GROUPS.length} vendors`}
        onBack={onBack}
        tools={
          <>
            <button className="filter-pill"><I.Refresh size={11}/> <strong>Save for later</strong></button>
            <button className="filter-pill"><I.MapPin size={11}/> <strong>Pickup</strong> · QC</button>
          </>
        }/>

      <div className="cart-shell">
        {/* Vendor groups */}
        <div className="cart-main">
          {CART_GROUPS.map(g => {
            const groupTotal = g.items.reduce((s,i)=> s + (qtys[i.id]||0)*i.price, 0);
            return (
              <div key={g.vendor} className="cart-group">
                <div className="cart-group__head">
                  <div className="cart-group__brand">
                    <div className="cell-species__avatar" style={{background:"linear-gradient(135deg,#a78bfa,#6a5fc1)", width:36, height:36, borderRadius:9, fontSize:11}}>
                      {g.vendor.split(" ").map(s=>s[0]).slice(0,2).join("")}
                    </div>
                    <div>
                      <div style={{fontSize:14, fontWeight:600}}>{g.vendor}</div>
                      <div className="muted" style={{fontSize:11}}>
                        <I.Star size={9} style={{verticalAlign:-1, color:"var(--warning)"}}/> {g.rating} · {g.handle} · {g.market}
                      </div>
                    </div>
                  </div>
                  <div className="cart-group__eta">
                    <I.Truck size={12}/> ETA <strong>{g.eta}</strong>
                  </div>
                </div>

                {g.items.map(i => (
                  <div key={i.id} className="cart-item">
                    <div className="cell-species__avatar" style={{background: i.avatar, width:48, height:48, borderRadius:10, fontSize:13}}>{i.initials}</div>
                    <div className="cart-item__main">
                      <div className="cart-item__title">{i.species}</div>
                      <div className="cart-item__meta">
                        <span className="kbd-mono">{i.id}</span>
                        <span className="mono muted">{fmtP(i.price)}/kg</span>
                        <span className="catch-card__match" style={{background:"var(--aqua-soft)", color:"var(--aqua)"}}>Fresh · {i.freshness}</span>
                      </div>
                    </div>
                    <div className="qty-stepper">
                      <button onClick={() => setQty(i.id, (qtys[i.id]||0) - 0.5)}>−</button>
                      <span className="mono">{(qtys[i.id]||0).toFixed(1)} <small className="muted">kg</small></span>
                      <button onClick={() => setQty(i.id, (qtys[i.id]||0) + 0.5)}>+</button>
                    </div>
                    <div className="cart-item__total">{fmtP(Math.round((qtys[i.id]||0)*i.price))}</div>
                    <button className="icon-btn" title="Remove"><I.More size={14}/></button>
                  </div>
                ))}
                <div className="cart-group__foot">
                  <span className="muted" style={{fontSize:11}}>Subtotal · {g.vendor.split(" ")[0]}</span>
                  <span className="mono" style={{fontWeight:600}}>{fmtP(Math.round(groupTotal))}</span>
                </div>
              </div>
            );
          })}

          {/* Suggestions strip */}
          <div className="card" style={{padding:18}}>
            <div className="card__head" style={{marginBottom:12}}>
              <div>
                <div className="card__title">Vendors often pair with these</div>
                <div className="card__sub">Same trip · cold-chain shares apply</div>
              </div>
              <button className="btn btn--sm">See all <I.ArrowRight size={11}/></button>
            </div>
            <div className="catch-grid">
              {BUYER_DATA.marketplace.slice(0,4).map(c => (
                <div key={c.id} className="catch-card">
                  <div className="catch-card__head">
                    <div className="cell-species__avatar" style={{background: c.avatar, width:24, height:24, borderRadius:6, fontSize:10}}>{c.initials}</div>
                    <span className="catch-card__id">LST-{c.id}</span>
                  </div>
                  <div className="catch-card__species">{c.species}</div>
                  <div className="catch-card__fisherman"><I.Store size={11}/> {c.vendor}</div>
                  <div className="catch-card__bottom">
                    <span className="catch-card__qty">{c.qty}<small> kg</small></span>
                    <span className="catch-card__price">{fmtP(c.price)}/kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky summary */}
        <aside className="cart-summary">
          <div className="card">
            <div className="card__head" style={{marginBottom:14}}>
              <div className="card__title">Order summary</div>
              <span className="kbd-mono">CART-9821</span>
            </div>
            <div className="sum-row"><span>Subtotal · {all.length} items</span><span className="mono">{fmtP(Math.round(subtotal))}</span></div>
            <div className="sum-row"><span>Cold-chain handling</span><span className="mono">{fmtP(handling)}</span></div>
            <div className="sum-row"><span>Bulk delivery</span><span className="mono">{fmtP(coldChain)}</span></div>
            <div className="sum-row"><span>Catch+ subscriber discount</span><span className="mono" style={{color:"var(--aqua)"}}>−{fmtP(120)}</span></div>
            <div className="sum-divider"/>
            <div className="sum-row sum-row--total">
              <span>Total</span>
              <span className="mono" style={{fontSize:22, fontFamily:"var(--font-display)"}}>{fmtP(Math.round(total-120))}</span>
            </div>

            <div style={{marginTop:14}}>
              <div className="muted" style={{fontSize:11, marginBottom:6}}>Payment method</div>
              <div className="pay-row">
                <span style={{
                  display:"inline-block", width:32, height:22, borderRadius:4,
                  background:"linear-gradient(135deg,#a78bfa,#6a5fc1)"
                }}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:500}}>BPI Mastercard</div>
                  <div className="muted mono" style={{fontSize:11}}>···· ···· ···· 2914</div>
                </div>
                <button className="btn btn--sm">Change</button>
              </div>
            </div>

            <button className="btn btn--lime" style={{width:"100%", marginTop:14, padding:"12px"}}>
              Place order · {fmtP(Math.round(total-120))} <I.ArrowRight size={12}/>
            </button>
            <button className="btn btn--ghost" style={{width:"100%", marginTop:6}}>
              <I.Receipt size={11}/> Save as recurring
            </button>

            <div className="card--inset" style={{marginTop:14, padding:12, borderRadius:10, background:"var(--layer-1)", border:"1px solid var(--hairline)"}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                <I.Bolt size={12} style={{color:"var(--accent-lime)"}}/>
                <span style={{fontSize:12, fontWeight:600}}>Cold-chain on track</span>
              </div>
              <div className="muted" style={{fontSize:11}}>
                All 3 vendors in this cart maintain 0–4°C transit. Avg arrival temp 2.3°C.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* =====================================================================
   My orders — table + detail drawer
   ===================================================================== */
function OrdersPage({ onBack }) {
  const [selected, setSelected] = useSP(BUYER_DATA.orders[0].code);
  const order = BUYER_DATA.orders.find(o => o.code === selected) || BUYER_DATA.orders[0];

  const timeline = [
    { t: "now",    label: "ETA arrival · cold-chain in transit",  state: "active" },
    { t: "−2h",    label: "Vendor handoff to courier confirmed",  state: "done" },
    { t: "−5h",    label: "Prep complete · packed at pier",       state: "done" },
    { t: "−8h",    label: "Vendor confirmed order ORD-7821",      state: "done" },
    { t: "−9h",    label: "Order placed",                          state: "done" },
  ];

  return (
    <>
      <PageHead
        eyebrow="Workspace · orders"
        title="My"
        lime="orders"
        sub={`${BUYER_DATA.orders.length} this month`}
        onBack={onBack}
        tools={
          <>
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>30 days</strong></button>
            <button className="filter-pill"><I.Filter size={11}/> <strong>All vendors</strong></button>
            <button className="filter-pill"><I.Receipt size={11}/> <strong>Export</strong></button>
          </>
        }/>

      {/* KPI strip */}
      <div className="kpi-grid">
        <div className="kpi" style={{minHeight:140}}>
          <div className="kpi__head">
            <div className="kpi__badge">
              <div className="kpi__badge-icon" style={{color:"#5eead4"}}><I.Receipt size={16}/></div>
              <div className="kpi__badge-text">
                <span className="kpi__badge-eyebrow">Spend · 30d</span>
                <span className="kpi__badge-title">Total purchase</span>
              </div>
            </div>
          </div>
          <div className="kpi__value" style={{fontSize:32}}><small>₱</small>48,230</div>
          <div className="kpi__delta kpi__delta--up"><span className="kpi__delta-dot"/><strong>+6.3%</strong></div>
        </div>
        <div className="kpi" style={{minHeight:140}}>
          <div className="kpi__head">
            <div className="kpi__badge">
              <div className="kpi__badge-icon" style={{color:"#fbbf24"}}><I.Truck size={16}/></div>
              <div className="kpi__badge-text">
                <span className="kpi__badge-eyebrow">In flight</span>
                <span className="kpi__badge-title">Active orders</span>
              </div>
            </div>
          </div>
          <div className="kpi__value" style={{fontSize:32}}>6</div>
          <div className="kpi__delta kpi__delta--up"><span className="kpi__delta-dot"/><strong>+12.5%</strong></div>
        </div>
        <div className="kpi" style={{minHeight:140}}>
          <div className="kpi__head">
            <div className="kpi__badge">
              <div className="kpi__badge-icon" style={{color:"#a78bfa"}}><I.Store size={16}/></div>
              <div className="kpi__badge-text">
                <span className="kpi__badge-eyebrow">Network</span>
                <span className="kpi__badge-title">Vendors used</span>
              </div>
            </div>
          </div>
          <div className="kpi__value" style={{fontSize:32}}>7<small>/12</small></div>
          <div className="kpi__delta kpi__delta--up"><span className="kpi__delta-dot"/><strong>+1</strong></div>
        </div>
      </div>

      <div className="orders-shell">
        <div className="orders-main">
          <div className="card orders-card" style={{padding:0}}>
            <div className="orders-card__head">
              <div>
                <div className="card__title">All orders</div>
                <div className="card__sub">Click a row to inspect timeline + receipts</div>
              </div>
              <div className="row" style={{gap:6}}>
                <button className="btn btn--sm"><I.Filter size={11}/> Status</button>
                <button className="btn btn--sm"><I.Filter size={11}/> Vendor</button>
                <button className="btn btn--lime btn--sm">Reorder favorites <I.ArrowRight size={11}/></button>
              </div>
            </div>
            <table className="tbl">
              <thead><tr>
                <th>Order</th><th>Species · Vendor</th>
                <th style={{textAlign:"right"}}>Qty</th>
                <th style={{textAlign:"right"}}>Total</th>
                <th>ETA / handoff</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {BUYER_DATA.orders.map(o => {
                  const cls = { pending:"status-chip--new", confirmed:"status-chip--prep", completed:"status-chip--done", cancelled:"status-chip--cancel" }[o.status];
                  const on = o.code === selected;
                  return (
                    <tr key={o.code} onClick={() => setSelected(o.code)}
                        style={{cursor:"pointer", background: on ? "var(--layer-1)" : ""}}>
                      <td><span className="kbd-mono">{o.code}</span></td>
                      <td>
                        <div className="cell-species">
                          <div className="cell-species__avatar" style={{background:o.avatar}}>{o.initials}</div>
                          <div className="cell-species__main">
                            <span className="cell-species__name">{o.species}</span>
                            <span className="cell-species__buyer">{o.vendor}</span>
                          </div>
                        </div>
                      </td>
                      <td className="cell-mono" style={{textAlign:"right"}}>{o.qty} <span className="muted">kg</span></td>
                      <td className="cell-money" style={{textAlign:"right"}}>{fmtP(o.total)}</td>
                      <td className="cell-mono" style={{fontSize:12}}>{o.eta}</td>
                      <td><span className={`status-chip ${cls}`}>{o.status[0].toUpperCase()+o.status.slice(1)}</span></td>
                      <td style={{textAlign:"right"}}><I.ChevronRight size={14} style={{color:"var(--on-dark-muted)"}}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <aside className="orders-detail">
          <div className="card" style={{padding:20, display:"flex", flexDirection:"column", gap:14}}>
            <div className="card__head" style={{marginBottom:0}}>
              <div>
                <div className="card__sub" style={{marginTop:0}}>Order detail</div>
                <div style={{display:"flex", alignItems:"center", gap:8, marginTop:4}}>
                  <span className="kbd-mono">{order.code}</span>
                  <span className={`status-chip status-chip--${order.status==="confirmed"?"prep":order.status==="pending"?"new":order.status==="cancelled"?"cancel":"done"}`}>
                    {order.status[0].toUpperCase()+order.status.slice(1)}
                  </span>
                </div>
              </div>
              <button className="icon-btn"><I.More size={14}/></button>
            </div>

            <div className="cell-species" style={{padding:"12px", background:"var(--layer-1)", border:"1px solid var(--hairline)", borderRadius:10}}>
              <div className="cell-species__avatar" style={{background:order.avatar, width:42, height:42, borderRadius:10, fontSize:13}}>{order.initials}</div>
              <div className="cell-species__main">
                <span style={{fontSize:15, fontWeight:600}}>{order.species}</span>
                <span className="muted" style={{fontSize:12}}>{order.vendor}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="mono" style={{fontSize:14, fontWeight:600}}>{order.qty}<small className="muted"> kg</small></div>
                <div className="muted mono" style={{fontSize:11}}>{fmtP(order.price)}/kg</div>
              </div>
            </div>

            <div className="metrics-row" style={{margin:0, gridTemplateColumns:"1fr 1fr", padding:0, border:"none", gap:10}}>
              <div className="metric-card">
                <div className="metric-card__head">
                  <span className="metric-card__title">Total</span>
                  <span className="metric-card__chip">paid</span>
                </div>
                <div className="metric-card__value">{fmtP(order.total)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__head">
                  <span className="metric-card__title">Handoff</span>
                  <span className="metric-card__chip">ETA</span>
                </div>
                <div className="metric-card__value" style={{fontSize:14}}>{order.eta}</div>
              </div>
            </div>

            <div>
              <div className="card__sub" style={{marginBottom:10}}>Timeline</div>
              <div className="timeline">
                {timeline.map((t, i) => (
                  <div key={i} className={`timeline__row ${t.state==="active" ? "timeline__row--active" : ""}`}>
                    <div className="timeline__dot"/>
                    <div className="timeline__time">{t.t}</div>
                    <div className="timeline__label">{t.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="row" style={{gap:6, flexWrap:"wrap"}}>
              <button className="btn btn--sm" style={{flex:1}}><I.Message size={11}/> Message vendor</button>
              <button className="btn btn--sm" style={{flex:1}}><I.Receipt size={11}/> Receipt</button>
              <button className="btn btn--lime btn--sm" style={{flex:"1 1 100%"}}>Reorder this <I.ArrowRight size={11}/></button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* =====================================================================
   Saved — Vendors / Listings
   ===================================================================== */
const SAVED_LISTINGS = [
  { id: 4820, species: "Mahi-mahi",      vendor: "Bicol Reef Direct",  market: "Legazpi · ship",   qty: 18, price: 410, freshness: 92, avatar:"linear-gradient(135deg,#60a5fa,#3b82f6)", initials:"MM", recommended:true },
  { id: 4817, species: "Bangus",         vendor: "Bay Currents Catch", market: "Dagupan · ship",   qty: 80, price: 220, freshness: 94, avatar:"linear-gradient(135deg,#5eead4,#38bdf8)", initials:"BG", recommended:true },
  { id: 4814, species: "Tanguigue",      vendor: "Aqua Pearl Seafoods",market: "Navotas · 4.2km",  qty: 7,  price: 380, freshness: 95, avatar:"linear-gradient(135deg,#60a5fa,#3b82f6)", initials:"TG", recommended:false },
  { id: 4811, species: "Lapu-Lapu",      vendor: "Coral Coast Co.",    market: "Cebu · ship",      qty: 6,  price: 720, freshness: 89, avatar:"linear-gradient(135deg,#fbbf24,#f59e0b)", initials:"LL", recommended:false },
  { id: 4808, species: "Shrimp",         vendor: "Aqua Pearl Seafoods",market: "Navotas · 4.2km",  qty: 4,  price: 540, freshness: 96, avatar:"linear-gradient(135deg,#f472b6,#ec4899)", initials:"SH", recommended:true },
  { id: 4805, species: "Sapsap",         vendor: "Tideline Coastal",   market: "Pangasinan · ship",qty: 22, price: 95,  freshness: 87, avatar:"linear-gradient(135deg,#c2ef4e,#84cc16)", initials:"SP", recommended:false },
];

function SavedPage({ onBack }) {
  const [tab, setTab] = useSP("vendors");
  return (
    <>
      <PageHead
        eyebrow="Workspace · saved"
        title="Your"
        lime="favorites"
        sub={`${BUYER_DATA.saved.length} vendors · ${SAVED_LISTINGS.length} listings`}
        onBack={onBack}
        tools={
          <>
            <button className="filter-pill"><I.Bell size={11}/> <strong>Alerts on</strong></button>
            <button className="filter-pill"><I.Filter size={11}/> <strong>Sort by recent</strong></button>
          </>
        }/>

      <div className="orders-card__tabs" style={{alignSelf:"flex-start"}}>
        <button className={`orders-tab ${tab==="vendors"?"orders-tab--on":""}`} onClick={() => setTab("vendors")}>
          Vendors <span className="orders-tab__count">{BUYER_DATA.saved.length}</span>
        </button>
        <button className={`orders-tab ${tab==="listings"?"orders-tab--on":""}`} onClick={() => setTab("listings")}>
          Listings <span className="orders-tab__count">{SAVED_LISTINGS.length}</span>
        </button>
        <button className={`orders-tab ${tab==="searches"?"orders-tab--on":""}`} onClick={() => setTab("searches")}>
          Searches <span className="orders-tab__count">3</span>
        </button>
      </div>

      {tab === "vendors" && (
        <div className="vendor-grid">
          {BUYER_DATA.saved.map(s => (
            <div key={s.name} className="card vendor-card">
              <div className="vendor-card__head">
                <div className="inv-row__avatar" style={{background:s.avatar, width:44, height:44, borderRadius:10, fontSize:13}}>{s.initials}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:15, fontWeight:600, lineHeight:1.1}}>{s.name}</div>
                  <div className="muted mono" style={{fontSize:11, marginTop:2}}>{s.handle}</div>
                </div>
                {s.active
                  ? <span className="inv-row__chip inv-row__chip--ok">live</span>
                  : <span className="inv-row__chip inv-row__chip--low">paused</span>}
              </div>
              <div className="vendor-card__stats">
                <div>
                  <div className="advisory-stat__label">Rating</div>
                  <div className="vendor-card__stat-val">
                    <I.Star size={11} style={{color:"var(--warning)"}}/> {s.rating}
                  </div>
                </div>
                <div>
                  <div className="advisory-stat__label">Orders</div>
                  <div className="vendor-card__stat-val mono">{s.orders}</div>
                </div>
                <div>
                  <div className="advisory-stat__label">Last buy</div>
                  <div className="vendor-card__stat-val mono">3d</div>
                </div>
                <div>
                  <div className="advisory-stat__label">Fresh now</div>
                  <div className="vendor-card__stat-val mono" style={{color:"var(--accent-lime)"}}>{s.active ? "4 listings" : "—"}</div>
                </div>
              </div>
              <div className="row" style={{gap:6}}>
                <button className="btn btn--sm" style={{flex:1}}><I.Store size={11}/> View store</button>
                <button className="btn btn--sm"><I.Message size={11}/></button>
                <button className="btn btn--lime btn--sm" style={{flex:1}}>Quick reorder</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="catch-grid catch-grid--big">
          {SAVED_LISTINGS.map(c => (
            <article key={c.id} className="catch-card catch-card--big">
              <div className="catch-card__head">
                <div className="cell-species__avatar" style={{background:c.avatar, width:34, height:34, borderRadius:8, fontSize:11}}>{c.initials}</div>
                <span className="catch-card__id">LST-{c.id}</span>
                {c.recommended && <span className="catch-card__match">for you</span>}
                <div className="spacer"/>
                <button className="icon-btn icon-btn--saved" title="Remove"><IHeart size={13}/></button>
              </div>
              <div className="catch-card__species">{c.species}</div>
              <div className="catch-card__fisherman"><I.Store size={11}/> {c.vendor}</div>
              <div className="catch-card__zone"><I.MapPin size={10}/> {c.market}</div>
              <div className="catch-card__freshness">
                <div className="catch-card__fresh-label"><span>Freshness</span><strong>{c.freshness}/100</strong></div>
                <div className="metric-card__bar" style={{margin:0}}>
                  <div className="metric-card__bar-fill" style={{width:`${c.freshness}%`}}/>
                </div>
              </div>
              <div className="catch-card__bottom">
                <span className="catch-card__qty">{c.qty}<small> kg left</small></span>
                <span className="catch-card__price">{fmtP(c.price)}/kg</span>
              </div>
              <div className="catch-card__cta">
                <button className="btn btn--sm btn--lime" style={{flex:1, padding:"7px 10px"}}><ICart size={11}/> Add</button>
                <button className="btn btn--sm" style={{flex:1, padding:"7px 10px"}}>Quick view</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "searches" && (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {[
            { name:"Yellowfin · Navotas · today's haul", count:14, alert:true },
            { name:"Bangus · 50kg+ · Dagupan", count:6, alert:true },
            { name:"Lapu-Lapu · under ₱700/kg", count:2, alert:false },
          ].map(s => (
            <div key={s.name} className="inv-row" style={{padding:14}}>
              <div className="inv-row__avatar" style={{background:"var(--layer-3)", color:"var(--accent-lime)"}}>
                <I.Search size={14}/>
              </div>
              <div className="inv-row__main">
                <div className="inv-row__name">{s.name}</div>
                <div className="inv-row__sub">{s.count} matches today · alert {s.alert ? "on" : "off"}</div>
              </div>
              <button className="btn btn--sm"><I.Bell size={11}/> {s.alert ? "On" : "Off"}</button>
              <button className="btn btn--sm">Run <I.ArrowRight size={11}/></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =====================================================================
   Marine advisory — full zonal page
   ===================================================================== */
const ZONES = [
  { id:"Z4-A", name:"Manila Bay · Z4 vendor pier", state:"Calm — dispatch on track", level:"safe",   wind:"12 kt NE", sea:"Slight 0.6m",   sst:"28.4°C", tide:"Rising 1.4m", vis:"10+ km", forecast:[1,1,1,1,1,2,1,1,1,1,1,1] },
  { id:"Z5-B", name:"Pangasinan · Z5 longline grounds", state:"Small craft advisory", level:"warn", wind:"22 kt N",  sea:"Moderate 1.4m", sst:"28.1°C", tide:"Slack",       vis:"6 km",   forecast:[2,2,2,3,2,2,2,1,2,2,2,2] },
  { id:"Z6-C", name:"Bataan · red tide zone",       state:"Closed — red tide",     level:"danger", wind:"15 kt SW", sea:"Slight 0.7m",   sst:"29.0°C", tide:"Rising",      vis:"10+ km", forecast:[3,3,3,3,3,3,3,3,3,3,3,3] },
  { id:"Z7-D", name:"Cebu Strait · Z7 reef pens",   state:"Calm — fishing open",   level:"safe",   wind:"8 kt E",   sea:"Calm 0.3m",     sst:"29.4°C", tide:"Falling",     vis:"10+ km", forecast:[1,1,1,1,1,1,1,1,1,1,1,1] },
];

function AdvisoryPage({ onBack }) {
  const [zone, setZone] = useSP(ZONES[0].id);
  const current = ZONES.find(z => z.id === zone);
  return (
    <>
      <PageHead
        eyebrow="Insight · marine advisory"
        title="Marine"
        lime="advisory"
        sub="updated 12 min ago"
        onBack={onBack}
        tools={
          <>
            <button className="filter-pill"><I.MapPin size={11}/> <strong>Vendor zones</strong></button>
            <button className="filter-pill"><I.ChevronDown size={11}/> <strong>Next 24h</strong></button>
            <button className="filter-pill"><I.Refresh size={11}/> <strong>Auto refresh</strong></button>
          </>
        }/>

      {/* Big hero */}
      <div className="card advisory" style={{padding:24}}>
        <div className="advisory__hero" style={{padding:24}}>
          <div className="advisory__hero-head">
            <span className="advisory__live">live</span>
            <span className="advisory__hero-zone">{current.id} · {current.name}</span>
          </div>
          <div className="advisory__hero-state" style={{fontSize:34}}>
            <span className={`state-dot state-dot--${current.level}`}/>{current.state}
          </div>
          <div className="advisory__hero-metrics" style={{gridTemplateColumns:"repeat(6, 1fr)"}}>
            <div><div className="advisory-stat__label"><I.Wind size={10}/> Wind</div>
              <div className="advisory-stat__value">{current.wind}</div></div>
            <div><div className="advisory-stat__label"><I.Waves size={10}/> Sea</div>
              <div className="advisory-stat__value">{current.sea}</div></div>
            <div><div className="advisory-stat__label"><I.Thermometer size={10}/> SST</div>
              <div className="advisory-stat__value">{current.sst}</div></div>
            <div><div className="advisory-stat__label"><I.Droplet size={10}/> Tide</div>
              <div className="advisory-stat__value">{current.tide}</div></div>
            <div><div className="advisory-stat__label"><I.Eye size={10}/> Vis.</div>
              <div className="advisory-stat__value">{current.vis}</div></div>
            <div><div className="advisory-stat__label"><I.Compass size={10}/> Zone</div>
              <div className="advisory-stat__value">{current.id}</div></div>
          </div>
        </div>
      </div>

      <div className="split-3" style={{gridTemplateColumns:"1.2fr 1fr"}}>
        {/* Zones grid */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Zone status · vendor coverage</div>
              <div className="card__sub">Tap a zone for hero details</div>
            </div>
            <button className="btn btn--sm"><I.MapPin size={11}/> Open map</button>
          </div>
          <div className="zone-grid">
            {ZONES.map(z => (
              <button key={z.id}
                className={`zone-card ${z.id===zone?"zone-card--on":""}`}
                onClick={() => setZone(z.id)}>
                <div className="zone-card__head">
                  <span className={`state-dot state-dot--${z.level}`}/>
                  <span className="zone-card__id mono">{z.id}</span>
                  <span className="zone-card__name">{z.name.split(" · ")[1] || z.name}</span>
                </div>
                <div className="zone-card__state">{z.state}</div>
                <div className="zone-card__forecast">
                  {z.forecast.map((v, i) => (
                    <div key={i}
                      className={`zone-card__bar zone-card__bar--${v===3?"danger":v===2?"warn":"safe"}`}
                      style={{height: `${20 + v*10}px`}}/>
                  ))}
                </div>
                <div className="zone-card__meta mono">
                  <span><I.Wind size={9}/> {z.wind}</span>
                  <span><I.Waves size={9}/> {z.sea}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts feed */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Active bulletins</div>
              <div className="card__sub">PAGASA + BFAR · syndicated</div>
            </div>
            <button className="btn btn--sm">All <I.ArrowRight size={11}/></button>
          </div>
          <div className="advisory__list">
            {BUYER_DATA.advisory.items.concat([
              { kind:"info",  title:"Tide window opens 14:20", sub:"Optimal handoff for Navotas pier",       time:"+2h" },
              { kind:"warn",  title:"NE monsoon · weekend",     sub:"Pangasinan longline crews on standby",   time:"3d" },
            ]).map((it,i) => {
              const IconC = it.kind==="warn" || it.kind==="danger" ? I.AlertTri : I.Bell;
              return (
                <div key={i} className="advisory-row">
                  <div className={`advisory-row__icon advisory-row__icon--${it.kind}`}><IconC size={14}/></div>
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
      </div>

      {/* Vendor impact strip */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Vendor impact · zones above</div>
            <div className="card__sub">How current conditions affect your saved vendors</div>
          </div>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {BUYER_DATA.saved.map((s, i) => {
            const map = [
              { level:"safe",   note:"On schedule · Navotas pier", chip:"ok" },
              { level:"safe",   note:"Dagupan transit cold-chain holding", chip:"ok" },
              { level:"warn",   note:"Pangasinan longline delayed by Z5-B advisory", chip:"low" },
              { level:"safe",   note:"Pangasinan calm — no impact", chip:"ok" },
            ][i];
            return (
              <div key={s.name} className="inv-row">
                <span className={`state-dot state-dot--${map.level}`}/>
                <div className="inv-row__avatar" style={{background:s.avatar}}>{s.initials}</div>
                <div className="inv-row__main">
                  <div className="inv-row__name">{s.name}</div>
                  <div className="inv-row__sub">{map.note}</div>
                </div>
                <span className={`inv-row__chip inv-row__chip--${map.chip}`}>{map.level === "warn" ? "delayed" : "live"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* =====================================================================
   Messages — vendor chat threads
   ===================================================================== */
const THREADS = [
  { id:"t1", vendor:"Aqua Pearl Seafoods",  initials:"AP", avatar:"linear-gradient(135deg,#fbbf24,#f87171)", unread:2, online:true,
    preview:"Marlin from today's longline ready 09:00", time:"3m",
    messages:[
      { from:"vendor", t:"08:02", body:"Morning Aaron! Yellowfin haul came in hot 🔥 — peak grade, 24kg at ₱480/kg." },
      { from:"me",     t:"08:14", body:"Save me 4.5kg please — cold-chain to QC by 2pm?" },
      { from:"vendor", t:"08:15", body:"Locked. ORD-7821 confirmed. Courier ETA 14:00–17:00." },
      { from:"vendor", t:"08:42", body:"Also: Marlin from today's longline ready 09:00 — 6kg, ₱620. Interested?" },
    ]
  },
  { id:"t2", vendor:"Bay Currents Catch", initials:"BC", avatar:"linear-gradient(135deg,#5eead4,#38bdf8)", unread:0, online:true,
    preview:"Bangus 50kg+ next batch lands tomorrow", time:"1h",
    messages:[]
  },
  { id:"t3", vendor:"Pier 12 Fishhouse",  initials:"P12", avatar:"linear-gradient(135deg,#a78bfa,#6a5fc1)", unread:1, online:false,
    preview:"Tilapia ready for pickup, counter 4", time:"3h",
    messages:[]
  },
  { id:"t4", vendor:"Tideline Coastal",   initials:"TC", avatar:"linear-gradient(135deg,#fa7faa,#f97316)", unread:0, online:false,
    preview:"Squid run was strong — see attached", time:"1d",
    messages:[]
  },
  { id:"t5", vendor:"Bicol Reef Direct",  initials:"BR", avatar:"linear-gradient(135deg,#60a5fa,#3b82f6)", unread:2, online:true,
    preview:"Mahi-mahi at ₱410 — first dibs for you", time:"6h",
    messages:[]
  },
];

function MessagesPage({ onBack }) {
  const [active, setActive] = useSP("t1");
  const thread = THREADS.find(t => t.id === active);
  const [draft, setDraft] = useSP("");

  return (
    <>
      <PageHead
        eyebrow="Insight · messages"
        title="Vendor"
        lime="chats"
        sub={`${THREADS.reduce((s,t)=>s+t.unread,0)} unread`}
        onBack={onBack}
        tools={<>
          <button className="filter-pill"><I.Filter size={11}/> <strong>Unread</strong></button>
          <button className="filter-pill"><I.Bell size={11}/> <strong>Notify desktop</strong></button>
        </>}/>

      <div className="msg-shell card" style={{padding:0, overflow:"hidden"}}>
        {/* thread list */}
        <aside className="msg-list">
          <div className="msg-list__search">
            <I.Search size={13}/>
            <input placeholder="Search threads, vendors, orders…"/>
          </div>
          <div style={{display:"flex", flexDirection:"column"}}>
            {THREADS.map(t => (
              <button key={t.id}
                className={`msg-thread ${t.id===active?"msg-thread--on":""}`}
                onClick={() => setActive(t.id)}>
                <div className="msg-thread__avatar" style={{background:t.avatar}}>
                  {t.initials}
                  {t.online && <span className="msg-thread__online"/>}
                </div>
                <div className="msg-thread__main">
                  <div className="msg-thread__head">
                    <span className="msg-thread__name">{t.vendor}</span>
                    <span className="msg-thread__time mono">{t.time}</span>
                  </div>
                  <div className="msg-thread__preview">{t.preview}</div>
                </div>
                {t.unread > 0 && <span className="msg-thread__badge">{t.unread}</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* chat pane */}
        <div className="msg-pane">
          <div className="msg-pane__head">
            <div className="msg-thread__avatar" style={{background:thread.avatar, width:40, height:40}}>{thread.initials}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:600}}>{thread.vendor}</div>
              <div className="muted" style={{fontSize:11}}>
                {thread.online ? <><span className="state-dot state-dot--safe" style={{width:6,height:6,display:"inline-block",marginRight:6,verticalAlign:0}}/>Online · typically replies in 5m</> : "Offline · seen 1h ago"}
              </div>
            </div>
            <button className="icon-btn"><I.Receipt size={14}/></button>
            <button className="icon-btn"><ICart size={14}/></button>
            <button className="icon-btn"><I.More size={14}/></button>
          </div>

          <div className="msg-pane__body">
            <div className="msg-date">Today</div>
            {thread.messages.map((m, i) => (
              <div key={i} className={`msg-bubble msg-bubble--${m.from}`}>
                <div className="msg-bubble__body">{m.body}</div>
                <div className="msg-bubble__time mono">{m.t}</div>
              </div>
            ))}

            {/* attached order card inline */}
            <div className="msg-attach">
              <div className="cell-species__avatar" style={{background:"linear-gradient(135deg,#fbbf24,#f87171)", width:32, height:32, borderRadius:8, fontSize:11}}>YT</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>ORD-7821 · Yellowfin Tuna</div>
                <div className="muted mono" style={{fontSize:11}}>4.2kg @ ₱480/kg · ETA today 14:00</div>
              </div>
              <span className="status-chip status-chip--prep">Confirmed</span>
            </div>
          </div>

          <div className="msg-pane__compose">
            <div className="row" style={{gap:6, marginBottom:8, flexWrap:"wrap"}}>
              {["Ask for ETA","Adjust qty","Share BFAR ref","Cold-chain status"].map(s => (
                <span key={s} className="chip">{s}</span>
              ))}
            </div>
            <div className="msg-compose">
              <button className="icon-btn"><I.Plus size={14}/></button>
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Message Aqua Pearl…"/>
              <button className="btn btn--lime btn--sm" style={{padding:"7px 14px"}}>Send <I.ArrowRight size={11}/></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================================================================
   Profile — buyer account
   ===================================================================== */
function ProfilePage({ onBack }) {
  const b = BUYER_DATA.buyer;
  const [tab, setTab] = useSP("about");
  return (
    <>
      <PageHead
        eyebrow="Account · profile"
        title="Your"
        lime="profile"
        onBack={onBack}
        tools={<>
          <button className="filter-pill"><I.Edit size={11}/> <strong>Edit profile</strong></button>
          <button className="filter-pill"><I.Logout size={11}/> <strong>Sign out</strong></button>
        </>}/>

      {/* Hero */}
      <div className="card profile-hero">
        <div className="profile-hero__avatar" style={{background:"linear-gradient(135deg,#5eead4,#14b8a6)"}}>{b.initials}</div>
        <div className="profile-hero__main">
          <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
            <h2 style={{fontFamily:"var(--font-display)", fontSize:28, margin:0, fontWeight:700}}>{b.name}</h2>
            <span className="tier-tag">{b.tier}</span>
            <span className="kbd-mono">{b.handle}</span>
          </div>
          <div className="muted" style={{marginTop:6, fontSize:13}}>
            {b.business} · joined Mar 2024 · 96 orders all time
          </div>
          <div className="profile-hero__stats">
            <div><div className="advisory-stat__label">All-time spend</div>
              <div className="vendor-card__stat-val mono">₱412,940</div></div>
            <div><div className="advisory-stat__label">Avg rating given</div>
              <div className="vendor-card__stat-val">
                <I.Star size={11} style={{color:"var(--warning)"}}/> 4.6
              </div></div>
            <div><div className="advisory-stat__label">Saved vendors</div>
              <div className="vendor-card__stat-val mono">{BUYER_DATA.saved.length}</div></div>
            <div><div className="advisory-stat__label">Streak</div>
              <div className="vendor-card__stat-val mono" style={{color:"var(--accent-lime)"}}>14d</div></div>
          </div>
        </div>
      </div>

      <div className="orders-card__tabs" style={{alignSelf:"flex-start"}}>
        {["about","business","preferences","payments","security"].map(t => (
          <button key={t} className={`orders-tab ${tab===t?"orders-tab--on":""}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "about" && (
        <div className="split-2">
          <div className="card">
            <div className="card__head"><div className="card__title">Contact</div></div>
            <div className="form-grid">
              <Field label="Full name" value={b.name}/>
              <Field label="Handle"    value={b.handle} mono/>
              <Field label="Email"     value="aaron@sailorstable.ph"/>
              <Field label="Mobile"    value="+63 917 ··· 2914" mono/>
              <Field label="Address"   value="Sct. Tobias St, Quezon City, MM 1103" full/>
            </div>
          </div>
          <div className="card">
            <div className="card__head"><div className="card__title">Identity verification</div></div>
            <div className="kyc-row"><span className="state-dot state-dot--safe"/> BIR 2303 verified · TIN ····218</div>
            <div className="kyc-row"><span className="state-dot state-dot--safe"/> Mayor's permit · QC FY26</div>
            <div className="kyc-row"><span className="state-dot state-dot--warn"/> FDA cold-storage permit · expires Aug 2026</div>
            <div className="kyc-row"><span className="state-dot state-dot--safe"/> BFAR buyer code · QC-BUY-0418</div>
            <button className="btn btn--sm" style={{marginTop:12}}>Upload document <I.Plus size={11}/></button>
          </div>
        </div>
      )}

      {tab === "business" && (
        <div className="card">
          <div className="card__head"><div className="card__title">Business profile</div></div>
          <div className="form-grid">
            <Field label="Business name" value={b.business}/>
            <Field label="Type"          value="Restaurant · seafood-forward"/>
            <Field label="Avg monthly volume" value="320 kg" mono/>
            <Field label="Cold-chain receiving" value="Yes · 0–4°C, walk-in"/>
            <Field label="Preferred pickup"  value="Navotas Fish Port" full/>
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <div className="split-2">
          <div className="card">
            <div className="card__head"><div className="card__title">Catch alerts</div></div>
            {[
              ["Yellowfin Tuna · Navotas", true],
              ["Bangus · 50kg+ bulk",     true],
              ["Lapu-Lapu · under ₱700",  false],
              ["Squid · daily morning haul", true],
            ].map(([name, on]) => (
              <div key={name} className="pref-row">
                <div>
                  <div style={{fontSize:13, fontWeight:500}}>{name}</div>
                  <div className="muted" style={{fontSize:11}}>{on ? "Push + email" : "Push only"}</div>
                </div>
                <span className={`toggle ${on ? "toggle--on" : ""}`}><span/></span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card__head"><div className="card__title">Buying behavior</div></div>
            {[
              ["Auto-confirm reorders under ₱3,000", true],
              ["Show only BFAR-priced listings",    false],
              ["Hide vendors with rating < 4.0",    true],
              ["Catch+ subscription (saved vendors weekly)", true],
            ].map(([name, on]) => (
              <div key={name} className="pref-row">
                <div style={{fontSize:13, fontWeight:500}}>{name}</div>
                <span className={`toggle ${on?"toggle--on":""}`}><span/></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="card">
          <div className="card__head"><div className="card__title">Payment methods</div></div>
          {[
            { name:"BPI Mastercard", last:"2914", primary:true, color:"linear-gradient(135deg,#a78bfa,#6a5fc1)" },
            { name:"Maya wallet",    last:"8273", primary:false, color:"linear-gradient(135deg,#5eead4,#14b8a6)" },
            { name:"GCash",          last:"4501", primary:false, color:"linear-gradient(135deg,#60a5fa,#3b82f6)" },
          ].map(p => (
            <div key={p.name} className="pay-row">
              <span style={{display:"inline-block", width:40, height:28, borderRadius:6, background:p.color}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:500}}>{p.name}</div>
                <div className="muted mono" style={{fontSize:11}}>···· ···· ···· {p.last}</div>
              </div>
              {p.primary && <span className="inv-row__chip inv-row__chip--ok">primary</span>}
              <button className="btn btn--sm">Manage</button>
            </div>
          ))}
          <button className="btn btn--sm" style={{marginTop:12}}><I.Plus size={11}/> Add method</button>
        </div>
      )}

      {tab === "security" && (
        <div className="card">
          <div className="card__head"><div className="card__title">Security & sessions</div></div>
          <div className="pref-row">
            <div>
              <div style={{fontSize:13, fontWeight:500}}>2-factor authentication</div>
              <div className="muted" style={{fontSize:11}}>SMS to +63 917 ··· 2914</div>
            </div>
            <span className="toggle toggle--on"><span/></span>
          </div>
          <div className="pref-row">
            <div>
              <div style={{fontSize:13, fontWeight:500}}>Biometric login on app</div>
              <div className="muted" style={{fontSize:11}}>Face ID active on iPhone 15 Pro</div>
            </div>
            <span className="toggle toggle--on"><span/></span>
          </div>
          <div className="pref-row" style={{borderBottom:"none"}}>
            <div>
              <div style={{fontSize:13, fontWeight:500}}>Active sessions</div>
              <div className="muted" style={{fontSize:11}}>2 devices · Web (this), iPhone 15 Pro</div>
            </div>
            <button className="btn btn--sm">Sign out all</button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({label, value, mono, full}) {
  return (
    <div className="field" style={full ? {gridColumn:"1 / -1"} : {}}>
      <div className="field__label">{label}</div>
      <div className={`field__value ${mono?"mono":""}`}>{value}</div>
    </div>
  );
}

// Export
window.MarketplacePage = MarketplacePage;
window.CartPage = CartPage;
window.OrdersPage = OrdersPage;
window.SavedPage = SavedPage;
window.AdvisoryPage = AdvisoryPage;
window.MessagesPage = MessagesPage;
window.ProfilePage = ProfilePage;
