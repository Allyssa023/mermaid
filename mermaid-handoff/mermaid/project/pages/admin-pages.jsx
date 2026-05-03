// ─── Admin → Overview ──────────────────────────────────────────────────
function AdminOverviewPage({ setPage }) {
  const M = ADMIN_METRICS;
  const max = Math.max(...ADMIN_DAU.map(d => d.dau));

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Platform</div>
          <h1 className="page__title" style={{marginTop: 4}}>Good morning, <em>{ADMIN_USER.first}</em></h1>
          <p className="page__sub">{M.activeNow} users online now · {M.tripsToday} trips · {M.ordersToday} orders today.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Last 7 days</button>
          <button className="btn btn--primary" onClick={() => setPage('aadvisories')}>
            <I.Plus size={14} /> New advisory
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="orders-strip">
        <div className="stat"><div className="l">Total users</div><div className="v">{M.totalUsers.toLocaleString()}</div><div className="s">+{M.newThisWeek} this week</div></div>
        <div className="stat"><div className="l">Active now</div><div className="v">{M.activeNow}</div><div className="s">{Math.round(M.activeNow/M.totalUsers*100)}% of base</div></div>
        <div className="stat"><div className="l">Trips today</div><div className="v">{M.tripsToday}</div><div className="s">{M.activeTrips} live now</div></div>
        <div className="stat"><div className="l">Orders today</div><div className="v">{M.ordersToday}</div><div className="s">₱{(M.orderVolumePhp/1000000).toFixed(1)}M MTD</div></div>
        <div className="stat"><div className="l">Disputes</div><div className="v" style={{color: M.disputedOrders > 5 ? 'var(--unsafe)' : 'var(--ink)'}}>{M.disputedOrders}</div><div className="s">Need review</div></div>
        <div className="stat"><div className="l">Uptime</div><div className="v">{M.uptimePct}%</div><div className="s">Last 30 days</div></div>
      </div>

      <div className="grid grid--2-1" style={{marginTop: 18}}>
        {/* Daily active users chart */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Daily active users · 30 days</div>
              <div className="card__sub">Average {Math.round(ADMIN_DAU.reduce((a,d)=>a+d.dau,0)/ADMIN_DAU.length)} DAU</div>
            </div>
            <div className="seg seg--sm">
              <button className="on">DAU</button>
              <button>Trips</button>
              <button>Orders</button>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px'}}>
            {ADMIN_DAU.map((d, i) => {
              const h = (d.dau / max) * 100;
              return (
                <div key={i} style={{flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4}}>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: i === ADMIN_DAU.length - 1 ? 'var(--accent)' : 'var(--ink-soft)',
                    borderRadius: '3px 3px 0 0', minHeight: 4,
                  }} />
                </div>
              );
            })}
          </div>
          <div className="row" style={{justifyContent:'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)'}}>
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* User mix */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">User mix</div>
              <div className="card__sub">By role</div>
            </div>
          </div>
          <div className="role-bars">
            {[
              { name: 'Fishermen', count: M.fishermen, color: 'oklch(0.55 0.09 220)' },
              { name: 'Vendors',   count: M.vendors,   color: 'oklch(0.55 0.09 55)' },
              { name: 'Buyers',    count: M.totalUsers - M.fishermen - M.vendors - M.admins, color: 'oklch(0.55 0.07 150)' },
              { name: 'Admins',    count: M.admins,    color: 'oklch(0.50 0.10 330)' },
            ].map(r => {
              const pct = (r.count / M.totalUsers) * 100;
              return (
                <div key={r.name} className="role-bar">
                  <div className="role-bar__head">
                    <span>{r.name}</span>
                    <strong>{r.count.toLocaleString()}</strong>
                  </div>
                  <div className="role-bar__track">
                    <div className="role-bar__fill" style={{width: `${pct}%`, background: r.color}} />
                  </div>
                  <div className="role-bar__pct">{pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid--1-2" style={{marginTop: 18}}>
        {/* Health */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">System health</div>
              <div className="card__sub">{ADMIN_HEALTH.filter(h=>h.status==='OK').length}/{ADMIN_HEALTH.length} services nominal</div>
            </div>
          </div>
          <div className="health-list">
            {ADMIN_HEALTH.map(h => (
              <div key={h.name} className="health-item">
                <span className={`health-dot health-dot--${h.status.toLowerCase()}`} />
                <div className="health-item__body">
                  <div className="health-item__name">{h.name}</div>
                  <div className="health-item__detail">{h.detail}</div>
                </div>
                <span className={`chip chip--${h.status === 'OK' ? 'safe' : h.status === 'WARN' ? 'warn' : 'unsafe'}`}>{h.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit feed */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent activity</div>
              <div className="card__sub">Audit log highlights</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setPage('aaudit')}>View all <I.Arrow size={11} /></button>
          </div>
          <table className="tbl tbl--audit">
            <tbody>
              {ADMIN_AUDIT.map((a, i) => (
                <tr key={i}>
                  <td className="data" style={{color:'var(--ink-4)', width: 80}}>{a.ts}</td>
                  <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                  <td><strong>{a.actor}</strong> {a.action}</td>
                  <td style={{color:'var(--ink-3)'}}>{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Admin → Users ──────────────────────────────────────────────────────
function AdminUsersPage({ setPage }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = ADMIN_USERS.filter(u => {
    const m = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const t = tab === 'all' ? true : u.role === tab.toUpperCase();
    return m && t;
  });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Users</div>
          <h1 className="page__title" style={{marginTop: 4}}>User <em>Management</em></h1>
          <p className="page__sub">{ADMIN_USERS.length} accounts · {ADMIN_USERS.filter(u=>u.active).length} active.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Export CSV</button>
          <button className="btn btn--primary"><I.Plus size={14} /> Invite user</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='all'?'on':''} onClick={()=>setTab('all')}>All ({ADMIN_USERS.length})</button>
            <button className={tab==='fisherman'?'on':''} onClick={()=>setTab('fisherman')}>Fishermen ({ADMIN_USERS.filter(u=>u.role==='FISHERMAN').length})</button>
            <button className={tab==='vendor'?'on':''} onClick={()=>setTab('vendor')}>Vendors ({ADMIN_USERS.filter(u=>u.role==='VENDOR').length})</button>
            <button className={tab==='admin'?'on':''} onClick={()=>setTab('admin')}>Admins ({ADMIN_USERS.filter(u=>u.role==='ADMIN').length})</button>
          </div>
          <div className="search-input" style={{minWidth: 220}}>
            <I.Search size={13} />
            <input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <table className="tbl tbl--users">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Region</th><th>Activity</th><th>Joined</th><th>Last seen</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="row--link">
                <td>
                  <div className="row" style={{gap: 10}}>
                    <div className="user-avatar">{u.fullName.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
                    <div>
                      <div style={{fontWeight: 500}}>{u.fullName}</div>
                      <small style={{color:'var(--ink-4)'}}>{u.email}</small>
                    </div>
                  </div>
                </td>
                <td><span className={`role-pill role-pill--${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td style={{color:'var(--ink-3)'}}>{u.region}</td>
                <td className="data">
                  {u.trips !== undefined ? `${u.trips} trips` : u.listings !== undefined ? `${u.listings} listings` : '—'}
                </td>
                <td className="data" style={{color:'var(--ink-4)'}}>{u.joined}</td>
                <td style={{color:'var(--ink-4)'}}>{u.lastSeen}</td>
                <td>
                  <span className={`status status--${u.active ? 'active' : 'inactive'}`}>
                    <span className="status__dot" /> {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td><button className="btn btn--ghost btn--sm"><I.Dots size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Admin → Advisories ─────────────────────────────────────────────────
function AdminAdvisoriesPage({ setPage }) {
  const [tab, setTab] = useState('active');
  const filtered = ADMIN_ADVISORIES.filter(a => tab === 'active' ? a.isActive : !a.isActive);
  const sevColor = { LOW: 'var(--ink-4)', MEDIUM: 'var(--warn)', HIGH: 'var(--unsafe)', CRITICAL: 'var(--unsafe)' };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Safety</div>
          <h1 className="page__title" style={{marginTop: 4}}>Marine <em>Advisories</em></h1>
          <p className="page__sub">{ADMIN_ADVISORIES.filter(a=>a.isActive).length} active advisories broadcasting to fishermen and vendors.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary"><I.Plus size={14} /> New advisory</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            <button className={tab==='active'?'on':''} onClick={()=>setTab('active')}>Active ({ADMIN_ADVISORIES.filter(a=>a.isActive).length})</button>
            <button className={tab==='archive'?'on':''} onClick={()=>setTab('archive')}>Archive ({ADMIN_ADVISORIES.filter(a=>!a.isActive).length})</button>
          </div>
        </div>

        <div className="advisory-list">
          {filtered.map(a => (
            <div key={a.id} className={`advisory-item advisory-item--${a.severity.toLowerCase()}`}>
              <div className="advisory-item__sev" style={{color: sevColor[a.severity]}}>
                <I.Alert size={16} />
                <span>{a.severity}</span>
              </div>
              <div className="advisory-item__body">
                <div className="advisory-item__head">
                  <h3>{a.title}</h3>
                  <span className="chip">{a.affectedArea}</span>
                </div>
                <p>{a.message}</p>
                <div className="advisory-item__meta">
                  <span><I.Clock size={11} /> {new Date(a.activeFrom).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} → {new Date(a.activeTo).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                  <span>·</span>
                  <span>By {a.createdBy}</span>
                </div>
              </div>
              <div className="advisory-item__actions">
                <button className="btn btn--ghost btn--sm">Edit</button>
                {a.isActive ? <button className="btn btn--ghost btn--sm">End now</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Admin → Fish Species ───────────────────────────────────────────────
function AdminSpeciesPage({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Fish <em>Species</em></h1>
          <p className="page__sub">{ADMIN_SPECIES.filter(s=>s.active).length} active species in the catalog · used across {ADMIN_SPECIES.reduce((a,s)=>a+s.usageCount,0).toLocaleString()} catches and listings.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary"><I.Plus size={14} /> Add species</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <table className="tbl">
          <thead>
            <tr><th>Common name</th><th>Scientific name</th><th>Usage</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {ADMIN_SPECIES.map(s => {
              const max = Math.max(...ADMIN_SPECIES.map(x => x.usageCount));
              return (
                <tr key={s.id} className="row--link">
                  <td style={{fontWeight: 500}}>{s.commonName}</td>
                  <td style={{fontStyle: 'italic', color: 'var(--ink-3)'}}>{s.scientificName}</td>
                  <td>
                    <div className="row" style={{gap: 8}}>
                      <span className="data" style={{minWidth: 36}}>{s.usageCount}</span>
                      <div style={{width: 80, height: 4, background:'var(--line-soft)', borderRadius: 2, overflow: 'hidden'}}>
                        <div style={{width: `${s.usageCount/max*100}%`, height: '100%', background: 'var(--accent)'}} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status status--${s.active ? 'active' : 'inactive'}`}>
                      <span className="status__dot" /> {s.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{gap: 6}}>
                      <button className="btn btn--ghost btn--sm">Edit</button>
                      <button className="btn btn--ghost btn--sm"><I.Dots size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Admin → Market Locations ───────────────────────────────────────────
function AdminLocationsPage({ setPage }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Lookups</div>
          <h1 className="page__title" style={{marginTop: 4}}>Market <em>Locations</em></h1>
          <p className="page__sub">{ADMIN_LOCATIONS.filter(l=>l.active).length} active drop-off and depot locations across {new Set(ADMIN_LOCATIONS.map(l=>l.province)).size} provinces.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary"><I.Plus size={14} /> Add location</button>
        </div>
      </div>

      <div className="locations-grid" style={{marginTop: 18}}>
        {ADMIN_LOCATIONS.map(l => (
          <div key={l.id} className={`location-card${!l.active ? ' location-card--inactive' : ''}`}>
            <div className="location-card__head">
              <I.MapPin size={14} />
              <span>{l.municipality}, {l.province}</span>
              <button className="btn btn--ghost btn--sm" style={{marginLeft:'auto'}}><I.Dots size={12} /></button>
            </div>
            <h3 className="location-card__name">{l.name}</h3>
            <div className="location-card__stats">
              <div><div className="l">Vendors</div><div className="v">{l.vendors}</div></div>
              <div><div className="l">Listings</div><div className="v">{l.listings}</div></div>
              <div><div className="l">Status</div><div className="v" style={{fontSize: 13, color: l.active ? 'var(--safe)' : 'var(--ink-4)'}}>{l.active ? 'Active' : 'Off'}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin → Audit Log ──────────────────────────────────────────────────
function AdminAuditPage({ setPage }) {
  const [filter, setFilter] = useState('all');
  const filtered = ADMIN_AUDIT.filter(a => filter === 'all' ? true : a.kind === filter);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Compliance</div>
          <h1 className="page__title" style={{marginTop: 4}}>Audit <em>Log</em></h1>
          <p className="page__sub">All admin and system actions, ordered by recency.</p>
        </div>
        <div className="page__actions">
          <button className="btn"><I.Filter size={14} /> Export</button>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card__head">
          <div className="seg">
            {['all','user','advisory','lookup','flag','system'].map(f => (
              <button key={f} className={filter===f?'on':''} onClick={()=>setFilter(f)}>
                {f === 'all' ? 'All' : f[0].toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <table className="tbl tbl--audit">
          <thead>
            <tr><th>Time</th><th>Kind</th><th>Action</th><th>Target</th></tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td className="data" style={{color:'var(--ink-4)'}}>{a.ts}</td>
                <td><span className={`audit-tag audit-tag--${a.kind}`}>{a.kind}</span></td>
                <td><strong>{a.actor}</strong> {a.action}</td>
                <td style={{color:'var(--ink-3)'}}>{a.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.AdminOverviewPage = AdminOverviewPage;
window.AdminUsersPage = AdminUsersPage;
window.AdminAdvisoriesPage = AdminAdvisoriesPage;
window.AdminSpeciesPage = AdminSpeciesPage;
window.AdminLocationsPage = AdminLocationsPage;
window.AdminAuditPage = AdminAuditPage;
