// views-ops.jsx — Storefront, Inventory, Orders, Source Catch

// --------- Reusable page header ---------
function PageHead({ eyebrow, title, em, sub, actions, extra }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="section-title">{title} {em && <em>{em}</em>}</h1>
        {sub && <p style={{margin:'8px 0 0', color:'var(--muted)', fontSize:13, maxWidth:560}}>{sub}</p>}
      </div>
      <div className="page__actions">
        {extra}
        {actions}
      </div>
    </div>
  );
}

// =================== STOREFRONT ===================
function StorefrontView({ data }) {
  const [tab, setTab] = React.useState('all');
  const filtered = data.listings.filter(l => tab === 'all' ? true : l.status.toLowerCase() === tab);
  const stats = {
    total: data.listings.length,
    active: data.listings.filter(l => l.status === 'ACTIVE').length,
    views30d: data.listings.reduce((a, l) => a + l.views, 0),
    sold30d: data.listings.reduce((a, l) => a + l.sold30d, 0),
  };
  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Storefront <span className="pill">{stats.active} active</span></>}
        title="Your public" em="listings"
        sub="The shopfront buyers see at mermaid.ph/shop/perlas-coast — pricing, freshness photos, and pickup windows."
        actions={<>
          <button className="btn"><Icon name="eye" size={13} /> Preview shop</button>
          <button className="btn btn--primary"><Icon name="plus" size={13} stroke={2.2} /> New listing</button>
        </>}
      />

      <div className="kpi-strip">
        <div className="cell"><div className="l">Listings</div><div className="v">{stats.total}</div><div className="s">{stats.active} active · {data.listings.filter(l=>l.status==='DRAFT').length} draft</div></div>
        <div className="cell"><div className="l">Views · 30d</div><div className="v">{stats.views30d.toLocaleString()}</div><div className="s">+12% vs prior</div></div>
        <div className="cell"><div className="l">Sold · 30d</div><div className="v">{stats.sold30d.toFixed(0)}<small>kg</small></div><div className="s">across {stats.active} SKUs</div></div>
        <div className="cell"><div className="l">Conversion</div><div className="v">3.4<small>%</small></div><div className="s">view → order</div></div>
        <div className="cell"><div className="l">Avg rating</div><div className="v">4.7<small>★</small></div><div className="s">{data.reviews.length} reviews · 30d</div></div>
      </div>

      <div className="seg-tabs" style={{alignSelf:'flex-start'}}>
        <button className={tab==='all' ? 'on' : ''} onClick={() => setTab('all')}>All <span className="badge">{data.listings.length}</span></button>
        <button className={tab==='active' ? 'on' : ''} onClick={() => setTab('active')}>Active <span className="badge">{stats.active}</span></button>
        <button className={tab==='draft' ? 'on' : ''} onClick={() => setTab('draft')}>Drafts</button>
        <button className={tab==='paused' ? 'on' : ''} onClick={() => setTab('paused')}>Paused</button>
      </div>

      <div className="listing-grid">
        {filtered.map(l => (
          <div key={l.id} className="listing-card">
            <div className="listing-card__photo">
              <span className={`listing-card__status ${l.status.toLowerCase()}`}>{l.status}</span>
              <div className="listing-card__menu"><Icon name="more" size={14} /></div>
              <div className="listing-card__fish">{l.species.icon}</div>
              <div className="listing-card__price">₱{l.price}/kg</div>
            </div>
            <div className="listing-card__body">
              <span className="listing-card__code">{l.code} · {l.species.local}</span>
              <div className="listing-card__title">{l.title}</div>
              <div className="listing-card__stats">
                <div className="listing-card__stat"><span className="l">Stock</span><span className="v">{l.stock}<span style={{color:'var(--muted-2)'}}>kg</span></span></div>
                <div className="listing-card__stat"><span className="l">Sold 30d</span><span className="v">{l.sold30d}<span style={{color:'var(--muted-2)'}}>kg</span></span></div>
                <div className="listing-card__stat"><span className="l">Views</span><span className="v">{l.views}</span></div>
              </div>
            </div>
            <div className="listing-card__actions">
              <button className="btn btn--sm btn--ghost"><Icon name="settings" size={11} /> Edit</button>
              <button className="btn btn--sm"><Icon name="eye" size={11} /> View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================== INVENTORY ===================
function InventoryView({ data }) {
  const [threshold, setThreshold] = React.useState(15);
  const [species, setSpecies] = React.useState('');
  const lots = data.lots.filter(l => species ? l.species.id === Number(species) : true);
  const totalInitial = data.lots.reduce((a, l) => a + l.initialKg, 0);
  const totalRemaining = data.lots.reduce((a, l) => a + l.remainingKg, 0);
  const turnover = ((totalInitial - totalRemaining) / totalInitial * 100).toFixed(0);
  const costValue = data.lots.reduce((a, l) => a + l.remainingKg * l.costPerKg, 0);

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Inventory <span className="pill">{data.lots.length} lots</span></>}
        title="Your" em="lots"
        sub="Every batch received from fishermen, with remaining weight, cost basis, and shelf state."
        actions={<>
          <button className="btn"><Icon name="download" size={13} /> Export</button>
          <button className="btn btn--primary"><Icon name="plus" size={13} stroke={2.2} /> Adjust lot</button>
        </>}
      />

      <div className="kpi-strip">
        <div className="cell"><div className="l">On-hand</div><div className="v">{totalRemaining.toFixed(1)}<small>kg</small></div><div className="s">across {data.lots.length} lots</div></div>
        <div className="cell"><div className="l">Cost value</div><div className="v">₱{(costValue/1000).toFixed(1)}<small>k</small></div><div className="s">at landed cost</div></div>
        <div className="cell"><div className="l">Turnover</div><div className="v">{turnover}<small>%</small></div><div className="s">sold of received</div></div>
        <div className="cell"><div className="l">Low stock</div><div className="v">{data.lowStock.length}</div><div className="s">≤ {threshold}kg threshold</div></div>
        <div className="cell"><div className="l">Avg age</div><div className="v">2.1<small>d</small></div><div className="s">since landed</div></div>
      </div>

      <div style={{display:'flex', gap:14, alignItems:'center', flexWrap:'wrap'}}>
        <div className="field" style={{flexDirection:'row', alignItems:'center', gap:10}}>
          <label style={{margin:0}}>Threshold</label>
          <input type="number" value={threshold} onChange={e => setThreshold(+e.target.value)} style={{width:80}} />
          <span style={{color:'var(--muted-2)', fontFamily:'var(--font-mono)', fontSize:11}}>kg</span>
        </div>
        <div className="field" style={{flexDirection:'row', alignItems:'center', gap:10}}>
          <label style={{margin:0}}>Species</label>
          <select value={species} onChange={e => setSpecies(e.target.value)} style={{minWidth:180}}>
            <option value="">All species</option>
            {data.species.map(s => <option key={s.id} value={s.id}>{s.common} ({s.local})</option>)}
          </select>
        </div>
        <div style={{flex:1}} />
        <div className="filter-pills">
          <span className="pill-btn on">Active</span>
          <span className="pill-btn">Low</span>
          <span className="pill-btn">Sold out</span>
        </div>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {lots.map(l => {
          const pct = Math.round(l.remainingKg / l.initialKg * 100);
          const low = l.remainingKg <= threshold && l.remainingKg > 0;
          const empty = l.remainingKg === 0;
          return (
            <div key={l.id} className={`lot-row-card${empty ? ' is-empty' : ''}`}>
              <div className="lot-row-card__icon" style={{background:`linear-gradient(135deg, ${l.species.color}33, var(--panel-3))`}}>{l.species.icon}</div>
              <div>
                <span className="label">Lot · {l.species.local}</span>
                <div className="value">{l.species.common}</div>
                <div className="value mono" style={{color:'var(--muted-2)', fontSize:11, marginTop:2}}>{l.code} · {l.source}</div>
              </div>
              <div>
                <span className="label">Received</span>
                <div className="value mono">{l.received.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                <div style={{fontSize:10.5, color:'var(--muted-2)', fontFamily:'var(--font-mono)'}}>{l.orderCode}</div>
              </div>
              <div>
                <span className="label">Remaining</span>
                <div className="value">
                  <span style={{color: low || empty ? 'var(--coral)' : 'var(--ink-on-dark)'}}>{l.remainingKg}</span>
                  <span style={{color:'var(--muted-2)', fontWeight:400, fontSize:11, marginLeft:3}}>/ {l.initialKg}kg</span>
                </div>
                <div className={`lot-meter ${low || empty ? 'low' : ''}`}><span style={{width: empty ? '4%' : pct+'%'}} /></div>
              </div>
              <div>
                <span className="label">Cost / kg</span>
                <div className="value mono">₱{l.costPerKg}</div>
                <div style={{fontSize:10.5, color:'var(--accent-lime)', fontFamily:'var(--font-mono)'}}>+ margin tracked</div>
              </div>
              <div style={{display:'flex', gap:6}}>
                <button className="btn btn--sm btn--ghost"><Icon name="trash" size={11} /></button>
                {!empty && (l.listed
                  ? <span className="chip chip--ready" style={{padding:'4px 10px'}}>Listed</span>
                  : <button className="btn btn--sm btn--primary"><Icon name="plus" size={11} /> List</button>)}
                {empty && <span className="chip chip--done" style={{padding:'4px 10px'}}>Sold out</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =================== ORDERS ===================
function OrdersView({ data }) {
  const [filter, setFilter] = React.useState('all');
  const counts = data.orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1; return acc;
  }, {});
  const totalOpen = data.orders.filter(o => !['CANCELLED','COMPLETED'].includes(o.status))
                               .reduce((a, o) => a + o.total, 0);
  const pending   = counts.PENDING   || 0;
  const confirmed = counts.CONFIRMED || 0;
  const completed = counts.COMPLETED || 0;
  const cancelled = counts.CANCELLED || 0;

  const filtered = data.orders.filter(o => filter === 'all' ? true : o.status === filter);

  const statusChip = (s) => {
    if (s === 'PENDING')   return <span className="chip chip--new">Pending</span>;
    if (s === 'CONFIRMED') return <span className="chip chip--prep">Confirmed</span>;
    if (s === 'COMPLETED') return <span className="chip chip--ready">Completed</span>;
    if (s === 'CANCELLED') return <span className="chip chip--cancel">Cancelled</span>;
    return <span className="chip chip--done">{s}</span>;
  };
  const pipeClass = (s) => ({
    PENDING:'pending', CONFIRMED:'confirmed', COMPLETED:'done', CANCELLED:'cancel'
  })[s] || '';

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Operations · Sales</>}
        title="Order" em="inbox"
        sub="Track every retail sale from confirmation to payment, with handoff and dispute tools."
        actions={<>
          <button className="btn"><Icon name="download" size={13} /> Export CSV</button>
          <button className="btn"><Icon name="filter" size={13} /> Advanced</button>
        </>}
      />

      <div className="kpi-strip">
        <div className="cell"><div className="l">Pending</div><div className="v">{pending}</div><div className="s">Awaiting confirm</div></div>
        <div className="cell"><div className="l">Confirmed</div><div className="v">{confirmed}</div><div className="s">In progress</div></div>
        <div className="cell"><div className="l">Completed · 7d</div><div className="v">{completed}</div><div className="s">delivered &amp; paid</div></div>
        <div className="cell"><div className="l">Cancelled</div><div className="v">{cancelled}</div><div className="s">last 7d</div></div>
        <div className="cell"><div className="l">Open value</div><div className="v">₱{(totalOpen/1000).toFixed(1)}<small>k</small></div><div className="s">across {data.orders.length} orders</div></div>
      </div>

      <div className="pipeline-card">
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div>
            <div style={{font:'600 14px var(--font-display)'}}>Pipeline this week</div>
            <div style={{fontSize:11, color:'var(--muted-2)', marginTop:2}}>Distribution of open orders across stages</div>
          </div>
          <div style={{marginLeft:'auto', display:'flex', gap:8}}>
            <span className="chip chip--done" style={{padding:'4px 10px'}}>₱{(totalOpen/1000).toFixed(1)}k open</span>
          </div>
        </div>
        <div className="pipeline-bars">
          <div className="pipeline-bar pending"   style={{flex: pending   || 0.5}} />
          <div className="pipeline-bar confirmed" style={{flex: confirmed || 0.5}} />
          <div className="pipeline-bar transit"   style={{flex: 1}} />
          <div className="pipeline-bar completed" style={{flex: completed || 0.5}} />
        </div>
        <div className="pipeline-labels">
          <span><span className="swatch" style={{background:'var(--accent-lime)'}} /><strong>{pending}</strong>Pending</span>
          <span><span className="swatch" style={{background:'var(--tide)'}} /><strong>{confirmed}</strong>Confirmed</span>
          <span><span className="swatch" style={{background:'var(--accent-pink)'}} /><strong>1</strong>In transit</span>
          <span><span className="swatch" style={{background:'var(--accent-violet-mid)'}} /><strong>{completed}</strong>Completed</span>
        </div>
      </div>

      <div className="filter-pills">
        {['all','PENDING','CONFIRMED','COMPLETED','CANCELLED'].map(s => (
          <span key={s} className={`pill-btn${filter===s?' on':''}`} onClick={() => setFilter(s)} style={{cursor:'pointer'}}>
            {s === 'all' ? 'All orders' : s.charAt(0)+s.slice(1).toLowerCase()}
            <span style={{marginLeft:6, opacity:0.6, fontFamily:'var(--font-mono)', fontSize:10}}>
              {s === 'all' ? data.orders.length : (counts[s] || 0)}
            </span>
          </span>
        ))}
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {filtered.map(o => (
          <div key={o.id} className="order-card">
            <div className={`order-card__pipe order-card__pipe--${pipeClass(o.status)}`} />
            <div>
              <div className="order-card__head">
                <span className="order-card__code">#{o.id}</span>
                {statusChip(o.status)}
              </div>
              <div className="order-card__buyer">{o.buyer}</div>
              <div className="order-card__species">{o.species} · pickup {o.created.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</div>
            </div>
            <div>
              <span className="label" style={{font:'600 10px var(--font-ui)', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--muted-2)'}}>Quantity</span>
              <div className="order-card__qty">{o.qty}<small>kg</small></div>
              <div className="order-card__species" style={{fontFamily:'var(--font-mono)', marginTop:2}}>₱{o.price}/kg</div>
            </div>
            <div>
              <span className="label" style={{font:'600 10px var(--font-ui)', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--muted-2)'}}>Total</span>
              <div className="order-card__total">₱{o.total.toLocaleString()}</div>
              <div className="order-card__species" style={{marginTop:2}}>{o.badge === 'ready' ? 'Pickup' : o.badge === 'prep' ? 'Packing' : '—'}</div>
            </div>
            <div className="order-card__actions">
              {o.status === 'PENDING'   && <><button className="btn btn--sm btn--ghost">Decline</button><button className="btn btn--sm btn--primary">Confirm</button></>}
              {o.status === 'CONFIRMED' && <><button className="btn btn--sm btn--ghost">Dispute</button><button className="btn btn--sm btn--primary">{o.badge === 'ready' ? 'Handoff' : 'Mark ready'}</button></>}
              {o.status === 'COMPLETED' && <button className="btn btn--sm">Receipt</button>}
              {o.status === 'CANCELLED' && <button className="btn btn--sm">Reopen</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================== SOURCE CATCH (Procurement) ===================
function SourceCatchView({ data }) {
  const [tab, setTab] = React.useState('feed');

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Procurement <span className="pill">22 live · 4 matched</span></>}
        title="Source fresh" em="catch"
        sub="Live alerts from fishermen, your watchlist matched first. Add to cart or open a deal chat instantly."
        actions={<>
          <button className="btn"><Icon name="pin" size={13} /> Edit watchlist</button>
          <button className="btn btn--primary"><Icon name="zap" size={13} /> Auto-bid setup</button>
        </>}
      />

      <div className="seg-tabs" style={{alignSelf:'flex-start'}}>
        <button className={tab==='feed' ? 'on' : ''} onClick={() => setTab('feed')}>Live feed <span className="badge">22</span></button>
        <button className={tab==='cart' ? 'on' : ''} onClick={() => setTab('cart')}>Cart <span className="badge">3</span></button>
        <button className={tab==='orders' ? 'on' : ''} onClick={() => setTab('orders')}>My orders <span className="badge">6</span></button>
        <button className={tab==='credits' ? 'on' : ''} onClick={() => setTab('credits')}>Credits <span className="badge">2</span></button>
      </div>

      {tab === 'feed' && (
        <>
          <div className="kpi-strip">
            <div className="cell"><div className="l">Open alerts</div><div className="v">22</div><div className="s">last 24h</div></div>
            <div className="cell"><div className="l">On watchlist</div><div className="v">4</div><div className="s">match ≥ 60%</div></div>
            <div className="cell"><div className="l">Avg ask</div><div className="v">₱264<small>/kg</small></div><div className="s">across feed</div></div>
            <div className="cell"><div className="l">Closest fisher</div><div className="v">2.1<small>km</small></div><div className="s">Cap. Lourdes Bañes</div></div>
            <div className="cell"><div className="l">Spend · 30d</div><div className="v">₱298<small>k</small></div><div className="s">68 lots procured</div></div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">Live procurement feed</div>
              <div className="panel__sub">Updates every 30s</div>
              <div className="filter-pills" style={{marginLeft:'auto'}}>
                <span className="pill-btn on">Best match</span>
                <span className="pill-btn">Closest</span>
                <span className="pill-btn">Expiring</span>
                <span className="pill-btn">All species</span>
              </div>
            </div>
            <div className="feed-grid">
              {[...data.procurementAlerts, ...data.procurementAlerts.slice(0,2).map((a,i)=>({...a, code:`CA-${4410-i}`, match: 64 - i*4, expires: `in ${14+i}h`}))].map((a,i) => (
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
                    <button className="ghost"><Icon name="plus" size={11} /> Cart</button>
                    <button className="solid"><Icon name="arrowRight" size={11} /> Start deal</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'cart' && (
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Cart</div>
            <div className="panel__sub">3 items pending order — open a deal to lock in the price</div>
            <button className="btn btn--primary" style={{marginLeft:'auto'}}><Icon name="arrowRight" size={12} /> Start deals (3)</button>
          </div>
          <table className="tbl">
            <thead><tr><th>Alert</th><th>Species</th><th>Fisher</th><th>Qty</th><th>Ask</th><th>Deal</th><th></th></tr></thead>
            <tbody>
              {data.procurementAlerts.slice(0,3).map((a,i) => (
                <tr key={i}>
                  <td><span className="code">{a.code}</span></td>
                  <td className="strong">{a.species.local}</td>
                  <td>{a.fisher}</td>
                  <td className="amount">{a.qty}kg</td>
                  <td className="amount">₱{a.price}</td>
                  <td>{i === 0 ? <span className="chip chip--neg">Negotiating</span> : <span className="chip chip--done">No deal</span>}</td>
                  <td style={{textAlign:'right'}}>
                    <span className="btn-row">
                      {i === 0
                        ? <button className="row-btn">Open chat</button>
                        : <button className="row-btn row-btn--primary">Start deal</button>}
                      <button className="row-btn"><Icon name="trash" size={11} /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {data.orders.slice(0, 4).map(o => (
            <div key={o.id} className="order-card">
              <div className="order-card__pipe order-card__pipe--confirmed" />
              <div>
                <div className="order-card__head">
                  <span className="order-card__code">PO-{1240+o.id%10}</span>
                  <span className="chip chip--prep">In transit</span>
                </div>
                <div className="order-card__buyer">Buying from {data.fishermen[o.id % data.fishermen.length]}</div>
                <div className="order-card__species">{o.species}</div>
              </div>
              <div>
                <span style={{font:'600 10px var(--font-ui)', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--muted-2)'}}>Qty agreed</span>
                <div className="order-card__qty">{o.qty}<small>kg</small></div>
              </div>
              <div>
                <span style={{font:'600 10px var(--font-ui)', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--muted-2)'}}>Cost</span>
                <div className="order-card__total">₱{(o.total*0.7).toFixed(0)}</div>
              </div>
              <div className="order-card__actions">
                <button className="btn btn--sm btn--ghost">Cancel</button>
                <button className="btn btn--sm btn--primary">Confirm handoff</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'credits' && (
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Outstanding credits</div>
            <div className="panel__sub">2 unsettled — fishermen waiting on payment</div>
          </div>
          <table className="tbl">
            <thead><tr><th>Order</th><th>Fisher</th><th>Species</th><th>Amount</th><th>Aged</th><th></th></tr></thead>
            <tbody>
              <tr><td><span className="code">PO-1241</span></td><td className="strong">Mariela Vargas</td><td>Mackerel Scad</td><td className="amount">₱10,072</td><td>3d</td>
                <td style={{textAlign:'right'}}><button className="row-btn row-btn--primary">Settle now</button></td></tr>
              <tr><td><span className="code">PO-1238</span></td><td className="strong">Tomas Aquino</td><td>Blue Crab</td><td className="amount">₱4,680</td><td>1d</td>
                <td style={{textAlign:'right'}}><button className="row-btn row-btn--primary">Settle now</button></td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PageHead, StorefrontView, InventoryView, OrdersView, SourceCatchView });
