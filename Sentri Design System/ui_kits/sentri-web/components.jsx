/* Sentri Web — atoms and chrome
   Exposes: Logo, NavBar, Footer, Button, LimeChip, CodeBlock, FeatureCard, Pill, MascotSticker
*/

const { useState } = React;

function Logo({ color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 64" style={{ color, width: 110, height: 'auto' }}>
      <text x="0" y="48" fontFamily="Space Grotesk, Rubik, sans-serif" fontWeight="700" fontSize="44" letterSpacing="-1.4" fill="currentColor">sentri</text>
      <rect x="124" y="14" width="9" height="9" rx="1.5" fill="#c2ef4e"></rect>
    </svg>
  );
}

function NavBar({ current, onNav, polarity }) {
  const items = [
    { key: 'home',     label: 'Product' },
    { key: 'monitor',  label: 'Error monitoring' },
    { key: 'pricing',  label: 'Pricing' },
    { key: 'contact',  label: 'Contact' }
  ];
  const isDark = polarity === 'dark';
  return (
    <div className={"nav-host " + (isDark ? "nav-host--dark" : "nav-host--light")}>
      <div className="container">
        <nav className="nav">
          <a className="nav__logo" onClick={() => onNav('home')}>
            <Logo color={isDark ? '#fff' : '#1f1633'} />
          </a>
          <div className="nav__items">
            {items.map(it => (
              <span
                key={it.key}
                className={"nav__item " + (current === it.key ? "nav__item--active" : "")}
                onClick={() => onNav(it.key)}>
                {it.label}
              </span>
            ))}
          </div>
          <div className="nav__cta">
            {isDark
              ? <>
                  <button className="btn btn--ghost" onClick={() => onNav('contact')}>Get demo</button>
                  <button className="btn btn--inverted" onClick={() => onNav('pricing')}>Get started</button>
                </>
              : <>
                  <button className="btn btn--ghost-light" onClick={() => onNav('contact')}>Get demo</button>
                  <button className="btn btn--primary" onClick={() => onNav('pricing')}>Get started</button>
                </>
            }
          </div>
        </nav>
      </div>
    </div>
  );
}

function LimeChip({ children }) {
  return <span className="lime-chip">{children}</span>;
}

function FeatureCard({ eyebrow, title, body, spotlight }) {
  return (
    <div className={"feature-card " + (spotlight ? "feature-card--spotlight" : "")}>
      <div className="feature-card__eyebrow">{eyebrow}</div>
      <div className="feature-card__title">{title}</div>
      <div className="feature-card__body">{body}</div>
    </div>
  );
}

function CodeBlock({ children }) {
  return <pre className="code-block">{children}</pre>;
}

function MascotSticker({ kind, style, rotation }) {
  const src = `../../assets/mascots/${kind}.svg`;
  return (
    <img
      src={src}
      alt={kind + " mascot"}
      style={{ transform: `rotate(${rotation || 0}deg)`, ...style }}
    />
  );
}

function Footer({ onNav }) {
  return (
    <footer className="footer">
      <div className="container">
        <img className="footer__squiggle" src="../../assets/lime-squiggle.svg" alt="" />
        <div className="footer__grid">
          <div className="footer__col">
            <Logo color="#1f1633" />
            <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: 'var(--accent-violet-mid)', maxWidth: 280 }}>
              The error monitoring developers use. Find broken things, ship fixes, sleep.
            </p>
          </div>
          <div className="footer__col">
            <h6>Product</h6>
            <ul>
              <li><a onClick={() => onNav('monitor')}>Error monitoring</a></li>
              <li><a>Performance</a></li>
              <li><a>Replays</a></li>
              <li><a>Profiling</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h6>Company</h6>
            <ul>
              <li><a>About</a></li>
              <li><a>Careers</a></li>
              <li><a>Newsroom</a></li>
              <li><a onClick={() => onNav('contact')}>Contact</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h6>Resources</h6>
            <ul>
              <li><a>Docs</a></li>
              <li><a>Changelog</a></li>
              <li><a>Status</a></li>
              <li><a onClick={() => onNav('pricing')}>Pricing</a></li>
            </ul>
          </div>
        </div>
        <div className="footer__legal">
          <span>© 2026 Sentri, Inc.</span>
          <span>Privacy · Terms · Cookies</span>
        </div>
      </div>
    </footer>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

Object.assign(window, {
  Logo, NavBar, LimeChip, FeatureCard, CodeBlock, MascotSticker, Footer, Toast
});
