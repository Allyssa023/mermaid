# Week 4 Backend: Vendor Demand Listings — Design Spec

**Date:** 2026-03-24
**Goal:** Implement vendor demand listings CRUD as the Week 4 manifesto milestone — the core of Rosario's feature set.
**Scope:** Backend only. Marketplace browsing (Isidro's read-only view) is Week 5.
**Spec:** This document.

---

## 1. Context

The `demand_listings` table is the shared foundation for both Week 4 (vendor CRUD) and Week 5 (fisherman marketplace browse + price lookup). The DB schema and soft-delete strategy defined here must anticipate both use cases.

### Week 4 endpoints (from `api.yaml`)

| Method | Path | Operation ID |
|--------|------|--------------|
| GET | `/vendor/demand-listings` | `vendorListDemandListings` |
| POST | `/vendor/demand-listings` | `vendorCreateDemandListing` |
| GET | `/vendor/demand-listings/{listingId}` | `vendorGetDemandListingById` |
| PUT | `/vendor/demand-listings/{listingId}` | `vendorUpdateDemandListing` |
| DELETE | `/vendor/demand-listings/{listingId}` | `vendorDeleteDemandListing` |
| POST | `/vendor/demand-listings/{listingId}/close` | `vendorCloseDemandListing` |

All endpoints require `ROLE_VENDOR`. Enforced at class level via `@PreAuthorize("hasRole('VENDOR')")`. No `SecurityConfig` changes are needed — the existing `.anyRequest().authenticated()` plus class-level `@PreAuthorize` is sufficient.

---

## 2. Database

### Migration: `V7__create_demand_listings.sql`

```sql
CREATE TABLE demand_listings (
    id                  BIGSERIAL        PRIMARY KEY,
    vendor_id           BIGINT           NOT NULL REFERENCES users(id),
    species_id          BIGINT           NOT NULL REFERENCES fish_species(id),
    location_id         BIGINT           NOT NULL REFERENCES market_locations(id),
    quantity_kg         NUMERIC(10,2)    NOT NULL,
    offer_price_per_kg  NUMERIC(10,2)    NOT NULL,
    notes               TEXT,
    needed_by           TIMESTAMPTZ,
    status              VARCHAR(10)      NOT NULL DEFAULT 'OPEN',
    is_deleted          BOOLEAN          NOT NULL DEFAULT false,
    posted_at           TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ,
    CONSTRAINT chk_demand_listings_status   CHECK (status IN ('OPEN', 'CLOSED')),
    CONSTRAINT chk_demand_listings_quantity CHECK (quantity_kg >= 0.1),
    CONSTRAINT chk_demand_listings_price    CHECK (offer_price_per_kg >= 0)
);

-- vendor's own list query (Week 4)
CREATE INDEX idx_demand_listings_vendor
    ON demand_listings (vendor_id, status)
    WHERE is_deleted = false;

-- species + location lookup for marketplace browse and catch-log price lookup (Week 5/6)
CREATE INDEX idx_demand_listings_open_species
    ON demand_listings (species_id, location_id)
    WHERE status = 'OPEN' AND is_deleted = false;

-- COMMENT must appear after CREATE TABLE (table must exist first)
COMMENT ON TABLE demand_listings IS
    'Vendor-posted fish demand listings. Soft-deleted via is_deleted; '
    'status (OPEN/CLOSED) is independent of deletion. '
    'Referenced by catch_logs.matched_listing_id (Week 6).';
```

### FK constraint decisions

| FK | Constraint | Rationale |
|----|-----------|-----------|
| `vendor_id → users(id)` | `ON DELETE RESTRICT` (default) | Users are deactivated, never hard-deleted. RESTRICT is a safety net against accidental raw SQL deletes. |
| `species_id → fish_species(id)` | `ON DELETE RESTRICT` (default) | Species are soft-deleted; hard delete blocked while listings reference them. |
| `location_id → market_locations(id)` | `ON DELETE RESTRICT` (default) | Same as species. |
| `catch_logs.matched_listing_id → demand_listings(id)` | `ON DELETE SET NULL` — **Week 6 migration** | Listings are soft-deleted so this FK never fires in practice. Declared defensively: if a listing row is ever hard-deleted, the fisherman's catch history is preserved with a null reference. |

### Soft delete strategy

Vendor-initiated delete sets `is_deleted = true` — the row is never removed. This preserves `matched_listing_id` references in future `catch_logs` (a fisherman's historical record of "sold to this vendor at this price" survives regardless of what the vendor later does to the listing).

`status` (`OPEN`/`CLOSED`) is independent of `is_deleted`. A vendor can close a listing (stops appearing in marketplace) and later delete it (removes from their own dashboard). **A CLOSED listing can be deleted — no status guard applies to the delete operation.** The live marketplace query (Week 5) filters `status = 'OPEN' AND is_deleted = false`.

---

## 3. Domain Layer

### Entity: `DemandListing.java`

- `@ManyToOne(fetch = FetchType.EAGER)` on both `species` (→ `FishSpecies`) and `location` (→ `MarketLocation`). JPA resolves the join automatically; reference tables are small enough that eager fetch is appropriate for current load.
- `vendor_id` stored as bare `Long` — same pattern as `Advisory.createdByUserId`. The vendor is the authenticated caller, not a nested response object.
- `status` typed as `com.mermaid.app.model.DemandListingStatus` — reuses the generated enum, same pattern as `Advisory` using `com.mermaid.app.model.Severity`.
- `@PrePersist` sets `postedAt`; `@PreUpdate` sets `updatedAt`.

### Repository: `DemandListingRepository`

Three derived queries cover all service operations. The list methods are annotated with `@EntityGraph(attributePaths = {"species", "location"})` to guarantee a single JOIN per query rather than separate SELECTs per eager association — avoids N+1 on list responses.

```java
@EntityGraph(attributePaths = {"species", "location"})
List<DemandListing> findAllByVendorIdAndIsDeletedFalse(Long vendorId);

@EntityGraph(attributePaths = {"species", "location"})
List<DemandListing> findAllByVendorIdAndStatusAndIsDeletedFalse(
    Long vendorId, DemandListingStatus status);

// Single-entity fetch — no @EntityGraph needed; EAGER on the entity
// means Hibernate issues the association SELECTs regardless, and for
// a single row the overhead is negligible.
Optional<DemandListing> findByIdAndVendorIdAndIsDeletedFalse(Long id, Long vendorId);
```

The third method **combines existence check and ownership check in a single query**. If the listing belongs to a different vendor, it returns `Optional.empty()` → service throws `ResourceNotFoundException` → 404. This intentionally prevents a vendor from confirming whether listing ID 42 exists at all.

### Mapper: `DemandListingMapper`

```java
public com.mermaid.app.model.DemandListing toModel(DemandListing entity, String vendorName)
```

`vendorName` is passed in from the service — the mapper stays dependency-free (no repository injection). Since a vendor's own listings all share the same `vendorId`, the service resolves the name with **one** `userRepo.findById()` call per request, then reuses it across all items in a list. No N+1.

If `userRepo.findById(vendorId)` returns empty (edge case: deactivated user whose account no longer resolves), `vendorName` is passed as `null`. This is acceptable because `vendorName` is nullable in the `DemandListing` response schema. The service must not throw `ResourceNotFoundException` in this case — use `orElse(null)` and map to `null`.

Depends on the existing `FishSpeciesMapper` and `MarketLocationMapper` for nested object mapping.

---

## 4. Service Layer

### `DemandListingService`

**Injected:** `DemandListingRepository`, `DemandListingMapper`, `FishSpeciesRepository`, `MarketLocationRepository`, `UserRepository`.

> FK validation (`speciesId`, `locationId`) uses `findById` rather than `existsById` — the resolved entity is needed to set on the `DemandListing` field, so the extra existence check via `existsById` would be a redundant query.

**Private helper:**
```java
private Long currentVendorId() {
    return Long.parseLong(
        SecurityContextHolder.getContext().getAuthentication().getName());
}
```

**Operations:**

| Method | Signature | Key behaviour |
|--------|-----------|---------------|
| `listOwn` | `(DemandListingStatus statusFilter)` | Null filter → all non-deleted; otherwise filter by status. Resolves vendor name once via `userRepo.findById(...).map(User::getFullName).orElse(null)`. |
| `create` | `(DemandListingCreateRequest)` | Validates `speciesId` and `locationId` exist → `ResourceNotFoundException` (404) if not. Sets `vendorId` from `currentVendorId()`. |
| `getById` | `(Long listingId)` | Ownership enforced via `findByIdAndVendorIdAndIsDeletedFalse`. |
| `update` | `(Long listingId, DemandListingUpdateRequest)` | Ownership check first. Guard: `status == CLOSED` → throws `IllegalStateException`. Applies only non-null fields (partial update). If `speciesId` is non-null, validates it exists via `FishSpeciesRepository` → `ResourceNotFoundException` (404) if not. Same for `locationId`. **The `status` field in `DemandListingUpdateRequest` is ignored — status transitions are only permitted via the dedicated `close` operation.** (See note on `api.yaml` below.) |
| `delete` | `(Long listingId)` | Ownership check. Sets `is_deleted = true`, saves. Never calls `deleteById`. A CLOSED listing can be deleted. |
| `close` | `(Long listingId)` | Ownership check. If `status` is already `CLOSED`, return the mapped model immediately without calling `save` — avoids a no-op write that would bump `updated_at`. Otherwise sets `status = CLOSED` and saves. |

All writes use `@Transactional`; reads use `@Transactional(readOnly = true)`.

> **`api.yaml` schema note:** `DemandListingUpdateRequest` currently contains a `status` field. This field should be **removed from `api.yaml`** before implementation — it makes the API contract dishonest (advertising an input that does nothing). Remove the `status` property from `DemandListingUpdateRequest` in `api.yaml` and regenerate sources as part of Task 1. Status changes belong exclusively to the `/close` endpoint.

---

## 5. Controller

### `VendorDemandListingController`

Implements the generated `VendorDemandListingsApi`.

```java
@RestController
@PreAuthorize("hasRole('VENDOR')")
public class VendorDemandListingController implements VendorDemandListingsApi { ... }
```

All method bodies are thin delegates to `DemandListingService`. No business logic in the controller.

---

## 6. Error Handling

Two additions to `GlobalExceptionHandler.java`:

**1. `IllegalStateException` → 409 Conflict**
```java
@ExceptionHandler(IllegalStateException.class)
public ResponseEntity<ErrorResponse> handleIllegalState(
        IllegalStateException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
}
```
Semantically correct for "this resource is in a state that does not allow this operation" (e.g., updating a closed listing).

**2. `MethodArgumentTypeMismatchException` → 400 Bad Request**
```java
@ExceptionHandler(MethodArgumentTypeMismatchException.class)
public ResponseEntity<ErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
    String message = String.format("Invalid value '%s' for parameter '%s'", ex.getValue(), ex.getName());
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.BAD_REQUEST, message);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
}
```
Handles invalid enum values in query parameters (e.g., `?status=BOGUS`). Without this handler, Spring returns a default error response that breaks the project's `ErrorResponse` format. This handler applies to all enum-typed query parameters across the entire API (including future `?status=` on trips, etc.).

---

## 7. Testing

### `DemandListingServiceTest` (Mockito unit tests)

| Test | Assertion |
|------|-----------|
| `listOwn_noFilter_returnsAllNonDeleted` | Delegates to correct repo method, maps results |
| `listOwn_withStatusFilter_delegatesFilteredQuery` | Uses status-filtered repo method |
| `create_validRequest_savesAndReturnsModel` | Repo save called, mapper called |
| `create_speciesNotFound_throwsResourceNotFoundException` | speciesRepo returns empty → exception |
| `create_locationNotFound_throwsResourceNotFoundException` | locationRepo returns empty → exception |
| `update_openListing_appliesNonNullFieldsOnly` | Null fields not overwritten; status field in request ignored |
| `update_newSpeciesNotFound_throwsResourceNotFoundException` | Non-null speciesId in request that doesn't exist → exception |
| `update_newLocationNotFound_throwsResourceNotFoundException` | Non-null locationId in request that doesn't exist → exception |
| `update_closedListing_throwsIllegalStateException` | Status == CLOSED → exception |
| `update_notOwned_throwsResourceNotFoundException` | Repo returns empty → exception |
| `delete_softDeletesRow_neverCallsDeleteById` | `is_deleted = true`, `save` called, `deleteById` never called |
| `delete_closedListing_softDeletesSuccessfully` | CLOSED listing can be deleted; no guard thrown |
| `close_openListing_setsStatusClosed` | Status becomes CLOSED |
| `close_alreadyClosed_isIdempotent` | No exception thrown; `repo.save()` is never called (verify with `never().save(any())`) |

### `VendorDemandListingControllerTest` (`@WebMvcTest`)

| Test | Expected status |
|------|----------------|
| `list_asVendor_returns200` | 200 |
| `list_asNonVendor_returns403` | 403 |
| `list_invalidStatusParam_returns400` | 400 — sends `?status=BOGUS`, verifies enum mismatch handler fires |
| `create_validRequest_returns201` | 201 |
| `create_missingSpeciesId_returns400` | 400 — omits required `speciesId` field, verifies `@Valid` fires |
| `getById_notFound_returns404` | 404 |
| `update_closedListing_returns409` | 409 |
| `delete_notFound_returns404` | 404 |
| `close_returns200` | 200 |
| `close_notFound_returns404` | 404 |

---

## 8. File Map

### New files
```
backend/src/main/resources/db/migration/
  V7__create_demand_listings.sql

backend/src/main/java/com/mermaid/app/
  domain/DemandListing.java
  repository/DemandListingRepository.java
  mapper/DemandListingMapper.java
  service/DemandListingService.java
  controller/VendorDemandListingController.java

backend/src/test/java/com/mermaid/app/
  service/DemandListingServiceTest.java
  controller/VendorDemandListingControllerTest.java
```

### Modified files
```
backend/src/main/resources/openapi/api.yaml
  — remove `status` field from DemandListingUpdateRequest schema
  — regenerate sources after change

backend/src/main/java/com/mermaid/app/
  exception/GlobalExceptionHandler.java
    — add IllegalStateException → 409
    — add MethodArgumentTypeMismatchException → 400
```
