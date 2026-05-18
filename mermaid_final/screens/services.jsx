/* MERMAID — Services screen
   Four real pillars from the codebase: marine safety, fisherman tools,
   vendor tools, buyer marketplace — each populated with the controllers,
   services, and domain entities actually shipping.
*/

function ServicesScreen({ onNav }) {
  return (
    <div data-screen-label="Services">
      <NavBar current="services" onNav={onNav} polarity="dark" />

      {/* hero */}
      <section className="page-hero">
        <div className="container">
          <Eyebrow>Platform</Eyebrow>
          <h1 className="page-hero__title" style={{ marginTop: 12 }}>
            Four pillars. One signed-in <LimeChip>session</LimeChip>.
          </h1>
          <p className="page-hero__sub">
            Marine safety, fisherman tools, vendor storefront, and the buyer marketplace — built as separate modules but stitched together by a shared trip → catch → deal → order pipeline so the same kilo of fish carries its provenance from boat to buyer.
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
            {[
              { k: 'safety',    label: 'Marine safety',     icon: 'shield' },
              { k: 'fisherman', label: 'Fisherman tools',   icon: 'ship' },
              { k: 'vendor',    label: 'Vendor storefront', icon: 'cart' },
              { k: 'buyer',     label: 'Buyer marketplace', icon: 'fish' }
            ].map(p => (
              <a key={p.k} href={"#" + p.k} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: '1px solid var(--hairline-violet)', borderRadius: 999, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <Icon name={p.icon} size={16} color="#3ee2ff" />
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ----------- 1. Marine safety ----------- */}
      <section className="section--dark" id="safety">
        <div className="container">
          <div className="split">
            <div>
              <Pill variant="lime">01 · Marine safety</Pill>
              <h2 className="split__title">Advisories + a non-skippable <LimeChip>safety checklist</LimeChip>.</h2>
              <p className="split__body">
                BFAR and PAGASA advisories surface in-app, by SMS via TextBee, and by email — region-scoped so a Pangasinan skipper never sees a Mindoro warning. Every trip starts behind a six-point safety checklist; the "Start trip" button is disabled until all six are signed off.
              </p>
              <ul className="split__list">
                <li>Live marine conditions feed (<code style={{ fontFamily: 'var(--font-code)', fontSize: 13, color: '#3ee2ff' }}>/api/marine</code>)</li>
                <li>Advisories with severity, region, and active-window enforcement</li>
                <li>Trip start blocked behind a 6-point checklist — auditable</li>
                <li>SMS fan-out to every active trip in &lt; 20 seconds</li>
                <li>BFAR officer admin tools to post, edit, or recall advisories</li>
              </ul>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Talk to BFAR onboarding <Icon name="arrow-right" size={14} /></button>
            </div>
            <DashboardMock tilt={-1.5} />
          </div>
        </div>
      </section>

      {/* ----------- 2. Fisherman tools ----------- */}
      <section className="section--dark" id="fisherman" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="split split--reverse">
            <div>
              <Pill variant="lime">02 · Fisherman tools</Pill>
              <h2 className="split__title">Trips, catch logs, alerts, deals — and the <LimeChip>BFAR price</LimeChip> on every line.</h2>
              <p className="split__body">
                Skippers log trips with vessel + safety contact, log catches as they happen, and post a catch alert when there's enough on board to attract a buyer. Every alert ships with the BFAR Region I midpoint price; vendors send price-and-quantity deals back through built-in chat.
              </p>
              <ul className="split__list">
                <li>Trip sessions · catch logs · auto-paired to active alerts</li>
                <li>Catch alerts with species, weight, asking price, expiry window</li>
                <li>Inbound vendor deals — accept, counter, decline, expire</li>
                <li>Earnings ledger with BFAR price gap per trip and per species</li>
                <li>Active deals workspace · order handoff confirmation</li>
                <li>Vessel + safety-contact profile for SAR escalation</li>
              </ul>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Onboard a co-op <Icon name="arrow-right" size={14} /></button>
            </div>
            <MapBoard />
          </div>
        </div>
      </section>

      {/* ----------- 3. Vendor storefront ----------- */}
      <section className="section--dark" id="vendor" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="split">
            <div>
              <Pill variant="lime">03 · Vendor storefront</Pill>
              <h2 className="split__title">A public shop. A procurement feed. <LimeChip>One workspace</LimeChip>.</h2>
              <p className="split__body">
                Vendors run a public-facing shop (custom slug, like <code style={{ fontFamily: 'var(--font-code)', fontSize: 13, color: '#3ee2ff' }}>/shop/aling-nena</code>), manage inventory lots with movement history, browse catch alerts from the procurement feed, send deals to fishermen, and settle their payouts — without leaving the workspace.
              </p>
              <ul className="split__list">
                <li>Storefront editor · listings · lots with inventory movements</li>
                <li>Procurement feed of nearby catch alerts</li>
                <li>Deal composer + STOMP-powered chat with the fisherman</li>
                <li>Watchlist · demand listings · procurement cart</li>
                <li>Orders inbox · review responses · analytics dashboard</li>
                <li>Payouts ledger with handoff-confirmed receipts</li>
              </ul>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Open a vendor account <Icon name="arrow-right" size={14} /></button>
            </div>

            {/* Deal negotiation console */}
            <div className="dash" style={{ transform: 'rotate(-1.2deg)' }}>
              <div className="dash__chrome">
                <span className="dash__chrome-dot is-pink"></span>
                <span className="dash__chrome-dot is-lime"></span>
                <span className="dash__chrome-dot is-violet"></span>
                <span className="dash__chrome-title">vendor.mermaid.ph · deal D-7421</span>
              </div>
              <div className="dash__body" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>DEAL — yellowfin tuna · 180 kg</div>
                    <div style={{ fontSize: 17, color: '#fff', fontWeight: 500, marginTop: 6 }}>Mang Edgar · Trip T-0488</div>
                  </div>
                  <span style={{ background: 'rgba(62,226,255,0.16)', color: '#3ee2ff', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-code)' }}>OPEN · 02:14</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#1f1633', padding: '14px', borderRadius: 10, border: '1px solid var(--hairline-violet)' }}>
                    <div style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase' }}>your offer</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#3ee2ff', letterSpacing: '-0.4px', marginTop: 6 }}>₱ 152/kg</div>
                    <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', marginTop: 4 }}>+ ₱4 vs BFAR mid</div>
                  </div>
                  <div style={{ background: '#1f1633', padding: '14px', borderRadius: 10, border: '1px solid var(--hairline-violet)' }}>
                    <div style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)', textTransform: 'uppercase' }}>BFAR mid</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#fff', marginTop: 6 }}>₱ 148</div>
                    <div style={{ fontSize: 11, color: 'var(--on-dark-muted)', marginTop: 4 }}>Region I · 7d</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: '12px 14px', background: '#1f1633', borderRadius: 10, border: '1px solid var(--hairline-violet)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>chat · 3 messages</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#79628c,#422082)', flexShrink: 0, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600 }}>EB</span>
                    <span style={{ fontSize: 12, color: '#fff' }}>Pwede po ₱155? Yellowfin Grade A.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-lime)', flexShrink: 0, color: '#150f23', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600 }}>AN</span>
                    <span style={{ fontSize: 12, color: '#fff' }}>Sige ₱152, deal? Pickup 5am Dagupan.</span>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <span className="btn btn--lime btn--small" style={{ flex: 1, justifyContent: 'center' }}>Accept ₱152</span>
                  <span className="btn btn--small" style={{ flex: 1, justifyContent: 'center', background: 'transparent', color: '#fff', border: '1px solid var(--hairline-violet)' }}>Counter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------- 4. Buyer marketplace ----------- */}
      <section className="section--dark" id="buyer" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="split split--reverse">
            <div>
              <Pill variant="lime">04 · Buyer marketplace</Pill>
              <h2 className="split__title">From vendor lot to <LimeChip>buyer cart</LimeChip>, end to end.</h2>
              <p className="split__body">
                Buyers browse vendor storefronts, save favorites, add lots to a cart, check out through Xendit, and track their order through pickup or delivery. Reviews close the loop. Disputes route through the order timeline.
              </p>
              <ul className="split__list">
                <li>Marketplace · public shop pages · favorites · saved addresses</li>
                <li>Cart, checkout, and order placement</li>
                <li>Xendit-backed payment (GCash · Maya · card · bank transfer)</li>
                <li>Order timeline with handoff confirmation + receipts</li>
                <li>Reviews on vendors and lots</li>
                <li>Order disputes routed to admin · live notifications</li>
              </ul>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Onboard a market <Icon name="arrow-right" size={14} /></button>
            </div>

            {/* Buyer storefront mock */}
            <div className="dash" style={{ transform: 'rotate(-1.5deg)' }}>
              <div className="dash__chrome">
                <span className="dash__chrome-dot is-pink"></span>
                <span className="dash__chrome-dot is-lime"></span>
                <span className="dash__chrome-dot is-violet"></span>
                <span className="dash__chrome-title">mermaid.ph/shop/aling-nena</span>
              </div>
              <div className="dash__body" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#fa7faa,#79628c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>AN</span>
                  <div>
                    <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Aling Nena Fish</div>
                    <div style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--on-dark-muted)' }}>Dagupan · ★ 4.8 · 312 reviews</div>
                  </div>
                  <span style={{ marginLeft: 'auto', background: 'rgba(62,226,255,0.16)', color: '#3ee2ff', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-code)' }}>BFAR-VERIFIED</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['Skipjack tuna · 1kg lot', '₱185', 'Caught 6am', 'lime'],
                    ['Galunggong · 500g', '₱120', '4 lots left', 'lime'],
                    ['Bangus · 1kg', '₱220', 'Fresh-cut', 'lime'],
                    ['Tilapia · 500g', '₱95', 'Sold out', 'violet']
                  ].map(([n, p, t, c]) => (
                    <div key={n} style={{ background: '#1f1633', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--hairline-violet)', opacity: c === 'violet' ? 0.55 : 1 }}>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, marginBottom: 6 }}>{n}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: c === 'violet' ? '#79628c' : '#3ee2ff' }}>{p}</span>
                        <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--on-dark-muted)' }}>{t}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(62,226,255,0.06)', border: '1px solid rgba(62,226,255,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-code)', fontSize: 11 }}>
                  <span style={{ color: 'var(--accent-lime)' }}>● Checkout · Xendit</span>
                  <span style={{ color: '#fff' }}>GCash · Maya · Card</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------- Capability matrix ----------- */}
      <section className="section section--light">
        <div className="container">
          <div className="section-head" style={{ alignItems: 'flex-end' }}>
            <div>
              <Eyebrow light>Also included</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3.6vw, 48px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 0', color: 'var(--ink-deep)', letterSpacing: '-0.4px' }}>
                The plumbing you'd otherwise have to build yourself.
              </h2>
            </div>
          </div>
          <div className="feature-grid">
            <FeatureCard light icon="radio"     eyebrow="Real-time"   title="STOMP over WebSocket"   body="Deal chat, order updates, notifications, and trip status all push instantly through the same broker." />
            <FeatureCard light icon="bell"      eyebrow="Notifications" title="In-app + SMS + email" body="One service fans every event to the right channel. SMS via TextBee for unreliable-data regions." />
            <FeatureCard light icon="shield"    eyebrow="Auth"        title="JWT + role-aware"      body="Fisherman, vendor, buyer, admin — each role gets its own dashboard wired to its own controllers." />
            <FeatureCard light icon="chart"     eyebrow="Analytics"   title="BFAR price-gap reports" body="Per-trip and all-time fisherman analytics show how every sale compared to the BFAR midpoint." />
            <FeatureCard light icon="route"     eyebrow="Orders"      title="Order timeline + handoff" body="Every status event stamped with actor, time, and dispute hook. Receipts retained for audit." />
            <FeatureCard light icon="globe"     eyebrow="Public"      title="Slug-based shop pages" body="Vendors get an indexable storefront URL — shareable on Facebook, scannable from a QR code." />
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="cta-band">
        <div className="container">
          <div className="cta-band__inner">
            <div>
              <Eyebrow>Pilot programme</Eyebrow>
              <h2 className="cta-band__title" style={{ marginTop: 12 }}>
                One co-op, one wet market, all <LimeChip>four pillars</LimeChip>.
              </h2>
              <p style={{ color: 'var(--on-dark-muted)', fontSize: 15, lineHeight: 1.7, margin: '14px 0 0', maxWidth: 540 }}>
                We deploy MERMAID on your coastline in 30 days. Fishermen, vendors, buyers, and the local BFAR office all share the same operational layer from day one.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--lime" onClick={() => onNav('contact')}>Start a pilot <Icon name="arrow-right" size={14} /></button>
              <button className="btn btn--ghost" onClick={() => onNav('cases')}>See case studies</button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

window.ServicesScreen = ServicesScreen;
