const { useState, useEffect, useRef, useMemo } = React;

// ─── Per-role navigation config ─────────────────────────────────────────
const ROLE_NAV = {
  FISHERMAN: {
    user: () => window.USER,
    items: [
      { id: 'dashboard', icon: 'Dashboard', label: 'Dashboard' },
      { id: 'planner',   icon: 'Calendar',  label: 'Trip Planner' },
      { id: 'trips',     icon: 'Anchor',    label: 'My Trips' },
      { id: 'alerts',    icon: 'Bell',      label: 'Catch Alerts', badge: 3 },
      { id: 'orders',    icon: 'Clipboard', label: 'Orders',       badge: 2 },
      { id: 'market',    icon: 'Store',     label: 'Marketplace' },
      { id: 'messages',  icon: 'Message',   label: 'Messages',     badge: 3 },
    ],
    crumbLabel: 'Fisherman',
    pageLabels: {
      dashboard: 'Dashboard', planner: 'Trip Planner', trips: 'My Trips',
      alerts: 'Catch Alerts', orders: 'Orders', market: 'Marketplace', messages: 'Messages',
    },
  },
  VENDOR: {
    user: () => window.VENDOR_USER,
    items: [
      { id: 'vdashboard', icon: 'Dashboard', label: 'Dashboard' },
      { id: 'vlistings',  icon: 'Receipt',   label: 'Demand Listings' },
      { id: 'vinterests', icon: 'Star',      label: 'Interests',      badge: 2 },
      { id: 'vbrowse',    icon: 'Fish',      label: 'Catch Alerts' },
      { id: 'vorders',    icon: 'Clipboard', label: 'Orders',         badge: 1 },
      { id: 'vmessages',  icon: 'Message',   label: 'Messages',       badge: 2 },
    ],
    crumbLabel: 'Vendor',
    pageLabels: {
      vdashboard: 'Dashboard', vlistings: 'Demand Listings', vinterests: 'Interests',
      vbrowse: 'Live Catch Alerts', vorders: 'Orders', vmessages: 'Messages',
    },
  },
  BUYER: {
    user: () => window.BUYER_USER,
    items: [
      { id: 'bbrowse',  icon: 'Store',     label: 'Browse Listings' },
      { id: 'borders',  icon: 'Clipboard', label: 'My Orders',  badge: 1 },
      { id: 'bsaved',   icon: 'Star',      label: 'Saved Vendors' },
      { id: 'bmessages',icon: 'Message',   label: 'Messages',   badge: 1 },
    ],
    crumbLabel: 'Buyer',
    pageLabels: {
      bbrowse: 'Browse Listings', borders: 'My Orders',
      bsaved: 'Saved Vendors', bmessages: 'Messages',
    },
  },
  ADMIN: {
    user: () => window.ADMIN_USER,
    items: [
      { id: 'aoverview',  icon: 'Dashboard', label: 'Overview' },
      { id: 'ausers',     icon: 'Users',     label: 'Users' },
      { id: 'aadvisories',icon: 'Alert',     label: 'Advisories', badge: 5 },
      { id: 'aspecies',   icon: 'Fish',      label: 'Fish Species' },
      { id: 'alocations', icon: 'MapPin',    label: 'Market Locations' },
      { id: 'aaudit',     icon: 'Clock',     label: 'Audit Log' },
    ],
    crumbLabel: 'Admin',
    pageLabels: {
      aoverview: 'Platform Overview', ausers: 'User Management',
      aadvisories: 'Advisories', aspecies: 'Fish Species',
      alocations: 'Market Locations', aaudit: 'Audit Log',
    },
  },
};

// ─── Rail (icon sidebar with hover-expand) ───────────────────────────────
function Rail({ role, page, setPage, onTweaks, onSwitchRole }) {
  const cfg = ROLE_NAV[role];
  const user = cfg.user();
  const initials = user.first.slice(0, 1) + (user.fullName.split(' ')[1]?.slice(0, 1) || '');

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {cfg.items.map(it => {
          const Icon = I[it.icon];
          return (
            <div
              key={it.id}
              className={`rail-item${page === it.id ? ' rail-item--on' : ''}`}
              onClick={() => setPage(it.id)}
              data-tip={it.label}
            >
              <div className="rail-item__icon"><Icon size={18} /></div>
              <div className="rail-item__text">{it.label}</div>
              {it.badge ? <span className="rail-item__badge">{it.badge}</span> : null}
            </div>
          );
        })}

        <div className="rail__label" style={{ marginTop: 14 }}>Account</div>
        <div className="rail-item" onClick={onSwitchRole} data-tip="Switch role (demo)">
          <div className="rail-item__icon"><I.Logout size={18} /></div>
          <div className="rail-item__text">Switch role</div>
        </div>
        <div className="rail-item" onClick={onTweaks} data-tip="Tweak appearance">
          <div className="rail-item__icon"><I.Settings size={18} /></div>
          <div className="rail-item__text">Settings</div>
        </div>
        <div className="rail-item" data-tip="Help & docs">
          <div className="rail-item__icon"><I.Help size={18} /></div>
          <div className="rail-item__text">Help</div>
        </div>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{user.first}</span>
            <span className="rail__user-role">{user.role} · {user.vessel || user.business || user.team || ''}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────
function Topbar({ role, page }) {
  const cfg = ROLE_NAV[role];
  const label = cfg.pageLabels[page] || page;
  const placeholders = {
    FISHERMAN: 'Search trips, catches, vendors…',
    VENDOR:    'Search listings, fishermen, alerts…',
    BUYER:     'Search vendors, species, listings…',
    ADMIN:     'Search users, advisories, species…',
  };
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <span style={{color: 'var(--ink-3)'}}>{cfg.crumbLabel}</span>
        <span>/</span>
        <strong>{label}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder={placeholders[role]} />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
    </div>
  );
}

// ─── Role Switcher modal (demo only) ─────────────────────────────────────
function RoleSwitcher({ open, current, onSelect, onClose }) {
  if (!open) return null;
  const roles = [
    { id: 'FISHERMAN', label: 'Fisherman',  desc: 'Plan trips, log catches, post alerts, sell to vendors.', icon: 'Anchor', color: 'oklch(0.55 0.09 220)' },
    { id: 'VENDOR',    label: 'Vendor',     desc: 'Post demand listings, browse catches, manage purchase orders.', icon: 'Receipt', color: 'oklch(0.55 0.09 55)' },
    { id: 'BUYER',     label: 'Buyer',      desc: 'Browse vendor listings, place orders for premium fish.', icon: 'Store', color: 'oklch(0.55 0.07 150)' },
    { id: 'ADMIN',     label: 'Administrator', desc: 'Manage users, advisories, lookups and platform health.', icon: 'Shield', color: 'oklch(0.50 0.10 330)' },
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="eyebrow">Demo prototype</div>
            <h2 className="modal__title">Choose a role</h2>
            <p className="modal__sub">This prototype includes all four Mermaid roles. Switch between them to explore each dashboard.</p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose}><I.X size={14} /></button>
        </div>
        <div className="role-grid">
          {roles.map(r => {
            const Icon = I[r.icon];
            return (
              <button key={r.id}
                      className={`role-card${current === r.id ? ' role-card--on' : ''}`}
                      onClick={() => onSelect(r.id)}>
                <div className="role-card__icon" style={{background: r.color}}>
                  <Icon size={18} />
                </div>
                <div className="role-card__body">
                  <div className="role-card__title">{r.label}</div>
                  <div className="role-card__desc">{r.desc}</div>
                </div>
                {current === r.id ? <span className="role-card__check"><I.Check size={12} /></span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tweaks panel ────────────────────────────────────────────────────────
function Tweaks({ open, state, setState, onClose }) {
  const accents = [
    { id: 'ocean', color: 'oklch(0.55 0.09 220)', label: 'Ocean' },
    { id: 'warm',  color: 'oklch(0.55 0.09 55)',  label: 'Warm' },
    { id: 'sage',  color: 'oklch(0.55 0.07 150)', label: 'Sage' },
    { id: 'plum',  color: 'oklch(0.50 0.10 330)', label: 'Plum' },
  ];
  const density = ['compact', 'balanced', 'spacious'];

  function set(key, val) {
    const next = { ...state, [key]: val };
    setState(next);
    if (window.parent) {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
    }
  }

  return (
    <div className={`tweaks${open ? ' tweaks--on' : ''}`}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
        <h5 style={{margin:0}}>Tweaks</h5>
        <button className="btn btn--ghost btn--sm" onClick={onClose}><I.X size={12} /></button>
      </div>

      <div className="tweak-row">
        <span>Accent</span>
        <div className="tweak-swatches">
          {accents.map(a => (
            <div key={a.id}
                 className={`tweak-swatch${state.accent === a.id ? ' tweak-swatch--on' : ''}`}
                 style={{ background: a.color }}
                 onClick={() => set('accent', a.id)}
                 title={a.label} />
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <span>Density</span>
        <div className="tweak-seg">
          {density.map(d => (
            <button key={d} className={state.density === d ? 'on' : ''} onClick={() => set('density', d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <span>Weather strip</span>
        <div className="tweak-seg">
          <button className={state.showWeatherStrip ? 'on' : ''} onClick={() => set('showWeatherStrip', true)}>On</button>
          <button className={!state.showWeatherStrip ? 'on' : ''} onClick={() => set('showWeatherStrip', false)}>Off</button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
        Use the sidebar's "Switch role" to change role.
      </div>
    </div>
  );
}

window.Rail = Rail;
window.Topbar = Topbar;
window.Tweaks = Tweaks;
window.RoleSwitcher = RoleSwitcher;
window.ROLE_NAV = ROLE_NAV;
