const { useState, useEffect, useRef, useMemo } = React;

// ─── Rail (icon sidebar with hover-expand) ───────────────────────────────
function Rail({ page, setPage, onTweaks }) {
  const items = [
    { id: 'dashboard',  icon: 'Dashboard', label: 'Dashboard' },
    { id: 'planner',    icon: 'Calendar',  label: 'Trip Planner' },
    { id: 'trips',      icon: 'Anchor',    label: 'My Trips' },
    { id: 'alerts',     icon: 'Bell',      label: 'Catch Alerts', badge: 3 },
    { id: 'orders',     icon: 'Clipboard', label: 'Orders',       badge: 2 },
    { id: 'market',     icon: 'Store',     label: 'Marketplace' },
    { id: 'messages',   icon: 'Message',   label: 'Messages',     badge: 3 },
  ];

  return (
    <aside className="rail">
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
      </div>
      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {items.map(it => {
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
          <div className="rail__avatar">{USER.first.slice(0,1)}{USER.name.split(' ')[1].slice(0,1)}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{USER.first}</span>
            <span className="rail__user-role">{USER.role} · {USER.vessel}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topbar ────────────────────────────────────────────────────────────
function Topbar({ page }) {
  const labels = {
    dashboard: 'Dashboard',
    planner:   'Trip Planner',
    trips:     'My Trips',
    alerts:    'Catch Alerts',
    orders:    'Orders',
    market:    'Marketplace',
    messages:  'Messages',
  };
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span>/</span>
        <strong>{labels[page]}</strong>
      </div>
      <div className="topbar__spacer" />
      <div className="topbar__search">
        <I.Search size={14} />
        <input placeholder="Search trips, catches, vendors…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="topbar__icon-btn" title="Notifications">
        <I.Bell size={16} /><span className="dot" />
      </button>
      <button className="topbar__icon-btn" title="Help"><I.Help size={16} /></button>
    </div>
  );
}

// ─── Tweaks panel ──────────────────────────────────────────────────────
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
        Click the Tweaks toolbar toggle to show/hide this panel.
      </div>
    </div>
  );
}

window.Rail = Rail;
window.Topbar = Topbar;
window.Tweaks = Tweaks;
