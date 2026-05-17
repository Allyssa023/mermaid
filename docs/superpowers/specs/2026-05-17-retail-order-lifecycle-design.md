# Retail Order Lifecycle (Vendor → Buyer) Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat PENDING → CONFIRMED → COMPLETED retail order lifecycle with a GrabFood-inspired multi-step flow that supports COD and online payment, delivery fee per listing, and three-layer stock validation.

**Architecture:** New statuses added to the existing `Order` entity (stored as VARCHAR — no enum constraint). `CartItem` FK migrated from `demand_listings` to `storefront_listings`. All new vendor transitions go through `VendorOrderService`; new buyer receipt confirmation goes through `BuyerOrderService`. `OrderCard.jsx` extended to drive the full lifecycle on both sides.

**Tech Stack:** Spring Boot (Java), React/Vite, PostgreSQL/Flyway, TanStack Query v5, existing `VendorOrderService` / `BuyerOrderService` / `CartService` / `InventoryService`.

---

## Context

### Current problems
1. Lifecycle is too coarse (PENDING → CONFIRMED → COMPLETED) — no packing or dispatch steps.
2. `CartItem` is JPA-linked to `DemandListing` (fisherman procurement table), not `StorefrontListing` — buyer cart is broken for retail orders.
3. No stock check at cart-add or checkout — buyers can add/order far more than available stock.
4. No delivery fee support.

### What we are NOT changing
- The fisherman-vendor procurement order flow (`OrderKind.PROCUREMENT`) — `OrderService`, `HandoffConfirmation`, `/orders/{id}/handoff` endpoints, and `OrderController` remain untouched.
- Xendit payment capture at checkout — payment is already taken upfront for online orders.
- Automatic refunds on cancellation — out of scope for this spec. Cancelled online-payment orders are flagged in the timeline but no Xendit reversal is triggered in this iteration.

### Existing field: `dispatchMode`
`Order.dispatchMode` (VARCHAR) already exists on the `orders` table and is populated at order placement from `BuyerPlaceOrderRequest.dispatchMode` (values: `PICKUP`, `DELIVERY`). No migration needed for this field.

---

## Status Machine

```
PENDING
  ├─ vendor accepts          → CONFIRMED
  ├─ buyer cancels           → CANCELLED   (buyer can cancel from PENDING only)
  └─ vendor cancels          → CANCELLED

CONFIRMED
  ├─ vendor starts packing   → PREPARING
  └─ vendor cancels          → CANCELLED   (buyer CANNOT cancel from CONFIRMED onward)

PREPARING
  ├─ pickup mode             → READY
  ├─ delivery mode           → OUT_FOR_DELIVERY
  └─ vendor cancels          → CANCELLED   (last vendor cancel point)

READY                        (pickup only)
  └─ vendor: "Picked up"     → COMPLETED
     (COD: codAmount required; creates Payment inline)

OUT_FOR_DELIVERY             (delivery only)
  └─ vendor: "Delivered"     → AWAITING_RECEIPT
     (COD: codAmount required; creates Payment(PENDING) inline)

AWAITING_RECEIPT             (delivery only)
  ├─ buyer: "I received it"  → COMPLETED   (COD: Payment set to CONFIRMED)
  ├─ buyer: "Raise dispute"  → DISPUTED
  └─ auto-complete 48 h      → COMPLETED   (COD: Payment set to CONFIRMED)

DISPUTED
  └─ admin: resolve          → COMPLETED or CANCELLED   (admin-only endpoint, see below)

COMPLETED / CANCELLED  — terminal
```

### Cancellation rules (explicit)

| Actor  | From status     | Allowed? |
|--------|-----------------|----------|
| Buyer  | PENDING         | ✅ Yes |
| Buyer  | CONFIRMED+      | ❌ No — must contact vendor |
| Vendor | PENDING         | ✅ Yes |
| Vendor | CONFIRMED       | ✅ Yes |
| Vendor | PREPARING+      | ❌ No — order is in progress |
| Admin  | Any non-terminal | ✅ Yes via dispute resolution |

### DISPUTED resolution (Admin)
Add one admin endpoint: `POST /admin/orders/{id}/resolve` with body `{ outcome: "COMPLETED" | "CANCELLED", notes }`.
- If COMPLETED: order status → COMPLETED, no Payment created (resolution handled offline).
- If CANCELLED: order status → CANCELLED.
This keeps DISPUTED from being a dead-end.

### Online payment + cancellation
When a vendor or buyer cancels a PENDING or CONFIRMED order that was paid via Xendit, the service records a timeline event `"CANCELLED_PENDING_REFUND"` as a note on the CANCELLED status event. No automatic Xendit reversal in this iteration — refund processing is manual/out-of-scope.

---

## Delivery Fee

- Stored per `StorefrontListing` as `delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0`.
- Vendor sets it in the listing creation/edit form alongside price and photo.
- Snapshotted onto `Order.delivery_fee` at placement time (locked even if vendor later changes it).
- Only applied when `dispatchMode = DELIVERY`. For PICKUP, delivery fee is always 0.
- Shown at checkout as a separate line item; included in grand total sent to Xendit.
- Shown as a `+ ₱X delivery` badge on marketplace listing cards when `deliveryFee > 0`.

---

## Stock Validation (3 Layers)

### Effective available stock formula
```
effectiveAvailableKg(listingId, vendorId, speciesId)
  = inventoryService.availableKg(vendorId, speciesId)          -- from lot remainingKg
  − orderRepo.sumActiveOrderedKgForStorefrontListing(listingId) -- reserved by live orders
```

**Active statuses for reservation:** `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `AWAITING_RECEIPT`.

### New `OrderRepository` query
```java
@Query("SELECT COALESCE(SUM(o.orderedQtyKg), 0) FROM Order o " +
       "WHERE o.storefrontListingId = :listingId " +
       "AND o.status IN ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT')")
BigDecimal sumActiveOrderedKgForStorefrontListing(@Param("listingId") Long listingId);
```
Add index in migration: `CREATE INDEX idx_orders_storefront_listing_status ON orders(storefront_listing_id, status);`

### Layer 1 — Cart add (`CartService.addItem`)
```java
BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
if (qty.compareTo(listing.getMinQtyKg()) < 0)
    throw new IllegalArgumentException("Minimum order is " + listing.getMinQtyKg() + "kg");
if (qty.compareTo(effective) > 0)
    throw new InsufficientStockException("Only " + effective + "kg available");
```

### Layer 2 — Cart update (`CartService.updateItem`)
Same checks as Layer 1.

### Layer 3 — Order placement (`BuyerOrderService.placeOrder`, inside `@Transactional`)
Use a pessimistic read lock on the listing row to prevent concurrent checkouts from both passing the stock check simultaneously:
```java
StorefrontListing listing = storefrontListingRepo.findByIdWithLock(listingId)
    .orElseThrow(...);
// findByIdWithLock uses @Lock(LockModeType.PESSIMISTIC_WRITE)
BigDecimal effective = inventoryService.effectiveAvailableKg(listing);
if (orderedQty.compareTo(effective) > 0)
    throw new InsufficientStockException("Stock changed — only " + effective + "kg available");
```
New `StorefrontListingRepository` query:
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT s FROM StorefrontListing s WHERE s.id = :id AND s.isDeleted = false")
Optional<StorefrontListing> findByIdWithLock(@Param("id") Long id);
```

---

## COD Payment Flow

### Validation rule — codAmount
- If `dispatchMode = DELIVERY` and vendor calls `/delivered` without `codAmount`: **reject 400** `"codAmount is required for COD delivery orders"` — but only if the order was NOT paid online (i.e. no Xendit Payment record exists for this order). If Xendit already captured payment, `codAmount` is ignored.
- If `dispatchMode = PICKUP` and vendor calls `/complete` without `codAmount`: same rule.
- Default: check `paymentRepo.existsByOrderId(orderId)` first; if exists → online payment, skip COD creation.

### Idempotency
Add `UNIQUE` constraint on `payments.order_id`:
```sql
ALTER TABLE payments ADD CONSTRAINT uq_payments_order UNIQUE (order_id);
```
This prevents duplicate Payment rows if `/delivered` or `/complete` is retried.

### Pickup COD — `/complete`
```
vendor calls POST /vendor/orders/{id}/complete { codAmount: 250.00 }
→ transition READY → COMPLETED
→ if !paymentRepo.existsByOrderId(id):
    create Payment(orderId, method=COD, amount=codAmount, status=CONFIRMED, paidAt=now)
→ record timeline event COMPLETED
```

### Delivery COD — `/delivered` + `confirmReceipt`
```
vendor calls POST /vendor/orders/{id}/delivered { codAmount: 250.00 }
→ transition OUT_FOR_DELIVERY → AWAITING_RECEIPT
→ if !paymentRepo.existsByOrderId(id):
    create Payment(orderId, method=COD, amount=codAmount, status=PENDING)
→ record timeline event AWAITING_RECEIPT

buyer calls POST /buyer/orders/{id}/confirm-receipt
→ transition AWAITING_RECEIPT → COMPLETED
→ if Payment exists with method=COD and status=PENDING:
    payment.setStatus(CONFIRMED); payment.setPaidAt(now); paymentRepo.save(payment)
→ record timeline event COMPLETED
```

### Auto-complete COD settlement (48h scheduler)
Same as buyer confirm-receipt: if Payment exists with COD/PENDING, set to CONFIRMED before marking COMPLETED.

---

## Database Migrations

Current highest migration version is **V58**. Use V59–V62.

### Migration V59 — Fix orders status constraint
The existing `chk_orders_status` constraint (added in V38) only allows:
`PENDING, CONFIRMED, ACCEPTED, READY, COMPLETED, CANCELLED, DISPUTED`.
The new statuses `PREPARING`, `OUT_FOR_DELIVERY`, `AWAITING_RECEIPT` will be rejected at the DB level without this migration.

```sql
-- Drop existing status constraint and index that reference old statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
DROP INDEX IF EXISTS idx_orders_seller_status_kind;

-- Replace with expanded constraint
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN (
        'PENDING','CONFIRMED','PREPARING',
        'READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT',
        'COMPLETED','CANCELLED','DISPUTED'
    ));

-- Recreate index with new statuses
CREATE INDEX idx_orders_seller_status_kind
    ON orders (seller_id, status, order_kind)
    WHERE status IN ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','AWAITING_RECEIPT');
```

### Migration V60 — Fix cart_items FK
```sql
-- Clear existing cart items (they reference demand_listing IDs which are invalid for storefront)
DELETE FROM cart_items;

-- Drop old FK
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_listing_id;

-- Add correct FK to storefront_listings
ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_storefront_listing
    FOREIGN KEY (listing_id) REFERENCES storefront_listings(id);
```

### Migration V61 — Delivery fee columns + stock query index
```sql
ALTER TABLE storefront_listings
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);

-- Index for effectiveAvailableKg stock validation query
CREATE INDEX IF NOT EXISTS idx_orders_storefront_listing_status
    ON orders(storefront_listing_id, status);
```

### Migration V62 — Payment idempotency constraint
```sql
ALTER TABLE payments ADD CONSTRAINT uq_payments_order UNIQUE (order_id);
```

---

## api.yaml Changes

### New request body schemas (add to `components/schemas`)

```yaml
VendorCompleteOrderRequest:
  type: object
  properties:
    codAmount:
      type: number
      format: double
      description: "Cash collected. Required for COD orders, ignored for online-paid orders."

VendorDeliveredRequest:
  type: object
  properties:
    codAmount:
      type: number
      format: double

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

### New vendor endpoints (add under `/vendor/orders/{orderId}`)
```yaml
/vendor/orders/{orderId}/preparing:
  post:
    operationId: vendorMarkPreparing
    # no request body
    responses:
      '200': { schema: VendorOrderSummary }

/vendor/orders/{orderId}/dispatch:
  post:
    operationId: vendorDispatchOrder
    # no request body
    responses:
      '200': { schema: VendorOrderSummary }

/vendor/orders/{orderId}/delivered:
  post:
    operationId: vendorMarkDelivered
    requestBody: { schema: VendorDeliveredRequest }
    responses:
      '200': { schema: VendorOrderSummary }

/vendor/orders/{orderId}/complete:
  post:
    operationId: vendorCompleteOrder
    requestBody: { schema: VendorCompleteOrderRequest }
    responses:
      '200': { schema: VendorOrderSummary }
```

### New buyer endpoints
```yaml
/buyer/orders/{orderId}/confirm-receipt:
  post:
    operationId: buyerConfirmReceipt
    # no request body
    responses:
      '200': { $ref: BuyerOrderSummary }

/buyer/orders/{orderId}/dispute:
  post:
    operationId: buyerDisputeOrder
    requestBody: { schema: BuyerDisputeRequest }
    responses:
      '200': { $ref: BuyerOrderSummary }
```

### New admin endpoint
```yaml
/admin/orders/{orderId}/resolve:
  post:
    operationId: adminResolveDispute
    security: ADMIN role
    requestBody: { schema: AdminResolveDisputeRequest }
    responses:
      '200': { $ref: OrderSummary }
```

### Schema additions to existing models
- `StorefrontListingSummary`: add `deliveryFee: number` (format: double)
- `StorefrontListingCreateRequest` / update request: add `deliveryFee: number` (optional, default 0)
- `VendorOrderSummary`: add `deliveryFee: number`, `dispatchMode: string`
- `BuyerOrderSummary` (or Order model): add `deliveryFee: number`
- Order status values: document as free-form string — do NOT use an enum in api.yaml for order status; use `type: string` with an `x-enum-values` extension comment listing all valid values: `PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, AWAITING_RECEIPT, COMPLETED, CANCELLED, DISPUTED`.

---

## Backend — Files and Changes

| File | Change |
|------|--------|
| `resources/openapi/api.yaml` | All schema + endpoint additions above |
| `domain/CartItem.java` | `@ManyToOne` → `StorefrontListing` (field type + JoinColumn) |
| `domain/StorefrontListing.java` | Add `deliveryFee` BigDecimal field + getter/setter |
| `repository/StorefrontListingRepository.java` | Add `findByIdWithLock` (PESSIMISTIC_WRITE) |
| `repository/OrderRepository.java` | Add `sumActiveOrderedKgForStorefrontListing` JPQL |
| `service/InventoryService.java` | Add `effectiveAvailableKg(StorefrontListing)` public method |
| `service/CartService.java` | Swap `DemandListingRepository → StorefrontListingRepository`; all `DemandListing → StorefrontListing`; status check `== PUBLISHED`; price from `getPricePerKg()`; add Layer 1 + 2 stock validation |
| `service/BuyerOrderService.java` | Use `findByIdWithLock`; Layer 3 stock check; snapshot `deliveryFee`; new `confirmReceipt` + `disputeOrder` methods with COD payment settlement |
| `service/VendorOrderService.java` | Updated ALLOWED map; new `markPreparing`, `dispatch`, `markDelivered(codAmount)`, `completePickup(codAmount)` methods with inline COD payment creation |
| `controller/VendorOrdersController.java` | Four new `@PostMapping` methods wired to new service methods |
| `controller/BuyerOrderController.java` | Two new `@PostMapping` methods; role guard `hasRole('BUYER')` |
| `controller/AdminOrderController.java` | New controller (or add to existing admin controller): `resolveDispute` endpoint with `hasRole('ADMIN')` |
| `service/StorefrontListingService.java` | Expose `deliveryFee` on `StorefrontListingSummary` in marketplace response; accept `deliveryFee` in create/update requests |
| `service/RetailOrderAutoCompleter.java` | NEW — see below |

### `RetailOrderAutoCompleter.java` specification
```java
@Component
@EnableScheduling  // or rely on top-level @EnableScheduling in main app
public class RetailOrderAutoCompleter {

    private final OrderRepository orderRepo;
    private final PaymentRepository paymentRepo;
    private final OrderStatusEventRepository eventRepo;

    @Scheduled(fixedDelay = 3_600_000)  // every hour
    @Transactional
    public void autoCompleteStaleReceipts() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(48);
        // Query: find orders with status=AWAITING_RECEIPT and updatedAt < cutoff
        List<Order> stale = orderRepo.findByStatusAndUpdatedAtBefore("AWAITING_RECEIPT", cutoff);
        for (Order order : stale) {
            try {
                // Settle COD payment if pending
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
                // Record timeline event
                OrderStatusEvent event = new OrderStatusEvent();
                event.setOrderId(order.getId());
                event.setStatus("COMPLETED");
                event.setNote("Auto-completed after 48 hours — buyer did not respond");
                eventRepo.save(event);
            } catch (Exception e) {
                log.warn("Auto-complete failed for order {}: {}", order.getId(), e.getMessage());
                // Continue to next order — do not roll back entire batch
            }
        }
    }
}
```

Add to `OrderRepository`:
```java
List<Order> findByStatusAndUpdatedAtBefore(String status, OffsetDateTime before);
```

---

## Frontend — Files and Changes

### `vendor/api/orders.js`
```js
export const markPreparing  = (id)       => apiPost(`/vendor/orders/${id}/preparing`, null, {})
export const dispatchRider  = (id)       => apiPost(`/vendor/orders/${id}/dispatch`, null, {})
export const markDelivered  = (id, body) => apiPost(`/vendor/orders/${id}/delivered`, null, body)
export const completePickup = (id, body) => apiPost(`/vendor/orders/${id}/complete`, null, body)
```

### `buyer/api/orders.js`
```js
export const confirmReceipt = (id)       => apiPost(`/buyer/orders/${id}/confirm-receipt`, null, {})
export const disputeOrder   = (id, body) => apiPost(`/buyer/orders/${id}/dispute`, null, body)
```

### `OrderCard.jsx` — `getPrimaryAction()` additions

| Status | SELLER action | BUYER action |
|--------|---------------|--------------|
| CONFIRMED | `MARK_PREPARING` | — |
| PREPARING + pickup | `MARK_READY` | — |
| PREPARING + delivery | `DISPATCH` | — |
| READY | `COMPLETE_PICKUP` | — |
| OUT_FOR_DELIVERY | `MARK_DELIVERED` | — |
| AWAITING_RECEIPT | `AWAITING_BUYER_RECEIPT` (banner) | `CONFIRM_RECEIPT` |

`WhosTurnBanner` additions:
- PREPARING/BUYER → "Your order is being prepared"
- OUT_FOR_DELIVERY/BUYER → "Your order is on the way"
- AWAITING_RECEIPT/BUYER → "Your turn — confirm you received your order"
- AWAITING_RECEIPT/SELLER → "Waiting for buyer to confirm receipt"

### New modals

**`MarkPickedUpModal.jsx`** — for COMPLETE_PICKUP action:
- If order was paid online (check `order.payment?.method !== 'COD'` or presence of existing payment): simple one-tap "Mark as Picked Up" button, no amount input.
- If COD: show amount input pre-filled with `order.orderedQtyKg * order.agreedPricePerKg + order.deliveryFee`. Required before confirming. Calls `mutations.completePickup(order.id, { codAmount })`.

**`MarkDeliveredModal.jsx`** — for MARK_DELIVERED action:
- Same pattern as MarkPickedUpModal but calls `mutations.markDelivered(order.id, { codAmount })`.

**`ConfirmReceiptModal.jsx`** — for CONFIRM_RECEIPT action (buyer):
- One-tap "I received my order" confirm button.
- Below: "Something wrong? Raise a dispute" ghost-danger link that calls `mutations.disputeOrder`.
- Dispute reason textarea appears inline when link is clicked; submit calls `mutations.disputeOrder(order.id, { reason })`.

### `vendor/OrdersInbox.jsx`
Add to `mutations`:
```js
markPreparing:  (id)       => markPreparing(id).then(invalidate),
dispatchRider:  (id)       => dispatchRider(id).then(invalidate),
markDelivered:  (id, body) => markDelivered(id, body).then(invalidate),
completePickup: (id, body) => completePickup(id, body).then(invalidate),
```

### `buyer/Orders.jsx`
Add status handling:
- PREPARING → info chip "Being prepared"
- OUT_FOR_DELIVERY → info chip "On the way"
- AWAITING_RECEIPT → primary button "Confirm Receipt" + ghost-danger button "Raise Dispute"

### `buyer/Checkout.jsx`
When `dispatchMode === 'DELIVERY'` and `listing.deliveryFee > 0`:
```
Subtotal:         ₱480
Delivery fee:      ₱50
────────────────────────
Grand total:      ₱530
```
Send `deliveryFee` in the order placement request so the backend snapshots it.

### `buyer/Marketplace.jsx`
On listing cards, when `l.deliveryFee > 0`:
```
₱280/kg   [5 kg]   [+ ₱50 delivery]
```

### `vendor/Inventory.jsx` (`ListForSaleModal`)
Add to listing creation form:
```
Delivery fee (₱):  [0    ]   (0 = free delivery)
```
Optional field, defaults to 0. Passed in `createListing` body as `deliveryFee`.

---

## Notifications

Publish `OrderStatusChangeEvent` on every transition — existing `NotificationEventListener` pushes to `/user/queue/notifications` for both buyer and seller. No new notification infrastructure needed.
