# Sentri Web — UI kit

A click-thru recreation of the Sentri marketing + product surface, built against the brand spec in `/colors_and_type.css`.

## What's in it

- **Home** (dark canvas) — hero with lime keyword chip, feature band, sticker mascot at section junction, squiggly footer.
- **Pricing** (light canvas) — 4-tier card row with one inverted "featured" tier.
- **Contact / Enterprise** (light + dark mix) — form with violet select dropdown.
- **Product · Error Monitoring** (dark canvas) — feature-band cards + spotlight-violet card + code block.

Navigate via the top nav. Submitting the contact form shows an in-page confirmation (no backend).

## Architecture

| File | Role |
|---|---|
| `index.html` | mounts the React app, loads tokens + Babel |
| `app.jsx` | tiny client-side router (no library — hash-based) |
| `components.jsx` | reusable atoms: `Button`, `NavBar`, `Footer`, `Pill`, `LimeChip`, `Input`, `Select`, `CodeBlock`, `Card`, `MascotSticker` |
| `screens.jsx` | one component per screen: `HomeScreen`, `PricingScreen`, `ContactScreen`, `ErrorMonitoringScreen` |

All components export to `window` at the end of each file so subsequent `<script type="text/babel">` files can use them.

## Things this kit deliberately doesn't do

- No real network. Contact form simulates submission with a 600ms delay then shows a thank-you state.
- No analytics, no dark/light mode toggle (the brand commits to canvas polarity per page, not per session).
- No mobile breakpoint logic beyond CSS clamps — open at desktop width for the intended fidelity.
- Mascots are the placeholder artwork from `/assets/mascots/`. Swap them once real artwork is delivered.

## Iterating

To add a screen: write a new screen component in `screens.jsx`, add it to the `SCREENS` map in `app.jsx`, add a nav item in `components.jsx`. To restyle: every visible color/spacing references a CSS variable in `colors_and_type.css` — change the token and the whole kit updates.
