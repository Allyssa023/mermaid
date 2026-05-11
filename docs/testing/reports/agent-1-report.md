# Agent 1 — Auth, Admin & Security Test Report

**Date:** 2026-05-10  
**Tester:** Agent 1 (QA Automation)  
**Backend:** http://localhost:8080/api  
**Branch:** vendor-modernization

---

## Summary

Total: 36 | PASS: 33 | FAIL: 3 | SKIP: 0

---

## Results

| # | Test | Endpoint | Expected | Actual | Status | Notes |
|---|------|----------|----------|--------|--------|-------|
| T1 | Register with missing email | POST /auth/register | 400 | 400 | PASS | Correct status, but response includes full Java stack trace in `trace` field — information leakage (see Stack Traces section) |
| T2 | Register duplicate email | POST /auth/register | 409 | 409 | PASS | Clean error: `"Email already registered: isidro@test.com"` |
| T3 | Login with wrong password | POST /auth/login | 401 | 401 | PASS | Correct rejection |
| T4 | GET /auth/profile with FISHERMAN_TOKEN | GET /auth/profile | 200 with user fields | 200 | PASS | Returns `id`, `fullName`, `email`, `role`, `createdAt` |
| T5 | GET /auth/profile with no token | GET /auth/profile | 401 | 401 | PASS | Correct rejection |
| T6 | POST /auth/forgot-password | POST /auth/forgot-password | 200 | 200 | PASS | Always returns `"If that email exists, a reset link has been sent."` — correct enumeration-safe response |
| T7 | OTP verify with wrong code | POST /auth/otp/verify | 400 or 401 | 401 | PASS | Returns `"Invalid or expired code."` |
| T8 | GET /fisherman/profile | GET /fisherman/profile | 200 | 200 | PASS | Returns `fullName`, `email`, `vesselName`, `landingSite`, `emergencyContactName`, `emergencyContactPhone` |
| T9 | PUT /fisherman/profile with valid update | PUT /fisherman/profile | 200; verify updated | 200 | PASS | `vesselName`, `landingSite`, `emergencyContactName`, `emergencyContactPhone` all updated and verified on re-GET |
| T10 | PUT /fisherman/profile with VENDOR_TOKEN | PUT /fisherman/profile | 403 | 403 | PASS | Role-based access enforced |
| T11 | GET /buyer/profile | GET /buyer/profile | 200 | 200 | PASS | Returns `id`, `fullName`, `email`, `role`, `avatarUrl`, `totalOrders`, `totalReviews`, `totalFavorites`, `memberSince` |
| T12 | PATCH /buyer/profile with valid update | PATCH /buyer/profile | 200; verify updated | 200 | PASS | `fullName` updated to `"Buyer Updated Name"` — verified on re-GET |
| T13 | GET /notifications | GET /notifications | 200 | 200 | PASS | Returns notification array with `id`, `type`, `title`, `body`, `createdAt`, `link`, `readAt` |
| T14 | GET /notifications/unread-count | GET /notifications/unread-count | 200 with count field | 200 `{"count":1}` | PASS | Correct field name `count` present |
| T15 | PUT /notifications/read-all | PUT /notifications/read-all | 200; unread-count = 0 | 200; count became 0 | PASS | All notifications marked read; verified with re-GET |
| T16 | PUT /notifications/{id}/read | PUT /notifications/14/read | 200 | 200 | PASS | Individual notification marked read |
| T17 | Cross-user notification read (wrong token) | PUT /notifications/14/read | 403 or 404 | 404 | PASS | User B cannot read User A's notification — returns 404 (ownership enforced via user scoping) |
| T18 | GET /admin/users with ADMIN_TOKEN | GET /admin/users | 200 | 200 | PASS | Returns 18 users |
| T19 | POST /admin/users (create user) | POST /admin/users | 201; save userId | 201, userId=20 | PASS | User created with `id`, `fullName`, `email`, `role`, `active` |
| T20 | PUT /admin/users/{userId} (change role) | PUT /admin/users/20 | 200; role updated | 200, role=FISHERMAN | PASS | Role changed from VENDOR to FISHERMAN; verified in response |
| T21 | GET /admin/users with FISHERMAN_TOKEN | GET /admin/users | 403 | 403 | PASS | Non-admin access rejected |
| T22 | POST /admin/fish-species | POST /admin/fish-species | 201; verify in GET /lookups/fish-species | 201, id=11 | PASS | Species `"QA Test Fish"` created and confirmed in public lookup |
| T23 | PUT /admin/fish-species/{speciesId} | PUT /admin/fish-species/11 | 200; verify in lookup | 200 | PASS | `commonName` updated to `"QA Test Fish Updated"` — verified in lookup |
| T24 | DELETE /admin/fish-species/{speciesId} | DELETE /admin/fish-species/11 | 204; absent from lookup | 204 | PASS | Species absent from public lookup after soft-delete |
| T25 | POST /admin/market-locations | POST /admin/market-locations | 201; save locationId | 201, id=17 | PASS | Market location `"QA Test Market"` created |
| T26 | DELETE /admin/market-locations/{locationId} | DELETE /admin/market-locations/17 | 204; absent from lookup | 204 | PASS | Location absent from public lookup after soft-delete |
| T27 | POST /admin/advisories | POST /admin/advisories | 201; save advisoryId | 201, id=7 | PASS | Advisory created with all required fields |
| T28 | PUT /admin/advisories/{advisoryId} | PUT /admin/advisories/7 | 200; title updated | 200 | PASS | `title` updated to `"QA Test Advisory Updated Title"` — verified in response |
| T29 | DELETE /admin/advisories/{advisoryId} then GET | DELETE + GET /admin/advisories/7 | 204; GET returns 404 | 204; GET returns **200** | FAIL | Advisory DELETE returns 204 but GET still returns 200 with `isActive: false`. The admin GET endpoint does not enforce 404 on soft-deleted advisories. Inconsistent with spec expectation. |
| T30 | GET /trips with no token | GET /trips | 401 | 401 | PASS | Correct rejection |
| T31 | GET /vendor/orders with invalid JWT | GET /vendor/orders | 401 | 401 | PASS | Malformed token correctly rejected |
| T32 | Fisherman B accesses Fisherman A trip | GET /trips/17 (wrong user) | 403 or 404 | 404 | PASS | Trip ownership enforced — Fisherman B gets 404 for Fisherman A's trip |
| T33 | Vendor B updates Vendor A demand listing | PUT /vendor/demand-listings/13 (wrong user) | 403 or 404 | 404 | PASS | Listing ownership enforced — Vendor B gets 404 for Vendor A's listing |
| T34 | POST /trips/{tripId}/catches with negative weightKg | POST /trips/17/catches | 400 | 400 | PASS | `quantityKg: -10.0` rejected with `"must be greater than or equal to 0.1"` — but response includes full Java stack trace (see below) |
| T35 | POST /vendor/storefront/listings with empty body | POST /vendor/storefront/listings | 400 | 400 | PASS | All 4 required fields (`speciesId`, `title`, `pricePerKg`, `lotIds`) flagged as missing — but response includes full Java stack trace (see below) |
| T36 | GET /marine/conditions with SQL injection in path | GET /marine/conditions/1%20OR%201%3D1 | 400 or 404 (safe) | 404 | PASS | Input treated as literal zone ID string; zone not found. No SQL injection, no stack trace in response body. Clean error: `"Zone not found: 1 OR 1=1"` |

---

## Failures Detail

### T29 — DELETE /admin/advisories does not produce 404 on subsequent GET (FAIL)

**Issue:** After `DELETE /admin/advisories/7` returns 204, `GET /admin/advisories/7` returns 200 with the advisory still present but `isActive: false`. The advisory is soft-deleted (not hard-deleted) and the admin GET endpoint does not filter it out or return 404.

**Expected behaviour per spec:** `GET /admin/advisories/{advisoryId}` should return 404 after deletion so clients can treat the advisory as gone.

**Root cause:** The admin advisory GET endpoint returns soft-deleted records unchanged. No 404 guard exists for `isActive = false`.

**Impact:** Admin clients that check advisory existence via GET after delete will receive a stale 200 response, leading to confusion.

**Recommendation:** Either (a) make `adminGetAdvisoryById` return 404 when `isActive = false`, or (b) document in api.yaml that DELETE is a soft-deactivation and GET still returns the record with `isActive: false`.

---

## Stack Traces Exposed in HTTP Responses (Security / Quality Issue)

The following endpoints return full Java stack traces in the `trace` field of the error response body. This is a **high-severity information disclosure** issue. Stack traces reveal internal class names, method signatures, framework versions, and file paths, making it easier for attackers to craft targeted exploits.

**Affected endpoints (all return `trace` field with full Tomcat/Spring stack on validation errors):**

| Endpoint | Trigger |
|----------|---------|
| POST /auth/register | Missing required field (e.g., no `email`) |
| POST /trips/{tripId}/catches | `quantityKg` below minimum (e.g., -10.0) |
| POST /vendor/storefront/listings | Empty request body `{}` |
| POST /vendor/demand-listings | Date-time parse error (wrong format for `neededBy`) |
| POST /trips | Missing required fields (`departurePoint`, `targetArea`) |

**Recommendation:** Disable the `trace` field in error responses for all non-local environments. In `application.properties` (or per-profile), set:

```properties
server.error.include-stacktrace=never
```

Or implement a `GlobalExceptionHandler` that explicitly omits the `trace` field from `MethodArgumentNotValidException` responses (the handler already exists but currently re-throws or doesn't strip the trace).

---

## Additional Observations

1. **OTP column name mismatch in docs:** The known-facts note says `otp_expiry` but the actual DB column is `otp_code_exp`. Agents setting up OTPs should use `otp_code_exp`.

2. **OTP single-use:** Each OTP code is consumed on first use. Parallel test setup must re-issue OTPs before each login attempt.

3. **api.yaml field name divergence from DB entities:** `TripStartRequest` uses `departurePoint` and `targetArea` (not `departurePort`/`targetZone` as one might assume from the marine zone naming). Always consult `api.yaml` and examine existing records to confirm field names.

4. **Bangus (speciesId=1) is soft-deleted:** `active: false` on the Bangus species in the DB. Demand listings created using speciesId=1 succeed but the lookup endpoint will not return this species.

5. **T36 — Marine conditions injection path:** The zoneId is treated as a plain string and looked up by name, not used in a raw SQL query. The 404 error message echoes the decoded input (`Zone not found: 1 OR 1=1`), which is acceptable as it contains no sensitive server information.
