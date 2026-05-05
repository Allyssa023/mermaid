# Vendor Modernization — Design Spec

**Date:** 2026-05-05
**Status:** Draft (revised after spec review)
**Predecessor:** Buyer modernization (commits `b9f2b3f`, `75a523e`)
**Persona:** Rosario — wet-market vendor

## 1. Goal

Modernize the vendor (Rosario) experience to a unified dashboard covering both **procurement** (sourcing fish from fishermen) and **storefront** (selling to buyers), aligned with the buyer modernization that just shipped, and inspired by modern shopping-app seller centers.

This spec also corrects a latent bug from buyer modernization: the buyer marketplace currently reads from `demand_listings` (which are vendor-posted *requests for fish from fishermen*), when it should read from vendor storefront listings. That fix is folded into Phase 1.

## 2. Decisions captured during brainstorm

| # | Decision |
|---|---|
| Q1 | **Unified dashboard** covering procurement (in) and storefront (out). |
| Q2 | **Stock-based** inventory: vendor procures → inventory lots → storefront listings draw from lots → buyer orders deduct from lots. |
| Q3 | **Browse-first** procurement: vendors shop fisherman `CatchAlert`s directly; demand listings stay as a secondary escape hatch. |
| Q4 | Storefront MVP: editor, orders inbox, public shop page, sales summary, shop profile, low-stock alerts, analytics, payouts ledger (stub), reviews, repeat-buyer insights. **Promotions excluded.** |
| Q5 | Light fisherman polish: a single "Procurement requests" tab on the existing fisherman dashboard with Accept/Ready/Complete using the existing order-status API. **No new fisherman pages, no nav restructure.** |
| Q6 | Frontend split: `frontend/src/vendor/` for new work; buyer monolith retroactively split into `frontend/src/buyer/` (Phase 0 mechanical refactor). |
| Q7 | Polling + browser push notifications for new CatchAlerts (matching watchlist) and new buyer orders. |

## 3. Domain context (non-obvious)

- Wet-market vendors typically wait at the shore for fishermen to land. Fisherman pre-landing notifications use the existing `CatchAlert` entity. The transaction window is short — minutes after landing.
- Existing schema (verified):
  - `orders.buyer_id` and `orders.seller_id` are both `BIGINT REFERENCES users(id)` — **role-agnostic**, so a vendor can be a buyer-of-procurement.
  - `orders.status` constraint today: `PENDING | CONFIRMED | COMPLETED | CANCELLED | DISPUTED`. We extend this (V38) to add `ACCEPTED` and `READY` for the four-state inbox UX (`CONFIRMED` is retained to avoid breaking existing buyer flow data; see §5.3 V38).
  - There is **no `marketplace_listings` table**. `BuyerMarketplaceController` reads `demand_listings` — this is incorrect (see §1) and will be fixed in Phase 1 by introducing `storefront_listings` and switching the buyer marketplace source.
  - Fisherman catches surface as `CatchAlert`s. Vendors will browse `catch_alerts` directly in the procurement feed; there is no intermediate listing entity to materialize.

## 4. Architecture

```
[Procurement IN]                    [Storefront OUT]
  Procurement Feed                    Storefront Editor
  (browses catch_alerts                (publishes
   directly)                            storefront_listings
        ↓                              drawn from inventory lots)
  Procurement Cart                          ↓
        ↓                             Public Shop Page
  Checkout (fisherman                 (buyer-facing, public route)
   CONFIRM → READY →                         ↓
   COMPLETED)                          Buyer places Order
        ↓                                    ↓
  Received goods become              Vendor Orders Inbox
  Inventory Lot ← ← ← ← ← ← ← ←      (PENDING → ACCEPTED
                                       → READY → COMPLETED/CANCELLED)
                                              ↓
                                        On COMPLETED:
                                        deduct from lot (FIFO)
```

**Bridge (revised):** `CatchAlert.created` → `CatchAlertFanoutService` matches the alert against `vendor_watchlists` and sends notifications + push to subscribed vendors. **No new listing entity is materialized** — vendors shop the `CatchAlert` directly from the procurement feed.

## 5. Components

### 5.1 Backend

**New services**
- `InventoryService` — source of truth for vendor stock; lots are immutable, movements are append-only. Methods: `addLotFromProcurement(orderId)`, `recordAdjustment(lotId, deltaKg, reason)`, `availableKg(vendorId, speciesId)`, `lotsForVendor(vendorId, filters)`, `deductForOrder(orderId)` (FIFO by `received_at`, row-locked via `SELECT … FOR UPDATE`), `lowStockAlerts(vendorId)`. **Order shape:** the existing `orders` table is one species + one quantity per row (V18); a buyer's multi-item cart produces multiple `Order` rows on checkout. `deductForOrder` therefore deducts against the single `storefront_listing_id` linked to that order — no iteration of order line items required.
- `StorefrontListingService` — vendor-published listings backed by inventory lots. Replaces `demand_listings` as the source of buyer marketplace browsing.
- `ProcurementOrderService` — vendor checkout against fisherman `CatchAlert`s. Reuses `Order` with new `order_kind = PROCUREMENT | RETAIL` discriminator. On `COMPLETED`, calls `InventoryService.addLotFromProcurement`.
- `ShopProfileService` — per-vendor public profile (logo, banner, hours, pickup pin, slug; slug regex `^[a-z][a-z0-9-]{2,49}$` — must start with a letter, prevents collision with numeric IDs on the `:vendorIdOrSlug` route; displayName length 2-80).
- `AnalyticsService` — read-only aggregates (sales summary, revenue-by-species, repeat buyers, procurement spend). Hard cap: requested range ≤ 365 days (rejected with `IllegalArgumentException` → 400).
- `CatchAlertFanoutService` — `@TransactionalEventListener(AFTER_COMMIT)` on `CatchAlert.created`. Matches alert against `vendor_watchlists` (species OR market-location proximity); writes `Notification` rows. Idempotent on `(catchAlertId, vendorId)`. On `CatchAlert` cancel, no compensating action — there is nothing to retract.
- `WatchlistService` — vendor manages their own watchlist (species subscribe/unsubscribe; optional area filter by `market_location_id`).

**Existing service extension:** `NotificationService` today exposes only read operations (`getNotifications`, `getUnreadCount`, `markRead`, `markAllRead`). Phase 1 adds `create(Long userId, String type, String body, Map<String,Object> payload)` to support `LOW_STOCK` (Flow D) and Phase 4 reuses it for `CATCH_ALERT_NEW`. Notification `type` enum extends to: `LOW_STOCK`, `CATCH_ALERT_NEW`, `ORDER_STATUS_CHANGED` (existing).

**New controllers (all `/vendor/**`, `@PreAuthorize("hasRole('VENDOR')")`):** `VendorStorefrontController`, `VendorOrdersController`, `VendorProcurementController`, `VendorInventoryController`, `VendorShopController`, `VendorAnalyticsController`, `VendorWatchlistController`. All defined in `api.yaml` first; controllers implement generated interfaces.

**Modified existing surface (Phase 1):** `BuyerMarketplaceController` and `MarketplaceService` switch their data source from `demand_listings` to `storefront_listings`. The `BuyerListingDetail` shape stays compatible at the API contract level wherever possible; any breaking field renames are coordinated with frontend in the same phase.

**Reused services** — `Order`, `OrderStatusEvent`, `Notification`, `Review`, `MessagesService`, `CheckoutService`.

### 5.2 New domain entities

- `InventoryLot` — vendor, species, source_procurement_order_id (nullable for adjustments), received_at, initial_kg, remaining_kg, cost_per_kg, freshness_graded_at. **No soft-delete column** — removal is via `ADJUSTMENT_LOSS` movement to zero.
- `InventoryMovement` — lot, delta, reason (`PROCUREMENT_RECEIVED | SALE_COMPLETED | ADJUSTMENT_LOSS | ADJUSTMENT_CORRECTION`), created_at, ref_order_id.
- `StorefrontListing` — vendor, species, photo_url, price_per_kg, min_qty, status (`DRAFT | PUBLISHED | UNPUBLISHED | SOLD_OUT`), created_at; `is_deleted` boolean for soft-delete (matches existing convention).
- `StorefrontListingLot` — join: listing_id, lot_id (composite PK).
- `ShopProfile` — vendor (1:1), slug (unique), display_name, bio, logo_url, banner_url, hours JSON, pickup_location_id, lat, lng.
- `VendorWatchlist` — vendor, species_id (nullable), market_location_id (nullable), radius_km (nullable), created_at. Either species or location must be non-null.

### 5.3 Migrations (new files only)

- `V35__create_inventory.sql` — `inventory_lots`, `inventory_movements` with indexes on (vendor_id, species_id) and (lot_id, created_at). `inventory_lots` has no `is_deleted` column (removal via `ADJUSTMENT_LOSS` to zero — see §5.2); soft-delete convention does not apply to immutable lot rows.
- `V36__create_storefront_listings.sql` — `storefront_listings` + `storefront_listing_lots`. Index `(vendor_id, status) WHERE is_deleted = false`. **Also:** `ALTER TABLE orders ADD COLUMN storefront_listing_id BIGINT REFERENCES storefront_listings(id)` so all retail orders created from Phase 1 onward carry the linkage. Phase 2 inventory deduction depends on this being non-null for retail orders; orders created via the Phase 1 buyer marketplace cutover will populate it from day one.
- `V37__create_shop_profile.sql` — `shop_profiles` with unique slug index. Includes `is_deleted BOOLEAN NOT NULL DEFAULT false` per soft-delete convention.
- `V38__extend_orders_status_and_kind.sql` —
  - `ALTER TABLE orders ADD COLUMN order_kind VARCHAR(16) NOT NULL DEFAULT 'RETAIL'` with CHECK in (`RETAIL`,`PROCUREMENT`).
  - `ALTER TABLE orders DROP CONSTRAINT chk_orders_status, ADD CONSTRAINT chk_orders_status CHECK (status IN ('PENDING','CONFIRMED','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED'))`. `CONFIRMED` retained for existing data; new vendor flow uses ACCEPTED → READY → COMPLETED.
  - `orders.catch_alert_id` already exists (V18) — no change needed.
- `V39__create_vendor_watchlists.sql` — `vendor_watchlists` with check `(species_id IS NOT NULL OR market_location_id IS NOT NULL)`. Includes `is_deleted BOOLEAN NOT NULL DEFAULT false` per soft-delete convention.
- `V40__catch_alert_claim_and_coords.sql` — adds `claimed_kg NUMERIC(10,2) NOT NULL DEFAULT 0` to `catch_alerts` (procurement claim accounting; required by Phase 3 Flow B); adds `lat`, `lng` (distance filter; consumed by Phase 3 ProcurementFeed). Backfill `lat/lng` best-effort from `landing_site → market_locations` join where deterministic. **Phase note:** V40 ships in **Phase 3**, not Phase 4 — overcommit prevention and the distance filter are Phase 3 deliverables. Phase 4 introduces `vendor_watchlists` (V39) and the fan-out service.

### 5.4 Frontend — `frontend/src/vendor/`

| File | Purpose |
|---|---|
| `VendorLayout.jsx` | Sidebar + topbar, notification bell, push-permission prompt |
| `Home.jsx` | Today: revenue, orders awaiting action, low-stock chips, recent matched CatchAlerts |
| `StorefrontEditor.jsx` | Listings table + create/edit modal; lot picker; publish toggle |
| `OrdersInbox.jsx` | Tabs: New / Preparing / Ready / Completed; per-row status actions |
| `ProcurementFeed.jsx` | Browse `CatchAlert`s; filters: species, freshness (alert age), distance (V40 lat/lng), watchlist-match badge |
| `ProcurementCart.jsx` | Vendor's procurement cart + checkout |
| `ProcurementOrders.jsx` | Vendor's incoming-goods order list |
| `Inventory.jsx` | Lots table, adjustments dialog, low-stock thresholds |
| `Watchlist.jsx` | Manage species/area subscriptions |
| `ShopProfile.jsx` | Edit public profile; preview public shop page |
| `Analytics.jsx` | Charts: revenue, qty by species, procurement spend, repeat buyers |
| `Reviews.jsx` | Read incoming reviews; reply (existing `Review` model) |
| `Payouts.jsx` | Stub ledger: completed orders → expected payout |
| `hooks/usePushNotifications.js` | Browser Notification API + permission flow + in-dashboard fallback |
| `hooks/useVendorPolling.js` | Shared polling: backoff (max 60s after 2 failures), stale indicator, last-seen cursor |

### 5.5 Frontend — Phase 0 buyer mechanical refactor

`BuyerDashboard.jsx` (3,358 lines) → `frontend/src/buyer/`: `BuyerLayout`, `Home`, `Marketplace`, `ListingDetail`, `Cart`, `Checkout`, `Orders`, `Favorites`, `Map`, `Profile`, `PublicShop` (placeholder for `/shop/:vendorIdOrSlug`, populated in Phase 5). **Pure file moves + import rewrites — no behavior changes.** Verification: existing buyer tests still pass; no new tests added.

## 6. Data flow

### Flow A — Storefront sale (buyer → vendor)

1. Buyer cart checkout → `CheckoutService` creates `Order(kind=RETAIL, seller=vendor, storefront_listing_id=X)` + `OrderStatusEvent(PENDING)` + `Notification` to vendor (push if granted).
2. Vendor `Accept` → status `ACCEPTED` + notification to buyer.
3. Vendor `Ready` → status `READY` + notification to buyer.
4. Vendor `Complete` → status `COMPLETED` → `InventoryService.deductForOrder(orderId)`:
   - resolve linked `StorefrontListing` → its lots (FIFO by `received_at`, row-locked).
   - one `InventoryMovement(SALE_COMPLETED)` per lot drained.
   - if listing total remaining = 0 → `status = SOLD_OUT`.
5. Analytics cache invalidated (in-memory, per-vendor key).

**Cancel paths:** vendor can cancel from `PENDING` or `ACCEPTED`. No inventory deduction on cancel — only on `COMPLETED`.

### Flow B — Procurement purchase (vendor → fisherman)

1. Vendor browses `ProcurementFeed` (data source: `catch_alerts` with status `ACTIVE` AND `claimed_kg < quantity_kg`) → adds to `ProcurementCart` → checkout.
2. `ProcurementOrderService.checkout` runs in a single `@Transactional` with `SELECT … FOR UPDATE` on each `catch_alert` row referenced by the cart. For each line:
   - assert `claimed_kg + line.qty <= quantity_kg`; otherwise throw `ListingClosedException` (409) — first-come-first-served.
   - `UPDATE catch_alerts SET claimed_kg = claimed_kg + line.qty WHERE id = Y`.
   - create `Order(kind=PROCUREMENT, buyer=vendor, seller=fisherman, catch_alert_id=Y)`.
3. Fisherman sees it in their procurement-requests tab → `Accept` (status `ACCEPTED`) → handoff at shore → `Complete`.
4. On `CANCELLED` (vendor-initiated before fisherman accepts, or fisherman-initiated): atomically restore `claimed_kg -= line.qty` so the alert becomes shoppable again by other vendors.
5. On `COMPLETED` → `InventoryService.addLotFromProcurement(orderId)`:
   - one `InventoryLot` per order line.
   - `InventoryMovement(PROCUREMENT_RECEIVED)`.
6. Vendor sees lot in `Inventory`; can publish a `StorefrontListing` against it.

FIFO on sale-side because of wet-market freshness — older lots must move first.

**Overcommit prevention:** `claimed_kg` + row-lock prevents two vendors from buying the same kilogram. The `CatchAlert.status` itself does NOT transition to `CLAIMED` on first claim because partial procurement is normal (vendor A takes 30kg of a 50kg landing, vendor B takes the remaining 20kg).

### Flow C — CatchAlert fan-out + vendor push

1. Fisherman fires `CatchAlert` (existing). `CatchAlert.created` event published.
2. `CatchAlertFanoutService` (after commit, idempotent on `(catchAlertId, vendorId)`):
   - matches alert against `vendor_watchlists` (species OR market-location proximity within `radius_km`).
   - writes one `Notification(type=CATCH_ALERT_NEW)` per matching vendor.
3. Online vendor dashboards: `useVendorPolling` picks up notifications; `usePushNotifications` fires browser push if permission granted.
4. Vendor taps push → `/vendor/procurement?highlightAlertId=Y` → standard Flow B from "adds to cart" onward.

**No listing materialization.** The `CatchAlert` itself is the shoppable item.
**Cancel:** if the alert is cancelled or expired, no compensating notification — vendors who already saw it will see the alert state change in the feed on next poll. Procurement orders already placed against the alert are unaffected.

### Flow D — Low-stock alert

On every `InventoryMovement` write:
1. Recompute `availableKg(vendor, species)`.
2. If `availableKg < threshold` (default 5kg, vendor-overridable on Inventory page):
   - `NotificationService.create(vendor, type=LOW_STOCK, speciesId)`.
   - debounce: skip if a `LOW_STOCK` for this `(vendor, species)` was created in the last 12h and stock has not crossed threshold upward since.
3. Vendor `Home` shows low-stock chips; push fires once per debounce window.

Computed inline on movement writes — no scheduler.

## 7. Error handling

Reuse existing `GlobalExceptionHandler` mapping (CLAUDE.md). Add one new exception.

| Situation | Exception | HTTP |
|---|---|---|
| Publish listing with no linked lots / 0 kg available | `IllegalArgumentException` | 400 |
| Vendor accepts/cancels an order they don't own | Spring Security 403 | 403 |
| Mark COMPLETED on already-COMPLETED/CANCELLED order | `IllegalArgumentException` | 400 |
| Inventory deduction would go negative | `InsufficientStockException` *(new)* | 409 |
| Procurement checkout against expired/cancelled CatchAlert | `ListingClosedException` (existing) | 409 |
| Procurement checkout would exceed CatchAlert.quantity_kg | `ListingClosedException` (existing) | 409 |
| Duplicate `(catchAlertId, vendorId)` notification | swallowed by listener — idempotent | — |
| Push permission denied / unsupported | client falls back to in-dashboard toast + bell badge | — |
| Polling failure | exponential backoff (`useVendorPolling`), max 60s; stale indicator after 2 consecutive failures | — |
| ShopProfile slug collision / invalid format | unique constraint or regex → `IllegalArgumentException` | 400 |
| Analytics range > 365d | `IllegalArgumentException` | 400 |

**Inventory race:** `deductForOrder` runs `@Transactional` with `SELECT … FOR UPDATE` on touched lot rows.
**CatchAlert listener failure:** `@TransactionalEventListener(AFTER_COMMIT)` so alert write is not rolled back. Failure logged + admin notification. Idempotency on `(catchAlertId, vendorId)` makes manual retry safe.

## 8. Testing

### 8.1 Backend

Service unit tests (mock repositories):
- `InventoryServiceTest` — addLot; FIFO deduction across multiple lots; low-stock threshold + 12h debounce; race-safe deduction (verify lock invocation); adjustment movements.
- `StorefrontListingServiceTest` — publish gates on lots>0; `SOLD_OUT` transition on full drain; vendor scoping; soft-delete behavior.
- `ProcurementOrderServiceTest` — checkout creates `Order(kind=PROCUREMENT)` and increments `claimed_kg`; `COMPLETED` triggers `addLotFromProcurement`; cancel paths restore `claimed_kg`; can't checkout expired/cancelled alert; can't overcommit (concurrent-checkout test verifies row lock).
- `ShopProfileServiceTest` — slug regex enforcement; uniqueness collision; public-view DTO excludes private fields.
- `AnalyticsServiceTest` — date-range bound (365d); vendor scoping; repeat-buyer aggregation correctness with fixture orders.
- `CatchAlertFanoutServiceTest` — fan-out matches species; fan-out matches location radius; idempotent on duplicate event; no compensating notification on alert cancel.
- `WatchlistServiceTest` — at-least-one-of (species, location) constraint enforced.

Controller tests (`@WebMvcTest` + `MockMvc` + `@MockitoBean JwtDecoder`, JWT roles `["ROLE_VENDOR"]`):
- One per new controller; cover happy path + 401 + 403 (wrong role / wrong owner) + 400/409 mappings. Pattern mirrors `BuyerMarketplaceControllerTest`.

Integration tests (real DB):
- `RetailOrderLifecycleIntegrationTest` — buyer checkout → vendor accept → ready → complete → inventory deducted FIFO → low-stock notification fires when threshold crossed.
- `ProcurementOrderLifecycleIntegrationTest` — vendor checkout against active CatchAlert → fisherman accept → complete → lot exists → publish storefront listing → buyer can order it.
- `CatchAlertFanoutIntegrationTest` — fisherman creates alert → fan-out writes one notification per matching watchlist vendor → cancellation produces no compensating notification → existing procurement orders unaffected.

### 8.2 Frontend

- Smoke tests (Vitest + RTL) per new vendor page: mount with mocked API, assert key elements:
  - `OrdersInbox`: tab counts render; status-action button enablement matches current status (e.g., `Complete` enabled only when `READY`).
  - `StorefrontEditor`: lot picker shows only lots with `remaining_kg > 0`; publish disabled when no lots selected.
  - `Inventory`: low-stock row highlighted when below threshold.
  - `ProcurementFeed`: filter form submits expected query params.
- Hook tests — `useVendorPolling` (interval, backoff, cleanup, stale indicator after 2 fails); `usePushNotifications` (granted/denied/unsupported branches).
- Phase 0 verification — *no new tests*. Existing buyer tests pass after the move.
- Phase 1 buyer marketplace cutover — adapt existing buyer marketplace tests to the new `storefront_listings` source; if API contract preserved, only fixture data changes.

### 8.3 Manual QA checklist (run after each phase)

1. Phase 0: full buyer flow (browse → cart → checkout → orders) works after split.
2. Phase 1: vendor publishes storefront listing → buyer marketplace shows it (not demand listings).
3. Phase 2: vendor accepts → ready → completes a buyer order → inventory drains FIFO.
4. Phase 3: vendor procurement cart → fisherman accepts → complete → lot in Inventory.
5. Phase 4: fisherman fires CatchAlert matching vendor watchlist → vendor sees notification + browser push.
6. Phase 5: public shop page renders profile + listings; review submission round-trips.
7. Phase 6: analytics charts match raw order data; payouts ledger sums match completed orders.

## 9. Phasing

Each phase has a measurable exit criterion and can ship independently.

**Phase 0 — Refactor + scaffold.** Buyer monolith split into `frontend/src/buyer/`. Vendor folder scaffolded with `VendorLayout` + empty pages and route registrations. *Exit:* existing buyer tests pass with no new tests added; vendor routes return placeholder pages; clean diff with no behavior changes.

**Phase 1 — Inventory + Storefront editor + Buyer marketplace cutover + Low-stock plumbing.** V35, V36 migrations (V36 also adds `orders.storefront_listing_id` so the linkage exists from day one). `InventoryService`, `StorefrontListingService`, vendor controllers + `Inventory.jsx` (with vendor-overridable threshold input) + `StorefrontEditor.jsx`. Switch `BuyerMarketplaceController`/`MarketplaceService` data source from `demand_listings` to `storefront_listings`; new buyer orders created from this point populate `storefront_listing_id`. Demo seed inserts at least one storefront listing inline (one-shot SQL script under `backend/src/main/resources/db/seed/`, NOT a Flyway migration) so the buyer marketplace is not empty post-cutover. **Flow D wiring:** add `NotificationService.create(...)` and `LOW_STOCK` notification type now; `InventoryService` writes the notification on movement when threshold crossed. UI consumption of the notification (Home chip, push) lands in Phase 2 (when `useVendorPolling` exists) and Phase 4 (push). *Exit:* a vendor can seed a lot, publish a storefront listing, and that listing appears in the buyer marketplace. `InventoryService` writes a `LOW_STOCK` notification when threshold is crossed (verifiable via repository read in test). Service tests for Inventory + StorefrontListing green. Existing buyer marketplace tests adapted and green.

**Phase 2 — Orders inbox.** V38 migration (status extension + `order_kind`). `OrdersInbox.jsx` consuming existing `Order` + `OrderStatusEvent`. Status flow `PENDING → ACCEPTED → READY → COMPLETED/CANCELLED`. On `COMPLETED`, `InventoryService.deductForOrder` runs. `useVendorPolling` introduced here for inbox refresh. *Exit:* end-to-end retail order from buyer to vendor completion drains the lot; integration test green.

**Phase 3 — Procurement (browse + cart + checkout + orders).** **V40 migration** (`catch_alerts.claimed_kg` + lat/lng). `ProcurementOrderService` (with row-locked claim check); `ProcurementFeed` (over `CatchAlert`s, filters: species, freshness, distance) / `ProcurementCart` / `ProcurementOrders`; **fisherman side: a single new tab** on the existing fisherman dashboard listing PROCUREMENT orders with the same status actions, reusing the existing order-status API. On `COMPLETED`, `addLotFromProcurement` runs. *Exit:* vendor can shop a CatchAlert, fisherman accepts and completes, lot appears in Inventory; concurrent-checkout test verifies overcommit is rejected; integration test green.

**Phase 4 — CatchAlert fan-out + push.** V39 migration (`vendor_watchlists`). `WatchlistService` + `Watchlist.jsx`. `CatchAlertFanoutService`. `usePushNotifications` wired to fire on `CATCH_ALERT_NEW` and new-order notifications. *Exit:* watchlist-matched alert produces notification + push within one polling interval; alert cancel produces no compensating notification; integration test green.

**Phase 5 — Public shop page + Shop profile + Reviews.** V37 migration. `ShopProfileService` + API + `ShopProfile.jsx`; populate `frontend/src/buyer/PublicShop.jsx` (`/shop/:vendorIdOrSlug`); `Reviews.jsx` consuming existing `Review`. *Exit:* a buyer can land on `/shop/:slug`, see profile + listings, and read/submit reviews; vendor preview matches public view.

**Phase 6 — Analytics + Payouts (stub) + Repeat-buyer insights.** `AnalyticsService` + API + `Analytics.jsx` + `Payouts.jsx` + `Home.jsx` tile composition. *Exit:* analytics charts reconcile with raw order/inventory data via spot-check; payouts ledger sums match completed-order totals.

## 10. Out of scope

- Promotions, discount codes, bundles.
- Real payment-rail payouts (stub ledger only).
- Full fisherman-side modernization. **Fisherman-side change is bounded to one new tab** on the existing fisherman dashboard listing PROCUREMENT orders, reusing the existing order-status API. No new fisherman pages, no nav restructure, no styling overhaul.
- Multi-vendor stalls or shared shopfronts.
- SSE / WebSocket transport (browser push + polling is sufficient).
- Removal of `demand_listings` — it remains as the original vendor-demand-to-fisherman channel; only its incorrect use as the buyer marketplace source is corrected (Phase 1).
- Backfill of historical `demand_listings` into `storefront_listings` (none performed; only forward-only behavior change).

## 11. Risks

- **Phase 1 buyer marketplace cutover.** Buyers currently see demand listings as if they were storefront listings; switching the source will visibly change what's listed. Mitigation: a one-shot seed script (`backend/src/main/resources/db/seed/`) inserts at least one storefront listing per demo vendor before cutover, and the demo environment owner is coordinated with.
- **Inventory race conditions** under concurrent order completion. Row-level locking; integration test exercises it.
- **Phase 0 refactor regressing buyer.** "Tests pass with no new tests added" gate before merging.
- **Push notification UX** intrusive. Explicit opt-in; only two event types; debounced low-stock.
- **Watchlist proximity matching** without precise coordinates on `catch_alerts` historical rows. V40 backfills best-effort; missing coords degrade to species-only matching for that alert.

## 12. Open questions

(none at draft time — to be surfaced by spec review)

## 13. Revision log

- **2026-05-05 r2** — Removed fictional `marketplace_listings` table; vendors shop `CatchAlert` directly. Renamed `AutoListingFromAlertService` → `CatchAlertFanoutService` (no entity materialization). Added `vendor_watchlists` (V39) and `catch_alerts` lat/lng (V40). Order status flow extends existing constraint (V38) to add `ACCEPTED`/`READY`. Added Phase 1 buyer marketplace cutover from `demand_listings` to `storefront_listings` (latent buyer-modernization bug, confirmed by user). Added explicit phase exit criteria, slug constraints, 365d analytics cap, integration tests for Flows B and C, bounded fisherman-side scope. Verified `orders.buyer_id`/`seller_id` are role-agnostic.
- **2026-05-05 r3** — Dropped V41 (no-op data migration; demo seed handled inline). Moved `orders.storefront_listing_id` column add from V38 to V36 so all retail orders carry the linkage from Phase 1. Added overcommit prevention to Flow B: `catch_alerts.claimed_kg` (V40) + row-locked `SELECT FOR UPDATE` in `ProcurementOrderService.checkout`; cancel restores `claimed_kg`. Tightened slug regex to require leading letter (avoids numeric collision on `/shop/:vendorIdOrSlug`). Added `is_deleted` to `shop_profiles` and `vendor_watchlists` per soft-delete convention. Verified `orders.catch_alert_id` already exists (V18); no new column needed.
- **2026-05-05 r4** — Removed final V41 reference in §10. Moved V40 from Phase 4 to **Phase 3** (`claimed_kg` + lat/lng are Phase 3 deliverables, not Phase 4). Clarified that `orders` is one-species-per-row (V18) so `deductForOrder(orderId)` operates on a single linked listing (no order-line iteration). Documented `NotificationService.create(...)` extension and `LOW_STOCK`/`CATCH_ALERT_NEW` notification types. Pulled Flow D plumbing into Phase 1 with a notification-write exit criterion. Replaced "V25 vendor listings" reference with the one-shot seed script under `db/seed/`.
