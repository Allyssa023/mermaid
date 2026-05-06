# Phase 2 — Vendor Orders Inbox

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Ship the vendor `OrdersInbox` over the existing `Order` + `OrderStatusEvent` model. Extend `orders.status` constraint and add `order_kind`. On `COMPLETED`, deduct inventory FIFO via Phase 1's `InventoryService.deductForOrder`. Introduce `useVendorPolling` hook.

**Spec reference:** §5.3 (V38), §6 Flow A, §9 Phase 2.

**Tech Stack:** Spring Boot, JPA, Flyway, React/Vite, Vitest.

---

## File Structure

### New backend files

```
backend/src/main/resources/db/migration/V38__extend_orders_status_and_kind.sql
backend/src/main/java/com/mermaid/app/domain/OrderKind.java        (enum: RETAIL, PROCUREMENT)
backend/src/main/java/com/mermaid/app/service/VendorOrderService.java
backend/src/main/java/com/mermaid/app/controller/VendorOrdersController.java
```

### Modified backend files

- `backend/src/main/resources/openapi/api.yaml` — add `/vendor/orders/**` paths.
- `backend/src/main/java/com/mermaid/app/domain/Order.java` — add `OrderKind kind` field; add `Long storefrontListingId` field if not already present from Phase 1.
- `backend/src/main/java/com/mermaid/app/service/OrderStatusService.java` (or equivalent — verify) — extend allowed transitions: `PENDING → ACCEPTED`, `ACCEPTED → READY`, `READY → COMPLETED`, `PENDING|ACCEPTED → CANCELLED`. Trigger `InventoryService.deductForOrder(orderId)` when retail order transitions to `COMPLETED`.

### New frontend files

```
frontend/src/vendor/OrdersInbox.jsx
frontend/src/vendor/api/orders.js
frontend/src/vendor/hooks/useVendorPolling.js
```

### Tests

```
backend/src/test/java/com/mermaid/app/service/VendorOrderServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorOrdersControllerTest.java
backend/src/test/java/com/mermaid/app/integration/RetailOrderLifecycleIT.java

frontend/src/vendor/__tests__/OrdersInbox.test.jsx
frontend/src/vendor/hooks/__tests__/useVendorPolling.test.js
```

---

## Task 1: Worktree + baseline

- [ ] **Step 1:** `git status` clean. Phase 1 merged to base.
- [ ] **Step 2:** Worktree branch `vendor-phase-2-orders-inbox`.
- [ ] **Step 3:** Baseline tests green.

## Task 2: V38 — extend orders status + add order_kind

**File:** `backend/src/main/resources/db/migration/V38__extend_orders_status_and_kind.sql`

- [ ] **Step 1: Migration.**

```sql
ALTER TABLE orders ADD COLUMN order_kind VARCHAR(16) NOT NULL DEFAULT 'RETAIL'
    CONSTRAINT chk_order_kind CHECK (order_kind IN ('RETAIL','PROCUREMENT'));

ALTER TABLE orders DROP CONSTRAINT chk_orders_status;
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('PENDING','CONFIRMED','ACCEPTED','READY','COMPLETED','CANCELLED','DISPUTED'));

CREATE INDEX idx_orders_seller_status_kind
    ON orders (seller_id, status, order_kind)
    WHERE status IN ('PENDING','ACCEPTED','READY');
```

- [ ] **Step 2:** Verify via `./mvnw spring-boot:run`.

## Task 3: Domain `OrderKind` + `Order.kind`

- [ ] **Step 1:** `OrderKind` enum.
- [ ] **Step 2:** Add `@Enumerated(EnumType.STRING) @Column(name="order_kind") OrderKind kind` to `Order`.

## Task 4: Status transition logic

- [ ] **Step 1:** Read existing `OrderStatusService` (or whatever service handles status today — see `OrderController` for the wiring).
- [ ] **Step 2:** Add transition table:

```java
private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
    PENDING,   Set.of(ACCEPTED, CANCELLED, CONFIRMED),
    CONFIRMED, Set.of(ACCEPTED, CANCELLED),
    ACCEPTED,  Set.of(READY, CANCELLED),
    READY,     Set.of(COMPLETED),
    COMPLETED, Set.of(),
    CANCELLED, Set.of(),
    DISPUTED,  Set.of()
);
```

- [ ] **Step 3:** On `→ COMPLETED` and `kind == RETAIL`: call `inventoryService.deductForOrder(orderId)` inside the same transaction. (Procurement-side `addLotFromProcurement` lands in Phase 3; safe to add the dispatch now guarded by `kind==RETAIL`.)
- [ ] **Step 4:** Append `OrderStatusEvent` row on every transition (existing pattern from V30).
- [ ] **Step 5:** Send `Notification(type="ORDER_STATUS_CHANGED")` to buyer on every status change (use `NotificationService.create` from Phase 1).

## Task 5: `VendorOrderService`

**File:** `backend/src/main/java/com/mermaid/app/service/VendorOrderService.java`

- [ ] **Step 1: Methods.**
  - `listInbox(vendorId, statusBucket, kindFilter)` — bucket = `NEW (PENDING)`, `PREPARING (ACCEPTED)`, `READY`, `COMPLETED`, `CANCELLED`. Query `orders WHERE seller_id = :v` filter by status set.
  - `accept(vendorId, orderId)` — vendor scoping; transition PENDING|CONFIRMED → ACCEPTED.
  - `markReady(vendorId, orderId)` — ACCEPTED → READY.
  - `complete(vendorId, orderId)` — READY → COMPLETED (triggers inventory deduct via OrderStatusService).
  - `cancel(vendorId, orderId, reason)` — PENDING|ACCEPTED → CANCELLED.
- [ ] **Step 2:** Vendor scoping: assert `order.sellerId == vendorId` else 403 (throw `AccessDeniedException` for `@PreAuthorize` mapping or rely on Spring Security at controller level).

## Task 6: `api.yaml` — `/vendor/orders/**`

- [ ] Paths:
  - `GET /vendor/orders?bucket=NEW|PREPARING|READY|COMPLETED|CANCELLED&kind=RETAIL|PROCUREMENT`
  - `POST /vendor/orders/{id}/accept`
  - `POST /vendor/orders/{id}/ready`
  - `POST /vendor/orders/{id}/complete`
  - `POST /vendor/orders/{id}/cancel` (body: reason)
- [ ] Schemas: `VendorOrderSummary` (id, buyerName, speciesName, qtyKg, totalPrice, status, createdAt), `VendorOrderDetail` (adds storefront_listing snapshot, status events).
- [ ] Regenerate.

## Task 7: `VendorOrdersController`

- [ ] Implement generated interface; `@PreAuthorize("hasRole('VENDOR')")`.

## Task 8: `useVendorPolling` hook

**File:** `frontend/src/vendor/hooks/useVendorPolling.js`

- [ ] **Step 1: Behavior.** `useVendorPolling(fetcher, { intervalMs = 15000 })`:
  - calls `fetcher()` immediately and on interval.
  - exposes `{ data, error, loading, isStale, refetch }`.
  - exponential backoff on consecutive failures: 15s → 30s → 60s (cap).
  - `isStale = true` after 2 consecutive failures.
  - cleanup on unmount.
  - skip ticking when document hidden (`document.visibilityState === 'hidden'`); resume on visibility change.

```js
import { useEffect, useRef, useState, useCallback } from 'react'

export function useVendorPolling(fetcher, { intervalMs = 15000 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const failsRef = useRef(0)
  const timerRef = useRef(null)

  const tick = useCallback(async () => {
    try {
      const result = await fetcher()
      setData(result); setError(null); setIsStale(false); failsRef.current = 0
    } catch (e) {
      failsRef.current += 1
      setError(e)
      if (failsRef.current >= 2) setIsStale(true)
    } finally { setLoading(false) }
  }, [fetcher])

  useEffect(() => {
    let stopped = false
    const schedule = () => {
      const delay = Math.min(intervalMs * 2 ** Math.max(0, failsRef.current - 1), 60000)
      timerRef.current = setTimeout(async () => {
        if (stopped || document.visibilityState === 'hidden') { schedule(); return }
        await tick(); if (!stopped) schedule()
      }, delay)
    }
    tick().then(() => { if (!stopped) schedule() })
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { stopped = true; clearTimeout(timerRef.current); document.removeEventListener('visibilitychange', onVis) }
  }, [tick, intervalMs])

  return { data, error, loading, isStale, refetch: tick }
}
```

## Task 9: `OrdersInbox.jsx`

**File:** `frontend/src/vendor/OrdersInbox.jsx`

- [ ] **Step 1: Layout.** Tabs: `New / Preparing / Ready / Completed / Cancelled`. Counts per tab from same payload (group client-side).
- [ ] **Step 2: Row.** Buyer name, species, qty, total, time-ago, status badge, action button matching state:
  - NEW (PENDING) → `Accept` + `Cancel`.
  - PREPARING (ACCEPTED) → `Mark Ready` + `Cancel`.
  - READY → `Complete`.
  - COMPLETED/CANCELLED → no action; show timeline modal.
- [ ] **Step 3:** Use `useVendorPolling(() => ordersApi.listInbox(currentBucket))` with 15s interval.
- [ ] **Step 4:** Stale indicator banner when `isStale`.

## Task 10: Wire vendor route

- [ ] `<Route path="orders" element={<OrdersInbox />} />` in `vendor/VendorDashboard.jsx`.

## Task 11: Tests

- [ ] **Step 1:** `VendorOrderServiceTest` — happy path each transition; reject illegal transitions (e.g., PENDING → READY); vendor scoping (other vendor's order → 403); cancel from READY rejected.
- [ ] **Step 2:** `VendorOrdersControllerTest` — JWT roles `["ROLE_VENDOR"]`, 401/403/200 paths.
- [ ] **Step 3:** `RetailOrderLifecycleIT` — create vendor + lot + storefront listing (Phase 1 setup); buyer creates order; vendor accept→ready→complete; assert inventory drained FIFO; assert storefront listing → SOLD_OUT when total drained; assert `OrderStatusEvent` rows for every transition.
- [ ] **Step 4:** `OrdersInbox.test.jsx` — render with mocked API; tab counts; action button enablement matches status.
- [ ] **Step 5:** `useVendorPolling.test.js` — fakeTimers; advance through 2 failures → `isStale === true`; success resets counter; cleanup clears timer.

## Task 12: Manual QA

- [ ] Buyer creates an order against the Phase 1 storefront listing.
- [ ] Vendor sees it in `New`; Accept → moves to `Preparing`; Mark Ready → `Ready`; Complete → `Completed` and Inventory page shows reduced `remaining_kg`.
- [ ] Cancel from `New` → buyer notification fires; inventory unchanged.

## Task 13: Verify + commit

- [ ] All tests green. `superpowers:verification-before-completion`.
- [ ] Commit:
  ```
  feat(vendor): phase 2 — orders inbox

  - V38: extend orders.status (+ACCEPTED, +READY) and add order_kind
  - VendorOrderService transitions PENDING→ACCEPTED→READY→COMPLETED
  - On retail COMPLETED → InventoryService.deductForOrder (FIFO, row-locked)
  - useVendorPolling hook with backoff + stale indicator
  - OrdersInbox.jsx: tabbed inbox

  Spec: §9 Phase 2
  ```

## Exit criteria

- [ ] End-to-end retail order from buyer to vendor `COMPLETED` drains the lot FIFO.
- [ ] `RetailOrderLifecycleIT` green.
- [ ] Illegal transitions rejected (verified by service test).
- [ ] OrdersInbox renders correct action buttons per status.
