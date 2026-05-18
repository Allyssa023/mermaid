/* Sentri Web — tiny client-side router. Hash-based, no library. */

const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [screen, setScreen] = useStateApp(() => (window.location.hash || '#home').slice(1) || 'home');
  const [toast, setToast] = useStateApp(null);

  useEffectApp(() => {
    const onHash = () => setScreen((window.location.hash || '#home').slice(1) || 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffectApp(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffectApp(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  const nav = (next) => {
    window.location.hash = '#' + next;
    setScreen(next);
  };

  let view;
  switch (screen) {
    case 'pricing': view = <PricingScreen onNav={nav} />; break;
    case 'contact': view = <ContactScreen onNav={nav} onToast={setToast} />; break;
    case 'monitor': view = <ErrorMonitoringScreen onNav={nav} />; break;
    default:        view = <HomeScreen onNav={nav} />;
  }

  return (
    <>
      {view}
      <Toast message={toast} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
