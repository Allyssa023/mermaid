// ─── App root ─────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState(() => localStorage.getItem('mermaid.page') || 'dashboard');
  const [tweakOpen, setTweakOpen] = useState(false);
  const [tweaks, setTweaks] = useState(window.__TWEAKS);

  useEffect(() => { localStorage.setItem('mermaid.page', page); }, [page]);

  // Apply tweaks to root
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', tweaks.accent);
    document.documentElement.setAttribute('data-density', tweaks.density);
  }, [tweaks]);

  // Edit mode protocol
  useEffect(() => {
    function handler(e) {
      if (!e || !e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweakOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweakOpen(false);
    }
    window.addEventListener('message', handler);
    window.parent && window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const PageCmp = {
    dashboard: DashboardPage,
    planner: PlannerPage,
    trips: TripsPage,
    alerts: AlertsPage,
    orders: OrdersPage,
    market: MarketplacePage,
    messages: MessagesPage,
  }[page] || DashboardPage;

  return (
    <div className="app" data-screen-label={page}>
      <Rail page={page} setPage={setPage} onTweaks={() => setTweakOpen(v => !v)} />
      <main className="main">
        <Topbar page={page} />
        <PageCmp setPage={setPage} />
      </main>
      <Tweaks open={tweakOpen} state={tweaks} setState={setTweaks} onClose={() => setTweakOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
