# Phase 3 — Procurement (Browse + Cart + Checkout + Orders)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Vendor procurement loop. Vendor browses fisherman `CatchAlert`s in the procurement feed, adds to a cart, checks out (row-locked overcommit prevention), the fisherman accepts/completes, and on `COMPLETED` the goods become an `InventoryLot`. Adds a single new tab on the existing fisherman dashboard listing PROCUREMENT orders.

**Spec reference:** §5.3 (V40), §6 Flow B, §9 Phase 3, §10 (bounded fisherman scope).

**Tech Stack:** Spring Boot, JPA, Flyway, React/Vite, Vitest.

---

## File Structure

### New backend files

```
backend/src/main/resources/db/migration/V40__catch_alert_claim_and_coords.sql
backend/src/main/java/com/mermaid/app/service/ProcurementOrderService.java
backend/src/main/java/com/mermaid/app/service/ProcurementCartService.java
backend/src/main/java/com/mermaid/app/controller/VendorProcurementController.java
backend/src/main/java/com/mermaid/app/controller/VendorProcurementCartController.java
backend/src/main/java/com/mermaid/app/controller/VendorProcurementOrdersController.java
```

### Modified backend files

- `api.yaml` — add `/vendor/procurement/**` paths; add `lat`, `lng`, `claimedKg`, `availableKg` to `CatchAlert` schema.
- `backend/src/main/java/com/mermaid/app/domain/CatchAlert.java` — add `claimedKg`, `lat`, `lng` fields.
- `backend/src/main/java/com/mermaid/app/repository/CatchAlertRepository.java` — add `findByIdInForUpdate(Collection<Long>)` native query with `FOR UPDATE`.
- `backend/src/main/java/com/mermaid/app/service/InventoryService.java` (Phase 1) — wire `addLotFromProcurement` into procurement-order COMPLETED path (call site from `OrderStatusService` switch on `kind == PROCUREMENT`).
- `backend/src/main/java/com/mermaid/app/service/OrderStatusService.java` — on `→ COMPLETED` with `kind==PROCUREMENT`: call `inventoryService.addLotFromProcurement(orderId)`. On `→ CANCELLED` with `kind==PROCUREMENT`: call `procurementOrderService.releaseClaim(orderId)`.

### Fisherman tab (single addition — bounded scope)

- `frontend/src/FishermanDashboard.jsx` — add one tab "Procurement requests" rendering a list of orders where `seller_id = currentUser` AND `kind = PROCUREMENT`. Reuse existing order-status API (the same endpoints buyers/vendors use to advance status). No nav restructure, no styling overhaul.

### New frontend files

```
frontend/src/vendor/ProcurementFeed.jsx
frontend/src/vendor/ProcurementCart.jsx
frontend/src/vendor/ProcurementOrders.jsx
frontend/src/vendor/api/procurement.js
```

### Tests

```
backend/src/test/java/com/mermaid/app/service/ProcurementOrderServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorProcurementControllerTest.java
backend/src/test/java/com/mermaid/app/integration/ProcurementOrderLifecycleIT.java
backend/src/test/java/com/mermaid/app/integration/ProcurementOvercommitConcurrentIT.java

frontend/src/vendor/__tests__/ProcurementFeed.test.jsx
frontend/src/vendor/__tests__/ProcurementCart.test.jsx
```

---

## Task 1: Worktree + baseline

- [ ] Branch `vendor-phase-3-procurement` off Phase 2 merge. Tests baseline green.

## Task 2: V40 — claim accounting + coords

**File:** `backend/src/main/resources/db/migration/V40__catch_alert_claim_and_coords.sql`

```sql
ALTER TABLE catch_alerts
    ADD COLUMN claimed_kg NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (claimed_kg >= 0),
    ADD COLUMN lat NUMERIC(9,6),
    ADD COLUMN lng NUMERIC(9,6);

ALTER TABLE catch_alerts
    ADD CONSTRAINT chk_catch_alerts_claim_bound
    CHECK (quantity_kg IS NULL OR claimed_kg <= quantity_kg);

-- Best-effort backfill from market_locations join via landing_site
UPDATE catch_alerts ca
SET lat = ml.lat, lng = ml.lng
FROM market_locations ml
WHERE ca.lat IS NULL
  AND ca.landing_site IS NOT NULL
  AND lower(ml.name) = lower(ca.landing_site);

CREATE INDEX idx_catch_alerts_active_available
    ON catch_alerts (status, expires_at)
    WHERE status = 'ACTIVE';
```

## Task 3: Domain + repo updates

- [ ] **Step 1:** Add `claimedKg`, `lat`, `lng` to `CatchAlert` entity.
- [ ] **Step 2:** Repo:

```java
@Query(value = "SELECT * FROM catch_alerts WHERE id IN :ids ORDER BY id ASC FOR UPDATE",
       nativeQuery = true)
List<CatchAlert> findByIdInForUpdate(@Param("ids") Collection<Long> ids);
```

(Order by id — deterministic lock acquisition order, prevents deadlocks across concurrent vendor checkouts.)

## Task 4: `ProcurementCartService`

Per-vendor in-memory or simple table cart (mirror buyer cart pattern — verify what buyer uses; if buyer cart is in DB via `cart_items`, do the same with `procurement_cart_items` keyed by vendor; if buyer cart is client-side localStorage, mirror that). For Phase 3, **read existing buyer cart implementation first** and mirror.

- [ ] **Step 1: Read buyer cart code.** Determine storage strategy.
- [ ] **Step 2: Implement** matching pattern. Methods: `add(vendorId, catchAlertId, qtyKg)`, `update(vendorId, itemId, qtyKg)`, `remove(vendorId, itemId)`, `list(vendorId)`, `clear(vendorId)`.
- [ ] **Step 3:** Validate at add-time: alert is ACTIVE, not expired, `claimed_kg + qty <= quantity_kg`. (Optimistic — final check is on checkout under lock.)

## Task 5: `ProcurementOrderService` — row-locked checkout

```java
@Service
@RequiredArgsConstructor
public class ProcurementOrderService {
    private final CatchAlertRepository alertRepo;
    private final OrderRepository orderRepo;
    private final ProcurementCartService cart;
    // ...

    @Transactional
    public List<Order> checkout(Long vendorId) {
        List<CartItem> items = cart.list(vendorId);
        if (items.isEmpty()) throw new IllegalArgumentException("empty cart");
        List<Long> alertIds = items.stream().map(CartItem::getCatchAlertId).distinct().sorted().toList();
        Map<Long, CatchAlert> locked = alertRepo.findByIdInForUpdate(alertIds).stream()
            .collect(Collectors.toMap(CatchAlert::getId, a -> a));

        List<Order> created = new ArrayList<>();
        for (CartItem ci : items) {
            CatchAlert a = locked.get(ci.getCatchAlertId());
            if (a == null || !"ACTIVE".equals(a.getStatus()) || a.getExpiresAt().isBefore(now()))
                throw new ListingClosedException("alert " + ci.getCatchAlertId() + " not available");
            BigDecimal newClaimed = a.getClaimedKg().add(ci.getQtyKg());
            if (a.getQuantityKg() != null && newClaimed.compareTo(a.getQuantityKg()) > 0)
                throw new ListingClosedException("alert " + a.getId() + " overcommitted");
            a.setClaimedKg(newClaimed);
            alertRepo.save(a);

            Order o = new Order();
            o.setKind(OrderKind.PROCUREMENT);
            o.setBuyerId(vendorId);
            o.setSellerId(a.getFishermanId());
            o.setSpeciesId(a.getSpeciesId());
            o.setCatchAlertId(a.getId());
            o.setQuantityKg(ci.getQtyKg());
            o.setPricePerKg(a.getAskingPricePerKg());
            o.setTotalPrice(ci.getQtyKg().multiply(a.getAskingPricePerKg()));
            o.setStatus(OrderStatus.PENDING);
            created.add(orderRepo.save(o));
        }
        cart.clear(vendorId);
        return created;
    }

    @Transactional
    public void releaseClaim(Long orderId) {
        Order o = orderRepo.findById(orderId).orElseThrow();
        if (o.getKind() != OrderKind.PROCUREMENT || o.getCatchAlertId() == null) return;
        CatchAlert a = alertRepo.findByIdInForUpdate(List.of(o.getCatchAlertId())).get(0);
        a.setClaimedKg(a.getClaimedKg().subtract(o.getQuantityKg()).max(BigDecimal.ZERO));
        alertRepo.save(a);
    }
}
```

## Task 6: Wire `OrderStatusService`

- [ ] On `→ COMPLETED` with `kind==PROCUREMENT`: `inventoryService.addLotFromProcurement(orderId)`.
- [ ] On `→ CANCELLED` with `kind==PROCUREMENT`: `procurementOrderService.releaseClaim(orderId)`.

## Task 7: `api.yaml` — `/vendor/procurement/**`

- Paths:
  - `GET /vendor/procurement/feed?speciesId=&maxDistanceKm=&minFreshnessMinutes=&watchlistOnly=`
  - `GET /vendor/procurement/feed/{alertId}` (detail)
  - `GET /vendor/procurement/cart`
  - `POST /vendor/procurement/cart` (body: catchAlertId, qtyKg)
  - `PUT /vendor/procurement/cart/{itemId}` (body: qtyKg)
  - `DELETE /vendor/procurement/cart/{itemId}`
  - `POST /vendor/procurement/checkout`
  - `GET /vendor/procurement/orders?bucket=`
- Schemas: `ProcurementFeedItem` (id, fishermanName, speciesName, quantityKg, claimedKg, availableKg, askingPricePerKg, landingSite, lat, lng, expiresAt, watchlistMatched), `ProcurementCartItem`, `ProcurementOrderSummary`.
- Regenerate.

## Task 8: Controllers

- [ ] **Step 1:** `VendorProcurementController` — feed list/detail. Filter `availableKg = quantity_kg - claimed_kg > 0`. `watchlistMatched` flag computed against current vendor's watchlist (Phase 4 fills the watchlist; until then just `false`).
- [ ] **Step 2:** `VendorProcurementCartController` — cart CRUD + checkout.
- [ ] **Step 3:** `VendorProcurementOrdersController` — list orders where `buyer_id = vendor` AND `kind = PROCUREMENT`. Reuses existing order detail endpoint for individual fetch.

## Task 9: Distance filter

`ProcurementFeed` filter: when `maxDistanceKm` set and vendor has `lat/lng` (from `ShopProfile` if Phase 5 not yet shipped, fall back to vendor's `market_location_id` lat/lng — verify what data exists). Compute haversine in SQL or Java; for Phase 3 keep it simple in Java application-side filter (acceptable scale: catch alerts active at any time = small).

## Task 10: Frontend — `ProcurementFeed.jsx`

- [ ] **Step 1:** List feed cards: species, fisherman name, quantity (claimed/total), price, landing site, freshness ("alert age" = now - createdAt), distance (if available), watchlist badge.
- [ ] **Step 2:** Filters: species select (from existing reference data), freshness slider, distance input, "Watchlist only" toggle (no-op until Phase 4 watchlist).
- [ ] **Step 3:** Card action: "Add to cart" with qty input. Reject when qty > availableKg.
- [ ] **Step 4:** Use `useVendorPolling` for feed refresh (15s).

## Task 11: Frontend — `ProcurementCart.jsx`

- [ ] List cart items, edit qty, remove, "Checkout" button. On checkout success → redirect to `/vendor/procurement/orders`.

## Task 12: Frontend — `ProcurementOrders.jsx`

- [ ] Tabs by bucket (PENDING / ACCEPTED / READY / COMPLETED / CANCELLED). Read-only list (fisherman drives transitions). Cancel button on PENDING/ACCEPTED triggers `releaseClaim`.

## Task 13: Wire routes + nav

- [ ] `<Route path="procurement" element={<ProcurementFeed />} />`
- [ ] `<Route path="procurement/cart" element={<ProcurementCart />} />`
- [ ] `<Route path="procurement/orders" element={<ProcurementOrders />} />`
- [ ] Sidebar Procurement section already present in Phase 0 nav.

## Task 14: Fisherman procurement-requests tab (single tab, bounded)

**File:** `frontend/src/FishermanDashboard.jsx`

- [ ] **Step 1:** Read current dashboard structure.
- [ ] **Step 2:** Add one tab "Procurement requests". Body: list of orders fetched from existing endpoint where `seller_id == currentUser && kind == PROCUREMENT`. Per-row Accept/Ready/Complete/Cancel buttons calling existing order-status API.
- [ ] **Step 3:** No nav restructure, no other styling changes. Diff should be tightly scoped.

## Task 15: Tests

- [ ] **Step 1:** `ProcurementOrderServiceTest` — happy path checkout creates Order(kind=PROCUREMENT) and increments claimed_kg; checkout against expired/cancelled alert → `ListingClosedException`; overcommit (claim + qty > quantity_kg) → `ListingClosedException`; `releaseClaim` restores claimed_kg.
- [ ] **Step 2:** `ProcurementOvercommitConcurrentIT` — `@SpringBootTest`. Two threads attempt checkout against the same alert with combined qty > quantity_kg. One succeeds, one throws `ListingClosedException`. Final `claimed_kg <= quantity_kg`. Use `CountDownLatch` to align thread starts; each in its own `@Transactional` boundary (call service via injected proxy).
- [ ] **Step 3:** `ProcurementOrderLifecycleIT` — vendor adds to cart → checkout → fisherman accepts → completes → assert `InventoryLot` exists with `initial_kg == order.quantityKg` and `source_procurement_order_id == orderId`; then publish a `StorefrontListing` against that lot (Phase 1 service) — verify it appears in buyer marketplace.
- [ ] **Step 4:** Controller tests as in Phase 1 pattern.
- [ ] **Step 5:** `ProcurementFeed.test.jsx` — filters submit expected query params.
- [ ] **Step 6:** `ProcurementCart.test.jsx` — qty exceeding availableKg disables Add.

## Task 16: Manual QA

- [ ] Seed an active CatchAlert (or create one as a test fisherman).
- [ ] Vendor: browse feed, add to cart, checkout → see PENDING in Procurement Orders.
- [ ] Fisherman: see request in tab, Accept → Ready → Complete.
- [ ] Vendor: Inventory page shows new lot with correct kg and source order.
- [ ] Cancel path: vendor cancels PENDING procurement → catch alert claimed_kg restored.
- [ ] Manual concurrent test: two browser windows, two vendor accounts, same alert with combined qty > quantity. One gets 409.

## Task 17: Verify + commit

- [ ] All tests green. `superpowers:verification-before-completion`.
- [ ] Commit:
  ```
  feat(vendor): phase 3 — procurement (browse + cart + checkout + orders)

  - V40: catch_alerts.claimed_kg + lat/lng (overcommit prevention + distance filter)
  - ProcurementOrderService row-locked checkout
  - ProcurementCart, ProcurementFeed, ProcurementOrders pages
  - On PROCUREMENT order COMPLETED: addLotFromProcurement
  - On PROCUREMENT order CANCELLED: releaseClaim restores claimed_kg
  - Fisherman dashboard: single new "Procurement requests" tab (bounded scope)

  Spec: §9 Phase 3
  ```

## Exit criteria

- [ ] Vendor can shop a CatchAlert; fisherman accepts and completes; lot appears in vendor Inventory.
- [ ] `ProcurementOvercommitConcurrentIT` green.
- [ ] `ProcurementOrderLifecycleIT` green.
- [ ] Cancellation restores `claimed_kg`.
- [ ] Fisherman tab is the only fisherman-side change.
