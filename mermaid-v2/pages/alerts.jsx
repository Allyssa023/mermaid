// ─── Catch Alerts ───────────────────────────────────────────────────────
function AlertsPage() {
  const active = CATCH_ALERTS.filter(a => a.status === 'ACTIVE');
  const matched = CATCH_ALERTS.filter(a => a.status === 'MATCHED');
  const expired = CATCH_ALERTS.filter(a => a.status === 'EXPIRED');

  const totalKg = active.reduce((a, c) => a + c.kg, 0);
  const potentialRevenue = active.reduce((a, c) => a + c.kg * c.askPrice, 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market-side</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Catch <em>Alerts</em>
          </h1>
          <p className="page__sub">Post what you've caught · let vendors come to you.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Filter</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Post alert</button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Active alerts</div>
          <div className="v">{active.length}</div>
          <div className="s">Posted to 14 nearby vendors</div>
        </div>
        <div className="stat">
          <div className="l">Total offered</div>
          <div className="v">{totalKg.toFixed(0)}<span style={{fontSize:16, color:'var(--ink-4)', marginLeft:2}}>kg</span></div>
          <div className="s">Across {active.length} listings</div>
        </div>
        <div className="stat">
          <div className="l">Potential revenue</div>
          <div className="v">₱{(potentialRevenue/1000).toFixed(1)}k</div>
          <div className="s">At asking price</div>
        </div>
        <div className="stat">
          <div className="l">Open offers</div>
          <div className="v">{active.reduce((a,c)=>a+c.offers,0)}</div>
          <div className="s">From 9 vendors</div>
        </div>
        <div className="stat">
          <div className="l">Match rate</div>
          <div className="v">82<span style={{fontSize:16, color:'var(--ink-4)', marginLeft:2}}>%</span></div>
          <div className="s">Last 30 days</div>
        </div>
      </div>

      {/* Active alerts grid */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Active alerts</div>
            <div className="card__sub">{active.length} live · buyers notified in real-time</div>
          </div>
          <div className="row" style={{gap: 4}}>
            <button className="btn btn--sm">Sort: Newest</button>
          </div>
        </div>
        <div className="alerts-grid">
          {active.map(a => (
            <div key={a.id} className={`alert-card${a.urgent ? ' alert-card--urgent' : ''}`}>
              <div className="alert-card__head">
                <div>
                  <div className="row" style={{gap: 6}}>
                    <span className="kbd">{a.id}</span>
                    {a.urgent && <span className="chip chip--unsafe chip--dot">Expires soon</span>}
                  </div>
                  <h3 className="alert-card__species">{a.species}</h3>
                  <div className="alert-card__sub">Posted {a.postedAt} · {a.site}</div>
                </div>
                <button className="btn btn--sm btn--ghost"><I.Dots size={14} /></button>
              </div>
              <div className="alert-card__stats">
                <div>
                  <div className="l">Qty</div>
                  <div className="v">{a.kg}<small>kg</small></div>
                </div>
                <div>
                  <div className="l">Pieces</div>
                  <div className="v">{a.pieces ?? '—'}</div>
                </div>
                <div>
                  <div className="l">Asking</div>
                  <div className="v">₱{a.askPrice}<small>/kg</small></div>
                </div>
              </div>
              <div className="alert-card__foot">
                <div className="row" style={{gap: 6}}>
                  <I.Clock size={12} style={{color: a.urgent ? 'var(--unsafe)' : 'var(--ink-4)'}} />
                  <span style={{color: a.urgent ? 'var(--unsafe)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12}}>
                    {a.expires}
                  </span>
                </div>
                <div className="row" style={{gap: 8}}>
                  <div className="alert-card__offers">
                    {['MS', 'BC', 'JA'].slice(0, Math.min(3, a.offers)).map((n, i) => (
                      <div key={i} className="alert-card__offer-avatar" style={{marginLeft: i === 0 ? 0 : -6}}>{n}</div>
                    ))}
                    {a.offers > 3 && <div className="alert-card__offer-avatar">+{a.offers - 3}</div>}
                  </div>
                  <button className="btn btn--accent btn--sm">{a.offers} offers</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matched alerts */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Matched · waiting to finalize</div>
            <div className="card__sub">{matched.length} ready to convert to orders</div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Species</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Buyer</th>
              <th>Site</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matched.map(a => (
              <tr key={a.id} className="row--link">
                <td><span className="kbd">{a.id}</span></td>
                <td style={{fontWeight: 500, color: 'var(--ink)'}}>{a.species}</td>
                <td className="data">{a.kg}kg · {a.pieces ?? '—'} pcs</td>
                <td className="data">₱{a.askPrice}/kg</td>
                <td>{a.buyer}</td>
                <td>{a.site}</td>
                <td><button className="btn btn--sm btn--accent">Create order</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expired */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Expired</div>
            <div className="card__sub">Past alerts · relist with one click</div>
          </div>
        </div>
        {expired.length === 0 ? (
          <div className="empty">No expired alerts yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Species</th><th>Qty</th><th>Ask</th><th>Site</th><th>Posted</th><th></th></tr>
            </thead>
            <tbody>
              {expired.map(a => (
                <tr key={a.id}>
                  <td><span className="kbd">{a.id}</span></td>
                  <td style={{fontWeight: 500}}>{a.species}</td>
                  <td className="data">{a.kg}kg</td>
                  <td className="data">₱{a.askPrice}/kg</td>
                  <td>{a.site}</td>
                  <td style={{color: 'var(--ink-4)'}}>{a.postedAt}</td>
                  <td><button className="btn btn--sm">Relist</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

window.AlertsPage = AlertsPage;
