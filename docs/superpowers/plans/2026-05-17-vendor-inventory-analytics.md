# Vendor Inventory Auto-Population & Analytics Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two vendor-side issues: (1) auto-populate vendor inventory when a fisherman→vendor procurement order completes, replacing the manual "Receive lot" button; (2) fix the Analytics page crash caused by the procurement-spend endpoint returning a single object instead of a per-species array.

**Architecture:** Tag fisherman→vendor orders as `PROCUREMENT` kind at creation time so analytics and inventory hooks can distinguish them from buyer→vendor `RETAIL` orders. The `InventoryService.addLotFromProcurement()` already exists — wire it into the order-completion path. Fix the analytics backend to group spend by species and return a list, matching what the frontend already expects.

**Tech Stack:** Spring Boot (Java 21), JPA/Hibernate, OpenAPI-first (api.yaml → generate-sources), React/Vite (TanStack Query v5)

---

## File Map

| File | Change |
|------|--------|
| `backend/src/main/java/com/mermaid/app/service/OrderService.java` | Set kind=PROCUREMENT for catchAlert orders; inject InventoryService; call addLotFromProcurement on completion |
| `backend/src/main/java/com/mermaid/app/service/InventoryService.java` | Inject HandoffConfirmationRepository; update addLotFromProcurement to use handoff's actual qty/price |
| `backend/src/main/java/com/mermaid/app/service/AnalyticsService.java` | Change procurementSpend() to return List grouped by species |
| `backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java` | Update vendorProcurementSpend to return List<ProcurementSpend> |
| `backend/src/main/resources/openapi/api.yaml` | Add speciesId/speciesName to ProcurementSpend schema; change endpoint response to array |
| `frontend/src/vendor/Inventory.jsx` | Remove "Receive lot" button, receiveOpen state, ReceiveLotModal, RECEIVE_REASONS |

---

## Task 1: Tag fisherman→vendor orders as PROCUREMENT kind

**Why:** `Order.kind` defaults to `RETAIL`. The analytics query `findCompletedByBuyerAndKindInRange(vendorId, PROCUREMENT, ...)` and the inventory hook both need kind=PROCUREMENT to identify these orders. Without this, the procurement spend chart is always empty and inventory auto-fill would trigger on retail orders too.

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/OrderService.java`

- [ ] **Step 1: Open OrderService.java and locate the `create()` method (around line 73)**

- [ ] **Step 2: After `order.setSellerId(sellerId)` (line 97), add the kind assignment**

```java
// Inside the catchAlertId branch, after setSellerId:
order.setKind(com.mermaid.app.domain.OrderKind.PROCUREMENT);
```

The full block should look like:
```java
if (req.getCatchAlertId() != null && req.getCatchAlertId().isPresent() && req.getCatchAlertId().get() != null) {
    final Long alertId = req.getCatchAlertId().get();
    catchAlertId = alertId;
    CatchAlert alert = alertRepo.findById(alertId)
        .orElseThrow(() -> new ResourceNotFoundException("CatchAlert not found: " + alertId));
    sellerId = alert.getFishermanId();
} else {
    throw new IllegalArgumentException("catchAlertId is required to create an order.");
}

// ... then later:
order.setBuyerId(vendorId);
order.setSellerId(sellerId);
order.setCatchAlertId(catchAlertId);
order.setKind(OrderKind.PROCUREMENT);   // ← ADD THIS
```

Import is already available via `com.mermaid.app.domain.OrderKind` — add `import com.mermaid.app.domain.OrderKind;` at the top of the file if not present.

- [ ] **Step 3: Verify build compiles**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/OrderService.java
git commit -m "fix(orders): tag fisherman→vendor orders as PROCUREMENT kind"
```

---

## Task 2: Fix InventoryService to use handoff quantities

**Why:** `addLotFromProcurement()` currently uses `order.getOrderedQtyKg()` and `order.getAgreedPricePerKg()`. The handoff records the actual delivered qty (`actualQtyKg`) and settled price (`finalPricePerKg`) — these are more accurate for the inventory lot. The handoff is always confirmed before payment, so it will always exist when this method is called.

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/InventoryService.java`

- [ ] **Step 1: Add HandoffConfirmationRepository to InventoryService**

Add field and constructor parameter:
```java
private final HandoffConfirmationRepository handoffRepo;

// Update constructor signature to include it:
public InventoryService(InventoryLotRepository lotRepo,
                        InventoryMovementRepository moveRepo,
                        NotificationService notifications,
                        StorefrontListingRepository listingRepo,
                        StorefrontListingLotRepository listingLotRepo,
                        OrderRepository orderRepo,
                        FishSpeciesRepository speciesRepo,
                        NotificationRepository notificationRepo,
                        HandoffConfirmationRepository handoffRepo) {  // ← ADD
    // ... existing assignments ...
    this.handoffRepo = handoffRepo;  // ← ADD
}
```

Add the import at the top:
```java
import com.mermaid.app.repository.HandoffConfirmationRepository;
import com.mermaid.app.domain.HandoffConfirmation;
```

- [ ] **Step 2: Update addLotFromProcurement() to use handoff values**

Replace the existing method body:
```java
@Transactional
public InventoryLot addLotFromProcurement(Long orderId) {
    Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

    HandoffConfirmation handoff = handoffRepo.findByOrderId(orderId).orElse(null);
    BigDecimal qty   = (handoff != null && handoff.getActualQtyKg() != null)
            ? handoff.getActualQtyKg()
            : order.getOrderedQtyKg();
    BigDecimal price = (handoff != null && handoff.getFinalPricePerKg() != null)
            ? handoff.getFinalPricePerKg()
            : order.getAgreedPricePerKg();

    InventoryLot lot = new InventoryLot();
    lot.setVendorId(order.getBuyerId());
    lot.setSpeciesId(order.getSpecies().getId());
    lot.setSourceProcurementOrderId(orderId);
    lot.setInitialKg(qty);
    lot.setRemainingKg(qty);
    lot.setCostPerKg(price);
    lot = lotRepo.save(lot);

    InventoryMovement movement = new InventoryMovement();
    movement.setLotId(lot.getId());
    movement.setDeltaKg(qty);
    movement.setReason(MovementReason.PROCUREMENT_RECEIVED);
    movement.setRefOrderId(orderId);
    moveRepo.save(movement);

    return lot;
}
```

- [ ] **Step 3: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/InventoryService.java
git commit -m "fix(inventory): use handoff actual qty/price when creating lot from procurement"
```

---

## Task 3: Wire inventory auto-population into order completion

**Why:** `InventoryService.addLotFromProcurement()` exists but is never called. When a PROCUREMENT order completes (payment confirmed), the fish should automatically appear in the vendor's inventory.

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/OrderService.java`

- [ ] **Step 1: Inject InventoryService into OrderService**

Add field and constructor parameter in `OrderService.java`:
```java
private final InventoryService inventoryService;

// Update constructor:
public OrderService(OrderRepository orderRepo,
                    CatchAlertRepository alertRepo,
                    FishSpeciesRepository speciesRepo,
                    HandoffConfirmationRepository handoffRepo,
                    PaymentRepository paymentRepo,
                    UserRepository userRepo,
                    CatchLogRepository catchLogRepo,
                    OrderMapper mapper,
                    OrderStatusEventRepository eventRepo,
                    ApplicationEventPublisher eventPublisher,
                    InventoryService inventoryService) {   // ← ADD
    // ... existing assignments ...
    this.inventoryService = inventoryService;   // ← ADD
}
```

Add import:
```java
import com.mermaid.app.service.InventoryService;
```

- [ ] **Step 2: Call addLotFromProcurement in completeOrderOnPaymentConfirmed()**

In the existing `completeOrderOnPaymentConfirmed()` method, after `orderRepo.save(order)`, add the inventory call:

```java
@Transactional
public void completeOrderOnPaymentConfirmed(Long orderId) {
    if (orderId == null) return;
    orderRepo.findById(orderId).ifPresent(order -> {
        if ("CONFIRMED".equals(order.getStatus())) {
            order.setStatus("COMPLETED");
            order.setCompletedAt(OffsetDateTime.now());
            paymentRepo.findByOrderId(orderId).ifPresent(p ->
                order.setPaymentMethod(p.getMethod()));
            orderRepo.save(order);
            recordStatusEvent(order.getId(), "COMPLETED", null, "Payment confirmed — order complete");

            // Auto-populate vendor inventory for procurement orders
            if (OrderKind.PROCUREMENT.equals(order.getKind())) {
                try {
                    inventoryService.addLotFromProcurement(orderId);
                } catch (Exception e) {
                    log.warn("Failed to create inventory lot for order {}: {}", orderId, e.getMessage());
                }
            }
        }
    });
}
```

The `try/catch` is intentional: inventory creation failing should not roll back the order completion.

- [ ] **Step 3: Compile**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/OrderService.java
git commit -m "feat(inventory): auto-populate vendor inventory when procurement order completes"
```

---

## Task 4: Fix analytics — api.yaml schema and endpoint

**Why:** The `vendorProcurementSpend` endpoint returns `ProcurementSpend` (a single aggregate object). The frontend calls `.map()` on the response expecting `ProcurementSpend[]` with per-species entries — this causes the crash. We need to change the schema to include `speciesId`/`speciesName` and the endpoint response to be an array.

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Update ProcurementSpend schema (around line 7138)**

Replace the existing `ProcurementSpend` schema block:
```yaml
    ProcurementSpend:
      type: object
      required: [speciesId, speciesName, totalOrders, totalSpend, totalQtyKg]
      properties:
        speciesId:
          type: integer
          format: int64
        speciesName:
          type: string
        totalOrders:
          type: integer
        totalSpend:
          type: number
          format: double
        totalQtyKg:
          type: number
          format: double
```

- [ ] **Step 2: Change vendorProcurementSpend endpoint response to array (around line 1834)**

Replace the `responses.200.content` block:
```yaml
      responses:
        '200':
          description: Procurement spend by species
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ProcurementSpend'
```

- [ ] **Step 3: Regenerate OpenAPI interfaces and DTOs**

```bash
cd backend && ./mvnw generate-sources -q
```
Expected: BUILD SUCCESS. The generated `ProcurementSpend` class now has `speciesId`, `speciesName` fields, and `VendorAnalyticsApi` interface changes return type to `List<ProcurementSpend>`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "fix(analytics): change procurement-spend endpoint to return array by species"
```

---

## Task 5: Fix analytics — backend service and controller

**Why:** The service still computes an aggregate; the controller still maps to a single DTO. Both need updating to match the new array contract.

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/AnalyticsService.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java`

- [ ] **Step 1: Update AnalyticsService.procurementSpend() to return a list grouped by species**

Replace the existing `procurementSpend()` method:
```java
@Transactional(readOnly = true)
public List<Map<String, Object>> procurementSpend(Long vendorId, LocalDate from, LocalDate to) {
    validateRange(from, to);
    List<Order> orders = orderRepo.findCompletedByBuyerAndKindInRange(
            vendorId, OrderKind.PROCUREMENT, startOf(from), endOf(to));

    Map<Long, List<Order>> bySpecies = orders.stream()
            .collect(Collectors.groupingBy(o -> o.getSpecies() != null ? o.getSpecies().getId() : -1L));

    List<Map<String, Object>> result = new ArrayList<>();
    bySpecies.forEach((speciesId, ords) -> {
        if (speciesId < 0) return;
        String name = ords.get(0).getSpecies().getCommonName();
        BigDecimal spend = ords.stream()
                .filter(o -> o.getOrderedQtyKg() != null && o.getAgreedPricePerKg() != null)
                .map(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal qty = ords.stream()
                .filter(o -> o.getOrderedQtyKg() != null)
                .map(Order::getOrderedQtyKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("speciesId", speciesId);
        entry.put("speciesName", name);
        entry.put("totalOrders", ords.size());
        entry.put("totalSpend", spend.doubleValue());
        entry.put("totalQtyKg", qty.doubleValue());
        result.add(entry);
    });
    result.sort(Comparator.<Map<String, Object>, Double>
            comparing(m -> -(Double) m.get("totalSpend")));
    return result;
}
```

Update the return type declaration from `Map<String, Object>` to `List<Map<String, Object>>`.

- [ ] **Step 2: Update VendorAnalyticsController.vendorProcurementSpend()**

Replace the existing `vendorProcurementSpend` method:
```java
@Override
public ResponseEntity<List<ProcurementSpend>> vendorProcurementSpend(LocalDate from, LocalDate to) {
    Long vendorId = SecurityUtils.currentUserId();
    List<Map<String, Object>> data = analyticsService.procurementSpend(vendorId, from, to);
    List<ProcurementSpend> dtos = data.stream().map(m -> {
        ProcurementSpend dto = new ProcurementSpend(
            ((Number) m.get("speciesId")).longValue(),
            (String) m.get("speciesName"),
            ((Number) m.get("totalOrders")).intValue(),
            ((Number) m.get("totalSpend")).doubleValue(),
            ((Number) m.get("totalQtyKg")).doubleValue()
        );
        return dto;
    }).toList();
    return ResponseEntity.ok(dtos);
}
```

Note: `ProcurementSpend` constructor arg order follows the `required` array order in the schema: `[speciesId, speciesName, totalOrders, totalSpend, totalQtyKg]`.

- [ ] **Step 3: Build and run tests**

```bash
cd backend && ./mvnw test -Dtest=VendorOrdersControllerTest,CatchLogControllerTest -q
```
Expected: Tests pass.

Full build:
```bash
cd backend && ./mvnw clean package -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AnalyticsService.java \
        backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java
git commit -m "fix(analytics): return procurement spend as per-species array"
```

---

## Task 6: Frontend — remove manual "Receive lot" from Inventory

**Why:** Inventory is now auto-populated from completed procurement orders. The manual "Receive lot" workflow was a workaround and is no longer needed. Leaving it would let vendors create duplicate/phantom lots.

**Files:**
- Modify: `frontend/src/vendor/Inventory.jsx`

- [ ] **Step 1: Remove RECEIVE_REASONS, receiveOpen state, and the "Receive lot" button**

In `Inventory.jsx`:

1. Delete `const RECEIVE_REASONS = ['RECEIVED']` (line 11)
2. Delete `const [receiveOpen, setReceive] = useState(false)` (line 16)
3. Delete the `<button className="btn btn--primary" onClick={() => setReceive(true)}>...</button>` from the `page__head` div (line 39)
4. Delete the entire `{receiveOpen && <ReceiveLotModal ... />}` block (lines 101–121)
5. Delete the entire `function ReceiveLotModal(...)` component (lines 178–228)

The `page__head` should become:
```jsx
<div className="page__head">
  <div>
    <div className="eyebrow">Inventory</div>
    <h1 className="page__title" style={{marginTop: 4}}>Your <em>lots</em></h1>
    <p className="page__sub">Every batch received from fishermen, with remaining weight and cost basis.</p>
  </div>
</div>
```

Update the subtitle to clarify lots come from fisherman orders (good for UX).

- [ ] **Step 2: Verify the empty-state message makes sense**

The current empty state says "Receive your first lot to track inventory." Update it to:
```jsx
<div className="empty">
  <div className="empty__title">No inventory yet</div>
  <p>Inventory is added automatically when procurement orders are completed.</p>
</div>
```

- [ ] **Step 3: Verify no broken imports**

`recordAdjustment` is still used by `AdjustLotModal` — keep that import. Only `RECEIVE_REASONS` constant and `ReceiveLotModal` are being removed. The `listLots`, `recordAdjustment`, and `fetchSpecies` imports remain.

- [ ] **Step 4: Verify in browser**

Start the frontend dev server and navigate to Vendor → Inventory. Confirm:
- No "Receive lot" button visible
- Table renders (or empty state with updated message)
- "Adjust" button still opens the AdjustLotModal

```bash
cd frontend && npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/Inventory.jsx
git commit -m "feat(inventory): remove manual receive-lot; inventory now auto-filled from orders"
```

---

## Task 7: Verify analytics page no longer crashes

- [ ] **Step 1: Start backend and frontend**

```bash
# Terminal 1
cd backend && ./mvnw spring-boot:run

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Log in as a vendor and navigate to Analytics**

Confirm:
- Page renders without crash
- "Procurement spend" card shows a bar chart (or empty state if no orders yet — both are valid)
- No `bySpend.map is not a function` error in console

- [ ] **Step 3: Final commit if any last fixes**

```bash
git add -A
git commit -m "chore: final vendor analytics and inventory fixes"
```
