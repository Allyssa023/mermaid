/* Sentri Web — screens.
   Exposes: HomeScreen, PricingScreen, ContactScreen, ErrorMonitoringScreen
*/

const { useState: useStateScreens } = React;

function HomeScreen({ onNav }) {
  return (
    <>
      <NavBar current="home" onNav={onNav} polarity="dark" />

      <section className="hero">
        <div className="container">
          <div className="hero__eyebrow">For dev teams who ship</div>
          <h1 className="hero__headline">
            Code breaks. <br/>Fix it <LimeChip>faster</LimeChip>.
          </h1>
          <p className="hero__sub">
            Sentri catches every error, traces it to the line that caused it, and tells you which user hit it — before they file a ticket.
          </p>
          <div className="hero__cta">
            <button className="btn btn--inverted btn--glow" onClick={() => onNav('pricing')}>Get started</button>
            <button className="btn btn--ghost" onClick={() => onNav('contact')}>Get demo</button>
          </div>
        </div>
        <img className="hero__mascot" src="../../assets/mascots/astronaut.svg" alt="" />
      </section>

      <section className="section section--dark">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div className="hero__eyebrow" style={{ marginBottom: 12 }}>What you get</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 60, fontWeight: 500, lineHeight: 1.1, margin: 0, maxWidth: 720 }}>
                Every break, in the place where you broke it.
              </h2>
            </div>
            <button className="btn btn--violet-token">Explore product</button>
          </div>

          <div className="feature-grid">
            <FeatureCard
              eyebrow="Error monitoring"
              title="See the line that broke it."
              body="Source maps, breadcrumbs, the user who hit it — packed in a single tracelet view."
            />
            <FeatureCard
              eyebrow="Performance"
              title="Spot slow before users feel it."
              body="P75 / P99 trends per route, per release, per user cohort. No glue code required."
            />
            <FeatureCard
              eyebrow="Replays"
              title="Watch the bug happen."
              body="A scrubbed video of the session that broke, masked for privacy by default."
            />
            <FeatureCard
              eyebrow="Sentri only"
              title="Cross-project insight, no pipeline."
              body="Correlate one release across every service. Frontend, mobile, the back-of-house cron job."
              spotlight
            />
          </div>
        </div>
      </section>

      <section className="section section--dark" style={{ position: 'relative', paddingTop: 0 }}>
        <div className="container">
          <div style={{
            background: 'var(--ink-deep)',
            borderRadius: 18,
            border: '1px solid var(--hairline-violet)',
            padding: 48,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'center'
          }}>
            <div>
              <div className="hero__eyebrow" style={{ marginBottom: 12 }}>Install</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 500, lineHeight: 1.15, margin: 0, marginBottom: 16, color: '#fff' }}>
                Two lines, in your stack.
              </h3>
              <p style={{ color: 'var(--on-dark-muted)', fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
                Drop the SDK in, point it at your DSN, ship. Sentri starts collecting errors before your next deploy.
              </p>
            </div>
            <CodeBlock>
              <span className="cm">{`// install`}</span>{`\n`}
              <span className="kw">npm</span>{` install `}<span className="str">@sentri/browser</span>{`\n\n`}
              <span className="cm">{`// initialise`}</span>{`\n`}
              <span className="kw">Sentri</span>{`.init({\n  dsn: `}<span className="str">"https://abc@sentri.io/12"</span>{`,\n  tracesSampleRate: `}<span className="kw">1.0</span>{`\n})`}
            </CodeBlock>
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </>
  );
}

function PricingScreen({ onNav }) {
  const tiers = [
    { name: 'Developer', price: '$0', unit: '/ forever',
      desc: 'For side projects and solo builders.',
      features: ['5k errors / month', '1 team member', 'Community support', '7-day data retention'],
      cta: 'Start free' },
    { name: 'Team', price: '$26', unit: '/ mo',
      desc: 'For growing teams shipping in production.',
      features: ['50k errors / month', 'Unlimited team members', 'Performance monitoring', 'Slack + email alerts', '30-day retention'],
      cta: 'Start free' },
    { name: 'Business', price: '$80', unit: '/ mo',
      desc: 'Cross-service insights for org-wide rollouts.',
      features: ['250k errors / month', 'Cross-project insights', 'SAML SSO', 'Audit log', '90-day retention'],
      cta: 'Start free', featured: true },
    { name: 'Enterprise', price: 'Talk', unit: 'to sales',
      desc: 'For platform teams with regulated workloads.',
      features: ['Custom volume', 'Single tenant + SOC 2', 'Dedicated CSM', 'Custom data residency', 'Unlimited retention'],
      cta: 'Talk to sales' }
  ];

  return (
    <>
      <NavBar current="pricing" onNav={onNav} polarity="light" />

      <section className="section section--pricing" style={{ paddingTop: 80, paddingBottom: 60 }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            <div className="hero__eyebrow" style={{ color: 'var(--accent-violet-mid)', marginBottom: 14 }}>Pricing</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, lineHeight: 1.1, margin: 0, color: 'var(--ink-deep)' }}>
              Pricing plans for dev teams of all sizes.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 2.0, color: 'var(--accent-violet-mid)', marginTop: 20, fontWeight: 400 }}>
              Pay for what breaks. No seat licenses, no per-feature gating, no surprise renewals.
            </p>
          </div>

          <div className="pricing-grid">
            {tiers.map(t => (
              <div key={t.name} className={"tier " + (t.featured ? "tier--featured" : "")}>
                <div className="tier__name">{t.name}</div>
                <div className="tier__price">{t.price}<small> {t.unit}</small></div>
                <div className="tier__desc">{t.desc}</div>
                <ul className="tier__features">
                  {t.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <div className="tier__cta">
                  <button className={"btn " + (t.featured ? "btn--inverted" : "btn--primary")} onClick={() => onNav(t.cta === 'Talk to sales' ? 'contact' : 'home')}>
                    {t.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--light" style={{ paddingTop: 0, paddingBottom: 96 }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
            <div className="hero__eyebrow" style={{ color: 'var(--accent-violet-mid)', marginBottom: 12 }}>FAQ</div>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 27, fontWeight: 500, lineHeight: 1.25, margin: 0 }}>
              Questions developers ask.
            </h3>
          </div>

          <div style={{ maxWidth: 720, margin: '36px auto 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              ['What counts as an error event?', 'One captured exception or message hitting Sentri.io. Repeated occurrences within the same release are grouped, but each unique trace is one event.'],
              ['Can I switch plans mid-month?', 'Yes. Upgrades are prorated to the day. Downgrades take effect on the next billing cycle.'],
              ['Is there a free trial of Business?', 'Every paid plan gets a 14-day Business-tier trial — no card required.']
            ].map(([q, a]) => (
              <details key={q} style={{ padding: '18px 0', borderBottom: '1px solid var(--hairline-cloud)' }}>
                <summary style={{ fontSize: 16, fontWeight: 500, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
                <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6, color: 'var(--accent-violet-mid)' }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </>
  );
}

function ContactScreen({ onNav, onToast }) {
  const [form, setForm] = useStateScreens({ first: '', last: '', email: '', company: '', teamSize: '11–50 developers', notes: '' });
  const [submitted, setSubmitted] = useStateScreens(false);

  const submit = (e) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
      onToast && onToast('Thanks — sales will reach out within one business day.');
    }, 600);
  };

  return (
    <>
      <NavBar current="contact" onNav={onNav} polarity="light" />

      <section className="section section--light" style={{ paddingTop: 80, paddingBottom: 96 }}>
        <div className="container">
          <div className="contact-grid">
            <div className="contact-side">
              <div className="hero__eyebrow" style={{ color: 'var(--accent-violet-mid)', marginBottom: 12 }}>Talk to sales</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
                Tell us what you're <LimeChip>shipping</LimeChip>.
              </h1>
              <p style={{ fontSize: 16, lineHeight: 2.0, color: 'var(--accent-violet-mid)', marginTop: 22, fontWeight: 400, maxWidth: 380 }}>
                We'll set up a 30-minute call with a Sentri engineer who has shipped the kind of stack you run. No SDR loop, no qualification quiz.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '32px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {['Single-tenant deployments', 'SOC 2 + ISO 27001', 'Custom data residency', 'Dedicated CSM'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 15 }}>
                    <span style={{ width: 18, height: 18, background: 'var(--accent-lime)', borderRadius: 4, display: 'inline-block' }}></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {submitted
              ? (
                <div className="contact-form" style={{ alignItems: 'center', textAlign: 'center', minHeight: 360, justifyContent: 'center' }}>
                  <div style={{ width: 56, height: 56, background: 'var(--accent-lime)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#150f23" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 500, margin: 0 }}>Got it.</h3>
                  <p style={{ marginTop: 10, fontSize: 15, color: 'var(--accent-violet-mid)' }}>A Sentri engineer will reach out within one business day.</p>
                  <button className="btn btn--ghost-light" style={{ marginTop: 18 }} onClick={() => { setSubmitted(false); onNav('home'); }}>Back to home</button>
                </div>
              )
              : (
                <form className="contact-form" onSubmit={submit}>
                  <div className="contact-form__row">
                    <div className="field">
                      <label className="field__label">First name</label>
                      <input className="input" required value={form.first} onChange={e => setForm({...form, first: e.target.value})} />
                    </div>
                    <div className="field">
                      <label className="field__label">Last name</label>
                      <input className="input" required value={form.last} onChange={e => setForm({...form, last: e.target.value})} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field__label">Work email</label>
                    <input type="email" className="input" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="field">
                    <label className="field__label">Company</label>
                    <input className="input" required value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                  </div>
                  <div className="field">
                    <label className="field__label">Team size</label>
                    <select className="select" value={form.teamSize} onChange={e => setForm({...form, teamSize: e.target.value})}>
                      <option>1–10 developers</option>
                      <option>11–50 developers</option>
                      <option>50–200 developers</option>
                      <option>200+ developers</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field__label">Anything specific?</label>
                    <textarea className="input" rows="3" style={{ resize: 'vertical', fontFamily: 'var(--font-ui)' }} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                  </div>
                  <button className="btn btn--primary" type="submit" style={{ marginTop: 8, alignSelf: 'flex-start' }}>Talk to sales</button>
                </form>
              )
            }
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </>
  );
}

function ErrorMonitoringScreen({ onNav }) {
  return (
    <>
      <NavBar current="monitor" onNav={onNav} polarity="dark" />

      <section className="prod-hero">
        <div className="container">
          <div className="prod-hero__top">
            <div>
              <div className="hero__eyebrow" style={{ color: 'var(--accent-lime)', marginBottom: 18 }}>Error monitoring</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 700, lineHeight: 1.05, margin: 0, letterSpacing: '-0.5px' }}>
                See the <LimeChip>break</LimeChip>, find the line.
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--on-dark-muted)', marginTop: 22, maxWidth: 460 }}>
                Errors arrive with the file, line, user, release, browser, and the breadcrumbs that led to them. No grepping, no reproducing locally.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
                <button className="btn btn--inverted btn--glow" onClick={() => onNav('pricing')}>Start free</button>
                <button className="btn btn--ghost" onClick={() => onNav('contact')}>See it live</button>
              </div>
            </div>

            <div className="prod-hero__mock">
              <div className="ui-mock">
                <div className="ui-mock__chrome"><span></span><span></span><span></span></div>
                <div className="ui-mock__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ color: 'var(--accent-pink)' }}>TypeError</span>
                    <span className="ui-mock__tag">prod</span>
                  </div>
                  <div style={{ fontSize: 15, color: '#fff', marginBottom: 16 }}>Cannot read property 'id' of undefined</div>
                  <div className="ui-mock__row"><span style={{ color: 'var(--on-dark-muted)' }}>file</span><span>/checkout/Cart.tsx:148</span></div>
                  <div className="ui-mock__row"><span style={{ color: 'var(--on-dark-muted)' }}>release</span><span>web@2.4.1</span></div>
                  <div className="ui-mock__row"><span style={{ color: 'var(--on-dark-muted)' }}>users</span><span>1,402 affected</span></div>
                  <div className="ui-mock__row"><span style={{ color: 'var(--on-dark-muted)' }}>first seen</span><span>23 min ago</span></div>
                </div>
              </div>
            </div>
          </div>

          <img src="../../assets/mascots/cone.svg" alt="" style={{ position: 'absolute', left: '3%', bottom: '-30px', width: 130, transform: 'rotate(8deg)', zIndex: 0 }} />
          <div style={{ height: 60 }}></div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="feature-grid">
            <FeatureCard eyebrow="Source maps" title="Minified? No problem." body="Sentri unpacks production stack traces back to the source line you wrote." />
            <FeatureCard eyebrow="Breadcrumbs" title="The 30 seconds before it broke." body="Every click, navigation, console log, and fetch — collected automatically, never sampled." />
            <FeatureCard eyebrow="Sentri only" title="Release health, side by side." body="Compare error rates between any two releases in one view. No dashboard rebuild." spotlight />
            <FeatureCard eyebrow="Alerts" title="Page only when it matters." body="Threshold rules with deduplication and ownership routing built in. No more PagerDuty fan-outs." />
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </>
  );
}

Object.assign(window, { HomeScreen, PricingScreen, ContactScreen, ErrorMonitoringScreen });
