# Fisherman Dashboard Redesign — Design Spec

## Overview

Full visual and UX redesign of all 8 fisherman pages (`FishermanDashboard.jsx` shell + Home, Trips, Catch Alerts, Deals, Orders, Earnings, Messages, Profile pages) using the MERMAID v2 design system. No backend changes — purely frontend JSX, CSS, and GSAP animations.

---

## Design System Tokens

Applied as CSS custom properties on `:root` inside `FishermanDashboard.jsx`:

```css
--bg-app:        #0e0820;
--bg-canvas:     #1f1633;
--bg-card:       #1a1230;
--bg-card-2:     #221940;
--bg-card-3:     #2a2050;
--hairline:      rgba(255,255,255,0.08);
--safe:          #6ee7b7;
--caution:       #fcd34d;
--unsafe:        #fb7185;
--accent-lime:   #a3e635;
--accent-violet: #7c3aed;
--rail-w:        76px;
--rail-w-open:   256px;
```

Typography: Space Grotesk (display headings) / Rubik (UI labels, body).

---

## Architecture

**Base shell:** `FishermanDashboard.jsx` (SPA, `useState`-based page switching). No migration to React Router.

**Data fetching:** Each page owns its own `useQuery` hooks (TanStack Query v5), importing from the existing `fisherman/api/` modules. Exception: the shell maintains one `useQuery` for the active trip (to power the rail mini-card) using `listTrips('ACTIVE')` from `fisherman/api/trips.js` — this is the only shell-level query, and the Home page reuses this same cached query result without issuing a duplicate request.

**Animations:** GSAP (install via `npm install gsap` if not already present). Imported per-file where needed.

**Backend:** Zero changes. All calls go through existing `fisherman/api/*.js` modules.

---

## Section 1: Shell & Rail (`FishermanDashboard.jsx`)

### Hover-expand Rail
- Collapsed: `76px` wide, icons only.
- Expanded: `256px` wide, icons + labels.
- Triggered by `onMouseEnter` / `onMouseLeave` on the `<nav>` element.
- Stores `railOpen` in `useState`; sets `data-rail-open={railOpen}` on the root wrapper `<div>`.
- CSS: `width: var(--rail-w)` transitions to `var(--rail-w-open)` in `250ms ease` when `[data-rail-open="true"]`.
- GSAP on expand: use `gsap.from(labelEls, { opacity: 0, x: -8, stagger: 0.04, duration: 0.2 })` after the rail width settles (triggered in `useEffect` watching `railOpen`).

### Active Nav Indicator
- Active page item: `box-shadow: inset 3px 0 0 var(--accent-lime), 0 0 12px rgba(163,230,53,0.25)`.
- Icon color shifts to `--accent-lime` on active item.

### Active Trip Mini-Card (expanded rail only)
- Visible only when `railOpen === true` AND an active trip exists.
- In collapsed state (`76px`), the card is `display: none` to prevent overflow.
- Data: shell-level `useQuery(['trips', 'ACTIVE'], () => listTrips('ACTIVE'))` — returns the first ACTIVE trip.
- Shows: `departurePoint`, elapsed time (JS `setInterval` each second), risk badge.
- Glassmorphism: `--bg-card-3` background, `--hairline` border, `backdrop-filter: blur(12px)`.
- GSAP entry: `gsap.fromTo(cardRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' })` when trip becomes active.

### Page Transitions
- Wrap the rendered page in `<div ref={pageRef}>` inside `FishermanDashboard.jsx`.
- On `setPage` call: first call `gsap.killTweensOf(pageRef.current)` to cancel any in-flight transition (handles rapid nav clicks), then `gsap.to(pageRef.current, { opacity: 0, duration: 0.12, onComplete: () => { setActivePage(next); gsap.fromTo(pageRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }) } })`.

### Unsaved Profile Navigation Guard
- Shell tracks `profileDirty` boolean via `useState`, passed as a prop to Profile.
- When `setPage` is called and `profileDirty === true`, show a confirm modal ("You have unsaved changes. Leave anyway?") before changing page. Confirm clears `profileDirty` and proceeds; cancel keeps the user on Profile.

---

## Section 2: Home Page

**Layout:** Viewport-locked bento (no page scroll, `overflow: hidden` on page wrapper). Two rows:

```
┌─────────────────────────┬────────────────────┐  row 1 (40vh)
│  La Union Conditions    │    Advisories      │
│  (risk hero, wave/wind) │  (scrollable list) │
├──────────────┬──────────┴──┬─────────────────┤  row 2 (calc(60vh - topbar))
│ Zone Carousel│ Catch Alerts│  Trip Console   │
│ (4s auto)    │ (compact)   │  (glassmorphism)│
└──────────────┴─────────────┴─────────────────┘
```

### Conditions Hero
- API: `fetchAllConditions()` from `marine.js` → `GET /marine/conditions`.
- Response shape: `{ zones: MarineConditionsResponse[], generatedAt }`. Each `MarineConditionsResponse` has: `zoneId`, `zoneName`, `risk: { level: RiskLevel, score, factors, advisory }`, `marine: { waveHeightM }`, `weather: { windSpeedKmh, windGustsKmh }`.
- For the hero, derive overall risk as the worst `risk.level` across all zones (UNSAFE > CAUTION > SAFE). Display: risk level badge, `marine.waveHeightM` (label "Wave Height"), `weather.windSpeedKmh` (label "Wind"), `weather.windGustsKmh` (label "Gusts").
- GSAP counter on mount: `gsap.to(obj, { val: targetNumber, duration: 0.8, ease: 'power2.out', onUpdate: () => el.textContent = obj.val.toFixed(1) })` for each numeric value.

### Advisories
- API: `fetchAdvisories(true)` from `marine.js` → `GET /advisories?activeOnly=true`.
- Scrollable chip stack inside the card. Severity color: HIGH = `--unsafe`, MEDIUM = `--caution`, LOW = `--safe`.
- Empty state: "No active advisories" centered muted text.

### Zone Carousel
- Data: same `fetchAllConditions()` query result (already cached). Iterate `response.zones` — each item is a `MarineConditionsResponse` with fields: `zoneId`, `zoneName`, `risk.level` (for the badge), `marine.waveHeightM`, `weather.windSpeedKmh`.
- Auto-cycle every `4000ms` with `useRef` interval.
- GSAP crossfade between zones: `gsap.to(cardRef.current, { opacity: 0, duration: 0.3, onComplete: () => { setActiveZoneIndex(next); gsap.fromTo(cardRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 }) } })`. The state update and fade-in **must** be inside `onComplete` to avoid a flash from simultaneous execution.
- Manual click on a dot indicator stops the interval timer and sets the active zone.
- Dot indicators below for current zone position.

### Catch Alerts Strip
- API: `listCatchAlerts()` from `catchAlerts.js` → `GET /fisherman/catch-alerts`.
- Compact 3-row list: species name, estimated quantity, asking price per kg. Truncate if more than 3 with "+ N more" link.
- "+ New Alert" CTA at bottom opens the Create Alert drawer (same drawer as on the Catch Alerts page — show it by lifting state or using a shared modal context).
- Empty state: "No active alerts" with a "Post Your First Alert" CTA.
- Error state: inline error pill inside the card (not below, since the home layout is viewport-locked). Shows "Failed to load alerts — Retry" with `refetch()` call.

### Trip Console
- Data: reuses shell-level `['trips', 'ACTIVE']` query (no new fetch).
- **Active trip exists:** Glassmorphism card — `departurePoint`, elapsed time ticker (`setInterval` every second, compute from `trip.startedAt`), risk badge from conditions, "End Trip" button that calls `endTrip(trip.id, {})` from `trips.js`.
  - GSAP pulse on timer badge: `gsap.to(timerRef.current, { scale: 1.03, repeat: -1, yoyo: true, duration: 2, ease: 'sine.inOut' })`.
- **No active trip:** "Start a Trip" CTA card with lime dashed border.
- **Error state:** inline error pill inside the card.

---

## Section 3: Secondary Pages

### Trips
- API: `listTrips()` → `GET /trips` (no status filter for full history).
- Timeline card list, newest first. Each card: `departurePoint`, `targetArea`, start/end times, status chip.
- Active trip status chip: lime dot using CSS `@keyframes pulse` (`opacity 0.4↔1`, `1.5s ease-in-out infinite`) — not GSAP.
- "Start New Trip" button opens Start Trip modal.

**Start Trip Modal**
- Fields: `departurePoint` (text), `targetArea` (text), `vesselName` (text), `notes` (textarea).
- Safety checklist is a **separate step after trip creation**: submit `POST /trips` first via `startTrip(body)`, then immediately show the checklist step where the fisherman checks off items and calls `saveChecklist(tripId, { items })` via `PUT /trips/{id}/checklist`.
- Two-step modal: Step 1 = trip details form → "Create Trip". Step 2 = checklist → "I'm Ready to Depart".
- Modal design: glassmorphism backdrop `rgba(14,8,32,0.7)` + `blur(8px)`, `--bg-card` panel, `border-radius: 16px`, width `min(480px, 92vw)`.
- GSAP entry: backdrop `opacity 0→1` `120ms`, panel `translateY 24px→0` + `opacity 0→1` `200ms ease-out`. Exit: reverse.

**GSAP:** Cards stagger in on mount — `gsap.from(cardEls, { opacity: 0, y: 16, stagger: 0.04, duration: 0.2 })`.

### Catch Alerts
- API: `listCatchAlerts()` → `GET /fisherman/catch-alerts`.
- Full-page grid of alert cards. Each: species name, quantity (display `quantityKg + ' kg'` if `quantityKg` is not null, else `quantityEstimate`), asking price per kg, status chip (ACTIVE = lime, SOLD = muted).
- "Create Alert" button → side drawer slides in from right.

**Create Alert Drawer**
- Required fields: `speciesId` (species dropdown, load via `fetchSpecies()` from `src/api/lookup.js` → `GET /lookups/fish-species` — public endpoint, no admin auth needed), `expiresInHours` (number input, `min=1`, `max=48`, label "Expires in (hours)").
- Optional fields: `quantityKg` (number, min 0.1), `landingSite` (text, max 200), `askingPricePerKg` (number, min 0), `notes` (textarea).
- Submit calls `createCatchAlert(body)` from `catchAlerts.js`.
- Drawer width: `min(420px, 100vw)`. Background: `--bg-card`. Slides in from right: `translateX(100%)→0`, `250ms ease-out`. Overlay backdrop same as modal.

**GSAP:** New alert card on create — `gsap.fromTo(newCardRef.current, { rotateX: 20, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.35, ease: 'power2.out' })` (enable `transformPerspective: 600` on the card).

### Deals
- API: `listMyDeals()` from `deals.js` → `GET /deals/mine`.
- Cards grouped by status: **NEGOTIATING** | **AGREED** | **REJECTED** | **EXPIRED** | **CANCELLED** (all 5 `DealStatus` values shown; empty groups hidden).
- Each card: vendor name, species, quantity (`qtyKg`), latest proposal `pricePerKg`, time since last activity.
- Clicking a card opens the DealChatPane in a slide-over panel (right side, `min(560px, 100vw)` wide).

**Counter Proposal Modal**
- Fields: `qtyKg` (number, required, min 0.1), `pricePerKg` (number, required, min 0). No message field.
- Submit calls `submitProposal(dealId, qtyKg, pricePerKg)` from `fisherman/api/deals.js` — 3 positional args, confirmed signature.
- Width: `min(400px, 92vw)`. Same glassmorphism modal design.

**GSAP:** Card stagger on mount — `gsap.from(cardEls, { opacity: 0, y: 16, stagger: 0.04 })`.

### Orders
- API: `listOrders()` from `orders.js` → `GET /orders/mine`.
- Order rows, newest first. Each: buyer/vendor name, species, quantity, total, status chip.
- Inline stepper for sub-steps: handoff (fisherman confirms via `confirmHandoff(id)` → `PUT /orders/{id}/handoff/confirm-seller`; then buyer confirms), payment (vendor records, fisherman confirms via `confirmPayment(id)` → `PUT /orders/{id}/payment/confirm`). Both functions confirmed in `fisherman/api/orders.js`.
- Stepper step indicator: numbered circles, completed = lime fill, pending = `--bg-card-2`.

**Confirm Modals**
- "Confirm Handoff" modal: single confirmation message + "Confirm" lime button. Calls `confirmHandoff(id)`.
- "Confirm Payment" modal: same pattern. Calls `confirmPayment(id)`.
- Both: width `min(380px, 92vw)`. Same glassmorphism modal design.

**GSAP:** Row stagger on mount — `gsap.from(rowEls, { opacity: 0, y: 12, stagger: 0.04 })`.

### Earnings
- APIs: `getEarningsSummary()` → `GET /fisherman/earnings/summary`; `getEarningsLedger()` → `GET /fisherman/earnings/ledger`.
- **Summary strip (4 stat cards):** `totalGross` (label "Total Gross"), `cashCollected` (label "Cash Collected"), `creditOutstanding` (label "Credit Outstanding"), `orderCount` (label "Orders"). All in `₱` except `orderCount`.
- GSAP counter on mount: `gsap.to(obj, { val: targetNumber, duration: 0.8, ease: 'power2.out', onUpdate: () => el.textContent = '₱' + obj.val.toLocaleString('en-PH', { minimumFractionDigits: 2 }) })`.
- **Ledger rows:** `date`, `vendorName`, `speciesName`, `qtyKg`, `gross`, `paymentMethod`, `status`. Styled as table rows on `--bg-card`.
- No chart — keep it simple.

### Messages
- **Full rewrite of `Messages.jsx`** using the new design system. The existing DM mode (DM tab, `getChatUsers`/`getConversation` imports, `mode` state, contact list) is **removed entirely** — fisherman communication is deals-only.

**Bubble styling:** `DealChatPane.jsx` is **not structurally modified**. It uses `--accent-soft` (fisherman/mine bubbles) and `--paper-2` (other-party bubbles). Override these CSS variables in the fisherman shell scope (set them on the root `[data-fisherman-shell]` wrapper or in `FishermanDashboard.jsx`):
```css
--accent-soft: rgba(163, 230, 53, 0.12);
--paper-2:     rgba(139, 92, 246, 0.15);
```
This achieves lime/violet bubbles without touching `DealChatPane.jsx` internals.

**Unread tracking:** Use the existing `readLastViewed` / `writeLastViewed` utilities from `src/utils/dealsLocalStorage.js` — do **not** introduce a new `Set`. When a deal is selected call `writeLastViewed(dealId)` (one argument — stores current timestamp). `readLastViewed(dealId)` returns a `Date`. Unread dot renders when `new Date(deal.lastMessageAt) > readLastViewed(dealId)`. The STOMP subscription is already wired in existing `Messages.jsx` — keep it.

**Layout:**
- Left sidebar (`280px` fixed, `--bg-card` background): scrollable deal list from `listMyDeals()`.
  - Each row: vendor name, species, unread dot (lime), relative timestamp.
  - Active deal row: lime `3px` left-border (`box-shadow: inset 3px 0 0 var(--accent-lime)`).
- Right pane (flex-1, `--bg-canvas` background): render `<DealChatPane>` using the existing `fishermanDealsApi` prop pattern — no changes to DealChatPane's props or internal data flow.

**GSAP:** New message bubble — `gsap.fromTo(bubbleEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' })`. Trigger via `MutationObserver` on the thread container or a `useEffect` watching message list length.

### Profile
- API: `getProfile()` from `profile.js` → `GET /fisherman/profile`. Returns `FishermanProfile`: `fullName`, `email`, `vesselName`, `landingSite`, `emergencyContactName`, `emergencyContactPhone`, `gcashNumber`, `mayaNumber`.
- `fullName` and `email` are **read-only** (not editable — `FishermanProfileUpdateRequest` excludes both). Display them as plain text labels above the editable fields.
- Editable fields (match `FishermanProfileUpdateRequest` exactly):
  - Vessel Name (`vesselName`)
  - Landing Site (`landingSite`)
  - Emergency Contact Name (`emergencyContactName`)
  - Emergency Contact Phone (`emergencyContactPhone`)
  - GCash Number (`gcashNumber`)
  - Maya Number (`mayaNumber`)
- Read-only by default. "Edit Profile" button switches to edit mode (inputs replace text).
- Save calls `updateProfile(body)` → `PUT /fisherman/profile` with `FishermanProfileUpdateRequest` (all fields except `fullName`/`email`).
- On save success: lime toast notification ("Profile updated").
- On unsaved changes + navigation attempt: shell's `profileDirty` guard triggers confirm modal (see Shell section).
- **Unsaved changes modal**: width `min(380px, 92vw)`. "Leave anyway?" + "Stay on Profile" buttons.

**GSAP:** Field focus highlight — on focus, `gsap.to(fieldRef.current, { boxShadow: '0 0 0 2px rgba(163,230,53,0.4)', duration: 0.15 })`; on blur, reverse.

---

## Section 4: Modals Design System

All modals/drawers follow a single pattern:

- **Backdrop:** `rgba(14,8,32,0.7)` with `backdrop-filter: blur(8px)`.
- **Panel:** `--bg-card` background, `--hairline` border, `border-radius: 16px`, width `min(440px, 92vw)` (overridden per-modal where specified).
- **Buttons:** Primary = `--accent-lime` background + dark text; Secondary = `--bg-card-2` + muted text; Danger = `--unsafe` tint.
- **GSAP entry:** backdrop `opacity 0→1` `120ms`; panel `translateY 24px→0` + `opacity 0→1` `200ms ease-out`.
- **GSAP exit:** backdrop `opacity 1→0` `120ms`; panel `translateY 0→24px` + `opacity 1→0` `150ms ease-in`.

---

## Loading & Error States

**Loading skeletons:** Real `<div>` child elements (not CSS pseudo-elements — GSAP cannot animate `::before`/`::after`). Skeleton shape matches the real card. GSAP shimmer: `gsap.fromTo(shimmerEl, { x: '-100%' }, { x: '100%', repeat: -1, duration: 1.2, ease: 'none' })` on an absolutely-positioned `<div>` inside an `overflow: hidden` parent.

**Error states:** Inline error pill inside the affected card (not below it — the Home bento is viewport-locked with no scroll). Content: `--unsafe`-colored text + "Retry" link calling `queryResult.refetch()`.

**Empty states:** Centered muted icon + single line of text + optional CTA button. Styled with `--bg-card` card wrapper.

---

## GSAP Animation Inventory

| Location | Method | Values | Trigger |
|---|---|---|---|
| Rail labels (expand) | `gsap.from(els, { opacity:0, x:-8, stagger:0.04, duration:0.2 })` | — | `railOpen` becomes `true` |
| Rail active trip card | `gsap.fromTo(ref, { opacity:0, y:12 }, { opacity:1, y:0, duration:0.2 })` | ease: power2.out | trip becomes ACTIVE |
| Page out | `gsap.killTweensOf(ref)` then `gsap.to(ref, { opacity:0, duration:0.12 })` | — | `setPage` called |
| Page in | `gsap.fromTo(ref, { opacity:0, y:16 }, { opacity:1, y:0, duration:0.2 })` | ease: power2.out | inside `onComplete` of page-out |
| Home stat numbers | `gsap.to(obj, { val:target, duration:0.8, onUpdate })` | ease: power2.out | Home page mount |
| Home zone crossfade | `gsap.to` out opacity 0 → update state → `gsap.fromTo` in opacity 0→1 | 300ms | 4s interval / dot click |
| Trip console timer badge | `gsap.to(ref, { scale:1.03, repeat:-1, yoyo:true, duration:2 })` | ease: sine.inOut | active trip exists |
| Card stagger (Trips, Deals, Orders) | `gsap.from(els, { opacity:0, y:16, stagger:0.04, duration:0.2 })` | — | page mount |
| New message bubble | `gsap.fromTo(el, { opacity:0, y:8 }, { opacity:1, y:0, duration:0.2 })` | ease: power2.out | message appended |
| Modal/drawer open | backdrop `opacity 0→1`, panel `translateY 24→0 + opacity 0→1` | 120ms / 200ms | modal state true |
| Modal/drawer close | backdrop `opacity 1→0`, panel `translateY 0→24 + opacity 1→0` | 150ms | modal state false |
| New catch alert card | `gsap.fromTo(el, { rotateX:20, opacity:0 }, { rotateX:0, opacity:1 })` | transformPerspective:600, 350ms | alert created |
| Skeleton shimmer | `gsap.fromTo(shimmerDiv, { x:'-100%' }, { x:'100%', repeat:-1, duration:1.2 })` | ease: none | while loading |
| Profile field focus | `gsap.to(field, { boxShadow:'0 0 0 2px rgba(163,230,53,0.4)', duration:0.15 })` | — | `onFocus` |
| Trips active dot | CSS `@keyframes pulse` (`opacity 0.4↔1`, `1.5s ease-in-out infinite`) | — | trip status ACTIVE |

---

## Constraints

- No backend changes whatsoever.
- All API calls go through existing `fisherman/api/*.js` modules — no new axios calls inline.
- `gsap` added as npm dependency (`npm install gsap`) if not already present.
- `DealChatPane.jsx`: no structural changes. Bubble colors achieved by overriding `--accent-soft` and `--paper-2` in the fisherman shell scope.
- `StompContext.jsx`: no changes.
- Vitest + RTL tests updated alongside page rewrites (mock `useQuery` with `vi.mock`).
