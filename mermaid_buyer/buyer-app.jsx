// MERMAID Buyer Dashboard — Main app
// Globals: React, ReactDOM, I, BUYER_DATA, BUYER_SPARK, BuyerSidebar, BuyerTopbar,
//          BuyerKpiCard, BuyerPromoCard, BuyerFeaturedCard, BuyerAdvisoryCard,
//          BuyerOrdersTable, MarketplaceGrid, SavedVendorsCard, BuyerActivityCard,
//          TweaksPanel, useTweaks, TweakSection, TweakToggle, TweakRadio

const { useState: useStateBA, useEffect: useEffectBA } = React;

const BUYER_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "violet",
  "density": "comfortable",
  "showAdvisory": true,
  "showRecommendations": true
}/*EDITMODE-END*/;

function BuyerApp() {
  const [active, setActive] = useStateBA("home");
  const [collapsed, setCollapsed] = useStateBA(false);
  const [tweaks, setTweak] = useTweaks(BUYER_TWEAK_DEFAULTS);

  const onNavigate = (key) => {
    if (key === "logout") return;
    setActive(key);
  };

  useEffectBA(() => {
    const map = {
      violet: { primary: "#6a5fc1", deep: "#422082" },
      lime:   { primary: "#c2ef4e", deep: "#84cc16" },
      aqua:   { primary: "#5eead4", deep: "#14b8a6" },
      pink:   { primary: "#fa7faa", deep: "#ec4899" },
    };
    const c = map[tweaks.accent] || map.violet;
    document.documentElement.style.setProperty("--accent-violet", c.primary);
    document.documentElement.style.setProperty("--accent-violet-deep", c.deep);
  }, [tweaks.accent]);

  return (
    <div className="app" data-rail={collapsed ? "collapsed" : "expanded"} data-density={tweaks.density} data-screen-label="Buyer Dashboard">
      <BuyerSidebar active={active} onNavigate={onNavigate}
                    collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}/>
      <main className="main">
        <BuyerTopbar/>
        <div className="content">
          {active === "home"      && <BuyerDashboardPage tweaks={tweaks}/>}
          {active === "browse"    && <MarketplacePage onBack={() => setActive("home")}/>}
          {active === "cart"      && <CartPage        onBack={() => setActive("home")}/>}
          {active === "orders"    && <OrdersPage      onBack={() => setActive("home")}/>}
          {active === "saved"     && <SavedPage       onBack={() => setActive("home")}/>}
          {active === "advisory"  && <AdvisoryPage    onBack={() => setActive("home")}/>}
          {active === "messages"  && <MessagesPage    onBack={() => setActive("home")}/>}
          {active === "profile"   && <ProfilePage     onBack={() => setActive("home")}/>}
        </div>
      </main>

      <TweaksPanel title="Tweaks" defaultOpen={false} initialPos={{right: 16, bottom: 16}}>
        <TweakSection title="Accent">
          <TweakRadio label="Accent color" value={tweaks.accent} onChange={v => setTweak("accent", v)}
            options={[
              {value:"violet", label:"Violet"},
              {value:"lime",   label:"Lime"},
              {value:"aqua",   label:"Aqua"},
              {value:"pink",   label:"Pink"},
            ]}/>
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio label="Spacing" value={tweaks.density} onChange={v => setTweak("density", v)}
            options={[
              {value:"compact",     label:"Compact"},
              {value:"comfortable", label:"Comfortable"},
            ]}/>
        </TweakSection>
        <TweakSection title="Modules">
          <TweakToggle label="Marine advisory panel"
                       value={tweaks.showAdvisory}
                       onChange={v => setTweak("showAdvisory", v)}/>
          <TweakToggle label="Marketplace recommendations"
                       value={tweaks.showRecommendations}
                       onChange={v => setTweak("showRecommendations", v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function BuyerDashboardPage({ tweaks }) {
  const k = BUYER_DATA.kpis;
  const pendingOrders = BUYER_DATA.orders.filter(o => o.status === "pending");
  const confirmedOrders = BUYER_DATA.orders.filter(o => o.status === "confirmed");
  const spendByVendor = [
    { title: "Aqua Pearl Seafoods", sub: "8 orders · 38%",  value: "₱18,420", color: "#fbbf24" },
    { title: "Bicol Reef Direct",   sub: "4 orders · 25%",  value: "₱12,180", color: "#60a5fa" },
    { title: "Tideline Coastal",    sub: "3 orders · 20%",  value: "₱9,640",  color: "#fa7faa" },
  ];
  return (
    <>
      <div className="page-head">
        <div className="page-head__eyebrow">
          Recommended for the next 24h
          <span className="page-head__count">3 ports</span>
        </div>
        <div className="page-head__row">
          <h1 className="page-head__title">
            Freshest <em style={{background:"var(--accent-lime)", color:"var(--ink-deep)", padding:"0 10px", borderRadius:6, fontStyle:"normal"}}>catch</em> for you
          </h1>
          <div className="page-head__filters">
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>24H</strong></button>
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>Within 10km</strong></button>
            <button className="filter-pill"><I.ChevronDown size={12}/> <strong>Recommended</strong></button>
          </div>
        </div>
      </div>

      {/* Top KPI row + promo */}
      <div className="top-row">
        <div className="kpi-grid">
          <BuyerKpiCard
            badgeEyebrow="Orders · open"
            badgeTitle="Pending"
            iconKey="Inbox"
            label="Awaiting vendor confirm"
            value={k.pending.count}
            deltaPct={k.pending.deltaPct}
            sparkColor="#fbbf24"
            rows={{
              headLeft: "Awaiting vendor",
              headRight: "Total",
              items: pendingOrders.slice(0, 3).map(o => ({
                title: `${o.species} · ${o.vendor.split(" ")[0]}`,
                sub: `${o.code} · ${o.qty}kg`,
                value: `₱${o.total.toLocaleString()}`,
                color: "#fbbf24",
              })),
            }}/>
          <BuyerKpiCard
            badgeEyebrow="Orders · prep"
            badgeTitle="Confirmed"
            iconKey="Truck"
            label="In cold-chain dispatch"
            value={k.confirmed.count}
            deltaPct={k.confirmed.deltaPct}
            sparkColor="#5eead4"
            rows={{
              headLeft: "Next handoff",
              headRight: "ETA",
              items: confirmedOrders.slice(0, 3).map(o => ({
                title: `${o.species} · ${o.vendor.split(" ")[0]}`,
                sub: `${o.code} · ${o.qty}kg`,
                value: o.eta.replace("Today · ", ""),
                color: "#5eead4",
              })),
            }}/>
          <BuyerKpiCard
            badgeEyebrow="Spend · 30d"
            badgeTitle="This month"
            iconKey="PieChart"
            label="Total purchase value"
            currency="₱"
            value="48,230"
            deltaPct={k.spendMonth.deltaPct}
            sparkColor="#a78bfa"
            rows={{
              headLeft: "Top vendors",
              headRight: "Spend",
              items: spendByVendor,
            }}/>
        </div>
        <BuyerPromoCard/>
      </div>

      {/* Featured fresh listing */}
      <BuyerFeaturedCard/>

      {/* Orders + advisory */}
      <div className="split-3">
        <BuyerOrdersTable/>
        {tweaks.showAdvisory ? <BuyerAdvisoryCard/> : <BuyerActivityCard/>}
      </div>

      {/* Marketplace + saved vendors */}
      {tweaks.showRecommendations && (
        <div className="split-2">
          <MarketplaceGrid/>
          <SavedVendorsCard/>
        </div>
      )}

      {/* Activity feed last */}
      {tweaks.showAdvisory && <BuyerActivityCard/>}
    </>
  );
}

function BuyerPagePlaceholder({ pageKey, onBack }) {
  const labels = {
    browse: "Marketplace", cart: "Cart", orders: "My orders", saved: "Saved",
    advisory: "Marine advisory", messages: "Messages", profile: "Profile",
  };
  const label = labels[pageKey] || pageKey;
  return (
    <>
      <div className="page-head">
        <div className="page-head__eyebrow">Workspace · buyer</div>
        <div className="page-head__row">
          <h1 className="page-head__title">{label}</h1>
          <button className="btn" onClick={onBack}><I.ChevronLeft size={12}/> Back to dashboard</button>
        </div>
      </div>
      <div className="card" style={{padding:"48px 32px", textAlign:"center"}}>
        <div style={{display:"inline-grid", placeItems:"center", width:56, height:56, borderRadius:14,
                     background:"var(--layer-3)", marginBottom:16}}>
          <I.Layers size={24}/>
        </div>
        <h2 style={{fontFamily:"var(--font-display)", fontSize:24, margin:"0 0 8px"}}>{label}</h2>
        <p className="muted" style={{maxWidth:480, margin:"0 auto", fontSize:13}}>
          Dedicated {label.toLowerCase()} surface lives here. Dashboard is the focus for this turn — say the word and I'll flesh out this destination next.
        </p>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BuyerApp />);
