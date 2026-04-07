# Frontend Design — Reference

## Anti-Patterns (Avoid)

| Pattern | Why to avoid | Prefer instead |
|--------|----------------|----------------|
| Single font (Inter/Roboto/system-ui only) | Reads as generic, "AI default" | Display + body pairing; one distinctive choice |
| Purple/violet gradient backgrounds | Overused in AI-generated UIs | Palette that matches aesthetic (e.g., warm neutrals for luxury, high-contrast for brutalist) |
| Centered column of identical cards | No hierarchy or rhythm | Asymmetry, varied card sizes, grid breaks, clear focal area |
| No hover/focus states | Feels static and unfinished | Clear interactive states; subtle motion |
| Flat, single-color blocks | No depth or hierarchy | Gradients, soft shadows, or texture in line with the aesthetic |
| Lorem ipsum only | Doesn't guide content tone | Short placeholder that suggests real copy (e.g., "Feature one", "Headline here") |

## Aesthetic Quick Reference

- **Brutalist**: Monospace or heavy sans; black/white or limited palette; raw borders; little or no shadow.
- **Maximalist**: Multiple typefaces; saturated colors; patterns, borders, overlapping elements.
- **Retro-futuristic**: Geometric sans or tech fonts; neon accents; dark bg; scanlines or grain.
- **Luxury**: Serif or refined sans; gold/cream/dark; generous spacing; subtle gradients or metallic accents.
- **Playful**: Rounded sans; bright, friendly colors; bouncy or soft animations; rounded corners.
- **Editorial**: Strong headline font + readable body; clear grid; clear sections and pull quotes.

## Motion Guidelines

- **Hover**: 150–250ms ease; slight scale, color, or shadow change.
- **Focus**: Visible focus ring (accessibility); consistent with hover where appropriate.
- **Entrance**: 200–400ms; stagger list items by 50–100ms if multiple.
- **Reduced motion**: Use `@media (prefers-reduced-motion: reduce)` to disable or simplify animations.

## Font Pairing Examples (Google Fonts)

- **Brutalist**: Space Mono + IBM Plex Sans
- **Luxury**: Playfair Display + Source Sans 3
- **Editorial**: Fraunces + Source Sans 3
- **Playful**: Nunito + Lexend
- **Retro-futuristic**: Orbitron + Rajdhani

Pick one pairing per project; don't mix multiple pairings in one interface.
