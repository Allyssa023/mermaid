// ─── Vendor → Demand Listings ─────────────────────────────────────────────
function VendorListingsPage({ setPage }) {
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const filtered = VENDOR_LISTINGS.filter(l =>
    filter === 'all' ? true : filter === 'open' ? l.status === 'OPEN' : l.status === 'CLOSED'
  );
  const open = VENDOR_LISTINGS.filter(l => l.status === 'OPEN');
  const totalKg = open.reduce((a, l) => a + l.quantityKg, 0);
  const fulfilledKg = open.reduce((a, l) => a + l.fulfilledKg, 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Procurement</div>
          <h1 className="page__title" style={{marginTop: 4}}>Demand <em>Listings</em></h1>
          <p className="page__sub">Tell fishermen and buyers what species you need, the price you'll offer, and your timeline.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Export</button>
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            <I.Plus size={14} /> New listing
          </button>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Total listings</div><div className="v">{VENDOR_LISTINGS.length}</div><div className="s">{open.length} open · {VENDOR_LISTINGS.length - open.length} closed</div></div>
        <div className="stat"><div className="l">Open demand</div><div className="v">{totalKg}<small>kg</small></div><div className="s">Across {open.length} active</div></div>
        <div className="stat"><div className="l">Committed</div><div className="v">{fulfilledKg}<small>kg</small></div><div className="s">{Math.round(fulfilledKg/totalKg*100)}% fulfilled</div></div>
        <div className="stat"><div className="l">Total interest</div><div className="v">{open.reduce((a,l)=>a+l.interests,0)}</div><div className="s">From fishermen</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All ({VENDOR_LISTINGS.length})</button>
            <button className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>Open ({open.length})</button>
            <button className={filter === 'closed' ? 'on' : ''} onClick={() => setFilter('closed')}>Closed ({VENDOR_LISTINGS.length - open.length})</button>
          </div>
          <div className="row" style={{gap: 8}}>
            <button className="btn btn--ghost btn--sm">Sort: Newest</button>
          </div>
        </div>

        <div className="listings-grid">
          {filtered.map(l => (
            <div key={l.id} className={`listing-card${l.urgent ? ' listing-card--urgent' : ''}${l.status==='CLOSED' ? ' listing-card--closed' : ''}`}>
              <div className="listing-card__head">
                <div>
                  <span className="kbd">{l.listingCode}</span>
                  {l.urgent ? <span className="chip chip--unsafe" style={{marginLeft:6}}>Urgent</span> : null}
                  {l.status === 'CLOSED' ? <span className="chip" style={{marginLeft:6}}>Closed</span> : null}
                </div>
                <button className="btn btn--ghost btn--sm"><I.Dots size={12} /></button>
              </div>
              <h3 className="listing-card__species">{l.fishSpecies.commonName}</h3>
              <div className="listing-card__sci">{l.fishSpecies.scientificName}</div>
              <div className="listing-card__price">
                <span className="big">₱{l.offerPricePerKg}</span><span>/kg</span>
              </div>
              <div className="listing-card__meta">
                <div><div className="l">Quantity</div><div className="v">{l.quantityKg}<small>kg</small></div></div>
                <div><div className="l">Needed by</div><div className="v">{new Date(l.neededBy).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</div></div>
                <div><div className="l">Interests</div><div className="v">{l.interests}</div></div>
              </div>
              {l.status === 'OPEN' ? (
                <div className="listing-card__progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${l.fulfilledKg/l.quantityKg*100}%`}} />
                  </div>
                  <div className="progress-label">
                    <span>{l.fulfilledKg}/{l.quantityKg}kg committed</span>
                    <span>{Math.round(l.fulfilledKg/l.quantityKg*100)}%</span>
                  </div>
                </div>
              ) : null}
              {l.notes ? <div className="listing-card__notes">"{l.notes}"</div> : null}
              <div className="listing-card__foot">
                <span className="muted-data"><I.MapPin size={11} /> {l.marketLocation.municipality}</span>
                {l.status === 'OPEN' ? (
                  <div className="row" style={{gap: 6}}>
                    <button className="btn btn--ghost btn--sm">Edit</button>
                    <button className="btn btn--sm">View interests</button>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm">Re-open</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate ? (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 480}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">New demand listing</div>
                <h2 className="modal__title">What do you need?</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setShowCreate(false)}><I.X size={14} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Species</label><select className="input"><option>Yellowfin Tuna</option><option>Skipjack</option><option>Mahi-mahi</option><option>Spanish Mackerel</option></select></div>
              <div className="form-row form-row--2col">
                <div><label>Quantity (kg)</label><input className="input" type="number" placeholder="60" /></div>
                <div><label>Offer price ₱/kg</label><input className="input" type="number" placeholder="400" /></div>
              </div>
              <div className="form-row"><label>Needed by</label><input className="input" type="date" /></div>
              <div className="form-row"><label>Drop-off location</label><select className="input"><option>Marina Seafoods Depot · Quezon</option></select></div>
              <div className="form-row"><label>Notes</label><textarea className="input" rows="3" placeholder="Quality requirements, packaging, etc." /></div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setShowCreate(false)}>Post listing</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Vendor → Interests (fishermen who want to fulfill) ──────────────────
function VendorInterestsPage({ setPage }) {
  const grouped = VENDOR_LISTINGS.filter(l => l.status === 'OPEN').map(l => ({
    listing: l,
    interests: VENDOR_INTERESTS.filter(i => i.listingId === l.id),
  })).filter(g => g.interests.length > 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{marginTop: 4}}>Listing <em>Interests</em></h1>
          <p className="page__sub">{VENDOR_INTERESTS.filter(i=>i.status==='new').length} new · fishermen offering to fulfill your demand listings.</p>
        </div>
        <div className="page__actions">
          <button className="btn">Mark all read</button>
        </div>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap: 16, marginTop: 18}}>
        {grouped.map(g => (
          <div className="card" key={g.listing.id}>
            <div className="card__head">
              <div>
                <div className="row" style={{gap: 8}}>
                  <span className="kbd">{g.listing.listingCode}</span>
                  <span className="card__title">{g.listing.fishSpecies.commonName}</span>
                </div>
                <div className="card__sub">
                  Looking for {g.listing.quantityKg}kg @ ₱{g.listing.offerPricePerKg}/kg · {g.interests.length} {g.interests.length === 1 ? 'fisherman' : 'fishermen'} interested
                </div>
              </div>
              <button className="btn btn--ghost btn--sm">View listing</button>
            </div>
            <div className="interests-list">
              {g.interests.map(i => (
                <div key={i.id} className={`interest-item interest-item--${i.status}`}>
                  <div className="interest-item__avatar">
                    {i.fishermanName.split(' ').map(s=>s[0]).join('').slice(0,2)}
                  </div>
                  <div className="interest-item__body">
                    <div className="interest-item__head">
                      <strong>{i.fishermanName}</strong>
                      <span className="muted-data">{i.fishermanVessel}</span>
                      <span className="dot-sep">·</span>
                      <span className="muted-data">{i.createdAt}</span>
                      {i.status === 'new' ? <span className="chip chip--accent" style={{fontSize:10}}>New</span> : null}
                      {i.status === 'replied' ? <span className="chip" style={{fontSize:10}}>Replied</span> : null}
                    </div>
                    <p className="interest-item__msg">"{i.message}"</p>
                  </div>
                  <div className="interest-item__actions">
                    <button className="btn btn--ghost btn--sm">Message</button>
                    <button className="btn btn--accent btn--sm">Place order</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vendor → Browse Catch Alerts (live fisherman supply) ────────────────
function VendorBrowsePage({ setPage }) {
  const [sortBy, setSortBy] = useState('match');
  const [filter, setFilter] = useState('all');
  const sorted = [...VENDOR_BROWSE_ALERTS].sort((a, b) => {
    if (sortBy === 'match') return b.matchScore - a.matchScore;
    if (sortBy === 'price') return a.askingPricePerKg - b.askingPricePerKg;
    if (sortBy === 'qty') return b.quantityKg - a.quantityKg;
    return 0;
  });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Live marketplace</div>
          <h1 className="page__title" style={{marginTop: 4}}>Catch <em>Alerts</em></h1>
          <p className="page__sub">{VENDOR_BROWSE_ALERTS.length} active fishermen broadcasting fresh catches in your radius.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Filter</button>
          <button className="btn btn--primary"><I.MapPin size={14} /> Map view</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>All ({VENDOR_BROWSE_ALERTS.length})</button>
            <button className={filter==='matched'?'on':''} onClick={()=>setFilter('matched')}>Matches my listings</button>
            <button className={filter==='urgent'?'on':''} onClick={()=>setFilter('urgent')}>Urgent ({VENDOR_BROWSE_ALERTS.filter(a=>a.urgent).length})</button>
          </div>
          <div className="seg">
            <button className={sortBy==='match'?'on':''} onClick={()=>setSortBy('match')}>Match</button>
            <button className={sortBy==='price'?'on':''} onClick={()=>setSortBy('price')}>Price</button>
            <button className={sortBy==='qty'?'on':''} onClick={()=>setSortBy('qty')}>Quantity</button>
          </div>
        </div>

        <div className="alerts-grid">
          {sorted.map(a => (
            <div key={a.id} className={`alert-card${a.urgent ? ' alert-card--urgent' : ''}`}>
              <div className="alert-card__head">
                <div>
                  <div className="row" style={{gap: 6}}>
                    <span className="kbd">{a.alertCode}</span>
                    <span className="chip chip--accent" style={{fontSize: 10}}>{a.matchScore}% match</span>
                    {a.urgent ? <span className="chip chip--unsafe" style={{fontSize:10}}>Urgent</span> : null}
                  </div>
                  <h3 className="alert-card__species">{a.species.commonName}</h3>
                  <div className="alert-card__sub">{a.fisherman.fullName} · {a.fisherman.vessel}</div>
                </div>
              </div>
              <div className="alert-card__stats">
                <div><div className="l">Quantity</div><div className="v">{a.quantityKg}<small>kg</small></div></div>
                <div><div className="l">Asking</div><div className="v">₱{a.askingPricePerKg}<small>/kg</small></div></div>
                <div><div className="l">Total</div><div className="v">₱{(a.quantityKg * a.askingPricePerKg).toLocaleString()}</div></div>
              </div>
              <div className="alert-card__bar">
                <span><I.MapPin size={11} /> {a.landingSite} · {a.distance}</span>
                <span style={{color: a.urgent ? 'var(--unsafe)' : 'var(--ink-3)'}}>
                  <I.Clock size={11} /> {a.expiresIn}
                </span>
              </div>
              <div className="alert-card__foot">
                <button className="btn btn--ghost btn--sm">Message</button>
                <button className="btn btn--accent btn--sm" disabled={a.alreadyOffered}>
                  {a.alreadyOffered ? '✓ Offer sent' : 'Make offer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Vendor → Orders (purchase orders) ──────────────────────────────────
function VendorOrdersPage({ setPage }) {
  const [tab, setTab] = useState('active');
  const filtered = VENDOR_ORDERS.filter(o =>
    tab === 'active'    ? ['PENDING','CONFIRMED'].includes(o.status) :
    tab === 'completed' ? o.status === 'COMPLETED' :
    tab === 'issues'    ? ['DISPUTED','CANCELLED'].includes(o.status) : true
  );
  const totals = {
    active:    VENDOR_ORDERS.filter(o => ['PENDING','CONFIRMED'].includes(o.status)).length,
    completed: VENDOR_ORDERS.filter(o => o.status === 'COMPLETED').length,
    issues:    VENDOR_ORDERS.filter(o => ['DISPUTED','CANCELLED'].includes(o.status)).length,
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchase orders</div>
          <h1 className="page__title" style={{marginTop: 4}}>My <em>Orders</em></h1>
          <p className="page__sub">{VENDOR_ORDERS.length} orders · {totals.active} active · ₱{VENDOR_ORDERS.reduce((a,o)=>a+o.total,0).toLocaleString()} lifetime spend.</p>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({totals.active})</button>
            <button className={tab==='completed'?'on':''} onClick={()=>setTab('completed')}>Completed ({totals.completed})</button>
            <button className={tab==='issues'?'on':''} onClick={()=>setTab('issues')}>Issues ({totals.issues})</button>
          </div>
        </div>

        <table className="tbl tbl--orders">
          <thead>
            <tr><th>Order</th><th>Seller</th><th>Species</th><th>Qty</th><th>Total</th><th>Dispatch</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="row--link">
                <td>
                  <div style={{fontWeight: 500}}>{o.orderCode}</div>
                  <small style={{color:'var(--ink-4)'}}>{o.createdAt}</small>
                </td>
                <td>
                  <div style={{fontWeight: 500}}>{o.seller.fullName}</div>
                  <small style={{color:'var(--ink-4)'}}>{o.seller.vessel}</small>
                </td>
                <td>{o.species.commonName}</td>
                <td className="data">{o.orderedQtyKg}<small>kg</small></td>
                <td className="data">₱{o.total.toLocaleString()}</td>
                <td><span className="chip">{o.dispatchMode}</span></td>
                <td>
                  <span className={`status status--${o.status.toLowerCase()}`}>
                    <span className="status__dot" /> {o.status}
                  </span>
                  {o.handoff && !o.handoff.confirmedByBuyer && o.handoff.status === 'PENDING' ? (
                    <div style={{fontSize:10, color:'var(--warn)', marginTop: 2}}>Awaiting your confirm</div>
                  ) : null}
                  {o.handoff && o.handoff.status === 'DISPUTED' ? (
                    <div style={{fontSize:10, color:'var(--unsafe)', marginTop: 2}}>{o.handoff.disputeReason}</div>
                  ) : null}
                </td>
                <td><button className="btn btn--ghost btn--sm"><I.ChevR size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.VendorListingsPage = VendorListingsPage;
window.VendorInterestsPage = VendorInterestsPage;
window.VendorBrowsePage = VendorBrowsePage;
window.VendorOrdersPage = VendorOrdersPage;
