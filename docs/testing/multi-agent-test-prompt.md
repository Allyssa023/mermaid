# Multi-Agent Test Team Prompt — MERMAID App

## Context for all agents

You are part of a coordinated QA team testing **MERMAID** — a fisheries safety and market coordination platform. The system has three running services:

- **Backend** (Spring Boot): `http://localhost:8080/api`
- **Frontend** (React/Vite): `http://localhost:5173`
- **Marine Service** (FastAPI): `http://localhost:8081`
- **Database**: PostgreSQL `mermaid_db` on port 5432

All backend endpoints require a `Bearer <JWT>` token except:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/public/**`
- `GET /api/advisories`
- `GET /api/lookups/**`
- `GET /api/marine/**`

Admin endpoints additionally require a token with `ROLE_ADMIN` in the `roles` claim.

A **test fails** if: the HTTP status is unexpected, the response body is missing required fields, a valid action is rejected, an invalid action is not rejected, or data written in one call is not visible in subsequent reads.

---

## Shared Setup (run before any agent starts)

```
POST /api/auth/register  → create FISHERMAN user: { email: "isidro@test.com", password: "Test1234!", role: "FISHERMAN", name: "Isidro Test" }
POST /api/auth/register  → create VENDOR user:     { email: "rosario@test.com", password: "Test1234!", role: "VENDOR",    name: "Rosario Test" }
POST /api/auth/register  → create BUYER user:      { email: "buyer@test.com",   password: "Test1234!", role: "BUYER",     name: "Buyer Test" }
(Admin credentials are pre-seeded or known from environment)

Save the JWT returned by each login as:
  $FISHERMAN_TOKEN, $VENDOR_TOKEN, $BUYER_TOKEN, $ADMIN_TOKEN
```

---

## Agent 1 — Auth, Admin & Security Tester

**Scope:** Authentication flows, profile management, admin CRUD, role enforcement, security edge cases.

### Auth & Profiles
1. `POST /api/auth/register` with missing `email` → expect 400
2. `POST /api/auth/register` with duplicate email → expect 409
3. `POST /api/auth/login` with wrong password → expect 401
4. `POST /api/auth/login` with valid credentials → expect 200 + JWT
5. `GET /api/auth/profile` with valid token → expect 200 with user fields
6. `GET /api/auth/profile` with no token → expect 401
7. `POST /api/auth/forgot-password` with known email → expect 200
8. `POST /api/auth/otp/verify` with invalid OTP → expect 400 or 401
9. `POST /api/auth/complete-profile` with valid token → expect 200
10. `GET /api/fisherman/profile` with `$FISHERMAN_TOKEN` → expect 200
11. `PUT /api/fisherman/profile` with updated `boatName` → expect 200; re-GET and verify field changed
12. `PUT /api/fisherman/profile` with `$VENDOR_TOKEN` → expect 403
13. `GET /api/buyer/profile` with `$BUYER_TOKEN` → expect 200
14. `PATCH /api/buyer/profile` with updated `phone` → expect 200; verify change

### Notifications
15. `GET /api/notifications` → expect 200, list
16. `GET /api/notifications/unread-count` → expect 200, `{ count: <int> }`
17. `PUT /api/notifications/read-all` → expect 200; re-check unread-count is 0
18. `PUT /api/notifications/{notificationId}/read` with valid ID → expect 200
19. `PUT /api/notifications/{id}/read` with another user's ID → expect 403 or 404

### Admin CRUD
20. `GET /api/admin/users` with `$ADMIN_TOKEN` → expect 200
21. `POST /api/admin/users` → expect 201; save `userId`
22. `PUT /api/admin/users/{userId}` to change `role` → expect 200; verify
23. `GET /api/admin/users` with `$FISHERMAN_TOKEN` → expect 403
24. `POST /api/admin/fish-species` → expect 201; appears in `GET /api/lookups/fish-species`
25. `PUT /api/admin/fish-species/{id}` → expect 200; verify in lookup
26. `DELETE /api/admin/fish-species/{id}` (soft delete) → species absent from public lookup
27. Same soft-delete flow for `market-locations`
28. `POST /api/admin/advisories` → expect 201; save `advisoryId`
29. `PUT /api/admin/advisories/{advisoryId}` → expect 200; verify
30. `DELETE /api/admin/advisories/{advisoryId}` → expect 204; `GET` returns 404

### Security Edge Cases
31. Any non-public endpoint with no token → expect 401
32. Any endpoint with malformed JWT (`Bearer invalid.jwt.here`) → expect 401
33. Fisherman A creates trip; Fisherman B tries `GET /api/trips/{tripIdA}` → expect 403 or 404
34. Vendor A's listing: Vendor B tries `PUT /api/vendor/demand-listings/{id}` → expect 403 or 404
35. `POST /api/trips/{tripId}/catches` with `weightKg: -5` → expect 400
36. `POST /api/vendor/storefront/listings` with missing required field → expect 400
37. `GET /api/marine/conditions/{zoneId}` with SQL injection string → expect 400 or safe 404 (no stack trace)
38. Submit `POST /api/marketplace/listings/{id}/interest` twice with same user → expect 409 or existing record returned (no duplicate)

**Report:** List each test case, actual status code, PASS/FAIL, and any stack trace leaked in the response body.

---

## Agent 2 — Marine, Advisories & Reference Data Tester

**Scope:** Marine conditions, risk levels, advisories, lookup reference data, messaging, file upload.

### Marine Service
1. `GET /api/marine/conditions` → expect 200; verify `riskLevel` is one of `SAFE`, `CAUTION`, `UNSAFE`
2. `GET /api/marine/conditions/{zoneId}` with a valid zoneId → expect 200 with zone-specific data
3. `GET /api/marine/conditions/{zoneId}` with non-existent zoneId → expect 404 or 200 with default; document actual behavior
4. Call marine conditions twice within 15 minutes → second response should be identical (cache hit)

### Advisories
5. `GET /api/advisories` with no token → expect 200, list of active advisories
6. `GET /api/admin/advisories` with `$ADMIN_TOKEN` → expect 200
7. Create advisory via admin, verify it appears in public `GET /api/advisories`
8. Admin-delete the advisory; verify it disappears from public list

### Lookups
9. `GET /api/lookups/fish-species` → expect 200, non-empty list with `id` and `name`
10. `GET /api/lookups/market-locations` → expect 200, non-empty list
11. Verify species created by Agent 1 admin tests appears here
12. Verify soft-deleted species does NOT appear here

### Messaging
13. `GET /api/messages/users` with `$FISHERMAN_TOKEN` → expect 200, list of conversation partners
14. `GET /api/messages/{userId}` → expect 200, message thread (may be empty)

### File Upload
15. `POST /api/uploads` with a valid multipart image file → expect 200/201 with a URL or file ID
16. `POST /api/uploads` with an oversized or invalid file type → expect 400

### Payment Webhook
17. `POST /api/webhooks/paymongo` with a valid PayMongo test event body → expect 200
18. `POST /api/webhooks/paymongo` with an invalid/unsigned payload → expect 400 or 401

**Report:** Risk level values observed, cache behavior, public advisory consistency, webhook acceptance status.

---

## Agent 3 — Fisherman Flow Tester

**Scope:** Trip lifecycle, catch logs, catch alerts, fisherman marketplace, procurement orders, earnings, disputes.

### Trips & Catches
1. `POST /api/trips` with `$FISHERMAN_TOKEN` → expect 201; save `tripId`
2. `GET /api/trips` → expect 200, includes new trip
3. `PUT /api/trips/{tripId}` to update `destination` → expect 200; verify
4. `PUT /api/trips/{tripId}/checklist` with valid body → expect 200
5. `PUT /api/trips/{tripId}/checklist` with incomplete required items → expect 400
6. `POST /api/trips/{tripId}/catches` with `{ fishSpeciesId, weightKg, pricePerKg }` → expect 201; save `catchId`
7. `GET /api/trips/{tripId}/catches` → expect 200, includes catch
8. `PUT /api/trips/{tripId}/catches/{catchId}` to update `weightKg` → expect 200; verify
9. `PUT /api/trips/{tripId}/catches/{catchId}/settle` → expect 200
10. `DELETE /api/trips/{tripId}/catches/{catchId}` → expect 204
11. `POST /api/trips/{tripId}/end` → expect 200 (status → ENDED)
12. `POST /api/trips/{tripId}/catches` on ENDED trip → expect 409

### Catch Alerts
13. `POST /api/fisherman/catch-alerts` with species, quantity, location → expect 201; save `alertId`
14. `GET /api/fisherman/catch-alerts` → expect 200, includes alert
15. `GET /api/marketplace/catch-alerts` with `$VENDOR_TOKEN` → expect 200 (vendors see alerts)
16. `PUT /api/fisherman/catch-alerts/{alertId}/cancel` → expect 200; alert no longer active
17. `PUT /api/fisherman/catch-alerts/{alertId}/cancel` again → expect 409 or 400

### Fisherman Marketplace
18. `GET /api/marketplace/listings` → expect 200
19. `POST /api/marketplace/listings/{listingId}/interest` → expect 201
20. `GET /api/marketplace/my-interests` → expect 200, includes the interest
21. `GET /api/marketplace/offers/lookup` → expect 200

### Fisherman Procurement Orders
22. `GET /api/fisherman/procurement-orders` → expect 200
23. `POST /api/fisherman/procurement-orders/{orderId}/accept` → expect 200
24. `POST /api/fisherman/procurement-orders/{orderId}/ready` → expect 200
25. `POST /api/fisherman/procurement-orders/{orderId}/complete` → expect 200

### Disputes & Earnings
26. `POST /api/fisherman/procurement-orders/{id}/dispute` → expect 201; save disputeId
27. `GET /api/fisherman/procurement-orders/{id}/dispute` → expect 200; matches posted data
28. `PUT /api/fisherman/procurement-orders/{id}/dispute/resolve` → expect 200
29. Try resolving another user's dispute with wrong token → expect 403
30. `GET /api/fisherman/earnings/summary` → expect 200 with `{ totalEarnings, ... }`
31. `GET /api/fisherman/earnings/ledger` → expect 200, ledger entries present

**Report:** Trip ID, catch IDs, alert IDs, final trip status, dispute IDs, earnings value observed.

---

## Agent 4 — Vendor Flow Tester

**Scope:** Demand listings, storefront, inventory, shop profile, procurement feed/cart/checkout, watchlist, analytics, payouts, home dashboard, vendor disputes.

### Demand Listings
1. `POST /api/vendor/demand-listings` → expect 201; save `listingId`
2. `GET /api/vendor/demand-listings` → includes new listing
3. `PUT /api/vendor/demand-listings/{listingId}` to change `quantityKg` → expect 200; verify
4. `GET /api/vendor/demand-listings/interests` → expect 200
5. `POST /api/vendor/demand-listings/{listingId}/close` → expect 200; listing marked closed
6. Operation on a closed listing → expect 409

### Storefront
7. `POST /api/vendor/storefront/listings` with valid fish listing → expect 201; save `storefrontListingId`
8. `PUT /api/vendor/storefront/listings/{id}` to change `pricePerKg` → expect 200; verify
9. `POST /api/vendor/storefront/listings/{id}/publish` → expect 200
10. `POST /api/vendor/storefront/listings/{id}/unpublish` → expect 200
11. `DELETE /api/vendor/storefront/listings/{id}` → expect 204
12. `GET /api/vendors/{vendorId}/storefront` (public, no auth) → expect 200; only published listings visible
13. `GET /api/public/shop/{vendorId}` with no auth → expect 200

### Inventory & Shop Profile
14. `GET /api/vendor/inventory/lots` → expect 200
15. `POST /api/vendor/inventory/adjustments` → expect 200 or 201
16. `GET /api/vendor/inventory/availability` → expect 200
17. `GET /api/vendor/shop/profile` → expect 200
18. `PUT /api/vendor/shop/profile` to update `shopName` → expect 200; verify change

### Procurement Feed, Cart & Orders
19. `GET /api/vendor/procurement/feed` → expect 200, shows fisherman catch alerts
20. `POST /api/vendor/procurement/cart/items` with a valid catch-alert item → expect 201
21. `GET /api/vendor/procurement/cart` → expect 200, cart has item
22. `PATCH /api/vendor/procurement/cart/items/{itemId}` to change quantity → expect 200
23. `DELETE /api/vendor/procurement/cart/items/{itemId}` → expect 204
24. Add item back; `POST /api/vendor/procurement/checkout` → expect 200/201; save `procOrderId`
25. `GET /api/vendor/procurement/orders` → includes the order
26. `POST /api/vendor/procurement/orders/{orderId}/cancel` → expect 200
27. `POST /api/vendor/procurement/preorders` → expect 201
28. `GET /api/vendor/procurement/fishermen` → expect 200

### Watchlist
29. `POST /api/vendor/watchlist` with a fisherman ID → expect 201
30. `GET /api/vendor/watchlist` → includes the entry
31. `DELETE /api/vendor/watchlist/{id}` → expect 204

### Vendor Orders (from buyer purchases)
32. `GET /api/vendor/orders` → expect 200
33. `POST /api/vendor/orders/{orderId}/accept` → expect 200
34. `POST /api/vendor/orders/{orderId}/ready` → expect 200
35. `POST /api/vendor/orders/{orderId}/complete` → expect 200
36. `POST /api/vendor/orders/{orderId}/cancel` on a non-cancellable order → expect 409

### Disputes (vendor side)
37. `POST /api/vendor/procurement-orders/{id}/dispute` → expect 201
38. `GET /api/vendor/procurement-orders/{id}/dispute` → expect 200
39. `PUT /api/vendor/procurement-orders/{id}/dispute/resolve` → expect 200
40. `PUT /api/vendor/procurement-orders/{id}/settle` → expect 200

### Analytics & Payouts
41. `GET /api/vendor/analytics/sales-summary` → expect 200 with numeric fields
42. `GET /api/vendor/analytics/revenue-by-species` → expect 200 with species list
43. `GET /api/vendor/analytics/procurement-spend` → expect 200
44. `GET /api/vendor/analytics/repeat-buyers` → expect 200
45. Any analytics endpoint with `$BUYER_TOKEN` → expect 403
46. `GET /api/vendor/payouts/summary` → expect 200 with `{ pendingAmount, paidAmount }`
47. `GET /api/vendor/payouts/ledger` → expect 200, list (may be empty)
48. `GET /api/vendor/home` → expect 200 with summary stats

**Report:** All listing/order IDs, closed-listing rejection verified, analytics fields present and numeric, payout entry count.

---

## Agent 5 — Buyer Flow & Order Lifecycle Tester

**Scope:** Buyer marketplace, cart, favorites, addresses, checkout, orders, reviews, full order state machine, payment flow, timeline.

### Buyer Marketplace & Favorites
1. `GET /api/buyer/marketplace/listings` with `$BUYER_TOKEN` → expect 200
2. `GET /api/buyer/marketplace/listings/{listingId}` → expect 200 with listing detail
3. `POST /api/buyer/favorites` with `{ targetId, targetType }` → expect 201; save `favoriteId`
4. `GET /api/buyer/favorites` → includes new favorite
5. `DELETE /api/buyer/favorites/{favoriteId}` → expect 204
6. `DELETE /api/buyer/favorites/by-target` with query params → expect 204

### Addresses
7. `POST /api/buyer/addresses` with valid address → expect 201; save `addressId`
8. `GET /api/buyer/addresses` → expect 200
9. `PUT /api/buyer/addresses/{addressId}/default` → expect 200
10. `PATCH /api/buyer/addresses/{addressId}` to update street → expect 200; verify
11. `DELETE /api/buyer/addresses/{addressId}` → expect 204

### Cart & Checkout
12. `POST /api/buyer/cart/items` with a published vendor listing → expect 201
13. `GET /api/buyer/cart` → expect 200, cart has item
14. `PATCH /api/buyer/cart/items/{itemId}` to change quantity → expect 200
15. `DELETE /api/buyer/cart/items/{itemId}` → expect 204
16. Add item back; `POST /api/buyer/checkout` → expect 200/201; save `buyerOrderId`
17. `DELETE /api/buyer/cart` (clear all) → expect 204

### Orders & Reviews
18. `GET /api/buyer/orders` → expect 200
19. `GET /api/buyer/orders/{buyerOrderId}` → expect 200
20. `GET /api/buyer/orders/{buyerOrderId}/timeline` → expect 200
21. `POST /api/buyer/orders/{buyerOrderId}/reorder` → expect 201 or 200
22. `POST /api/buyer/orders/{buyerOrderId}/review` with `{ rating, comment }` → expect 201
23. `GET /api/buyer/orders/{buyerOrderId}/review` → expect 200; matches posted data
24. `PATCH /api/buyer/orders/{buyerOrderId}/review` to edit comment → expect 200; verify
25. `GET /api/buyer/activity` → expect 200
26. `POST /api/buyer/orders/{buyerOrderId}/payment-intent` → expect 200/201 with payment payload

### Full Order State Machine (general `/orders` flow)
27. `POST /api/orders` → expect 201; save `orderId`
28. `GET /api/orders/mine` → includes order
29. `PUT /api/orders/{orderId}/confirm` → expect 200 (status CONFIRMED)
30. `PUT /api/orders/{orderId}/cancel` → expect 200 (status CANCELLED)
31. Create a new order; `POST /api/orders/{orderId}/handoff` → expect 200
32. `PUT /api/orders/{orderId}/handoff/confirm-seller` → expect 200
33. `PUT /api/orders/{orderId}/handoff/confirm-buyer` → expect 200
34. `POST /api/orders/{orderId}/payment` → expect 200/201
35. `PUT /api/orders/{orderId}/payment/confirm` → expect 200
36. `GET /api/orders/{orderId}/timeline` → expect 200; all status transitions appear in chronological order
37. Buyer B tries `GET /api/buyer/orders/{orderIdA}` (owned by Buyer A) → expect 403 or 404

**Report:** Order IDs, review IDs, full status sequence observed per order, any transition blocked unexpectedly.

---

## Coordination Notes for the Orchestrator

- **Agent 1 runs first** — admin creates fish species and market locations used by all other agents.
- **Agent 2 runs in parallel with Agent 1** — no dependencies on other agents.
- **Agents 3, 4, and 5 run in parallel** after Agent 1 completes (need reference data and JWT tokens).
- Agent 4 must create a published storefront listing **before** Agent 5 can add it to the buyer cart; coordinate the `storefrontListingId` via shared memory or run Agent 4's storefront section first.
- Each agent outputs a structured report: test name | endpoint | expected status | actual status | PASS/FAIL | notes.
- The orchestrator aggregates all reports and flags any FAIL for human review.
