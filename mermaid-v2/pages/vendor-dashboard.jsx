// ─── Vendor (Buyer) Dashboard ────────────────────────────────────────────
function VendorDashboardPage({ setPage }) {
  const M = window;
  const openListings = VENDOR_LISTINGS.filter(l => l.status === 'OPEN');
  const totalDemandKg = openListings.reduce((a, l) => a + l.quantityKg, 0);
  const totalCommitted = openListings.reduce((a, l) => a + l.fulfilledKg, 0);
  const fulfillPct = Math.round(totalCommitted / totalDemandKg * 100);
  const newInterests = VENDOR_INTERESTS.filter(i => i.status === 'new').length;
  const pendingOrders = VENDOR_ORDERS.filter(o => o.status === 'PENDING').length;
  const handoffWaiting = VENDOR_ORDERS.filter(o => o.handoff && !o.handoff.confirmedByBuyer && o.handoff.status === 'PENDING').length;
  const activeAlerts = VENDOR_BROWSE_ALERTS.length;
  const monthSpend = VENDOR_ORDERS.filter(o => !['CANCELLED'].includes(o.status)).reduce((a, o) => a + o.total, 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Buyer · Procurement</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Good morning, <em>{VENDOR_USER.first}</em>
          </h1>
          <p className="page__sub">{VENDOR_USER.business} · 6 open listings · {newInterests} new offers from fishermen.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> View interests</button>
          <button className="btn btn--primary" onClick={() => setPage('vlistings')}><I.Plus size={14} /> New demand listing</button>
        </div>
      </div>

      {/* Hero strip */}
      <div className="orders-strip">
        <div className="stat"><div className="l">Open demand</div><div className="v">{totalDemandKg}<small>kg</small></div><div className="s">Across {openListings.length} listings</div></div>
        <div className="stat"><div className="l">Committed</div><div className="v">{totalCommitted}<small>kg</small></div><div className="s">{fulfillPct}% fulfilled</div></div>
        <div className="stat"><div className="l">New interests</div><div className="v">{newInterests}</div><div className="s">Awaiting your reply</div></div>
        <div className="stat"><div className="l">Pending orders</div><div className="v">{pendingOrders}</div><div className="s">Awaiting seller confirm</div></div>
        <div className="stat"><div className="l">Handoffs</div><div className="v">{handoffWaiting}</div><div className="s">Need your confirmation</div></div>
        <div className="stat"><div className="l">Spend MTD</div><div className="v">₱{(monthSpend/1000).toFixed(1)}k</div><div className="s">{VENDOR_ORDERS.length} orders</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {/* Live catch alerts feed */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Live catch alerts · matched to your listings</div>
              <div className="card__sub">{activeAlerts} active · ranked by match score</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vbrowse')}>Browse all <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
            {VENDOR_BROWSE_ALERTS.slice(0, 4).map(a => (
              <div key={a.id} className={`alert-card${a.urgent ? ' alert-card--urgent' : ''}`}>
                <div className="alert-card__head">
                  <div>
                    <div className="row" style={{gap: 6}}>
                      <span className="kbd">{a.alertCode}</span>
                      <span className="chip chip--accent" style={{fontSize: 10}}>{a.matchScore}% match</span>
                    </div>
                    <h3 className="alert-card__species" style={{fontSize: 18}}>{a.species.commonName}</h3>
                    <div className="alert-card__sub">{a.fisherman.fullName} · {a.distance}</div>
                  </div>
                </div>
                <div className="alert-card__stats">
                  <div><div className="l">Qty</div><div className="v" style={{fontSize: 18}}>{a.quantityKg}<small>kg</small></div></div>
                  <div><div className="l">Asking</div><div className="v" style={{fontSize: 18}}>₱{a.askingPricePerKg}<small>/kg</small></div></div>
                  <div><div className="l">Expires</div><div className="v" style={{fontSize: 13, color: a.urgent ? 'var(--unsafe)' : 'var(--ink-2)'}}>{a.expiresIn}</div></div>
                </div>
                <div className="alert-card__foot">
                  <span style={{fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)'}}>{a.landingSite}</span>
                  <button className="btn btn--accent btn--sm" disabled={a.alreadyOffered}>
                    {a.alreadyOffered ? 'Offer sent' : 'Make offer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price index */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Price index · 7-day</div>
              <div className="card__sub">₱/kg · regional average</div>
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {PRICE_INDEX.map(p => {
              const min = Math.min(...p.series);
              const max = Math.max(...p.series);
              const range = max - min || 1;
              return (
                <div key={p.species} style={{display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line-soft)'}}>
                  <div>
                    <div style={{fontWeight: 500, fontSize: 13}}>{p.species}</div>
                    <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2}}>{p.tag}</div>
                  </div>
                  <svg width="64" height="22" style={{flexShrink: 0}}>
                    <polyline
                      fill="none"
                      stroke={p.change > 0 ? 'var(--safe)' : p.change < 0 ? 'var(--unsafe)' : 'var(--ink-4)'}
                      strokeWidth="1.5"
                      points={p.series.map((v, i) => `${i / 6 * 60 + 2},${20 - (v - min) / range * 16}`).join(' ')} />
                  </svg>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontFamily: 'var(--font-display)', fontSize: 18}}>₱{p.current}</div>
                    <div style={{fontSize: 10, fontFamily: 'var(--font-mono)', color: p.change > 0 ? 'var(--safe)' : p.change < 0 ? 'var(--unsafe)' : 'var(--ink-4)'}}>
                      {p.change > 0 ? '↑' : p.change < 0 ? '↓' : '·'} {Math.abs(p.change).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {/* Procurement chart */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Procurement · 14 days</div>
              <div className="card__sub">kg received per day</div>
            </div>
            <span className="chip chip--ink">{PROCUREMENT_14D.reduce((a, d) => a + d.kg, 0)}kg total</span>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px'}}>
            {PROCUREMENT_14D.map((d, i) => {
              const max = Math.max(...PROCUREMENT_14D.map(x => x.kg));
              const h = (d.kg / max) * 100;
              return (
                <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: i === PROCUREMENT_14D.length - 1 ? 'var(--accent)' : 'var(--ink-soft)',
                    borderRadius: '3px 3px 0 0', minHeight: 4
                  }} />
                  <div style={{fontSize: 9, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity */}
        <div className="card">
          <div className="card__head">
            <div className="card__title">Activity</div>
          </div>
          <ul className="activity">
            {VENDOR_ACTIVITY.map((a, i) => (
              <li key={i} className="activity__item">
                <span className={`activity__dot activity__dot--${a.type}`} />
                <div className="activity__body">
                  <div className="activity__line">
                    <strong>{a.who}</strong> <span>{a.what}</span>
                  </div>
                  <div className="activity__time">{a.ts}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Top suppliers */}
      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">Top suppliers</div>
            <div className="card__sub">Ranked by volume traded · last 90 days</div>
          </div>
          <button className="btn btn--sm">View all</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Fisherman</th><th>Vessel · Port</th><th>Trades</th><th>Volume</th><th>On-time</th><th>Rating</th><th>Last contact</th><th></th></tr>
          </thead>
          <tbody>
            {VENDOR_SUPPLIERS.map(s => (
              <tr key={s.id} className="row--link">
                <td style={{fontWeight: 500, color: 'var(--ink)'}}>{s.name}</td>
                <td><div style={{fontSize: 13}}>{s.vessel}</div><small style={{color: 'var(--ink-4)'}}>{s.port}</small></td>
                <td className="data">{s.trades}</td>
                <td className="data">{s.kg}kg</td>
                <td>
                  <div className="row" style={{gap: 6}}>
                    <span className="data">{s.onTimePct}%</span>
                    <div style={{width: 50, height: 4, background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden'}}>
                      <div style={{width: `${s.onTimePct}%`, height: '100%', background: s.onTimePct >= 90 ? 'var(--safe)' : s.onTimePct >= 80 ? 'var(--warn)' : 'var(--unsafe)'}} />
                    </div>
                  </div>
                </td>
                <td className="data">★ {s.rating}</td>
                <td style={{color: 'var(--ink-4)'}}>{s.last}</td>
                <td><button className="btn btn--sm">Message</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.VendorDashboardPage = VendorDashboardPage;
