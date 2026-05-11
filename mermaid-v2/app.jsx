// ─── App root ─────────────────────────────────────────────────────────
function App() {
  const [role, setRole] = useState(() => localStorage.getItem('mermaid.role') || 'FISHERMAN');
  const defaultPages = { FISHERMAN: 'dashboard', VENDOR: 'vdashboard', BUYER: 'bhome', ADMIN: 'aoverview' };
  const [page, setPage] = useState(() => localStorage.getItem('mermaid.page') || defaultPages[role]);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(() => !localStorage.getItem('mermaid.role'));
  const [tweaks, setTweaks] = useState(window.__TWEAKS);

  useEffect(() => { localStorage.setItem('mermaid.page', page); }, [page]);
  useEffect(() => { localStorage.setItem('mermaid.role', role); }, [role]);

  // Apply tweaks
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

  function selectRole(r) {
    setRole(r);
    setPage(defaultPages[r]);
    setRoleSwitcherOpen(false);
  }

  // Page registry per role
  const PAGES = {
    // Fisherman
    dashboard:   FishermanHomePage,
    planner:     PlannerPage,
    trips:       TripsPage,
    alerts:      AlertsPage,
    procurement: FishermanProcurementPage,
    orders:      OrdersPage,
    earnings:    FishermanEarningsPage,
    market:      MarketplacePage,
    messages:    MessagesPage,
    profile:     FishermanProfilePage,
    // Vendor
    vdashboard:   VendorHomePage,
    vstore:       VendorStorefrontPage,
    vinventory:   VendorInventoryPage,
    vorders:      VendorOrdersPage,
    vprocurement: VendorProcurementPage,
    vwatchlist:   VendorWatchlistPage,
    vanalytics:   VendorAnalyticsPage,
    vreviews:     VendorReviewsPage,
    vpayouts:     VendorPayoutsPage,
    vshop:        VendorShopProfilePage,
    vmessages:    MessagesPage,
    // Buyer
    bhome:     BuyerHomePage,
    bbrowse:   BuyerBrowsePage,
    bcart:     BuyerCartPage,
    bcheckout: BuyerCheckoutPage,
    blisting:  BuyerListingDetailPage,
    bvendor:   BuyerVendorStorefrontPage,
    borders:   BuyerOrdersPage,
    bsaved:    BuyerSavedPage,
    bmessages: BuyerMessagesPage,
    bprofile:  BuyerProfilePage,
    // Admin
    aoverview:   AdminOverviewPage,
    ausers:      AdminUsersPage,
    aadvisories: AdminAdvisoriesPage,
    aspecies:    AdminSpeciesPage,
    alocations:  AdminLocationsPage,
    aaudit:      AdminAuditPage,
  };
  const PageCmp = PAGES[page] || PAGES[defaultPages[role]];

  return (
    <div className="app" data-screen-label={`${role}-${page}`} data-role={role}>
      <Rail
        role={role}
        page={page}
        setPage={setPage}
        onTweaks={() => setTweakOpen(v => !v)}
        onSwitchRole={() => setRoleSwitcherOpen(true)}
      />
      <main className="main">
        <Topbar role={role} page={page} />
        <PageCmp setPage={setPage} />
      </main>
      <Tweaks open={tweakOpen} state={tweaks} setState={setTweaks} onClose={() => setTweakOpen(false)} />
      <RoleSwitcher
        open={roleSwitcherOpen}
        current={role}
        onSelect={selectRole}
        onClose={() => setRoleSwitcherOpen(false)}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
