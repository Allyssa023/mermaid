/* MERMAID — shared chrome and illustration primitives.
   Exposes (on window): Logo, NavBar, Footer, LimeChip, Eyebrow, Pill,
   FeatureCard, Icon, MarineMascot, DashboardMock, MapBoard, Toast.
*/

const { useState, useEffect } = React;

/* ---------- Logo ---------------------------------------------------- */
function Logo({ color, scale = 1 }) {
  // Wordmark "mermaid" with a small wave + lime square — typed in display sans.
  const c = color || '#fff';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" style={{ width: 132 * scale, height: 'auto', display: 'block' }}>
      {/* small wave mark */}
      <g transform="translate(0,18)">
        <path d="M0 8 Q 6 0, 12 8 T 24 8" stroke={c} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <text x="32" y="40" fontFamily="Space Grotesk, Rubik, sans-serif" fontWeight="700" fontSize="34" letterSpacing="-1" fill={c}>mermaid</text>
      <rect x="252" y="14" width="9" height="9" rx="1.5" fill="#3ee2ff"></rect>
    </svg>);

}

/* ---------- NavBar -------------------------------------------------- */
function NavBar({ current, onNav, polarity }) {
  const items = [
  { key: 'home', label: 'Home' },
  { key: 'services', label: 'Services' },
  { key: 'about', label: 'About' },
  { key: 'cases', label: 'Case studies' },
  { key: 'contact', label: 'Contact' }];

  const isDark = polarity === 'dark';
  return (
    <div className={"nav-host " + (isDark ? "nav-host--dark" : "nav-host--light")}>
      <div className="container">
        <nav className="nav">
          <a className="nav__logo" onClick={() => onNav('home')}>
            <Logo color={isDark ? '#fff' : '#1f1633'} />
          </a>
          <div className="nav__items">
            {items.map((it) =>
            <span
              key={it.key}
              className={"nav__item " + (current === it.key ? "nav__item--active" : "")}
              onClick={() => onNav(it.key)}>
                {it.label}
              </span>
            )}
          </div>
          <div className="nav__cta">
            {isDark ?

            <>
                  <button className="btn btn--ghost" onClick={() => onNav('contact')}>Talk to us</button>
                  <button className="btn btn--lime" onClick={() => onNav('contact')} style={{ backgroundColor: "rgb(62,226,255)" }}>Get demo <Icon name="arrow-right" size={14} /></button>
                </> :


            <>
                  <button className="btn btn--ghost-light" onClick={() => onNav('contact')}>Talk to us</button>
                  <button className="btn btn--primary" onClick={() => onNav('contact')}>Get demo <Icon name="arrow-right" size={14} /></button>
                </>

            }
          </div>
        </nav>
      </div>
    </div>);

}

/* ---------- inline atoms ------------------------------------------- */
function LimeChip({ children }) {return <span className="lime-chip" style={{ backgroundColor: "rgb(62,226,255)" }}>{children}</span>;}
function Eyebrow({ children, light }) {
  return <div className={"eyebrow " + (light ? "eyebrow--light" : "")}>{children}</div>;
}
function Pill({ children, variant }) {
  const cls = "pill " + (variant === 'lime' ? "pill--lime" : variant === 'light' ? "pill--light" : "");
  return <span className={cls}><span className="pill__dot" style={{ backgroundColor: "rgb(78, 173, 239)" }}></span>{children}</span>;
}

/* ---------- Icon set (Lucide-style strokes inlined) ---------------- */
function Icon({ name, size = 18, color = "currentColor", stroke = 1.8 }) {
  const s = { width: size, height: size, display: 'inline-block', verticalAlign: '-2px' };
  const sw = stroke;
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: s
  };
  switch (name) {
    case 'arrow-right':return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case 'arrow-up-right':return <svg {...common}><path d="M7 17 17 7M9 7h8v8" /></svg>;
    case 'waves':return <svg {...common}><path d="M2 6c2 0 2-1.6 4-1.6S8 6 10 6s2-1.6 4-1.6S16 6 18 6s2-1.6 4-1.6" /><path d="M2 12c2 0 2-1.6 4-1.6S8 12 10 12s2-1.6 4-1.6S16 12 18 12s2-1.6 4-1.6" /><path d="M2 18c2 0 2-1.6 4-1.6S8 18 10 18s2-1.6 4-1.6S16 18 18 18s2-1.6 4-1.6" /></svg>;
    case 'wind':return <svg {...common}><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 14h17a3 3 0 1 1-3 3" /><path d="M3 11h6" /></svg>;
    case 'anchor':return <svg {...common}><circle cx="12" cy="6" r="2.5" /><path d="M12 8.5V22" /><path d="M8 13H16" /><path d="M5 16a7 7 0 0 0 14 0" /></svg>;
    case 'ship':return <svg {...common}><path d="M3 16 5 9h14l2 7" /><path d="M3 16c2.5 2 5 2 7.5 0M21 16c-2.5 2-5 2-7.5 0M10.5 16V16" /><path d="M12 4v5" /><path d="M9 9V5h6v4" /></svg>;
    case 'fish':return <svg {...common}><path d="M3 12s2-5 8-5 9 5 9 5-3 5-9 5-8-5-8-5z" /><circle cx="16" cy="11.5" r="0.8" fill={color} stroke="none" /><path d="M3 12c-1 0-1 2-1 2M3 12c-1 0-1-2-1-2" /></svg>;
    case 'radio':return <svg {...common}><circle cx="12" cy="12" r="2" /><path d="M16.5 7.5a6 6 0 0 1 0 9M19.6 4.4a10 10 0 0 1 0 15.2M7.5 7.5a6 6 0 0 0 0 9M4.4 4.4a10 10 0 0 0 0 15.2" /></svg>;
    case 'shield':return <svg {...common}><path d="M12 3l8 3v5c0 5-4 9-8 10-4-1-8-5-8-10V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'cart':return <svg {...common}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l3 12h12l2-8H6" /></svg>;
    case 'route':return <svg {...common}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h6" /></svg>;
    case 'chart':return <svg {...common}><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-7" /></svg>;
    case 'bell':return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>;
    case 'globe':return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>;
    case 'satellite':return <svg {...common}><path d="M3 12a8 8 0 0 1 8-8M3 17a3 3 0 0 1 3-3M3 21a7 7 0 0 1 7-7" /><rect x="14" y="6" width="6" height="6" rx="1" transform="rotate(45 17 9)" /><path d="M15 14l-3 3M11 18l-2 2" /></svg>;
    case 'check':return <svg {...common}><path d="M5 12l4 4 10-10" /></svg>;
    case 'mail':return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></svg>;
    case 'phone':return <svg {...common}><path d="M5 4h4l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
    case 'pin':return <svg {...common}><path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case 'twitter':return <svg {...common}><path d="M21 5a8 8 0 0 1-2.3.6 4 4 0 0 0 1.7-2.2 8 8 0 0 1-2.6 1A4 4 0 0 0 11 7.2 11 11 0 0 1 3 4s-2 6 4 9c-1.5 1-3 1-5 1 6 4 18 1 18-10V3z" /></svg>;
    case 'github':return <svg {...common}><path d="M9 19c-4 1-4-2-6-2M15 21v-3c0-1 0-2-1-3 3 0 6-2 6-6a5 5 0 0 0-1-3.5c.3-1 .3-2 0-3 0 0-1 0-3 2a10 10 0 0 0-6 0C6.5 2 5.5 2 5.5 2c-.5 1-.5 2 0 3A5 5 0 0 0 4.5 8.5c0 4 3 6 6 6-1 1-1 2-1 3v3" /></svg>;
    case 'linkedin':return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10v7M8 7v0M12 17v-4a2 2 0 0 1 4 0v4M16 13v4" /></svg>;
    default:return null;
  }
}

/* ---------- FeatureCard ------------------------------------------- */
function FeatureCard({ eyebrow, title, body, spotlight, light, icon, linkLabel }) {
  let cls = "feature-card";
  if (spotlight) cls += " feature-card--spotlight";
  if (light) cls += " feature-card--light";
  return (
    <div className={cls}>
      {icon && <div className="feature-card__icon"><Icon name={icon} size={22} /></div>}
      <div className="feature-card__eyebrow">{eyebrow}</div>
      <div className="feature-card__title">{title}</div>
      <div className="feature-card__body">{body}</div>
      {linkLabel && <div className="feature-card__link">{linkLabel} <Icon name="arrow-right" size={14} /></div>}
    </div>);

}

/* ---------- Marine mascot stickers (placeholders, sticker style) -- */
/* Outlined fills (lime + pink), thick stroke — matches Sentri sticker DNA. */
function MarineMascot({ kind, size = 180, style = {} }) {
  const stroke = '#150f23';
  const pink = '#fa7faa';
  const lime = '#3ee2ff';
  const sw = 3;
  const wrap = { width: size, height: size, ...style };
  if (kind === 'whale') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={wrap}>
        <g transform="rotate(-6 100 100)">
          <path d="M30 110 C 40 70, 110 60, 150 80 C 180 92, 175 130, 150 138 C 130 145, 60 150, 40 138 C 28 130, 22 130, 18 122 L 30 112 Z"
          fill={lime} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M150 78 C 162 60, 178 56, 192 50 C 188 70, 178 84, 168 88" fill={pink} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="60" cy="100" r="4" fill={stroke} />
          <path d="M60 100 q -10 -3 -10 0 q 10 3 10 0z" fill="#fff" stroke="none" />
          <path d="M82 115 q 8 6 16 0 q 8 6 16 0" stroke={stroke} strokeWidth={sw - 0.5} fill="none" strokeLinecap="round" />
          <path d="M40 92 q 6 -10 14 -8" stroke={stroke} strokeWidth={sw - 0.5} fill="none" strokeLinecap="round" />
        </g>
      </svg>);

  }
  if (kind === 'anchor') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={wrap}>
        <g transform="rotate(8 100 100)">
          <circle cx="100" cy="46" r="20" fill={pink} stroke={stroke} strokeWidth={sw} />
          <circle cx="100" cy="46" r="7" fill={stroke} />
          <rect x="93" y="62" width="14" height="100" rx="3" fill={lime} stroke={stroke} strokeWidth={sw} />
          <rect x="70" y="92" width="60" height="12" rx="3" fill={lime} stroke={stroke} strokeWidth={sw} />
          <path d="M40 130 C 40 158, 70 174, 100 174 C 130 174, 160 158, 160 130 L 150 138 M 160 130 L 170 138 M 40 130 L 50 138 M 40 130 L 30 138"
          fill="none" stroke={stroke} strokeWidth={sw + 1} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>);

  }
  if (kind === 'buoy') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={wrap}>
        <g transform="rotate(-4 100 100)">
          <path d="M70 30 L100 14 L130 30 L130 50 L70 50 Z" fill={pink} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <rect x="60" y="50" width="80" height="80" rx="10" fill={lime} stroke={stroke} strokeWidth={sw} />
          <rect x="60" y="74" width="80" height="14" fill={pink} stroke={stroke} strokeWidth={sw} />
          <circle cx="100" cy="106" r="10" fill="#fff" stroke={stroke} strokeWidth={sw} />
          <path d="M40 150 q 20 -12 40 0 t 40 0 t 40 0" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
          <path d="M30 168 q 20 -12 40 0 t 40 0 t 40 0 t 40 0" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
        </g>
      </svg>);

  }
  if (kind === 'fish') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={wrap}>
        <g transform="rotate(-10 100 100)">
          <path d="M30 100 C 60 50, 130 50, 160 100 C 130 150, 60 150, 30 100 Z" fill={lime} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M160 100 L 196 70 L 192 100 L 196 130 Z" fill={pink} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="120" cy="92" r="8" fill="#fff" stroke={stroke} strokeWidth={sw - 0.5} />
          <circle cx="122" cy="92" r="3" fill={stroke} />
          <path d="M62 100 q 10 -8 20 0 q -10 8 -20 0z" fill={pink} stroke={stroke} strokeWidth={sw - 0.5} />
          <path d="M90 124 q 10 -4 18 0 M88 80 q 10 -4 18 0" stroke={stroke} strokeWidth={sw - 0.5} fill="none" strokeLinecap="round" />
        </g>
      </svg>);

  }
  return null;
}

/* ---------- Dashboard Mock ---------------------------------------- */
/* A console-flavored marine-ops dashboard. Used on Home + Services. */
function DashboardMock({ tilt = -2 }) {
  return (
    <div className="dash" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="dash__chrome">
        <span className="dash__chrome-dot is-pink"></span>
        <span className="dash__chrome-dot is-lime"></span>
        <span className="dash__chrome-dot is-violet"></span>
        <span className="dash__chrome-title">ops.mermaid.ph / fisherman</span>
      </div>
      <div className="dash__body" style={{ padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
          {/* left column — catch alert + earnings chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>catch alert · CA-2104</span>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--accent-lime)' }}>● ACTIVE</span>
            </div>
            <div style={{ background: '#1f1633', borderRadius: 10, padding: 14, border: '1px solid var(--hairline-violet)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'var(--accent-lime)', fontFamily: 'var(--font-code)', fontSize: 12, marginBottom: 4 }}>SKIPJACK TUNA · 240 KG</div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>Trip T-0488 · Lingayen Gulf</div>
                </div>
                <span style={{ background: 'rgba(62,226,255,0.18)', color: 'var(--accent-lime)', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-code)' }}>3 DEALS</span>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)' }}>
                <span>asking ₱150/kg</span>
                <span>BFAR mid ₱148</span>
                <span>+1.4%</span>
              </div>
            </div>
            {/* chart */}
            <div style={{ background: '#1f1633', borderRadius: 10, padding: 14, border: '1px solid var(--hairline-violet)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>earnings · 7d</span>
                <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: '#fff' }}>₱42,180</span>
              </div>
              <svg viewBox="0 0 240 64" width="100%" height="64" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dash-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3ee2ff" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#3ee2ff" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d="M0 50 L 20 44 L 40 46 L 60 38 L 80 30 L 100 36 L 120 24 L 140 18 L 160 26 L 180 16 L 200 22 L 220 12 L 240 18 L 240 64 L 0 64 Z" fill="url(#dash-fill)" />
                <path d="M0 50 L 20 44 L 40 46 L 60 38 L 80 30 L 100 36 L 120 24 L 140 18 L 160 26 L 180 16 L 200 22 L 220 12 L 240 18" stroke="#3ee2ff" strokeWidth="1.4" fill="none" />
              </svg>
            </div>
          </div>
          {/* right column — incoming vendor deals */}
          <div style={{ background: '#1f1633', borderRadius: 10, padding: 14, border: '1px solid var(--hairline-violet)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>incoming deals</span>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--accent-lime)' }}>3 offers</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-code)', fontSize: 12 }}>
              {[
              ['Aling Nena Fish', '₱152', 'open', 'lime'],
              ['Pangasinan Seafoods', '₱150', 'open', 'lime'],
              ['JM Wet Market', '₱146', 'expired', 'violet'],
              ['Coastal Co-op', '₱145', 'declined', 'pink']].
              map(([vendor, price, state, c]) =>
              <div key={vendor} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(54,45,89,0.5)' }}>
                  <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '58%' }}>{vendor}</span>
                  <span style={{ color: c === 'pink' ? 'var(--accent-pink)' : c === 'lime' ? 'var(--accent-lime)' : '#79628c', display: 'flex', gap: 8 }}>
                    <span>{price}</span>
                    <span style={{ opacity: 0.85 }}>{state}</span>
                  </span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(62,226,255,0.08)', border: '1px solid rgba(62,226,255,0.25)', borderRadius: 6, fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--accent-lime)', letterSpacing: 0.3 }}>
              ▲ TOP OFFER · 60s LEFT TO ACCEPT
            </div>
          </div>
        </div>
      </div>
    </div>);

}

/* ---------- Map board (live coastal map mock) --------------------- */
function MapBoard() {
  return (
    <div className="map-board">
      <div className="map-board__grid"></div>
      {/* schematic coastline */}
      <svg viewBox="0 0 800 450" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
        <path d="M 0 280 C 90 250, 150 320, 220 290 C 280 264, 320 340, 410 310 C 480 285, 540 360, 620 322 C 700 290, 760 360, 800 320 L 800 450 L 0 450 Z"
        fill="rgba(106,95,193,0.18)" stroke="rgba(62,226,255,0.32)" strokeWidth="1.2" />
        <path d="M 0 280 C 90 250, 150 320, 220 290 C 280 264, 320 340, 410 310 C 480 285, 540 360, 620 322 C 700 290, 760 360, 800 320"
        fill="none" stroke="#3ee2ff" strokeWidth="1.6" strokeDasharray="2 4" opacity="0.7" />
      </svg>
      {/* nodes */}
      <div className="map-board__node map-board__node--ping" style={{ top: '34%', left: '22%' }}></div>
      <div className="map-board__label" style={{ top: '30%', left: '25%' }}>LINGAYEN GULF · SWELL 1.4m</div>

      <div className="map-board__node" style={{ top: '48%', left: '46%', background: '#fa7faa', boxShadow: '0 0 0 4px rgba(250,127,170,0.2), 0 0 24px rgba(250,127,170,0.5)' }}></div>
      <div className="map-board__label" style={{ top: '44%', left: '49%', color: '#fa7faa' }}>GALE WARNING · ZAMBALES</div>

      <div className="map-board__node map-board__node--ping" style={{ top: '62%', left: '68%' }}></div>
      <div className="map-board__label" style={{ top: '58%', left: '71%' }}>CURRIMAO · OPEN</div>

      <div className="map-board__node" style={{ top: '40%', left: '78%' }}></div>
      <div className="map-board__label" style={{ top: '36%', left: '81%' }}>TRIP T-0488 · OK</div>

      <div className="map-board__node" style={{ top: '56%', left: '12%' }}></div>
      <div className="map-board__label" style={{ top: '52%', left: '15%' }}>SAN FERNANDO · OPEN</div>

      {/* corner readout */}
      <div style={{ position: 'absolute', top: 18, left: 18, padding: '10px 14px', background: 'rgba(21,15,35,0.7)', border: '1px solid var(--hairline-violet)', borderRadius: 10, color: '#fff', fontFamily: 'var(--font-code)', fontSize: 11, lineHeight: 1.7 }}>
        <div style={{ color: 'var(--accent-lime)', marginBottom: 6, letterSpacing: 0.4 }}>● REGION I COASTAL FEED — LIVE</div>
        <div>tracking 312 active trips</div>
        <div>2 BFAR advisories posted</div>
      </div>
      <div style={{ position: 'absolute', bottom: 18, right: 18, padding: '10px 14px', background: 'rgba(21,15,35,0.7)', border: '1px solid var(--hairline-violet)', borderRadius: 10, color: '#fff', fontFamily: 'var(--font-code)', fontSize: 11 }}>
        <span style={{ color: 'var(--on-dark-muted)' }}>updated</span> <span style={{ color: 'var(--accent-lime)' }}>00:00:02</span> ago
      </div>
    </div>);

}

/* ---------- Footer ------------------------------------------------- */
function Footer({ onNav }) {
  return (
    <footer className="footer">
      <div className="container">
        <img className="footer__squiggle" src="assets/lime-squiggle.svg" alt="" />
        <div className="footer__grid">
          <div className="footer__col">
            <Logo color="#1f1633" />
            <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.65, color: '#5b5670', maxWidth: 290 }}>
              Marine Safety & Market Information Dashboard. Trip safety, BFAR-backed catch alerts, vendor storefronts, and a direct-to-buyer marketplace — built for Filipino coastal communities.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 18, color: '#79628c' }}>
              <a><Icon name="twitter" size={18} /></a>
              <a><Icon name="linkedin" size={18} /></a>
              <a><Icon name="github" size={18} /></a>
            </div>
          </div>
          <div className="footer__col">
            <h6>Platform</h6>
            <ul>
              <li><a onClick={() => onNav('services')}>Trips & catch logs</a></li>
              <li><a onClick={() => onNav('services')}>Catch alerts & deals</a></li>
              <li><a onClick={() => onNav('services')}>Vendor storefront</a></li>
              <li><a onClick={() => onNav('services')}>Buyer marketplace</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h6>Company</h6>
            <ul>
              <li><a onClick={() => onNav('about')}>About</a></li>
              <li><a onClick={() => onNav('cases')}>Case studies</a></li>
              <li><a>Careers</a></li>
              <li><a>Newsroom</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h6>Resources</h6>
            <ul>
              <li><a>Documentation</a></li>
              <li><a>API reference</a></li>
              <li><a>Coverage map</a></li>
              <li><a onClick={() => onNav('contact')}>Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer__legal">
          <span>© 2026 MERMAID Technologies. Marine Ecosystem for Risk Monitoring, Aquatic Industry & Distribution.</span>
          <span>Privacy · Terms · BFAR data attribution</span>
        </div>
      </div>
    </footer>);

}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast"><span className="toast__dot"></span>{message}</div>;
}

Object.assign(window, {
  Logo, NavBar, Footer, LimeChip, Eyebrow, Pill, FeatureCard, Icon,
  MarineMascot, DashboardMock, MapBoard, Toast
});