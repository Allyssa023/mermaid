# Fisherman Dashboard Redesign — Design Spec

## Overview

Full visual and UX redesign of all 8 fisherman pages (`FishermanDashboard.jsx` shell + Home, Trips, Catch Alerts, Deals, Orders, Earnings, Messages, Profile pages) using the MERMAID v2 design system. No backend changes — purely frontend JSX, CSS, and GSAP animations.

---

## Design System Tokens

Applied as CSS custom properties on `:root` inside `FishermanDashboard.jsx` (or a colocated `fisherman.css`):

```css
--bg-app:      #0e0820;
--bg-canvas:   #1f1633;
--bg-card:     #1a1230;
--bg-card-2:   #221940;
--bg-card-3:   #2a2050;
--hairline:    rgba(255,255,255,0.08);
--safe:        #6ee7b7;
--caution:     #fcd34d;
--unsafe:      #fb7185;
--accent-lime: #a3e635;
--accent-violet: #7c3aed;
--rail-w:      76px;
--rail-w-open: 256px;
```

Typography: Space Grotesk (display headings) / Rubik (UI labels, body).

---

## Architecture

**Base shell:** `FishermanDashboard.jsx` (SPA, `useState`-based page switching) — unchanged routing pattern. No migration to React Router.

**Data fetching:** Each page owns its own `useQuery` hooks (TanStack Query v5), importing from the existing `fisherman/api/` modules. No prefetching at shell level.

**Animations:** GSAP (CDN or npm `gsap`) — imported once in `FishermanDashboard.jsx`, used via `useGSAP` or `useEffect` refs in individual pages.

**Backend:** Zero changes. All API endpoints remain identical.

---

## Section 1: Shell & Rail (`FishermanDashboard.jsx`)

### Hover-expand Rail
- Collapsed: `76px` wide, icons only.
- Expanded: `256px` wide, icons + labels.
- Triggered by `onMouseEnter` / `onMouseLeave` on the `<nav>` element; sets `data-rail-open` attribute on root wrapper.
- CSS `width` transition: `250ms ease`.
- GSAP on expand: labels stagger in with `opacity 0→1` + `translateX -8px→0`, `40ms` stagger, after rail width settles.

### Active Nav Indicator
- Active page item: `3px` lime left-border + lime glow (`box-shadow: inset 3px 0 0 var(--accent-lime), 0 0 12px rgba(163,230,53,0.25)`).
- Icon color shifts to lime on active.

### Active Trip Mini-Card (expanded rail only)
- Appears at bottom of rail when a trip is `ACTIVE`.
- Glassmorphism panel: `--bg-card-3` background, `--hairline` border, `backdrop-filter: blur(12px)`.
- Shows: vessel/departure point, elapsed time, risk badge.
- GSAP: `fromTo` opacity `0→1` + `translateY 12px→0`, `200ms ease-out`.

### Page Transitions
- Page switch handler: outgoing page `gsap.to(ref, { opacity: 0, duration: 0.12 })` then incoming `gsap.fromTo(ref, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' })`.

---

## Section 2: Home Page

**Layout:** Viewport-locked bento (no page scroll). Two rows:

```
┌─────────────────────────┬────────────────────┐  row 1 (40vh)
│  La Union Conditions    │    Advisories      │
│  (risk hero, wave/wind) │  (scrollable list) │
├──────────────┬──────────┴──┬─────────────────┤  row 2 (60vh - rail height)
│ Zone Carousel│ Catch Alerts│  Trip Console   │
│ (4s auto)    │ (compact)   │  (glassmorphism)│
└──────────────┴─────────────┴─────────────────┘
```

### Conditions Hero
- Data: `GET /marine/conditions` (lat/lng for La Union).
- Large risk badge (SAFE/CAUTION/UNSAFE) using `--safe`/`--caution`/`--unsafe` tokens.
- Wave height, wind speed, gust — numeric values with GSAP counter animation on mount (`duration: 0.8, ease: 'power2.out'`).

### Advisories
- Data: `GET /advisories` (active only).
- Scrollable chip stack inside the card. Severity-coded: HIGH = `--unsafe`, MEDIUM = `--caution`, LOW = `--safe`.
- Empty state: "No active advisories" muted text.

### Zone Carousel
- Data: derived from conditions endpoint or per-zone breakdown.
- 4 zone cards auto-cycling every `4s`. GSAP crossfade: `opacity 1→0` on outgoing, `opacity 0→1` on incoming, `300ms`.
- Manual click on a zone card stops the timer and advances to that zone.
- Dots indicator below for current zone.

### Catch Alerts Strip
- Data: `GET /catch-alerts` filtered to current fisherman.
- Compact 3-row list: species name, kg, asking price. Truncated if more.
- "+ New Alert" CTA at bottom opens Create Alert drawer.

### Trip Console
- Data: `GET /trips/my` — find `ACTIVE` trip.
- **Active:** glassmorphism card — departure point, elapsed time (JS `setInterval` ticker), risk badge, "End Trip" button.
  - GSAP: timer badge `yoyo` scale `1→1.03`, `2s repeat: -1`.
- **No active trip:** "Start a Trip" CTA card with lime border.

---

## Section 3: Secondary Pages

### Trips (`GET /trips/my`)
- Timeline card list. Each card: departure point, target area, start/end times, status chip.
- Active trip: lime pulsing dot on status chip.
- "Start New Trip" button → modal.
- **Start Trip Modal:** glassmorphism panel. Fields: departure point, target area, safety checklist (checkboxes). Confirm button calls `POST /trips`. 
- GSAP: cards stagger in on mount (`fromTo` opacity+y, `40ms` stagger).

### Catch Alerts (`GET /catch-alerts`)
- Full-page grid of alert cards. Each: species, kg, asking price, status chip (ACTIVE lime / SOLD muted).
- "Create Alert" button → side drawer (slides in from right).
- **Create Alert Drawer:** species dropdown, kg input, asking price input, landing site. Calls `POST /catch-alerts`.
- GSAP: new card created → `fromTo` rotateX `20deg→0` + opacity.

### Deals (`GET /deals/my`)
- Cards grouped by status: NEGOTIATING → AGREED → EXPIRED.
- Each card: vendor name, species, quantity, latest proposal amount, time since last action.
- Click → opens `DealChatPane` in a slide-over panel.
- **Counter Proposal Modal:** price input, message. Calls `POST /deals/{id}/proposals`.
- GSAP: status chip color transitions on status change.

### Orders (`GET /orders/fisherman`)
- Order rows. Each: buyer name, species, kg, total, status.
- Inline stepper for handoff (seller confirms → buyer confirms) and payment sub-steps.
- **Confirm Modal:** "Confirm handoff" / "Confirm payment" — calls appropriate `POST` endpoint.
- GSAP: row slide-in stagger on mount.

### Earnings (`GET /earnings/summary`, `GET /earnings/transactions`)
- Top strip: total earned, this month, pending payout — stat cards.
- GSAP counter animation on all three numbers on mount.
- Transaction list below: date, species, kg, amount — styled as rows on `--bg-card`.

### Messages
- **Full redesign** using design system.
- Left sidebar: deal list cards — vendor name, species, last message preview, unread dot, timestamp.
  - Active deal: lime `3px` left-border.
- Right pane: chat history + input bar.
  - Fisherman bubbles: `rgba(163,230,53,0.12)` glass, lime text.
  - Vendor bubbles: `rgba(139,92,246,0.15)` glass, violet text.
  - Timestamps: muted, small.
  - Input bar: `--bg-card-2` background, lime send button.
- GSAP: new message bubbles `fromTo` opacity+translateY on append.
- Data: existing STOMP/WebSocket via `StompContext`.

### Profile (`GET /auth/me`, `PUT /profile/fisherman`)
- Avatar, name, phone, home port, bio fields.
- Read-only by default. "Edit Profile" button enters edit mode (fields become inputs inline).
- Save triggers `PUT` — success flash with lime toast.
- **Unsaved changes modal:** confirm before navigating away.
- GSAP: field focus highlight (`border-color` glow pulse on focus).

---

## Section 4: Modals Design System

All modals/drawers follow a single pattern:
- **Backdrop:** `rgba(14,8,32,0.7)` with `backdrop-filter: blur(8px)`.
- **Panel:** `--bg-card` background, `--hairline` border, `border-radius: 16px`.
- **Buttons:** Primary = lime background + dark text; Secondary = `--bg-card-2` + muted text; Danger = `--unsafe` tint.
- **GSAP entry:** backdrop `opacity 0→1` `120ms`; panel `translateY 24px→0` + `opacity 0→1` `200ms ease-out`.
- **GSAP exit:** reverse — panel slides down, backdrop fades.

---

## Loading & Error States

**Loading:** Skeleton cards using `--bg-card-2` with a GSAP shimmer (`scaleX` sweep on a pseudo-overlay, `1.2s repeat: -1`). Skeleton shape matches the real card.

**Error:** Inline error pill below the affected card — `--unsafe` colored text, "Retry" link calling `refetch()`. No full-page error screens.

**Empty states:** Centered muted icon + text inside the card. E.g., "No trips yet" with a + CTA.

---

## GSAP Animation Inventory

| Location | Animation | Trigger |
|---|---|---|
| Rail labels | `staggerFrom` opacity+x 200ms | `data-rail-open` change |
| Rail active trip card | `fromTo` opacity+translateY | trip becomes active |
| Page transitions | outgoing fade 120ms → incoming fade+slideY 200ms | page switch |
| Home stat numbers | counter 800ms ease-out | page mount |
| Home zone carousel | crossfade opacity 300ms | 4s interval |
| Trip console timer | `yoyo` scale 1→1.03, 2s repeat | active trip present |
| Card stagger (Trips, Deals, Orders) | `fromTo` opacity+y, 40ms stagger | page mount |
| Message bubbles | `fromTo` opacity+translateY | new message appended |
| Modal open/close | backdrop fade + panel slide 24px | modal state change |
| Catch Alert card reveal | `fromTo` rotateX 20deg→0 + opacity | new alert created |
| Skeleton shimmer | `scaleX` sweep repeat | while loading |

---

## Constraints

- No backend changes whatsoever.
- No new npm packages beyond `gsap` (if not already installed).
- All existing `fisherman/api/` modules reused as-is.
- `DealChatPane.jsx` and `StompContext.jsx` used without modification.
- Tests: Vitest + RTL tests updated alongside page rewrites (mock `useQuery` responses).
