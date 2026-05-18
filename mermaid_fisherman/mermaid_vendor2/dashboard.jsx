// dashboard.jsx — main vendor dashboard view

function Topbar({ data, active }) {
  const labels = {
    dashboard: 'Dashboard', storefront: 'Storefront', inventory: 'Inventory',
    orders: 'Orders', procurement: 'Source Catch', messages: 'Messages',
    analytics: 'Analytics', advisory: 'Marine Advisory', reviews: 'Reviews',
    shop: 'Shop Profile',
  };
  return (
    <div className="topbar">
      <div className="topbar__user" title="Switch account">
        <div className="topbar__avatar">MQ</div>
        <div style={{display:'flex', alignItems:'center', gap:8, lineHeight:1.1}}>
          <div style={{display:'flex', flexDirection:'column'}}>
            <span style={{fontSize:10, color:'var(--muted-2)', fontFamily:'var(--font-mono)'}}>{data.vendor.handle}</span>
            <span className="topbar__user-name">{data.vendor.name}</span>
          </div>
          <span className="topbar__user-role">{data.vendor.tier}</span>
          <Icon name="chevronDown" size={14} color="var(--muted)" />
        </div>
      </div>

      <button className="topbar__deposit">
        <Icon name="plus" size={12} stroke={2.2} />
        New listing
      </button>

      <div className="topbar__search">
        <Icon name="search" size={14} />
        <input placeholder="Search orders, lots, alerts, buyers…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="crumbs" style={{marginLeft:'auto'}}>
        <span>Mermaid</span>
        <span className="sep">/</span>
        <span>Vendor</span>
        <span className="sep">/</span>
        <strong>{labels[active] || 'Dashboard'}</strong>
      </div>

      <button className="topbar__icon" title="Notifications">
        <Icon name="bell" size={15} />
        <span className="dot" />
      </button>
      <button className="topbar__icon" title="Settings"><Icon name="settings" size={15} /></button>
    </div>
  );
}

// ---------- Top species cards ----------
function TopSpeciesCard({ s }) {
  const up = s.revenueDelta >= 0;
  const color = up ? '#46d39a' : '#ff8a6b';
  const fillColor = s.color;
  return (
    <div className="kpi-card">
      <div className="kpi-card__head">
        <div className="kpi-card__badge" style={{background: `linear-gradient(135deg, ${s.color}33, #221a3d)`}}>{s.icon}</div>
        <div className="kpi-card__label">
          <span className="eyebrow">{s.type}</span>
          <strong>{s.common}</strong>
          <span style={{color:'var(--muted-2)', fontSize:11, fontFamily:'var(--font-mono)', marginTop:2}}>{s.local} · {s.lots} lots</span>
        </div>
        <div className="kpi-card__open"><Icon name="arrowUp" size={13} style={{transform:'rotate(45deg)'}} /></div>
      </div>
      <div className="kpi-card__metric">
        <div className="kpi-card__metric-label">Revenue share</div>
        <div className="kpi-card__metric-value">{s.revenueShare}<small>%</small></div>
        <div className={`kpi-card__delta ${up ? 'kpi-card__delta--up' : 'kpi-card__delta--down'}`}>
          {up ? '+' : ''}{s.revenueDelta}%
        </div>
      </div>
      <div className="kpi-card__chart">
        <Sparkline data={s.series} stroke={fillColor} fill={fillColor} height={76} dot={true}
                   dotLabel={`+₱${s.lastWeek.toLocaleString()}`} />
      </div>
    </div>
  );
}

function PromoCard() {
  return (
    <div className="promo-card">
      <div className="promo-card__head">
        <div className="mark"><MermaidMark size={16} /></div>
        <div className="promo-card__name">MERMAID Advisory</div>
        <span className="promo-card__pill">LIVE</span>
      </div>
      <div className="promo-card__title">Marine Risk &amp; Compliance Pulse</div>
      <div className="promo-card__sub">
        Stitches NAMRIA tide data, BFAR red-tide notices, and your watchlist into one
        <strong> coastal status board</strong>. We surface risk before it costs you a lot.
      </div>
      <div className="promo-card__cta">
        <button className="promo-btn promo-btn--solid">
          Open advisory board <Icon name="arrowRight" size={13} />
        </button>
        <button className="promo-btn promo-btn--ghost">
          Connect tide buoy <Icon name="link" size={13} />
        </button>
      </div>
    </div>
  );
}

// ---------- Active Listing Block ----------
function ActiveListingBlock({ data, tweaks }) {
  const l = data.featuredListing;
  const ts = data.topSpecies[0]; // share sparkline series
  return (
    <section className="active-block">
      <header className="ab-head">
        <span style={{color:'var(--muted-2)'}}>Your active listings</span>
        <div className="spacer" />
        <div className="ab-head" style={{gap:6}}>
          <button className="icon-btn" title="Trend view"><Icon name="trend" size={14} /></button>
          <button className="icon-btn" title="Refresh"><Icon name="refresh" size={14} /></button>
          <button className="icon-btn" title="Share"><Icon name="share" size={14} /></button>
          <button className="icon-btn" title="More"><Icon name="more" size={14} /></button>
        </div>
      </header>

      <div className="ab-grid">
        {/* LEFT — featured lot detail */}
        <div>
          <div className="ab-meta">
            <span className="live">LIVE</span>
            <span>Last update · 4 min ago</span>
            <span>· Lot {l.lotId}</span>
          </div>
          <h2 className="ab-title">
            Lot <em>{l.local}</em> <span style={{color:'var(--muted-2)', fontWeight:400, fontSize:18}}>({l.common})</span>
            <span className="ab-title-icons">
              <span className="ti" title="Pin"><Icon name="pin" size={13} /></span>
              <span className="ti" title="Share"><Icon name="share" size={13} /></span>
              <span className="ti" title="View public listing"><Icon name="eye" size={13} /></span>
            </span>
          </h2>
          <div className="ab-subtitle">
            {l.pickupLocation} · Fisher <strong style={{color:'var(--ink-on-dark)'}}>{l.fisherman}</strong> · {l.photos} freshness photos · ★ {l.rating} ({l.reviews})
          </div>

          <div style={{marginTop:18}}>
            <div className="kpi-card__metric-label">Current sold balance · kg</div>
            <div className="ab-figure">
              <div className="ab-figure__value">
                {l.soldKg.toFixed(5)}<small>kg</small>
              </div>
              <div className="ab-figure__pills">
                <button className="ab-figure__pill">
                  <Icon name="arrowUp" size={12} /> Restock
                </button>
                <button className="ab-figure__pill ab-figure__pill--ghost">
                  <Icon name="x" size={12} /> Unlist
                </button>
              </div>
            </div>
            <div style={{display:'flex', gap:18, marginTop:14, color:'var(--muted-2)', fontSize:11.5, fontFamily:'var(--font-mono)'}}>
              <span>₱{l.pricePerKg}/kg ask</span>
              <span>· ₱{l.costPerKg}/kg cost</span>
              <span>· {l.remainingKg}kg remaining</span>
              <span>· margin <span style={{color:'var(--accent-lime)'}}>+{l.margin}%</span></span>
            </div>
          </div>
        </div>

        {/* RIGHT — Listing window (Investment Period equivalent) */}
        <div>
          <div className="window-card">
            <div className="window-card__head">
              <div className="window-card__title">Listing freshness window</div>
              <span className="window-card__chip">6 day shelf</span>
            </div>

            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <div style={{flex:1}}>
                <div className="timeline">
                  <div className="timeline__rail">
                    <div className="timeline__fill" style={{width: `${tweaks.freshnessPct}%`}} />
                    <div className="timeline__pin" style={{left: `${tweaks.freshnessPct}%`}}>
                    </div>
                    <div className="timeline__pin-label" style={{left: `${tweaks.freshnessPct}%`}}>Day {Math.round(tweaks.freshnessPct/100 * 6 * 10)/10}</div>
                  </div>
                  <div className="timeline__ticks">
                    <span>Iced D0</span><span>D1</span><span>D2</span><span>D3</span><span>D4</span><span>D5</span><span>Spoil</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginTop:4}}>
              <span>Sold-thru target: <strong style={{color:'var(--ink-on-dark)'}}>Day 4.0</strong></span>
              <span>BFAR cert window: <strong style={{color:'var(--accent-lime)'}}>OK</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 mini stats — Momentum / General / Risk / Reward */}
      <div className="mini-stats">
        {data.miniStats.map((m, i) => (
          <div key={i} className="mini-stat" style={{'--w': `${m.bar}%`}}>
            <div className="mini-stat__head">
              <div>
                <div className="mini-stat__name">{m.name}</div>
                <div className="mini-stat__sub">{m.sub}</div>
              </div>
              <div className="mini-stat__tag">{m.deltaWindow}</div>
            </div>
            <div className="mini-stat__value">
              <span className="v">{m.unit === '%' || m.unit === 'kg/hr' ? m.value : m.value}{m.unit ? <small style={{fontSize:14, color:'var(--accent-lime)', marginLeft:2}}>{m.unit === '%' ? '%' : ''}</small> : null}</span>
              {m.delta != null && (
                <span className={`delta ${m.deltaDir === 'up' ? 'up' : 'down'}`}>
                  {m.deltaDir === 'up' ? '+' : ''}{m.delta}%
                  {m.dual && (
                    <span style={{display:'block', fontSize:9.5, color:'var(--muted-2)', marginTop:2}}>
                      48h <span style={{color:'var(--kelp)'}}>+{m.dual.delta}%</span>
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="mini-stat__bar" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Lower row: Orders + Right stack ----------
function OrdersPanel({ data }) {
  const statusChip = (s) => {
    if (s === 'PENDING')   return <span className="chip chip--new">Pending</span>;
    if (s === 'CONFIRMED') return <span className="chip chip--prep">Confirmed</span>;
    if (s === 'COMPLETED') return <span className="chip chip--ready">Completed</span>;
    if (s === 'CANCELLED') return <span className="chip chip--cancel">Cancelled</span>;
    return <span className="chip chip--done">{s}</span>;
  };
  return (
    <div className="panel">
      <div className="panel__head">
        <div style={{display:'flex', flexDirection:'column'}}>
          <div className="panel__title">Orders inbox</div>
          <div className="panel__sub">9 open · ₱18,420 today</div>
        </div>
        <div className="filter-pills" style={{marginLeft:16}}>
          <span className="pill-btn on">All</span>
          <span className="pill-btn">Pending <span style={{opacity:0.6, fontFamily:'var(--font-mono)', fontSize:10, marginLeft:4}}>3</span></span>
          <span className="pill-btn">Ready</span>
        </div>
        <button className="panel__action">View all <Icon name="arrowRight" size={11} /></button>
      </div>
      <div className="panel__body">
        <table className="tbl">
          <thead>
            <tr><th>Order</th><th>Buyer</th><th>Species · qty</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {data.orders.map(o => (
              <tr key={o.id}>
                <td><span className="code">#{o.id}</span></td>
                <td className="strong">{o.buyer}</td>
                <td>
                  {o.species}
                  <span style={{color:'var(--muted-2)', marginLeft:6, fontFamily:'var(--font-mono)', fontSize:11}}>{o.qty}kg</span>
                </td>
                <td className="amount">₱{o.total.toLocaleString()}</td>
                <td>{statusChip(o.status)}</td>
                <td style={{textAlign:'right'}}>
                  <span className="btn-row">
                    {o.status === 'PENDING' && <button className="row-btn row-btn--primary">Confirm</button>}
                    {o.status === 'CONFIRMED' && o.badge === 'prep' && <button className="row-btn row-btn--primary">Ready</button>}
                    {o.status === 'CONFIRMED' && o.badge === 'ready' && <button className="row-btn row-btn--primary">Handoff</button>}
                    {(o.status === 'COMPLETED' || o.status === 'CANCELLED') && <button className="row-btn">Details</button>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdvisoriesPanel({ data }) {
  return (
    <div className="panel">
      <div className="panel__head">
        <div style={{display:'flex', flexDirection:'column'}}>
          <div className="panel__title">Marine advisories &amp; activity</div>
          <div className="panel__sub">Risk monitoring · Real-time</div>
        </div>
        <button className="panel__action">All feed <Icon name="arrowRight" size={11} /></button>
      </div>
      <div className="panel__body">
        {data.advisories.map((a, i) => (
          <div className="adv-item" key={i}>
            <div className={`adv-item__dot ${a.tone}`}>
              <Icon name={a.icon === 'storm' ? 'storm' : a.icon === 'fish' ? 'fishSimple' : a.icon === 'badge' ? 'badge' : 'wave'} size={14} />
            </div>
            <div className="adv-item__body">
              <div className="adv-item__title">{a.title}</div>
              <div className="adv-item__sub">{a.sub}</div>
            </div>
            <div className="adv-item__time">{a.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LowStockPanel({ data }) {
  return (
    <div className="panel">
      <div className="panel__head">
        <div className="panel__title">Low stock lots</div>
        <span className="panel__sub">{data.lowStock.length} below threshold</span>
        <button className="panel__action">Inventory <Icon name="arrowRight" size={11} /></button>
      </div>
      <div className="panel__body">
        {data.lowStock.map((row, i) => {
          const pct = Math.min(100, Math.round(row.remaining / row.threshold * 100));
          const ok = pct >= 60;
          return (
            <div className="stock-row" key={i}>
              <div className="stock-row__icon" style={{background: row.color + '33', color: row.color}}>{row.species.icon}</div>
              <div>
                <div className="stock-row__name">{row.species.local}</div>
                <div className="stock-row__sub">{row.lots} lot{row.lots > 1 ? 's' : ''} · {row.species.common}</div>
              </div>
              <div className={`stock-row__bar ${ok ? 'ok' : ''}`}><span style={{width: `${pct}%`}} /></div>
              <div className="stock-row__qty">
                <strong style={{color: ok ? 'var(--ink-on-dark)' : 'var(--coral)'}}>{row.remaining}</strong><span style={{color:'var(--muted-2)'}}>kg</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProcurementPanel({ data }) {
  return (
    <div className="panel">
      <div className="panel__head">
        <div style={{display:'flex', flexDirection:'column'}}>
          <div className="panel__title">Catch alerts matched to your watchlist</div>
          <div className="panel__sub">Live procurement feed · 22 open</div>
        </div>
        <div className="filter-pills" style={{marginLeft:'auto'}}>
          <span className="pill-btn on">Best match</span>
          <span className="pill-btn">Closest</span>
          <span className="pill-btn">Expiring</span>
        </div>
      </div>
      <div className="feed-grid">
        {data.procurementAlerts.map((a, i) => (
          <div key={i} className="feed-card">
            <div className="feed-card__head">
              <span className="code">{a.code}</span>
              <span className="code match">{a.match}% match</span>
              <span style={{marginLeft:'auto', fontSize:18}}>{a.species.icon}</span>
            </div>
            <div>
              <div className="feed-card__species">{a.species.local}</div>
              <div className="feed-card__fisher">{a.fisher} · {a.species.common}</div>
            </div>
            <div className="feed-card__kpis">
              <div><span className="l">Qty</span><span className="v">{a.qty}<small style={{color:'var(--muted-2)'}}>kg</small></span></div>
              <div><span className="l">Ask</span><span className="v">₱{a.price}</span></div>
              <div><span className="l">Expires</span><span className="v" style={{fontSize:11}}>{a.expires}</span></div>
            </div>
            <div className="feed-card__cta">
              <button className="ghost"><Icon name="plus" size={11} /> Add to cart</button>
              <button className="solid"><Icon name="arrowRight" size={11} /> Start deal</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ data, tweaks }) {
  return (
    <div className="content">
      {/* Top recommended row */}
      <div className="section-head">
        <div>
          <div className="section-eyebrow">
            Recommended for today
            <span className="pill">{data.topSpecies.length} active species</span>
          </div>
          <h1 className="section-title">Top selling <em>catch</em></h1>
        </div>
        <div className="filter-pills">
          <span className="pill-btn on"><Icon name="chevronDown" size={11} /> 24H</span>
          <span className="pill-btn"><Icon name="chevronDown" size={11} /> Whole fresh</span>
          <span className="pill-btn"><Icon name="chevronDown" size={11} /> Desc</span>
        </div>
      </div>

      <div className="top-row">
        {data.topSpecies.map(s => <TopSpeciesCard key={s.id} s={s} />)}
        <PromoCard />
      </div>

      {/* Featured lot + window + 4 mini stats */}
      <ActiveListingBlock data={data} tweaks={tweaks} />

      {/* Orders + advisories + low stock + procurement */}
      <div className="lower-grid">
        <OrdersPanel data={data} />
        <div className="stack">
          <AdvisoriesPanel data={data} />
          <LowStockPanel data={data} />
        </div>
      </div>

      <ProcurementPanel data={data} />
    </div>
  );
}

// Stub views for non-dashboard tabs (so sidebar nav feels real)
function PlaceholderView({ name }) {
  const map = {
    storefront:  { title: 'Storefront',     sub: 'Public listings buyers can order from.', icon: 'store' },
    inventory:   { title: 'Inventory',      sub: 'Lots received from fishermen.',          icon: 'box' },
    orders:      { title: 'Orders',         sub: 'Track sales confirm → handoff → paid.',  icon: 'clipboard' },
    procurement: { title: 'Source Catch',   sub: 'Live alerts from fishermen, watchlist matched first.', icon: 'fish' },
    messages:    { title: 'Messages',       sub: 'Negotiate deals in real time.',          icon: 'message' },
    analytics:   { title: 'Analytics',      sub: 'Revenue, volume, repeat-buyer signal.',  icon: 'chart' },
    advisory:    { title: 'Marine advisory',sub: 'Tides, weather, BFAR, red-tide pulse.',  icon: 'wave' },
    reviews:     { title: 'Reviews',        sub: 'Customer feedback.',                     icon: 'heart' },
    shop:        { title: 'Shop profile',   sub: 'Your public shop on mermaid.ph.',        icon: 'settings' },
  };
  const v = map[name] || { title: name, sub: '', icon: 'dashboard' };
  return (
    <div className="content">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">Vendor · Console</div>
          <h1 className="section-title">{v.title}</h1>
        </div>
      </div>
      <div className="panel" style={{padding:'48px 32px', textAlign:'center'}}>
        <div style={{width:64, height:64, borderRadius:16, margin:'0 auto 14px', display:'grid', placeItems:'center',
                     background:'var(--panel-2)', border:'1px solid var(--hairline)', color:'var(--accent-lime)'}}>
          <Icon name={v.icon} size={26} />
        </div>
        <div style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600}}>{v.title}</div>
        <div style={{color:'var(--muted)', marginTop:6, fontSize:13}}>{v.sub}</div>
        <div style={{color:'var(--muted-2)', marginTop:14, fontSize:11, fontFamily:'var(--font-mono)'}}>
          Click <strong style={{color:'var(--accent-lime)'}}>Dashboard</strong> to return.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Topbar, Dashboard, PlaceholderView });
