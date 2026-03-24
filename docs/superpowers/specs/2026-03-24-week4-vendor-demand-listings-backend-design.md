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

All endpoints require `ROLE_VENDOR`. Enforced at class level via `@PreAuthorize("hasRole('VENDOR')")`.

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

`status` (`OPEN`/`CLOSED`) is independent of `is_deleted`. A vendor can close a listing (stops appearing in marketplace) and later delete it (removes from their own dashboard). The live marketplace query (Week 5) will filter `status = 'OPEN' AND is_deleted = false`.

---

## 3. Domain Layer

### Entity: `DemandListing.java`

- `@ManyToOne(fetch = FetchType.EAGER)` on both `species` (→ `FishSpecies`) and `location` (→ `MarketLocation`). JPA resolves the join automatically; reference tables are small enough that eager fetch is appropriate.
- `vendor_id` stored as bare `Long` — same pattern as `Advisory.createdByUserId`. The vendor is the authenticated caller, not a nested response object.
- `status` typed as `com.mermaid.app.model.DemandListingStatus` — reuses the generated enum, same pattern as `Advisory` using `com.mermaid.app.model.Severity`.
- `@PrePersist` sets `postedAt`; `@PreUpdate` sets `updatedAt`.

### Repository: `DemandListingRepository`

Three derived queries cover all service operations:

```java
List<DemandListing> findAllByVendorIdAndIsDeletedFalse(Long vendorId);

List<DemandListing> findAllByVendorIdAndStatusAndIsDeletedFalse(
    Long vendorId, DemandListingStatus status);

Optional<DemandListing> findByIdAndVendorIdAndIsDeletedFalse(Long id, Long vendorId);
```

The third method **combines existence check and ownership check in a single query**. If the listing belongs to a different vendor, it returns `Optional.empty()` → service throws `ResourceNotFoundException` → 404. This intentionally prevents a vendor from confirming whether listing ID 42 exists at all.

### Mapper: `DemandListingMapper`

```java
public com.mermaid.app.model.DemandListing toModel(DemandListing entity, String vendorName)
```

`vendorName` is passed in from the service — the mapper stays dependency-free (no repository injection). Since a vendor's own listings all share the same `vendorId`, the service resolves the name with **one** `userRepo.findById()` call per request, then reuses it across all items in a list. No N+1.

Depends on the existing `FishSpeciesMapper` and `MarketLocationMapper` for nested object mapping.

---

## 4. Service Layer

### `DemandListingService`

**Injected:** `DemandListingRepository`, `DemandListingMapper`, `FishSpeciesRepository`, `MarketLocationRepository`, `UserRepository`.

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
| `listOwn` | `(DemandListingStatus statusFilter)` | Null filter → all non-deleted; otherwise filter by status. Resolves vendor name once. |
| `create` | `(DemandListingCreateRequest)` | Validates `speciesId` and `locationId` exist → `ResourceNotFoundException` (404) if not. Sets `vendorId` from `currentVendorId()`. |
| `getById` | `(Long listingId)` | Ownership enforced via `findByIdAndVendorIdAndIsDeletedFalse`. |
| `update` | `(Long listingId, DemandListingUpdateRequest)` | Ownership check first. Guard: `status == CLOSED` → throws `IllegalStateException`. Applies only non-null fields (partial update). |
| `delete` | `(Long listingId)` | Ownership check. Sets `is_deleted = true`, saves. Never calls `deleteById`. |
| `close` | `(Long listingId)` | Ownership check. Sets `status = CLOSED`. Idempotent: closing an already-closed listing is a no-op (saves again but no error). |

All writes use `@Transactional`; reads use `@Transactional(readOnly = true)`.

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

One addition to `GlobalExceptionHandler.java`:

```java
@ExceptionHandler(IllegalStateException.class)
public ResponseEntity<ErrorResponse> handleIllegalState(
        IllegalStateException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
}
```

`IllegalStateException` → **409 Conflict** — semantically correct for "this resource is in a state that does not allow this operation" (e.g., updating a closed listing). Distinct from `IllegalArgumentException` → 400 (bad input).

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
| `update_openListing_appliesNonNullFieldsOnly` | Null fields not overwritten |
| `update_closedListing_throwsIllegalStateException` | Status == CLOSED → exception |
| `update_notOwned_throwsResourceNotFoundException` | Repo returns empty → exception |
| `delete_softDeletesRow_neverCallsDeleteById` | `is_deleted = true`, `save` called, `deleteById` never called |
| `close_openListing_setsStatusClosed` | Status becomes CLOSED |
| `close_alreadyClosed_isIdempotent` | No exception thrown |

### `VendorDemandListingControllerTest` (`@WebMvcTest`)

| Test | Expected status |
|------|----------------|
| `list_asVendor_returns200` | 200 |
| `list_asNonVendor_returns403` | 403 |
| `create_validRequest_returns201` | 201 |
| `create_invalidRequest_returns400` | 400 (blank/missing required fields) |
| `getById_notFound_returns404` | 404 |
| `update_closedListing_returns409` | 409 |
| `delete_notFound_returns404` | 404 |
| `close_returns200` | 200 |

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
backend/src/main/java/com/mermaid/app/
  exception/GlobalExceptionHandler.java  — add IllegalStateException → 409
```
