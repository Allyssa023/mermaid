# Phase 1 — Inventory + Storefront Editor + Buyer Marketplace Cutover + Low-Stock Plumbing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up the vendor stock model (immutable lots + append-only movements), the storefront listing model backed by lots, and switch the *buyer* marketplace data source from `demand_listings` to `storefront_listings`. Wire `LOW_STOCK` notification creation on movement writes (UI consumption lands in Phase 2 + Phase 4).

**Spec reference:** `docs/superpowers/specs/2026-05-05-vendor-modernization-design.md` §5.1, §5.2, §5.3 (V35, V36), §6 Flow D, §9 Phase 1.

**Architecture:** Service-Repository-Mapper triad per CLAUDE.md. API-first via `api.yaml` regen. Soft-delete for `storefront_listings`; lots are immutable (no `is_deleted`).

**Tech Stack:** Spring Boot, JPA, Flyway, PostgreSQL, OpenAPI generator, React/Vite, Vitest.

---

## File Structure

### New backend files

```
backend/src/main/resources/db/migration/V35__create_inventory.sql
backend/src/main/resources/db/migration/V36__create_storefront_listings.sql
backend/src/main/resources/db/seed/2026-05-05-storefront-cutover-seed.sql

backend/src/main/java/com/mermaid/app/domain/InventoryLot.java
backend/src/main/java/com/mermaid/app/domain/InventoryMovement.java
backend/src/main/java/com/mermaid/app/domain/MovementReason.java        (enum)
backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java
backend/src/main/java/com/mermaid/app/domain/StorefrontListingStatus.java (enum)
backend/src/main/java/com/mermaid/app/domain/StorefrontListingLot.java   (composite-key join)

backend/src/main/java/com/mermaid/app/repository/InventoryLotRepository.java
backend/src/main/java/com/mermaid/app/repository/InventoryMovementRepository.java
backend/src/main/java/com/mermaid/app/repository/StorefrontListingRepository.java
backend/src/main/java/com/mermaid/app/repository/StorefrontListingLotRepository.java

backend/src/main/java/com/mermaid/app/mapper/InventoryLotMapper.java
backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java

backend/src/main/java/com/mermaid/app/service/InventoryService.java
backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java
backend/src/main/java/com/mermaid/app/exception/InsufficientStockException.java

backend/src/main/java/com/mermaid/app/controller/VendorInventoryController.java
backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java
```

### Modified backend files

- `backend/src/main/resources/openapi/api.yaml` — add `/vendor/inventory/**`, `/vendor/storefront/**` paths and schemas; switch `/buyer/marketplace/listings` response to be sourced from storefront listings (preserve `BuyerListingDetail` shape where possible).
- `backend/src/main/java/com/mermaid/app/service/NotificationService.java` — add `create(Long userId, String type, String body, Map<String,Object> payload)`; type enum mention only — string-typed.
- `backend/src/main/java/com/mermaid/app/service/MarketplaceService.java` — switch read to `storefront_listings` join `inventory_lots` for availability.
- `backend/src/main/java/com/mermaid/app/controller/BuyerMarketplaceController.java` — same DTO shape, new source.
- `backend/src/main/java/com/mermaid/app/service/CheckoutService.java` — populate `orders.storefront_listing_id` when creating retail order.

### New frontend files

```
frontend/src/vendor/Inventory.jsx
frontend/src/vendor/StorefrontEditor.jsx
frontend/src/vendor/api/inventory.js
frontend/src/vendor/api/storefront.js
```

### Tests

```
backend/src/test/java/com/mermaid/app/service/InventoryServiceTest.java
backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorInventoryControllerTest.java
backend/src/test/java/com/mermaid/app/controller/VendorStorefrontControllerTest.java
backend/src/test/java/com/mermaid/app/integration/BuyerMarketplaceCutoverIT.java

frontend/src/vendor/__tests__/Inventory.test.jsx
frontend/src/vendor/__tests__/StorefrontEditor.test.jsx
```

---

## Task 1: Worktree + branch baseline

- [ ] **Step 1: Verify clean tree.** `git status` clean.
- [ ] **Step 2: Create worktree.** Use `superpowers:using-git-worktrees`. Branch: `vendor-phase-1-inventory-storefront`. Base: `modern_auth3`.
- [ ] **Step 3: Run baseline tests.** `cd backend && ./mvnw test` and `cd frontend && npm test` — both green before starting.

## Task 2: V35 — `inventory_lots` + `inventory_movements`

**File:** `backend/src/main/resources/db/migration/V35__create_inventory.sql`

- [ ] **Step 1: Write migration.**

```sql
CREATE TABLE inventory_lots (
    id                          BIGSERIAL    PRIMARY KEY,
    vendor_id                   BIGINT       NOT NULL REFERENCES users(id),
    species_id                  BIGINT       NOT NULL REFERENCES fish_species(id),
    source_procurement_order_id BIGINT       REFERENCES orders(id),
    received_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    initial_kg                  NUMERIC(10,2) NOT NULL CHECK (initial_kg >= 0),
    remaining_kg                NUMERIC(10,2) NOT NULL CHECK (remaining_kg >= 0),
    cost_per_kg                 NUMERIC(10,2),
    freshness_graded_at         TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_lots_vendor_species
    ON inventory_lots (vendor_id, species_id);
CREATE INDEX idx_inventory_lots_fifo
    ON inventory_lots (vendor_id, species_id, received_at)
    WHERE remaining_kg > 0;

CREATE TABLE inventory_movements (
    id            BIGSERIAL    PRIMARY KEY,
    lot_id        BIGINT       NOT NULL REFERENCES inventory_lots(id),
    delta_kg      NUMERIC(10,2) NOT NULL,
    reason        VARCHAR(32)  NOT NULL
        CONSTRAINT chk_movement_reason CHECK (reason IN
            ('PROCUREMENT_RECEIVED','SALE_COMPLETED','ADJUSTMENT_LOSS','ADJUSTMENT_CORRECTION')),
    ref_order_id  BIGINT       REFERENCES orders(id),
    note          TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_lot ON inventory_movements (lot_id, created_at);
```

- [ ] **Step 2: Run.** `./mvnw spring-boot:run` — confirm Flyway applies V35.

## Task 3: V36 — `storefront_listings` + `storefront_listing_lots` + `orders.storefront_listing_id`

**File:** `backend/src/main/resources/db/migration/V36__create_storefront_listings.sql`

- [ ] **Step 1: Write migration.**

```sql
CREATE TABLE storefront_listings (
    id             BIGSERIAL    PRIMARY KEY,
    vendor_id      BIGINT       NOT NULL REFERENCES users(id),
    species_id     BIGINT       NOT NULL REFERENCES fish_species(id),
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    photo_url      VARCHAR(500),
    price_per_kg   NUMERIC(10,2) NOT NULL CHECK (price_per_kg >= 0),
    min_qty_kg     NUMERIC(10,2) NOT NULL DEFAULT 0.5 CHECK (min_qty_kg > 0),
    status         VARCHAR(16)  NOT NULL DEFAULT 'DRAFT'
        CONSTRAINT chk_storefront_status CHECK (status IN ('DRAFT','PUBLISHED','UNPUBLISHED','SOLD_OUT')),
    is_deleted     BOOLEAN      NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_storefront_active
    ON storefront_listings (vendor_id, status)
    WHERE is_deleted = false;

CREATE TABLE storefront_listing_lots (
    listing_id  BIGINT NOT NULL REFERENCES storefront_listings(id) ON DELETE CASCADE,
    lot_id      BIGINT NOT NULL REFERENCES inventory_lots(id),
    PRIMARY KEY (listing_id, lot_id)
);

CREATE INDEX idx_storefront_lot_lookup ON storefront_listing_lots (lot_id);

ALTER TABLE orders ADD COLUMN storefront_listing_id BIGINT REFERENCES storefront_listings(id);
CREATE INDEX idx_orders_storefront_listing ON orders (storefront_listing_id);
```

## Task 4: Domain entities

- [ ] **Step 1:** `InventoryLot` JPA entity. Fields per V35. `@OneToMany` to `InventoryMovement` not needed (avoid hydrating for FIFO query).
- [ ] **Step 2:** `MovementReason` enum: `PROCUREMENT_RECEIVED, SALE_COMPLETED, ADJUSTMENT_LOSS, ADJUSTMENT_CORRECTION`.
- [ ] **Step 3:** `InventoryMovement` JPA entity with `@Enumerated(EnumType.STRING) MovementReason reason`.
- [ ] **Step 4:** `StorefrontListingStatus` enum: `DRAFT, PUBLISHED, UNPUBLISHED, SOLD_OUT`.
- [ ] **Step 5:** `StorefrontListing` entity. `is_deleted` boolean. No relation to `StorefrontListingLot` collection — query by repo.
- [ ] **Step 6:** `StorefrontListingLot` with `@Embeddable` composite key `(listing_id, lot_id)`.

## Task 5: Repositories

- [ ] **Step 1:** `InventoryLotRepository extends JpaRepository<InventoryLot, Long>`. Methods:
  - `List<InventoryLot> findByVendorIdAndSpeciesIdAndRemainingKgGreaterThanOrderByReceivedAtAsc(Long, Long, BigDecimal)`
  - `@Query(value = "SELECT * FROM inventory_lots WHERE id IN :ids ORDER BY received_at ASC FOR UPDATE", nativeQuery = true) List<InventoryLot> findByIdInForUpdate(@Param("ids") Collection<Long> ids);`
  - `@Query("select sum(l.remainingKg) from InventoryLot l where l.vendorId=:v and l.speciesId=:s") BigDecimal sumAvailable(...);`
- [ ] **Step 2:** `InventoryMovementRepository extends JpaRepository<InventoryMovement, Long>`.
- [ ] **Step 3:** `StorefrontListingRepository` with `findByVendorIdAndIsDeletedFalse(Long)`, `findByStatusAndIsDeletedFalse(StorefrontListingStatus)`, `findByIdAndIsDeletedFalse(Long)`.
- [ ] **Step 4:** `StorefrontListingLotRepository` with `findByListingId(Long)`, `findByLotId(Long)`.

## Task 6: `InsufficientStockException` + `GlobalExceptionHandler` mapping

- [ ] **Step 1:** Create `InsufficientStockException extends RuntimeException`.
- [ ] **Step 2:** Add handler: `@ExceptionHandler(InsufficientStockException.class)` → `409 CONFLICT`. Format mirrors `ListingClosedException` handler.

## Task 7: `NotificationService.create(...)` extension

**File:** `backend/src/main/java/com/mermaid/app/service/NotificationService.java`

- [ ] **Step 1: Read existing file** to understand the read-only API surface.
- [ ] **Step 2: Add `create` method.**

```java
@Transactional
public Notification create(Long userId, String type, String body, Map<String,Object> payload) {
    Notification n = new Notification();
    n.setUserId(userId);
    n.setType(type);
    n.setBody(body);
    if (payload != null) n.setPayloadJson(objectMapper.writeValueAsString(payload));
    n.setRead(false);
    n.setCreatedAt(OffsetDateTime.now());
    return notificationRepository.save(n);
}
```

(Adjust to match existing `Notification` entity field names; verify by reading it before writing.)

- [ ] **Step 3: Define type constants.** Inline as string literals at call sites: `"LOW_STOCK"`, `"CATCH_ALERT_NEW"`, `"ORDER_STATUS_CHANGED"`. (No enum required — payload is JSON.)

## Task 8: `InventoryService` (FIFO, threshold, debounce)

**File:** `backend/src/main/java/com/mermaid/app/service/InventoryService.java`

- [ ] **Step 1: Class skeleton.**

```java
@Service
@RequiredArgsConstructor
public class InventoryService {
    private final InventoryLotRepository lotRepo;
    private final InventoryMovementRepository moveRepo;
    private final NotificationService notifications;
    private final StorefrontListingRepository listingRepo;
    private final StorefrontListingLotRepository listingLotRepo;

    private static final BigDecimal DEFAULT_LOW_STOCK_KG = new BigDecimal("5.00");
    private static final Duration LOW_STOCK_DEBOUNCE = Duration.ofHours(12);
    // ...
}
```

- [ ] **Step 2: `addLotFromProcurement(Long orderId)`.** Read `Order` (single-species per row, V18), create `InventoryLot(vendor=order.buyerId, species=order.speciesId, source_procurement_order_id=orderId, initial_kg=order.quantityKg, remaining_kg=order.quantityKg, cost_per_kg=order.pricePerKg)`, write `InventoryMovement(lot, +qty, PROCUREMENT_RECEIVED, refOrder)`.
- [ ] **Step 3: `recordAdjustment(lotId, deltaKg, reason, note)`.** Lock lot row (`findByIdInForUpdate`), assert `remaining + delta >= 0`, mutate `remaining_kg`, write movement.
- [ ] **Step 4: `availableKg(vendorId, speciesId)`.** `lotRepo.sumAvailable(...)` returning `BigDecimal.ZERO` if null.
- [ ] **Step 5: `lotsForVendor(vendorId, speciesId, includeEmpty)`.** Query lots filtered.
- [ ] **Step 6: `deductForOrder(orderId)` — FIFO, row-locked.**

```java
@Transactional
public void deductForOrder(Long orderId) {
    Order order = orderRepo.findById(orderId).orElseThrow(...);
    StorefrontListing listing = listingRepo.findByIdAndIsDeletedFalse(order.getStorefrontListingId())
        .orElseThrow(() -> new IllegalStateException("retail order missing storefront_listing_id"));
    List<Long> lotIds = listingLotRepo.findByListingId(listing.getId())
        .stream().map(StorefrontListingLot::getLotId).toList();
    List<InventoryLot> lots = lotRepo.findByIdInForUpdate(lotIds); // SELECT FOR UPDATE
    BigDecimal need = order.getQuantityKg();
    for (InventoryLot lot : lots) {
        if (need.signum() <= 0) break;
        if (lot.getRemainingKg().signum() <= 0) continue;
        BigDecimal take = lot.getRemainingKg().min(need);
        lot.setRemainingKg(lot.getRemainingKg().subtract(take));
        lotRepo.save(lot);
        moveRepo.save(new InventoryMovement(lot.getId(), take.negate(), SALE_COMPLETED, orderId));
        need = need.subtract(take);
    }
    if (need.signum() > 0) throw new InsufficientStockException(...);

    BigDecimal totalRemaining = lots.stream().map(InventoryLot::getRemainingKg).reduce(ZERO, BigDecimal::add);
    if (totalRemaining.signum() == 0) {
        listing.setStatus(SOLD_OUT);
        listingRepo.save(listing);
    }

    maybeFireLowStock(listing.getVendorId(), listing.getSpeciesId());
}
```

- [ ] **Step 7: `maybeFireLowStock(vendorId, speciesId)` — Flow D.**

```java
private void maybeFireLowStock(Long vendorId, Long speciesId) {
    BigDecimal available = availableKg(vendorId, speciesId);
    BigDecimal threshold = thresholdFor(vendorId, speciesId); // for now: DEFAULT_LOW_STOCK_KG
    if (available.compareTo(threshold) >= 0) return;
    if (recentLowStockExists(vendorId, speciesId, LOW_STOCK_DEBOUNCE)) return;
    notifications.create(vendorId, "LOW_STOCK",
        "Low stock: " + speciesName + " (" + available + " kg)",
        Map.of("speciesId", speciesId, "availableKg", available, "thresholdKg", threshold));
}
```

For Phase 1, `thresholdFor` returns the default; vendor-overridable input is on `Inventory.jsx` but persisted threshold is deferred to a follow-up if needed (spec says vendor-overridable on the Inventory page; for Phase 1 acceptable to store on `inventory_thresholds (vendor_id, species_id, kg)` if simple — OR keep the default and ship overridable in Phase 2; choose default-only path now for scope).

`recentLowStockExists` queries `notifications` for same `(userId, type='LOW_STOCK', payload speciesId match)` within `LOW_STOCK_DEBOUNCE`. Use a JSON path query:

```java
@Query(value = "SELECT count(*) > 0 FROM notifications " +
               "WHERE user_id = :v AND type = 'LOW_STOCK' " +
               "AND created_at > :since " +
               "AND (payload_json::jsonb)->>'speciesId' = :s::text",
       nativeQuery = true)
boolean existsRecentLowStock(@Param("v") Long vendorId, @Param("s") Long speciesId, @Param("since") OffsetDateTime since);
```

## Task 9: `StorefrontListingService`

**File:** `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java`

- [ ] **Step 1: Methods.**
  - `create(vendorId, dto, lotIds)` — assert all lot IDs belong to vendor and same species; assert at least one lot has `remaining_kg > 0`; persist listing + listing_lot rows; status `DRAFT`.
  - `update(vendorId, listingId, dto, lotIds)` — vendor scoping; update fields + replace lot links.
  - `publish(vendorId, listingId)` — assert ≥ 1 lot has remaining > 0; status → `PUBLISHED`. Throw `IllegalArgumentException` on 0 kg.
  - `unpublish(vendorId, listingId)` — status → `UNPUBLISHED`.
  - `delete(vendorId, listingId)` — soft delete (`is_deleted = true`).
  - `listForVendor(vendorId)` — `findByVendorIdAndIsDeletedFalse`.
  - `listForBuyerMarketplace(filters)` — used by `MarketplaceService`. Status `PUBLISHED`, `is_deleted=false`, joined with summed lot availability > 0. Filter: species, vendorId, search.

## Task 10: `api.yaml` — vendor surface + buyer cutover schema

**File:** `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1:** Add tags `vendor-inventory`, `vendor-storefront`.
- [ ] **Step 2: Paths.**
  - `GET /vendor/inventory/lots` (filters: speciesId)
  - `POST /vendor/inventory/adjustments` (body: lotId, deltaKg, reason, note)
  - `GET /vendor/inventory/availability?speciesId=`
  - `GET /vendor/storefront/listings`
  - `POST /vendor/storefront/listings`
  - `GET /vendor/storefront/listings/{id}`
  - `PUT /vendor/storefront/listings/{id}`
  - `POST /vendor/storefront/listings/{id}/publish`
  - `POST /vendor/storefront/listings/{id}/unpublish`
  - `DELETE /vendor/storefront/listings/{id}`
- [ ] **Step 3: Schemas.** `InventoryLot`, `InventoryAdjustmentRequest`, `StorefrontListing`, `StorefrontListingRequest`, `StorefrontListingDetail` (includes `availableKg`), `BuyerListingDetail` (verify field stability vs current shape — keep `id`, `vendorId`, `vendorName`, `speciesId`, `speciesName`, `pricePerKg`, `availableKg`, `photoUrl`, `description`).
- [ ] **Step 4: Regenerate.** `./mvnw clean compile` — confirm new interfaces appear in `target/generated-sources`.

## Task 11: Mappers

- [ ] **Step 1:** `InventoryLotMapper.toDto(InventoryLot)` returning generated `InventoryLot` model.
- [ ] **Step 2:** `StorefrontListingMapper.toDto(StorefrontListing, BigDecimal availableKg)` — buyer DTO sums lot `remaining_kg` for `availableKg` field.

## Task 12: Vendor controllers

**Files:** `VendorInventoryController.java`, `VendorStorefrontController.java`

- [ ] **Step 1:** Both class-level `@PreAuthorize("hasRole('VENDOR')")`. Implement generated interfaces from regen.
- [ ] **Step 2:** Resolve `vendorId` from `Authentication` principal (mirror existing pattern e.g. `AdminUserController` but extracting current user; check existing pattern in `VendorDemandListingController` for the buyer-vendor token claim shape).
- [ ] **Step 3:** Wire each endpoint to service method. Reject mismatched vendorId from path with 403 (Spring Security).

## Task 13: Buyer marketplace cutover

**Files:** `MarketplaceService.java`, `BuyerMarketplaceController.java`

- [ ] **Step 1: Read current implementations.**
- [ ] **Step 2: Replace data source.** `MarketplaceService.listForBuyer(...)` queries via `StorefrontListingService.listForBuyerMarketplace(filters)`. Detail endpoint queries `storefront_listings` + sums lot `remaining_kg`.
- [ ] **Step 3: Preserve DTO shape** to minimize buyer frontend churn. If a field rename is unavoidable, update `frontend/src/buyer/Marketplace.jsx` and `ListingDetail.jsx` in the same task.
- [ ] **Step 4: `CheckoutService` — populate `storefront_listing_id`.** Read existing `CheckoutService`; on retail-order creation, copy `cartItem.listingId` → `order.storefrontListingId`.

## Task 14: Demo seed

**File:** `backend/src/main/resources/db/seed/2026-05-05-storefront-cutover-seed.sql`

- [ ] **Step 1: Write seed.** Idempotent SQL inserting one demo `inventory_lot` per existing demo vendor (lookup by role) and one `storefront_listing` linked via `storefront_listing_lots`. Guard with `WHERE NOT EXISTS`.
- [ ] **Step 2: Document run.** README note: `psql ... < V` *not* via Flyway. Run order: after V36 applies, before buyer demo.

## Task 15: Frontend — `Inventory.jsx`

**File:** `frontend/src/vendor/Inventory.jsx`

- [ ] **Step 1: Replace placeholder.** Components: lots table (species, received_at, initial/remaining, cost), filter by species, "Adjust" button → modal posting `/vendor/inventory/adjustments`. Highlight rows where species available < threshold input (controlled state in page; default 5kg; not persisted in Phase 1).
- [ ] **Step 2: API helper.** `frontend/src/vendor/api/inventory.js` with `listLots`, `recordAdjustment`, `availability`.

## Task 16: Frontend — `StorefrontEditor.jsx`

**File:** `frontend/src/vendor/StorefrontEditor.jsx`

- [ ] **Step 1: Page layout.** Listings table (status badge: DRAFT/PUBLISHED/UNPUBLISHED/SOLD_OUT), "New listing" button → modal: species select, title, description, photo upload (reuse `buyer/components/ImageUpload.jsx`), price/kg, min qty, **Lot picker** showing the vendor's lots filtered to selected species with `remaining_kg > 0`, multi-select.
- [ ] **Step 2: Disable publish** when no lot selected or all selected lots are 0kg.
- [ ] **Step 3: API helper.** `frontend/src/vendor/api/storefront.js` with CRUD + publish/unpublish.

## Task 17: Wire vendor routes

**File:** `frontend/src/vendor/VendorDashboard.jsx`

- [ ] **Step 1:** Replace placeholders: `<Route path="inventory" element={<Inventory />} />`, `<Route path="storefront" element={<StorefrontEditor />} />`. Other routes still placeholders.

## Task 18: Backend tests

- [ ] **Step 1:** `InventoryServiceTest` — addLotFromProcurement; FIFO across 3 lots; partial drain leaves SOLD_OUT only when total = 0; `InsufficientStockException` when need > available; lock invocation verified via mock; debounce: second LOW_STOCK within 12h not created.
- [ ] **Step 2:** `StorefrontListingServiceTest` — publish requires ≥ 1 lot with remaining > 0; vendor scoping (other vendor's lot rejected); soft-delete excludes from list.
- [ ] **Step 3:** `VendorInventoryControllerTest`, `VendorStorefrontControllerTest` — happy path + 401 + 403 for wrong role + 400/409 mappings. JWT roles `["ROLE_VENDOR"]`.
- [ ] **Step 4:** `BuyerMarketplaceCutoverIT` — `@SpringBootTest` with real DB: seed vendor + lot + storefront listing; GET `/buyer/marketplace/listings` returns it; ensure `demand_listings` rows do NOT appear.

## Task 19: Frontend tests

- [ ] **Step 1:** `Inventory.test.jsx` — mocked API returns 2 lots, 1 below threshold; assert highlight class on the low-stock row.
- [ ] **Step 2:** `StorefrontEditor.test.jsx` — lot picker hides 0kg lots; publish button disabled when no lot selected.

## Task 20: Manual QA

- [ ] **Step 1:** Run backend + marine + frontend locally.
- [ ] **Step 2:** Apply seed (`psql -d mermaid_db -f backend/src/main/resources/db/seed/2026-05-05-storefront-cutover-seed.sql`).
- [ ] **Step 3:** Log in as vendor → Inventory shows seeded lot; create a storefront listing, publish it.
- [ ] **Step 4:** Log in as buyer → Marketplace shows the storefront listing, NOT the demand listings.
- [ ] **Step 5:** Adjust lot down to 4kg → confirm a `LOW_STOCK` row appears in `notifications` (DB query — UI consumption is Phase 2).

## Task 21: Verify + commit

- [ ] **Step 1:** `./mvnw test` all green; `npm test` all green; `npm run lint` clean.
- [ ] **Step 2:** Use `superpowers:verification-before-completion` before claiming done.
- [ ] **Step 3:** Commit with message:
  ```
  feat(vendor): phase 1 — inventory + storefront editor + buyer marketplace cutover

  - V35: inventory_lots + inventory_movements (immutable lots, append-only movements)
  - V36: storefront_listings + storefront_listing_lots + orders.storefront_listing_id
  - InventoryService (FIFO, row-locked deduct, low-stock debounce)
  - StorefrontListingService (publish gates on lots>0)
  - Buyer marketplace cutover: demand_listings → storefront_listings
  - NotificationService.create(...) for LOW_STOCK
  - Demo seed under db/seed/ (one-shot, not Flyway)

  Spec: docs/superpowers/specs/2026-05-05-vendor-modernization-design.md §9 Phase 1
  ```

## Exit criteria

- [ ] Vendor can seed a lot, publish a storefront listing.
- [ ] Storefront listing appears in buyer marketplace; demand_listings rows do not.
- [ ] `InventoryService` writes a `LOW_STOCK` notification when threshold crossed (verified via DB read in `InventoryServiceTest`).
- [ ] `BuyerMarketplaceCutoverIT` green.
- [ ] All existing buyer marketplace tests adapted and green.
