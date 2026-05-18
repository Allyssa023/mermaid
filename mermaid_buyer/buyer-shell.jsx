// MERMAID Buyer Dashboard — Shell + page components
// Globals: React, I, BUYER_DATA, BUYER_SPARK, Sparkline, Waveform, MiniBars
// Reuses styles.css

const { useState: useStateB, useEffect: useEffectB } = React;

// ── Cart icon (special, not in icons.jsx) ──
const ICart = (p) => (
  <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IHeart = (p) => (
  <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IUser = (p) => (
  <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const BUYER_NAV = [
  {
    label: "Workspace",
    items: [
      { key: "home",      icon: "Dashboard", label: "Dashboard" },
      { key: "browse",    icon: "Store",     label: "Marketplace", badge: "FRESH" },
      { key: "cart",      icon: ICart,       label: "Cart",        badge: "3" },
      { key: "orders",    icon: "Inbox",     label: "My orders",   badge: "2" },
      { key: "saved",     icon: IHeart,      label: "Saved" },
    ],
  },
  {
    label: "Insight",
    items: [
      { key: "advisory",  icon: "Waves",    label: "Marine advisory" },
      { key: "messages",  icon: "Message",  label: "Messages",   badge: "5" },
    ],
  },
  {
    label: "Account",
    items: [
      { key: "profile",   icon: IUser,      label: "Profile" },
      { key: "logout",    icon: "Logout",   label: "Sign out" },
    ],
  },
];

function BuyerSidebar({ active, onNavigate, collapsed, onToggle }) {
  return (
    <aside className="rail">
      <div className="rail__brand">
        <div className="rail__mark">
          <I.Anchor size={18} />
        </div>
        <div className="rail__brand-text">
          <div className="rail__brand-name">MERMAID</div>
          <div className="rail__brand-sub">Buyer workspace</div>
        </div>
        <button className="rail__collapse" onClick={onToggle} title="Collapse sidebar">
          <I.ChevronLeft size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="role-tabs" role="tablist">
          <button className="role-tabs__btn role-tabs__btn--on"><I.Store size={12}/> Marketplace</button>
          <button className="role-tabs__btn"><I.Truck size={12}/> Wholesale</button>
        </div>
      )}

      <nav className="rail__nav" style={{display:"flex",flexDirection:"column",gap:14,marginTop:4}}>
        {BUYER_NAV.map((group, gi) => (
          <div key={gi} style={{display:"flex",flexDirection:"column",gap:2}}>
            <div className="rail__section"><span>{group.label}</span></div>
            {group.items.map(item => {
              const IconC = typeof item.icon === "string" ? I[item.icon] : item.icon;
              const on = active === item.key;
              return (
                <button
                  key={item.key}
                  className={`nav-item ${on ? "nav-item--on" : ""}`}
                  onClick={() => onNavigate(item.key)}
                  data-tip={item.label}>
                  <span className="nav-item__icon"><IconC size={18}/></span>
                  <span className="nav-item__label">{item.label}</span>
                  {item.badge && <span className="nav-item__badge">{item.badge}</span>}
                </button>
              );
            })}
            {/* Nested: active orders preview under "My orders" */}
            {group.items.some(i => i.key === "orders") && !collapsed && (
              <div className="rail__nested">
                {BUYER_DATA.orders.filter(o => o.status === "confirmed" || o.status === "pending").slice(0, 3).map(o => (
                  <div key={o.code} className="nested-item">
                    <div className="nested-item__chip" style={{ background: o.avatar, color: "#150f23" }}>{o.initials}</div>
                    <div className="nested-item__text">
                      <span className="nested-item__title">{o.species}</span>
                      <span className="nested-item__sub">{o.code} · ₱{o.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="rail__promo">
        <div className="rail__promo-head">
          <div className="rail__promo-icon"><I.Waves size={14} /></div>
          <div className="rail__promo-title">Today at the pier</div>
        </div>
        <div className="rail__promo-body">
          <div className="rail-tide__row">
            <span className="muted">High tide</span>
            <span className="mono">14:20 · 1.4m</span>
          </div>
          <div className="rail-tide__row">
            <span className="muted">Best handoff</span>
            <span className="mono" style={{color:"var(--accent-lime)"}}>13:00–15:30</span>
          </div>
          <div className="rail-tide__row">
            <span className="muted">Navotas wind</span>
            <span className="mono">12 kt NE</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BuyerTopbar() {
  const b = BUYER_DATA.buyer;
  return (
    <div className="topbar">
      <div className="topbar__chrome">
        <span className="topbar__chrome-btn" title="Back"><I.ChevronLeft size={14}/></span>
        <span className="topbar__chrome-btn" title="Forward"><I.ChevronRight size={14}/></span>
      </div>

      <div className="user-pill">
        <div className="user-pill__avatar" style={{background:"linear-gradient(135deg,#5eead4,#14b8a6)", color:"#0a0617"}}>{b.initials}</div>
        <div className="user-pill__info">
          <span className="user-pill__handle">{b.handle}</span>
          <span className="user-pill__name">
            {b.name}
            <span className="tier-tag">{b.tier}</span>
          </span>
        </div>
        <span className="user-pill__chev"><I.ChevronDown size={12}/></span>
      </div>

      <button className="btn btn--violet btn--sm" style={{padding:"7px 16px", borderRadius:999}}>
        <ICart size={12}/> Cart · ₱{BUYER_DATA.cart.subtotal.toLocaleString()}
      </button>

      <div className="spacer"/>

      <div className="topbar__search">
        <I.Search size={14}/>
        <input placeholder="Search species, vendors, ports…"/>
      </div>

      <button className="bell-btn" title="Notifications">
        <I.Bell size={15}/>
        <span className="bell-btn__dot">5</span>
      </button>

      <button className="btn btn--sm" style={{padding:"7px 14px", borderRadius:999}}>
        <I.Settings size={12}/> Settings
      </button>
    </div>
  );
}

window.BuyerSidebar = BuyerSidebar;
window.BuyerTopbar = BuyerTopbar;
window.ICart = ICart;
window.IHeart = IHeart;
