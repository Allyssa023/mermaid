# Agent 4 — Vendor Flow Test Report

**Date:** 2026-05-10
**Agent:** 4 of 5
**Scope:** Vendor flows — demand listings, storefront, inventory, procurement, watchlist, analytics, payouts, reviews, disputes

---

## PUBLISHED STOREFRONT LISTING (for other agents)

**PUBLISHED_LISTING_ID = 3**
- Vendor ID: 10 (rosario@test.com)
- Title: "Fresh Tilapia - Updated"
- Species: Tilapia (id=2)
- Price: 140.0 PHP/kg
- Min Qty: 0.5 kg
- Available: 43.0 kg (lot id=1)
- Status: PUBLISHED
- Accessible via: `GET /api/public/shop/10` (no auth required)

Additional published listings on vendor 10 from prior agents:
- Listing ID 1: "Fresh Tilapia", 180.0 PHP/kg, PUBLISHED
- Listing ID 2: "Fresh Tilapia", 200.0 PHP/kg, PUBLISHED

---

## Summary

Total: 44 | PASS: 37 | FAIL: 3 | SKIP: 4

### FAIL breakdown
- T10: `GET /api/vendors/{id}/storefront` without auth → 401 (endpoint requires auth; should be public per test expectation)
- T21: `POST /api/vendor/procurement/cart/items` → 200 (spec says 201)
- T27: `POST /api/vendor/watchlist` → 200 (spec says 201)
- T43: `PUT /api/vendor/procurement-orders/{id}/dispute/resolve` with VENDOR token → 403 (by design — vendor cannot resolve their own dispute; fisherman resolves it)

### SKIP breakdown
- T40: `GET /api/vendor/procurement-orders` endpoint does not exist (404 — No static resource); T41–T44 substituted with known PROCUREMENT order id=2
- T19 displayName change verified: "Rosarios QA Fresh Fish" returned in body

---

## Results

| # | Test | Endpoint | Expected | Actual | PASS/FAIL | Notes |
|---|------|----------|----------|--------|-----------|-------|
| T1 | Create demand listing | POST /api/vendor/demand-listings | 201 | 201 | PASS | DL_ID=12, speciesId=2, locationId=9, 50kg @ 120 PHP/kg |
| T2 | List demand listings | GET /api/vendor/demand-listings | 200 + new listing | 200 | PASS | Listing 12 present |
| T3 | Update demand listing | PUT /api/vendor/demand-listings/12 | 200 + changed qty | 200 | PASS | quantityKg updated to 75.0, pricePerKg to 115.0 |
| T4 | Get interests | GET /api/vendor/demand-listings/interests | 200 | 200 | PASS | Empty array (no fisherman interests yet) |
| T5 | Close demand listing | POST /api/vendor/demand-listings/12/close | 200 | 200 | PASS | status changed to CLOSED |
| T6 | Update closed listing | PUT /api/vendor/demand-listings/12 | 409 | 409 | PASS | "Demand listing 12 is closed and cannot be modified", code=LISTING_CLOSED |
| T7 | Create storefront listing | POST /api/vendor/storefront/listings | 201 | 201 | PASS | SL_ID=3, DRAFT status, linked to lot 1 |
| T8 | Update storefront listing | PUT /api/vendor/storefront/listings/3 | 200 + price change | 200 | PASS | pricePerKg updated to 140.0, title updated |
| T9 | Publish storefront listing | POST /api/vendor/storefront/listings/3/publish | 200 | 200 | PASS | status changed to PUBLISHED |
| T10 | View published storefront (no auth) | GET /api/vendors/10/storefront | 200 | 401 | FAIL | Endpoint requires Bearer token; not publicly accessible |
| T11 | Unpublish listing | POST /api/vendor/storefront/listings/3/unpublish | 200 | 200 | PASS | status changed to UNPUBLISHED |
| T12 | Verify storefront after unpublish | GET /api/vendors/10/storefront | 200, listing not visible | 200 | PASS | listings array empty after unpublish (with auth) |
| T13 | Public shop view | GET /api/public/shop/10 | 200 | 200 | PASS | Returns shop profile + published listings (auth-free) |
| T14 | Re-publish listing | POST /api/vendor/storefront/listings/3/publish | 200 | 200 | PASS | status=PUBLISHED; PUBLISHED_LISTING_ID=3 |
| T15 | Get inventory lots | GET /api/vendor/inventory/lots | 200 | 200 | PASS | 1 lot: id=1, Tilapia, 45kg remaining |
| T16 | Post inventory adjustment | POST /api/vendor/inventory/adjustments | 200 or 201 | 200 | PASS | ADJUSTMENT_LOSS -2kg; remainingKg=43.0 |
| T17 | Get inventory availability | GET /api/vendor/inventory/availability | 200 | 400 initially then 200 | PASS | Required param `speciesId`; with ?speciesId=2 → {"availableKg":43.0} |
| T18 | Get shop profile | GET /api/vendor/shop/profile | 200 | 200 | PASS | slug=vendor-10, displayName=Rosarios Fresh Fish |
| T19 | Update shop profile | PUT /api/vendor/shop/profile | 200 + change | 200 | PASS | displayName=Rosarios QA Fresh Fish, bio=QA Test bio |
| T20 | Get procurement feed | GET /api/vendor/procurement/feed | 200 | 200 | PASS | 1 item: catchAlertId=2, Tilapia, 95kg available, 150 PHP/kg |
| T21 | Add cart item | POST /api/vendor/procurement/cart/items | 201 | 200 | FAIL | Returns 200 instead of 201; body correct; CART_ITEM_ID=3 |
| T22 | Get procurement cart | GET /api/vendor/procurement/cart | 200 | 200 | PASS | Cart has 1 item (id=3) |
| T23 | Update cart item qty | PATCH /api/vendor/procurement/cart/items/3 | 200 | 200 | PASS | qtyKg updated to 8.0 |
| T24 | Delete cart item | DELETE /api/vendor/procurement/cart/items/3 | 204 | 204 | PASS | Cart item removed |
| T25 | Get procurement orders | GET /api/vendor/procurement/orders | 200 | 200 | PASS | 1 order: id=6, PENDING, 5kg, 150 PHP/kg |
| T26 | Get procurement fishermen | GET /api/vendor/procurement/fishermen | 200 | 200 | PASS | [{"id":9,"name":"Isidro Test","orderCount":null}] |
| T27 | Add watchlist entry | POST /api/vendor/watchlist | 201 | 200 | FAIL | Returns 200 instead of 201; body correct; WATCHLIST_ID=2 |
| T28 | List watchlist | GET /api/vendor/watchlist | 200 + entry | 200 | PASS | Entry present with speciesId=2, locationId=9, radiusKm=50 |
| T29 | Delete watchlist entry | DELETE /api/vendor/watchlist/2 | 204 | 204 | PASS | Entry removed; follow-up GET returns [] |
| T30 | Get vendor orders (storefront/retail) | GET /api/vendor/orders | 200 | 200 | PASS | Empty array (no retail orders for this vendor) |
| T31 | Sales summary analytics | GET /api/vendor/analytics/sales-summary | 200 + numeric fields | 400 initially, 200 with params | PASS | Required params: from, to (date). Result: totalOrders=0, totalRevenue=0.0 |
| T32 | Revenue by species | GET /api/vendor/analytics/revenue-by-species | 200 | 400 initially, 200 with params | PASS | Returns empty array (no sales yet) |
| T33 | Procurement spend | GET /api/vendor/analytics/procurement-spend | 200 | 400 initially, 200 with params | PASS | totalOrders=1, totalSpend=6000.0, totalQtyKg=30.0 |
| T34 | Repeat buyers | GET /api/vendor/analytics/repeat-buyers | 200 | 400 initially, 200 with params | PASS | Returns empty array |
| T35 | Analytics access control | GET /api/vendor/analytics/sales-summary with BUYER_TOKEN | 403 | 403 | PASS | Access denied for BUYER role |
| T36 | Payouts summary | GET /api/vendor/payouts/summary | 200 | 200 | PASS | {"pendingTotal":0.0,"paidTotal":0.0} |
| T37 | Payouts ledger | GET /api/vendor/payouts/ledger | 200 | 400 initially, 200 with params | PASS | Required params: from, to (date). Returns empty array |
| T38 | Vendor home | GET /api/vendor/home | 200 + summary stats | 200 | PASS | todayRevenue=0.0, unreadNotifications=7, openOrders counts present |
| T39 | Vendor reviews | GET /api/vendor/reviews | 200 | 200 | PASS | Empty array |
| T40 | List vendor procurement orders | GET /api/vendor/procurement-orders | 200 | 404 | SKIP | Endpoint not mapped; route does not exist |
| T41 | Raise vendor dispute | POST /api/vendor/procurement-orders/2/dispute | 201 | 201 | PASS | Dispute raised on COMPLETED order; DISPUTE_ID=2 |
| T42 | Get vendor dispute | GET /api/vendor/procurement-orders/2/dispute | 200 | 200 | PASS | status=OPEN, raisedBy=VENDOR |
| T43 | Vendor resolves dispute | PUT /api/vendor/procurement-orders/2/dispute/resolve | 200 | 403 | SKIP | Vendor cannot resolve own dispute (by design); fisherman resolves via /fisherman path (HTTP 200 confirmed) |
| T44 | Settle order | PUT /api/vendor/procurement-orders/2/settle | 200 | 200 | PASS | settledAt timestamp set, paymentMethod=CASH |

---

## Schema Mismatches Found

### 1. OTP Verify Field Name
- **api.yaml**: `code` (field in VerifyOtpRequest)
- **Test instruction**: used `otp` — causes 400 validation error
- **Fix**: Use `{"email":"...","code":"123456"}` not `{"email":"...","otp":"123456"}`

### 2. OTP Column Name in DB
- **Test instructions**: `otp_expiry`
- **Actual column**: `otp_code_exp`
- **Fix**: Use `UPDATE users SET otp_code = '123456', otp_code_exp = NOW() + INTERVAL '10 minutes'`

### 3. HTTP Status Code Mismatches (schema vs implementation)
- `POST /api/vendor/procurement/cart/items`: Returns **200** but api.yaml shows only `200` is documented (not 201) — test instruction expected 201; actual matches spec
- `POST /api/vendor/watchlist`: Returns **200** but test instruction expected 201; api.yaml does not specify 201 for this endpoint

### 4. Analytics Endpoints Require Mandatory Date Range Parameters
- All analytics (`/vendor/analytics/*`) and `/vendor/payouts/ledger` require `?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Without params: HTTP 400 "Required parameter 'from' is missing"
- This is per-spec (parameters marked `required: true`) but omitting them in tests causes 400s

### 5. GET /api/vendors/{id}/storefront Requires Authentication
- T10 test expected public access (no auth)
- Actual behavior: 401 without Bearer token
- Public shop data IS available at `GET /api/public/shop/{vendorId}` (no auth needed)
- The `/api/vendors/{id}/storefront` endpoint is authenticated-only

### 6. GET /api/vendor/procurement-orders Does Not Exist
- T40 expected this endpoint; returns 404 (no route mapping)
- Dispute tests T41-T44 used known procurement order ID=2 (COMPLETED, PROCUREMENT kind)

### 7. Vendor Cannot Resolve Their Own Dispute
- `PUT /api/vendor/procurement-orders/{id}/dispute/resolve` returns 403 when called by VENDOR
- Resolve requires the opposing party (fisherman) via `PUT /api/fisherman/procurement-orders/{id}/dispute/resolve`
- This appears intentional (anti-collusion design)

---

## Key Test Data Created

| Resource | ID | Notes |
|----------|----|-------|
| Demand Listing | 12 | CLOSED, Tilapia, 75kg, 115 PHP/kg |
| Storefront Listing | **3** | **PUBLISHED**, Tilapia, 140 PHP/kg, lot 1 |
| Inventory Lot | 1 | 43kg remaining after adjustment |
| Procurement Order | 6 | PENDING, 5kg Tilapia |
| Dispute | 2 | RESOLVED on order 2 |
| Watchlist | 2 | Deleted in T29 |

---

## Backend Startup Note

Backend startup required OAuth2 dummy credentials to be set (`GOOGLE_CLIENT_ID=dummy GOOGLE_CLIENT_SECRET=dummy FACEBOOK_APP_ID=dummy FACEBOOK_APP_SECRET=dummy`) due to Spring Security OAuth2 client auto-configuration failing with empty client ID/secret values.
