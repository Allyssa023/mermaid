/* MERMAID — Case Studies screen
   PH-context personas + outcomes tied to real features from the codebase.
*/

const { useState: useStateCases } = React;

function CasesScreen({ onNav }) {
  const [filter, setFilter] = useStateCases('all');

  const cases = [
    {
      tag: 'Fishing co-op', cat: 'coop',
      title: 'Lingayen Co-op trims aggregator margin from 8% to 1.4%',
      desc: 'Skippers post catch alerts from the deck and three vendors bid live. The dawn-time aggregator who used to set the price now bids alongside everyone else.',
      metrics: [['8% → 1.4%', 'Aggregator margin'], ['+₱4,200', 'Avg trip uplift'], ['6 mo', 'In production']]
    },
    {
      tag: 'Wet market vendor', cat: 'vendor',
      title: 'Aling Nena Fish runs a public shop with 312 verified reviews',
      desc: 'A slug-based storefront (mermaid.ph/shop/aling-nena) replaced a Facebook page. Inventory lots, payouts, and review responses all in one workspace.',
      metrics: [['312', 'Verified reviews'], ['★ 4.8', 'Avg rating'], ['+27%', 'Repeat buyers']]
    },
    {
      tag: 'BFAR Region I', cat: 'authority',
      title: 'Region I cuts advisory fan-out from a morning to 20 seconds',
      desc: 'Gale warnings post once to MERMAID and reach every active trip by SMS, in-app, and email simultaneously. No more municipal-by-municipal phone trees.',
      metrics: [['~20s', 'Fan-out latency'], ['312', 'Active trips reached'], ['3 channels', 'SMS · in-app · email']]
    },
    {
      tag: 'Restaurant buyer', cat: 'buyer',
      title: 'Vigan Heritage Café sources direct, pays through Xendit',
      desc: 'The chef sees fresh-caught lots in the marketplace by 5am, locks them in by 6am, picks them up by 7. Xendit settles before the kitchen opens.',
      metrics: [['5–7am', 'Source-to-pickup'], ['100%', 'Cold-chain visible'], ['0', 'Aggregator hops']]
    },
    {
      tag: 'Fisherman', cat: 'fisherman',
      title: 'Mang Edgar tracks his BFAR price-gap every season',
      desc: 'The earnings ledger shows every catch alongside the BFAR Region I midpoint. He now negotiates from a number, not a feeling.',
      metrics: [['+₱18/kg', 'Avg gap closed'], ['72', 'Trips logged'], ['12 species', 'Tracked']]
    },
    {
      tag: 'Coast safety', cat: 'authority',
      title: 'Zambales SAR responds 11 minutes faster on overdue trips',
      desc: 'A skipper marked overdue triggers an SAR escalation with vessel + safety-contact details auto-populated from the fisherman profile.',
      metrics: [['11 min', 'Faster SAR'], ['100%', 'Vessel info'], ['Auto', 'Escalation route']]
    }
  ];

  const filtered = filter === 'all' ? cases : cases.filter(c => c.cat === filter);

  return (
    <div data-screen-label="Case studies">
      <NavBar current="cases" onNav={onNav} polarity="dark" />

      {/* hero */}
      <section className="page-hero">
        <div className="container">
          <Eyebrow>Case studies</Eyebrow>
          <h1 className="page-hero__title" style={{ marginTop: 12 }}>
            How Region I put MERMAID into the <LimeChip>water</LimeChip>.
          </h1>
          <p className="page-hero__sub">
            Six stories from the skippers, vendors, restaurant buyers, and BFAR officers who use MERMAID every day along the Northern Luzon coast.
          </p>
        </div>
      </section>

      {/* featured case */}
      <section className="section--dark" style={{ paddingTop: 56, paddingBottom: 24 }}>
        <div className="container">
          <div className="case-feature">
            <div className="case-feature__media">
              <svg viewBox="0 0 600 480" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="cf-water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#422082"/>
                    <stop offset="1" stopColor="#150f23"/>
                  </linearGradient>
                </defs>
                <rect width="600" height="480" fill="url(#cf-water)"/>
                {Array.from({ length: 80 }).map((_, i) => {
                  const x = (i * 73) % 600;
                  const y = (i * 41) % 220;
                  return <circle key={i} cx={x} cy={y} r={(i % 3) * 0.6 + 0.4} fill="#fff" opacity={(i % 5) * 0.07 + 0.18} />;
                })}
                <path d="M 0 320 C 80 300, 160 360, 220 330 C 280 304, 320 380, 410 350 C 480 326, 540 400, 600 360 L 600 480 L 0 480 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(62,226,255,0.5)" strokeWidth="1.4"/>
                <g>
                  <circle cx="120" cy="260" r="4" fill="#3ee2ff"/>
                  <circle cx="120" cy="260" r="14" fill="none" stroke="#3ee2ff" strokeWidth="1" opacity="0.5"/>
                </g>
                <circle cx="260" cy="290" r="4" fill="#3ee2ff"/>
                <circle cx="360" cy="240" r="4" fill="#fa7faa"/>
                <circle cx="460" cy="280" r="4" fill="#3ee2ff"/>
                <path d="M 120 260 C 200 220, 320 260, 460 280" stroke="#3ee2ff" strokeWidth="1.2" strokeDasharray="3 4" fill="none" opacity="0.7"/>
              </svg>
              <div style={{ position: 'absolute', top: 24, left: 24 }}>
                <Pill variant="lime">Featured · Lingayen Co-op</Pill>
              </div>
              <div style={{ position: 'absolute', bottom: 24, left: 24, padding: '12px 14px', background: 'rgba(21,15,35,0.78)', border: '1px solid var(--hairline-violet)', borderRadius: 10, fontFamily: 'var(--font-code)', fontSize: 11, color: '#fff' }}>
                <div style={{ color: 'var(--accent-lime)' }}>● LINGAYEN GULF — LIVE</div>
                <div style={{ color: 'var(--on-dark-muted)', marginTop: 4 }}>140 vessels · 3 vendors · BFAR-priced</div>
              </div>
            </div>
            <div className="case-feature__body">
              <Eyebrow>2025 · Featured deployment</Eyebrow>
              <p className="case-feature__quote">"Before MERMAID I'd take whatever the aggregator gave. Now I see the BFAR price on the alert and three vendors bid right there. Last trip I cleared ₱4,200 more for the same yellowfin."</p>
              <div className="case-feature__by">
                <div className="case-feature__avatar">EB</div>
                <div className="case-feature__byline">
                  <strong>Mang Edgar Bautista</strong>
                  Skipper · Lingayen Co-op
                </div>
              </div>

              <div style={{ display: 'flex', gap: 32, marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--hairline-violet)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '-0.5px' }}>8% → 1.4%</div>
                  <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6 }}>Aggregator margin</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '-0.5px' }}>+₱4.2k</div>
                  <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6 }}>Avg trip uplift</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '-0.5px' }}>140</div>
                  <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6 }}>Skippers on platform</div>
                </div>
              </div>

              <button className="btn btn--ghost" style={{ marginTop: 32, alignSelf: 'flex-start' }}>Read the full case <Icon name="arrow-up-right" size={14} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* filter row */}
      <section className="section--dark" style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <Eyebrow>All case studies</Eyebrow>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { k: 'all',       label: 'All' },
                { k: 'fisherman', label: 'Fishermen' },
                { k: 'vendor',    label: 'Vendors' },
                { k: 'buyer',     label: 'Buyers' },
                { k: 'authority', label: 'BFAR · safety' },
                { k: 'coop',      label: 'Co-ops' }
              ].map(t => (
                <button
                  key={t.k}
                  className="btn btn--small"
                  style={{
                    background: filter === t.k ? 'var(--accent-lime)' : 'transparent',
                    color: filter === t.k ? 'var(--ink-deep)' : '#fff',
                    border: filter === t.k ? 'none' : '1px solid var(--hairline-violet)',
                    fontWeight: 600
                  }}
                  onClick={() => setFilter(t.k)}
                >{t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* grid */}
      <section className="section--dark" style={{ paddingTop: 0, paddingBottom: 112 }}>
        <div className="container">
          <div className="case-grid">
            {filtered.map(c => (
              <div key={c.title} className="case-card">
                <div className="case-card__media">
                  <svg viewBox="0 0 600 340" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <linearGradient id={"cg-" + c.title.length} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={
                          c.cat === 'vendor' ? '#422082' :
                          c.cat === 'buyer' ? '#2c1e51' :
                          c.cat === 'fisherman' ? '#1f1633' :
                          c.cat === 'authority' ? '#1a0f33' :
                          '#2c1e51'
                        }/>
                        <stop offset="1" stopColor="#150f23"/>
                      </linearGradient>
                    </defs>
                    <rect width="600" height="340" fill={`url(#cg-${c.title.length})`}/>
                    {Array.from({ length: 30 }).map((_, i) => {
                      const x = (i * 71 + c.title.length * 7) % 600;
                      const y = (i * 33) % 340;
                      return <circle key={i} cx={x} cy={y} r={(i % 3) * 0.5 + 0.4} fill="#fff" opacity={(i % 4) * 0.08 + 0.15} />;
                    })}
                    <path d={`M 0 230 Q 80 ${210 + c.title.length % 20} 160 230 T 320 230 T 480 230 T 640 230`} stroke="rgba(62,226,255,0.55)" strokeWidth="1.4" fill="none" />
                    <path d={`M 0 256 Q 80 ${240 + c.title.length % 14} 160 256 T 320 256 T 480 256 T 640 256`} stroke="rgba(250,127,170,0.45)" strokeWidth="1.2" fill="none" />
                    <g>
                      <circle cx={120 + (c.title.length % 60)} cy="200" r="3" fill="#3ee2ff"/>
                      <circle cx={120 + (c.title.length % 60)} cy="200" r="11" fill="none" stroke="#3ee2ff" strokeWidth="1" opacity="0.5"/>
                    </g>
                    <circle cx={300 + (c.title.length % 80)} cy="170" r="3" fill="#fa7faa"/>
                    <circle cx={460} cy="190" r="3" fill="#3ee2ff"/>
                  </svg>
                  <div className="case-card__tag">
                    <Pill>{c.tag}</Pill>
                  </div>
                </div>
                <div className="case-card__body">
                  <h3 className="case-card__title">{c.title}</h3>
                  <p className="case-card__desc">{c.desc}</p>
                  <div className="case-card__meta">
                    {c.metrics.map(([n, l]) => (
                      <div key={l}>
                        <div className="case-card__metric-num">{n}</div>
                        <div className="case-card__metric-label">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ color: 'var(--on-dark-muted)', padding: '40px 0', textAlign: 'center', fontSize: 14 }}>
              No case studies in this category yet.
            </div>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="cta-band">
        <div className="container">
          <div className="cta-band__inner">
            <div>
              <Eyebrow>Your story next</Eyebrow>
              <h2 className="cta-band__title" style={{ marginTop: 12 }}>
                Run a co-op or wet market already on MERMAID? Let's <LimeChip>publish it</LimeChip>.
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Talk to us <Icon name="arrow-right" size={14} /></button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

window.CasesScreen = CasesScreen;
