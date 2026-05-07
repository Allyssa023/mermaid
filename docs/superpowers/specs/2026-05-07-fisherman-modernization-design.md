# Fisherman Role Modernization — Design Spec
**Date:** 2026-05-07  
**Branch:** fisherman-modernization  
**Author:** limmonjuice  

---

## Background

The fisherman role is the platform's primary supply-side actor. Isidro (fisherman persona) goes out to sea late evening to early morning, returns at dawn, and posts a catch alert when he's back at shore — vendors are waiting. The current fisherman frontend is a monolithic `FishermanDashboard.jsx` (1,151 lines) with state-based navigation, loose page files in `src/` root, and no consistent design system application. This plan brings the fisherman role to parity with the vendor and buyer roles architecturally, applies the mermaid-handoff design system uniformly, and adds three new feature clusters: earnings/utang tracking, profile/SMS safety, and dispute management.

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

- `data-accent="ocean"` on `.app` — adds `--accent: oklch(0.55 0.09 220)` (maritime blue, distinct from vendor's warm amber)
- All pages use `.page`, `.page__head`, `.page__title` with `<em>`, `.eyebrow`, `.card`, `.btn` variants, `.chip` variants, `.tbl`, `.status` pills, `.modal-overlay`, `.form-grid`, `.form-row`, `.input`
- Icons exclusively from `I` in `icons.jsx` — no inline SVG components
- `handoff.css` imported in `FishermanDashboard.jsx` (router)
- No hardcoded hex or rgba — CSS variables only

### Routing Change in `App.jsx`

Old `FishermanDashboard` (state-based navigation) replaced by new router-based component. Routes mount under `/fisherman/*`. Old loose files (`src/CatchAlerts.jsx`, `src/MyTrips.jsx`, `src/TripPlanner.jsx`, `src/Orders.jsx`, `src/Marketplace.jsx`, `src/Messages.jsx`) removed after their migration phases complete.

---

## Phases

### Phase 0 — Scaffold & Architecture

**Deliverables:**
- `fisherman/FishermanLayout.jsx` with Rail (9 nav items, `data-accent="ocean"`), Topbar, Outlet
- `fisherman/FishermanDashboard.jsx` — React Router `<Routes>` only
- `fisherman/api/` modules (stubs for all endpoints)
- `fisherman/hooks/useFishermanPolling.js`
- `data-accent="ocean"` CSS variable added to design system
- `App.jsx` routing updated

**No visual changes yet** — existing functionality preserved via new routing shell.

---

### Phase 1 — Core Dashboard + Trips

**`fisherman/Home.jsx`**

Redesign of current dashboard. Sections:
- Page header: eyebrow "Fisherman · Operations", title "Today on the *water*.", date/time sub
- KPI strip (4 tiles): Safe Zones, Caution Zones, Avg Wave Height, Max Wind Speed — using `.kpi` / `.grid.grid--kpi`
- Hero: sea status headline with overall risk label, chip row (zone counts + active advisories)
- 48h Forecast chart: SVG-based, wave + wind, hover tooltip — extracted as `ForecastChart` component
- Zone carousel: animated zone card carousel — extracted as `ZoneCarousel` component
- Active trip card: extracted as `ActiveTripCard`
- Active advisories: `.adv-list` / `.adv-item`
- Pending orders summary: clicks through to procurement
- Quick actions: Start Trip, Catch Alerts, Earnings, Procurement

All inline components cleaned up. No state-based page switching — uses `useNavigate()`.

**`fisherman/Trips.jsx`**

Absorbs `MyTrips.jsx` and trip start flow from `TripPlanner.jsx`.

- Page header: eyebrow "Fisherman · Safety", title "My *Trips*."
- Start Trip button → opens `StartTripModal`
- Trip list with status chips (ACTIVE, ENDED), duration, vessel name
- Active trip shown prominently at top with safety checklist progress bar and "End Trip" button
- Trip detail expand: checklist items, zone tagged (if any), departure/return times

**`StartTripModal`** (inline component):
- Step 1: Vessel name (pre-filled from profile) + confirm
- Step 2: Safety checklist (required — all items must be checked to proceed): life vest, radio, fuel level, emergency contact notified
- Step 3: Optional zone selection (skip allowed)
- On confirm: `POST /trips` → success → SMS sent to emergency contact (handled by backend)

**`fisherman/components/NotificationsBell.jsx`**
- Polls `GET /fisherman/notifications/unread-count`
- Dropdown showing recent procurement order notifications
- Mirrors vendor `NotificationsBell` pattern

---

### Phase 2 — Transaction Pages Migration

All pages migrate from `src/` root files to `fisherman/` directory with design system applied.

**`fisherman/CatchAlerts.jsx`**
- Replaces `src/CatchAlerts.jsx` (854 lines, inline SVG icons)
- Page: eyebrow "Fisherman · Supply", title "Catch *Alerts*."
- Active alerts as `.alert-card` with freshness chips (`.chip--safe/caution/unsafe.chip--dot`)
- Create alert: `.modal-overlay` + `.form-grid` + `.input` fields (species, qty, price, landing site, expiry)
- Cancel action: `.btn.btn--ghost.btn--sm` with `.btn.btn--unsafe` confirm
- Uses `I` from `icons.jsx`

**`fisherman/Procurement.jsx`**
- Replaces `FishermanProcurementTab` component
- Page: eyebrow "Fisherman · Sales", title "Vendor *Orders*."
- Status tabs: `.seg` / `.seg__btn.on` (PENDING, ACCEPTED, READY, COMPLETED, CANCELLED)
- Each order as `.card` with `.card__head` (species + order ID `.kbd`), `.status` pill
- Pre-orders: `chip--accent` badge "Preorder" + sub-text "Accept before your next trip"
- Actions: `.btn.btn--accent.btn--sm` (Accept), `.btn.btn--primary.btn--sm` (Mark Ready / Complete), `.btn.btn--ghost.btn--sm` with `var(--unsafe)` (Cancel)
- Cancel reason: `.input` inline
- Payment method badge on COMPLETED orders: CASH (`chip--safe`) or CREDIT / UTANG (`chip--caution`)
- Phase 5 dispute flag added here

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

**Backend**

Flyway migration `V43__add_payment_method_to_procurement_orders.sql`:
```sql
ALTER TABLE procurement_orders
  ADD COLUMN payment_method VARCHAR(10) NOT NULL DEFAULT 'CASH',
  ADD COLUMN settled_at TIMESTAMP,
  ADD COLUMN settle_notes TEXT;
```

New endpoints in `api.yaml`:
- `GET /fisherman/earnings/summary` → `{ totalGross, cashCollected, creditOutstanding, orderCount }`
- `GET /fisherman/earnings/ledger?from=&to=` → array of `{ orderId, vendorName, speciesName, qtyKg, gross, paymentMethod, status, settledAt, date }`
- `PUT /vendor/procurement-orders/{id}/settle` body: `{ paymentMethod, settleNotes }` — vendor marks a CREDIT order as SETTLED, triggers fisherman notification

Service: `EarningsService` (fisherman) — queries completed procurement orders, aggregates by payment method.

**Frontend — `fisherman/Earnings.jsx`**

- Page header: eyebrow "Fisherman · Finance", title "My *Earnings*."
- Summary strip (3 tiles): Total Gross, Cash Collected (`var(--safe)`), Outstanding Utang (`var(--caution)`)
- Date range filter: `.card` with `.form-row` date inputs + Apply button
- Ledger table: `.tbl` with columns Order, Date, Vendor, Species, Qty, Gross, Payment, Status
- Payment method pills: `chip--safe` = Cash, `chip--caution` = Credit/Utang, `chip` (neutral) = Settled
- Empty state: `.empty` + `.empty__title`

**Frontend — Vendor `ProcurementOrders.jsx` update**

On COMPLETED orders: add "Mark as Paid" button (`.btn.btn--accent.btn--sm`) which opens a small modal: payment method (CASH | CREDIT) + optional notes → calls `PUT /vendor/procurement-orders/{id}/settle`.

---

### Phase 4 — Profile + SMS Safety

**Backend**

Flyway migration `V44__fisherman_profile_fields.sql`:
```sql
ALTER TABLE users
  ADD COLUMN vessel_name VARCHAR(100),
  ADD COLUMN landing_site VARCHAR(100),
  ADD COLUMN emergency_contact_name VARCHAR(100),
  ADD COLUMN emergency_contact_phone VARCHAR(20);
```

`SmsService` interface:
```java
public interface SmsService {
    void send(String toNumber, String message);
}
```

`TextbeeSmsService` implementation:
- Config: `sms.textbee.apiKey`, `sms.textbee.globeDeviceId`, `sms.textbee.smartDeviceId`
- Carrier routing by prefix (Globe: 0917/0918/0916; Smart: 0919/0920/0921/0928; default: Globe)
- POST to `https://api.textbee.dev/api/v1/gateway/devices/{deviceId}/send-sms`

`TripService` changes:
- `startTrip()` → calls `smsService.send(emergencyContactPhone, departureMessage)`
- `endTrip()` → calls `smsService.send(emergencyContactPhone, returnMessage)`

SMS message templates:
- Departure: `"{name} has departed for fishing at {time}. Vessel: {vessel}. Expected return: early morning. - MERMAID Safety"`
- Return: `"{name} has returned safely at {time}. - MERMAID Safety"`

`GET /fisherman/profile` and `PUT /fisherman/profile` endpoints.

**Frontend — `fisherman/Profile.jsx`**

- Page header: eyebrow "Fisherman · Account", title "My *Profile*."
- Two-section layout (mirrors vendor ShopProfile):
  - Left: Basic Info card — full name (read-only from auth), vessel name input, landing site input
  - Right: Safety card — emergency contact name input, emergency contact phone input, SMS preview box: *"When you start a trip, this message will be sent: '[departure message preview]'"*
- Save button in `page__actions`
- Success/error banners using `var(--safe-soft)` / `var(--unsafe-soft)`

---

### Phase 5 — Disputes

**Problem:** weight and quality disagreements at handoff. Both fisherman and vendor can raise and respond to disputes.

**Backend**

Flyway migration `V45__order_disputes.sql`:
```sql
CREATE TABLE order_disputes (
  id BIGSERIAL PRIMARY KEY,
  procurement_order_id BIGINT NOT NULL REFERENCES procurement_orders(id),
  raised_by VARCHAR(20) NOT NULL,         -- FISHERMAN | VENDOR
  original_weight_kg DECIMAL(8,2),
  claimed_weight_kg DECIMAL(8,2),
  claimed_quality VARCHAR(50),            -- FRESH | SUBSTANDARD | DAMAGED
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN | RESOLVED
  resolved_at TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Endpoints:
- `POST /fisherman/procurement-orders/{id}/dispute` — raise dispute
- `POST /vendor/procurement-orders/{id}/dispute` — raise dispute from vendor side
- `PUT /fisherman/procurement-orders/{id}/dispute/resolve` — resolve (either party)
- `GET /fisherman/procurement-orders/{id}/dispute` — get dispute for order

Order status gains `DISPUTED` state for display purposes (derived, not stored separately).

**Frontend — `fisherman/Procurement.jsx` update**

On COMPLETED and READY orders: "Flag Dispute" button (`.btn.btn--ghost.btn--sm` with `var(--unsafe)` color) opens dispute modal:
- Original weight (pre-filled from order)
- Your claimed weight (input)
- Quality assessment: `.seg` buttons (Fresh / Substandard / Damaged)
- Notes: textarea `.input`
- Submit: `.btn.btn--primary.btn--sm`

Disputed orders show `.status.status--disputed` pill.

**Frontend — Vendor `ProcurementOrders.jsx` update**

Same dispute flag pattern from vendor side.

---

## Data Flow Summary

```
Fisherman posts CatchAlert
    → vendor sees in ProcurementFeed
    → vendor places order (CASH or CREDIT)
    → fisherman sees in Procurement tab (badge if preorder)
    → fisherman accepts → marks ready → completes
    → if CREDIT: vendor later "Mark as Paid" → fisherman sees in Earnings as SETTLED
    → if dispute: either party flags → both see DISPUTED status → resolve

Fisherman starts Trip
    → safety checklist confirmed
    → backend fires SMS to emergency contact via textbee
    → trip goes ACTIVE, timer starts on dashboard
    → fisherman ends trip
    → backend fires return SMS
```

---

## Error Handling

- SMS failures are non-blocking — `TripService.startTrip()` catches SMS exceptions, logs a warning, and does not prevent the trip from starting
- Settlement actions are idempotent — calling `settle` on an already-settled order returns 200 with no side effects
- Dispute creation is blocked if an open dispute already exists for the order (409 Conflict)
- All new API endpoints follow existing `GlobalExceptionHandler` mappings (404 / 400 / 409 / 503)
- Frontend: all API calls have `.catch(() => null)` or explicit error state with `var(--unsafe-soft)` banners

---

## Testing

**Backend (per-phase):**
- `@WebMvcTest` for each new controller with `@MockitoBean` service dependencies
- `SecurityMockMvcRequestPostProcessors.jwt()` with `ROLE_FISHERMAN` or `ROLE_VENDOR` claims
- `EarningsServiceTest` — unit test cash/credit aggregation logic
- `TripServiceTest` — verify SMS called on startTrip/endTrip, verify SMS failure doesn't throw
- `TextbeeSmsServiceTest` — verify carrier routing (Globe vs Smart prefix selection)
- Dispute controller tests: raise, resolve, conflict on duplicate

**Frontend:**
- Vitest + Testing Library per phase
- Key test: Earnings page renders correct cash vs utang totals
- Key test: StartTripModal blocks proceed until checklist complete
- Key test: Procurement shows preorder badge for preorder orders
- Key test: NotificationsBell shows unread count badge

---

## Migration Cleanup

After all phases complete:
- Remove `src/CatchAlerts.jsx`, `src/MyTrips.jsx`, `src/TripPlanner.jsx`, `src/Orders.jsx`, `src/Marketplace.jsx`, `src/Messages.jsx`
- Remove CSS files tied to those pages: `catch-alerts.css`, `planner.css`, `orders.css`, `messages.css`, `dashboard.css`
- Update any remaining imports
