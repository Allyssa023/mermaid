/* MERMAID — Contact screen */

const { useState: useStateContact } = React;

function ContactScreen({ onNav, onToast }) {
  const [form, setForm] = useStateContact({
    first: '', last: '', email: '', org: '',
    role: 'Fishing co-op',
    region: 'Region I · Ilocos',
    notes: ''
  });
  const [submitted, setSubmitted] = useStateContact(false);

  const submit = (e) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
      onToast && onToast('Salamat — a MERMAID coastal-ops engineer will reach out within one business day.');
    }, 500);
  };

  return (
    <div data-screen-label="Contact">
      <NavBar current="contact" onNav={onNav} polarity="light" />

      <section className="section section--light" style={{ paddingTop: 80 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 80, alignItems: 'start' }} className="contact-grid">

            {/* ----- side ----- */}
            <div>
              <Eyebrow light>Talk to MERMAID</Eyebrow>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.05, margin: '14px 0 22px', color: 'var(--ink-deep)', letterSpacing: '-0.6px' }}>
                Tell us what your coast <LimeChip>needs</LimeChip>.
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.75, color: '#5b5670', margin: 0, maxWidth: 460 }}>
                You'll talk to a regional ops engineer — someone who's deployed MERMAID on a coast that looks like yours. No SDR loop, no qualification quiz.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '40px 0 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  ['Single-tenant deployments with regional data residency'],
                  ['SOC 2 Type II · ISO 27001 · 7-year audit retention'],
                  ['On-coast pilot ready in 30 days'],
                  ['Dedicated regional engineer, 24/7']
                ].map(([f]) => (
                  <li key={f} style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 15, color: 'var(--ink-deep)' }}>
                    <span style={{ width: 22, height: 22, background: 'var(--accent-lime)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="check" size={14} color="#150f23" stroke={2.2} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* contact tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 40 }}>
                <div style={{ padding: 20, border: '1px solid var(--hairline-cloud)', borderRadius: 12 }}>
                  <Icon name="mail" size={20} color="var(--accent-violet-deep)" />
                  <div style={{ fontSize: 12, color: '#79628c', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 10 }}>Email</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4, color: 'var(--ink-deep)' }}>hello@mermaid.ph</div>
                </div>
                <div style={{ padding: 20, border: '1px solid var(--hairline-cloud)', borderRadius: 12 }}>
                  <Icon name="phone" size={20} color="var(--accent-violet-deep)" />
                  <div style={{ fontSize: 12, color: '#79628c', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 10 }}>Ops line · 24/7</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4, color: 'var(--ink-deep)', fontFamily: 'var(--font-code)' }}>+63 75 250 1900</div>
                </div>
              </div>

              {/* offices */}
              <div style={{ marginTop: 40 }}>
                <Eyebrow light>Offices</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginTop: 16 }}>
                  {[
                    { city: 'Dagupan',     country: 'Pangasinan · HQ', tz: 'PHT · GMT+8' },
                    { city: 'San Fernando', country: 'La Union',         tz: 'PHT · GMT+8' },
                    { city: 'Vigan',       country: 'Ilocos Sur',        tz: 'PHT · GMT+8' },
                    { city: 'Manila',      country: 'NCR',               tz: 'PHT · GMT+8' }
                  ].map(o => (
                    <div key={o.city} style={{ padding: '16px 18px', background: '#fafafb', borderRadius: 10, border: '1px solid var(--hairline-cloud)' }}>
                      <Icon name="pin" size={16} color="var(--accent-violet-deep)" />
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-deep)', marginTop: 8 }}>{o.city}</div>
                      <div style={{ fontSize: 12, color: '#79628c', marginTop: 2 }}>{o.country}</div>
                      <div style={{ fontSize: 11, color: '#a09ab0', marginTop: 4, fontFamily: 'var(--font-code)' }}>{o.tz}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ----- form ----- */}
            {submitted
              ? (
                <div style={{ background: '#fff', padding: 56, borderRadius: 18, border: '1px solid var(--hairline-cloud)', boxShadow: 'var(--shadow-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: 480, justifyContent: 'center' }}>
                  <div style={{ width: 64, height: 64, background: 'var(--accent-lime)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                    <Icon name="check" size={32} color="#150f23" stroke={2.4} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--ink-deep)', letterSpacing: '-0.4px' }}>Got it.</h3>
                  <p style={{ marginTop: 14, fontSize: 16, color: '#5b5670', lineHeight: 1.7, maxWidth: 380 }}>
                    A regional ops engineer will reach out within one business day. We'll come prepared.
                  </p>
                  <button className="btn btn--ghost-light" style={{ marginTop: 28 }} onClick={() => { setSubmitted(false); onNav('home'); }}>Back to home</button>
                </div>
              )
              : (
                <form
                  onSubmit={submit}
                  style={{
                    background: '#fff', padding: 40, borderRadius: 18,
                    border: '1px solid var(--hairline-cloud)',
                    boxShadow: 'var(--shadow-2)',
                    display: 'flex', flexDirection: 'column', gap: 18
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="field">
                      <label className="field__label">First name</label>
                      <input className="input" required value={form.first} onChange={e => setForm({ ...form, first: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field__label">Last name</label>
                      <input className="input" required value={form.last} onChange={e => setForm({ ...form, last: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field__label">Work email</label>
                    <input type="email" className="input" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="field__label">Organization</label>
                    <input className="input" required placeholder="Co-op, wet market, restaurant, BFAR office…" value={form.org} onChange={e => setForm({ ...form, org: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="field">
                      <label className="field__label">You are</label>
                      <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option>Fisherman · skipper</option>
                        <option>Fishing co-op</option>
                        <option>Wet-market vendor</option>
                        <option>Restaurant · hotel buyer</option>
                        <option>BFAR officer</option>
                        <option>LGU · municipal agriculture</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="field__label">Region</label>
                      <select className="select" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}>
                        <option>Region I · Ilocos</option>
                        <option>Region II · Cagayan Valley</option>
                        <option>Region III · Central Luzon</option>
                        <option>NCR · Metro Manila</option>
                        <option>Region IV-A · CALABARZON</option>
                        <option>Region IV-B · MIMAROPA</option>
                        <option>Region V · Bicol</option>
                        <option>Region VI · Western Visayas</option>
                        <option>Region VII · Central Visayas</option>
                        <option>Region VIII · Eastern Visayas</option>
                        <option>Region IX-XIII · Mindanao</option>
                        <option>BARMM</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field__label">What's the priority?</label>
                    <textarea
                      className="textarea"
                      rows="4"
                      placeholder="A sentence is fine — &quot;onboard our co-op&apos;s 80 skippers,&quot; &quot;set up a wet-market storefront,&quot; etc."
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 12, color: '#79628c', margin: 0, maxWidth: 320, lineHeight: 1.55 }}>
                      By submitting, you agree to MERMAID's privacy notice. No resale, no third-party advertising — ever.
                    </p>
                    <button className="btn btn--primary" type="submit">
                      Send to ops <Icon name="arrow-right" size={14} />
                    </button>
                  </div>
                </form>
              )
            }
          </div>
        </div>
      </section>

      {/* Coverage strip */}
      <section className="section section--cloud" style={{ paddingTop: 72, paddingBottom: 96 }}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 32, alignItems: 'flex-end' }}>
            <div>
              <Eyebrow light>Where MERMAID runs</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 500, lineHeight: 1.1, margin: '12px 0 0', color: 'var(--ink-deep)', letterSpacing: '-0.3px' }}>
                Coastal coverage across the Philippines.
              </h2>
            </div>
            <span style={{ fontSize: 13, color: '#79628c' }}>Region I live · expanding nationwide</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              { r: 'Region I · Ilocos',          n: 'Pangasinan · La Union · Ilocos Sur · Ilocos Norte' },
              { r: 'Region III · Central Luzon', n: 'Zambales · Bataan (pilot)' },
              { r: 'NCR · Metro Manila',         n: 'Wet markets · restaurant buyers' },
              { r: 'CALABARZON · MIMAROPA',      n: 'Batangas · Mindoro (pilot)' }
            ].map(c => (
              <div key={c.r} style={{ padding: 22, background: '#fff', border: '1px solid var(--hairline-cloud)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--accent-violet-deep)', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{c.r}</div>
                <div style={{ fontSize: 15, color: 'var(--ink-deep)', marginTop: 8, lineHeight: 1.55 }}>{c.n}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

window.ContactScreen = ContactScreen;
