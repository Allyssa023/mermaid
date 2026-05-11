// ─── Vendor v2 pages ──────────────────────────────────────────────────────

// New vendor data
const V_HOME = {
  todayRevenue: 24800,
  openOrders: 9,
  unread: 4,
  bucket: { new: 3, preparing: 4, ready: 2 },
  lowStock: [
    { lot: 'LOT-2218', species: 'Yellowfin Tuna', remaining: 4.2, threshold: 10 },
    { lot: 'LOT-2214', species: 'Grouper',        remaining: 1.8, threshold: 5 },
    { lot: 'LOT-2210', species: 'Mahi-mahi',      remaining: 8.1, threshold: 12 },
  ],
  matchedAlerts: [
    { id: 841, species: 'Yellowfin Tuna', fisher: 'Ramiro Delgado', qty: 42, when: 'Today · 4h ago', tag: 'YT' },
    { id: 833, species: 'Skipjack',       fisher: 'Tomas Reyes',    qty: 56, when: 'Today · 6h ago', tag: 'SK' },
    { id: 839, species: 'Grouper',        fisher: 'Ramiro Delgado', qty: 3.2, when: 'Today · 1h ago', tag: 'LL' },
    { id: 831, species: 'Mahi-mahi',      fisher: 'Helena Cruz',    qty: 16, when: 'Today · 8h ago', tag: 'MM' },
  ],
};

const V_LISTINGS = [
  { id: 412, title: 'Sashimi-grade Yellowfin · whole', species: 'Yellowfin Tuna', price: 540, minQty: 2, status: 'Published', lots: ['LOT-2218', 'LOT-2207'] },
  { id: 411, title: 'Live Grouper · 1.5–3 kg',         species: 'Grouper',        price: 620, minQty: 1, status: 'Published', lots: ['LOT-2214'] },
  { id: 410, title: 'Frozen Skipjack · bulk',          species: 'Skipjack',       price: 220, minQty: 5, status: 'Sold Out',  lots: [] },
  { id: 409, title: 'Mahi-mahi · whole, gilled',       species: 'Mahi-mahi',      price: 340, minQty: 2, status: 'Draft',     lots: ['LOT-2210'] },
  { id: 408, title: 'Reef Snapper · restaurant grade', species: 'Red Snapper',    price: 460, minQty: 1, status: 'Unpublished', lots: [] },
];

const V_LOTS = [
  { lot: 'LOT-2218', species: 'Yellowfin Tuna',  received: 'Apr 23, 05:40', initial: 60, remaining: 4.2,  cost: 380, low: true  },
  { lot: 'LOT-2214', species: 'Grouper',         received: 'Apr 22, 07:15', initial: 18, remaining: 1.8,  cost: 540, low: true  },
  { lot: 'LOT-2210', species: 'Mahi-mahi',       received: 'Apr 22, 06:20', initial: 30, remaining: 8.1,  cost: 250, low: true  },
  { lot: 'LOT-2207', species: 'Yellowfin Tuna',  received: 'Apr 21, 17:05', initial: 24, remaining: 16.0, cost: 395, low: false },
  { lot: 'LOT-2202', species: 'Skipjack',        received: 'Apr 21, 06:00', initial: 80, remaining: 22.0, cost: 170, low: false },
  { lot: 'LOT-2198', species: 'Squid',           received: 'Apr 20, 18:30', initial: 40, remaining: 28.5, cost: 210, low: false },
];

const V_WATCHLIST = [
  { id: 1, species: 'Yellowfin Tuna', location: 'Verde Passage', radius: 25 },
  { id: 2, species: 'Grouper',        location: 'Anilao Landing', radius: 15 },
  { id: 3, species: 'Skipjack',       location: 'Lucena Port',    radius: 30 },
];

const V_ANALYTICS = {
  totalOrders: 142,
  revenue: 487600,
  volumeKg: 1820,
  aov: 3434,
  uniqueBuyers: 38,
  bySpecies: [
    { species: 'Yellowfin Tuna', revenue: 184200 },
    { species: 'Grouper',        revenue: 112800 },
    { species: 'Mahi-mahi',      revenue: 76400 },
    { species: 'Skipjack',       revenue: 58200 },
    { species: 'Squid',          revenue: 36400 },
    { species: 'Red Snapper',    revenue: 19600 },
  ],
  procurement: [
    { species: 'Yellowfin Tuna', spend: 78400 },
    { species: 'Skipjack',       spend: 42000 },
    { species: 'Grouper',        spend: 38600 },
    { species: 'Mahi-mahi',      spend: 24500 },
    { species: 'Squid',          spend: 18900 },
  ],
  repeatBuyers: [
    { name: 'Casa Mendez Kitchen', orders: 18, total: 84200 },
    { name: 'Hotel Sorrento',      orders: 14, total: 61400 },
    { name: 'Anilao Beach Resort', orders: 11, total: 48600 },
    { name: 'Puerto Azul Resto',   orders: 9,  total: 32100 },
  ],
};

const V_REVIEWS = [
  { id: 1, buyer: 'Sofia Mendez',     rating: 5, comment: 'Sashimi-grade for real. Iced perfectly — delivered exactly on time.', reply: 'Thank you Sofia! Always a pleasure.', date: 'Apr 20' },
  { id: 2, buyer: 'Carlo Aquino',     rating: 4, comment: 'Good fish. Pickup was a bit slow, maybe 20 min wait.', reply: '', date: 'Apr 18' },
  { id: 3, buyer: 'Lisa Tan',         rating: 5, comment: 'Best mahi-mahi in the bay. Will order again.', reply: 'Salamat Lisa!', date: 'Apr 16' },
  { id: 4, buyer: 'Hotel Sorrento',   rating: 3, comment: 'Grouper smaller than expected. Quality still ok.', reply: '', date: 'Apr 14' },
];

const V_PAYOUTS = {
  pending: 38420,
  paid: 412800,
  ledger: [
    { id: 8412, code: 'ORD-8412', date: 'Apr 23', buyer: 'Casa Mendez',     species: 'Mahi-mahi', qty: 6,  gross: 1560, status: 'Pending' },
    { id: 8409, code: 'ORD-8409', date: 'Apr 23', buyer: 'Bay City',        species: 'Grouper',   qty: 3,  gross: 1680, status: 'Pending' },
    { id: 8398, code: 'ORD-8398', date: 'Apr 19', buyer: 'Puerto Azul',     species: 'Snapper',   qty: 4,  gross: 1520, status: 'Paid'    },
    { id: 8387, code: 'ORD-8387', date: 'Apr 18', buyer: 'Del Mar',         species: 'Squid',     qty: 8,  gross: 1744, status: 'Paid'    },
    { id: 8375, code: 'ORD-8375', date: 'Apr 17', buyer: 'Hotel Sorrento',  species: 'Yellowfin', qty: 12, gross: 4560, status: 'Paid'    },
  ],
};

const V_PROC_FEED = [
  { id: 841, code: 'CA-841', species: 'Yellowfin Tuna', tag: 'YT', fisher: 'Ramiro Delgado',  qty: 42, price: 380, expires: '3h 12m', match: 96 },
  { id: 839, code: 'CA-839', species: 'Grouper',        tag: 'LL', fisher: 'Ramiro Delgado',  qty: 3.2, price: 420, expires: '0h 41m', match: 88, urgent: true },
  { id: 833, code: 'CA-833', species: 'Skipjack',       tag: 'SK', fisher: 'Tomas Reyes',     qty: 56, price: 170, expires: '1h 45m', match: 92, urgent: true },
  { id: 831, code: 'CA-831', species: 'Mahi-mahi',      tag: 'MM', fisher: 'Helena Cruz',     qty: 16, price: 265, expires: '5h 20m', match: 78 },
];

// ─── Vendor Home ──────────────────────────────────────────────────────────
function VendorHomePage({ setPage }) {
  const h = V_HOME;
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor · today</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{VENDOR_USER.first}</em></h1>
          <p className="page__sub">{VENDOR_USER.business} · Pinagbayanan Depot</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Plus size={12} /> New listing</button>
          <button className="btn btn--primary" onClick={() => setPage('vprocurement')}><I.Fish size={12} /> Browse catch</button>
        </div>
      </div>

      <div className="grid grid--kpi" style={{marginTop: 18}}>
        <div className="kpi"><div className="kpi__label">Today's revenue</div><div className="kpi__value">₱{(h.todayRevenue/1000).toFixed(1)}k</div><div className="kpi__foot">vs ₱18.4k yesterday</div></div>
        <div className="kpi"><div className="kpi__label">Open orders</div><div className="kpi__value">{h.openOrders}</div><div className="kpi__foot">{h.bucket.new} new · {h.bucket.preparing} prep · {h.bucket.ready} ready</div></div>
        <div className="kpi"><div className="kpi__label">Unread</div><div className="kpi__value">{h.unread}</div><div className="kpi__foot">messages + notices</div></div>
        <div className="kpi"><div className="kpi__label">Avg rating</div><div className="kpi__value">4.7<small style={{color: 'oklch(0.65 0.15 80)'}}>★</small></div><div className="kpi__foot">94 reviews</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Open orders</div>
              <div className="card__sub">{h.openOrders} need action</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vorders')}>All orders <I.Arrow size={11} /></button>
          </div>
          <div className="row" style={{gap: 8, flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--accent)'}}>New</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.bucket.new}</div>
              <div className="muted-data" style={{fontSize: 11}}>Awaiting confirm</div>
            </div>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--caution)'}}>Preparing</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.bucket.preparing}</div>
              <div className="muted-data" style={{fontSize: 11}}>In kitchen / packing</div>
            </div>
            <div style={{flex: 1, minWidth: 140, padding: '12px 14px', background: 'var(--safe-soft)', border: '1px solid var(--safe)', borderRadius: 8}}>
              <div className="eyebrow" style={{color: 'var(--safe)'}}>Ready</div>
              <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic'}}>{h.bucket.ready}</div>
              <div className="muted-data" style={{fontSize: 11}}>For pickup/handoff</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Low stock</div>
              <div className="card__sub">{h.lowStock.length} lots near threshold</div>
            </div>
            <button className="btn btn--sm" onClick={() => setPage('vinventory')}>Inventory <I.Arrow size={11} /></button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {h.lowStock.map(l => (
              <div key={l.lot} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6}}>
                <span className="kbd">{l.lot}</span>
                <span style={{flex: 1, fontSize: 13}}>{l.species}</span>
                <span className="chip chip--caution" style={{fontSize: 10}}>{l.remaining} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">Recent matched catch alerts</div>
            <div className="card__sub">Based on your watchlist</div>
          </div>
          <button className="btn btn--sm" onClick={() => setPage('vprocurement')}>Browse all <I.Arrow size={11} /></button>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10}}>
          {h.matchedAlerts.map(a => (
            <div key={a.id} className="alert-card" style={{padding: 14}}>
              <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                <span className="kbd">CA-{a.id}</span>
                <span className="chip chip--accent" style={{fontSize: 10}}>match</span>
              </div>
              <div className="alert-card__species" style={{fontSize: 16}}>{a.species}</div>
              <div className="alert-card__sub">{a.fisher}</div>
              <div className="row" style={{marginTop: 10, justifyContent: 'space-between', alignItems: 'baseline'}}>
                <span style={{fontFamily: 'var(--font-mono)', fontSize: 14}}>{a.qty}<small> kg</small></span>
                <span className="muted-data" style={{fontSize: 11}}>{a.when}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Storefront (listings editor) ─────────────────────────────────────────
function VendorStorefrontPage() {
  const [modal, setModal] = useState(null);
  const statusChip = { Published: 'safe', 'Sold Out': 'unsafe', Draft: 'caution', Unpublished: '' };
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Storefront</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>listings</em></h1>
          <p className="page__sub">What buyers see in your shop. Pull from inventory lots.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({ id: null })}><I.Plus size={12} /> New listing</button>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <table className="tbl">
          <thead><tr><th>Title</th><th>Species</th><th>Price/kg</th><th>Min qty</th><th>Lots</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {V_LISTINGS.map(l => (
              <tr key={l.id}>
                <td><strong>{l.title}</strong></td>
                <td className="muted-data">{l.species}</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.price}</td>
                <td className="muted-data">{l.minQty} kg</td>
                <td>{l.lots.length ? l.lots.map(x => <span key={x} className="kbd" style={{marginRight: 4}}>{x}</span>) : <span className="muted-data">—</span>}</td>
                <td><span className={`chip ${statusChip[l.status] ? `chip--${statusChip[l.status]}` : ''}`}>{l.status}</span></td>
                <td style={{textAlign: 'right'}}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setModal(l)}><I.Edit size={11} /> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">{modal.id ? 'Edit listing' : 'New listing'}</div>
                <h2 className="modal__title">{modal.title || 'Untitled listing'}</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setModal(null)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Title</label><input className="input" defaultValue={modal.title || ''} /></div>
              <div className="form-row"><label>Species</label><input className="input" defaultValue={modal.species || ''} /></div>
              <div className="form-row"><label>Price per kg</label><input className="input" defaultValue={modal.price || ''} /></div>
              <div className="form-row"><label>Minimum quantity</label><input className="input" defaultValue={modal.minQty || ''} /></div>
              <div className="form-row"><label>Status</label><input className="input" defaultValue={modal.status || 'Draft'} /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Pull from lots</label>
                <div className="row" style={{gap: 6, flexWrap: 'wrap', padding: '6px 0'}}>
                  {V_LOTS.map(l => {
                    const on = (modal.lots || []).includes(l.lot);
                    return <span key={l.lot} className={`chip ${on ? 'chip--accent' : ''}`} style={{cursor: 'pointer'}}>{l.lot} <span className="muted-data" style={{marginLeft: 4}}>{l.remaining}kg</span></span>;
                  })}
                </div>
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setModal(null)}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory (lots) ─────────────────────────────────────────────────────
function VendorInventoryPage() {
  const [thr, setThr] = useState(10);
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Inventory</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>lots</em></h1>
          <p className="page__sub">Every batch received, with remaining weight and cost basis.</p>
        </div>
        <button className="btn btn--primary"><I.Plus size={12} /> Receive lot</button>
      </div>
      <div className="row" style={{gap: 12, marginTop: 14, alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="muted-data" style={{fontSize: 12}}>Low-stock threshold</span>
          <input className="input" style={{width: 80}} type="number" value={thr} onChange={e => setThr(+e.target.value)} />
          <span className="muted-data" style={{fontSize: 12}}>kg</span>
        </div>
        <button className="btn btn--sm"><I.Filter size={12} /> Species</button>
      </div>
      <div className="card" style={{marginTop: 14}}>
        <table className="tbl">
          <thead><tr><th>Lot</th><th>Species</th><th>Received</th><th>Initial</th><th>Remaining</th><th>Cost/kg</th><th></th></tr></thead>
          <tbody>
            {V_LOTS.map(l => {
              const low = l.remaining < thr;
              return (
                <tr key={l.lot}>
                  <td><span className="kbd">{l.lot}</span></td>
                  <td><strong>{l.species}</strong></td>
                  <td className="muted-data">{l.received}</td>
                  <td>{l.initial} kg</td>
                  <td>
                    <span style={{fontFamily: 'var(--font-mono)'}}>{l.remaining} kg</span>
                    {low && <span className="chip chip--caution" style={{marginLeft: 6, fontSize: 10}}>Low</span>}
                  </td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.cost}</td>
                  <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">Adjust</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Watchlist ────────────────────────────────────────────────────────────
function VendorWatchlistPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Sourcing</div>
          <h1 className="page__title" style={{marginTop: 4}}>Catch <em>watchlist</em></h1>
          <p className="page__sub">We'll notify you when a matching catch alert is posted near you.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setOpen(true)}><I.Plus size={12} /> Add subscription</button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 18}}>
        {V_WATCHLIST.map(s => (
          <div key={s.id} className="card">
            <div className="card__head">
              <div>
                <div className="card__title" style={{fontSize: 17}}>{s.species}</div>
                <div className="card__sub"><I.MapPin size={11} /> {s.location}</div>
              </div>
              <button className="btn btn--ghost btn--sm"><I.Trash size={11} /></button>
            </div>
            <div className="muted-data" style={{fontSize: 12, marginTop: -6}}>Radius: <strong style={{color: 'var(--ink)'}}>{s.radius} km</strong></div>
            <div className="row" style={{gap: 8, marginTop: 14}}>
              <button className="btn btn--ghost btn--sm" style={{flex: 1}}>Edit</button>
              <button className="btn btn--accent btn--sm" style={{flex: 1}}>View matches</button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 460}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Watchlist</div>
                <h2 className="modal__title">Add subscription</h2>
                <p className="modal__sub">Get notified when matching catch is posted.</p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Species</label><input className="input" placeholder="Yellowfin Tuna" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Market location</label><input className="input" placeholder="Verde Passage" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Radius (km)</label><input className="input" placeholder="25" /></div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => setOpen(false)}>Subscribe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shop Profile ─────────────────────────────────────────────────────────
function VendorShopProfilePage() {
  const DAYS = [{ k: 'mon', label: 'Mon' }, { k: 'tue', label: 'Tue' }, { k: 'wed', label: 'Wed' }, { k: 'thu', label: 'Thu' }, { k: 'fri', label: 'Fri' }, { k: 'sat', label: 'Sat' }, { k: 'sun', label: 'Sun' }];
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Shop</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>public shop</em></h1>
          <p className="page__sub">This is what buyers see at <span style={{fontFamily: 'var(--font-mono)', color: 'var(--accent)'}}>mermaid.ph/shop/marina-seafoods</span></p>
        </div>
        <div className="row" style={{gap: 8}}>
          <button className="btn"><I.Eye size={12} /> Preview</button>
          <button className="btn btn--primary"><I.Check size={12} /> Save changes</button>
        </div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Basic info</div></div>
          <div className="form-grid">
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Display name</label><input className="input" defaultValue="Marina Seafoods" /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Public slug</label><input className="input" defaultValue="marina-seafoods" /></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Bio</label><textarea className="input" rows="3" defaultValue="Family-run seafood wholesaler serving Quezon since 1998. Sashimi-grade tuna and live grouper our specialty."></textarea></div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Pickup location</label><input className="input" defaultValue="Pinagbayanan Depot, Quezon" /></div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <div className="card">
            <div className="card__head"><div className="card__title">Media</div></div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Logo URL</label><input className="input" defaultValue="https://cdn.mermaid.ph/v/210/logo.jpg" /></div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}><label>Banner URL</label><input className="input" defaultValue="https://cdn.mermaid.ph/v/210/banner.jpg" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card__head"><div className="card__title">Business hours</div></div>
            <div style={{display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'center', fontSize: 12}}>
              {DAYS.map(d => (
                <React.Fragment key={d.k}>
                  <strong>{d.label}</strong>
                  <input className="input" defaultValue="06:00" />
                  <input className="input" defaultValue="18:00" />
                  <label style={{display: 'flex', alignItems: 'center', gap: 4}}><input type="checkbox" /> closed</label>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────
function BarRow({ label, value, max, color = 'var(--accent)' }) {
  const pct = Math.round(value / max * 100);
  return (
    <div style={{display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: 12, alignItems: 'center', fontSize: 13}}>
      <span>{label}</span>
      <div style={{height: 22, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${pct}%`, background: color, borderRadius: 4}} />
      </div>
      <span style={{fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right'}}>₱{value.toLocaleString()}</span>
    </div>
  );
}

function VendorAnalyticsPage() {
  const a = V_ANALYTICS;
  const revMax = Math.max(...a.bySpecies.map(s => s.revenue));
  const procMax = Math.max(...a.procurement.map(s => s.spend));
  const [range, setRange] = useState('30');
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Analytics</div>
          <h1 className="page__title" style={{marginTop: 4}}>How your shop is <em>performing</em></h1>
          <p className="page__sub">Revenue, volume, and repeat-buyer signal.</p>
        </div>
        <div className="seg" style={{alignSelf: 'flex-end'}}>
          {['7', '30', '90', '365'].map(r => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === '365' ? '1y' : r + 'd'}</button>)}
        </div>
      </div>

      <div className="orders-strip orders-strip--4" style={{marginTop: 18, gridTemplateColumns: 'repeat(5, 1fr)'}}>
        <div className="stat"><div className="l">Total orders</div><div className="v">{a.totalOrders}</div><div className="s">across {a.uniqueBuyers} buyers</div></div>
        <div className="stat"><div className="l">Revenue</div><div className="v">₱{(a.revenue/1000).toFixed(0)}k</div><div className="s">last 30d</div></div>
        <div className="stat"><div className="l">Volume</div><div className="v">{a.volumeKg}<small>kg</small></div><div className="s">sold</div></div>
        <div className="stat"><div className="l">AOV</div><div className="v">₱{a.aov.toLocaleString()}</div><div className="s">avg order value</div></div>
        <div className="stat"><div className="l">Unique buyers</div><div className="v">{a.uniqueBuyers}</div><div className="s">62% repeat</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Revenue by species</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {a.bySpecies.map(s => <BarRow key={s.species} label={s.species} value={s.revenue} max={revMax} />)}
          </div>
        </div>
        <div className="card">
          <div className="card__head"><div className="card__title">Procurement spend</div></div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {a.procurement.map(s => <BarRow key={s.species} label={s.species} value={s.spend} max={procMax} color="oklch(0.65 0.12 220)" />)}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head"><div className="card__title">Repeat buyers</div><div className="card__sub">Top customers by order count</div></div>
        <table className="tbl">
          <thead><tr><th>Buyer</th><th>Orders</th><th>Total spent</th><th></th></tr></thead>
          <tbody>
            {a.repeatBuyers.map(b => (
              <tr key={b.name}>
                <td><strong>{b.name}</strong></td>
                <td>{b.orders}</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{b.total.toLocaleString()}</td>
                <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">View orders</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────
function VendorReviewsPage() {
  const [replyOpen, setReplyOpen] = useState(null);
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Reputation</div>
          <h1 className="page__title" style={{marginTop: 4}}>Customer <em>reviews</em></h1>
          <p className="page__sub">4.7 average across 94 reviews. Reply to build trust.</p>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18}}>
        {V_REVIEWS.map(r => (
          <div key={r.id} className="card">
            <div className="row" style={{alignItems: 'flex-start', gap: 12}}>
              <div style={{width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 600}}>{r.buyer[0]}</div>
              <div style={{flex: 1}}>
                <div className="row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong>{r.buyer}</strong>
                  <span className="muted-data" style={{fontSize: 12}}>{r.date}</span>
                </div>
                <div style={{color: 'oklch(0.65 0.15 80)', fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 2}}>
                  {'★'.repeat(r.rating)}<span style={{opacity: 0.3}}>{'★'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{margin: '8px 0 0', fontSize: 14, lineHeight: 1.55}}>{r.comment}</p>
                {r.reply ? (
                  <div style={{marginTop: 10, padding: '10px 12px', background: 'var(--safe-soft)', borderLeft: '3px solid var(--safe)', borderRadius: 4, fontSize: 13}}>
                    <div className="eyebrow" style={{color: 'var(--safe)', marginBottom: 4}}>Your reply</div>
                    {r.reply}
                    <button className="btn btn--ghost btn--sm" style={{marginTop: 6, padding: '2px 8px', fontSize: 11}} onClick={() => setReplyOpen(r.id)}>Edit</button>
                  </div>
                ) : replyOpen === r.id ? (
                  <div style={{marginTop: 10}}>
                    <textarea className="input" rows="2" placeholder="Thank you for your feedback…" />
                    <div className="row" style={{gap: 8, marginTop: 6, justifyContent: 'flex-end'}}>
                      <button className="btn btn--ghost btn--sm" onClick={() => setReplyOpen(null)}>Cancel</button>
                      <button className="btn btn--accent btn--sm" onClick={() => setReplyOpen(null)}>Post reply</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn--ghost btn--sm" style={{marginTop: 8}} onClick={() => setReplyOpen(r.id)}>Reply</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payouts ──────────────────────────────────────────────────────────────
function VendorPayoutsPage() {
  const p = V_PAYOUTS;
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Money</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>payouts</em></h1>
          <p className="page__sub">What's owed to you and what's already been settled.</p>
        </div>
      </div>
      <div className="grid grid--kpi" style={{marginTop: 18, gridTemplateColumns: '1fr 1fr'}}>
        <div className="kpi" style={{padding: 22}}>
          <div className="kpi__label">Pending payout</div>
          <div className="kpi__value" style={{color: 'var(--caution)', fontSize: 38}}>₱{p.pending.toLocaleString()}</div>
          <div className="kpi__foot">2 orders awaiting handoff</div>
        </div>
        <div className="kpi" style={{padding: 22}}>
          <div className="kpi__label">Total paid out</div>
          <div className="kpi__value" style={{color: 'var(--safe)', fontSize: 38}}>₱{p.paid.toLocaleString()}</div>
          <div className="kpi__foot">lifetime · 142 orders</div>
        </div>
      </div>
      <div className="card" style={{marginTop: 18}}>
        <div className="card__head"><div className="card__title">Settlement ledger</div></div>
        <table className="tbl">
          <thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Species</th><th>Qty</th><th>Gross</th><th>Status</th></tr></thead>
          <tbody>
            {p.ledger.map(r => (
              <tr key={r.id}>
                <td><span className="kbd">{r.code}</span></td>
                <td className="muted-data">{r.date}</td>
                <td>{r.buyer}</td>
                <td>{r.species}</td>
                <td>{r.qty} kg</td>
                <td style={{fontFamily: 'var(--font-mono)'}}>₱{r.gross.toLocaleString()}</td>
                <td><span className={`chip ${r.status === 'Paid' ? 'chip--safe' : 'chip--caution'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Procurement (browse / cart / orders sub-tabs) ────────────────────────
function VendorProcurementPage() {
  const [tab, setTab] = useState('feed');
  const [cart, setCart] = useState([{ id: 841, qty: 20 }, { id: 833, qty: 30 }]);
  const addToCart = id => setCart(c => c.find(x => x.id === id) ? c : [...c, { id, qty: 10 }]);
  const tabs = [{ id: 'feed', label: 'Live feed' }, { id: 'cart', label: `Cart (${cart.length})` }, { id: 'orders', label: 'My procurement orders' }];

  const orders = [
    { id: 7012, code: 'PO-7012', species: 'Yellowfin Tuna', fisher: 'Ramiro Delgado', qty: 20, total: 7600, status: 'CONFIRMED', date: 'Apr 23' },
    { id: 7008, code: 'PO-7008', species: 'Skipjack',       fisher: 'Tomas Reyes',    qty: 30, total: 5100, status: 'AT_SEA',    date: 'Apr 23' },
    { id: 6998, code: 'PO-6998', species: 'Grouper',        fisher: 'Helena Cruz',    qty: 4,  total: 2160, status: 'COMPLETED', date: 'Apr 21' },
  ];
  const statusMap = { CONFIRMED: 'confirmed', AT_SEA: 'active', COMPLETED: 'completed' };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Procurement</div>
          <h1 className="page__title" style={{marginTop: 4}}>Source <em>fresh catch</em></h1>
          <p className="page__sub">Live alerts from fishermen, your watchlist matched first.</p>
        </div>
      </div>
      <div className="seg" style={{marginTop: 14, alignSelf: 'flex-start'}}>
        {tabs.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === 'feed' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginTop: 18}}>
          {V_PROC_FEED.map(a => {
            const inCart = cart.find(x => x.id === a.id);
            return (
              <div key={a.id} className={`alert-card${a.urgent ? ' alert-card--urgent' : ''}`}>
                <div className="row" style={{gap: 6, alignItems: 'center', marginBottom: 6}}>
                  <span className="kbd">{a.code}</span>
                  <span className="chip chip--accent" style={{fontSize: 10}}>{a.match}% match</span>
                  {a.urgent && <span className="chip chip--unsafe" style={{fontSize: 10}}>urgent</span>}
                </div>
                <div className="alert-card__species" style={{fontSize: 18}}>{a.species}</div>
                <div className="alert-card__sub">{a.fisher}</div>
                <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8}}>
                  <div className="kpi"><div className="kpi__label">Qty</div><div className="kpi__value">{a.qty}<small>kg</small></div></div>
                  <div className="kpi"><div className="kpi__label">Price</div><div className="kpi__value">₱{a.price}</div></div>
                  <div className="kpi"><div className="kpi__label">Expires</div><div className="kpi__value" style={{fontSize: 16}}>{a.expires}</div></div>
                </div>
                <div className="row" style={{gap: 6, marginTop: 12}}>
                  <button className="btn btn--ghost btn--sm" style={{flex: 1}}>View detail</button>
                  <button className={`btn btn--sm ${inCart ? '' : 'btn--accent'}`} style={{flex: 1}} onClick={() => addToCart(a.id)} disabled={!!inCart}>
                    {inCart ? <><I.Check size={11} /> In cart</> : <><I.Plus size={11} /> Add to cart</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'cart' && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head"><div className="card__title">Your cart</div><div className="card__sub">{cart.length} items pending order</div></div>
          {cart.length === 0 ? (
            <div className="empty"><div className="empty__title">Cart is empty</div><p>Add alerts from the live feed.</p></div>
          ) : (
            <>
              <table className="tbl">
                <thead><tr><th>Code</th><th>Species</th><th>Fisher</th><th>Qty (kg)</th><th>Price/kg</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {cart.map(c => {
                    const a = V_PROC_FEED.find(x => x.id === c.id);
                    if (!a) return null;
                    return (
                      <tr key={c.id}>
                        <td><span className="kbd">{a.code}</span></td>
                        <td>{a.species}</td>
                        <td className="muted-data">{a.fisher}</td>
                        <td><input className="input" style={{width: 80}} defaultValue={c.qty} /></td>
                        <td style={{fontFamily: 'var(--font-mono)'}}>₱{a.price}</td>
                        <td style={{fontFamily: 'var(--font-mono)'}}>₱{(a.price * c.qty).toLocaleString()}</td>
                        <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm" onClick={() => setCart(x => x.filter(y => y.id !== c.id))}><I.Trash size={11} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="row" style={{justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 14, padding: '14px 0 0', borderTop: '1px solid var(--line)'}}>
                <div>
                  <div className="eyebrow">Grand total</div>
                  <div style={{fontSize: 28, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)'}}>
                    ₱{cart.reduce((a, c) => a + (V_PROC_FEED.find(x => x.id === c.id)?.price || 0) * c.qty, 0).toLocaleString()}
                  </div>
                </div>
                <button className="btn btn--primary">Place procurement orders <I.Arrow size={12} /></button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="card" style={{marginTop: 18}}>
          <div className="card__head"><div className="card__title">Procurement orders</div></div>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Date</th><th>Species</th><th>Fisher</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><span className="kbd">{o.code}</span></td>
                  <td className="muted-data">{o.date}</td>
                  <td>{o.species}</td>
                  <td>{o.fisher}</td>
                  <td>{o.qty} kg</td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>₱{o.total.toLocaleString()}</td>
                  <td><span className={`status status--${statusMap[o.status]}`}><span className="status__dot" /> {o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

window.VendorHomePage = VendorHomePage;
window.VendorStorefrontPage = VendorStorefrontPage;
window.VendorInventoryPage = VendorInventoryPage;
window.VendorWatchlistPage = VendorWatchlistPage;
window.VendorShopProfilePage = VendorShopProfilePage;
window.VendorAnalyticsPage = VendorAnalyticsPage;
window.VendorReviewsPage = VendorReviewsPage;
window.VendorPayoutsPage = VendorPayoutsPage;
window.VendorProcurementPage = VendorProcurementPage;
