# Vendor Modernization — Design Spec

**Date:** 2026-05-05
**Status:** Draft (pending review)
**Predecessor:** Buyer modernization (commits `b9f2b3f`, `75a523e`)
**Persona:** Rosario — wet-market vendor

## 1. Goal

Modernize the vendor (Rosario) experience to a unified dashboard covering both **procurement** (sourcing fish from fishermen) and **storefront** (selling to buyers), aligned in feel and structure with the buyer modernization that just shipped, and inspired by modern shopping-app seller centers (Shopee Seller Center, Tokopedia Seller).

## 2. Decisions captured during brainstorm

| # | Decision |
|---|---|
| Q1 | **Unified dashboard** covering procurement (in) and storefront (out) as two sides of the same shop. |
| Q2 | **Stock-based** inventory: vendor procures → inventory lots → storefront listings draw from lots → buyer orders deduct from lots. |
| Q3 | **Browse-first** procurement: main screen is a "shop the docks" catch marketplace; demand listings stay as a secondary escape hatch. |
| Q4 | Storefront MVP includes editor, orders inbox, public shop page, sales summary, shop profile, low-stock alerts, analytics, payouts ledger (stub), reviews, repeat-buyer insights. **Promotions excluded.** |
| Q5 | Light fisherman-side polish: a "Procurement requests" inbox with the same status flow vendors get. Plus a CatchAlert→auto-listing bridge (see §6 Flow C). |
| Q6 | Frontend split: vendor work goes into `frontend/src/vendor/`; buyer monolith retroactively split into `frontend/src/buyer/` as a Phase 0 mechanical refactor (move-only, no behavior changes). |
| Q7 | Real-time strategy: existing polling cadence + browser push notifications for new CatchAlerts and new buyer orders, with graceful in-app fallback. |

## 3. Domain context (non-obvious)

Wet-market vendors typically wait on the shore for fishermen to land. The fisherman role already has a "notify vendors" feature (`CatchAlert`) used pre-landing. The actual procurement transaction window is short — minutes after notification. This drives the CatchAlert→auto-listing bridge in §6 Flow C; without it, browse-first procurement would miss the real workflow.

## 4. Architecture

```
[Procurement IN]                    [Storefront OUT]
  Procurement Feed                    Storefront Editor
  (browse fisherman                   (vendor publishes
   marketplace listings)               listings drawn
        ↓                              from inventory lots)
  Procurement Cart                          ↓
        ↓                             Public Shop Page
  Checkout (fisherman                 (buyer-facing, public route)
   accepts → READY →                         ↓
   COMPLETED)                          Buyer places Order
        ↓                                    ↓
  Received goods become              Vendor Orders Inbox
  Inventory Lot ← ← ← ← ← ← ← ←      (PENDING → ACCEPTED
                                       → READY → COMPLETED/CANCELLED)
                                              ↓
                                        On COMPLETED:
                                        deduct from lot (FIFO)
```

**Bridge:** `CatchAlert.created` → `AutoListingFromAlertService` materializes a marketplace listing tagged `auto_from_alert = true`, fans notifications out to subscribed vendors.

## 5. Components

### 5.1 Backend

**New services**
- `InventoryService` — source of truth for vendor stock; lots are immutable rows, movements are append-only. Methods: `addLotFromProcurement(procurementOrderId)`, `recordAdjustment(lotId, deltaKg, reason)`, `availableKg(vendorId, speciesId)`, `lotsForVendor(vendorId, filters)`, `deductForOrder(orderId)` (FIFO by `receivedAt`, row-locked), `lowStockAlerts(vendorId)`.
- `StorefrontListingService` — vendor-published listings backed by inventory lots. Distinct from `DemandListing` (vendor-as-buyer requests).
- `ProcurementOrderService` — vendor checkout against fisherman marketplace listings. Reuses `Order` with `order_kind = PROCUREMENT | RETAIL` discriminator. On COMPLETED, calls `InventoryService.addLotFromProcurement`.
- `ShopProfileService` — per-vendor public profile (logo, banner, hours, pickup pin, slug).
- `AnalyticsService` — read-only aggregates (sales summary, revenue-by-species, repeat buyers, procurement spend). Straight SQL aggregation; no pre-aggregation tables in MVP.
- `AutoListingFromAlertService` — `@TransactionalEventListener(AFTER_COMMIT)` on `CatchAlert.created`; idempotent on `catchAlertId`; closes listing on alert cancel unless procurement order placed.

**New controllers (all under `/vendor/**`, `@PreAuthorize("hasRole('VENDOR')")`)**
- `VendorStorefrontController`, `VendorOrdersController`, `VendorProcurementController`, `VendorInventoryController`, `VendorShopController`, `VendorAnalyticsController`.
- All endpoints defined in `api.yaml` first; controllers implement generated interfaces (per CLAUDE.md API-first contract).

**Reused services** — `Order`, `OrderStatusEvent`, `Notification`, `Review`, `MessagesService`, `CheckoutService`, `MarketplaceService`.

### 5.2 New domain entities

- `InventoryLot` — vendor, species, sourceProcurementOrderId (nullable for adjustments), receivedAt, initialKg, remainingKg, costPerKg, freshnessGradedAt.
- `InventoryMovement` — lot, delta, reason (`PROCUREMENT_RECEIVED | SALE_COMPLETED | ADJUSTMENT_LOSS | ADJUSTMENT_CORRECTION`), createdAt, refOrderId.
- `StorefrontListing` — vendor, species, photoUrl, pricePerKg, minQty, lotIds (join), status (`DRAFT | PUBLISHED | UNPUBLISHED | SOLD_OUT`), createdAt.
- `ShopProfile` — vendor (1:1), slug, displayName, bio, logoUrl, bannerUrl, hours JSON, pickupLocationId, latLng.

### 5.3 Migrations (new files only — never edit existing)

- `V35__create_inventory.sql` — `inventory_lots`, `inventory_movements`.
- `V36__create_storefront_listings.sql` — `storefront_listings`, `storefront_listing_lots` join.
- `V37__create_shop_profile.sql` — `shop_profiles` with unique slug.
- `V38__add_order_kind.sql` — `orders.order_kind` column with default `RETAIL`, backfill existing rows.
- `V39__add_auto_from_alert_to_listings.sql` — `marketplace_listings.auto_from_alert` boolean + `catch_alert_id` FK + unique partial index `(catch_alert_id) WHERE auto_from_alert = true`.

### 5.4 Frontend — `frontend/src/vendor/`

| File | Purpose |
|---|---|
| `VendorLayout.jsx` | Sidebar + topbar shell, notification bell, push-permission prompt |
| `Home.jsx` | Today summary: revenue, orders awaiting action, low-stock chips, recent CatchAlerts |
| `StorefrontEditor.jsx` | Listings table + create/edit modal; lot picker; publish toggle |
| `OrdersInbox.jsx` | Tabs (New / Preparing / Ready / Completed); per-row status actions |
| `ProcurementFeed.jsx` | Browse fisherman marketplace; filters by species/freshness/distance/auto-from-alert |
| `ProcurementCart.jsx` | Vendor's procurement cart + checkout |
| `ProcurementOrders.jsx` | Vendor's incoming-goods order list (vendor as buyer) |
| `Inventory.jsx` | Lots table, adjustments dialog, low-stock thresholds |
| `ShopProfile.jsx` | Edit public profile; preview public shop page |
| `Analytics.jsx` | Charts: revenue, qty by species, procurement spend, repeat buyers |
| `Reviews.jsx` | Read incoming reviews; reply (reuse existing review model) |
| `Payouts.jsx` | Stub ledger view: completed orders → expected payout (no real money flow) |
| `hooks/usePushNotifications.js` | Browser Notification API wiring + permission flow |
| `hooks/useVendorPolling.js` | Shared polling hook with backoff and stale indicator |

### 5.5 Frontend — Phase 0 buyer mechanical refactor

`BuyerDashboard.jsx` (3,358 lines) split by route into `frontend/src/buyer/`:
`BuyerLayout`, `Home`, `Marketplace`, `ListingDetail`, `Cart`, `Checkout`, `Orders`, `Favorites`, `Map`, `Profile`, `PublicShop` (placeholder for `/shop/:vendorIdOrSlug`, populated in Phase 5).

**No behavior changes.** Verification = existing buyer tests still pass. Pure file moves + import rewrites.

## 6. Data flow

### Flow A — Storefront sale (buyer → vendor)

1. Buyer cart checkout → `CheckoutService` creates `Order(kind=RETAIL, seller=vendor)` + `OrderStatusEvent(PENDING)` + `Notification` to vendor (push if granted).
2. Vendor `Accept` → `ACCEPTED` + notification to buyer.
3. Vendor `Ready` → `READY` + notification to buyer.
4. Vendor `Complete` → `COMPLETED` → `InventoryService.deductForOrder(orderId)`:
   - resolve linked `StorefrontListing` → its lots (FIFO by `receivedAt`)
   - one `InventoryMovement` per lot drained
   - if listing total remaining = 0 → `status = SOLD_OUT`
5. Analytics cache invalidated.

**Cancel paths:** vendor can cancel from `PENDING` or `ACCEPTED`. Cancellation does not deduct inventory; deduction is only on `COMPLETED`.

### Flow B — Procurement purchase (vendor → fisherman)

1. Vendor browses `ProcurementFeed` → adds fisherman listings to `ProcurementCart` → checkout.
2. `CheckoutService` creates `Order(kind=PROCUREMENT, buyer=vendor, seller=fisherman)`.
3. Fisherman sees it in their procurement-requests inbox → `Accept` → `Ready` / handoff at shore → `Complete`.
4. On `COMPLETED` → `InventoryService.addLotFromProcurement(orderId)`:
   - one `InventoryLot` per order line (species, kg, costPerKg)
   - `InventoryMovement(PROCUREMENT_RECEIVED)`
5. Vendor sees new lot in `Inventory`; can publish a `StorefrontListing` against it.

FIFO on sale-side (not LIFO) because of wet-market freshness — older lots must move first.

### Flow C — CatchAlert → auto-listing → vendor push

1. Fisherman fires `CatchAlert` (existing pre-landing feature). `CatchAlert.created` event published.
2. `AutoListingFromAlertService` listener (idempotent on `catchAlertId`):
   - creates marketplace listing with `auto_from_alert = true`, species + estimated kg + ETA from alert; `status = PUBLISHED`; expires when alert expires.
   - `NotificationService.fanOut` to vendors with matching watchlist (species OR area).
3. Online vendor dashboards: `useVendorPolling` picks up the new notification; `usePushNotifications` fires browser push if permission granted.
4. Vendor taps push → `/vendor/procurement?highlight={listingId}` → standard Flow B from "adds to cart" onward.

**Idempotency:** unique partial index `(catch_alert_id) WHERE auto_from_alert = true`.

**Cancellation:** if fisherman cancels alert, listener closes auto-listing (`UNPUBLISHED`) only if no procurement order has been placed against it.

### Flow D — Low-stock alert

On every `InventoryMovement` write:
1. Recompute available kg per `(vendor, species)`.
2. If `availableKg < threshold` (default 5kg, vendor-overridable):
   - `NotificationService.create(vendorId, type=LOW_STOCK, speciesId)`.
   - debounce: skip if `LOW_STOCK` for this `(vendor, species)` was created in last 12h and stock has not crossed threshold upward since.
3. Vendor `Home` shows low-stock chips; push fires once per debounce window.

No background job — computed inline on movement writes.

## 7. Error handling

Reuse existing `GlobalExceptionHandler` mapping (CLAUDE.md). Add one new exception.

| Situation | Exception | HTTP |
|---|---|---|
| Vendor publishes listing with no linked lots / 0 kg available | `IllegalArgumentException` | 400 |
| Vendor accepts/cancels an order they don't own | Spring Security 403 | 403 |
| Vendor marks COMPLETED an already-COMPLETED/CANCELLED order | `IllegalArgumentException` | 400 |
| Inventory deduction would go negative | `InsufficientStockException` *(new)* | 409 |
| Procurement checkout against SOLD/closed listing | `ListingClosedException` (existing) | 409 |
| Auto-listing duplicate (same `catchAlertId`) | swallowed by listener — idempotent | — |
| Push permission denied / unsupported | client falls back to in-dashboard toast + bell badge | — |
| Polling failure | exponential backoff in `useVendorPolling`, max 60s; stale indicator after 2 consecutive failures | — |
| ShopProfile slug collision | unique constraint → `IllegalArgumentException` | 400 |
| Analytics range > 365d | `IllegalArgumentException` | 400 |

**Inventory race conditions:** `deductForOrder` runs `@Transactional` with `SELECT … FOR UPDATE` on touched lot rows.

**CatchAlert listener failure:** `@TransactionalEventListener(phase = AFTER_COMMIT)` so alert write is not rolled back. Failure logged + admin notification. Idempotency on `catchAlertId` makes manual retry safe.

## 8. Testing

### 8.1 Backend

Service unit tests (one per new service, mock repositories):
- `InventoryServiceTest` — addLot, FIFO deduction, low-stock threshold, race-safe deduction (verify lock invocation), adjustment movements.
- `StorefrontListingServiceTest` — publish gates on lots>0; SOLD_OUT transition; vendor scoping.
- `ProcurementOrderServiceTest` — checkout creates `Order(kind=PROCUREMENT)`; complete triggers `addLotFromProcurement`; cancel paths.
- `ShopProfileServiceTest` — slug uniqueness, public view excludes private fields.
- `AnalyticsServiceTest` — date-range bounds, vendor scoping, repeat-buyer aggregation correctness.
- `AutoListingFromAlertServiceTest` — listener creates listing; idempotent on duplicate event; alert-cancel closes listing only when no procurement order placed.

Controller tests (`@WebMvcTest` + `MockMvc`, `@MockitoBean` services + `JwtDecoder`, JWT roles `["ROLE_VENDOR"]`):
- One per new controller; cover happy path + 401 (no auth) + 403 (wrong role / wrong owner) + 400/409 mappings.
- Pattern: mirror `BuyerMarketplaceControllerTest` / `BuyerOrderControllerTest`.

Integration test:
- `OrderLifecycleIntegrationTest` — full Flow B end-to-end: vendor checkout → fisherman accept → complete → lot exists → publish storefront listing → buyer order → complete → inventory deducted FIFO → low-stock notification fires.

### 8.2 Frontend

- Smoke / route tests (Vitest + RTL) — one per new vendor page: mount with mocked API, assert key elements render.
- Hook tests — `useVendorPolling` (interval, backoff, cleanup); `usePushNotifications` (permission flow, fallback).
- Phase 0 verification — *no new tests*. Existing buyer tests must still pass after the move.

### 8.3 Manual QA checklist (run after each phase)

1. Storefront editor: publish listing → appears on public shop page → buyer can order.
2. Procurement: vendor cart → checkout → fisherman accepts → complete → lot in Inventory.
3. CatchAlert: fisherman fires alert → listing appears in vendor procurement feed within poll interval → push fires (after granting permission).
4. Low stock: drain a lot to threshold → low-stock chip + push.
5. Buyer regression: full buyer flow (browse → cart → checkout → orders) works after Phase 0 split.

## 9. Phasing (execution plan, vertical slices)

**Phase 0 — Refactor + scaffold.** Buyer monolith split into `frontend/src/buyer/`. Vendor folder scaffolded with `VendorLayout` + empty pages and route registrations. No features. Existing buyer tests must still pass. *Exit:* clean structural baseline.

**Phase 1 — Inventory + Storefront editor.** `InventoryLot`, `InventoryMovement`, `StorefrontListing` schema + services + API + `Inventory.jsx` + `StorefrontEditor.jsx`. Vendors can publish listings tied to lots. *Manual seed* of lots until Phase 3.

**Phase 2 — Orders inbox.** `OrdersInbox.jsx` consuming existing `Order` + `OrderStatusEvent`. Status flow `PENDING → ACCEPTED → READY → COMPLETED/CANCELLED`. On `COMPLETED`, `InventoryService.deductForOrder` runs. End-to-end buyer-to-vendor sale works.

**Phase 3 — Procurement (browse + cart + checkout + orders).** `order_kind` discriminator added; `ProcurementOrderService`; `ProcurementFeed`/`ProcurementCart`/`ProcurementOrders.jsx`; light fisherman procurement-requests inbox section; on `COMPLETED`, `addLotFromProcurement` runs. Inventory now flows in automatically.

**Phase 4 — CatchAlert auto-listing + push.** `AutoListingFromAlertService` + idempotency index; `usePushNotifications`; `useVendorPolling` already exists from earlier phases — wire it to fire push on new CatchAlert / new order events.

**Phase 5 — Public shop page + Shop profile + Reviews.** `ShopProfile` entity + service + API; `ShopProfile.jsx`; populate `frontend/src/buyer/PublicShop.jsx` (`/shop/:vendorIdOrSlug`); `Reviews.jsx` consuming existing `Review`.

**Phase 6 — Analytics + Payouts (stub) + Repeat-buyer insights.** `AnalyticsService` + API + `Analytics.jsx` + `Payouts.jsx` + Home tile composition.

Each phase is independently shippable, manually QA-able, and reviewable in isolation.

## 10. Out of scope (explicit non-goals)

- Promotions / discount codes / bundles.
- Real payment-rail payouts (stub ledger only).
- Full fisherman-side modernization (deferred to its own spec).
- Multi-vendor stalls or shared shopfronts.
- SSE / WebSocket transport (browser push + polling is sufficient for MVP).
- Vendor-side delivery logistics beyond what `Order.deliveryAddress` already supports.

## 11. Risks

- **Inventory race conditions** under concurrent order completion. Mitigated by row-level locking; integration test exercises it.
- **Phase 0 refactor regressing buyer.** Mitigated by enforcing "tests pass with no new tests added" gate before merging Phase 0.
- **Push notification UX** can feel intrusive. Mitigated by explicit opt-in, only two event types, debounced low-stock.
- **Auto-listing accuracy.** Estimated kg from `CatchAlert` may diverge from actual landing. Listings carry an "estimate" badge and are correctable post-landing.

## 12. Open questions

(none at draft time — to be surfaced by spec review)
