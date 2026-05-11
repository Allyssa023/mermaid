// ─── Buyer v2 pages ───────────────────────────────────────────────────────

const B_HOME = {
  stats: { pending: 2, confirmed: 1, recent: 8, available: 24 },
  recentOrders: [
    { id: 8412, code: 'ORD-8412', vendor: 'Marina Seafoods', species: 'Mahi-mahi', qty: 6, total: 1560, status: 'CONFIRMED', date: 'Apr 23' },
    { id: 8409, code: 'ORD-8409', vendor: 'Bay City Market', species: 'Grouper',   qty: 3, total: 1680, status: 'PENDING',   date: 'Apr 23' },
    { id: 8398, code: 'ORD-8398', vendor: 'Puerto Azul',     species: 'Snapper',   qty: 4, total: 1520, status: 'COMPLETED', date: 'Apr 19' },
  ],
  fresh: [
    { id: 612, species: 'Yellowfin Tuna', vendor: 'Marina Seafoods', price: 400, tag: 'YT' },
    { id: 615, species: 'Grouper',        vendor: 'Bay City Market', price: 560, tag: 'LL' },
    { id: 622, species: 'Squid',          vendor: 'Del Mar',         price: 218, tag: 'PS' },
  ],
  activity: [
    { who: 'Marina Seafoods', what: 'posted a new Yellowfin listing',  when: '2h ago' },
    { who: 'Bay City Market', what: 'confirmed your order ORD-8409',    when: '5h ago' },
    { who: 'Puerto Azul',     what: 'requested a review',                when: '1d ago' },
    { who: 'Mermaid',         what: 'flagged a price drop on Snapper',   when: '2d ago' },
  ],
  recommended: [
    { id: 624, species: 'Blue Marlin', vendor: 'Marina Seafoods', price: 620 },
    { id: 619, species: 'Red Snapper', vendor: 'Puerto Azul',     price: 380 },
    { id: 618, species: 'Spanish Mackerel', vendor: 'J. Aquino',  price: 340 },
  ],
};

const B_CART = [
  { vendor: 'Marina Seafoods', items: [
    { id: 612, species: 'Yellowfin Tuna', price: 400, qty: 8, available: 42 },
    { id: 624, species: 'Blue Marlin',    price: 620, qty: 2, available: 12 },
  ]},
  { vendor: 'Bay City Market', items: [
    { id: 615, species: 'Grouper (Lapu-lapu)', price: 560, qty: 3, available: 12 },
  ]},
];

// ─── Buyer Home ───────────────────────────────────────────────────────────
function BuyerHomePage({ setPage }) {
  const h = B_HOME;
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Welcome back</div>
          <h1 className="page__title" style={{marginTop: 4}}>Hello, <em>{BUYER_USER.first}</em></h1>
          <p className="page__sub">{BUYER_USER.business} · {h.stats.available} fresh listings near you</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => setPage('bcart')}><I.Cart size={12} /> Cart</button>
          <button className="btn btn--primary" onClick={() => setPage('bbrowse')}><I.Store size={12} /> Browse listings</button>
        </div>
      </div>

      <div className="orders-strip orders-strip--4" style={{marginTop: 18}}>
        <div className="stat"><div className="l">Pending orders</div><div className="v">{h.stats.pending}</div><div className="s">awaiting vendor confirm</div></div>
        <div className="stat"><div className="l">Confirmed</div><div className="v">{h.stats.confirmed}</div><div className="s">prep in progress</div></div>
        <div className="stat"><div className="l">Recent orders</div><div className="v">{h.stats.recent}</div><div className="s">last 30 days</div></div>
        <div className="stat"><div className="l">Listings available</div><div className="v">{h.stats.available}</div><div className="s">within 50km</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Recent orders</div>
            <button className="btn btn--sm" onClick={() => setPage('borders')}>All orders <I.Arrow size={11} /></button>
          </div>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {h.recentOrders.map(o => {
                const st = o.status === 'CONFIRMED' ? 'confirmed' : o.status === 'PENDING' ? 'pending' : 'completed';
                return (
                  <tr key={o.id}>
                    <td><span className="kbd">{o.code}</span></td>
                    <td>{o.vendor}</td>
                    <td>{o.species}</td>
                    <td>{o.qty} kg</td>
                    <td style={{fontFamily: 'var(--font-mono)'}}>₱{o.total.toLocaleString()}</td>
                    <td><span className={`status status--${st}`}><span className="status__dot" /> {o.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Fresh listings</div>
            <button className="btn btn--sm" onClick={() => setPage('bbrowse')}>See all <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.fresh.map(f => (
              <div key={f.id} className="row" style={{gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, alignItems: 'center'}}>
                <div style={{width: 36, height: 36, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12, letterSpacing: '0.5px'}}>{f.tag}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontWeight: 500, fontSize: 13}}>{f.species}</div>
                  <div className="muted-data" style={{fontSize: 11}}>{f.vendor}</div>
                </div>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 13}}>₱{f.price}/kg</span>
                <button className="btn btn--accent btn--sm">Order now</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Recent activity</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.activity.map((a, i) => (
              <div key={i} className="row" style={{gap: 10, padding: '8px 0', borderBottom: i < h.activity.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center'}}>
                <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600}}>{a.who[0]}</div>
                <div style={{flex: 1, fontSize: 13}}><strong>{a.who}</strong> {a.what}</div>
                <span className="muted-data" style={{fontSize: 11}}>{a.when}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card__head"><div className="card__title">Recommended for you</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.recommended.map(r => (
              <div key={r.id} className="row" style={{gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, alignItems: 'center'}}>
                <div style={{flex: 1, fontSize: 13}}>
                  <div style={{fontWeight: 500}}>{r.species}</div>
                  <div className="muted-data" style={{fontSize: 11}}>{r.vendor}</div>
                </div>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 12}}>₱{r.price}/kg</span>
                <button className="btn btn--ghost btn--sm">View</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cart ─────────────────────────────────────────────────────────────────
function BuyerCartPage({ setPage }) {
  const [cart, setCart] = useState(B_CART);
  const grand = cart.reduce((a, g) => a + g.items.reduce((s, i) => s + i.price * i.qty, 0), 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Cart</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>cart</em></h1>
          <p className="page__sub">{cart.length} vendors · {cart.reduce((a, g) => a + g.items.length, 0)} items</p>
        </div>
        <button className="btn" onClick={() => setPage('bbrowse')}><I.ChevL size={12} /> Continue shopping</button>
      </div>

      {cart.length === 0 ? (
        <div className="empty" style={{marginTop: 32}}>
          <I.Cart size={36} />
          <div className="empty__title">Your cart is empty</div>
          <p>Browse the marketplace to add listings.</p>
        </div>
      ) : (
        <>
          <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18}}>
            {cart.map((g, gi) => {
              const sub = g.items.reduce((s, i) => s + i.price * i.qty, 0);
              return (
                <div key={g.vendor} className="card">
                  <div className="card__head">
                    <div>
                      <div className="eyebrow">Vendor</div>
                      <div className="card__title" style={{fontSize: 17, marginTop: 2}}>{g.vendor}</div>
                    </div>
                    <span style={{fontFamily: 'var(--font-mono)', fontSize: 14}}>₱{sub.toLocaleString()}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    {g.items.map(it => (
                      <div key={it.id} className="row" style={{gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center'}}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontWeight: 500}}>{it.species}</div>
                          <div className="muted-data" style={{fontSize: 12}}>₱{it.price}/kg · {it.available} kg available</div>
                        </div>
                        <div className="row" style={{gap: 4, alignItems: 'center'}}>
                          <button className="btn btn--ghost btn--sm" style={{padding: '4px 8px'}} onClick={() => setCart(c => c.map((x, i) => i === gi ? { ...x, items: x.items.map(y => y.id === it.id ? { ...y, qty: Math.max(1, y.qty - 1) } : y) } : x))}>−</button>
                          <input className="input" style={{width: 56, textAlign: 'center'}} value={it.qty} readOnly />
                          <button className="btn btn--ghost btn--sm" style={{padding: '4px 8px'}} onClick={() => setCart(c => c.map((x, i) => i === gi ? { ...x, items: x.items.map(y => y.id === it.id ? { ...y, qty: y.qty + 1 } : y) } : x))}>+</button>
                          <span className="muted-data" style={{fontSize: 11, marginLeft: 4}}>kg</span>
                        </div>
                        <span style={{fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right'}}>₱{(it.price * it.qty).toLocaleString()}</span>
                        <button className="btn btn--ghost btn--sm" onClick={() => setCart(c => c.map((x, i) => i === gi ? { ...x, items: x.items.filter(y => y.id !== it.id) } : x).filter(x => x.items.length))}><I.Trash size={11} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{position: 'sticky', bottom: 16, marginTop: 18, padding: '16px 22px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(20, 30, 50, 0.08)', display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{flex: 1}}>
              <div className="eyebrow">Grand total</div>
              <div style={{fontSize: 32, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{grand.toLocaleString()}</div>
            </div>
            <button className="btn btn--primary" onClick={() => setPage('bcheckout')}>Proceed to checkout <I.Arrow size={12} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Checkout ─────────────────────────────────────────────────────────────
function BuyerCheckoutPage({ setPage }) {
  const cart = B_CART;
  const grand = cart.reduce((a, g) => a + g.items.reduce((s, i) => s + i.price * i.qty, 0), 0);
  const [pay, setPay] = useState('GCASH');
  const [addr, setAddr] = useState('1');
  const [addrModal, setAddrModal] = useState(false);
  const [dispatch, setDispatch] = useState(() => Object.fromEntries(cart.map(g => [g.vendor, 'PICKUP'])));

  const PAY = [
    { id: 'CASH',  label: 'Cash on handoff', icon: 'Wallet' },
    { id: 'GCASH', label: 'GCash',           icon: 'Phone' },
    { id: 'MAYA',  label: 'Maya',            icon: 'Phone' },
    { id: 'CARD',  label: 'Card',            icon: 'Card' },
  ];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <button className="btn btn--ghost btn--sm" onClick={() => setPage('bcart')}><I.ChevL size={11} /> Back to cart</button>
          <h1 className="page__title" style={{marginTop: 10}}>Checkout</h1>
          <p className="page__sub">One submit, separate orders per vendor.</p>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18, gap: 18}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          {cart.map(g => (
            <div key={g.vendor} className="card">
              <div className="card__head">
                <div>
                  <div className="eyebrow">Vendor order</div>
                  <div className="card__title" style={{fontSize: 17}}>{g.vendor}</div>
                </div>
                <span style={{fontFamily: 'var(--font-mono)'}}>₱{g.items.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}</span>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14}}>
                {g.items.map(it => (
                  <div key={it.id} className="row" style={{gap: 8, fontSize: 13, padding: '4px 0'}}>
                    <span style={{flex: 1}}>{it.species}</span>
                    <span className="muted-data">{it.qty} kg × ₱{it.price}</span>
                    <span style={{fontFamily: 'var(--font-mono)', minWidth: 70, textAlign: 'right'}}>₱{(it.qty * it.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="eyebrow" style={{marginBottom: 6}}>Dispatch</div>
              <div className="seg" style={{marginBottom: 14}}>
                {['PICKUP', 'DELIVERY'].map(d => (
                  <button key={d} className={dispatch[g.vendor] === d ? 'on' : ''} onClick={() => setDispatch(x => ({ ...x, [g.vendor]: d }))}>
                    {d === 'PICKUP' ? <><I.MapPin size={11} /> Pickup</> : <><I.Truck size={11} /> Delivery</>}
                  </button>
                ))}
              </div>

              {dispatch[g.vendor] === 'DELIVERY' && (
                <div style={{marginBottom: 14}}>
                  <div className="eyebrow" style={{marginBottom: 6}}>Delivery address</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    {[
                      { id: '1', label: 'Casa Mendez Kitchen', addr: '12 Roxas St., Tagaytay City, Cavite' },
                      { id: '2', label: 'Sofia (home)',        addr: '88 Sampaguita Lane, Silang, Cavite' },
                    ].map(a => (
                      <label key={a.id} className="row" style={{gap: 8, padding: 10, border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', background: addr === a.id ? 'var(--accent-soft)' : 'transparent'}}>
                        <input type="radio" checked={addr === a.id} onChange={() => setAddr(a.id)} />
                        <div style={{flex: 1}}>
                          <strong>{a.label}</strong>
                          <div className="muted-data" style={{fontSize: 12, marginTop: 2}}>{a.addr}</div>
                        </div>
                      </label>
                    ))}
                    <button className="btn btn--ghost btn--sm" style={{alignSelf: 'flex-start'}} onClick={() => setAddrModal(true)}><I.Plus size={11} /> Add new address</button>
                  </div>
                </div>
              )}

              <div className="eyebrow" style={{marginBottom: 6}}>Note for vendor (optional)</div>
              <textarea className="input" rows="2" placeholder="Any preparation requests…" />
            </div>
          ))}

          <div className="card">
            <div className="card__head"><div className="card__title">Payment method</div></div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10}}>
              {PAY.map(p => {
                const Icon = I[p.icon];
                return (
                  <button key={p.id} className="card" style={{padding: 14, cursor: 'pointer', border: `1px solid ${pay === p.id ? 'var(--accent)' : 'var(--line)'}`, background: pay === p.id ? 'var(--accent-soft)' : 'var(--surface)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10}} onClick={() => setPay(p.id)}>
                    <Icon size={20} />
                    <strong>{p.label}</strong>
                    {pay === p.id && <I.Check size={14} style={{marginLeft: 'auto', color: 'var(--accent)'}} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 16, alignSelf: 'flex-start'}}>
          <div className="card">
            <div className="card__head"><div className="card__title">Summary</div></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13}}>
              {cart.map(g => (
                <div key={g.vendor} className="row" style={{justifyContent: 'space-between'}}>
                  <span>{g.vendor}</span>
                  <span style={{fontFamily: 'var(--font-mono)'}}>₱{g.items.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="row" style={{justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4}}>
                <strong>Grand total</strong>
                <strong style={{fontSize: 22, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{grand.toLocaleString()}</strong>
              </div>
            </div>
            <button className="btn btn--primary" style={{marginTop: 14, width: '100%'}}>Place orders <I.Arrow size={12} /></button>
            <div className="muted-data" style={{fontSize: 11, textAlign: 'center', marginTop: 8}}>You'll be redirected to {pay} to complete payment.</div>
          </div>
        </div>
      </div>

      {addrModal && (
        <div className="modal-overlay" onClick={() => setAddrModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__head">
              <h2 className="modal__title">Add new address</h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setAddrModal(false)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Label</label><input className="input" placeholder="Home, Restaurant…" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Street</label><input className="input" /></div>
              <div className="form-row"><label>City</label><input className="input" /></div>
              <div className="form-row"><label>Province</label><input className="input" /></div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setAddrModal(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setAddrModal(false)}>Save address</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Buyer Profile ────────────────────────────────────────────────────────
function BuyerProfilePage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>profile</em></h1>
        </div>
      </div>
      <div className="orders-strip orders-strip--4" style={{marginTop: 18}}>
        <div className="stat"><div className="l">Member since</div><div className="v" style={{fontSize: 26}}>Jan 2024</div><div className="s">1y 3mo</div></div>
        <div className="stat"><div className="l">Total orders</div><div className="v">42</div><div className="s">across 8 vendors</div></div>
        <div className="stat"><div className="l">Saved vendors</div><div className="v">6</div></div>
        <div className="stat"><div className="l">Saved listings</div><div className="v">11</div></div>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <div className="row" style={{gap: 20, alignItems: 'flex-start'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
            <div style={{width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 600}}>SM</div>
            <button className="btn btn--ghost btn--sm"><I.Camera size={11} /> Upload</button>
          </div>
          <div style={{flex: 1}}>
            <div className="form-grid">
              <div className="form-row"><label>Full name</label><input className="input" defaultValue={BUYER_USER.fullName} /></div>
              <div className="form-row"><label>Display name</label><input className="input" defaultValue="Sofia M." /></div>
              <div className="form-row"><label>Email</label><input className="input" defaultValue={BUYER_USER.email} disabled /></div>
              <div className="form-row"><label>Phone</label><input className="input" defaultValue="+63 917 555 0042" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Business name</label><input className="input" defaultValue={BUYER_USER.business} /></div>
            </div>
            <div className="row" style={{gap: 8, marginTop: 14, justifyContent: 'flex-end'}}>
              <button className="btn">Cancel</button>
              <button className="btn btn--primary">Save profile</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Listing Detail (modal-style page) ────────────────────────────────────
function BuyerListingDetailPage({ setPage }) {
  const listing = BUYER_LISTINGS[0];
  const tag = listing.species.tag;
  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}><I.ChevL size={11} /> Back to marketplace</button>
      <div className="grid grid--2-1" style={{marginTop: 18, gap: 24, alignItems: 'flex-start'}}>
        <div>
          <div style={{borderRadius: 16, height: 360, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 96, fontWeight: 600, letterSpacing: '2px', fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{tag}</div>
          <div className="row" style={{gap: 8, marginTop: 10}}>
            {['', '', '', ''].map((_, i) => (
              <div key={i} style={{width: 72, height: 72, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', fontSize: 10}}>photo</div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow">{listing.vendorName}</div>
          <h1 className="page__title" style={{marginTop: 4, fontSize: 32}}>{listing.species.commonName}</h1>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14}}>
            <span style={{fontSize: 38, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>₱{listing.pricePerKg}</span>
            <span className="muted-data">/kg</span>
          </div>
          <div className="muted-data" style={{marginTop: 8, fontFamily: 'var(--font-mono)', color: 'var(--safe)'}}>● {listing.available} kg available</div>
          <p style={{marginTop: 16, lineHeight: 1.6}}>{listing.notes}</p>

          <div className="card" style={{marginTop: 18, padding: 14}}>
            <div className="row" style={{gap: 10, alignItems: 'center'}}>
              <div style={{width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600}}>{listing.vendorName[0]}</div>
              <div style={{flex: 1}}>
                <strong>{listing.vendorName}</strong>
                <div className="muted-data" style={{fontSize: 12}}>★ {listing.vendorRating} · {listing.vendorTrades} trades · {listing.location}</div>
              </div>
              <button className="btn btn--sm" onClick={() => setPage('bvendor')}>View storefront</button>
            </div>
          </div>

          <div className="row" style={{gap: 10, marginTop: 18}}>
            <button className="btn btn--accent" style={{flex: 2}} onClick={() => setPage('bcheckout')}>Order now</button>
            <button className="btn" style={{flex: 1}}>Add to cart</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Public Vendor Storefront ─────────────────────────────────────────────
function BuyerVendorStorefrontPage({ setPage }) {
  const vendorName = 'Marina Seafoods';
  const listings = BUYER_LISTINGS.filter(l => l.vendorName === vendorName);
  const reviews = V_REVIEWS.slice(0, 3);

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}><I.ChevL size={11} /> Back to marketplace</button>
      <div className="card" style={{marginTop: 14, padding: 0, overflow: 'hidden'}}>
        <div style={{height: 140, background: 'linear-gradient(135deg, oklch(0.7 0.1 220), oklch(0.6 0.12 200))'}} />
        <div style={{padding: '0 24px 22px', marginTop: -36}}>
          <div className="row" style={{gap: 18, alignItems: 'flex-end'}}>
            <div style={{width: 88, height: 88, borderRadius: 16, background: 'var(--surface)', border: '3px solid var(--surface)', display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 600, color: 'var(--accent)'}}>M</div>
            <div style={{flex: 1, paddingBottom: 8}}>
              <h1 style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 30}}>{vendorName}</h1>
              <div className="muted-data" style={{fontSize: 13, marginTop: 4}}>
                <span style={{color: 'oklch(0.65 0.15 80)'}}>★ 4.8</span> · 184 trades · joined Jan 2022 · Pinagbayanan Depot
              </div>
            </div>
            <button className="btn"><I.Heart size={12} /> Save</button>
            <button className="btn btn--primary"><I.Message size={12} /> Message</button>
          </div>
          <p style={{margin: '14px 0 0', maxWidth: 620, lineHeight: 1.6, color: 'var(--ink-2)'}}>Family-run seafood wholesaler serving Quezon since 1998. Sashimi-grade tuna and live grouper our specialty.</p>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 24, gap: 24, alignItems: 'flex-start'}}>
        <div>
          <h2 style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 22}}>Open listings <span className="muted-data" style={{fontSize: 16}}>({listings.length})</span></h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 14}}>
            {listings.map(l => (
              <div key={l.id} className="card" style={{padding: 0, overflow: 'hidden', cursor: 'pointer'}} onClick={() => setPage('blisting')}>
                <div style={{height: 120, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 600, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{l.species.tag}</div>
                <div style={{padding: 12}}>
                  <strong style={{fontSize: 14}}>{l.species.commonName}</strong>
                  <div className="muted-data" style={{fontSize: 11, marginTop: 2}}>{l.available} kg available</div>
                  <div style={{marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)'}}>₱{l.pricePerKg}<span style={{fontSize: 11, color: 'var(--ink-3)'}}>/kg</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card__head"><div className="card__title">Pickup & hours</div></div>
            <div style={{fontSize: 13, lineHeight: 1.7}}>
              <div><I.MapPin size={12} /> Pinagbayanan Depot, Quezon</div>
              <div style={{marginTop: 10, display: 'grid', gridTemplateColumns: '40px 1fr', gap: '4px 14px'}}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                  <React.Fragment key={d}>
                    <strong>{d}</strong>
                    <span className="muted-data">{i === 6 ? 'Closed' : '06:00 – 18:00'}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{marginTop: 14}}>
            <div className="card__head"><div className="card__title">Recent reviews</div></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {reviews.map(r => (
                <div key={r.id}>
                  <div className="row" style={{gap: 8, alignItems: 'center'}}>
                    <strong style={{fontSize: 13}}>{r.buyer}</strong>
                    <span style={{color: 'oklch(0.65 0.15 80)', fontSize: 12}}>{'★'.repeat(r.rating)}</span>
                    <span className="muted-data" style={{fontSize: 11, marginLeft: 'auto'}}>{r.date}</span>
                  </div>
                  <p style={{margin: '4px 0 0', fontSize: 13, lineHeight: 1.5}}>{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.BuyerHomePage = BuyerHomePage;
window.BuyerCartPage = BuyerCartPage;
window.BuyerCheckoutPage = BuyerCheckoutPage;
window.BuyerProfilePage = BuyerProfilePage;
window.BuyerListingDetailPage = BuyerListingDetailPage;
window.BuyerVendorStorefrontPage = BuyerVendorStorefrontPage;
