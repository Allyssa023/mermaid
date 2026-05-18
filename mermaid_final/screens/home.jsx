/* MERMAID — Home screen
   Features sourced from the actual codebase:
   Spring Boot backend with controllers for Auth, Marine, Advisories, Trips,
   CatchAlerts, Deals, Vendor Storefronts, Buyer Marketplace, Orders, Reviews,
   Xendit payments, BFAR reference prices, real-time STOMP chat, SMS alerts.
*/

function HomeScreen({ onNav }) {
  return (
    <div data-screen-label="Home">
      <NavBar current="home" onNav={onNav} polarity="dark" />

      {/* ----------- Hero ----------- */}
      <section className="hero">
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 28 }}>
            <Pill>Marine Safety & Market Information Dashboard</Pill>
          </div>

          <h1 className="hero__headline">
            Trip safety. Fair catch prices. Direct-to-buyer <LimeChip>commerce</LimeChip>.
          </h1>

          <p className="hero__sub">
            MERMAID is the operational layer for Filipino coastal communities — connecting fishermen, vendors, and buyers around one console with BFAR-backed pricing, real-time advisories, and built-in payments.
          </p>

          <div className="hero__cta">
            <button className="btn btn--lime btn--glow" onClick={() => window.open('http://localhost:3000', '_blank')}>Get started <Icon name="arrow-right" size={14} /></button>
            <button className="btn btn--ghost" onClick={() => onNav('services')}>Explore platform</button>
          </div>

          {/* mascot */}
          <div style={{ position: 'absolute', right: -20, top: -30, pointerEvents: 'none' }}>
            <MarineMascot kind="whale" size={240} />
          </div>
        </div>

        {/* dashboard mock — overflows into the dark band below */}
        <div className="container" style={{ marginTop: 80, position: 'relative', zIndex: 2 }}>
          <DashboardMock tilt={-1.5} />
        </div>
      </section>

      {/* ----------- Roles strip ----------- */}
      <section className="partners">
        <div className="container">
          <div className="partners__caption">One platform · four roles · one shared catch-to-buyer pipeline</div>
          <div className="partners__row">
            {[
              { label: 'FISHERMEN', icon: 'ship' },
              { label: 'VENDORS', icon: 'cart' },
              { label: 'BUYERS', icon: 'fish' },
              { label: 'ADMIN · BFAR', icon: 'shield' }
            ].map(r => (
              <span key={r.label} className="partner-logo">
                <Icon name={r.icon} size={16} color="#3ee2ff" />
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ----------- Four pillars ----------- */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-head">
            <div>
              <Eyebrow>What's inside MERMAID</Eyebrow>
              <h2 className="section-head__title section-head__title--dark">
                Four pillars. One signed-in session for every role on your coast.
              </h2>
            </div>
            <button className="btn btn--ghost" onClick={() => onNav('services')}>All features <Icon name="arrow-right" size={14} /></button>
          </div>

          <div className="feature-grid">
            <FeatureCard
              icon="shield"
              eyebrow="Marine safety"
              title="Advisories + a 6-point trip checklist."
              body="Real-time sea conditions and BFAR/PAGASA advisories surface in the app before a vessel leaves the dock. Trips can't start until the safety checklist is signed off."
              linkLabel="Trips · advisories"
            />
            <FeatureCard
              icon="fish"
              eyebrow="Catch alerts & deals"
              title="Post a catch from the deck. Get vendor offers back."
              body="Skippers post catch alerts with species and weight. Verified vendors send price-and-quantity deals. Accept, counter, or let the offer expire."
              linkLabel="Catch alerts · deals"
            />
            <FeatureCard
              icon="cart"
              eyebrow="Vendor storefront"
              title="Inventory, procurement, payouts — one workspace."
              body="Vendors run a public shop, manage inventory lots, browse the procurement feed, and settle payouts. Reviews and analytics included."
              linkLabel="Storefront tools"
            />
            <FeatureCard
              icon="chart"
              eyebrow="BFAR-aware pricing"
              title="Every price, against the BFAR reference."
              body="Catch alerts, earnings, and vendor analytics all show the BFAR Region I midpoint side-by-side. Skippers see the price gap on every trip."
              spotlight
              linkLabel="Earnings analytics"
            />
          </div>
        </div>
      </section>

      {/* ----------- Live coastal grid (map mock) ----------- */}
      <section className="section section--dark" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center' }} className="home-live">
            <div>
              <Eyebrow>Real-time coastal feed</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3.6vw, 48px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 18px', color: '#fff', letterSpacing: '-0.4px' }}>
                Every active trip, every advisory, on one map.
              </h2>
              <p style={{ color: 'var(--on-dark-muted)', fontSize: 16, lineHeight: 1.7, margin: 0, maxWidth: 440 }}>
                Trip GPS pings, marine condition feeds, and BFAR advisories all post into the same view. Co-op coordinators and BFAR officers share an operational picture instead of a WhatsApp group.
              </p>
              <ul className="split__list">
                <li>Trip sessions with start-checklist + automatic GPS</li>
                <li>Advisories pushed by SMS, in-app, and email simultaneously</li>
                <li>Region-aware fan-out — Pangasinan stays in Pangasinan</li>
              </ul>
              <button className="btn btn--lime" onClick={() => onNav('services')}>Explore platform <Icon name="arrow-right" size={14} /></button>
            </div>
            <MapBoard />
          </div>
        </div>
      </section>

      {/* ----------- Stats strip ----------- */}
      <section className="section section--dark" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="stats-strip">
            <div className="stats-strip__cell">
              <div className="stats-strip__num">4</div>
              <div className="stats-strip__label">Roles in one app — fisherman, vendor, buyer, BFAR admin.</div>
            </div>
            <div className="stats-strip__cell">
              <div className="stats-strip__num">BFAR</div>
              <div className="stats-strip__label">Region I NCPMR reference prices behind every catch alert.</div>
            </div>
            <div className="stats-strip__cell">
              <div className="stats-strip__num">&lt;4s</div>
              <div className="stats-strip__label">STOMP-powered chat between fishermen and vendors during a deal.</div>
            </div>
            <div className="stats-strip__cell">
              <div className="stats-strip__num">Xendit</div>
              <div className="stats-strip__label">Buyer checkout via GCash, Maya, card, and bank transfer.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------- How it works ----------- */}
      <section className="section section--light">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
            <Eyebrow light>How it works</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 18px', color: 'var(--ink-deep)', letterSpacing: '-0.4px' }}>
              From the trip checklist to the buyer's cart.
            </h2>
            <p style={{ color: '#5b5670', fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              MERMAID replaces a tangle of phone calls, paper logs, and aggregator commissions with one signed pipeline that runs from the dock to the dining table.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { n: '01', icon: 'ship',  title: 'Fisherman logs a trip',
                body: 'Sign off the 6-point safety checklist, start the trip, and log catches as they happen. Advisories are pushed live to every active trip.' },
              { n: '02', icon: 'fish',  title: 'Post a catch alert',
                body: 'Catch alert fans out to nearby vendors. They send back price-and-quantity deals — accept, counter, or let them expire. BFAR midpoint shown on every offer.' },
              { n: '03', icon: 'cart',  title: 'Vendor lists it. Buyer buys it.',
                body: 'Vendor lots go straight to the public shop. Buyers browse the marketplace, pay through Xendit, and confirm handoff with a one-tap receipt.' }
            ].map(s => (
              <div key={s.n} className="value-tile" style={{ padding: 32, gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, color: 'var(--accent-violet-deep)', letterSpacing: '-1px' }}>{s.n}</span>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--ink-deep)', color: 'var(--accent-lime)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={22} />
                  </div>
                </div>
                <h3 className="value-tile__title" style={{ fontSize: 22 }}>{s.title}</h3>
                <p className="value-tile__body" style={{ fontSize: 15 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------- Testimonials ----------- */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-head">
            <div>
              <Eyebrow>From the coast</Eyebrow>
              <h2 className="section-head__title section-head__title--dark">
                What people in Region I say after a season on MERMAID.
              </h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { who: 'Mang Edgar Bautista', role: 'Skipper · Lingayen', initial: 'EB',
                quote: "Before MERMAID I'd take whatever the aggregator gave. Now I see the BFAR price on the alert and three vendors bid right there. Last trip I cleared ₱4,200 more for the same yellowfin." },
              { who: 'Aling Nena Domingo', role: 'Vendor · Dagupan Wet Market', initial: 'AN',
                quote: "I used to leave at 3am hoping the boats had skipjack. Now my procurement feed tells me which trips are coming in, and I lock in the deal before they dock." },
              { who: 'Ofc. Karla Mendoza', role: 'BFAR Officer · Region I', initial: 'KM',
                quote: "We post a gale advisory once and it reaches every active trip in twenty seconds. The fan-out used to take us a full morning of phone calls." }
            ].map(q => (
              <div key={q.who} className="quote-card">
                <p className="quote-card__text">"{q.quote}"</p>
                <div className="quote-card__by">
                  <div className="quote-card__avatar">{q.initial}</div>
                  <div>
                    <div className="quote-card__name">{q.who}</div>
                    <div className="quote-card__role">{q.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------- CTA band ----------- */}
      <section className="cta-band">
        <div className="container">
          <div className="cta-band__inner">
            <div>
              <Eyebrow>Ready to onboard</Eyebrow>
              <h2 className="cta-band__title" style={{ marginTop: 12 }}>
                Bring your co-op, your wet market, or your district onto <LimeChip>MERMAID</LimeChip>.
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--lime" onClick={() => window.open('http://localhost:3000', '_blank')}>Get started <Icon name="arrow-right" size={14} /></button>
              <button className="btn btn--ghost" onClick={() => onNav('cases')}>See case studies</button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

window.HomeScreen = HomeScreen;
