# Phase 6 — Analytics + Payouts (Stub) + Repeat-Buyer Insights + Home

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Read-only analytics over orders + inventory; stub payouts ledger summing completed-order revenue; repeat-buyer aggregate; vendor `Home.jsx` composing today-glance tiles.

**Spec reference:** §5.1 (`AnalyticsService`), §5.4 (`Home`, `Analytics`, `Payouts`), §9 Phase 6.

---

## File Structure

### New backend files

```
backend/src/main/java/com/mermaid/app/service/AnalyticsService.java
backend/src/main/java/com/mermaid/app/service/PayoutsService.java
backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java
backend/src/main/java/com/mermaid/app/controller/VendorPayoutsController.java
backend/src/main/java/com/mermaid/app/controller/VendorHomeController.java
```

### Modified backend files

- `api.yaml` — `/vendor/analytics/**`, `/vendor/payouts/**`, `/vendor/home`.

### New frontend files

```
frontend/src/vendor/Home.jsx
frontend/src/vendor/Analytics.jsx
frontend/src/vendor/Payouts.jsx
frontend/src/vendor/api/analytics.js
frontend/src/vendor/api/payouts.js
frontend/src/vendor/api/home.js
frontend/src/vendor/components/StatTile.jsx
```

(Charts: use a lightweight library — `recharts` if not already in package.json, or roll simple SVG bars/lines. Decision: **use recharts** if present in buyer codebase; otherwise stick to plain SVG to avoid a dep.)

### Tests

```
backend/src/test/java/com/mermaid/app/service/AnalyticsServiceTest.java
backend/src/test/java/com/mermaid/app/service/PayoutsServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorAnalyticsControllerTest.java
backend/src/test/java/com/mermaid/app/controller/VendorPayoutsControllerTest.java

frontend/src/vendor/__tests__/Home.test.jsx
frontend/src/vendor/__tests__/Analytics.test.jsx
frontend/src/vendor/__tests__/Payouts.test.jsx
```

---

## Task 1: Worktree + baseline

- [ ] Branch `vendor-phase-6-analytics-payouts`. Phase 5 merged.

## Task 2: `AnalyticsService`

```java
public interface AnalyticsService {
    SalesSummary salesSummary(Long vendorId, LocalDate from, LocalDate to);
    List<RevenueBySpecies> revenueBySpecies(Long vendorId, LocalDate from, LocalDate to);
    ProcurementSpend procurementSpend(Long vendorId, LocalDate from, LocalDate to);
    List<RepeatBuyer> repeatBuyers(Long vendorId, LocalDate from, LocalDate to, int minOrders);
}
```

- [ ] **Step 1: Range guard.** Reject `to - from > 365 days` with `IllegalArgumentException` (→ 400 via `GlobalExceptionHandler`).
- [ ] **Step 2: SalesSummary.** Aggregate `orders` where `seller_id=:v AND kind='RETAIL' AND status='COMPLETED' AND completed_at BETWEEN :from AND :to`:
  - totalOrders, totalRevenue, totalQtyKg, avgOrderValue, uniqueBuyers.
- [ ] **Step 3: RevenueBySpecies.** GROUP BY species_id; left-join `fish_species` for name.
- [ ] **Step 4: ProcurementSpend.** Same pattern but `buyer_id=:v AND kind='PROCUREMENT'`.
- [ ] **Step 5: RepeatBuyers.** SQL:
  ```sql
  SELECT buyer_id, count(*) AS order_count, sum(total_price) AS total_spent,
         max(completed_at) AS last_order
  FROM orders
  WHERE seller_id = :v AND kind = 'RETAIL' AND status = 'COMPLETED'
    AND completed_at BETWEEN :from AND :to
  GROUP BY buyer_id
  HAVING count(*) >= :minOrders
  ORDER BY order_count DESC, total_spent DESC
  LIMIT 50
  ```
- [ ] **Step 6: Caching (lightweight).** In-memory `ConcurrentHashMap<CacheKey, CachedValue>` with 5-min TTL keyed by `(vendorId, query, from, to)`. Invalidated on:
  - Order completion (hook `OrderStatusService` → `analyticsService.invalidateForVendor(sellerId)` and `invalidateForVendor(buyerId)` for procurement spend).
  - Inventory movement write (only if used by analytics — deferred; not needed for Phase 6 metrics).

  *Note:* if caching adds risk, ship without it; spec calls it "in-memory, per-vendor key". Recommendation: ship without cache for Phase 6, add later if dashboard load is slow.

## Task 3: `PayoutsService`

Stub ledger: completed retail orders → expected payout. No payment-rail integration.

```java
public interface PayoutsService {
    PayoutSummary summary(Long vendorId);                        // pending + paid totals (paid is always 0 in stub)
    List<PayoutLedgerEntry> ledger(Long vendorId, LocalDate from, LocalDate to);  // one entry per completed retail order
}
```

- [ ] Each ledger entry: `orderId, completedAt, buyerName, speciesName, qtyKg, gross, fees=0, net=gross, status='PENDING_PAYOUT'`.
- [ ] No DB writes; pure read.

## Task 4: `VendorHomeController` + endpoint composition

`GET /vendor/home` returns single composite payload to avoid 5 round-trips on dashboard load:

```json
{
  "todayRevenue": 0,
  "openOrders": { "new": 2, "preparing": 1, "ready": 0 },
  "lowStockSpecies": [{ "speciesId": 1, "speciesName": "Tuna", "availableKg": 3.5 }],
  "recentMatchedAlerts": [{ "catchAlertId": 12, "speciesName": "Mackerel", "createdAt": "...", "fishermanName": "..." }],
  "unreadNotifications": 4
}
```

- [ ] Implement as a thin orchestrator that calls existing services (`InventoryService.lowStockAlerts`, `WatchlistService.vendorsMatching` reverse / recent CATCH_ALERT_NEW notifications, `VendorOrderService.listInbox` per bucket, `AnalyticsService.salesSummary` for today range, `NotificationService.getUnreadCount`).

## Task 5: `api.yaml`

- `GET /vendor/analytics/sales-summary?from=&to=`
- `GET /vendor/analytics/revenue-by-species?from=&to=`
- `GET /vendor/analytics/procurement-spend?from=&to=`
- `GET /vendor/analytics/repeat-buyers?from=&to=&minOrders=`
- `GET /vendor/payouts/summary`
- `GET /vendor/payouts/ledger?from=&to=`
- `GET /vendor/home`
- Regenerate.

## Task 6: Controllers

- [ ] All `@PreAuthorize("hasRole('VENDOR')")`. Resolve vendorId from principal.

## Task 7: `Home.jsx`

- [ ] Tiles using `StatTile` component:
  - Today's revenue.
  - Open orders by bucket (with deep-link to `/vendor/orders?bucket=NEW`).
  - Low-stock chips (deep-link to `/vendor/inventory`).
  - Recent matched CatchAlerts (deep-link to `/vendor/procurement`).
  - Unread notifications.
- [ ] Use `useVendorPolling` (30s).

## Task 8: `Analytics.jsx`

- [ ] **Step 1:** Date-range picker (default last 30d, max 365d).
- [ ] **Step 2: Charts:**
  - Revenue line chart over the range (bucket by day).
  - Bar chart: revenue by species.
  - Bar chart: procurement spend by species (separate panel).
  - Repeat-buyer table.
- [ ] **Step 3:** If using `recharts` and not yet a dep, prefer plain SVG (one inline `<svg>` per chart with simple paths) to keep the diff small.

## Task 9: `Payouts.jsx`

- [ ] Summary tile (pending payout total, paid=0). Disclaimer text "Stub — payouts are not yet processed automatically."
- [ ] Ledger table — order id, date, buyer, species, qty, gross, status badge `PENDING_PAYOUT`.

## Task 10: Wire routes

- [ ] `<Route index element={<Home />} />` (replace Phase 0 placeholder Home).
- [ ] `<Route path="analytics" element={<Analytics />} />`
- [ ] `<Route path="payouts" element={<Payouts />} />`

## Task 11: Tests

- [ ] **`AnalyticsServiceTest`** — fixture: 5 completed orders across 2 buyers, 2 species, 30d window. Assert sales summary numbers, repeat-buyer roster (buyer with ≥minOrders), revenue-by-species sums. Range > 365d → 400 (test exception).
- [ ] **`PayoutsServiceTest`** — 3 completed orders → 3 ledger entries; cancelled order excluded; sum matches summary.pending.
- [ ] **`VendorAnalyticsControllerTest`**, **`VendorPayoutsControllerTest`** — JWT roles + 401/403/200 paths; query param validation (400 on bad date).
- [ ] **`Home.test.jsx`** — render with mocked `/vendor/home` payload; tiles render expected counts; deep-links present.
- [ ] **`Analytics.test.jsx`** — date range > 365d disables submit / shows error.
- [ ] **`Payouts.test.jsx`** — ledger table renders; disclaimer present.

## Task 12: Manual QA

- [ ] Seed (or run through Phases 1-3) until there's at least 5 completed retail orders and a few procurement orders across multiple species and buyers.
- [ ] Vendor → Home: tiles populate; deep-links navigate correctly.
- [ ] Vendor → Analytics: charts match raw data (spot-check one species' revenue against `SELECT sum(total_price) FROM orders WHERE …` query).
- [ ] Vendor → Payouts: summary matches sum of ledger entries.
- [ ] Date range 366d → 400 with toast message.

## Task 13: Verify + commit

- [ ] All tests green. `superpowers:verification-before-completion`.
- [ ] Commit:
  ```
  feat(vendor): phase 6 — analytics + payouts (stub) + home

  - AnalyticsService (sales summary, revenue-by-species, procurement spend, repeat buyers)
  - PayoutsService stub ledger (pending payouts only, no payment-rail)
  - GET /vendor/home composite endpoint (avoid round-trips)
  - Home.jsx tiles, Analytics.jsx charts, Payouts.jsx ledger
  - 365-day range cap → 400

  Spec: §9 Phase 6
  ```

## Exit criteria

- [ ] Analytics charts reconcile with raw order data (spot-check passes).
- [ ] Payouts ledger sums match completed-order revenue.
- [ ] 365-day range cap enforced (verified by service test).
- [ ] Vendor `Home.jsx` populates with real data and deep-links navigate to the source pages.
- [ ] No new payment integrations (stub only).
