// sidebar.jsx — premium collapsible vendor rail

function Sidebar({ collapsed, setCollapsed, active, setActive, mode, setMode, data, tweaks }) {
  const [activeOpen, setActiveOpen] = React.useState(true);

  const groups = [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard',   icon: 'dashboard',  label: 'Dashboard' },
        { id: 'storefront',  icon: 'store',      label: 'Storefront' },
        { id: 'inventory',   icon: 'box',        label: 'Inventory',   count: 14 },
        { id: 'orders',      icon: 'clipboard',  label: 'Orders',      count: 9 },
        { id: 'procurement', icon: 'fish',       label: 'Source Catch', count: 22 },
        { id: 'messages',    icon: 'message',    label: 'Messages',    count: 4 },
      ],
    },
    {
      label: 'Insights',
      items: [
        { id: 'analytics',   icon: 'chart',      label: 'Analytics' },
        { id: 'advisory',    icon: 'wave',       label: 'Marine advisory', count: 2, accent: true },
        { id: 'reviews',     icon: 'heart',      label: 'Reviews' },
        { id: 'shop',        icon: 'settings',   label: 'Shop profile' },
      ],
    },
  ];

  return (
    <aside className="rail">
      <div className="rail__brand">
        <div className="rail__mark"><MermaidMark size={20} /></div>
        <div className="rail__wordmark">
          <span className="rail__name">MERMAID<sup>®</sup></span>
          <span className="rail__role">Vendor console</span>
        </div>
        <button className="rail__collapse" onClick={() => setCollapsed(c => !c)} aria-label="Collapse sidebar" title="Collapse">
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="rail__seg">
          <button className={mode === 'vendor' ? 'on' : ''} onClick={() => setMode('vendor')}>Vendor</button>
          <button className={mode === 'shop' ? 'on' : ''} onClick={() => setMode('shop')}>Public shop</button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.label}>
          <div className="rail__group">{g.label}</div>
          <div className="rail__list">
            {g.items.map(it => (
              <div
                key={it.id}
                className={`rail-item${active === it.id ? ' rail-item--on' : ''}`}
                onClick={() => setActive(it.id)}
                title={it.label}
              >
                <span className="ric"><Icon name={it.icon} size={17} /></span>
                <span>{it.label}</span>
                {it.count != null && <span className="rail-item__count">{it.count}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Active listings dropdown — mirrors "Active Staking" in the inspiration */}
      {!collapsed && (
        <div className={`rail-expandable ${activeOpen ? 'open' : ''}`}>
          <div className="rail-item" onClick={() => setActiveOpen(o => !o)} style={{cursor:'pointer'}}>
            <span className="ric"><Icon name="zap" size={17} /></span>
            <span>Active listings</span>
            <span className="chev"><Icon name="chevronRight" size={13} /></span>
          </div>
          {activeOpen && (
            <div className="rail-sub">
              {data.activeListings.map(l => (
                <div key={l.code} className={`rail-sub__item${l.dim ? ' is-dim' : ''}`}>
                  <div className="rail-sub__thumb" style={{ '--c': l.color }}>{l.species.icon}</div>
                  <div className="rail-sub__body">
                    <div className="rail-sub__name">Lot {l.species.local}</div>
                    <div className="rail-sub__sub">Open ₱{(l.amount).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rail__spacer" />

      {tweaks.showSuperCTA && (
        <div className="rail__cta">
          <div className="rail__cta-icon"><Icon name="zap" size={16} /></div>
          <div className="rail__cta-body">
            <div className="rail__cta-title">Activate Super Tier</div>
            <div className="rail__cta-sub">Unlock storefront ads + insights</div>
          </div>
        </div>
      )}
    </aside>
  );
}

Object.assign(window, { Sidebar });
