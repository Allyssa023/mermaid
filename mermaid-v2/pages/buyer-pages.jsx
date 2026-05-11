// ─── Buyer → Browse Listings (main shop view) ──────────────────────────
function BuyerBrowsePage({ setPage }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = BUYER_LISTINGS.filter(l => {
    const matchesSearch = !search || l.species.commonName.toLowerCase().includes(search.toLowerCase()) || l.vendorName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'available' ? l.available > 0 :
      filter === 'urgent' ? l.urgent :
      filter === 'premium' ? l.tag === 'Premium' : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Marketplace</div>
          <h1 className="page__title" style={{marginTop: 4}}>Fresh from the <em>coast</em></h1>
          <p className="page__sub">Browse {BUYER_LISTINGS.length} active listings from verified vendors. Place an order and pick up or have it delivered.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.MapPin size={14} /> By location</button>
          <button className="btn btn--ghost">{BUYER_FAVORITES.length} saved <I.Star size={12} /></button>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="card" style={{marginTop: 18, padding: '14px 18px'}}>
        <div className="row" style={{gap: 12, alignItems: 'center'}}>
          <div className="search-input" style={{flex: 1}}>
            <I.Search size={14} />
            <input placeholder="Search species or vendor…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="seg">
            <button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>All</button>
            <button className={filter==='available'?'on':''} onClick={()=>setFilter('available')}>In stock</button>
            <button className={filter==='premium'?'on':''} onClick={()=>setFilter('premium')}>Premium</button>
            <button className={filter==='urgent'?'on':''} onClick={()=>setFilter('urgent')}>Last chance</button>
          </div>
          <button className="btn btn--ghost btn--sm">Sort: Recommended <I.ChevD size={11} /></button>
        </div>
      </div>

      {/* Listings grid */}
      <div className="buyer-grid" style={{marginTop: 18}}>
        {filtered.map(l => {
          const inStock = l.available > 0;
          const lowStock = inStock && l.available < l.quantityKg * 0.4;
          return (
            <div key={l.id} className="buyer-card" onClick={() => setSelected(l)}>
              <div className="buyer-card__hero" data-tag={l.species.tag}>
                <div className="buyer-card__species-tag">{l.species.tag}</div>
                {l.tag ? <span className={`buyer-card__chip buyer-card__chip--${l.tag.toLowerCase()}`}>{l.tag}</span> : null}
              </div>
              <div className="buyer-card__body">
                <h3 className="buyer-card__species">{l.species.commonName}</h3>
                <div className="buyer-card__vendor">
                  <span>{l.vendorName}</span>
                  <span className="muted-data">★ {l.vendorRating}</span>
                </div>
                <div className="buyer-card__location"><I.MapPin size={11} /> {l.location}</div>
                <div className="buyer-card__price">
                  <span className="big">₱{l.pricePerKg}</span>
                  <span>/kg</span>
                </div>
                <div className="buyer-card__stock">
                  {!inStock ? (
                    <span className="muted-data" style={{color:'var(--ink-4)'}}>Pre-order · landing {l.neededBy}</span>
                  ) : lowStock ? (
                    <span style={{color:'var(--warn)', fontSize: 12, fontFamily: 'var(--font-mono)'}}>● Low stock · {l.available}kg left</span>
                  ) : (
                    <span style={{color:'var(--safe)', fontSize: 12, fontFamily: 'var(--font-mono)'}}>● {l.available}kg available</span>
                  )}
                </div>
              </div>
              <div className="buyer-card__foot">
                <button className="btn btn--ghost btn--sm" onClick={(e)=>{e.stopPropagation();}}>Details</button>
                <button className="btn btn--accent btn--sm" disabled={!inStock} onClick={(e)=>{e.stopPropagation();}}>
                  {inStock ? 'Order' : 'Notify me'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail / order modal */}
      {selected ? (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">{selected.vendorName}</div>
                <h2 className="modal__title" style={{marginTop: 4}}>{selected.species.commonName}</h2>
                <div className="muted-data">★ {selected.vendorRating} · {selected.vendorTrades} trades · {selected.location}</div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}><I.X size={14} /></button>
            </div>

            <div className="detail-grid">
              <div><div className="l">Price</div><div className="v">₱{selected.pricePerKg}<small>/kg</small></div></div>
              <div><div className="l">Available</div><div className="v">{selected.available}<small>kg</small></div></div>
              <div><div className="l">Total batch</div><div className="v">{selected.quantityKg}<small>kg</small></div></div>
              <div><div className="l">Ready by</div><div className="v">{selected.neededBy}</div></div>
            </div>

            {selected.notes ? <div className="detail-notes">"{selected.notes}"</div> : null}

            <div className="form-grid" style={{marginTop: 14}}>
              <div className="form-row form-row--2col">
                <div><label>Quantity (kg)</label><input className="input" type="number" defaultValue={Math.min(selected.available || 5, 5)} /></div>
                <div><label>Pickup or delivery</label><select className="input"><option>Pickup</option><option>Delivery</option></select></div>
              </div>
              <div className="form-row"><label>Notes for vendor</label><textarea className="input" rows="2" placeholder="Optional — quality requests, packaging…" /></div>
            </div>

            <div className="modal__foot">
              <button className="btn" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn--ghost">Message vendor</button>
              <button className="btn btn--primary">Place order</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Buyer → My Orders ──────────────────────────────────────────────────
function BuyerOrdersPage({ setPage }) {
  const [tab, setTab] = useState('active');
  const filtered = BUYER_ORDERS.filter(o =>
    tab === 'active'    ? ['PENDING','CONFIRMED'].includes(o.status) :
    tab === 'completed' ? o.status === 'COMPLETED' :
                          o.status === 'CANCELLED'
  );
  const totals = {
    active: BUYER_ORDERS.filter(o => ['PENDING','CONFIRMED'].includes(o.status)).length,
    completed: BUYER_ORDERS.filter(o => o.status === 'COMPLETED').length,
    cancelled: BUYER_ORDERS.filter(o => o.status === 'CANCELLED').length,
  };
  const totalSpent = BUYER_ORDERS.filter(o => o.status === 'COMPLETED').reduce((a,o) => a+o.total, 0);
  const totalKg = BUYER_ORDERS.filter(o => o.status === 'COMPLETED').reduce((a,o) => a+o.qtyKg, 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Purchases</div>
          <h1 className="page__title" style={{marginTop: 4}}>My <em>Orders</em></h1>
          <p className="page__sub">{BUYER_ORDERS.length} total orders · ₱{totalSpent.toLocaleString()} spent on {totalKg}kg of fish.</p>
        </div>
      </div>

      <div className="orders-strip">
        <div className="stat"><div className="l">Active orders</div><div className="v">{totals.active}</div><div className="s">{BUYER_ORDERS.filter(o=>o.status==='PENDING').length} awaiting confirmation</div></div>
        <div className="stat"><div className="l">Completed</div><div className="v">{totals.completed}</div><div className="s">All time</div></div>
        <div className="stat"><div className="l">Total spent</div><div className="v">₱{(totalSpent/1000).toFixed(1)}<small>k</small></div><div className="s">Lifetime value</div></div>
        <div className="stat"><div className="l">Total received</div><div className="v">{totalKg}<small>kg</small></div><div className="s">Across {totals.completed} orders</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({totals.active})</button>
            <button className={tab==='completed'?'on':''} onClick={()=>setTab('completed')}>Completed ({totals.completed})</button>
            <button className={tab==='cancelled'?'on':''} onClick={()=>setTab('cancelled')}>Cancelled ({totals.cancelled})</button>
          </div>
        </div>

        <div className="orders-list">
          {filtered.map(o => (
            <div key={o.id} className="order-row">
              <div className="order-row__head">
                <div>
                  <div className="row" style={{gap: 8, alignItems: 'baseline'}}>
                    <span className="kbd">{o.orderCode}</span>
                    <strong>{o.species}</strong>
                    <span className="muted-data">· from {o.vendorName}</span>
                  </div>
                  <div className="muted-data" style={{marginTop: 4}}>
                    Placed {o.placedAt} · Ready {o.readyBy} · {o.dispatchMode}
                  </div>
                </div>
                <span className={`status status--${o.status.toLowerCase()}`}>
                  <span className="status__dot" /> {o.status}
                </span>
              </div>
              <div className="order-row__stats">
                <div><div className="l">Quantity</div><div className="v">{o.qtyKg}<small>kg</small></div></div>
                <div><div className="l">Price/kg</div><div className="v">₱{o.pricePerKg}</div></div>
                <div><div className="l">Total</div><div className="v">₱{o.total.toLocaleString()}</div></div>
                <div><div className="l">Listing</div><div className="v" style={{fontFamily:'var(--font-mono)', fontSize: 14}}>{o.listingCode}</div></div>
              </div>
              <div className="order-row__progress">
                <div className={`step ${o.status === 'CANCELLED' ? 'step--cancelled' : 'step--done'}`}>
                  <div className="step__dot" /><span>Placed</span>
                </div>
                <div className={`step ${['CONFIRMED','COMPLETED'].includes(o.status) ? 'step--done' : o.status === 'CANCELLED' ? 'step--cancelled' : ''}`}>
                  <div className="step__dot" /><span>Confirmed</span>
                </div>
                <div className={`step ${o.handoff?.status === 'CONFIRMED' ? 'step--done' : ''}`}>
                  <div className="step__dot" /><span>Handoff</span>
                </div>
                <div className={`step ${o.payment?.status === 'CONFIRMED' ? 'step--done' : ''}`}>
                  <div className="step__dot" /><span>Paid</span>
                </div>
              </div>
              <div className="order-row__foot">
                <span className="muted-data">
                  {o.payment ? `Paid via ${o.payment.method.replace('_',' ')}` :
                   o.cancelReason ? o.cancelReason : 'Awaiting next step'}
                </span>
                <div className="row" style={{gap: 6}}>
                  <button className="btn btn--ghost btn--sm">Message vendor</button>
                  {o.status === 'PENDING' ? <button className="btn btn--ghost btn--sm">Cancel</button> : null}
                  {o.status === 'CONFIRMED' && o.handoff ? <button className="btn btn--accent btn--sm">Confirm receipt</button> : null}
                  {o.status === 'COMPLETED' ? <button className="btn btn--ghost btn--sm">Re-order</button> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Buyer → Saved Vendors ──────────────────────────────────────────────
function BuyerSavedPage({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Network</div>
          <h1 className="page__title" style={{marginTop: 4}}>Saved <em>Vendors</em></h1>
          <p className="page__sub">{BUYER_FAVORITES.length} vendors you trust. Quick access to their listings and message threads.</p>
        </div>
      </div>

      <div className="vendor-grid" style={{marginTop: 18}}>
        {BUYER_FAVORITES.map(v => (
          <div key={v.id} className="vendor-card">
            <div className="vendor-card__head">
              <div className="vendor-card__avatar">{v.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
              <button className="btn btn--ghost btn--sm"><I.Star size={12} /></button>
            </div>
            <h3 className="vendor-card__name">{v.name}</h3>
            <div className="muted-data" style={{marginBottom: 12}}><I.MapPin size={11} /> {v.port}</div>
            <div className="vendor-card__stats">
              <div><div className="l">Rating</div><div className="v">★ {v.rating}</div></div>
              <div><div className="l">Trades</div><div className="v">{v.trades}</div></div>
              <div><div className="l">Last buy</div><div className="v" style={{fontSize: 13}}>{v.lastBought}</div></div>
            </div>
            <div className="vendor-card__foot">
              <button className="btn btn--ghost btn--sm" style={{flex: 1}}>Message</button>
              <button className="btn btn--accent btn--sm" style={{flex: 1}} onClick={() => setPage('bbrowse')}>View listings</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="card__title">Activity from saved vendors</div>
        </div>
        <ul className="activity">
          {BUYER_ACTIVITY.map((a, i) => (
            <li key={i} className="activity__item">
              <span className={`activity__dot activity__dot--${a.type}`} />
              <div className="activity__body">
                <div className="activity__line"><strong>{a.who}</strong> <span>{a.what}</span></div>
                <div className="activity__time">{a.ts}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Buyer → Messages ───────────────────────────────────────────────────
function BuyerMessagesPage({ setPage }) {
  const [activeId, setActiveId] = useState(BUYER_CONVERSATIONS[0].id);
  const active = BUYER_CONVERSATIONS.find(c => c.id === activeId);

  return (
    <div className="page page--messages">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page__title" style={{marginTop: 4}}>Messages</h1>
          <p className="page__sub">Direct conversations with the vendors you buy from.</p>
        </div>
      </div>

      <div className="msg-layout" style={{marginTop: 18}}>
        <div className="msg-list">
          <div className="msg-list__search">
            <I.Search size={13} />
            <input placeholder="Search conversations…" />
          </div>
          {BUYER_CONVERSATIONS.map(c => (
            <div key={c.id} className={`msg-list__item${activeId===c.id?' msg-list__item--on':''}`} onClick={() => setActiveId(c.id)}>
              <div className={`msg-avatar msg-avatar--${c.color}`}>{c.initial}</div>
              <div className="msg-list__body">
                <div className="msg-list__head">
                  <strong>{c.name}</strong>
                  <span className="muted-data" style={{fontSize: 11}}>{c.lastTime}</span>
                </div>
                <div className="msg-list__tag">
                  <span className="chip">{c.tag}</span>
                  {c.online ? <span style={{fontSize:10, color:'var(--safe)'}}>● online</span> : null}
                </div>
                <div className="msg-list__last">{c.last}</div>
              </div>
              {c.unread ? <span className="msg-list__unread">{c.unread}</span> : null}
            </div>
          ))}
        </div>

        <div className="msg-thread">
          <div className="msg-thread__head">
            <div className={`msg-avatar msg-avatar--${active.color}`}>{active.initial}</div>
            <div>
              <strong>{active.name}</strong>
              <div className="muted-data">{active.tag} · {active.online ? 'Online now' : 'Offline'}</div>
            </div>
          </div>
          <div className="msg-thread__body">
            <div className="msg-empty">
              <I.Message size={32} />
              <p>This is the start of your conversation with {active.name}.</p>
              <p className="muted-data">Last message: "{active.last}"</p>
            </div>
          </div>
          <div className="msg-thread__compose">
            <button className="btn btn--ghost btn--sm"><I.Paperclip size={14} /></button>
            <input placeholder="Reply to vendor…" />
            <button className="btn btn--primary btn--sm"><I.Send size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.BuyerBrowsePage = BuyerBrowsePage;
window.BuyerOrdersPage = BuyerOrdersPage;
window.BuyerSavedPage = BuyerSavedPage;
window.BuyerMessagesPage = BuyerMessagesPage;
