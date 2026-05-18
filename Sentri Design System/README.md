# Sentri Design System

> An observability product wearing a leather jacket. Near-black violet midnight canvas, electric-lime keyword highlights, sticker-style mascots that puncture the seriousness of a debugging console.

## Brand at a glance

**Product:** Sentri — error monitoring, performance, and observability for software teams. The marketing surface argues that debugging is craft; the product surface is dense, tabular, console-flavored.

**Audience:** developers, SREs, platform-engineering leaders. Copy speaks peer-to-peer — never "we believe", always "you ship".

**Voice:** developer-console cadence. Caps + 0.2px tracking on buttons and eyebrows. Headlines are short and load-bearing — the only big type on a page.

**Personality props:** floating illustrated mascots (astronauts, traffic cones, cartoon monsters), starfield textures over the dark canvas, a lime squiggly divider above the footer. None are decoration — they break grid where shadows would otherwise have to do the work.

## Sources

No codebase, Figma, or screenshots were attached for this design system. Everything below was authored from the brand-language spec the user pasted into the project. If you have access to the live product or design files, drop them in via the Import menu and we can pixel-match.

- **Codebase:** _(none attached)_
- **Figma:** _(none attached)_
- **Reference site pages described in spec:** `/welcome/` (home), `/product/error-monitoring`, `/contact/enterprise`, `/pricing`

## Index

| File | What's in it |
|---|---|
| `README.md` | this document — context, content + visual foundations, iconography |
| `colors_and_type.css` | all design tokens as CSS custom properties + typography utility classes |
| `preview/` | individual specimen cards rendered into the Design System tab |
| `assets/` | logos, illustration assets, icon references |
| `ui_kits/sentri-web/` | the marketing + product web UI kit (React JSX components + interactive `index.html`) |
| `SKILL.md` | the Claude Code-compatible Skill entry point |

### Project layout

```
.
├── README.md                  ← this file
├── SKILL.md                   ← Claude Code skill entry
├── colors_and_type.css        ← tokens + typography utility classes
├── assets/
│   ├── logo-wordmark.svg
│   ├── lime-squiggle.svg
│   ├── mascots/               ← astronaut · cone · monster (placeholders)
│   └── textures/starfield.svg
├── preview/                   ← Design-System-tab specimen cards
│   ├── _card.css
│   ├── colors-*.html · type-*.html · spacing-*.html
│   ├── buttons-*.html · cards-*.html · inputs.html · nav-bar.html
│   ├── pills-badges.html · chip-lime.html
│   └── logo.html · mascots.html · squiggle.html · starfield.html
└── ui_kits/
    └── sentri-web/            ← marketing + product UI kit
        ├── README.md
        ├── index.html         ← interactive demo
        ├── kit.css
        ├── components.jsx     ← atoms (Logo, NavBar, Footer, FeatureCard…)
        ├── screens.jsx        ← Home · Pricing · Contact · ErrorMonitoring
        └── app.jsx            ← hash-based router
```

---

## Content fundamentals

Sentri's copy reads like a developer reviewing their own console output. There's a tonal split between **marketing** (short, declarative, slightly cocky) and **product** (precise, tabular, console-flavored). Both share the same voice — the marketing copy is what a developer would say at a meetup; the product copy is what they'd write in a runbook.

### Voice and tone

- **Peer-to-peer, never institutional.** "You ship code. We tell you when it breaks." Not "We help developers monitor their applications."
- **Short headlines, single load-bearing keyword.** "Code breaks, fix it faster." The keyword that carries the promise (`faster`, `find`, `ship`) is wrapped in the lime chip.
- **No marketing fluff verbs.** No _empower, unlock, revolutionize, supercharge_. Plain transitive verbs: ship, find, fix, debug, monitor, trace.
- **"You", almost never "we".** The brand stays out of the sentence. When the company has to refer to itself, it's by product noun ("Sentri catches…"), not first-person plural.
- **Confidence without superlatives.** "The error monitoring developers use." not "The world's leading error monitoring platform."

### Casing rules

- **Sentence case** for headlines, sub-heads, and card titles. _"Code breaks, fix it faster."_ Not Title Case.
- **UPPERCASE** with 0.2px tracking for: button labels, eyebrows above section heads, micro-caps on status pills. This is the brand's typographic signature — the console-prompt cadence applied to UI affordances.
- **lowercase** as a tonal device only inside code blocks and inline `code spans` — never as a marketing affectation.

### Specific examples

| Surface | Pattern | Example |
|---|---|---|
| Hero headline | Sentence case, one lime keyword chip | `Code breaks. Fix it [faster].` |
| Section eyebrow | UPPERCASE, 0.2px track | `ERROR MONITORING` |
| Primary CTA | UPPERCASE, 0.2px track | `GET STARTED` · `GET DEMO` · `TALK TO SALES` |
| Pricing tier name | Sentence case, single word ideal | `Developer` · `Team` · `Business` · `Enterprise` |
| Empty state | Direct, slightly dry | `Nothing's broken. Yet.` |
| Error toast | Console-flavored, no exclamation | `Couldn't save. Try again.` |
| Help text under field | Lowercase fragment, no period | `we'll only use this for billing receipts` |

### Emoji + ornament

- **No emoji.** Not in marketing copy, not in product UI, not in empty states. The personality job is owned by the sticker mascots and the lime chip — emoji would feel redundant and dilute the brand.
- **No Unicode ornaments** (✓, ★, →, etc.) in headlines. Arrows inside buttons are SVG icons, not glyphs.
- **Inline code spans** in marketing copy use Monaco against a subtle violet-tinted background — they're a tonal device, signaling "we're talking to people who read stack traces."

### Vibe summary

If the copy reads like a Stripe announcement, it's wrong. If it reads like an engineering team's incident postmortem with a little personality, it's right.

---

## Visual foundations

### Two-polarity canvas system

Sentri commits — hard — to two canvases and never blends them on a single page band.

| Canvas | Use | Mood |
|---|---|---|
| `--surface-canvas-dark` (#1f1633) | hero, product feature pages, marketing storytelling | atmospheric, generous whitespace (96px between bands), starfield texture |
| `--surface-canvas-light` (#ffffff) | pricing, contact, docs, dense reference | tight, scannable, transactional |

This is load-bearing. A page band is one or the other, never both. Dark sections nest dark cards; light sections nest white cards. Only the polarity flips — chrome and components stay structurally identical.

### Color

- **Palette is deliberately narrow.** Deep midnight violet dominates. Electric lime is the only attention-grabber. Hot pink is secondary punctuation, used on sticker outlines and chart points — never on type at body size, never on buttons.
- **Lime is a typographic device, not a swatch.** It wraps single keywords inside the display headline (4px radius, 12px horizontal padding, zero vertical). Treat it like syntax highlight. One lime element per viewport — the rarity is the point.
- **Violet has three roles.** `--primary` (#150f23) is near-black, the strongest action color. `--ink-deep` (#1f1633) is hero bg AND body type on light — one token doing double duty. `--accent-violet-deep` (#422082) is select dropdowns and spotlight cards.
- **The "primary" button inverts based on canvas.** On light surfaces it's filled near-black with white type. On dark surfaces it's filled white with near-black type. Both read as the single strongest CTA. Outlined and ghost variants are downgraded affordances.
- **Color of imagery is cool, slightly desaturated, never warm.** Product UI mocks come through with their native violet/blue casts intact. There's no warm orange or yellow anywhere in the system.

### Typography

Three families, three jobs:

1. **Display** — proprietary chunky near-condensed sans for hero and section openers. Substituted in this kit with **Space Grotesk @ 700** (see Substitutions below).
2. **UI** — **Rubik** for everything else: body, captions, eyebrow caps, button labels.
3. **Code** — **Monaco** with Menlo/Ubuntu Mono fallback for code blocks and inline tokens.

**Two leading worlds.** Marketing body copy uses 2.0 line-height (airy prose). Product body copy uses 1.5 line-height (dense log output). The difference is intentional and load-bearing — never collapse them to a single token.

**Caps with tracking.** All button labels and eyebrows are UPPERCASE with 0.2px tracking. The console-prompt cadence is part of the brand, not a stylistic option.

### Spacing

- 8px base unit, with 2/4/12px satellites for compact rhythm.
- **Section padding:** 96px between major bands on desktop; collapses to 32–48px on mobile.
- **Card internal padding:** 32px on pricing + feature cards; 16px on compact tag/badge groups.
- **Whitespace philosophy:** dark canvases breathe (mascots need room), light canvases tighten (users are scanning to act).

### Borders & radius

- **Hairlines, not heavy borders.** All borders are 1px. On dark cards: `--hairline-violet` (#362d59). On text inputs: `--hairline-cool` (#cfcfdb). On pricing dividers: `--hairline-cloud` (#e5e7eb).
- **Radius scale climbs by intent**, not by component size: 4px chips → 6px inputs → 8px buttons → 12px pricing cards → 18px image containers → 9999px avatars.
- **Pricing cards lock at 12px (`--radius-xl`).** Image containers and large hero illustrations lock at 18px (`--radius-xxl`). Never randomize — every component has a single radius.

### Backgrounds

- **Starfield texture on dark hero only.** A faint white-on-violet pinprick pattern at very low opacity. Implemented as a background image, not as repeating CSS keyframes. It's atmospheric — never decorative enough to compete with content.
- **No gradients.** The system reads as flat solids over textured backgrounds. No bluish-purple gradient overlays, no glassmorphism, no aurora washes.
- **No full-bleed photography.** Imagery is product UI mocks (rounded 18px containers, tilted ±2–3°) and sticker mascots (layered directly on canvas, no container).

### Elevation / shadows

Depth is mostly **illustrative**, not optical:

- **Starfield texture** + **floating mascots** + **lime squiggly divider** carry the work that shadow stacks do in flatter systems.
- **Shadows are rare and specific.** Level 1 lifts inverted buttons off dark canvas. Level 2 floats cards on light canvas + modals. Level 3 is the canvas-color glow halo around primary CTAs on the dark hero — the dark color itself becomes the shadow, creating a vignette of canvas around the button. Level 4 is the pressed-inverted button.
- **No drop shadows on cards on dark canvas.** Depth on dark comes from texture and illustration. A shadow on dark would muddy the violet.

### States, hover, press

- **No formal hover state in the spec.** Components show Default and Pressed/Active only. In practice we lift opacity 4–6% or shift fill one step on hover — but the brand doesn't lean on hover as a primary affordance.
- **Pressed state inverts polarity.** Primary buttons flip to a near-white fill with near-black text. Inverted buttons drop to `--surface-press-light`. The button effectively swaps polarities under finger.
- **Focus ring is the only blue in the system** — `rgba(59,130,246,0.5)`, reserved for keyboard focus on form fields. No other blue should appear.

### Animation

The brand is largely static. Where motion appears:

- **No bounces, no springs.** Easing is `ease-out` on enters and `ease-in-out` on cross-fades.
- **Durations 150–250ms** for UI feedback (button press, dropdown open). 300–400ms for page transitions.
- **No marketing-page parallax, no scroll-driven mascot animation** beyond simple fade-ins. The illustration system carries personality; motion doesn't need to.

### Transparency & blur

- **Two roles for transparency.** `--on-dark-faint` (rgba(255,255,255,0.18)) is the ghost-button fill on dark — lets the canvas texture show through. `--on-dark-muted` (rgba(255,255,255,0.72)) is secondary text and table values on dark.
- **No backdrop-filter / blur** on cards or panels. The system is solids over solids over texture, not frosted glass.

### Layout rules

- **Marketing pages:** wide centered container, max 1152px, content flexes across 12 conceptual columns.
- **Pricing:** 4-tier card row at desktop, 2-up at mid, 1-up at mobile. Featured (dark inverted) tier never loses its inversion.
- **Contact form:** 2-column field layout (first/last name side by side) inside a single light-canvas panel.
- **Top nav:** logo wordmark left (~145×32px), primary items mid-bar with carets, CTA pair right. Collapses to hamburger below 768px.
- **No fixed elements** beyond the nav. No sticky CTAs, no docked mascots, no floating chat widget.

### Card anatomy

- **Pricing card (`card-pricing`):** white bg, 32px padding, 12px radius, 1px `--hairline-cloud` border. Title → price → feature list → bottom-pinned CTA.
- **Featured pricing tier (`card-pricing-featured`):** near-black (`--surface-night`) bg, same internal structure, polarity-inverted text. **No accent border, no "Most popular" sticker, no gradient ring.** The inversion alone marks it.
- **Feature card on dark (`card-feature-dark`):** `--ink-deep` bg, 32px padding, 18px radius. Often holds a UI mock + 27px headline + 16px body.
- **Spotlight card (`card-spotlight-violet`):** `--accent-violet-deep` bg, 32px padding, 18px radius. The deepest violet in the system, reserved for "Sentry-only" capability bands.

### Signature components

These are the visual elements that, removed, would make the system feel generic:

- **Sticker mascot layer** — astronauts, traffic cones, cartoon monsters. Hand-drawn outlines, saturated lime + pink fills. Layered directly on canvas, often overlapping section boundaries by 30–40% of their height. Never inside cards, never as buttons.
- **Lime squiggly divider** — hand-drawn ~3px lime stroke above the footer. Replaces what would otherwise be a 1px hairline.
- **Starfield hero texture** — faint white-on-violet pinpricks at very low opacity on the dark canvas.
- **Window-chrome UI mocks** — product UI screenshots framed in 18px-radius containers, often tilted ±2–3°, positioned overlapping section boundaries.

---

## Iconography

**Sentri has no native icon font or proprietary icon set documented in the brand spec.** Mascot illustrations and the lime squiggle do the personality work that icon systems do in flatter brands.

### Substitution

For the UI kit and any production interfaces, we substitute **[Lucide Icons](https://lucide.dev/) (CDN-linked)** as the icon system. Lucide is the closest match:

- **Stroke-based, not filled** — fits the console-flavored aesthetic.
- **1.5–2px consistent stroke** — pairs cleanly with Rubik 16/500 body.
- **Geometric, slightly humanist** — doesn't fight the chunky display sans.

This is a flagged substitution. If Sentri ships a proprietary icon set, drop the SVGs into `assets/icons/` and update the UI kit to reference them.

### Usage rules

- **Icons inside buttons** sit at the same cap height as the label, 8px to the left of the text. Stroke color matches the label.
- **Icons as standalone affordances** (close, settings, nav toggle) get a 36×36px hit area with the icon at 20×20px.
- **No emoji.** Not in nav, not in empty states, not in copy. The brand's personality is owned by mascot illustrations and the lime chip.
- **No Unicode glyphs as icons.** No ✓, ★, →. If you need an arrow, use the Lucide `arrow-right` SVG.
- **Mascot illustrations** are NOT icons. They live on canvas, overlap section boundaries, and never appear inline with text.

### Brand mark / logo

The Sentri wordmark is rendered as plain text in the display sans at 145×32px in the nav. Color follows canvas polarity — `--ink-deep` on light, `--on-primary` on dark. No mark, no symbol — the wordmark is the logo.

### Mascot illustrations

The mascot system is described in the brand spec but no source artwork is included. The UI kit uses CSS-rendered placeholder mascot tiles tagged as `<mascot-placeholder>` — when real artwork arrives, swap them in at the same coordinates.

---

## Substitutions flagged

| Asset | Used | Reason | Action |
|---|---|---|---|
| Display sans (proprietary) | **Space Grotesk @ 700** | open-source closest match per spec | drop real font files into `fonts/` and update `colors_and_type.css` |
| Icon system | **Lucide Icons (CDN)** | no proprietary icon font specified | drop SVGs into `assets/icons/` if Sentri ships an icon set |
| Mascot illustrations | CSS placeholder tiles | no source artwork provided | drop real mascot SVG/PNG into `assets/mascots/` |
| Starfield texture | CSS radial-gradient pinpricks | no source PNG provided | drop a real noise texture into `assets/textures/starfield.png` |
