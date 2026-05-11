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
  FishermanLayout.jsx         ← Rail + Topbar + Outlet
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

`FishermanLayout.jsx` root div uses `data-density="balanced"` (same as VendorLayout; required for spacing variables `--pad-card`, `--pad-row`, `--gap` to be set). No `data-accent` override — `design-system.css` `:root` already defaults to the ocean palette.

`FishermanDashboard.jsx` passes `user` and `onLogout` props (received from `App.jsx`) down to `FishermanLayout` which renders them in the topbar.

All pages use `.page`, `.page__head`, `.page__title` with `<em>`, `.eyebrow`, `.card`, `.btn` variants, `.chip` variants, `.tbl`, `.status` pills, `.modal-overlay`, `.form-grid`, `.form-row`, `.input`.  
Icons exclusively from `I` in `icons.jsx` — no inline SVG components.  
`handoff.css` imported in `fisherman/FishermanDashboard.jsx` (router).  
No hardcoded hex or rgba — CSS variables only.

### Routing Change in `App.jsx`

The existing fisherman branch in `App.jsx` renders `<FishermanDashboard>` without a `<BrowserRouter>` wrapper (vendor and buyer each have their own inner `<BrowserRouter>`). Phase 0 must wrap the fisherman branch in `<BrowserRouter>` exactly as done for vendor and buyer, replace the old state-based component with the new `fisherman/FishermanDashboard`, and pass through `user`, `token`, and `onLogout` props. Routes mount under `/fisherman/*`. Old `src/FishermanDashboard.jsx` removed after cutover.

---

## Phases

### Phase 0 — Scaffold & Architecture

**Deliverables:**
- `fisherman/FishermanLayout.jsx` — Rail (9 nav items), Topbar, Outlet; root `<div className="app" data-density="balanced">`; receives `user` and `onLogout` props
- `fisherman/FishermanDashboard.jsx` — React Router `<Routes>` only, imports `'../design-system.css'` and `'../handoff.css'`, passes `user`/`onLogout` to `FishermanLayout`
- `fisherman/api/` modules (stubs for all endpoints)
- `fisherman/hooks/useFishermanPolling.js`
- `App.jsx` updated: fisherman branch wrapped in `<BrowserRouter>`, old import replaced, `user`/`token`/`onLogout` threaded

Old `src/FishermanDashboard.jsx` removed after cutover.

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
- Step 2: Safety checklist (required — all items must be checked to proceed). Items match the existing V8 `trips` table columns: Life Vest (`life_vest_checked`), Radio (`radio_checked`), Fuel Level (`fuel_checked`), Engine Check (`engine_checked`), Weather Reviewed (`weather_reviewed`), Emergency Kit (`emergency_kit_checked`). All six must be checked before the "Start Trip" button enables.
- Step 3: Optional zone selection (skip allowed)
- On confirm: `POST /trips` with all six checklist booleans set to `true` → SMS sent by backend (non-blocking)

**`fisherman/components/NotificationsBell.jsx`**
- Reuses existing `/notifications/unread-count` and `/notifications` endpoints (role-scoped by JWT principal — same endpoints as vendor bell, no new endpoint needed)
- Dropdown showing recent procurement order notifications
- Mirrors vendor `NotificationsBell` pattern exactly

Old files removed after Phase 1: `src/MyTrips.jsx`, `src/TripPlanner.jsx`.

---

### Phase 2 — Transaction Pages Migration

All pages migrate from `src/` root files to `fisherman/` directory with design system applied. Each old file is removed after its replacement is wired into the router.

**Backend note:** No new endpoints in this phase. All pages use existing API routes.

**Backend fix required in this phase:** `ProcurementOrderService.listForFisherman()` currently has no `"DISPUTED"` case in its switch — it falls through to the default branch and returns `List.of("PENDING", "ACCEPTED", "READY")` instead of DISPUTED rows. Add:
```java
case "DISPUTED" -> List.of("DISPUTED");
```
Apply the same fix to `listForVendor()`. Both changes are required for the DISPUTED status tab to show rows correctly.

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
- Payment method badge on COMPLETED orders: conditionally rendered only if `order.paymentMethod` is present (`order.paymentMethod && ...`) since this field is added in Phase 3. When present: CASH → `chip--safe`, CREDIT/UTANG → `chip--caution`.

**`fisherman/Orders.jsx`**
- Replaces `src/Orders.jsx` (marketplace orders from buyers)
- Design system migration: `.page`, `.card`, `.tbl`, `.status`, `.chip` variants, `I` icons

**`fisherman/Marketplace.jsx`**
- Replaces `src/Marketplace.jsx`
- Design system migration

**`fisherman/Messages.jsx`**
- Replaces `src/Messages.jsx`
- Design system migration

Old files removed after Phase 2: `src/CatchAlerts.jsx`, `src/Orders.jsx`, `src/Marketplace.jsx`, `src/Messages.jsx`.

---

### Phase 3 — Earnings + Utang System

**Problem:** vendors take fish on credit (utang) and pay back after selling. Fishermen need to track what they've earned vs what's still owed.

**Deployment dependency:** The earnings endpoints query the `payment_method` column added in V43. These endpoints cannot be deployed before V43 runs. Flyway runs on startup — ensure V43 migration file is present before starting the backend in any environment.

**Backend**

Step 1 — add to `api.yaml` and run `./mvnw generate-sources`:
- New tag: `Fisherman Earnings`
- `GET /fisherman/earnings/summary` → `EarningsSummary { totalGross, cashCollected, creditOutstanding, orderCount }` — all four values apply the same optional date filter (`from` / `to` query params) so the summary is consistent with the ledger view
- `GET /fisherman/earnings/ledger?from=&to=` → `List<EarningsLedgerRow> { orderId, vendorName, speciesName, qtyKg, gross, paymentMethod, status, settledAt, date }`
- New endpoint on vendor paths: `PUT /vendor/procurement-orders/{id}/settle` → body `OrderSettleRequest { paymentMethod, settleNotes }`
- **Update `ProcurementOrderSummary` schema** to add `paymentMethod` (string, nullable) and `settledAt` (datetime, nullable) — required for the payment badge and settle flow in both fisherman and vendor frontends

Step 2 — Flyway migration `V43__add_payment_method_to_orders.sql`:
```sql
-- Targets the `orders` table (procurement orders use order_kind = 'PROCUREMENT')
ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(10) NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH', 'CREDIT')),
  ADD COLUMN settled_at TIMESTAMP,
  ADD COLUMN settle_notes TEXT;
```

Step 3 — domain update: add `paymentMethod`, `settledAt`, `settleNotes` fields to `Order.java`. Update the **inline `toSummary()` / `toOrderSummary()` methods** in `FishermanProcurementController` and `VendorProcurementController` respectively (there is no separate `ProcurementOrderMapper` class — mapping is done inline in the controllers) to populate the new `ProcurementOrderSummary` DTO fields.

Step 4 — implement generated interfaces:
- `EarningsController implements FishermanEarningsApi` — delegates to `EarningsService`
- `EarningsService` — queries COMPLETED procurement orders where `sellerId = fishermanId` (`order_kind = 'PROCUREMENT'`), aggregates totals by `payment_method`, applies date range filter. `orderCount` in the summary reflects the same date-filtered result.
- **Settle endpoint:** Implement as a new method on `VendorProcurementController` (which already implements `VendorProcurementApi`) — NOT in `EarningsController`. The endpoint is vendor-side (`PUT /vendor/...`) and must be protected by `ROLE_VENDOR` (already provided by the `/vendor/` URL prefix in Spring Security config).
  - Authorization: `order.getBuyerId().equals(currentVendorId())` — vendor is the **buyer** on procurement orders. This guards against a vendor settling another vendor's order. A fisherman calling `PUT /vendor/...` is blocked at the URL-level role security before reaching this check.
  - Idempotent: "already settled" = `order.getSettledAt() != null` → return 200 with no changes.
  - Sets `order.paymentMethod`, `order.settledAt = now()`, `order.settleNotes`. Fires notification to fisherman (seller).

**Frontend — `fisherman/Earnings.jsx`**

- Page header: eyebrow "Fisherman · Finance", title "My *Earnings*."
- Summary strip (3 tiles): Total Gross, Cash Collected (`var(--safe)`), Outstanding Utang (`var(--caution)`)
- Date range filter: `.card` with `.form-row` date inputs + Apply button (mirrors vendor Payouts). Summary tiles update with the same date filter.
- Ledger table: `.tbl` with columns Order, Date, Vendor, Species, Qty, Gross, Payment, Status
- Payment method pills: `chip--safe` = Cash, `chip--caution` = Credit/Utang, `chip` (neutral) = Settled
- Empty state: `.empty` + `.empty__title`

**Frontend — Vendor `ProcurementOrders.jsx` update**

On COMPLETED orders: add "Mark as Paid" button (`.btn.btn--accent.btn--sm`) which opens a small modal: payment method (CASH | CREDIT) + optional settle notes → calls `PUT /vendor/procurement-orders/{id}/settle`. Button hidden once `order.settledAt` is non-null (already settled).

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
- Config properties (add to `application.properties`): `sms.textbee.apiKey`, `sms.textbee.globeDeviceId`, `sms.textbee.smartDeviceId`
- Carrier routing by prefix (Globe: 0917/0918/0916; Smart: 0919/0920/0921/0928; default: Globe device)
- POST to `https://api.textbee.dev/api/v1/gateway/devices/{deviceId}/send-sms`, header `x-api-key: {apiKey}`

`TripService` changes — both `startTrip()` and `endTrip()` are modified:
- After saving the trip, fetch the fisherman's `User` entity via `UserRepository` to get `emergencyContactPhone` and `vesselName`.
- If `emergencyContactPhone` is null, skip SMS silently.
- Wrap SMS call: `try { smsService.send(phone, message) } catch (Exception e) { log.warn("SMS failed: {}", e.getMessage()) }` — trip succeeds regardless.
- `startTrip()` sends the **Departure** template; `endTrip()` sends the **Return** template.

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
- `PUT /fisherman/procurement-orders/{id}/dispute/resolve` → `DisputeResolveRequest { resolution }` — fisherman resolves when **vendor** raised the dispute
- `PUT /vendor/procurement-orders/{id}/dispute/resolve` → `DisputeResolveRequest { resolution }` — vendor resolves when **fisherman** raised the dispute
- `GET /fisherman/procurement-orders/{id}/dispute` → `OrderDispute { id, raisedBy, preDisputeStatus, status, claimedWeightKg, claimedQuality, notes, resolvedAt, resolution }`
- `GET /vendor/procurement-orders/{id}/dispute` → `OrderDispute` — vendor polls this to determine whether to show "Resolve Dispute" or "Awaiting resolution"

Step 2 — Flyway migration `V45__order_disputes.sql`:
```sql
CREATE TABLE order_disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('FISHERMAN', 'VENDOR')),
  pre_dispute_status VARCHAR(20) NOT NULL,  -- 'READY' or 'COMPLETED'
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

The `pre_dispute_status` column records the order's status at the moment the dispute was raised (either `READY` or `COMPLETED`). This is needed to determine inventory handling on resolution (see `DisputeService.resolve()` below).

Step 3 — implement `DisputeService`:

**`DisputeService.raise(orderId, raisedBy, request)`:**
- Validates order is in READY or COMPLETED state. Returns 400 if not.
- Returns 409 if an OPEN dispute already exists for the order.
- Records `dispute.preDisputeStatus = order.getStatus()` before changing anything.
- Sets `orders.status` to `DISPUTED` **directly** via `orderRepository.save()` — bypasses the standard `ProcurementOrderService` transition guards (disputes are a cross-cutting concern, not a normal order flow step).

**`DisputeService.resolve(orderId, callerRole, resolution)`:**
- Loads the OPEN dispute for the order. Checks `dispute.getRaisedBy()` — if it equals `callerRole`, throw `AccessDeniedException` (this produces a 403; do NOT throw `IllegalArgumentException` which produces 400).
- Sets `dispute.status = RESOLVED`, `dispute.resolvedAt = now()`, `dispute.resolution`.
- Inventory handling (important — prevents duplicate lots):
  - If `dispute.preDisputeStatus == "READY"`: the fisherman had not yet completed the order before the dispute was raised, so no inventory lot exists yet. Call `inventoryService.addLotFromProcurement(orderId)` then set `orders.status = COMPLETED`.
  - If `dispute.preDisputeStatus == "COMPLETED"`: `fishermanComplete()` already ran and `addLotFromProcurement()` already created the lot. Set `orders.status = COMPLETED` only — do **NOT** call `addLotFromProcurement()` again (would create a duplicate lot).
- Both branches set status directly via `orderRepository.save()` — same bypass rationale as `raise()`.
- Fires notification to the raising party.

**Frontend — vendor `ProcurementOrders.jsx` update**

Add `DISPUTED` to the vendor `BUCKETS` tab list (currently `['PENDING', 'ACCEPTED', 'READY', 'COMPLETED', 'CANCELLED']` — add `'DISPUTED'`). The backend `listForVendor()` fix in Phase 2 enables this tab.

On READY and COMPLETED orders: "Flag Dispute" button (`.btn.btn--ghost.btn--sm` with `var(--unsafe)` color). Opens dispute modal:
- Original weight (pre-filled from order, read-only)
- Your claimed weight: `.input` (number)
- Quality assessment: `.seg` buttons (Fresh / Substandard / Damaged)
- Notes: textarea `.input`
- Submit: `.btn.btn--primary.btn--sm`

For DISPUTED orders: fetch `GET /vendor/procurement-orders/{id}/dispute` to determine who raised it:
- `dispute.raisedBy === 'FISHERMAN'` → show "Resolve Dispute" button → calls `PUT /vendor/procurement-orders/{id}/dispute/resolve`
- `dispute.raisedBy === 'VENDOR'` → show "Awaiting fisherman resolution" (read-only)

**Frontend — `fisherman/Procurement.jsx` update**

Same "Flag Dispute" button on READY and COMPLETED orders. Disputed orders show `.status.status--disputed` pill. Once dispute is RESOLVED (poll `GET /fisherman/procurement-orders/{id}/dispute`), pill switches to `.status.status--completed`.

If fisherman raised the dispute → "Awaiting vendor resolution."  
If vendor raised the dispute → "Resolve Dispute" → calls `PUT /fisherman/procurement-orders/{id}/dispute/resolve`.

---

## Data Flow Summary

```
Fisherman posts CatchAlert
    → vendor sees in ProcurementFeed
    → vendor places order (CASH or CREDIT)
    → fisherman sees in Procurement tab (chip--accent badge if preorder)
    → fisherman accepts → marks ready → completes
    → if CREDIT: vendor later "Mark as Paid" → paymentMethod set, settledAt recorded
      → fisherman sees settled in Earnings ledger (date-range filtered)
    → if dispute: either party flags from READY or COMPLETED state
      → orders.status → DISPUTED (direct set, pre_dispute_status captured)
      → counter-party resolves → AccessDeniedException (403) blocks raising party
      → on resolve: if pre_dispute_status=READY → addLotFromProcurement then COMPLETED
                    if pre_dispute_status=COMPLETED → COMPLETED only (lot already exists)
      → notification fired to raising party

Fisherman starts Trip
    → safety checklist (all 6 V8 columns confirmed)
    → backend fetches emergencyContactPhone from users table
    → SMS to emergency contact via textbee (non-blocking; skipped if phone null)
    → trip goes ACTIVE, timer starts on dashboard
    → fisherman ends trip
    → return SMS fired (non-blocking; same null-check)
    → fisherman posts catch alert to notify waiting vendors
```

---

## Error Handling

- SMS failures are non-blocking — `TripService` catches all `Exception`, logs a warning, trip proceeds regardless
- SMS skipped silently if `emergencyContactPhone` is null
- Settlement is idempotent — "already settled" = `order.getSettledAt() != null`; returns 200 no-op
- Dispute creation blocked if an OPEN dispute already exists (409 Conflict)
- Dispute creation blocked if order is not in READY or COMPLETED state (400)
- Dispute resolve blocked if caller is the raising party — throw `AccessDeniedException` (403)
- All new endpoints follow existing `GlobalExceptionHandler` mappings (404 / 400 / 403 / 409 / 503)
- Frontend: explicit error state with `var(--unsafe-soft)` banners on all API failures

---

## Testing

**Backend (per-phase):**
- `@WebMvcTest` for each new controller; `@MockitoBean` for service dependencies; `@MockitoBean JwtDecoder jwtDecoder`
- JWT: `.jwt().claim("roles", List.of("ROLE_FISHERMAN"))` or `"ROLE_VENDOR"` as appropriate
- `EarningsServiceTest` — aggregation of cash/credit totals; `orderCount` matches date-filtered result
- `TripServiceTest` — departure SMS called on `startTrip()`; return SMS called on `endTrip()`; SMS exception does NOT propagate in either method; both are skipped when `emergencyContactPhone` is null
- `TextbeeSmsServiceTest` — Globe prefix routes to globeDeviceId; Smart prefix routes to smartDeviceId; unknown prefix defaults to Globe
- Settle: vendor can settle own order; vendor calling settle on another vendor's order gets 403 from `getBuyerId()` service check
- Dispute:
  - `raise()` succeeds from READY and COMPLETED; captures `preDisputeStatus` correctly
  - `raise()` on invalid state returns 400
  - Duplicate `raise()` returns 409
  - `resolve()` by raising party throws `AccessDeniedException` (403)
  - `resolve()` by counter-party succeeds; `preDisputeStatus=READY` → `addLotFromProcurement` called; `preDisputeStatus=COMPLETED` → NOT called (duplicate prevention)
  - Notification fired to raising party on resolution

**Frontend (Vitest + Testing Library, per phase):**
- Earnings page: renders correct cash vs utang totals for date-filtered result
- `StartTripModal`: Start button disabled until all 6 checklist items checked
- `fisherman/Procurement.jsx`: preorder badge (`chip--accent` + "Preorder" text) renders when `order.isPreorder === true`
- NotificationsBell: shows unread count from `/notifications/unread-count`

---

## Migration Cleanup

After all phases complete, remove:
- `src/FishermanDashboard.jsx` — removed in Phase 0 after cutover
- `src/MyTrips.jsx`, `src/TripPlanner.jsx` — removed after Phase 1
- `src/CatchAlerts.jsx`, `src/Orders.jsx`, `src/Marketplace.jsx`, `src/Messages.jsx` — removed after Phase 2
- CSS files: `catch-alerts.css`, `planner.css`, `orders.css`, `messages.css`, `dashboard.css` — removed after their pages are migrated
