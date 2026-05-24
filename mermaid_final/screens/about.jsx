/* MERMAID — About screen (Philippines / BFAR context) */

function AboutScreen({ onNav }) {
  return (
    <div data-screen-label="About">
      <NavBar current="about" onNav={onNav} polarity="dark" />

      {/* hero */}
      <section className="page-hero">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56, alignItems: 'center' }}>
            <div>
              <Eyebrow>About MERMAID</Eyebrow>
              <h1 className="page-hero__title" style={{ marginTop: 12 }}>
                Built by people who grew up <LimeChip>closest</LimeChip> to the water.
              </h1>
              <p className="page-hero__sub">
                MERMAID is a Marine Safety and Market Information Dashboard for the Philippine coastal economy. We started with one co-op in Lingayen and a hunch: that fishermen, vendors, buyers, and BFAR officers were all solving the same five problems on five different group chats.
              </p>
            </div>
            <div style={{ position: 'relative', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="mascot-mermaid-wrap" aria-hidden="true">
                <img src="assets/mermaid.png" alt="" className="mascot" width={4000} height={2660} loading="eager" decoding="async" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* mission */}
      <section className="section section--light">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'start' }} className="about-mission">
            <div>
              <Eyebrow light>Our mission</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 500, lineHeight: 1.15, margin: '12px 0 0', color: 'var(--ink-deep)', letterSpacing: '-0.3px' }}>
                Coastal infrastructure for the Filipino fisherfolk economy.
              </h2>
            </div>
            <div>
              <p style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-deep)', margin: 0, fontWeight: 500 }}>
                A 4am phone tree decides whether boats leave the dock. An aggregator's "going rate" decides what a kilo of yellowfin is worth. A handwritten ledger decides who got paid this week.
              </p>
              <p style={{ fontSize: 16, lineHeight: 2.0, color: '#5b5670', margin: '20px 0 0' }}>
                MERMAID replaces those three decisions with one signed-in pipeline. BFAR advisories reach every active trip in twenty seconds. Catch alerts ship with the BFAR Region I midpoint price baked in. Vendors run a public shop with Xendit at checkout, and every payout has a receipt.
              </p>
              <p style={{ fontSize: 16, lineHeight: 2.0, color: '#5b5670', margin: '12px 0 0' }}>
                We work with co-ops, wet markets, restaurant buyers, and the BFAR Region I office. We don't onboard one without conversation with the others — the whole point is that they share the same operational picture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* values */}
      <section className="section section--cloud">
        <div className="container">
          <div className="section-head" style={{ alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <Eyebrow light>What we believe</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3.6vw, 46px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 0', color: 'var(--ink-deep)', letterSpacing: '-0.4px' }}>
                Five things that don't change between releases.
              </h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: 'anchor', title: 'Stay close to the dock.',
                body: 'Every feature is reviewed by a working skipper, a wet-market vendor, or a BFAR officer before it ships. If they don\'t see the value, it doesn\'t go in.' },
              { icon: 'shield', title: 'Safety is non-skippable.',
                body: 'No trip starts without the six-point checklist signed. No catch alert posts without a vessel + safety contact on the profile.' },
              { icon: 'chart',  title: 'Pricing is a public number.',
                body: 'Every catch alert and every vendor offer is shown next to the BFAR Region I midpoint. The market gets the same number the regulator gets.' },
              { icon: 'globe',  title: 'Local before global.',
                body: 'We ship in Tagalog and English first. Every advisory is region-scoped. We pay vendor support staff in the cities they live in.' },
              { icon: 'route',  title: 'Show the work.',
                body: 'Order timelines, payout ledgers, and dispute trails are first-class — auditable by buyer, vendor, fisherman, and BFAR.' }
            ].map(v => (
              <div key={v.title} className="value-tile">
                <div className="value-tile__icon"><Icon name={v.icon} size={20} /></div>
                <h3 className="value-tile__title">{v.title}</h3>
                <p className="value-tile__body">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* timeline */}
      <section className="section section--dark">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64, alignItems: 'start' }} className="about-timeline">
            <div>
              <Eyebrow>The story so far</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3.6vw, 48px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 18px', color: '#fff', letterSpacing: '-0.4px' }}>
                One coast at a time. One feature at a time.
              </h2>
              <p style={{ color: 'var(--on-dark-muted)', fontSize: 16, lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
                Every milestone here corresponds to a Filipino coast that became measurably safer, fairer-priced, or better-paid than the one before.
              </p>
            </div>

            <div className="timeline">
              <div className="timeline__item">
                <div className="timeline__year">2024 · Q1</div>
                <div className="timeline__title">First pilot · Lingayen Co-op</div>
                <p className="timeline__body">Six skippers, a Spring Boot backend, and a TextBee SMS account. First catch alert posted on April 14.</p>
              </div>
              <div className="timeline__item">
                <div className="timeline__year">2024 · Q3</div>
                <div className="timeline__title">BFAR price reference goes live</div>
                <p className="timeline__body">Region I NCPMR midpoint prices imported and surfaced on every catch alert. Aggregator margin drops noticeably in the first month.</p>
              </div>
              <div className="timeline__item">
                <div className="timeline__year">2025 · Q1</div>
                <div className="timeline__title">Vendor storefront + buyer marketplace</div>
                <p className="timeline__body">Public shop pages, lots, cart, favorites, Xendit checkout. Reviews close the buyer loop.</p>
              </div>
              <div className="timeline__item">
                <div className="timeline__year">2025 · Q3</div>
                <div className="timeline__title">Deals + real-time chat</div>
                <p className="timeline__body">STOMP-over-WebSocket chat ships. Catch alert → deal → handoff confirmation runs end-to-end in one session.</p>
              </div>
              <div className="timeline__item">
                <div className="timeline__year">2026 · Q1</div>
                <div className="timeline__title">Earnings, payouts, disputes</div>
                <p className="timeline__body">Fisherman earnings ledger with BFAR price-gap analytics. Order disputes routed through admin. Region I goes fully production.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* team */}
      <section className="section section--light">
        <div className="container">
          <div className="section-head" style={{ alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <Eyebrow light>The team</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3.6vw, 46px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 0', color: 'var(--ink-deep)', letterSpacing: '-0.4px' }}>
                A small team. Distributed up and down the coast.
              </h2>
            </div>
            <span style={{ fontSize: 14, color: '#79628c' }}>12 people · 4 cities · BFAR-coordinated</span>
          </div>
          <div className="team-grid">
            {[
              { name: 'Lia Dela Cruz',     role: 'Co-founder · CEO',         initial: 'LD', bio: 'Grew up in Dagupan. PM background. Built the first MERMAID catch alert by hand.' },
              { name: 'Zaimond Reyes',     role: 'Co-founder · CTO',         initial: 'ZR', bio: 'Spring Boot, Postgres, STOMP. Spent a season on a yellowfin trip before designing the trip checklist.' },
              { name: 'Mark Anthony Lopez', role: 'Head of Coastal Ops',     initial: 'ML', bio: 'Former Lingayen Co-op coordinator. Now keeps every onboarding co-op talking to BFAR.' },
              { name: 'Joanna Castillo',   role: 'Lead Designer',            initial: 'JC', bio: 'Designed the fisherman, vendor, and buyer consoles from one shared design system.' },
              { name: 'Diego Sarmiento',   role: 'Marketplace Engineer',     initial: 'DS', bio: 'Owns the vendor storefront and Xendit checkout flow. Reads Order timelines for fun.' },
              { name: 'Karla Yap',         role: 'BFAR Liaison',             initial: 'KY', bio: 'Coordinates with BFAR Region I on price feeds and advisory protocols.' },
              { name: 'Renz Aquino',       role: 'Data Engineer',            initial: 'RA', bio: 'Maintains the BFAR price pipeline and the catch-alert fan-out service.' },
              { name: 'Tin Manalo',        role: 'Customer Success',         initial: 'TM', bio: 'Onboards co-ops and wet markets. Answers the support line in Tagalog or English.' }
            ].map(p => (
              <div key={p.name} className="team-card">
                <div className="team-card__avatar">{p.initial}</div>
                <div className="team-card__name">{p.name}</div>
                <div className="team-card__role">{p.role}</div>
                <p className="team-card__bio">{p.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* coverage stats */}
      <section className="section section--dark" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="stats-strip">
            <div className="stats-strip__cell">
              <div className="stats-strip__num">2024</div>
              <div className="stats-strip__label">Founded in Dagupan. First catch alert posted in Lingayen Gulf.</div>
            </div>
            <div className="stats-strip__cell">
              <div className="stats-strip__num">4</div>
              <div className="stats-strip__label">Roles in one platform — fisherman, vendor, buyer, BFAR admin.</div>
            </div>
            <div className="stats-strip__cell">
              <div className="stats-strip__num">Region I</div>
              <div className="stats-strip__label">BFAR NCPMR reference prices behind every catch alert today.</div>
            </div>
            <div className="stats-strip__cell">
              <div className="stats-strip__num">Open</div>
              <div className="stats-strip__label">Order timelines, payout ledgers, dispute trails — all auditable.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="cta-band">
        <div className="container">
          <div className="cta-band__inner">
            <div>
              <Eyebrow>Working together</Eyebrow>
              <h2 className="cta-band__title" style={{ marginTop: 12 }}>
                Run a co-op, wet market, or BFAR district? Let's <LimeChip>talk</LimeChip>.
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Get in touch <Icon name="arrow-right" size={14} /></button>
              <button className="btn btn--ghost" onClick={() => onNav('cases')}>See case studies</button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

window.AboutScreen = AboutScreen;
