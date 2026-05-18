// views-insights.jsx — Messages, Analytics, Advisory, Reviews, Shop Profile

// =================== MESSAGES ===================
function MessagesView({ data }) {
  const [activeId, setActiveId] = React.useState(data.deals[0].id);
  const [filter, setFilter] = React.useState('all');
  const filtered = data.deals.filter(d => filter === 'all' ? true : filter === 'unread' ? d.unread > 0 : d.status === filter.toUpperCase());
  const active = data.deals.find(d => d.id === activeId);

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Messages · Deals</>}
        title="Negotiate" em="in flight"
        sub="Open conversations with fishermen. Counter-offers, agreements, and handoff scheduling all live here."
        actions={<button className="btn"><Icon name="plus" size={13} stroke={2.2} /> New deal</button>}
      />

      <div className="msg-shell">
        <div className="msg-list">
          <div className="msg-list__head">
            <div className="msg-list__title">Conversations</div>
            <div className="msg-list__filter">
              <button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>All</button>
              <button className={filter==='unread'?'on':''} onClick={()=>setFilter('unread')}>Unread</button>
              <button className={filter==='negotiating'?'on':''} onClick={()=>setFilter('negotiating')}>Negotiating</button>
              <button className={filter==='agreed'?'on':''} onClick={()=>setFilter('agreed')}>Agreed</button>
            </div>
          </div>
          <div className="msg-list__body">
            {filtered.map(d => (
              <div key={d.id} className={`msg-item${d.id === activeId ? ' on' : ''}`} onClick={() => setActiveId(d.id)}>
                <div className="msg-item__avatar">{d.fisher.split(' ').filter(x=>x.length>2).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>
                <div className="msg-item__body">
                  <div className="msg-item__row">
                    <span className="msg-item__name">{d.fisher}</span>
                    <span className="msg-item__time">{d.lastAt}</span>
                  </div>
                  <div className="msg-item__last">{d.lastMsg}</div>
                  <div className="msg-item__meta">
                    <span className="msg-item__code">{d.code} · {d.species.local}</span>
                    {d.status === 'NEGOTIATING' && <span className="chip chip--neg" style={{fontSize:9}}>NEG</span>}
                    {d.status === 'AGREED'      && <span className="chip chip--ready" style={{fontSize:9}}>AGREED</span>}
                    {d.status === 'CANCELLED'   && <span className="chip chip--cancel" style={{fontSize:9}}>CANCEL</span>}
                    {d.unread > 0 && <span className="msg-item__unread">{d.unread}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="msg-thread">
          {active && (
            <>
              <div className="msg-thread__head">
                <div className="msg-item__avatar" style={{width:40, height:40}}>{active.fisher.split(' ').filter(x=>x.length>2).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>
                <div>
                  <div style={{font:'600 14px var(--font-display)'}}>{active.fisher}</div>
                  <div style={{fontSize:11, color:'var(--muted-2)', fontFamily:'var(--font-mono)'}}>{active.code} · {active.species.common} · {active.myQty}kg</div>
                </div>
                <div style={{marginLeft:'auto', display:'flex', gap:6}}>
                  <button className="topbar__icon" title="Pin"><Icon name="pin" size={14} /></button>
                  <button className="topbar__icon" title="Catch alert"><Icon name="fishSimple" size={14} /></button>
                  <button className="topbar__icon" title="More"><Icon name="more" size={14} /></button>
                </div>
              </div>
              <div className="msg-thread__body">
                <div className="msg-bubble from-fisher">
                  Hi po, I have a fresh {active.species.local} catch — {active.myQty}kg, iced right after landing 7:30am.
                  <span className="msg-bubble__time">08:42</span>
                </div>
                <div className="msg-offer from-fisher">
                  <span className="l">Offer</span>
                  <span className="price">₱{active.ask}/kg</span>
                  <span className="qty">{active.myQty}kg · flexible if you take whole</span>
                </div>

                <div className="msg-bubble from-me">
                  Can do ₱{Math.round(active.ask * 0.92)}/kg for the whole {active.myQty}kg — pickup at Pier 4 today?
                  <span className="msg-bubble__time">11:05</span>
                </div>
                <div className="msg-offer from-me">
                  <span className="l">Your counter</span>
                  <span className="price">₱{Math.round(active.ask * 0.92)}/kg</span>
                  <span className="qty">{active.myQty}kg · pickup Pier 4 today</span>
                </div>

                {active.status === 'NEGOTIATING' && (
                  <>
                    <div className="msg-bubble from-fisher">
                      How about ₱{Math.round(active.ask * 0.97)}/kg if we take all {active.myQty}? I can deliver to your bay.
                      <span className="msg-bubble__time">{active.lastAt}</span>
                    </div>
                    <div className="msg-offer from-fisher">
                      <span className="l">Counter</span>
                      <span className="price">₱{Math.round(active.ask * 0.97)}/kg</span>
                      <span className="qty">+ delivery included</span>
                      <div className="row">
                        <button className="row-btn row-btn--primary">Accept</button>
                        <button className="row-btn">Counter</button>
                        <button className="row-btn">Decline</button>
                      </div>
                    </div>
                  </>
                )}
                {active.status === 'AGREED' && (
                  <div className="msg-bubble from-fisher" style={{background:'rgba(70,211,154,0.18)', border:'1px solid rgba(70,211,154,0.4)'}}>
                    Deal! See you at Pier 4 at 14:00. I'll bring the BFAR cert.
                    <span className="msg-bubble__time">{active.lastAt}</span>
                  </div>
                )}
              </div>
              <div className="msg-composer">
                <button className="btn btn--sm btn--ghost"><Icon name="plus" size={13} /></button>
                <input placeholder="Send a message or propose a counter…" />
                <button className="btn btn--sm">Counter</button>
                <button className="btn btn--sm btn--primary">Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== ANALYTICS ===================
function AnalyticsView({ data }) {
  const [range, setRange] = React.useState('30');
  const a = data.analyticsSummary;
  const revMax = Math.max(...data.revenueBySpecies.map(s => s.revenue));
  const spendMax = Math.max(...data.procurementSpend.map(s => s.spend));

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Analytics</>}
        title="How your shop is" em="performing"
        sub="Revenue, volume, and repeat-buyer signal — sliced by species, buyer, and time window."
        actions={
          <div className="seg-tabs">
            {['7','30','90','365'].map(r => (
              <button key={r} className={range===r?'on':''} onClick={()=>setRange(r)}>
                {r === '365' ? '1y' : r+'d'}
              </button>
            ))}
          </div>
        }
      />

      <div className="kpi-strip">
        <div className="cell"><div className="l">Orders</div><div className="v">{a.totalOrders}</div><div className="s">across {a.uniqueBuyers} buyers</div></div>
        <div className="cell"><div className="l">Revenue</div><div className="v">₱{(a.totalRevenue/1000).toFixed(0)}<small>k</small></div><div className="s">+12.4% vs prior</div></div>
        <div className="cell"><div className="l">Volume</div><div className="v">{a.totalQtyKg}<small>kg</small></div><div className="s">sold</div></div>
        <div className="cell"><div className="l">AOV</div><div className="v">₱{a.avgOrderValue.toLocaleString()}</div><div className="s">avg order value</div></div>
        <div className="cell"><div className="l">Repeat rate</div><div className="v">{(a.repeatRate*100).toFixed(0)}<small>%</small></div><div className="s">buyer return rate</div></div>
      </div>

      <div className="cols-2--equal cols-2" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Revenue by species</div>
            <div className="panel__sub">Top selling SKUs</div>
            <button className="panel__action">All <Icon name="arrowRight" size={11} /></button>
          </div>
          <div style={{padding:'12px 18px 18px'}}>
            {data.revenueBySpecies.map(s => (
              <div key={s.name} className="bar-row">
                <div className="bar-row__name">{s.name}</div>
                <div className="bar-row__track">
                  <div className="bar-row__fill" style={{width: (s.revenue/revMax*100)+'%'}} />
                </div>
                <div className="bar-row__val">₱{(s.revenue/1000).toFixed(0)}k</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Procurement spend</div>
            <div className="panel__sub">Cost basis by species</div>
            <button className="panel__action">All <Icon name="arrowRight" size={11} /></button>
          </div>
          <div style={{padding:'12px 18px 18px'}}>
            {data.procurementSpend.map(s => (
              <div key={s.name} className="bar-row">
                <div className="bar-row__name">{s.name}</div>
                <div className="bar-row__track alt">
                  <div className="bar-row__fill" style={{width: (s.spend/spendMax*100)+'%'}} />
                </div>
                <div className="bar-row__val">₱{(s.spend/1000).toFixed(0)}k</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Repeat buyers</div>
          <div className="panel__sub">Your loyal customer base</div>
          <button className="panel__action">All buyers <Icon name="arrowRight" size={11} /></button>
        </div>
        <table className="tbl">
          <thead><tr><th>Buyer</th><th>Tier</th><th>Orders</th><th>Total spent</th><th>Last order</th><th></th></tr></thead>
          <tbody>
            {data.repeatBuyers.map(b => (
              <tr key={b.name}>
                <td className="strong">{b.name}</td>
                <td>
                  <span className="chip" style={{
                    background: b.tier === 'VIP' ? 'rgba(194,239,78,0.14)' : b.tier === 'Reg' ? 'var(--tide-soft)' : 'var(--panel-3)',
                    color: b.tier === 'VIP' ? 'var(--accent-lime)' : b.tier === 'Reg' ? 'var(--tide)' : 'var(--muted)',
                    border: '1px solid currentColor', borderColor: b.tier === 'VIP' ? 'rgba(194,239,78,0.3)' : 'var(--hairline)',
                    fontSize: 9.5
                  }}>{b.tier}</span>
                </td>
                <td className="amount">{b.orders}</td>
                <td className="amount">₱{b.spent.toLocaleString()}</td>
                <td className="amount" style={{color:'var(--muted)'}}>{b.last} ago</td>
                <td style={{textAlign:'right'}}>
                  <button className="row-btn">View orders</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================== MARINE ADVISORY ===================
function AdvisoryView({ data }) {
  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Risk monitoring <span className="pill">LIVE</span></>}
        title="Coastal" em="status board"
        sub="Tide, weather, BFAR notices, and fuel signal — one screen for go/no-go decisions on your handoffs."
        actions={<>
          <button className="btn"><Icon name="pin" size={13} /> My stations</button>
          <button className="btn btn--primary"><Icon name="bell" size={13} /> Subscribe alerts</button>
        </>}
      />

      {/* Hero status */}
      <div className="active-block">
        <header className="ab-head">
          <span style={{color:'var(--muted-2)'}}>Composite risk score · MERMAID</span>
          <div className="spacer" />
          <span style={{fontSize:11, color:'var(--muted-2)', fontFamily:'var(--font-mono)'}}>Refreshed 2 min ago</span>
          <button className="icon-btn" title="Refresh"><Icon name="refresh" size={14} /></button>
        </header>
        <div className="ab-grid">
          <div>
            <div className="ab-meta">
              <span className="live">ALERT</span>
              <span>Tañon Strait + Bohol Strait · 16:00 ChT</span>
            </div>
            <h2 className="ab-title">
              Squall line <em>incoming</em>
            </h2>
            <div className="ab-subtitle">
              Gale-force gusts to <strong style={{color:'var(--ink-on-dark)'}}>45kt</strong> expected 16:00 → 24:00.
              Three of your incoming lots ride this corridor — handoff windows likely slip 4–6h.
            </div>
            <div className="ab-figure" style={{alignItems:'center'}}>
              <div className="ab-figure__value" style={{fontSize:64}}>72<small>/100</small></div>
              <div className="ab-figure__pills">
                <button className="ab-figure__pill"><Icon name="bell" size={12} /> Alert team</button>
                <button className="ab-figure__pill ab-figure__pill--ghost"><Icon name="clipboard" size={12} /> Reschedule lots</button>
              </div>
            </div>
            <div style={{display:'flex', gap:18, marginTop:14, color:'var(--muted-2)', fontSize:11.5, fontFamily:'var(--font-mono)'}}>
              <span>3 lots in corridor</span>
              <span>· 2 vessels at sea</span>
              <span>· next reassess <span style={{color:'var(--accent-lime)'}}>16:00</span></span>
            </div>
          </div>

          {/* Tide chart */}
          <div className="window-card">
            <div className="window-card__head">
              <div className="window-card__title">Tide · Mactan Channel</div>
              <span className="window-card__chip">next 24h</span>
            </div>
            <div style={{height:140, position:'relative'}}>
              <Sparkline data={data.tideSeries} height={140} stroke="#5ec8e6" fill="#5ec8e6" />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted-2)', fontFamily:'var(--font-mono)'}}>
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11}}>
              <span style={{color:'var(--muted-2)'}}>High: <strong style={{color:'var(--ink-on-dark)', fontFamily:'var(--font-mono)'}}>1.55m</strong> @ 13:00</span>
              <span style={{color:'var(--muted-2)'}}>Low: <strong style={{color:'var(--ink-on-dark)', fontFamily:'var(--font-mono)'}}>0.40m</strong> @ 06:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Station grid */}
      <div className="section-head" style={{marginBottom:0}}>
        <div>
          <div className="section-eyebrow">Tide &amp; weather stations</div>
          <h2 style={{font:'600 20px var(--font-display)', margin:'4px 0 0'}}>Coastal monitoring grid</h2>
        </div>
        <div className="filter-pills">
          <span className="pill-btn on">Watched</span>
          <span className="pill-btn">Region 7</span>
          <span className="pill-btn">All</span>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12}}>
        {data.advisoryStations.map(s => (
          <div key={s.id} className={`station-card ${s.status === 'OK' ? 'ok' : s.status === 'WARN' ? 'warn' : 'alert'}`}>
            <div className="station-card__head">
              <div>
                <div className="station-card__name">{s.name}</div>
                <div className="station-card__id">{s.id}</div>
              </div>
              <span className={`station-card__status ${s.status === 'OK' ? 'ok' : s.status === 'WARN' ? 'warn' : 'alert'}`}>{s.status}</span>
            </div>
            <div className="station-card__grid">
              <div className="cell">
                <div className="l">Tide</div>
                <div className="v">{s.tide}<span style={{color:'var(--muted-2)', fontSize:10}}>m {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}</span></div>
              </div>
              <div className="cell">
                <div className="l">Wind</div>
                <div className="v">{s.wind}<span style={{color:'var(--muted-2)', fontSize:10}}>kt</span></div>
              </div>
              <div className="cell">
                <div className="l">Wave ht</div>
                <div className="v">{s.waveHt}<span style={{color:'var(--muted-2)', fontSize:10}}>m</span></div>
              </div>
            </div>
            <div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted-2)', marginBottom:4}}>
                <span>Risk score</span><span style={{fontFamily:'var(--font-mono)'}}>{s.risk}/100</span>
              </div>
              <div className="station-card__risk"><span style={{width: s.risk+'%'}} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* BFAR + activity */}
      <div className="lower-grid">
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">BFAR notices &amp; closures</div>
            <div className="panel__sub">Live regulatory feed</div>
            <button className="panel__action">All notices <Icon name="arrowRight" size={11} /></button>
          </div>
          <div className="panel__body" style={{padding:0}}>
            {data.bfarNotices.map(n => (
              <div className="adv-item" key={n.id}>
                <div className={`adv-item__dot ${n.tone}`}>
                  <Icon name={n.tone === 'warn' ? 'storm' : n.tone === 'ok' ? 'check' : 'badge'} size={14} />
                </div>
                <div className="adv-item__body">
                  <div style={{display:'flex', gap:6, alignItems:'center'}}>
                    <span className="adv-item__title">{n.title}</span>
                    <span style={{font:'500 9.5px var(--font-mono)', color:'var(--muted-2)', padding:'1px 5px', background:'var(--panel-3)', borderRadius:4}}>{n.id}</span>
                  </div>
                  <div className="adv-item__sub">{n.sub}</div>
                </div>
                <div className="adv-item__time">{n.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Diesel &amp; fuel index</div>
            <div className="panel__sub">Distributor benchmark · ChT</div>
          </div>
          <div style={{padding:18}}>
            <div className="ab-figure" style={{alignItems:'baseline'}}>
              <div className="ab-figure__value" style={{fontSize:44}}>₱68.20<small style={{fontSize:14}}>/L</small></div>
              <span className="kpi-card__delta kpi-card__delta--up" style={{marginTop:0}}>+3.1% 7d</span>
            </div>
            <div style={{marginTop:14, height:60}}>
              <Sparkline data={[60,61,62,61.5,63,64,65,64.5,66,67,67.5,68.2]} stroke="#fa7faa" fill="#fa7faa" height={60} />
            </div>
            <div style={{borderTop:'1px solid var(--hairline-soft)', marginTop:14, paddingTop:14, fontSize:12, color:'var(--muted)'}}>
              Rising diesel typically pressures <strong style={{color:'var(--ink-on-dark)'}}>Galunggong</strong> ask within 48h.
              Consider locking in 2 of 3 watchlist alerts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================== REVIEWS ===================
function ReviewsView({ data }) {
  const [replyTo, setReplyTo] = React.useState(null);
  const avg = (data.reviews.reduce((a,r) => a + r.rating, 0) / data.reviews.length).toFixed(1);
  const dist = [5,4,3,2,1].map(r => ({ r, count: data.reviews.filter(x => x.rating === r).length }));
  const maxDist = Math.max(...dist.map(d => d.count));

  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Reputation</>}
        title="Customer" em="reviews"
        sub="Reply to build trust. Buyers reading your shop see your responses prominently."
      />

      <div className="cols-2">
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Rating snapshot</div>
            <div className="panel__sub">Across {data.reviews.length} reviews · last 30d</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'200px 1fr', gap:24, padding:'18px', alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{font:'700 56px var(--font-display)', lineHeight:1, letterSpacing:'-0.03em', color:'var(--accent-lime)'}}>{avg}</div>
              <div style={{font:'600 18px var(--font-mono)', color:'var(--accent-lime)', marginTop:4, letterSpacing:2}}>★★★★★</div>
              <div style={{fontSize:11, color:'var(--muted-2)', marginTop:6}}>{data.reviews.length} reviews</div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {dist.map(d => (
                <div key={d.r} style={{display:'grid', gridTemplateColumns:'40px 1fr 30px', gap:10, alignItems:'center', fontSize:12}}>
                  <span style={{fontFamily:'var(--font-mono)', color:'var(--accent-lime)'}}>{d.r}★</span>
                  <div style={{height:8, background:'var(--panel-3)', borderRadius:999, overflow:'hidden'}}>
                    <div style={{height:'100%', width: `${(d.count/maxDist)*100}%`, background:'linear-gradient(90deg, var(--accent-lime), var(--accent-pink))', borderRadius:999}} />
                  </div>
                  <span style={{fontFamily:'var(--font-mono)', color:'var(--muted)'}}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{padding:18}}>
          <div className="panel__title" style={{marginBottom:14}}>Quick stats</div>
          <div className="kpi-strip" style={{borderRadius:10}}>
            <div className="cell"><div className="l">Reply rate</div><div className="v">100<small>%</small></div><div className="s">last 30d</div></div>
            <div className="cell"><div className="l">Avg response</div><div className="v">12<small>min</small></div><div className="s">median</div></div>
            <div className="cell"><div className="l">Awaiting reply</div><div className="v">{data.reviews.filter(r=>!r.reply).length}</div><div className="s">action needed</div></div>
          </div>
          <div style={{marginTop:14, padding:'12px 14px', borderRadius:10, background:'rgba(194,239,78,0.08)', border:'1px solid rgba(194,239,78,0.3)', fontSize:12, color:'var(--ink-on-dark)'}}>
            <strong style={{color:'var(--accent-lime)'}}>↑ Tip</strong> &nbsp; Replying within 2 hours lifts repeat-buyer rate by an average of 18%.
          </div>
        </div>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {data.reviews.map(r => (
          <div key={r.id} className="review-card">
            <div className="review-card__avatar">{r.reviewer.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div>
            <div className="review-card__body">
              <div className="review-card__head">
                <div className="review-card__name">{r.reviewer}</div>
                <div className="review-card__stars">
                  {'★'.repeat(r.rating)}<span className="off">{'★'.repeat(5-r.rating)}</span>
                </div>
                <span style={{marginLeft:'auto', fontSize:11, color:'var(--muted-2)', fontFamily:'var(--font-mono)'}}>{r.date.toLocaleDateString(undefined,{month:'short', day:'numeric'})}</span>
              </div>
              <div className="review-card__meta">
                <span className="code" style={{padding:'2px 7px', borderRadius:4, background:'var(--panel-3)', border:'1px solid var(--hairline)'}}>{r.code}</span>
                <span style={{marginLeft:8}}>{r.species}</span>
                <span style={{marginLeft:8}}>· {r.qty}kg</span>
              </div>
              <p className="review-card__comment">{r.comment}</p>
              {r.reply ? (
                <div className="review-card__reply">
                  <div className="l">Your reply</div>
                  {r.reply}
                </div>
              ) : replyTo === r.id ? (
                <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
                  <textarea className="field" style={{background:'var(--panel-2)', border:'1px solid var(--hairline)', borderRadius:10, padding:'10px 12px', color:'var(--ink-on-dark)', font:'500 13px var(--font-ui)', minHeight:60, resize:'vertical'}} rows="2" placeholder="Thank the buyer, address concerns, invite them back…" />
                  <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                    <button className="btn btn--sm btn--ghost" onClick={() => setReplyTo(null)}>Cancel</button>
                    <button className="btn btn--sm btn--primary">Post reply</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn--sm" style={{marginTop:10}} onClick={() => setReplyTo(r.id)}>
                  <Icon name="message" size={11} /> Reply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================== SHOP PROFILE ===================
function ShopProfileView({ data }) {
  const s = data.shop;
  const [hours, setHours] = React.useState(s.hours);
  return (
    <div className="content view-body">
      <PageHead
        eyebrow={<>Shop</>}
        title="Your" em="public shop"
        sub={<>This is what buyers see at <span style={{fontFamily:'var(--font-mono)', color:'var(--accent-lime)'}}>mermaid.ph/shop/{s.slug}</span></>}
        actions={<>
          <button className="btn"><Icon name="eye" size={13} /> Preview</button>
          <button className="btn btn--primary"><Icon name="check" size={13} /> Save changes</button>
        </>}
      />

      {/* Banner + logo */}
      <div style={{position:'relative', paddingBottom:46}}>
        <div className="shop-banner">
          <div className="shop-banner__edit">
            <button className="btn btn--sm btn--ghost" style={{background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)'}}>
              <Icon name="settings" size={11} /> Change banner
            </button>
          </div>
        </div>
        <div className="shop-logo">{s.logoInitials}</div>
      </div>

      <div className="kpi-strip">
        <div className="cell"><div className="l">Followers</div><div className="v">{s.metrics.followers.toLocaleString()}</div><div className="s">+24 this week</div></div>
        <div className="cell"><div className="l">Repeat rate</div><div className="v">{s.metrics.repeat}<small>%</small></div><div className="s">vs marketplace avg 41%</div></div>
        <div className="cell"><div className="l">Fulfillment</div><div className="v">{s.metrics.fulfillment}<small>%</small></div><div className="s">on-time handoff</div></div>
        <div className="cell"><div className="l">Avg response</div><div className="v">{s.metrics.response.split(' ')[0]}<small>min</small></div><div className="s">deal chat median</div></div>
      </div>

      <div className="cols-2">
        <div className="panel" style={{padding:22}}>
          <div className="panel__title" style={{marginBottom:14}}>Basic info</div>
          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            <div className="field">
              <label>Display name</label>
              <input defaultValue={s.displayName} />
            </div>
            <div className="field">
              <label>Public slug</label>
              <div style={{display:'flex', alignItems:'center', gap:0}}>
                <span style={{padding:'10px 12px', background:'var(--panel-3)', border:'1px solid var(--hairline)', borderRight:0, borderRadius:'10px 0 0 10px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--muted)'}}>mermaid.ph/shop/</span>
                <input defaultValue={s.slug} style={{borderRadius:'0 10px 10px 0', flex:1}} />
              </div>
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea defaultValue={s.bio} rows="4" style={{resize:'vertical', background:'var(--panel-2)', border:'1px solid var(--hairline)', borderRadius:10, padding:'10px 12px', color:'var(--ink-on-dark)', font:'500 13px var(--font-ui)', outline:'none'}} />
            </div>
            <div className="field">
              <label>Pickup location</label>
              <input defaultValue={s.pickupLocation} />
            </div>
          </div>
        </div>

        <div className="panel" style={{padding:22}}>
          <div className="panel__title" style={{marginBottom:6}}>Business hours</div>
          <div className="panel__sub" style={{marginBottom:14, marginLeft:0}}>Buyers see these on your public shop page.</div>
          <div style={{display:'flex', flexDirection:'column'}}>
            {hours.map((h, i) => (
              <div key={h.day} className="hours-row">
                <div className="hours-row__day">{h.day}</div>
                <input type="time" defaultValue={h.open}  disabled={h.closed} />
                <input type="time" defaultValue={h.close} disabled={h.closed} />
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <span style={{fontSize:11, color:'var(--muted)'}}>Closed</span>
                  <div className={`toggle${h.closed ? ' on' : ''}`}
                       onClick={() => {
                         const next = hours.map((x,j) => j === i ? {...x, closed: !x.closed} : x);
                         setHours(next);
                       }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{padding:22}}>
        <div className="panel__title" style={{marginBottom:6}}>Certificates &amp; trust</div>
        <div className="panel__sub" style={{marginBottom:14, marginLeft:0}}>Show buyers what you're licensed to sell. BFAR auto-validates on upload.</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
          {[
            { name: 'BFAR Vendor Accreditation', id: 'V-2026-CEB-0418', state: 'Verified', ico: 'badge', tone: 'ok' },
            { name: 'Cold Chain ISO 22000',      id: 'CC-2025-114',     state: 'Verified', ico: 'check', tone: 'ok' },
            { name: 'DOH Cold Storage Permit',    id: 'CSP-2026-3091',  state: 'Expires 4mo', ico: 'badge', tone: 'warn' },
            { name: 'Halal Cert (optional)',     id: null,              state: 'Not added', ico: 'plus', tone: 'add' },
          ].map(c => (
            <div key={c.name} style={{background:'var(--panel-2)', border:'1px solid var(--hairline)', borderRadius:12, padding:14}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{width:32, height:32, borderRadius:8, display:'grid', placeItems:'center',
                             background: c.tone === 'ok' ? 'var(--kelp-soft)' : c.tone === 'warn' ? 'var(--coral-soft)' : 'var(--panel-3)',
                             color: c.tone === 'ok' ? 'var(--kelp)' : c.tone === 'warn' ? 'var(--coral)' : 'var(--muted)',
                             border:'1px solid var(--hairline)'}}>
                  <Icon name={c.ico} size={14} />
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{font:'600 12px var(--font-display)'}}>{c.name}</div>
                  {c.id && <div style={{font:'500 10px var(--font-mono)', color:'var(--muted-2)', marginTop:2}}>{c.id}</div>}
                </div>
              </div>
              <div style={{marginTop:10, fontSize:11, color: c.tone === 'ok' ? 'var(--kelp)' : c.tone === 'warn' ? 'var(--coral)' : 'var(--muted)', fontWeight:600}}>
                {c.state}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MessagesView, AnalyticsView, AdvisoryView, ReviewsView, ShopProfileView });
