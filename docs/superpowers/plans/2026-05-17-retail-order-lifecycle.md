# Retail Order Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat PENDING→CONFIRMED→COMPLETED vendor-buyer retail order lifecycle with a GrabFood-inspired multi-step flow with COD support, per-listing delivery fee, and three-layer stock validation.

**Architecture:** Four Flyway migrations (V59–V62) extend the DB schema. api.yaml gains 8 new endpoints and 4 new schemas; `./mvnw generate-sources` regenerates Java interfaces. Backend services (`CartService`, `BuyerOrderService`, `VendorOrderService`) are extended; a new scheduler (`RetailOrderAutoCompleter`) auto-closes stale receipts. Frontend (`OrderCard`, 3 new modals, `OrdersInbox`, `Checkout`, `Marketplace`, `Inventory`) drives the new lifecycle.

**Tech Stack:** Spring Boot 3 / Java 17, React 18 / Vite, PostgreSQL 15, Flyway, TanStack Query v5, Spring `@Scheduled`, JPA PESSIMISTIC_WRITE locking.

**Spec:** `docs/superpowers/specs/2026-05-17-retail-order-lifecycle-design.md`

---

## File Map

| Layer | File | Action |
|-------|------|--------|
| DB | `V59__expand_order_status_constraint.sql` | CREATE |
| DB | `V60__fix_cart_items_listing_fk.sql` | CREATE |
| DB | `V61__delivery_fee_and_stock_index.sql` | CREATE |
| DB | `V62__payment_idempotency_constraint.sql` | CREATE |
| API | `backend/src/main/resources/openapi/api.yaml` | MODIFY |
| Domain | `domain/CartItem.java` | MODIFY |
| Domain | `domain/StorefrontListing.java` | MODIFY |
| Repo | `repository/StorefrontListingRepository.java` | MODIFY |
| Repo | `repository/OrderRepository.java` | MODIFY |
| Repo | `repository/PaymentRepository.java` | MODIFY |
| Service | `service/InventoryService.java` | MODIFY |
| Service | `service/CartService.java` | MODIFY |
| Service | `service/BuyerOrderService.java` | MODIFY |
| Service | `service/VendorOrderService.java` | MODIFY |
| Service | `service/StorefrontListingService.java` | MODIFY |
| Service | `service/RetailOrderAutoCompleter.java` | CREATE |
| Controller | `controller/VendorOrdersController.java` | MODIFY |
| Controller | `controller/BuyerOrderController.java` | MODIFY |
| Controller | `controller/AdminController.java` | MODIFY |
| Frontend | `frontend/src/vendor/api/orders.js` | MODIFY |
| Frontend | `frontend/src/buyer/api/orders.js` | MODIFY |
| Frontend | `frontend/src/components/OrderCard.jsx` | MODIFY |
| Frontend | `frontend/src/components/modals/MarkPickedUpModal.jsx` | CREATE |
| Frontend | `frontend/src/components/modals/MarkDeliveredModal.jsx` | CREATE |
| Frontend | `frontend/src/components/modals/ConfirmReceiptModal.jsx` | CREATE |
| Frontend | `frontend/src/vendor/OrdersInbox.jsx` | MODIFY |
| Frontend | `frontend/src/buyer/Orders.jsx` | MODIFY |
| Frontend | `frontend/src/buyer/Checkout.jsx` | MODIFY |
| Frontend | `frontend/src/buyer/Marketplace.jsx` | MODIFY |
| Frontend | `frontend/src/vendor/Inventory.jsx` | MODIFY |

All backend paths are relative to `backend/src/main/java/com/mermaid/app/`.

---

## Task 1: Database Migrations (V59–V62)

**Files:**
- Create: `backend/src/main/resources/db/migration/V59__expand_order_status_constraint.sql`
- Create: `backend/src/main/resources/db/migration/V60__fix_cart_items_listing_fk.sql`
- Create: `backend/src/main/resources/db/migration/V61__delivery_fee_and_stock_index.sql`
- Create: `backend/src/main/resources/db/migration/V62__payment_idempotency_constraint.sql`

- [ ] **Step 1: Create V59 — expand order status constraint**

```sql
-- backend/src/main/resources/db/migration/V59__expand_order_status_constraint.sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
DROP INDEX IF EXISTS idx_orders_seller_status_kind;

ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN (
        'PENDING','CONFIRMED','PREPARING',
        'READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT',
        'COMPLETED','CANCELLED','DISPUTED'
    ));

CREATE INDEX idx_orders_seller_status_kind
    ON orders (seller_id, status, order_kind)
    WHERE status IN ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT');
```

- [ ] **Step 2: Create V60 — fix cart_items FK**

```sql
-- backend/src/main/resources/db/migration/V60__fix_cart_items_listing_fk.sql
DELETE FROM cart_items;

-- Drop all possible FK names (Hibernate naming is non-deterministic)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_listing_id;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_listing_id_fkey;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_listing;

ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_storefront_listing
    FOREIGN KEY (listing_id) REFERENCES storefront_listings(id);
```

- [ ] **Step 3: Create V61 — delivery fee columns + index**

```sql
-- backend/src/main/resources/db/migration/V61__delivery_fee_and_stock_index.sql
ALTER TABLE storefront_listings
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_orders_storefront_listing_status
    ON orders(storefront_listing_id, status);
```

- [ ] **Step 4: Create V62 — payment idempotency constraint**

```sql
-- backend/src/main/resources/db/migration/V62__payment_idempotency_constraint.sql
ALTER TABLE payments ADD CONSTRAINT uq_payments_order UNIQUE (order_id);
```

- [ ] **Step 5: Verify migrations run**

```bash
cd backend && ./mvnw spring-boot:run
```
Expected: Application starts, Flyway log shows `Successfully applied 4 migrations`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V59__expand_order_status_constraint.sql \
        backend/src/main/resources/db/migration/V60__fix_cart_items_listing_fk.sql \
        backend/src/main/resources/db/migration/V61__delivery_fee_and_stock_index.sql \
        backend/src/main/resources/db/migration/V62__payment_idempotency_constraint.sql
git commit -m "feat(db): add migrations V59-V62 for retail order lifecycle"
```

---

## Task 2: api.yaml — New Schemas and Endpoints

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

**Context:** The project is API-first. Controllers implement generated interfaces from api.yaml. Run `./mvnw generate-sources` after changes to regenerate Java interfaces. Do NOT write controller method signatures by hand.

- [ ] **Step 1: Add 4 new request body schemas**

Find the `VendorCancelOrderRequest:` schema (around line 6698). Add these four schemas immediately after it:

```yaml
    VendorCompleteOrderRequest:
      type: object
      properties:
        codAmount:
          type: number
          format: double
          description: "Cash collected from buyer. Required for COD orders; ignored when Xendit payment already exists."

    VendorDeliveredRequest:
      type: object
      properties:
        codAmount:
          type: number
          format: double
          description: "Cash collected on delivery. Required for COD orders; ignored when Xendit payment already exists."

    BuyerDisputeRequest:
      type: object
      required: [reason]
      properties:
        reason:
          type: string
          minLength: 10
          maxLength: 500

    AdminResolveDisputeRequest:
      type: object
      required: [outcome]
      properties:
        outcome:
          type: string
          enum: [COMPLETED, CANCELLED]
        notes:
          type: string
          maxLength: 500
```

- [ ] **Step 2: Add deliveryFee, dispatchMode, and update status enum on VendorOrderSummary**

Find `VendorOrderSummary:` schema (~line 6658). After the `storefrontListingId` property (around line 6690), add:

```yaml
        deliveryFee:
          type: number
          format: double
          nullable: true
        dispatchMode:
          type: string
          nullable: true
```

Also update the `status` enum on `VendorOrderSummary` to include the new lifecycle statuses. Replace:
```yaml
          enum: [PENDING, CONFIRMED, ACCEPTED, READY, COMPLETED, CANCELLED, DISPUTED]
```
with:
```yaml
          enum: [PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, AWAITING_RECEIPT, COMPLETED, CANCELLED, DISPUTED]
```

**Important:** Keeping the `enum:` declaration (just updating its values) preserves the generated `VendorOrderSummary.StatusEnum` class — so the existing `StatusEnum.fromValue(order.getStatus())` call in `VendorOrdersController.toSummary()` continues to compile after `generate-sources`.

- [ ] **Step 3: Add deliveryFee to StorefrontListingSummary**

Find `StorefrontListingSummary:` schema (~line 6615). After `minQtyKg:` property, add:

```yaml
        deliveryFee:
          type: number
          format: double
          description: "Delivery fee in PHP. 0 means free delivery."
```

- [ ] **Step 4: Add deliveryFee to storefront listing create/update request schemas**

Find `StorefrontListingCreateRequest:` (search for it). Add `deliveryFee` as an optional property with `type: number, format: double, default: 0`.

Find `StorefrontListingUpdateRequest:` and add the same field.

- [ ] **Step 5: Add delivery_fee to the Order model (buyer orders)**

Find the `Order:` schema (the one used by buyer order endpoints). Add after `dispatchMode`:

```yaml
        deliveryFee:
          type: number
          format: double
          nullable: true
```

- [ ] **Step 6: Add 4 new vendor endpoints**

Find `/vendor/orders/{orderId}/cancel:` block (~line 1292). Add these 4 new endpoint blocks immediately before it (keeping the orderId parameter pattern from existing endpoints):

```yaml
  /vendor/orders/{orderId}/preparing:
    post:
      tags: [Vendor Orders]
      summary: Mark order as preparing (packing started)
      operationId: vendorMarkPreparing
      security: [{bearerAuth: []}]
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: Order updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VendorOrderSummary'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /vendor/orders/{orderId}/dispatch:
    post:
      tags: [Vendor Orders]
      summary: Mark order as dispatched for delivery
      operationId: vendorDispatchOrder
      security: [{bearerAuth: []}]
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: Order updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VendorOrderSummary'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /vendor/orders/{orderId}/delivered:
    post:
      tags: [Vendor Orders]
      summary: Mark order as delivered (awaiting buyer receipt confirmation)
      operationId: vendorMarkDelivered
      security: [{bearerAuth: []}]
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VendorDeliveredRequest'
      responses:
        '200':
          description: Order updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VendorOrderSummary'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

Also update the existing `/vendor/orders/{orderId}/complete:` endpoint to use `VendorCompleteOrderRequest` as an optional request body (currently it has no body). Find operationId `vendorCompleteOrder` and add:

```yaml
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VendorCompleteOrderRequest'
```

- [ ] **Step 7: Add 2 new buyer endpoints**

Find the existing buyer orders section. Add after the last buyer order endpoint:

```yaml
  /buyer/orders/{orderId}/confirm-receipt:
    post:
      tags: [Buyer Orders]
      summary: Buyer confirms receipt of delivered order
      operationId: buyerConfirmReceipt
      security: [{bearerAuth: []}]
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: Order completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /buyer/orders/{orderId}/dispute:
    post:
      tags: [Buyer Orders]
      summary: Buyer raises a dispute on a delivered order
      operationId: buyerDisputeOrder
      security: [{bearerAuth: []}]
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BuyerDisputeRequest'
      responses:
        '200':
          description: Order disputed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

- [ ] **Step 8: Add admin resolve endpoint**

Find the admin endpoints section. Add:

```yaml
  /admin/orders/{orderId}/resolve:
    post:
      tags: [Admin]
      summary: Admin resolves a disputed order
      operationId: adminResolveDispute
      security: [{bearerAuth: []}]
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AdminResolveDisputeRequest'
      responses:
        '200':
          description: Dispute resolved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

- [ ] **Step 9: Regenerate Java interfaces**

```bash
cd backend && ./mvnw generate-sources
```
Expected: BUILD SUCCESS. New generated files appear under `target/generated-sources/openapi/` for `vendorMarkPreparing`, `vendorDispatchOrder`, `vendorMarkDelivered`, `buyerConfirmReceipt`, `buyerDisputeOrder`, `adminResolveDispute`.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(api): add retail lifecycle endpoints and delivery fee schemas to api.yaml"
```

---

## Task 3: Domain + Repository Changes

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/domain/CartItem.java`
- Modify: `backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/StorefrontListingRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/OrderRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/PaymentRepository.java`

- [ ] **Step 1: Fix CartItem.java — swap DemandListing → StorefrontListing**

In `CartItem.java`, replace:
```java
import com.mermaid.app.domain.DemandListing;
// ...
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "listing_id", nullable = false)
private DemandListing listing;
// ...
public DemandListing getListing() { return listing; }
public void setListing(DemandListing listing) { this.listing = listing; }
```
With:
```java
import com.mermaid.app.domain.StorefrontListing;
// ...
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "listing_id", nullable = false)
private StorefrontListing listing;
// ...
public StorefrontListing getListing() { return listing; }
public void setListing(StorefrontListing listing) { this.listing = listing; }
```

- [ ] **Step 2: Add deliveryFee to StorefrontListing.java**

After the `minQtyKg` field in `StorefrontListing.java`, add:

```java
@Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
private BigDecimal deliveryFee = BigDecimal.ZERO;
```

Add getter and setter after `getMinQtyKg()` / `setMinQtyKg()`:
```java
public BigDecimal getDeliveryFee() { return deliveryFee; }
public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }
```

- [ ] **Step 3: Add deliveryFee to Order.java**

Find `backend/src/main/java/com/mermaid/app/domain/Order.java`. After `storefrontListingId` field, add:

```java
@Column(name = "delivery_fee", precision = 10, scale = 2)
private BigDecimal deliveryFee;
```

And getter/setter:
```java
public BigDecimal getDeliveryFee() { return deliveryFee; }
public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }
```

- [ ] **Step 4: Add findByIdWithLock to StorefrontListingRepository.java**

```java
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
// ...
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT s FROM StorefrontListing s WHERE s.id = :id AND s.isDeleted = false")
Optional<StorefrontListing> findByIdWithLock(@Param("id") Long id);
```

- [ ] **Step 5: Add stock + scheduler queries to OrderRepository.java**

```java
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
// ...
@Query("SELECT COALESCE(SUM(o.orderedQtyKg), 0) FROM Order o " +
       "WHERE o.storefrontListingId = :listingId " +
       "AND o.status IN ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT')")
BigDecimal sumActiveOrderedKgForStorefrontListing(@Param("listingId") Long listingId);

List<Order> findByStatusAndUpdatedAtBefore(String status, java.time.OffsetDateTime before);
```

- [ ] **Step 6: Add existsByOrderId to PaymentRepository.java**

```java
boolean existsByOrderId(Long orderId);
```

- [ ] **Step 7: Compile to verify no errors**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS with no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/CartItem.java \
        backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java \
        backend/src/main/java/com/mermaid/app/domain/Order.java \
        backend/src/main/java/com/mermaid/app/repository/StorefrontListingRepository.java \
        backend/src/main/java/com/mermaid/app/repository/OrderRepository.java \
        backend/src/main/java/com/mermaid/app/repository/PaymentRepository.java
git commit -m "feat(domain): fix CartItem FK, add deliveryFee, add repository queries for retail lifecycle"
```

---

## Task 4: InventoryService — effectiveAvailableKg

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/InventoryService.java`

- [ ] **Step 1: Add the method**

`InventoryService` already has `OrderRepository orderRepo` injected in its constructor — no change needed there. Add the method:

```java
/**
 * Physical lot stock minus kg reserved by active orders for this specific listing.
 * Use this for buyer-facing stock checks, not the raw availableKg.
 */
public BigDecimal effectiveAvailableKg(StorefrontListing listing) {
    BigDecimal physical = availableKg(listing.getVendorId(), listing.getSpeciesId());
    BigDecimal reserved = orderRepo.sumActiveOrderedKgForStorefrontListing(listing.getId());
    return physical.subtract(reserved != null ? reserved : BigDecimal.ZERO);
}
```

Import: `import com.mermaid.app.domain.StorefrontListing;`

- [ ] **Step 2: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/InventoryService.java
git commit -m "feat(service): add effectiveAvailableKg to InventoryService for stock reservation"
```

---

## Task 5: CartService — Fix Wrong Repo + Add Stock Validation

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/CartService.java`

**Context:** `CartService` currently uses `DemandListingRepository` and `DemandListing` throughout. The entire class needs to be swapped to `StorefrontListingRepository` and `StorefrontListing`. The status check changes from `DemandListingStatus.OPEN` to `StorefrontListingStatus.PUBLISHED`. Price comes from `getPricePerKg()` (not `getOfferPricePerKg()`). Stock validation is added at cart-add and cart-update.

The `reorder()` method references `DemandListing` fields (`getQuantityKg()`, `getOfferPricePerKg()`, `getStatus()`) — update to StorefrontListing equivalents (`effectiveAvailableKg`, `getPricePerKg()`, `getStatus() == PUBLISHED`).

- [ ] **Step 1: Replace all imports at top of CartService.java**

Remove:
```java
import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.repository.DemandListingRepository;
```

Add:
```java
import com.mermaid.app.domain.StorefrontListing;
import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.exception.InsufficientStockException;
import com.mermaid.app.repository.StorefrontListingRepository;
```

- [ ] **Step 2: Swap field and constructor**

Replace `DemandListingRepository listingRepo` field with `StorefrontListingRepository listingRepo`. Update constructor parameter accordingly.

- [ ] **Step 3: Update addItem()**

Replace the `DemandListing listing = listingRepo.findById(...)` lookup with:
```java
StorefrontListing listing = listingRepo.findByIdAndIsDeletedFalse(req.getListingId())
        .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + req.getListingId()));
if (listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
    throw new ListingClosedException("This listing is no longer accepting orders.");
}
```

Replace the `availableCap` logic with stock validation:
```java
BigDecimal qty = BigDecimal.valueOf(req.getQuantityKg());
if (qty.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("quantityKg must be > 0");
if (qty.compareTo(listing.getMinQtyKg()) < 0)
    throw new IllegalArgumentException("Minimum order is " + listing.getMinQtyKg() + " kg");
BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
if (qty.compareTo(effective) > 0)
    throw new InsufficientStockException("Only " + effective + " kg available");
```

For `CartItem` creation, use `listing.getPricePerKg()` instead of `listing.getOfferPricePerKg()`.

The existing merge logic (capping at `availableCap`) is replaced — just use the validated qty directly.

- [ ] **Step 4: Update updateItem()**

Replace `DemandListing listing = item.getListing()` with `StorefrontListing listing = item.getListing()`.

Replace status check:
```java
if (listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
    throw new ListingClosedException("This listing is no longer accepting orders.");
}
```

Replace the cap check with the same stock validation as addItem():
```java
if (qty.compareTo(listing.getMinQtyKg()) < 0)
    throw new IllegalArgumentException("Minimum order is " + listing.getMinQtyKg() + " kg");
BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
if (qty.compareTo(effective) > 0)
    throw new InsufficientStockException("Only " + effective + " kg available");
```

- [ ] **Step 5: Update reorder()**

In `reorder()`, the listing lookup uses `DemandListingRepository` and checks `DemandListingStatus.OPEN`. Replace with:
```java
Optional<StorefrontListing> listingOpt = listingRepo.findByIdAndIsDeletedFalse(listingId);
if (listingOpt.isEmpty()) {
    warnings.add("This listing is no longer available.");
    return new ReorderResult(getCart(buyerId), warnings);
}
StorefrontListing listing = listingOpt.get();
if (listing.getStatus() != StorefrontListingStatus.PUBLISHED) {
    warnings.add("This listing has closed and can't be re-ordered.");
    return new ReorderResult(getCart(buyerId), warnings);
}
BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
BigDecimal qty = desiredQty;
if (qty.compareTo(effective) > 0) {
    qty = effective;
    warnings.add("Quantity reduced to " + effective + "kg — the vendor has less available than your last order.");
}
```

Also note: The `reorder()` method uses `order.getDemandListingId()` to find the original listing. Since retail orders now use `storefrontListingId`, change:
```java
Long listingId = order.getStorefrontListingId();
```

For price change warning, use `listing.getPricePerKg()` instead of `listing.getOfferPricePerKg()`.

**Explicit:** Search for any remaining `getOfferPricePerKg()` calls (also in the `itemRepo.save` block at the end of `reorder()`) and replace all with `getPricePerKg()`. `StorefrontListing` has no `getOfferPricePerKg()` method — any remaining call will cause a compile error.

Remove `ItemRepo.findByCart_IdAndListing_Id` references if they depend on `DemandListing` — the `CartItemRepository` query joins on `listing_id` which now points to storefront_listings, so the query still works.

- [ ] **Step 6: Add InventoryService to CartService constructor**

`CartService` needs `InventoryService inventoryService` injected. Add it to the constructor:
```java
private final InventoryService inventoryService;

public CartService(CartRepository cartRepo, CartItemRepository itemRepo,
                   StorefrontListingRepository listingRepo, UserRepository userRepo,
                   CartMapper mapper, InventoryService inventoryService) {
    // ...
    this.inventoryService = inventoryService;
}
```

- [ ] **Step 7: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/CartService.java
git commit -m "feat(service): fix CartService to use StorefrontListing + add 2-layer stock validation"
```

---

## Task 6: BuyerOrderService — Layer 3 Validation + New Methods

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java`

**Context:** `BuyerOrderService` already uses `StorefrontListingRepository` (fixed earlier in this session). This task adds: pessimistic-lock lookup, layer-3 stock check, delivery fee snapshot, and two new methods (`confirmReceipt`, `disputeOrder`).

- [ ] **Step 1: Add new imports**

```java
import com.mermaid.app.domain.Payment;
import com.mermaid.app.exception.InsufficientStockException;
import com.mermaid.app.repository.PaymentRepository;
import java.time.OffsetDateTime;
import jakarta.persistence.LockModeType;
```

- [ ] **Step 2: Inject PaymentRepository and InventoryService**

`BuyerOrderService` already has `timelineService` (an `OrderTimelineService`) injected — use it for recording status events. Do NOT add `OrderStatusEventRepository` — that would duplicate what `timelineService` already does.

Add to constructor:
```java
private final PaymentRepository paymentRepo;
private final InventoryService inventoryService;
```

Updated constructor signature:
```java
public BuyerOrderService(OrderRepository orderRepository,
                         StorefrontListingRepository storefrontListingRepo,
                         FishSpeciesRepository fishSpeciesRepo,
                         BuyerOrderMapper buyerOrderMapper,
                         OrderTimelineService timelineService,
                         PaymentRepository paymentRepo,
                         InventoryService inventoryService) {
    this.orderRepository = orderRepository;
    this.storefrontListingRepo = storefrontListingRepo;
    this.fishSpeciesRepo = fishSpeciesRepo;
    this.buyerOrderMapper = buyerOrderMapper;
    this.timelineService = timelineService;
    this.paymentRepo = paymentRepo;
    this.inventoryService = inventoryService;
}
```

- [ ] **Step 3: Update placeOrder() — layer 3 stock check + delivery fee snapshot**

Replace:
```java
StorefrontListing listing = storefrontListingRepo.findByIdAndIsDeletedFalse(request.getListingId())
        .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));
```
With:
```java
StorefrontListing listing = storefrontListingRepo.findByIdWithLock(request.getListingId())
        .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));
```

After the status check, add:
```java
// Layer 3: re-validate stock inside this transaction with pessimistic lock
JsonNullable<Double> qtyNullable = request.getOrderedQtyKg();
if (qtyNullable != null && qtyNullable.isPresent() && qtyNullable.get() != null) {
    BigDecimal orderedQty = BigDecimal.valueOf(qtyNullable.get());
    BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
    if (orderedQty.compareTo(effective) > 0) {
        throw new InsufficientStockException("Stock changed — only " + effective + " kg available");
    }
}
```

After `order.setAgreedPricePerKg(listing.getPricePerKg())`, add:
```java
// Snapshot delivery fee (0 for PICKUP, listing fee for DELIVERY)
String dispatchMode = request.getDispatchMode().getValue();
if ("DELIVERY".equals(dispatchMode) && listing.getDeliveryFee() != null) {
    order.setDeliveryFee(listing.getDeliveryFee());
} else {
    order.setDeliveryFee(BigDecimal.ZERO);
}
```

- [ ] **Step 4: Add confirmReceipt() method**

```java
@Transactional
public com.mermaid.app.model.Order confirmReceipt(Long orderId, Long buyerId) {
    Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    if (!buyerId.equals(order.getBuyerId())) {
        throw new org.springframework.security.access.AccessDeniedException("Not your order");
    }
    if (!"AWAITING_RECEIPT".equals(order.getStatus())) {
        throw new IllegalStateException("Order is not awaiting receipt confirmation");
    }
    // Settle COD payment if pending
    paymentRepo.findByOrderId(orderId).ifPresent(payment -> {
        if ("COD".equals(payment.getMethod()) && "PENDING".equals(payment.getStatus())) {
            payment.setStatus("CONFIRMED");
            payment.setPaidAt(OffsetDateTime.now());
            paymentRepo.save(payment);
        }
    });
    order.setStatus("COMPLETED");
    order.setCompletedAt(OffsetDateTime.now());
    orderRepository.save(order);
    timelineService.recordEvent(orderId, "COMPLETED", buyerId, "Buyer confirmed receipt");
    return buyerOrderMapper.toModel(order);
}
```

- [ ] **Step 5: Add disputeOrder() method**

```java
@Transactional
public com.mermaid.app.model.Order disputeOrder(Long orderId, Long buyerId, String reason) {
    Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    if (!buyerId.equals(order.getBuyerId())) {
        throw new org.springframework.security.access.AccessDeniedException("Not your order");
    }
    if (!"AWAITING_RECEIPT".equals(order.getStatus())) {
        throw new IllegalStateException("Can only dispute an order in AWAITING_RECEIPT status");
    }
    order.setStatus("DISPUTED");
    orderRepository.save(order);
    timelineService.recordEvent(orderId, "DISPUTED", buyerId, "Buyer raised dispute: " + reason);
    return buyerOrderMapper.toModel(order);
}
```

- [ ] **Step 6: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java
git commit -m "feat(service): add layer-3 stock check, delivery fee snapshot, confirmReceipt, disputeOrder"
```

---

## Task 7: VendorOrderService — New Lifecycle Transitions

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/VendorOrderService.java`

- [ ] **Step 1: Update ALLOWED transitions map**

Replace the existing `ALLOWED` map with:
```java
private static final Map<String, Set<String>> ALLOWED = Map.of(
    "PENDING",          Set.of("CONFIRMED", "CANCELLED"),
    "CONFIRMED",        Set.of("PREPARING", "CANCELLED"),
    "PREPARING",        Set.of("READY", "OUT_FOR_DELIVERY", "CANCELLED"),
    "READY",            Set.of("COMPLETED"),
    "OUT_FOR_DELIVERY", Set.of("AWAITING_RECEIPT"),
    "AWAITING_RECEIPT", Set.of("COMPLETED", "DISPUTED"),
    "COMPLETED",        Set.of(),
    "CANCELLED",        Set.of(),
    "DISPUTED",         Set.of("COMPLETED", "CANCELLED")
);
```

Also update `BUCKET_STATUSES`:
```java
private static final Map<String, List<String>> BUCKET_STATUSES = Map.of(
    "NEW",       List.of("PENDING"),
    "CONFIRMED", List.of("CONFIRMED"),
    "PREPARING", List.of("PREPARING"),
    "READY",     List.of("READY", "OUT_FOR_DELIVERY"),
    "AWAITING",  List.of("AWAITING_RECEIPT"),
    "COMPLETED", List.of("COMPLETED"),
    "CANCELLED", List.of("CANCELLED")
);
```

And the default status list in `listInbox`:
```java
statuses = List.of("PENDING","CONFIRMED","PREPARING","READY","OUT_FOR_DELIVERY","AWAITING_RECEIPT","COMPLETED","DISPUTED","CANCELLED");
```

- [ ] **Step 2: Inject PaymentRepository**

Add the field declaration and update the constructor to include it:
```java
private final PaymentRepository paymentRepo;
```

Updated constructor (add `PaymentRepository paymentRepo` as the last parameter):
```java
public VendorOrderService(OrderRepository orderRepo,
                          OrderStatusEventRepository eventRepo,
                          InventoryService inventoryService,
                          NotificationService notificationService,
                          ApplicationEventPublisher eventPublisher,
                          UserRepository userRepo,
                          PaymentRepository paymentRepo) {
    this.orderRepo = orderRepo;
    this.eventRepo = eventRepo;
    this.inventoryService = inventoryService;
    this.notificationService = notificationService;
    this.eventPublisher = eventPublisher;
    this.userRepo = userRepo;
    this.paymentRepo = paymentRepo;
}
```

Also add the import at the top of the file:
```java
import com.mermaid.app.repository.PaymentRepository;
```

- [ ] **Step 3: Add markPreparing()**

```java
@Transactional
public Order markPreparing(Long vendorId, Long orderId) {
    return transition(vendorId, orderId, "PREPARING", "Vendor started preparing order");
}
```

- [ ] **Step 4: Add dispatch()**

```java
@Transactional
public Order dispatch(Long vendorId, Long orderId) {
    Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    if (!"DELIVERY".equals(order.getDispatchMode())) {
        throw new IllegalArgumentException("Cannot dispatch a PICKUP order");
    }
    return transition(vendorId, orderId, "OUT_FOR_DELIVERY", "Rider dispatched");
}
```

- [ ] **Step 5: Add markDelivered()**

```java
@Transactional
public Order markDelivered(Long vendorId, Long orderId, Double codAmount) {
    Order order = transition(vendorId, orderId, "AWAITING_RECEIPT", "Order delivered — awaiting buyer confirmation");
    // Create COD payment if not already paid online
    if (!paymentRepo.existsByOrderId(orderId)) {
        if (codAmount == null) {
            throw new IllegalArgumentException("codAmount is required for COD delivery orders");
        }
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPayerId(order.getBuyerId());
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(java.math.BigDecimal.valueOf(codAmount));
        payment.setMethod("COD");
        payment.setStatus("PENDING");
        paymentRepo.save(payment);
    }
    return order;
}
```

- [ ] **Step 6: Add completePickup()**

```java
@Transactional
public Order completePickup(Long vendorId, Long orderId, Double codAmount) {
    Order order = transition(vendorId, orderId, "COMPLETED", "Order picked up by buyer");
    if (!paymentRepo.existsByOrderId(orderId)) {
        if (codAmount == null) {
            throw new IllegalArgumentException("codAmount is required for COD pickup orders");
        }
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPayerId(order.getBuyerId());
        payment.setPayeeId(order.getSellerId());
        payment.setAmount(java.math.BigDecimal.valueOf(codAmount));
        payment.setMethod("COD");
        payment.setStatus("CONFIRMED");
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepo.save(payment);
    }
    if (OrderKind.RETAIL.equals(order.getKind()) && order.getStorefrontListingId() != null) {
        inventoryService.deductForOrder(orderId);
    }
    return order;
}
```

- [ ] **Step 7: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/VendorOrderService.java
git commit -m "feat(service): add new lifecycle transitions to VendorOrderService (preparing, dispatch, delivered, complete)"
```

---

## Task 8: Controllers — Wire New Endpoints

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/VendorOrdersController.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/AdminController.java`

- [ ] **Step 1: Add 4 new methods to VendorOrdersController**

The controller implements the `VendorOrdersApi` interface (generated). The new generated methods will be `vendorMarkPreparing`, `vendorDispatchOrder`, `vendorMarkDelivered`, `vendorCompleteOrder`. Add:

```java
@Override
public ResponseEntity<VendorOrderSummary> vendorMarkPreparing(Long orderId) {
    return ResponseEntity.ok(toSummary(service.markPreparing(SecurityUtils.currentUserId(), orderId)));
}

@Override
public ResponseEntity<VendorOrderSummary> vendorDispatchOrder(Long orderId) {
    return ResponseEntity.ok(toSummary(service.dispatch(SecurityUtils.currentUserId(), orderId)));
}

@Override
public ResponseEntity<VendorOrderSummary> vendorMarkDelivered(Long orderId, VendorDeliveredRequest request) {
    Double codAmount = (request != null && request.getCodAmount() != null) ? request.getCodAmount() : null;
    return ResponseEntity.ok(toSummary(service.markDelivered(SecurityUtils.currentUserId(), orderId, codAmount)));
}

@Override
public ResponseEntity<VendorOrderSummary> vendorCompleteOrder(Long orderId, VendorCompleteOrderRequest request) {
    Double codAmount = (request != null && request.getCodAmount() != null) ? request.getCodAmount() : null;
    return ResponseEntity.ok(toSummary(service.completePickup(SecurityUtils.currentUserId(), orderId, codAmount)));
}
```

Also update `toSummary()` to include `deliveryFee` and `dispatchMode`:
```java
if (order.getDeliveryFee() != null) {
    dto.setDeliveryFee(JsonNullable.of(order.getDeliveryFee().doubleValue()));
}
if (order.getDispatchMode() != null) {
    dto.setDispatchMode(JsonNullable.of(order.getDispatchMode()));
}
```

- [ ] **Step 2: Add 2 new methods to BuyerOrderController**

The controller implements `BuyerOrdersApi`. The new generated methods are `buyerConfirmReceipt` and `buyerDisputeOrder`. Add:

```java
@Override
@PreAuthorize("hasRole('BUYER')")
public ResponseEntity<Order> buyerConfirmReceipt(Long orderId) {
    return ResponseEntity.ok(buyerOrderService.confirmReceipt(orderId, SecurityUtils.currentUserId()));
}

@Override
@PreAuthorize("hasRole('BUYER')")
public ResponseEntity<Order> buyerDisputeOrder(Long orderId, BuyerDisputeRequest request) {
    return ResponseEntity.ok(buyerOrderService.disputeOrder(orderId, SecurityUtils.currentUserId(), request.getReason()));
}
```

- [ ] **Step 3: Add adminResolveDispute to AdminController**

The `AdminController` implements `AdminApi`. Add the following imports:
```java
import com.mermaid.app.domain.Order;
import com.mermaid.app.mapper.BuyerOrderMapper;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.OrderTimelineService;
import java.time.OffsetDateTime;
```

Add fields and extend the constructor:
```java
private final OrderRepository orderRepo;
private final OrderTimelineService timelineService;
private final BuyerOrderMapper buyerOrderMapper;

public AdminController(AdminUserService adminUserService,
                       AdvisoryService advisoryService,
                       FishSpeciesService fishSpeciesService,
                       MarketLocationService marketLocationService,
                       OrderRepository orderRepo,
                       OrderTimelineService timelineService,
                       BuyerOrderMapper buyerOrderMapper) {
    this.adminUserService = adminUserService;
    this.advisoryService = advisoryService;
    this.fishSpeciesService = fishSpeciesService;
    this.marketLocationService = marketLocationService;
    this.orderRepo = orderRepo;
    this.timelineService = timelineService;
    this.buyerOrderMapper = buyerOrderMapper;
}
```

Add method:
```java
@Override
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<com.mermaid.app.model.Order> adminResolveDispute(Long orderId, AdminResolveDisputeRequest request) {
    Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    if (!"DISPUTED".equals(order.getStatus())) {
        throw new IllegalArgumentException("Order is not in DISPUTED status");
    }
    String outcome = request.getOutcome().getValue(); // "COMPLETED" or "CANCELLED"
    order.setStatus(outcome);
    if ("COMPLETED".equals(outcome)) order.setCompletedAt(OffsetDateTime.now());
    orderRepo.save(order);
    // JsonNullable requires isPresent() check — getNotes() alone does not guard against undefined()
    String notes = (request.getNotes() != null && request.getNotes().isPresent())
                   ? request.getNotes().get() : "";
    timelineService.recordEvent(orderId, outcome, SecurityUtils.currentUserId(),
            "Admin resolved dispute: " + notes);
    return ResponseEntity.ok(buyerOrderMapper.toModel(order));
}
```

Also add `import com.mermaid.app.exception.ResourceNotFoundException;` if not already present in AdminController.

- [ ] **Step 4: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/VendorOrdersController.java \
        backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java \
        backend/src/main/java/com/mermaid/app/controller/AdminController.java
git commit -m "feat(controller): wire new retail lifecycle endpoints to controllers"
```

---

## Task 9: StorefrontListingService — Expose deliveryFee

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java`

- [ ] **Step 1: Accept deliveryFee in create/update**

In `createListing()`: after setting `pricePerKg`, add:
```java
if (request.getDeliveryFee() != null) {
    listing.setDeliveryFee(java.math.BigDecimal.valueOf(request.getDeliveryFee()));
}
```

In `updateListing()`: same pattern for update request.

- [ ] **Step 2: Expose deliveryFee in toSummary mapper**

Find the place where `StorefrontListingSummary` is built (likely in `StorefrontListingService` or a mapper). Add:
```java
summary.setDeliveryFee(listing.getDeliveryFee() != null ? listing.getDeliveryFee().doubleValue() : 0.0);
```

- [ ] **Step 3: Compile**

```bash
cd backend && ./mvnw compile -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java
git commit -m "feat(service): expose deliveryFee in storefront listing create/update/summary"
```

---

## Task 10: RetailOrderAutoCompleter

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/RetailOrderAutoCompleter.java`

- [ ] **Step 1: Create the file**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.Order;
import com.mermaid.app.domain.OrderStatusEvent;
import com.mermaid.app.repository.OrderRepository;
import com.mermaid.app.repository.OrderStatusEventRepository;
import com.mermaid.app.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class RetailOrderAutoCompleter {

    private static final Logger log = LoggerFactory.getLogger(RetailOrderAutoCompleter.class);

    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final OrderStatusEventRepository eventRepo;

    public RetailOrderAutoCompleter(OrderRepository orderRepo,
                                    PaymentRepository paymentRepo,
                                    OrderStatusEventRepository eventRepo) {
        this.orderRepo = orderRepo;
        this.paymentRepo = paymentRepo;
        this.eventRepo = eventRepo;
    }

    @Scheduled(fixedDelay = 3_600_000) // every hour
    @Transactional
    public void autoCompleteStaleReceipts() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(48);
        List<Order> stale = orderRepo.findByStatusAndUpdatedAtBefore("AWAITING_RECEIPT", cutoff);
        for (Order order : stale) {
            try {
                // Settle pending COD payment
                paymentRepo.findByOrderId(order.getId()).ifPresent(payment -> {
                    if ("COD".equals(payment.getMethod()) && "PENDING".equals(payment.getStatus())) {
                        payment.setStatus("CONFIRMED");
                        payment.setPaidAt(OffsetDateTime.now());
                        paymentRepo.save(payment);
                    }
                });
                order.setStatus("COMPLETED");
                order.setCompletedAt(OffsetDateTime.now());
                orderRepo.save(order);

                OrderStatusEvent event = new OrderStatusEvent();
                event.setOrderId(order.getId());
                event.setStatus("COMPLETED");
                event.setNote("Auto-completed after 48 hours — buyer did not confirm receipt");
                eventRepo.save(event);

                log.info("Auto-completed order {} after 48h receipt timeout", order.getId());
            } catch (Exception e) {
                log.warn("Auto-complete failed for order {}: {}", order.getId(), e.getMessage());
            }
        }
    }
}
```

- [ ] **Step 2: Verify @EnableScheduling is present on main app**

Check `backend/src/main/java/com/mermaid/app/MermaidApplication.java` for `@EnableScheduling`. If absent, add it.

- [ ] **Step 3: Compile**

```bash
cd backend && ./mvnw compile -q
```

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && ./mvnw test
```
Expected: Tests pass. (New code has no new tests for the scheduler itself — it's a simple timed loop that delegates to existing repos.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/RetailOrderAutoCompleter.java \
        backend/src/main/java/com/mermaid/app/MermaidApplication.java
git commit -m "feat(service): add RetailOrderAutoCompleter to auto-complete AWAITING_RECEIPT orders after 48h"
```

---

## Task 11: Frontend — API Functions

**Files:**
- Modify: `frontend/src/vendor/api/orders.js`
- Modify: `frontend/src/buyer/api/orders.js`

- [ ] **Step 1: Add vendor order API functions**

In `frontend/src/vendor/api/orders.js`, add after the existing exports:

```js
export const markPreparing  = (id)       => apiPost(`/vendor/orders/${id}/preparing`, null, {})
export const markReady      = (id)       => apiPost(`/vendor/orders/${id}/ready`, null, {})
export const dispatchRider  = (id)       => apiPost(`/vendor/orders/${id}/dispatch`, null, {})
export const markDelivered  = (id, body) => apiPost(`/vendor/orders/${id}/delivered`, null, body)
export const completePickup = (id, body) => apiPost(`/vendor/orders/${id}/complete`, null, body)
```

Note: `markReady` calls the existing `/vendor/orders/{id}/ready` endpoint (`vendorMarkOrderReady`). With the updated ALLOWED map (PREPARING → READY allowed), this endpoint handles the PREPARING → READY transition for pickup orders without any backend change.

Also update the existing `confirmOrder` line (previously sending to wrong endpoint, already fixed in session — verify it reads):
```js
export const confirmOrder = (id) => apiPost(`/vendor/orders/${id}/accept`, null, {})
```

- [ ] **Step 2: Add buyer order API functions**

In `frontend/src/buyer/api/orders.js`, add:

```js
export const confirmReceipt = (id)       => apiPost(`/buyer/orders/${id}/confirm-receipt`, null, {})
export const disputeOrder   = (id, body) => apiPost(`/buyer/orders/${id}/dispute`, null, body)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/api/orders.js frontend/src/buyer/api/orders.js
git commit -m "feat(frontend): add new retail lifecycle API functions"
```

---

## Task 12: OrderCard.jsx — New Actions + Status Handling

**Files:**
- Modify: `frontend/src/components/OrderCard.jsx`

- [ ] **Step 1: Extend getPrimaryAction()**

The current `getPrimaryAction` handles PENDING and CONFIRMED (with handoff sub-states). Replace the CONFIRMED seller block and add new status handling:

```js
// Replace the CONFIRMED seller block:
if (status === 'CONFIRMED') {
  if (viewerRole === 'SELLER') return 'MARK_PREPARING'
  return null
}
if (status === 'PREPARING') {
  if (viewerRole === 'SELLER') {
    return order.dispatchMode === 'DELIVERY' ? 'DISPATCH' : 'MARK_READY'
  }
  return null
}
if (status === 'READY') {
  if (viewerRole === 'SELLER') return 'COMPLETE_PICKUP'
  return null
}
if (status === 'OUT_FOR_DELIVERY') {
  if (viewerRole === 'SELLER') return 'MARK_DELIVERED'
  return null
}
if (status === 'AWAITING_RECEIPT') {
  if (viewerRole === 'SELLER') return 'AWAITING_BUYER_RECEIPT'
  if (viewerRole === 'BUYER')  return 'CONFIRM_RECEIPT'
  return null
}
```

- [ ] **Step 2: Extend WhosTurnBanner**

Add after existing banner cases:
```js
if (action === 'MARK_PREPARING')      return <div className="whos-turn whos-turn--yours">Your turn</div>
if (action === 'DISPATCH')            return <div className="whos-turn whos-turn--yours">Your turn</div>
if (action === 'MARK_DELIVERED')      return <div className="whos-turn whos-turn--yours">Your turn</div>
if (action === 'COMPLETE_PICKUP')     return <div className="whos-turn whos-turn--yours">Your turn</div>
if (action === 'AWAITING_BUYER_RECEIPT') return <div className="whos-turn">Waiting for buyer to confirm receipt</div>
if (order.status === 'PREPARING'   && viewerRole === 'BUYER') return <div className="whos-turn">Your order is being prepared</div>
if (order.status === 'OUT_FOR_DELIVERY' && viewerRole === 'BUYER') return <div className="whos-turn">Your order is on the way</div>
if (order.status === 'AWAITING_RECEIPT' && viewerRole === 'BUYER') return <div className="whos-turn whos-turn--yours">Your turn — confirm you received your order</div>
```

- [ ] **Step 3: Add action buttons**

In the `order-card__actions` div, add:
```jsx
{action === 'MARK_PREPARING'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('MARK_PREPARING')}>Start Packing</button>}
{action === 'MARK_READY'      && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.markReady?.(order.id))}>Ready for Pickup</button>}
{action === 'DISPATCH'        && <button className="btn btn--primary btn--sm" onClick={() => runMutation(() => mutations.dispatchRider?.(order.id))}>Rider Dispatched</button>}
{action === 'COMPLETE_PICKUP' && <button className="btn btn--primary btn--sm" onClick={() => setModal('COMPLETE_PICKUP')}>Mark Picked Up</button>}
{action === 'MARK_DELIVERED'  && <button className="btn btn--primary btn--sm" onClick={() => setModal('MARK_DELIVERED')}>Mark Delivered</button>}
{action === 'CONFIRM_RECEIPT' && <button className="btn btn--primary btn--sm" onClick={() => setModal('CONFIRM_RECEIPT')}>I Received My Order</button>}
```

- [ ] **Step 4: Wire new modals**

Add modal renders at the bottom of the component (alongside existing modals):
```jsx
{modal === 'MARK_PREPARING'  && <MarkPickedUpModal order={order} mode="PREPARING" loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.markPreparing?.(order.id))} />}
{modal === 'COMPLETE_PICKUP' && <MarkPickedUpModal order={order} mode="PICKUP" loading={submitting} onClose={() => setModal(null)} onConfirm={(body) => runMutation(() => mutations.completePickup?.(order.id, body))} />}
{modal === 'MARK_DELIVERED'  && <MarkDeliveredModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={(body) => runMutation(() => mutations.markDelivered?.(order.id, body))} />}
{modal === 'CONFIRM_RECEIPT' && <ConfirmReceiptModal order={order} loading={submitting} onClose={() => setModal(null)} onConfirm={() => runMutation(() => mutations.confirmReceipt?.(order.id))} onDispute={(body) => runMutation(() => mutations.disputeOrder?.(order.id, body))} />}
```

Add imports at top:
```jsx
import MarkPickedUpModal   from './modals/MarkPickedUpModal'
import MarkDeliveredModal  from './modals/MarkDeliveredModal'
import ConfirmReceiptModal from './modals/ConfirmReceiptModal'
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OrderCard.jsx
git commit -m "feat(frontend): extend OrderCard with new retail lifecycle actions"
```

---

## Task 13: New Modals

**Files:**
- Create: `frontend/src/components/modals/MarkPickedUpModal.jsx`
- Create: `frontend/src/components/modals/MarkDeliveredModal.jsx`
- Create: `frontend/src/components/modals/ConfirmReceiptModal.jsx`

- [ ] **Step 1: Create MarkPickedUpModal.jsx**

Used for both "Start Packing" (no cod input) and "Mark Picked Up" (cod input if COD order). The `mode` prop distinguishes them.

```jsx
// frontend/src/components/modals/MarkPickedUpModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function MarkPickedUpModal({ order, mode, onClose, onConfirm, loading }) {
  const isCOD = !order.payment && mode === 'PICKUP'
  const defaultAmount = (
    (order.orderedQtyKg ?? 0) * (order.agreedPricePerKg ?? 0) + (order.deliveryFee ?? 0)
  ).toFixed(2)
  const [codAmount, setCodAmount] = useState(defaultAmount)

  const title = mode === 'PREPARING' ? 'Start Packing' : 'Mark as Picked Up'
  const label = mode === 'PREPARING' ? 'Confirm Packing Started' : 'Mark Picked Up'

  const handleConfirm = () => {
    if (mode === 'PREPARING') { onConfirm(); return }
    onConfirm(isCOD ? { codAmount: Number(codAmount) } : {})
  }

  return (
    <CrudModal title={title} onClose={onClose} onConfirm={handleConfirm} confirmLabel={label} loading={loading}>
      {mode === 'PICKUP' && isCOD && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Cash collected (₱)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={codAmount}
            onChange={e => setCodAmount(e.target.value)}
          />
        </div>
      )}
      {mode === 'PICKUP' && !isCOD && (
        <p>Confirm the buyer has picked up their order.</p>
      )}
      {mode === 'PREPARING' && (
        <p>Confirm you have started packing this order.</p>
      )}
    </CrudModal>
  )
}
```

- [ ] **Step 2: Create MarkDeliveredModal.jsx**

```jsx
// frontend/src/components/modals/MarkDeliveredModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function MarkDeliveredModal({ order, onClose, onConfirm, loading }) {
  const isCOD = !order.payment
  const defaultAmount = (
    (order.orderedQtyKg ?? 0) * (order.agreedPricePerKg ?? 0) + (order.deliveryFee ?? 0)
  ).toFixed(2)
  const [codAmount, setCodAmount] = useState(defaultAmount)

  return (
    <CrudModal
      title="Mark as Delivered"
      onClose={onClose}
      onConfirm={() => onConfirm(isCOD ? { codAmount: Number(codAmount) } : {})}
      confirmLabel="Mark Delivered"
      loading={loading}
    >
      {isCOD ? (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Cash collected from buyer (₱)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={codAmount}
            onChange={e => setCodAmount(e.target.value)}
          />
        </div>
      ) : (
        <p>Confirm the order has been delivered to the buyer.</p>
      )}
    </CrudModal>
  )
}
```

- [ ] **Step 3: Create ConfirmReceiptModal.jsx**

```jsx
// frontend/src/components/modals/ConfirmReceiptModal.jsx
import { useState } from 'react'
import CrudModal from './CrudModal'

export default function ConfirmReceiptModal({ order, onClose, onConfirm, onDispute, loading }) {
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')

  const handleDispute = () => {
    if (reason.trim().length < 10) { setReasonErr('Please describe the issue (min 10 characters)'); return }
    onDispute({ reason: reason.trim() })
  }

  if (disputing) {
    return (
      <CrudModal
        title="Raise a Dispute"
        onClose={onClose}
        onConfirm={handleDispute}
        confirmLabel="Submit Dispute"
        loading={loading}
        confirmDanger
      >
        <p style={{ marginBottom: 8 }}>Describe what went wrong with your order:</p>
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={e => { setReason(e.target.value); setReasonErr('') }}
          placeholder="e.g. Wrong item delivered, damaged fish..."
        />
        {reasonErr && <p style={{ color: 'var(--unsafe)', fontSize: 12, marginTop: 4 }}>{reasonErr}</p>}
      </CrudModal>
    )
  }

  return (
    <CrudModal
      title="Confirm Receipt"
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="I Received My Order"
      loading={loading}
    >
      <p>Confirm you have received your order in good condition.</p>
      <button
        className="btn btn--ghost btn--sm btn--danger"
        style={{ marginTop: 12 }}
        onClick={() => setDisputing(true)}
        disabled={loading}
      >
        Something went wrong — raise a dispute
      </button>
    </CrudModal>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/modals/MarkPickedUpModal.jsx \
        frontend/src/components/modals/MarkDeliveredModal.jsx \
        frontend/src/components/modals/ConfirmReceiptModal.jsx
git commit -m "feat(frontend): add MarkPickedUpModal, MarkDeliveredModal, ConfirmReceiptModal"
```

---

## Task 14: OrdersInbox + buyer/Orders Updates

**Files:**
- Modify: `frontend/src/vendor/OrdersInbox.jsx`
- Modify: `frontend/src/buyer/Orders.jsx`

- [ ] **Step 1: Update OrdersInbox.jsx imports and mutations**

Add imports:
```js
import { markPreparing, markReady, dispatchRider, markDelivered, completePickup } from './api/orders'
```

Add to `mutations` object:
```js
markPreparing:  (id)       => markPreparing(id).then(invalidate),
markReady:      (id)       => markReady(id).then(invalidate),
dispatchRider:  (id)       => dispatchRider(id).then(invalidate),
markDelivered:  (id, body) => markDelivered(id, body).then(invalidate),
completePickup: (id, body) => completePickup(id, body).then(invalidate),
```

- [ ] **Step 2: Update buyer/Orders.jsx**

Add imports:
```js
import { confirmReceipt, disputeOrder } from './api/orders'
```

In the order row render, add status handling:
```jsx
{o.status === 'PREPARING' && (
  <span className="chip chip--caution" style={{ fontSize: 10 }}>Being prepared</span>
)}
{o.status === 'OUT_FOR_DELIVERY' && (
  <span className="chip chip--safe" style={{ fontSize: 10 }}>On the way</span>
)}
{o.status === 'AWAITING_RECEIPT' && (
  <div className="row" style={{ gap: 6 }}>
    <button className="btn btn--primary btn--sm" disabled={false}
      onClick={() => confirmReceipt(o.id).then(() => qc.invalidateQueries({ queryKey: ['buyerOrders'] }))}>
      Confirm Receipt
    </button>
    <button className="btn btn--ghost btn--sm btn--danger"
      onClick={() => {
        const reason = window.prompt('Describe the issue (min 10 chars):')
        if (reason && reason.length >= 10) {
          disputeOrder(o.id, { reason }).then(() => qc.invalidateQueries({ queryKey: ['buyerOrders'] }))
        }
      }}>
      Raise Dispute
    </button>
  </div>
)}
```

Also add `AWAITING_RECEIPT` to the active filter set:
```js
const orders = tab === 'active'
  ? all.filter(o => ['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT'].includes(o.status))
  : all
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/OrdersInbox.jsx frontend/src/buyer/Orders.jsx
git commit -m "feat(frontend): update OrdersInbox and buyer Orders for new lifecycle statuses"
```

---

## Task 15: Checkout + Marketplace + Inventory — Delivery Fee

**Files:**
- Modify: `frontend/src/buyer/Checkout.jsx`
- Modify: `frontend/src/buyer/Marketplace.jsx`
- Modify: `frontend/src/vendor/Inventory.jsx`

- [ ] **Step 1: Checkout.jsx — delivery fee line item**

In the Summary card, update the grand total calculation to include delivery fee:

```jsx
const grandTotal = groups.reduce((sum, g) => {
  const f = forms[String(g.vendor?.id)] ?? {}
  const subtotal = (g.items ?? []).reduce(
    (s, it) => s + (Number(f.qty) || 0) * (it.unitPriceSnapshot ?? 0), 0
  )
  const deliveryFee = f.dispatch === 'DELIVERY' ? (g.items?.[0]?.deliveryFee ?? 0) : 0
  return sum + subtotal + deliveryFee
}, 0)
```

In the Summary card UI, add delivery fee row per vendor when applicable:
```jsx
{g.items?.[0]?.deliveryFee > 0 && f.dispatch === 'DELIVERY' && (
  <div className="row" style={{ justifyContent: 'space-between' }}>
    <span className="muted-data">Delivery fee</span>
    <span style={{ fontFamily: 'var(--font-mono)' }}>₱{g.items[0].deliveryFee.toLocaleString()}</span>
  </div>
)}
```

In `handleSubmit`, include `deliveryFee` in the order request:
```jsx
await placeOrder({
  listingId: item.listingId ?? item.id,
  orderedQtyKg: Number(f.qty) || undefined,
  dispatchMode: f.dispatch,
  deliveryAddress: f.dispatch === 'DELIVERY' ? f.address.trim() : null,
  notes: f.notes?.trim() || null,
  // deliveryFee is snapshotted server-side from the listing — no need to send it
})
```
(The backend already snapshots `deliveryFee` from the listing — no need to send it from the frontend.)

- [ ] **Step 2: Marketplace.jsx — delivery fee badge on cards**

In the listing card body, after the price/availability row, add:
```jsx
{l.deliveryFee > 0 && f === 'DELIVERY' && (
  <span className="muted-data" style={{ fontSize: 11 }}>+ ₱{l.deliveryFee} delivery</span>
)}
```

Since dispatch mode isn't known at browse time, show badge unconditionally when `deliveryFee > 0`:
```jsx
{l.deliveryFee > 0 && (
  <span className="muted-data" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
    + ₱{l.deliveryFee} delivery fee
  </span>
)}
```

- [ ] **Step 3: Inventory.jsx — delivery fee input in ListForSaleModal**

In `ListForSaleModal`, add state:
```jsx
const [deliveryFee, setDeliveryFee] = useState('0')
```

Add form field after the description textarea:
```jsx
<div className="form-row">
  <label>Delivery fee (₱) <span className="muted-data" style={{ fontSize: 11 }}>(0 = free)</span></label>
  <input
    className="input"
    inputMode="decimal"
    value={deliveryFee}
    onChange={e => setDeliveryFee(e.target.value)}
    placeholder="0"
  />
</div>
```

Include in `onSubmit` call:
```jsx
await onSubmit({
  speciesId: lot.speciesId, title: title.trim(), pricePerKg: p,
  minQtyKg: q, description: description || null, photoUrl, lotIds: [lot.id],
  deliveryFee: Number(deliveryFee) || 0,
})
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/buyer/Checkout.jsx \
        frontend/src/buyer/Marketplace.jsx \
        frontend/src/vendor/Inventory.jsx
git commit -m "feat(frontend): add delivery fee display in Checkout, Marketplace, and Inventory listing form"
```

---

## Task 16: End-to-End Verification

- [ ] **Step 1: Start all services**

```bash
# Terminal 1
cd backend && ./mvnw spring-boot:run

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Test PICKUP flow (online payment)**

1. Log in as vendor → Inventory → List a product with delivery fee ₱50
2. Log in as buyer → Marketplace → Verify `+ ₱50 delivery fee` badge appears
3. Click "Order now" → Checkout → Dispatch = PICKUP → verify delivery fee is NOT shown for PICKUP
4. Place order → navigate to My Orders → order shows PENDING
5. Switch to vendor → Orders → Confirm order → status becomes CONFIRMED
6. Click "Start Packing" → status PREPARING
7. Click "Ready for Pickup" → status READY
8. Click "Mark Picked Up" → no COD amount needed (online paid) → status COMPLETED
9. Buyer → My Orders → order shows COMPLETED

- [ ] **Step 3: Test DELIVERY flow (COD)**

1. Buyer places order with DELIVERY mode
2. Vendor: Accept → Preparing → Dispatch Rider → status OUT_FOR_DELIVERY
3. Buyer sees "On the way" in My Orders
4. Vendor: "Mark Delivered" → enter COD amount → status AWAITING_RECEIPT
5. Buyer: "I Received My Order" → status COMPLETED
6. Verify Payment record exists with method=COD, status=CONFIRMED

- [ ] **Step 4: Test dispute flow**

1. Buyer places DELIVERY order → vendor completes delivery steps
2. In AWAITING_RECEIPT, buyer clicks "Raise Dispute" → enter reason
3. Status → DISPUTED
4. Log in as ADMIN → POST `/api/admin/orders/{id}/resolve` with `{ "outcome": "CANCELLED" }`
5. Order → CANCELLED

- [ ] **Step 5: Test stock validation**

1. Vendor has 5 kg of Alumahan listed
2. Buyer tries to add 10 kg to cart → expect 409 error "Only 5 kg available"
3. Buyer adds 4 kg to cart
4. Second buyer tries to add 4 kg → expect insufficient stock (4 already reserved)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final verification — retail order lifecycle complete"
```
