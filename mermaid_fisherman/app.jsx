/* Main app — routes pages, manages sidebar collapse, tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "railMode": "auto",
  "density": "balanced",
  "accent": "lime",
  "showMascot": true
}/*EDITMODE-END*/;

function App() {
  const [page, setPage] = React.useState("dashboard");
  const [railHover, setRailHover] = React.useState(false);
  const [railLocked, setRailLocked] = React.useState(false);
  const [t, setTweak] = window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];

  const railOpen = t.railMode === "always"
    ? true
    : t.railMode === "icons"
      ? railLocked
      : railHover || railLocked;

  // Page registry
  const Page = ({
    dashboard: window.DashboardPage,
    trips: window.TripsPage,
    alerts: window.CatchAlertsPage,
    deals: window.DealsPage,
    orders: window.OrdersPage,
    earnings: window.EarningsPage,
    messages: window.MessagesPage,
    profile: window.ProfilePage,
  })[page] || window.DashboardPage;

  React.useEffect(() => {
    // Scroll to top on page change
    document.querySelector(".content")?.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="app" data-rail-open={railOpen ? "true" : "false"} data-density={t.density} data-screen-label={NAV_LABEL[page]}>
      <div
        onMouseEnter={() => setRailHover(true)}
        onMouseLeave={() => setRailHover(false)}
        style={{ display: "contents" }}
      >
        <window.Rail page={page} setPage={setPage} railLocked={railLocked} setRailLocked={setRailLocked} />
      </div>
      <main className="main">
        <window.Topbar page={page} setPage={setPage} />
        <div className="content">
          <Page key={page} setPage={setPage} />
        </div>
        {/* Marine sticker mascot — single accent */}
        {t.showMascot && page === "dashboard" && (
          <div style={{
            position: "fixed", bottom: 24, right: 24,
            width: 64, height: 64,
            display: "grid", placeItems: "center",
            zIndex: 4,
            pointerEvents: "none",
            opacity: 0.85,
          }}>
            <FishStickerMascot />
          </div>
        )}
      </main>

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Sidebar">
            <window.TweakRadio
              label="Rail mode"
              value={t.railMode}
              options={[
                { value: "auto", label: "Hover" },
                { value: "icons", label: "Icons" },
                { value: "always", label: "Open" },
              ]}
              onChange={v => setTweak("railMode", v)}
            />
          </window.TweakSection>
          <window.TweakSection title="Density">
            <window.TweakRadio
              label="Spacing"
              value={t.density}
              options={[
                { value: "compact", label: "Compact" },
                { value: "balanced", label: "Balanced" },
                { value: "comfy", label: "Comfy" },
              ]}
              onChange={v => setTweak("density", v)}
            />
          </window.TweakSection>
          <window.TweakSection title="Brand">
            <window.TweakToggle
              label="Show marine sticker mascot"
              value={t.showMascot}
              onChange={v => setTweak("showMascot", v)}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

// A tiny hand-drawn marine "sticker" — fish + lime fin (no AI emoji slop, sticker style)
function FishStickerMascot() {
  return (
    <svg width="58" height="58" viewBox="0 0 80 80" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.35))" }}>
      <defs>
        <radialGradient id="fishBody" cx="0.35" cy="0.4">
          <stop offset="0%" stopColor="#c4baff" />
          <stop offset="100%" stopColor="#6a5fc1" />
        </radialGradient>
      </defs>
      {/* Body */}
      <path d="M 18 40 Q 18 22 42 24 Q 62 26 68 40 Q 62 54 42 56 Q 18 58 18 40 Z" fill="url(#fishBody)" stroke="#150f23" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Tail */}
      <path d="M 18 40 Q 8 30 8 26 Q 18 30 22 36 Z M 18 40 Q 8 50 8 54 Q 18 50 22 44 Z" fill="#c2ef4e" stroke="#150f23" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Fin top */}
      <path d="M 40 25 Q 44 14 52 22" fill="#fa7faa" stroke="#150f23" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Eye */}
      <circle cx="54" cy="36" r="3.5" fill="#150f23" />
      <circle cx="55" cy="35" r="1.2" fill="#fff" />
      {/* Smile */}
      <path d="M 56 44 Q 60 47 64 44" fill="none" stroke="#150f23" strokeWidth="2" strokeLinecap="round" />
      {/* Cheek dot */}
      <circle cx="47" cy="44" r="2" fill="#fa7faa" opacity="0.6" />
    </svg>
  );
}

window.App = App;

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
