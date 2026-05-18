// app.jsx — root with tweaks + routing

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "lime",
  "density": "regular",
  "showSuperCTA": true,
  "rail": "expanded",
  "freshnessPct": 67
}/*EDITMODE-END*/;

const ACCENTS = {
  lime:   { color: '#c2ef4e', name: 'Lime · Sentri default' },
  tide:   { color: '#5ec8e6', name: 'Tide teal' },
  kelp:   { color: '#46d39a', name: 'Kelp green' },
  coral:  { color: '#fa7faa', name: 'Coral pink' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [collapsed, setCollapsed] = React.useState(t.rail === 'collapsed');
  const [active, setActive] = React.useState('dashboard');
  const [mode, setMode] = React.useState('vendor');
  const data = window.MERMAID_DATA;

  // Reflect accent into CSS var
  React.useEffect(() => {
    const acc = ACCENTS[t.accent] || ACCENTS.lime;
    document.documentElement.style.setProperty('--accent-lime', acc.color);
  }, [t.accent]);

  React.useEffect(() => {
    setCollapsed(t.rail === 'collapsed');
  }, [t.rail]);

  // Densities
  const densityVars = {
    compact: { '--rail-w': '244px', '--topbar-h': '56px' },
    regular: { '--rail-w': '260px', '--topbar-h': '64px' },
    spacious:{ '--rail-w': '280px', '--topbar-h': '72px' },
  }[t.density] || {};

  return (
    <React.Fragment>
      <div className="app-bg" />
      <div className={`shell${collapsed ? ' is-collapsed' : ''}`} style={densityVars}>
        <Sidebar
          collapsed={collapsed}
          setCollapsed={(fn) => {
            const next = typeof fn === 'function' ? fn(collapsed) : fn;
            setCollapsed(next);
            setTweak('rail', next ? 'collapsed' : 'expanded');
          }}
          active={active}
          setActive={setActive}
          mode={mode}
          setMode={setMode}
          data={data}
          tweaks={t}
        />
        <div className="main">
          <Topbar data={data} active={active} />
          {(() => {
            switch (active) {
              case 'dashboard':   return <Dashboard data={data} tweaks={t} />;
              case 'storefront':  return <StorefrontView data={data} />;
              case 'inventory':   return <InventoryView data={data} />;
              case 'orders':      return <OrdersView data={data} />;
              case 'procurement': return <SourceCatchView data={data} />;
              case 'messages':    return <MessagesView data={data} />;
              case 'analytics':   return <AnalyticsView data={data} />;
              case 'advisory':    return <AdvisoryView data={data} />;
              case 'reviews':     return <ReviewsView data={data} />;
              case 'shop':        return <ShopProfileView data={data} />;
              default:            return <Dashboard data={data} tweaks={t} />;
            }
          })()}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Brand accent" />
        <TweakColor
          label="Accent color"
          value={t.accent}
          options={Object.keys(ACCENTS).map(k => ACCENTS[k].color)}
          onChange={(hex) => {
            const key = Object.keys(ACCENTS).find(k => ACCENTS[k].color === hex) || 'lime';
            setTweak('accent', key);
          }}
        />
        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={['compact', 'regular', 'spacious']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakRadio
          label="Sidebar"
          value={t.rail}
          options={['expanded', 'collapsed']}
          onChange={(v) => setTweak('rail', v)}
        />
        <TweakToggle
          label="Show Super CTA"
          value={t.showSuperCTA}
          onChange={(v) => setTweak('showSuperCTA', v)}
        />
        <TweakSection label="Featured listing" />
        <TweakSlider
          label="Freshness window"
          value={t.freshnessPct}
          min={0} max={100} step={1} unit="%"
          onChange={(v) => setTweak('freshnessPct', v)}
        />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
