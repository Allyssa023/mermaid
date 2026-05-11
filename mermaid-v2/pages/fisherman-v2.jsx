// ─── Fisherman v2 pages: Home (sea status), Procurement, Earnings, Profile ──

// Mock new-shape data
const SEA_STATUS = {
  overall: 'manageable',  // favorable | manageable | dangerous
  riskLabel: 'Manageable',
  riskMsg: 'Conditions are workable inshore. Watch wind in the afternoon.',
  asOf: '06:32 · Apr 23',
  source: 'PAGASA · OpenWeather',
  zones: [
    { id: 'verde',  name: 'Verde Passage',    label: 'Home grounds · 8 km',  wave: 0.9, wind: 18, temp: 28, dir: 'NE', gust: 26, rain: 0,  swell: 1.2, swellPeriod: 7, cloud: 35, risk: 'safe',   advisory: '' },
    { id: 'tayabas', name: 'Tayabas Bay',     label: '22 km · SE',           wave: 1.4, wind: 22, temp: 29, dir: 'E',  gust: 31, rain: 0,  swell: 1.6, swellPeriod: 6, cloud: 55, risk: 'caution', advisory: 'Squall line possible 14:00–17:00' },
    { id: 'anilao',  name: 'Anilao Landing',  label: '36 km · W',            wave: 0.7, wind: 14, temp: 28, dir: 'N',  gust: 19, rain: 0,  swell: 0.9, swellPeriod: 8, cloud: 20, risk: 'safe',   advisory: '' },
    { id: 'lucena',  name: 'Lucena Port',     label: '14 km · E',            wave: 2.1, wind: 31, temp: 27, dir: 'ENE',gust: 44, rain: 3,  swell: 2.4, swellPeriod: 5, cloud: 75, risk: 'unsafe', advisory: 'TCWS#1 lifted — residual swell' },
  ],
  kpis: {
    safeZones: 2,
    cautionZones: 1,
    avgWave: 1.3,
    maxWind: 44,
  },
};

const FISHERMAN_PROCUREMENT_ORDERS = [
  { id: 9012, code: 'VO-9012', vendor: 'Marina Seafoods', species: 'Yellowfin Tuna', qtyKg: 18, pricePerKg: 380, total: 6840, payment: 'CASH', preorder: false, status: 'PENDING',  placedAt: 'Apr 23, 08:12', readyBy: 'Apr 23, 16:00', note: 'Export-grade, ice at sea.' },
  { id: 9008, code: 'VO-9008', vendor: 'Bay City Market', species: 'Grouper (Lapu-lapu)', qtyKg: 4, pricePerKg: 540, total: 2160, payment: 'UTANG', preorder: false, status: 'ACCEPTED', placedAt: 'Apr 23, 06:40', readyBy: 'Apr 24, 09:00', note: 'Live, 1.5kg+' },
  { id: 9001, code: 'VO-9001', vendor: 'Marina Seafoods', species: 'Skipjack',       qtyKg: 32, pricePerKg: 170, total: 5440, payment: 'CASH', preorder: true, status: 'READY',   placedAt: 'Apr 22, 14:30', readyBy: 'Apr 24, 10:00', note: '' },
  { id: 8987, code: 'VO-8987', vendor: 'J. Aquino & Sons', species: 'Spanish Mackerel', qtyKg: 14, pricePerKg: 320, total: 4480, payment: 'CASH', preorder: false, status: 'COMPLETED', placedAt: 'Apr 20, 11:00', readyBy: 'Apr 21, 09:00', note: '' },
  { id: 8975, code: 'VO-8975', vendor: 'Del Mar Cold Chain', species: 'Squid',        qtyKg: 22, pricePerKg: 210, total: 4620, payment: 'UTANG', preorder: false, status: 'DISPUTED', placedAt: 'Apr 19, 07:15', readyBy: 'Apr 19, 16:00', note: 'Buyer claims short-weight; 1.4kg gap reported.' },
  { id: 8950, code: 'VO-8950', vendor: 'Marina Seafoods', species: 'Mahi-mahi',      qtyKg: 12, pricePerKg: 250, total: 3000, payment: 'CASH', preorder: false, status: 'CANCELLED', placedAt: 'Apr 18, 17:20', readyBy: 'Apr 19, 10:00', note: 'Vendor cancelled — supply found elsewhere.' },
];

const FISHERMAN_EARNINGS = {
  range: 'Last 30 days',
  totalGross: 184320,
  cashCollected: 142500,
  outstandingUtang: 41820,
  ordersCount: 28,
  ledger: [
    { id: 9008, date: 'Apr 23', code: 'VO-9008', species: 'Grouper',  qty: 4,  gross: 2160, payment: 'UTANG' },
    { id: 9001, date: 'Apr 22', code: 'VO-9001', species: 'Skipjack', qty: 32, gross: 5440, payment: 'CASH' },
    { id: 8987, date: 'Apr 20', code: 'VO-8987', species: 'Spanish Mackerel', qty: 14, gross: 4480, payment: 'CASH' },
    { id: 8980, date: 'Apr 19', code: 'VO-8980', species: 'Yellowfin Tuna', qty: 21, gross: 7980, payment: 'CASH' },
    { id: 8975, date: 'Apr 19', code: 'VO-8975', species: 'Squid',    qty: 22, gross: 4620, payment: 'UTANG' },
    { id: 8961, date: 'Apr 17', code: 'VO-8961', species: 'Skipjack', qty: 40, gross: 6800, payment: 'CASH' },
    { id: 8954, date: 'Apr 16', code: 'VO-8954', species: 'Mahi-mahi',qty: 8,  gross: 2080, payment: 'UTANG' },
  ],
};

// ─── Sea-status risk dot
function RiskDot({ risk }) {
  return <span className={`chip chip--dot chip--${risk}`} />;
}

function FishermanHomePage({ setPage }) {
  const s = SEA_STATUS;
  const overallTone = s.overall === 'favorable' ? 'safe' : s.overall === 'dangerous' ? 'unsafe' : 'caution';
  const [zoneIdx, setZoneIdx] = useState(0);
  const zone = s.zones[zoneIdx];

  const activeTrip = {
    code: 'TR-2218', vessel: 'MV Sirena II', departedAt: '04:12', expectedReturn: '~13:00',
    landingSite: 'Verde Passage', catchSoFar: '38 kg', alerts: 1,
  };
  const advisories = [
    { id: 1, level: 'caution', text: 'Tayabas Bay: squall line 14:00–17:00. Plan return by 13:30.' },
    { id: 2, level: 'safe',    text: 'Verde Passage: tide turning at 11:40. Optimal for tuna.' },
  ];
  const pendingOrders = FISHERMAN_PROCUREMENT_ORDERS.filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED').slice(0, 3);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Sea status · {s.asOf}</div>
          <h1 className="page__title" style={{marginTop: 4}}>
            Good morning, <em>{USER.first}</em>
          </h1>
          <p className="page__sub">{USER.vessel} · {s.source}</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Refresh size={13} /> Refresh</button>
          <button className="btn btn--primary" onClick={() => setPage('planner')}><I.Anchor size={13} /> Start a trip</button>
        </div>
      </div>

      {/* Sea status hero */}
      <div className="card" style={{padding: 0, marginTop: 18, overflow: 'hidden'}}>
        <div style={{padding: '22px 28px', display: 'flex', alignItems: 'flex-start', gap: 24, borderBottom: '1px solid var(--line)'}}>
          <div style={{flex: 1}}>
            <div className="eyebrow">Overall risk</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6}}>
              <h2 style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 44, fontStyle: 'italic', color: `var(--${overallTone})`}}>{s.riskLabel}</h2>
              <RiskDot risk={overallTone} />
            </div>
            <p style={{margin: '8px 0 0', fontSize: 14, color: 'var(--ink-2)', maxWidth: 460, lineHeight: 1.55}}>{s.riskMsg}</p>
          </div>
          <div className="grid grid--kpi" style={{flex: 1.6, marginTop: 0}}>
            <div className="kpi"><div className="kpi__label">Safe zones</div><div className="kpi__value" style={{color: 'var(--safe)'}}>{s.kpis.safeZones}</div><div className="kpi__foot">of {s.zones.length}</div></div>
            <div className="kpi"><div className="kpi__label">Caution</div><div className="kpi__value" style={{color: 'var(--caution)'}}>{s.kpis.cautionZones}</div><div className="kpi__foot">advisory active</div></div>
            <div className="kpi"><div className="kpi__label">Avg wave</div><div className="kpi__value">{s.kpis.avgWave}<small>m</small></div><div className="kpi__foot">across grounds</div></div>
            <div className="kpi"><div className="kpi__label">Max wind</div><div className="kpi__value">{s.kpis.maxWind}<small>km/h</small></div><div className="kpi__foot">Lucena gusts</div></div>
          </div>
        </div>

        {/* Zone carousel */}
        <div style={{padding: '20px 28px'}}>
          <div className="row" style={{justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <div>
              <div className="eyebrow">Fishing grounds</div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4}}>
                <h3 style={{margin: 0, fontSize: 20, fontFamily: 'var(--font-display)'}}>{zone.name}</h3>
                <span className="muted-data" style={{fontSize: 12}}>{zone.label}</span>
                <RiskDot risk={zone.risk} />
              </div>
            </div>
            <div className="row" style={{gap: 4}}>
              {s.zones.map((z, i) => (
                <button key={z.id} className={`btn btn--ghost btn--sm${i === zoneIdx ? ' btn--accent' : ''}`}
                        style={{padding: '4px 10px', fontSize: 11}}
                        onClick={() => setZoneIdx(i)}>
                  {z.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid--kpi">
            <div className="kpi"><div className="kpi__label"><I.Wave size={11} /> Wave height</div><div className="kpi__value">{zone.wave}<small>m</small></div><div className="kpi__foot">{zone.swell}m swell · {zone.swellPeriod}s</div></div>
            <div className="kpi"><div className="kpi__label"><I.Wind size={11} /> Wind</div><div className="kpi__value">{zone.wind}<small>km/h</small></div><div className="kpi__foot">{zone.dir} · gust {zone.gust}</div></div>
            <div className="kpi"><div className="kpi__label"><I.Thermo size={11} /> Sea temp</div><div className="kpi__value">{zone.temp}<small>°C</small></div><div className="kpi__foot">{zone.cloud}% cloud</div></div>
            <div className="kpi"><div className="kpi__label"><I.Drop size={11} /> Rain</div><div className="kpi__value">{zone.rain}<small>mm</small></div><div className="kpi__foot">next 6h</div></div>
          </div>
          {zone.advisory && (
            <div style={{marginTop: 14, padding: '10px 14px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8, color: 'var(--caution)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8}}>
              <I.Alert size={14} /> <strong>Advisory:</strong> {zone.advisory}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid--kpi" style={{marginTop: 18, gridTemplateColumns: 'repeat(6, 1fr)'}}>
        {[
          { id: 'planner',   icon: 'Anchor',    label: 'Start trip' },
          { id: 'market',    icon: 'Store',     label: 'Marketplace' },
          { id: 'alerts',    icon: 'Bell',      label: 'Catch alerts' },
          { id: 'orders',    icon: 'Clipboard', label: 'My orders' },
          { id: 'procurement', icon: 'Receipt', label: 'Procurement' },
          { id: 'earnings',  icon: 'Trend',     label: 'Earnings' },
        ].map(qa => {
          const Icon = I[qa.icon];
          return (
            <button key={qa.id} className="card" style={{display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--surface)', textAlign: 'left'}} onClick={() => setPage(qa.id)}>
              <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center'}}>
                <Icon size={15} />
              </div>
              <div>
                <div style={{fontSize: 13, fontWeight: 500}}>{qa.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active trip + advisories + pending orders */}
      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Active trip</div>
              <div className="card__sub">{activeTrip.vessel} · departed {activeTrip.departedAt}</div>
            </div>
            <span className="status status--active"><span className="status__dot" /> At sea</span>
          </div>
          <div className="grid grid--kpi" style={{marginTop: 4}}>
            <div className="kpi"><div className="kpi__label">Code</div><div className="kpi__value" style={{fontFamily: 'var(--font-mono)', fontSize: 18}}>{activeTrip.code}</div><div className="kpi__foot">{activeTrip.landingSite}</div></div>
            <div className="kpi"><div className="kpi__label">Catch so far</div><div className="kpi__value">{activeTrip.catchSoFar}</div><div className="kpi__foot">3 species logged</div></div>
            <div className="kpi"><div className="kpi__label">Posted alerts</div><div className="kpi__value">{activeTrip.alerts}</div><div className="kpi__foot">2 interested vendors</div></div>
            <div className="kpi"><div className="kpi__label">ETA return</div><div className="kpi__value">{activeTrip.expectedReturn}</div><div className="kpi__foot">tide turning</div></div>
          </div>
          <div className="row" style={{gap: 8, marginTop: 14}}>
            <button className="btn btn--sm" onClick={() => setPage('trips')}>Open trip <I.Arrow size={11} /></button>
            <button className="btn btn--accent btn--sm" onClick={() => setPage('alerts')}><I.Plus size={11} /> Post catch alert</button>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Advisories</div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {advisories.map(a => (
              <div key={a.id} style={{display: 'flex', gap: 10, padding: '10px 12px', background: `var(--${a.level}-soft)`, border: `1px solid var(--${a.level})`, borderRadius: 8, fontSize: 13, color: `var(--${a.level})`}}>
                <I.Alert size={14} style={{flexShrink: 0, marginTop: 1}} />
                <span style={{color: 'var(--ink)'}}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending orders strip */}
      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">Pending procurement orders</div>
            <div className="card__sub">{pendingOrders.length} awaiting action</div>
          </div>
          <button className="btn btn--sm" onClick={() => setPage('procurement')}>Open procurement <I.Arrow size={11} /></button>
        </div>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Vendor</th><th>Species</th><th>Qty</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {pendingOrders.map(o => (
              <tr key={o.id}>
                <td><span className="kbd">{o.code}</span></td>
                <td>{o.vendor}</td>
                <td>{o.species}</td>
                <td>{o.qtyKg} kg</td>
                <td>₱{o.total.toLocaleString()}</td>
                <td><span className={`chip ${o.payment === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>{o.payment}</span></td>
                <td><span className={`status status--${o.status === 'PENDING' ? 'pending' : 'confirmed'}`}><span className="status__dot" /> {o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Procurement (vendor orders inbox) ────────────────────────────────────
function ProcurementPage({ setPage }) {
  const [tab, setTab] = useState('PENDING');
  const buckets = ['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED', 'DISPUTED'];
  const counts = buckets.reduce((a, b) => ({ ...a, [b]: FISHERMAN_PROCUREMENT_ORDERS.filter(o => o.status === b).length }), {});
  const orders = FISHERMAN_PROCUREMENT_ORDERS.filter(o => o.status === tab);

  const statusActions = {
    PENDING:   [{ label: 'Accept', kind: 'accent' }, { label: 'Decline', kind: 'ghost' }],
    ACCEPTED:  [{ label: 'Mark ready', kind: 'accent' }, { label: 'Message vendor', kind: 'ghost' }],
    READY:     [{ label: 'Mark completed', kind: 'accent' }, { label: 'Report dispute', kind: 'ghost' }],
    COMPLETED: [{ label: 'View receipt', kind: 'ghost' }],
    CANCELLED: [{ label: 'View reason', kind: 'ghost' }],
    DISPUTED:  [{ label: 'Open case', kind: 'accent' }],
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Vendor orders</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>procurement</em> inbox</h1>
          <p className="page__sub">Orders vendors placed against your catch. Confirm, prepare, complete.</p>
        </div>
      </div>

      <div className="seg" style={{marginTop: 14, alignSelf: 'flex-start'}}>
        {buckets.map(b => (
          <button key={b} className={tab === b ? 'on' : ''} onClick={() => setTab(b)}>
            {b[0] + b.slice(1).toLowerCase()} ({counts[b]})
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty" style={{marginTop: 32}}>
          <div className="empty__title">No {tab.toLowerCase()} orders</div>
          <p>Vendors who place orders against your catch will appear here.</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12, marginTop: 18}}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{display: 'flex', flexDirection: 'column'}}>
              <div className="card__head">
                <div>
                  <div className="row" style={{gap: 6, alignItems: 'center'}}>
                    <span className="kbd">{o.code}</span>
                    <span className={`chip ${o.payment === 'CASH' ? 'chip--safe' : 'chip--caution'}`} style={{fontSize: 10}}>{o.payment}</span>
                    {o.preorder && <span className="chip chip--accent" style={{fontSize: 10}}>Pre-order</span>}
                  </div>
                  <div className="card__title" style={{fontSize: 18, marginTop: 6}}>{o.species}</div>
                  <div className="card__sub">{o.vendor}</div>
                </div>
                <span className={`status status--${o.status === 'PENDING' ? 'pending' : o.status === 'ACCEPTED' ? 'confirmed' : o.status === 'READY' ? 'active' : o.status === 'COMPLETED' ? 'completed' : o.status === 'DISPUTED' ? 'disputed' : 'cancelled'}`}>
                  <span className="status__dot" /> {o.status}
                </span>
              </div>
              <div className="grid grid--kpi" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                <div className="kpi"><div className="kpi__label">Quantity</div><div className="kpi__value">{o.qtyKg}<small>kg</small></div></div>
                <div className="kpi"><div className="kpi__label">Price/kg</div><div className="kpi__value">₱{o.pricePerKg}</div></div>
                <div className="kpi"><div className="kpi__label">Total</div><div className="kpi__value" style={{color: 'var(--accent)'}}>₱{o.total.toLocaleString()}</div></div>
              </div>
              <div className="muted-data" style={{fontSize: 12, marginTop: 8}}>
                Ready by <strong style={{color: 'var(--ink)'}}>{o.readyBy}</strong> · placed {o.placedAt}
              </div>
              {o.note && <div style={{marginTop: 8, fontSize: 13, color: 'var(--ink-2)', borderLeft: '2px solid var(--line)', paddingLeft: 10}}>{o.note}</div>}
              <div className="row" style={{gap: 8, marginTop: 14}}>
                {statusActions[o.status].map((a, i) => (
                  <button key={i} className={`btn btn--sm btn--${a.kind}`} style={{flex: 1}}>{a.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Earnings ─────────────────────────────────────────────────────────────
function EarningsPage() {
  const e = FISHERMAN_EARNINGS;
  const [range, setRange] = useState('30');
  const ranges = [{ id: '7', label: '7d' }, { id: '30', label: '30d' }, { id: '90', label: '90d' }, { id: '365', label: '1y' }];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Money</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>earnings</em></h1>
          <p className="page__sub">Track every kilo sold and what's still on utang.</p>
        </div>
        <div className="seg" style={{alignSelf: 'flex-end'}}>
          {ranges.map(r => (
            <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid--kpi" style={{marginTop: 18}}>
        <div className="kpi"><div className="kpi__label">Total gross</div><div className="kpi__value">₱{(e.totalGross/1000).toFixed(1)}k</div><div className="kpi__foot">{e.range}</div></div>
        <div className="kpi"><div className="kpi__label">Cash collected</div><div className="kpi__value" style={{color: 'var(--safe)'}}>₱{(e.cashCollected/1000).toFixed(1)}k</div><div className="kpi__foot">{Math.round(e.cashCollected/e.totalGross*100)}% of gross</div></div>
        <div className="kpi"><div className="kpi__label">Outstanding utang</div><div className="kpi__value" style={{color: 'var(--caution)'}}>₱{(e.outstandingUtang/1000).toFixed(1)}k</div><div className="kpi__foot">across 6 vendors</div></div>
        <div className="kpi"><div className="kpi__label">Orders</div><div className="kpi__value">{e.ordersCount}</div><div className="kpi__foot">{Math.round(e.totalGross/e.ordersCount).toLocaleString()} avg</div></div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="card__title">Order ledger</div>
          <div className="row" style={{gap: 8}}>
            <button className="btn btn--sm"><I.Filter size={12} /> Payment</button>
            <button className="btn btn--sm"><I.Filter size={12} /> Species</button>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Date</th><th>Species</th><th>Qty</th><th>Gross</th><th>Payment</th><th></th></tr></thead>
          <tbody>
            {e.ledger.map(r => (
              <tr key={r.id}>
                <td><span className="kbd">{r.code}</span></td>
                <td className="muted-data">{r.date}</td>
                <td>{r.species}</td>
                <td>{r.qty} kg</td>
                <td><span className="data" style={{fontFamily: 'var(--font-mono)'}}>₱{r.gross.toLocaleString()}</span></td>
                <td><span className={`chip ${r.payment === 'CASH' ? 'chip--safe' : 'chip--caution'}`}>{r.payment}</span></td>
                <td style={{textAlign: 'right'}}><button className="btn btn--ghost btn--sm">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────
function FishermanProfilePage() {
  const [wallet, setWallet] = useState('GCash · +63 917 ●●● 4421');
  const [saved, setSaved] = useState(false);
  const noWallet = false;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>profile</em></h1>
          <p className="page__sub">Vessel info and how vendors pay you out.</p>
        </div>
        {saved && <span className="chip chip--safe" style={{alignSelf: 'flex-end'}}><I.Check size={11} /> Saved</span>}
      </div>

      {noWallet && (
        <div style={{marginTop: 14, padding: '12px 16px', background: 'var(--caution-soft)', border: '1px solid var(--caution)', borderRadius: 8, color: 'var(--caution)', display: 'flex', alignItems: 'center', gap: 10}}>
          <I.Alert size={16} />
          <div><strong>Add an e-wallet to receive payouts.</strong> Vendors can't pay you digitally without one.</div>
        </div>
      )}

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        <div className="card">
          <div className="card__head"><div className="card__title">Vessel & landing</div></div>
          <div className="form-grid">
            <div className="form-row">
              <label>Full name</label>
              <input className="input" defaultValue={USER.fullName} />
            </div>
            <div className="form-row">
              <label>Vessel name</label>
              <input className="input" defaultValue={USER.vessel || 'MV Sirena II'} />
            </div>
            <div className="form-row">
              <label>Vessel type</label>
              <input className="input" defaultValue="Banca · 30 ft" />
            </div>
            <div className="form-row">
              <label>Primary landing site</label>
              <input className="input" defaultValue="Verde Passage" />
            </div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}>
              <label>Phone (verified)</label>
              <input className="input" defaultValue="+63 917 442 1188" disabled />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head"><div className="card__title">Safety contact</div></div>
          <p className="muted-data" style={{fontSize: 12, marginTop: 0, marginBottom: 14}}>SMS sent if you don't return on schedule.</p>
          <div className="form-grid">
            <div className="form-row" style={{gridColumn: '1 / -1'}}>
              <label>Contact name</label>
              <input className="input" defaultValue="Maria Delgado" />
            </div>
            <div className="form-row" style={{gridColumn: '1 / -1'}}>
              <label>Phone</label>
              <input className="input" defaultValue="+63 918 221 4421" />
            </div>
          </div>
          <div style={{marginTop: 14, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)'}}>
            <span className="muted-data">SMS preview</span><br />
            "Hello Maria — Ramiro hasn't returned from Verde Passage as planned (ETA 13:00). Please check on him. — Mermaid"
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div>
            <div className="card__title">E-wallet for payouts</div>
            <div className="card__sub">Vendors pay you here when settling cash orders or utang.</div>
          </div>
          <button className="btn btn--sm"><I.Wallet size={12} /> Change</button>
        </div>
        <div className="row" style={{gap: 16, alignItems: 'center'}}>
          <div style={{width: 56, height: 56, borderRadius: 12, background: 'oklch(0.7 0.14 220)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 13, letterSpacing: '0.5px'}}>GCash</div>
          <div style={{flex: 1}}>
            <div style={{fontFamily: 'var(--font-mono)', fontSize: 16}}>{wallet}</div>
            <div className="muted-data" style={{fontSize: 12, marginTop: 4}}>Verified · default payout</div>
          </div>
          <span className="status status--completed"><span className="status__dot" /> ACTIVE</span>
        </div>
      </div>

      <div className="row" style={{marginTop: 18, gap: 8, justifyContent: 'flex-end'}}>
        <button className="btn">Cancel</button>
        <button className="btn btn--primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }}>Save profile</button>
      </div>
    </div>
  );
}

window.FishermanHomePage = FishermanHomePage;
window.ProcurementPage = ProcurementPage;
window.EarningsPage = EarningsPage;
window.FishermanProfilePage = FishermanProfilePage;
