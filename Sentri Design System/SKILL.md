---
name: sentri-design
description: Use this skill to generate well-branded interfaces and assets for Sentri — an observability product with a near-black violet midnight canvas, electric-lime keyword highlights, and sticker-style mascots. Contains brand guidelines, color + type tokens, fonts, assets, and a UI kit for prototyping.
user-invocable: true
---

# Sentri design skill

Read `README.md` for the full brand language. The short version:

- **Two-polarity canvas system.** `--surface-canvas-dark` (#1f1633) for hero/product surfaces; `--surface-canvas-light` (#ffffff) for pricing/contact/dense reference. Never blend on a single page band.
- **Electric lime is a typographic device, not a swatch.** Use the `.chip-lime` / `.lime-chip` class to wrap a single keyword inside the display headline. One lime element per viewport.
- **Single-primary CTA hierarchy.** On light surfaces, `button-primary` is filled near-black (`--primary` #150f23) with white type. On dark surfaces it flips to filled-white with near-black type (`button-inverted`). Outline + ghost variants are downgraded.
- **Caps + 0.2px tracking** on every button label, eyebrow, and micro-cap. Console-prompt cadence — non-negotiable.
- **No emoji, no Unicode glyph icons, no gradient backgrounds.** Personality lives in the sticker mascots, the lime chip, and the lime squiggle divider.

## What's available

| Path | What's there |
|---|---|
| `colors_and_type.css` | every token + typography utility class (`.t-display-hero`, `.chip-lime`, etc.) |
| `assets/logo-wordmark.svg` | Sentri wordmark with lime tittle dot |
| `assets/lime-squiggle.svg` | footer divider |
| `assets/textures/starfield.svg` | hero canvas atmosphere |
| `assets/mascots/{astronaut,cone,monster}.svg` | placeholder sticker mascots |
| `ui_kits/sentri-web/` | React UI kit — atoms + four screens, drop in via `components.jsx` + `screens.jsx` |
| `preview/` | per-token specimen cards — read these to see how each token is meant to look |

## Working modes

**Visual artifacts (slides, mocks, throwaway prototypes):** copy `assets/` and `colors_and_type.css` into your output folder, write static HTML, and reference the tokens directly. Use the placeholder mascot SVGs at section junctions, overlapping section boundaries. Wrap exactly one keyword in `<span class="chip-lime">…</span>` per headline.

**Production code:** lift the token values into your design-tokens pipeline. The full taxonomy is documented in `README.md` under Visual Foundations. Copy the UI kit components in `ui_kits/sentri-web/components.jsx` as a structural reference — they're not optimised for production but the visual contract is correct.

## If invoked without guidance

Ask the user what they want to build (landing page section, pricing redesign, product feature page, contact form, slide?), one or two clarifying questions about variations they want to explore, then output an HTML artifact wired to `colors_and_type.css`.

## Substitutions flagged

- Display sans is substituted with **Space Grotesk @ 700** — closest open match for the proprietary chunky near-condensed face.
- Icon system is substituted with **Lucide Icons (CDN)** — no proprietary set provided.
- Mascots are **placeholder artwork**.
- Starfield is a **pre-baked SVG**, not a real noise texture.

If real assets arrive, drop them into the named folders and the kit picks them up automatically.
