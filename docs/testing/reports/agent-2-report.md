# Agent 2 — Marine, Advisories & Reference Data Test Report

**Date:** 2026-05-10  
**Tester:** Agent 2 (QA Team)  
**Branch:** vendor-modernization  
**Backend:** http://localhost:8080/api  
**Marine Service:** http://localhost:8081  

---

## Summary

| Metric | Count |
|--------|-------|
| Total  | 18    |
| PASS   | 14    |
| FAIL   | 4     |
| SKIP   | 0     |

---

## Environment Notes

- **PostgreSQL 18** was stopped at test start; started via `pg_ctl`. Column is `otp_code_exp` (not `otp_expiry` as documented in prior agent notes).
- **Marine Service** (Django/DRF on :8081) was not running; started manually via `python manage.py runserver 8081 --noreload`.
- **Backend** (:8080) was already running with established DB connections.
- OTP verify endpoint requires field `code` (not `otp`) per api.yaml spec.
- Both `/api/advisories` (public-facing) and `/api/lookups/*` require a Bearer token — they are NOT truly public endpoints despite spec intent.

---

## Results

| # | Test | Endpoint | Expected | Actual | PASS/FAIL | Notes |
|---|------|----------|----------|--------|-----------|-------|
| T1 | GET marine conditions, no token | GET /api/marine/conditions | 200 (public) | **401** | **FAIL** | Backend requires auth; tested direct marine service with X-API-Key instead — returned 200 with 12 zones |
| T1b | GET marine conditions, direct marine service | GET http://localhost:8081/api/conditions (X-API-Key header) | 200 | **200** | **PASS** | All 12 La Union zones returned; all riskLevel = **SAFE** |
| T2 | GET marine conditions for zone ID "1" | GET /api/marine/conditions/1 | 200 or 404 | **404** | **PASS** | Zone IDs are strings (e.g. "sto_tomas"), not integers; correct 404 with message "Zone not found: 1" |
| T3 | GET marine conditions for zone ID 99999 | GET /api/marine/conditions/99999 | 404 | **404** | **PASS** | Returns 404 with message "Zone not found: 99999" — proper error handling |
| T4 | Cache test — two calls 5 seconds apart | GET http://localhost:8081/api/conditions | Same cached response | **CACHE HIT** | **PASS** | First zone timestamp identical both calls; `data_freshness_seconds` incremented by 5 (from 60 to 65), confirming in-memory TTL cache is working |
| T5 | GET advisories, no token | GET /api/advisories | 200, count shown | **401** | **FAIL** | Endpoint requires Bearer token; not a public endpoint as expected. With fisherman token: 200, count=0 (empty list before T7) |
| T6 | GET admin advisories, ADMIN token | GET /api/admin/advisories | 200 | **200** | **PASS** | Returns array; count=1 (pre-existing seed advisory) |
| T7 | Create advisory via admin | POST /api/admin/advisories | 201, advisory created | **201** | **PASS** | Advisory ID=8 created; title="QA Test Advisory - Rough Seas", severity=HIGH, affectedArea="La Union Coast" |
| T8 | Verify new advisory visible | GET /api/advisories | 200, advisory ID=8 present | **200, ID=8 found** | **PASS** | Advisory appears in public list immediately after creation |
| T9 | Delete advisory | DELETE /api/admin/advisories/8 | 204 | **204** | **PASS** | Advisory soft-deleted successfully, empty body response |
| T10 | Verify deleted advisory gone | GET /api/advisories | 200, ID=8 absent | **200, ID=8 absent** | **PASS** | Empty array returned — advisory no longer in public list |
| T11 | GET fish species, no token | GET /api/lookups/fish-species | 200, non-empty list | **401** (no token) / **200** (with token) | **FAIL** | Requires auth token; with fisherman token: 200, **9 species** returned (Tilapia, Galunggong, Tanigue, Lapu-lapu, Dilis, Alumahan, and more) |
| T12 | GET market locations, no token | GET /api/lookups/market-locations | 200, non-empty list | **401** (no token) / **200** (with token) | **FAIL** | Requires auth token; with fisherman token: 200, **8 locations** returned (first 5: Luna Public Market, Balaoan Public Market, City Public Market, Sto. Tomas Public Market, Aringay Public Market) |
| T13 | GET message users | GET /api/messages/users | 200, count shown | **200** | **PASS** | Returns 1 user: id=5, fullName="asdd", role=VENDOR, email=vendor@mermaid.local |
| T14 | GET messages with user 5 | GET /api/messages/5 | 200 | **200** | **PASS** | Returns 1 message; content shows fisherman expressed interest in Tanigue listing |
| T15 | Upload valid JPEG | POST /api/uploads (multipart/form-data) | 200/201 with URL | **201** | **PASS** | Response: `{"url":"http://localhost:8080/api/uploads/general/<uuid>.jpg"}` — upload and URL generation working |
| T16 | Upload invalid EXE type | POST /api/uploads (EXE file) | 400 (type validation) | **400** | **PASS** | Server correctly rejects non-image file type with 400; response body is empty (no human-readable error detail) |
| T17 | Webhook: valid PayMongo event | POST /api/webhooks/paymongo | 200 or 400 | **200** | **PASS** | Webhook accepted without signature verification; no Paymongo-Signature header validation enforced |
| T18 | Webhook: empty body | POST /api/webhooks/paymongo | 400 or 200 | **200** | **PASS** | Empty `{}` body accepted silently; no required field validation |

---

## Key Findings

### Marine Service (T1-T4)

- All 12 La Union coastal zones returned **riskLevel = SAFE** on 2026-05-10.
- Zone IDs are **string slugs** (e.g. `sto_tomas`, `san_fernando`), not integers. The backend proxy wraps these as `/api/marine/conditions/{zoneId}` and correctly translates numeric-looking IDs to 404 with a clear message.
- The **in-memory TTL cache is functional**: timestamps are preserved across calls within the 15-minute window; only `data_freshness_seconds` increments (confirmed 60 to 65 over 5 seconds).
- The backend marine endpoint (`/api/marine/conditions`) requires a valid Bearer token. The direct marine service at :8081 is API-key gated (`X-API-Key` header). Both access paths enforce authentication.

### Advisory Lifecycle (T5-T10)

- Full **create to verify to delete to confirm** lifecycle passed cleanly with correct HTTP status codes (201, 200, 204, 200).
- Advisory created with severity=HIGH appeared immediately in the fisherman-visible advisory list after creation.
- Advisory was removed completely from the public list after DELETE — soft delete behavior working correctly.
- Pre-existing advisory count=1 in T6 suggests seed data from prior test runs.
- The `/api/advisories` endpoint requires auth — confirmed by 401 on unauthenticated call.

### Reference Data Lookups (T11-T12)

- **Fish Species:** 9 active species available: Tilapia (Oreochromis niloticus), Galunggong (Decapterus macarellus), Tanigue (Scomberomorus commerson), Lapu-lapu (Epinephelus coioides), Dilis (Stolephorus sp.), Alumahan, and 3 more.
- **Market Locations:** 8 La Union locations available: Luna Public Market, Balaoan Public Market, City Public Market, Sto. Tomas Public Market, Aringay Public Market, and 3 more.
- Both endpoints require a Bearer token — they are not publicly accessible without authentication.

### Messaging (T13-T14)

- Message inbox works correctly; fisherman (isidro@test.com, id=9) has an existing conversation thread with vendor (id=5).
- Existing message content shows cross-feature integration: listing interest expressed via message body.

### File Upload (T15-T16)

- Upload endpoint (`POST /api/uploads`) returns a UUID-based URL under `/api/uploads/general/`.
- File type validation is enforced: EXE files rejected with 400.
- Defect: 400 response body is empty — no human-readable error message is returned to the client.

### Payment Webhook (T17-T18)

- Webhook endpoint accepts all payloads without signature verification in current configuration.
- Both a well-formed PayMongo event and an empty `{}` body return 200 silently.
- **Security concern:** In production, webhook signature verification (via `Paymongo-Signature` header) must be enforced to prevent spoofed payment events from triggering order status changes.

---

## Defects Found

| ID | Severity | Description | Endpoint |
|----|----------|-------------|----------|
| D-01 | Medium | `/api/advisories`, `/api/lookups/fish-species`, `/api/lookups/market-locations` all require auth token — may be intentional (app is login-gated) but deviates from common spec intent for reference/public data endpoints | GET /api/advisories, /api/lookups/* |
| D-02 | Medium | `/api/marine/conditions` requires auth token when accessed via backend proxy; if fishermen in emergency contexts need conditions data, the auth requirement could block access | GET /api/marine/conditions |
| D-03 | Low | File upload returns an empty 400 response body when file type is rejected — no client-facing error message describing why the upload was refused | POST /api/uploads |
| D-04 | High | PayMongo webhook accepts any payload without signature verification — spoofed payment events could trigger order status changes in production | POST /api/webhooks/paymongo |

---

## OTP Workaround Discovery

The correct column for OTP expiry is `otp_code_exp` (not `otp_expiry` as previously documented). The correct psql command for future agents is:

```sql
UPDATE users SET otp_code = '123456', otp_code_exp = NOW() + INTERVAL '10 minutes' WHERE email = 'user@example.com';
```

And the OTP verify endpoint requires field `code` (not `otp`):

```json
{"email": "user@example.com", "code": "123456"}
```
