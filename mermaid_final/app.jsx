/* MERMAID — tiny hash router. */

const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [screen, setScreen] = useStateApp(() => (window.location.hash || '#home').slice(1) || 'home');
  const [toast, setToast]   = useStateApp(null);

  useEffectApp(() => {
    const onHash = () => setScreen((window.location.hash || '#home').slice(1) || 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffectApp(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffectApp(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  const nav = (next) => {
    window.location.hash = '#' + next;
    setScreen(next);
  };

  // Strip any sub-route fragments (e.g. '#advisories' inside services hashes)
  const root = screen.split('?')[0].split('/')[0];

  let view;
  switch (root) {
    case 'services': view = <ServicesScreen onNav={nav} />; break;
    case 'about':    view = <AboutScreen onNav={nav} />; break;
    case 'cases':    view = <CasesScreen onNav={nav} />; break;
    case 'contact':  view = <ContactScreen onNav={nav} onToast={setToast} />; break;
    default:         view = <HomeScreen onNav={nav} />;
  }

  return (
    <>
      {view}
      <Toast message={toast} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
