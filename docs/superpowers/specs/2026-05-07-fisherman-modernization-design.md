# Fisherman Role Modernization — Design Spec
**Date:** 2026-05-07  
**Branch:** fisherman-modernization  
**Author:** limmonjuice  

---

## Background

The fisherman role is the platform's primary supply-side actor. Isidro (fisherman persona) goes out to sea late evening to early morning, returns at dawn, and posts a catch alert when he's back at shore — vendors are waiting. The current fisherman frontend is a monolithic `src/FishermanDashboard.jsx` (1,151 lines) with state-based navigation, loose page files in `src/` root, and no consistent design system application. This plan brings the fisherman role to parity with the vendor and buyer roles architecturally, applies the mermaid-handoff design system uniformly, and adds three new feature clusters: earnings/utang tracking, profile/SMS safety, and dispute management.

### Real-World Workflow (Field Research)
- Fishermen depart late evening, return early morning
- Vendors wait at shore — catch alert is the supply signal
- Price negotiation happens on the spot
- **Utang (credit):** vendors often take fish on credit, paying the fisherman back after selling
- **Pre-orders:** vendors can reserve a species/quantity before the fisherman departs
- **Disputes:** weight and quality disagreements are common at handoff
- **Safety:** fishermen go out alone at night; an emergency contact SMS is genuine life-safety value

---

## Goals

1. Restructure fisherman frontend into `fisherman/` directory with React Router (mirrors vendor/buyer)
2. Apply mermaid-handoff design system across all pages (CSS classes, CSS variables, `handoff.css`)
3. Add earnings dashboard with utang/credit tracking and settlement flow
4. Add fisherman profile page with vessel info and emergency contact
5. Send SMS via textbee (Android gateway, open source) on trip start/end
6. Add dispute management for weight/quality disagreements on procurement orders
7. Add push notification bell for new vendor orders

## Non-Goals

- Vendor demand signals surfaced to fisherman (dropped — fishermen catch what the sea gives)
- Catch log CRUD (deferred to a later phase — schema exists in V9)
- Payout requests / financial withdrawals (deferred)
- Trip Planner as a standalone nav page (folded into trip start modal on Trips page)

---

## Architecture

### Frontend Structure

```
frontend/src/fisherman/
  FishermanDashboard.jsx      ← router only (like VendorDashboard.jsx)
  FishermanLayout.jsx         ← Rail + Topbar + Outlet, data-accent="ocean"
  Home.jsx                    ← dashboard overview
  Trips.jsx                   ← My Trips list + Start Trip modal
  CatchAlerts.jsx             ← catch alert management
  Orders.jsx                  ← marketplace orders (buyer → fisherman)
  Procurement.jsx             ← vendor orders inbox for fisherman
  Marketplace.jsx             ← browse buyer marketplace listings
  Messages.jsx                ← messaging
  Earnings.jsx                ← NEW: earnings ledger with cash/utang split
  Profile.jsx                 ← NEW: vessel, landing site, emergency contact
  api/
    trips.js
    catchAlerts.js
    earnings.js
    procurement.js
    profile.js
  hooks/
    useFishermanPolling.js    ← mirrors useVendorPolling pattern
  components/
    NotificationsBell.jsx     ← push notification bell (new vendor orders)
    StatTile.jsx              ← KPI tile (mirrors vendor StatTile)
```

### Navigation (9 items)

| Route | Label | Icon |
|---|---|---|
| `/fisherman/home` | Home | Dashboard |
| `/fisherman/trips` | Trips | Anchor |
| `/fisherman/catch-alerts` | Catch Alerts | Bell |
| `/fisherman/orders` | Orders | Clipboard |
| `/fisherman/procurement` | Procurement | Store |
| `/fisherman/marketplace` | Marketplace | Fish |
| `/fisherman/earnings` | Earnings | Receipt |
| `/fisherman/messages` | Messages | Message |
| `/fisherman/profile` | Profile | Settings |

### Design System

**`data-accent="ocean"` CSS rule** — this rule does NOT yet exist in `design-system.css` and must be created verbatim in Phase 0:

```css
[data-accent="ocean"] {
  --accent:      oklch(0.55 0.09 220);
  --accent-2:    oklch(0.45 0.09 220);
  --accent-soft: oklch(0.93 0.03 220);
  --accent-ink:  oklch(0.98 0.01 220);
}
```

The attribute is placed on the `.app` root `<div>` inside **`FishermanLayout.jsx`** (not `FishermanDashboard.jsx`) — exactly as `VendorLayout.jsx` applies its accent. `FishermanDashboard.jsx` (the router file) passes `user` and `onLogout` props (received from `App.jsx`) down to `FishermanLayout` which renders them in the topbar.

All pages use `.page`, `.page__head`, `.page__title` with `<em>`, `.eyebrow`, `.card`, `.btn` variants, `.chip` variants, `.tbl`, `.status` pills, `.modal-overlay`, `.form-grid`, `.form-row`, `.input`.  
Icons exclusively from `I` in `icons.jsx` — no inline SVG components.  
`handoff.css` imported in `fisherman/FishermanDashboard.jsx` (router).  
No hardcoded hex or rgba — CSS variables only.

### Routing Change in `App.jsx`

The existing fisherman branch in `App.jsx` renders `<FishermanDashboard>` without a `<BrowserRouter>` wrapper (vendor and buyer each have their own inner `<BrowserRouter>`). Phase 0 must wrap the fisherman branch in `<BrowserRouter>` exactly as done for vendor and buyer, replace the old state-based component with the new `fisherman/FishermanDashboard`, and pass through `user`, `token`, and `onLogout` props. Routes mount under `/fisherman/*`. The old `src/FishermanDashboard.jsx` is removed in Phase 0 after the cutover is verified.

---

## Phases

### Phase 0 — Scaffold & Architecture

**Deliverables:**
- `fisherman/FishermanLayout.jsx` — Rail (9 nav items), Topbar, Outlet; root `<div className="app" data-accent="ocean">`; receives `user` and `onLogout` props
- `fisherman/FishermanDashboard.jsx` — React Router `<Routes>` only, imports `'../design-system.css'` and `'../handoff.css'`, passes `user`/`onLogout` to `FishermanLayout`
- `fisherman/api/` modules (stubs for all endpoints)
- `fisherman/hooks/useFishermanPolling.js`
- `[data-accent="ocean"]` block added to `design-system.css` (verbatim rule above — this key does not yet exist)
- `App.jsx` updated: fisherman branch wrapped in `<BrowserRouter>`, old `FishermanDashboard` import replaced, `user`/`token`/`onLogout` props threaded

**No visual changes yet** — existing functionality preserved via new routing shell. Old `src/FishermanDashboard.jsx` removed after cutover.

---

### Phase 1 — Core Dashboard + Trips

**`fisherman/Home.jsx`**

Redesign of current dashboard. Sections:
- Page header: eyebrow "Fisherman · Operations", title "Today on the *water*.", date/time sub
- KPI strip (4 tiles): Safe Zones, Caution Zones, Avg Wave Height, Max Wind Speed — `.kpi` / `.grid.grid--kpi`
- Hero: sea status headline with overall risk label, chip row (zone counts + active advisories)
- 48h Forecast chart: SVG-based, wave + wind, hover tooltip — extracted as `ForecastChart` component
- Zone carousel: animated zone card carousel — extracted as `ZoneCarousel` component
- Active trip card: extracted as `ActiveTripCard`
- Active advisories: `.adv-list` / `.adv-item`
- Pending orders summary: clicks through to `/fisherman/procurement`
- Quick actions: Start Trip, Catch Alerts, Earnings, Procurement — uses `useNavigate()`

All inline components cleaned up. No state-based page switching.

**`fisherman/Trips.jsx`**

Absorbs `MyTrips.jsx` and trip start flow from `TripPlanner.jsx`.

- Page header: eyebrow "Fisherman · Safety", title "My *Trips*."
- Start Trip button → opens `StartTripModal`
- Trip list with status chips (ACTIVE, ENDED), duration, vessel name
- Active trip shown prominently at top with safety checklist progress bar and "End Trip" button
- Trip detail expand: checklist items, zone tagged (if any), departure/return times

**`StartTripModal`** (inline component):
- Step 1: Vessel name (pre-filled from profile) + confirm
- Step 2: Safety checklist (required — all items must be checked to proceed). Checklist items match the existing `trips` table columns from V8: **Life Vest** (`life_vest_checked`), **Radio** (`radio_checked`), **Fuel Level** (`fuel_checked`), **Engine Check** (`engine_checked`), **Weather Reviewed** (`weather_reviewed`), **Emergency Kit** (`emergency_kit_checked`). All six must be checked before the "Start Trip" button enables.
- Step 3: Optional zone selection (skip allowed)
- On confirm: `POST /trips` with checklist booleans → success → SMS sent to emergency contact (handled by backend, non-blocking)

**`fisherman/components/NotificationsBell.jsx`**
- Reuses existing `/notifications/unread-count` and `/notifications` endpoints (role-scoped by JWT principal — same endpoints as vendor bell, no new endpoint needed)
- Dropdown showing recent procurement order notifications
- Mirrors vendor `NotificationsBell` pattern exactly

---

### Phase 2 — Transaction Pages Migration

All pages migrate from `src/` root files to `fisherman/` directory with design system applied. Each old file is removed after its replacement is wired into the router.

**Backend note:** No new endpoints in this phase. All pages use existing API routes.

**Backend fix required in this phase:** `ProcurementOrderService.listForFisherman()` currently has no `"DISPUTED"` case in its switch — it falls through to the default branch and returns PENDING/ACCEPTED/READY rows instead of DISPUTED rows. Add `case "DISPUTED"` that filters `orders.status = 'DISPUTED'`. Apply the same fix to `listForVendor()`. Both changes are required for the DISPUTED status tab to work correctly.

**`fisherman/CatchAlerts.jsx`**
- Replaces `src/CatchAlerts.jsx` (854 lines, inline SVG icons)
- Page: eyebrow "Fisherman · Supply", title "Catch *Alerts*."
- Active alerts as `.alert-card` with freshness chips (`.chip--safe/caution/unsafe.chip--dot`)
- Create alert: `.modal-overlay` + `.form-grid` + `.input` fields (species, qty, price, landing site, expiry)
- Cancel action: `.btn.btn--ghost.btn--sm` with `.btn.btn--unsafe` confirm
- All icons from `I` in `icons.jsx` — remove 8 inline SVG icon components

**`fisherman/Procurement.jsx`**
- Replaces `FishermanProcurementTab` component in `src/FishermanDashboard.jsx`
- Page: eyebrow "Fisherman · Sales", title "Vendor *Orders*."
- Status tabs: `.seg` / `.seg__btn.on` (PENDING, ACCEPTED, READY, COMPLETED, CANCELLED, DISPUTED)
- Each order as `.card` with `.card__head` (species + order ID `.kbd`), `.status` pill
- Pre-orders: `chip--accent` badge "Preorder" + sub-text "Accept before your next trip"
- Actions: `.btn.btn--accent.btn--sm` (Accept), `.btn.btn--primary.btn--sm` (Mark Ready / Complete), `.btn.btn--ghost.btn--sm` with `var(--unsafe)` (Cancel)
- Cancel reason: `.input` inline
- Payment method badge on COMPLETED orders: conditionally rendered only if `order.paymentMethod` is present (`order.paymentMethod &&  ...`) since this field is added in Phase 3. When present: CASH → `chip--safe`, CREDIT/UTANG → `chip--caution`.

**`fisherman/Orders.jsx`**
- Replaces `src/Orders.jsx` (marketplace orders from buyers)
- Design system migration: `.page`, `.card`, `.tbl`, `.status`, `.chip` variants, `I` icons

**`fisherman/Marketplace.jsx`**
- Replaces `src/Marketplace.jsx`
- Design system migration

**`fisherman/Messages.jsx`**
- Replaces `src/Messages.jsx`
- Design system migration

---

### Phase 3 — Earnings + Utang System

**Problem:** vendors take fish on credit (utang) and pay back after selling. Fishermen need to track what they've earned vs what's still owed.

**Deployment dependency:** The earnings endpoints (`GET /fisherman/earnings/summary` and the ledger) query the `payment_method` column added in V43. These endpoints cannot be deployed before V43 has run. Since Flyway runs on startup automatically, ensure V43 migration file is present before starting the backend in any environment.

**Backend**

Step 1 — add to `api.yaml` and run `./mvnw generate-sources`:
- New tag: `Fisherman Earnings`
- `GET /fisherman/earnings/summary` → `EarningsSummary { totalGross, cashCollected, creditOutstanding, orderCount }`
- `GET /fisherman/earnings/ledger?from=&to=` → `List<EarningsLedgerRow> { orderId, vendorName, speciesName, qtyKg, gross, paymentMethod, status, settledAt, date }`
- New tag addition to existing vendor paths: `PUT /vendor/procurement-orders/{id}/settle` → body `OrderSettleRequest { paymentMethod, settleNotes }`
- **Update `ProcurementOrderSummary` schema** in `api.yaml` to add `paymentMethod` (string, nullable) and `settledAt` (datetime, nullable) fields — required for the frontend payment badge and settle flow

Step 2 — Flyway migration `V43__add_payment_method_to_orders.sql`:
```sql
-- Targets the `orders` table (procurement orders use order_kind = 'PROCUREMENT')
ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(10) NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH', 'CREDIT')),
  ADD COLUMN settled_at TIMESTAMP,
  ADD COLUMN settle_notes TEXT;
```

Step 3 — domain update: add `paymentMethod`, `settledAt`, `settleNotes` fields to `Order.java`. Update `ProcurementOrderMapper` to populate the new `ProcurementOrderSummary` DTO fields.

Step 4 — implement generated interfaces:
- `EarningsController implements FishermanEarningsApi` — delegates to `EarningsService`
- `EarningsService` — queries COMPLETED procurement orders where `sellerId = fishermanId`, aggregates totals by `payment_method`
- `VendorProcurementController` settle endpoint:
  - Authorization: `order.getBuyerId().equals(currentVendorId())` — vendor is the **buyer** on procurement orders, NOT the seller. A fisherman calling `PUT /vendor/...` is already blocked by Spring Security role auth on the URL prefix; the service-level check guards against one vendor settling another vendor's order.
  - "Already settled" is defined as `order.getSettledAt() != null` — if so, return 200 with no changes (idempotent).
  - Sets `order.paymentMethod`, `order.settledAt = now()`, `order.settleNotes`.
  - Fires notification to fisherman (seller).

**Frontend — `fisherman/Earnings.jsx`**

- Page header: eyebrow "Fisherman · Finance", title "My *Earnings*."
- Summary strip (3 tiles): Total Gross, Cash Collected (`var(--safe)`), Outstanding Utang (`var(--caution)`)
- Date range filter: `.card` with `.form-row` date inputs + Apply button (mirrors vendor Payouts)
- Ledger table: `.tbl` with columns Order, Date, Vendor, Species, Qty, Gross, Payment, Status
- Payment method pills: `chip--safe` = Cash, `chip--caution` = Credit/Utang, `chip` (neutral) = Settled
- Empty state: `.empty` + `.empty__title`

**Frontend — Vendor `ProcurementOrders.jsx` update**

On COMPLETED orders: add "Mark as Paid" button (`.btn.btn--accent.btn--sm`) which opens a small modal: payment method (CASH | CREDIT) + optional settle notes → calls `PUT /vendor/procurement-orders/{id}/settle`. Button is hidden once `order.settledAt` is non-null (already settled).

---

### Phase 4 — Profile + SMS Safety

**Backend**

Step 1 — add to `api.yaml` and run `./mvnw generate-sources`:
- New tag: `Fisherman Profile`
- `GET /fisherman/profile` → `FishermanProfile { vesselName, landingSite, emergencyContactName, emergencyContactPhone, fullName }`
- `PUT /fisherman/profile` → body `FishermanProfileUpdateRequest { vesselName, landingSite, emergencyContactName, emergencyContactPhone }`

Step 2 — Flyway migration `V44__fisherman_profile_fields.sql`:
```sql
ALTER TABLE users
  ADD COLUMN vessel_name VARCHAR(100),
  ADD COLUMN landing_site VARCHAR(100),
  ADD COLUMN emergency_contact_name VARCHAR(100),
  ADD COLUMN emergency_contact_phone VARCHAR(20);
```

Step 3 — implement:

`SmsService` interface:
```java
public interface SmsService {
    void send(String toNumber, String message);
}
```

`TextbeeSmsService` implementation:
- Config: `sms.textbee.apiKey`, `sms.textbee.globeDeviceId`, `sms.textbee.smartDeviceId`
- Carrier routing by prefix (Globe: 0917/0918/0916; Smart: 0919/0920/0921/0928; default: Globe device)
- POST to `https://api.textbee.dev/api/v1/gateway/devices/{deviceId}/send-sms`, header `x-api-key`

`TripService` changes:
- Inject `UserRepository` (already likely present) alongside `SmsService`.
- `startTrip(fishermanId, ...)` — after saving the trip, fetch the fisherman's `User` entity via `UserRepository` to get `emergencyContactPhone` and `vesselName`. If `emergencyContactPhone` is null, skip SMS silently.
- `endTrip(tripId, fishermanId, ...)` — same pattern: fetch user, get phone, skip if null.
- Wrap SMS call: `try { smsService.send(phone, message) } catch (Exception e) { log.warn("SMS failed: {}", e.getMessage()) }` — trip succeeds regardless.

SMS message templates:
- Departure: `"{name} has departed for fishing at {time}. Vessel: {vessel}. Expected return: early morning. - MERMAID Safety"`
- Return: `"{name} has returned safely at {time}. - MERMAID Safety"`

Step 4 — `FishermanProfileController implements FishermanProfileApi`

**Frontend — `fisherman/Profile.jsx`**

- Page header: eyebrow "Fisherman · Account", title "My *Profile*."
- Two-section layout (mirrors vendor ShopProfile):
  - Left `.card`: Basic Info — full name (read-only from auth), vessel name `.input`, landing site `.input`
  - Right `.card`: Safety Contact — emergency contact name `.input`, phone `.input`, SMS preview box showing the departure message template with the fisherman's name/vessel filled in
- Save button in `page__actions`
- Success/error banners using `var(--safe-soft)` / `var(--unsafe-soft)`

---

### Phase 5 — Disputes

**Problem:** weight and quality disagreements at handoff. Both fisherman and vendor can raise a dispute; only the counter-party (the party that did not raise it) can resolve it.

**Backend**

Step 1 — add to `api.yaml` and run `./mvnw generate-sources`:
- New tag: `Order Disputes`
- `POST /fisherman/procurement-orders/{id}/dispute` → `OrderDisputeRequest { claimedWeightKg, claimedQuality, notes }`
- `POST /vendor/procurement-orders/{id}/dispute` → same request body
- `PUT /fisherman/procurement-orders/{id}/dispute/resolve` → `DisputeResolveRequest { resolution }` — called by fisherman when **vendor** raised the dispute. Returns 403 if the fisherman was the raising party.
- `PUT /vendor/procurement-orders/{id}/dispute/resolve` → `DisputeResolveRequest { resolution }` — called by vendor when **fisherman** raised the dispute. Returns 403 if the vendor was the raising party.
- `GET /fisherman/procurement-orders/{id}/dispute` → `OrderDispute { id, raisedBy, status, claimedWeightKg, claimedQuality, notes, resolvedAt, resolution }`
- `GET /vendor/procurement-orders/{id}/dispute` → `OrderDispute` — vendor needs this to determine who raised the dispute and whether to show "Resolve Dispute" or "Pending resolution."

Step 2 — Flyway migration `V45__order_disputes.sql`:
```sql
CREATE TABLE order_disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('FISHERMAN', 'VENDOR')),
  original_weight_kg DECIMAL(8,2),
  claimed_weight_kg DECIMAL(8,2),
  claimed_quality VARCHAR(20) CHECK (claimed_quality IN ('FRESH', 'SUBSTANDARD', 'DAMAGED')),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolved_at TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Note: `order_disputes.order_id` references `orders(id)` — NOT a `procurement_orders` table (which does not exist; procurement orders use `orders` table with `order_kind = 'PROCUREMENT'`).

Step 3 — implement `DisputeService`:

**`DisputeService.raise(orderId, raisedBy, request)`:**
- Sets `orders.status` to `DISPUTED` **directly** (bypasses the standard procurement transition guards — disputes are a cross-cutting concern, not a normal order flow step). The existing `ProcurementOrderService.fishermanTransition()` only allows `ACCEPTED→READY`, `READY→COMPLETED`, and cancellations; `DisputeService` must bypass these guards and update status directly via `orderRepository.save()`.
- Returns 409 if an OPEN dispute already exists for the order (`order_disputes.order_id = ? AND status = 'OPEN'`).
- Applicable from READY and COMPLETED order states.

**`DisputeService.resolve(orderId, callerRole, resolution)`:**
- Loads the open dispute for the order. Checks `dispute.getRaisedBy()` — if it matches `callerRole`, throws `ForbiddenException` (403). Counter-party only.
- Sets `dispute.status = RESOLVED`, `dispute.resolvedAt = now()`, `dispute.resolution`.
- Transitions `orders.status` back to `COMPLETED` directly (same reasoning as raise — bypasses state machine guards).
- Fires notification to the raising party.

**`fisherman/Procurement.jsx` update**

On COMPLETED and READY orders: "Flag Dispute" button (`.btn.btn--ghost.btn--sm` with `var(--unsafe)` color). Opens dispute modal:
- Original weight (pre-filled from order, read-only)
- Your claimed weight: `.input` (number)
- Quality assessment: `.seg` buttons (Fresh / Substandard / Damaged)
- Notes: textarea `.input`
- Submit: `.btn.btn--primary.btn--sm`

Disputed orders show `.status.status--disputed` pill. Once dispute is RESOLVED (poll `GET /fisherman/procurement-orders/{id}/dispute`), the pill switches to `.status.status--completed`.

**Vendor `ProcurementOrders.jsx` update**

Same dispute flag on READY/COMPLETED orders. Fetch `GET /vendor/procurement-orders/{id}/dispute` to determine who raised it:
- If `dispute.raisedBy === 'FISHERMAN'` → vendor sees "Resolve Dispute" button → calls `PUT /vendor/procurement-orders/{id}/dispute/resolve`
- If `dispute.raisedBy === 'VENDOR'` → vendor sees "Awaiting fisherman resolution" (read-only)

---

## Data Flow Summary

```
Fisherman posts CatchAlert
    → vendor sees in ProcurementFeed
    → vendor places order (CASH or CREDIT)
    → fisherman sees in Procurement tab (chip--accent badge if preorder)
    → fisherman accepts → marks ready → completes
    → if CREDIT: vendor later "Mark as Paid" → order.paymentMethod set, settledAt recorded
      → fisherman sees settled in Earnings ledger
    → if dispute: either party flags → orders.status → DISPUTED (direct set, bypasses guards)
      → counter-party resolves → orders.status → COMPLETED, notification fired

Fisherman starts Trip
    → safety checklist confirmed (all 6 items: life_vest, radio, fuel, engine, weather, emergency_kit)
    → backend fetches emergencyContactPhone from users table, fires SMS via textbee (non-blocking)
    → trip goes ACTIVE, timer starts on dashboard
    → fisherman ends trip
    → backend fires return SMS (non-blocking)
    → fisherman posts catch alert to notify waiting vendors
```

---

## Error Handling

- SMS failures are non-blocking — `TripService` catches all `Exception`, logs a warning, trip proceeds regardless
- SMS skipped silently if `emergencyContactPhone` is null (profile not yet filled)
- Settlement is idempotent — "already settled" is defined as `order.getSettledAt() != null`; returns 200 with no side effects
- Dispute creation blocked if an OPEN dispute already exists for the order (409 Conflict)
- Dispute resolve blocked if caller is the raising party (403 Forbidden)
- All new endpoints follow existing `GlobalExceptionHandler` mappings (404 / 400 / 403 / 409 / 503)
- Frontend: explicit error state with `var(--unsafe-soft)` banners on all API failures

---

## Testing

**Backend (per-phase):**
- `@WebMvcTest` for each new controller; `@MockitoBean` for service dependencies; `@MockitoBean JwtDecoder jwtDecoder`
- JWT: `.jwt().claim("roles", List.of("ROLE_FISHERMAN"))` or `"ROLE_VENDOR"` as appropriate
- `EarningsServiceTest` — aggregation of cash/credit totals from mixed order list
- `TripServiceTest` — SMS called on startTrip and endTrip; SMS exception does NOT propagate; SMS skipped when `emergencyContactPhone` is null
- `TextbeeSmsServiceTest` — Globe prefix routes to globeDeviceId; Smart prefix routes to smartDeviceId; unknown prefix defaults to Globe device
- Settle endpoint test: vendor (buyer) can settle their own order; a vendor calling settle on a different vendor's order gets 403 from service-level `getBuyerId()` check. (Note: a fisherman calling `PUT /vendor/...` is blocked at URL auth before reaching the service — 403 from role security, not service logic.)
- Dispute tests: raise succeeds from READY/COMPLETED; duplicate raise returns 409; raising party cannot resolve (403 from service); counter-party can resolve; resolved dispute transitions order status back to COMPLETED

**Frontend:**
- Vitest + Testing Library per phase
- Earnings page: renders correct cash vs utang totals
- StartTripModal: "Start" button disabled until all 6 checklist items checked
- Procurement: preorder badge renders for `isPreorder: true` orders
- NotificationsBell: shows unread count from `/notifications/unread-count`

---

## Migration Cleanup

After all phases complete, remove:
- `src/FishermanDashboard.jsx` — removed in Phase 0 after cutover
- `src/CatchAlerts.jsx` — removed after Phase 2
- `src/MyTrips.jsx` — removed after Phase 1
- `src/TripPlanner.jsx` — removed after Phase 1
- `src/Orders.jsx` — removed after Phase 2
- `src/Marketplace.jsx` — removed after Phase 2
- `src/Messages.jsx` — removed after Phase 2
- CSS files: `catch-alerts.css`, `planner.css`, `orders.css`, `messages.css`, `dashboard.css` — removed after their pages are migrated
