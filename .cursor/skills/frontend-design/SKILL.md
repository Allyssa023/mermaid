---
name: frontend-design
description: Crafts production-grade frontends with distinctive design. Establishes a design framework (purpose, audience, aesthetic) before coding; uses bold typography, color, motion, and spatial composition; avoids generic AI aesthetics. Use when building UIs, dashboards, landing pages, settings panels, or when the user asks for frontend design, UI design, or polished interfaces.
---

# Frontend Design

Generate distinctive, production-grade frontend interfaces that stand out from generic AI-generated designs. Establish a design framework before writing code, then implement with bold aesthetic choices and context-aware visual details.

## When to Apply

Apply this skill when the user:
- Asks to build or design a frontend, UI, dashboard, landing page, or settings panel
- Requests a "polished," "distinctive," or "production-grade" interface
- Mentions creating components, pages, or layouts for a web app

## Design Framework (Do First)

Before writing any code:

1. **Clarify purpose and audience**  
   What is this interface for? Who uses it? (e.g., B2B dashboard, consumer app, internal tool.)

2. **Choose an aesthetic direction**  
   Pick one and commit. Examples:
   - **Brutalist**: Raw, bold type, high contrast, minimal decoration
   - **Maximalist**: Dense, layered, rich color, pattern and ornament
   - **Retro-futuristic**: Vintage sci-fi, CRT/scanlines, neon, geometric
   - **Luxury**: Refined typography, ample whitespace, subtle gradients, premium feel
   - **Playful**: Rounded shapes, bright colors, friendly micro-interactions
   - **Editorial**: Magazine-like hierarchy, strong headlines, clear grid

3. **Define constraints**  
   Tech stack (React, Vue, vanilla, etc.), dark/light preference, and any brand or accessibility requirements.

## What to Avoid

Do **not** default to:
- Generic system font stacks (Inter, Roboto, Arial, system-ui as the only choice)
- Predictable purple/violet gradients or "AI slop" color palettes
- Perfectly centered, symmetrical, cookie-cutter card layouts
- Flat, motionless layouts with no depth or hierarchy
- Placeholder copy like "Lorem ipsum" without suggesting real content style

## Design Pillars

### Typography
- Use distinctive font pairings (e.g., display + body from Google Fonts or similar).
- Establish clear hierarchy: one strong display/headline face, one readable body face.
- Vary weight and size to create rhythm, not just headings vs body.

### Color and Depth
- Pick a cohesive palette (3–5 colors) that fits the chosen aesthetic.
- Add depth via gradients, subtle shadows, or textures—not flat fills only.
- Ensure sufficient contrast for readability and focus states.

### Motion and Interaction
- Add purposeful motion: hover states, focus states, scroll-triggered or entrance animations.
- Keep animations short and purposeful (e.g., 200–400ms); avoid gratuitous motion.
- Consider reduced-motion preferences (`prefers-reduced-motion`) where appropriate.

### Spatial Composition
- Use asymmetry or intentional grid breaks to create interest.
- Vary spacing and alignment; avoid everything centered or one uniform grid.
- Use whitespace to group and separate content.

## Implementation Checklist

- [ ] Design framework documented (purpose, audience, aesthetic) before coding
- [ ] Typography: distinct pairing, clear hierarchy
- [ ] Color: cohesive palette, no default "AI purple" unless it fits the direction
- [ ] Depth: gradients, shadows, or texture where it supports the aesthetic
- [ ] Motion: at least hover/focus and one other intentional animation
- [ ] Layout: intentional asymmetry or grid variation, not a single centered column of cards
- [ ] Copy: placeholder text that matches tone (or note what copy should convey)

## Example Prompts That Activate This Skill

- "Create a dashboard for a music streaming app"
- "Build a landing page for an AI security startup"
- "Design a settings panel with dark mode support"
- "Make a distinctive portfolio section for a designer"

## Additional Resources

- For detailed anti-patterns and palette/motion examples, see [reference.md](reference.md).
