/* Shell — collapsible sidebar (hover-to-expand) + topbar */

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "Dashboard" },
  { id: "trips", label: "My Trips", icon: "Anchor" },
  { id: "alerts", label: "Catch Alerts", icon: "Bell", badge: 3 },
  { id: "deals", label: "Deals", icon: "Users", badge: 2 },
  { id: "orders", label: "Orders", icon: "Clipboard", badge: 1 },
  { id: "earnings", label: "Earnings", icon: "Wallet" },
  { id: "messages", label: "Messages", icon: "Message", badge: 4 },
  { id: "profile", label: "Profile", icon: "User" },
];

const NAV_LABEL = NAV.reduce((m, n) => (m[n.id] = n.label, m), {});

function Sparkline({ data, color = "#c2ef4e", showDot = true, showLabel = false, labelText, height = 64 }) {
  const w = 100;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 6 - ((v - min) / range) * (height - 14);
    return [x, y];
  });
  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const areaD = `${lineD} L${w},${height} L0,${height} Z`;
  const lastPt = pts[pts.length - 1];
  const gradId = `sparkGrad-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <line x1="0" y1={height - 6} x2={w} y2={height - 6} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2 2" />
        <path d={lineD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {showDot && (
          <circle cx={lastPt[0]} cy={lastPt[1]} r="2.6" fill={color} stroke="#1a1230" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {showLabel && labelText && (
        <div style={{
          position: "absolute",
          left: `${lastPt[0]}%`,
          top: `${(lastPt[1] / height) * 100}%`,
          transform: "translate(-50%, -160%)",
          padding: "2px 7px",
          borderRadius: 4,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          fontFamily: "var(--font-code)",
          fontSize: 10,
          fontWeight: 600,
          color: "#fff",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>{labelText}</div>
      )}
    </div>
  );
}

function Rail({ page, setPage, railLocked, setRailLocked }) {
  const [tab, setTab] = React.useState("ops");
  return (
    <aside
      className="rail"
      onMouseEnter={() => !railLocked && document.body.dataset.railHover === "true"}
    >
      <div className="rail__logo">
        <div className="rail__logo-mark">M</div>
        <div className="rail__logo-wm">
          <div className="rail__logo-wm-name">Mermaid<sup style={{ fontSize: 8, color: "var(--accent-lime)", marginLeft: 2 }}>®</sup></div>
          <div className="rail__logo-wm-sub">Marine Ops Platform</div>
        </div>
      </div>

      <div className="rail__tabs">
        <button className={`rail__tab ${tab === "ops" ? "rail__tab--on" : ""}`} onClick={() => setTab("ops")}>Operations</button>
        <button className={`rail__tab ${tab === "market" ? "rail__tab--on" : ""}`} onClick={() => setTab("market")}>Marketplace</button>
      </div>

      <div className="rail__items">
        <div className="rail__label">Workspace</div>
        {NAV.map(n => {
          const Icon = window.I[n.icon] || window.I.Dashboard;
          const isOn = page === n.id;
          return (
            <button key={n.id} className={`rail-item ${isOn ? "rail-item--on" : ""}`} onClick={() => setPage(n.id)}>
              <div className="rail-item__icon"><Icon size={17} /></div>
              <div className="rail-item__text">{n.label}</div>
              {n.badge && <div className="rail-item__badge">{n.badge}</div>}
            </button>
          );
        })}
      </div>

      <div className="rail__featured">
        <div className="rail__featured-label">
          <div className="rail__featured-pulse" />
          Active trip
        </div>
        <div className="rail__featured-title">{DATA.activeTrip.targetArea}</div>
        <div className="rail__featured-sub">T-{DATA.activeTrip.id} · {DATA.activeTrip.vesselName}</div>
        <div className="rail__featured-stat">
          {DATA.catchLogs.reduce((s, c) => s + c.quantityKg, 0)}<small>kg logged</small>
        </div>
      </div>

      <div className="rail__bottom">
        <div className="rail__user">
          <div className="rail__avatar">{DATA.user.initials}</div>
          <div className="rail__user-info">
            <span className="rail__user-name">{DATA.user.firstName}</span>
            <span className="rail__user-role">{DATA.user.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NotificationsDropdown({ onClose }) {
  return (
    <div className="dropdown" onClick={e => e.stopPropagation()}>
      <div className="dropdown__head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="dropdown__title">Notifications</span>
          <span className="dropdown__count">4 new</span>
        </div>
        <button className="btn btn--ghost btn--sm" style={{ padding: "4px 8px", fontSize: 10 }}>Mark all read</button>
      </div>
      <div className="dropdown__body">
        {DATA.activity.slice(0, 6).map(a => {
          const Icon = window.I[a.icon] || window.I.Bell;
          return (
            <div key={a.id} className="feed-item" style={{ padding: "12px 10px", borderBottom: "1px solid var(--hairline-2)" }}>
              <div className={`feed-item__icon feed-item__icon--${a.tone}`}><Icon size={14} /></div>
              <div className="feed-item__body">
                <div className="feed-item__title">{a.title}</div>
                <div className="feed-item__meta">
                  <span>{a.time}</span>
                  <span>·</span>
                  <span>{a.meta}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Topbar({ page, setPage }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  React.useEffect(() => {
    const close = () => setNotifOpen(false);
    if (notifOpen) {
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }
  }, [notifOpen]);

  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Mermaid</span>
        <span className="sep">/</span>
        <span>Fisherman</span>
        <span className="sep">/</span>
        <strong>{NAV_LABEL[page] || page}</strong>
      </div>
      <button className="topbar__pill">
        <window.I.Plus size={11} />
        Log Catch
      </button>

      <div className="topbar__spacer" />

      <div className="topbar__search">
        <window.I.Search size={14} />
        <input placeholder="Search trips, vendors, species…" />
        <kbd>⌘K</kbd>
      </div>

      <div style={{ position: "relative" }}>
        <button className="topbar__icon-btn" onClick={e => { e.stopPropagation(); setNotifOpen(v => !v); }} title="Notifications">
          <window.I.Bell size={16} />
          <span className="badge" />
        </button>
        {notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}
      </div>

      <button className="topbar__icon-btn" title="Settings"><window.I.Settings size={16} /></button>

      <div className="topbar__profile" onClick={() => setPage("profile")}>
        <div className="topbar__profile-avatar">{DATA.user.initials}</div>
        <div className="topbar__profile-info">
          <span className="topbar__profile-name">@{DATA.user.handle}</span>
          <span className="topbar__profile-role">BFAR · Verified</span>
        </div>
        <window.I.ChevronDown size={12} style={{ color: "var(--ink-3)", marginLeft: 2 }} />
      </div>
    </div>
  );
}

window.Sparkline = Sparkline;
window.Rail = Rail;
window.Topbar = Topbar;
window.NAV_LABEL = NAV_LABEL;
