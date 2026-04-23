// ─── Marketplace ───────────────────────────────────────────────────────
function MarketplacePage() {
  const [sort, setSort] = useState('priceDesc');
  let list = [...LISTINGS];
  if (sort === 'priceDesc') list.sort((a,b) => b.price - a.price);
  if (sort === 'qtyDesc') list.sort((a,b) => b.qty - a.qty);
  if (sort === 'date') list.sort((a,b) => a.neededBy.localeCompare(b.neededBy));

  const topPrice = Math.max(...LISTINGS.map(l => l.price));

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Market</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Vendor <em>demand</em>
          </h1>
          <p className="page__sub">{LISTINGS.length} active vendor listings · updated 2 min ago</p>
        </div>
        <div className="page__actions">
          <div className="topbar__search" style={{width: 240}}>
            <I.Search size={14} />
            <input placeholder="Search species, vendor…" />
          </div>
          <button className="btn btn--primary"><I.Plus size={14} /> Post alert</button>
        </div>
      </div>

      {/* Insight strip */}
      <div className="orders-strip">
        <div className="stat">
          <div className="l">Best price today</div>
          <div className="v">₱{topPrice}<span style={{fontSize: 14, color: 'var(--ink-4)'}}> /kg</span></div>
          <div className="s">Blue Marlin · Puerto Azul</div>
        </div>
        <div className="stat">
          <div className="l">Urgent listings</div>
          <div className="v">{LISTINGS.filter(l => l.urgent).length}</div>
          <div className="s">Deadline within 48h</div>
        </div>
        <div className="stat">
          <div className="l">Nearest vendor</div>
          <div className="v">4.2<span style={{fontSize: 14, color: 'var(--ink-4)'}}> km</span></div>
          <div className="s">Taal Lake Fresh · Taal</div>
        </div>
        <div className="stat">
          <div className="l">Avg tuna price</div>
          <div className="v">₱398</div>
          <div className="s">↑ ₱12 vs last week</div>
        </div>
        <div className="stat">
          <div className="l">Your match rate</div>
          <div className="v">82<span style={{fontSize: 14, color: 'var(--ink-4)'}}>%</span></div>
          <div className="s">12 matches / 14 alerts</div>
        </div>
      </div>

      <div className="mkt-grid">
        {/* Filters */}
        <div className="mkt-filter">
          <h4>Species</h4>
          {SPECIES.map(s => (
            <label key={s.id} className="mkt-check">
              <span><input type="checkbox" defaultChecked={['s1','s3','s5'].includes(s.id)} />{s.name}</span>
              <span className="count">{Math.floor(Math.random() * 6) + 1}</span>
            </label>
          ))}
          <h4>Location</h4>
          {['Batangas', 'Quezon', 'Lucena', 'Anilao', 'Lipa'].map(l => (
            <label key={l} className="mkt-check">
              <span><input type="checkbox" />{l}</span>
              <span className="count">{Math.floor(Math.random() * 4) + 1}</span>
            </label>
          ))}
          <h4>Price per kg</h4>
          <div style={{padding: '8px 0'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)'}}>
              <span>₱150</span><span>₱700</span>
            </div>
            <input type="range" min="150" max="700" defaultValue="350" style={{width: '100%', accentColor: 'var(--accent)'}} />
          </div>
          <h4>Urgency</h4>
          <label className="mkt-check"><span><input type="checkbox" />Deadline within 48h</span></label>
          <label className="mkt-check"><span><input type="checkbox" />New this week</span></label>
        </div>

        {/* Listings */}
        <div>
          <div className="row" style={{marginBottom: 10, gap: 6}}>
            <span className="chip chip--ink">{LISTINGS.length} results</span>
            <div className="spacer" />
            <span style={{fontSize: 12, color: 'var(--ink-4)'}}>Sort by</span>
            <button className={`btn btn--sm ${sort === 'priceDesc' ? '' : 'btn--ghost'}`} onClick={() => setSort('priceDesc')}>Highest price</button>
            <button className={`btn btn--sm ${sort === 'qtyDesc' ? '' : 'btn--ghost'}`} onClick={() => setSort('qtyDesc')}>Largest qty</button>
            <button className={`btn btn--sm ${sort === 'date' ? '' : 'btn--ghost'}`} onClick={() => setSort('date')}>Soonest needed</button>
          </div>

          <div className="mkt-listings">
            {list.map(l => (
              <div key={l.id} className="mkt-row">
                <div className="mkt-row__icon"><I.Fish size={20} /></div>
                <div>
                  <div className="mkt-row__name">{l.species}</div>
                  <div className="mkt-row__vendor">{l.vendor} · {l.id}</div>
                </div>
                <div>
                  <div className="row" style={{gap: 6}}>
                    {l.urgent && <span className="chip chip--unsafe chip--dot">Urgent</span>}
                    {l.new && <span className="chip chip--accent chip--dot">New</span>}
                  </div>
                  <div className="mkt-row__loc" style={{marginTop: 4}}>
                    <I.MapPin size={11} style={{verticalAlign: -1, marginRight: 3}} />{l.location}
                  </div>
                </div>
                <div style={{textAlign: 'center'}}>
                  <div className="mkt-row__price" style={{textAlign: 'center'}}>
                    {l.qty}<small>kg</small>
                  </div>
                  <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Wanted</div>
                </div>
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)'}}>
                    by {l.neededBy.split('-').slice(1).join('/')}
                  </div>
                  <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2}}>Deadline</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div className="mkt-row__price">₱{l.price}<small>/kg</small></div>
                  <div style={{fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Offered</div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                  <button className="btn btn--accent btn--sm" style={{justifyContent: 'center'}}>Make offer</button>
                  <button className="btn btn--ghost btn--sm" style={{justifyContent: 'center'}}><I.Message size={11} /> Message</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.MarketplacePage = MarketplacePage;
