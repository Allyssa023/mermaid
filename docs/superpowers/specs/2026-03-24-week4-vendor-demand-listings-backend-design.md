# Week 4 Backend: Vendor Demand Listings — Design Spec

**Date:** 2026-03-24
**Goal:** Implement vendor demand listings CRUD as the Week 4 manifesto milestone — the core of Rosario's feature set.
**Scope:** Backend only. Marketplace browsing (Isidro's read-only view) is Week 5.

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

All endpoints require `ROLE_VENDOR`. Enforced at class level via `@PreAuthorize("hasRole('VENDOR')")`. No `SecurityConfig` changes are needed — the existing `.anyRequest().authenticated()` plus class-level `@PreAuthorize` is sufficient. `@WebMvcTest` slices load method security automatically in this project (confirmed by existing `AdminAdvisoryControllerTest` 403 tests); no extra configuration needed in test classes.

**PUT with partial semantics:** The `PUT /vendor/demand-listings/{listingId}` endpoint applies only non-null fields — this is intentional partial-PUT behavior, consistent with every other update operation in this API (`adminUpdateUser`, `adminUpdateAdvisory`, `adminUpdateFishSpecies`, etc.). The API does not use PATCH anywhere; this codebase-wide convention is followed here.

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

-- COMMENT must appear after CREATE TABLE (table must already exist)
COMMENT ON TABLE demand_listings IS
    'Vendor-posted fish demand listings. Soft-deleted via is_deleted; '
    'status (OPEN/CLOSED) is independent of deletion. '
    'Referenced by catch_logs.matched_listing_id (Week 6).';
```

### FK constraint decisions

| FK | Constraint | Rationale |
|----|-----------|-----------|
| `vendor_id → users(id)` | `ON DELETE NO ACTION` (PostgreSQL default) | Users are deactivated, never hard-deleted. NO ACTION is a safety net against accidental raw SQL deletes. |
| `species_id → fish_species(id)` | `ON DELETE NO ACTION` (PostgreSQL default) | Species are soft-deleted; hard delete blocked while listings reference them. |
| `location_id → market_locations(id)` | `ON DELETE NO ACTION` (PostgreSQL default) | Same as species. |
| `catch_logs.matched_listing_id → demand_listings(id)` | `ON DELETE SET NULL` — **Week 6 migration** | Listings are soft-deleted so this FK never fires in practice. Declared defensively: if a listing row is ever hard-deleted, the fisherman's catch history is preserved with a null reference. |

> Note: PostgreSQL's implicit FK default is `NO ACTION` (deferred check, end of transaction), not `RESTRICT` (immediate check). The practical difference only surfaces with deferred constraint evaluation, but the terminology should be precise.

### Soft delete strategy

Vendor-initiated delete sets `is_deleted = true` — the row is never removed. This preserves `matched_listing_id` references in future `catch_logs` (a fisherman's historical record of "sold to this vendor at this price" survives regardless of what the vendor later does to the listing).

`status` (`OPEN`/`CLOSED`) is independent of `is_deleted`. A vendor can close a listing (stops appearing in marketplace) and later delete it (removes from their own dashboard). **A CLOSED listing can be deleted — no status guard applies to the delete operation.** The live marketplace query (Week 5) filters `status = 'OPEN' AND is_deleted = false`.

### Bean validation at API layer

The `minimum: 0.1` and `minimum: 0` constraints in `api.yaml` on `DemandListingCreateRequest` already cause the OpenAPI generator to emit `@DecimalMin(value = "0.1")` and `@DecimalMin(value = "0")` on `quantityKg` and `offerPricePerKg` respectively (confirmed from generated sources). No manual annotation needed — the API layer already validates these before they can reach the DB constraint.

---

## 3. Domain Layer

### Entity: `DemandListing.java`

- `@ManyToOne(fetch = FetchType.LAZY)` on both `species` (→ `FishSpecies`) and `location` (→ `MarketLocation`). LAZY gives explicit control — associations only load when the query explicitly requests them via `@EntityGraph`. This avoids accidental loads in code paths that don't need the nested objects.
- `vendor_id` stored as bare `Long` — same pattern as `Advisory.createdByUserId`. The vendor is the authenticated caller, not a nested response object.
- `status` typed as `com.mermaid.app.model.DemandListingStatus` — reuses the generated enum, same pattern as `Advisory` using `com.mermaid.app.model.Severity`.
- `@PrePersist` sets `postedAt`; `@PreUpdate` sets `updatedAt`.

### Repository: `DemandListingRepository`

All queries that map to a response DTO use `@EntityGraph(attributePaths = {"species", "location"})` to JOIN-fetch both associations in a single query. The single-entity lookup omits `@EntityGraph` because Hibernate will issue association SELECTs per LAZY field access — for one row this is negligible and explicit `@EntityGraph` on all four write operations (update, delete, close, getById) would add noise without benefit. List queries must use `@EntityGraph` to avoid N+1.

```java
@EntityGraph(attributePaths = {"species", "location"})
List<DemandListing> findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(Long vendorId);

@EntityGraph(attributePaths = {"species", "location"})
List<DemandListing> findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
    Long vendorId, DemandListingStatus status);

// Ownership check baked in — returns empty if listing belongs to a different vendor
Optional<DemandListing> findByIdAndVendorIdAndIsDeletedFalse(Long id, Long vendorId);
```

The third method **combines existence check and ownership check in a single query**. A listing that belongs to a different vendor returns `Optional.empty()` → service throws `ResourceNotFoundException` → 404. This intentionally prevents a vendor from confirming whether listing ID 42 exists at all.

### Mapper: `DemandListingMapper`

```java
public com.mermaid.app.model.DemandListing toModel(DemandListing entity, String vendorName)
```

`vendorName` is passed in from the service — the mapper stays dependency-free (no repository injection). Since a vendor's own listings all share the same `vendorId`, the service resolves the name with **one** `userRepo.findById()` call per request, then reuses it across all items in a list. No N+1.

If `userRepo.findById(vendorId)` returns empty, `vendorName` is passed as `null` — use `.map(User::getFullName).orElse(null)`. `vendorName` is `nullable: true` in the response schema so `null` is a valid value; the service must not throw `ResourceNotFoundException` here.

Depends on the existing `FishSpeciesMapper` and `MarketLocationMapper` for nested object mapping.

---

## 4. Service Layer

### `SecurityUtils` (new shared utility)

```java
public final class SecurityUtils {
    private SecurityUtils() {}

    public static Long currentUserId() {
        return Long.parseLong(
            SecurityContextHolder.getContext().getAuthentication().getName());
    }
}
```

Extracted from the inline `Long.parseLong(...)` pattern already used in `AdminController`. Eliminates duplication — both `AdminController` and `VendorDemandListingController` call this. The JWT subject is always the numeric user ID (`String.valueOf(user.getId())` in `JwtTokenService`), so parsing as `Long` is correct by contract, not coincidence.

### `ListingClosedException` (new domain exception)

```java
public class ListingClosedException extends RuntimeException {
    public ListingClosedException(Long listingId) {
        super("Demand listing " + listingId + " is closed and cannot be modified");
    }
}
```

Used by `update` instead of raw `IllegalStateException`. Maps to 409 via a targeted handler in `GlobalExceptionHandler` — does not risk swallowing unrelated `IllegalStateException`s from JPA, proxies, or other framework code.

### `DemandListingService`

**Injected:** `DemandListingRepository`, `DemandListingMapper`, `FishSpeciesRepository`, `MarketLocationRepository`, `UserRepository`.

> FK validation (`speciesId`, `locationId`) uses `findById` — the resolved entity is set directly on the `DemandListing` field, so `existsById` would be a redundant extra query.

**Operations:**

| Method | Signature | Key behaviour |
|--------|-----------|---------------|
| `listOwn` | `(DemandListingStatus statusFilter)` | Null filter → unfiltered; otherwise filter by status. Results ordered `posted_at DESC, id DESC`. Resolves vendor name once via `userRepo.findById(...).map(User::getFullName).orElse(null)`. |
| `create` | `(DemandListingCreateRequest)` | Validates `speciesId` and `locationId` exist → `ResourceNotFoundException` (404) if not. Sets `vendorId` from `SecurityUtils.currentUserId()`. |
| `getById` | `(Long listingId)` | Ownership enforced via `findByIdAndVendorIdAndIsDeletedFalse`. |
| `update` | `(Long listingId, DemandListingUpdateRequest)` | Ownership check first. Guard: `status == CLOSED` → throws `ListingClosedException`. Applies only non-null fields (partial PUT — see Section 1). If `speciesId` is non-null, validates it exists via `FishSpeciesRepository` → `ResourceNotFoundException` if not. Same for `locationId`. **The `status` field in `DemandListingUpdateRequest` is ignored.** |
| `delete` | `(Long listingId)` | Ownership check. Sets `is_deleted = true`, saves. Never calls `deleteById`. Works on OPEN or CLOSED listings. |
| `close` | `(Long listingId)` | Ownership check. If `status` is already `CLOSED`, returns the mapped model immediately — no `save` call, no `updated_at` bump. Otherwise sets `status = CLOSED` and saves. |

All writes use `@Transactional`; reads use `@Transactional(readOnly = true)`.

> **`api.yaml` schema fix:** Remove the `status` field from `DemandListingUpdateRequest` before implementation — it advertises an input that does nothing. Regenerate sources after the change. This is Task 1 of the implementation plan.

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

Two additions and one modification to `GlobalExceptionHandler.java`:

**1. `ListingClosedException` → 409 Conflict**
```java
@ExceptionHandler(ListingClosedException.class)
public ResponseEntity<ErrorResponse> handleListingClosed(
        ListingClosedException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
}
```
Targeted handler for a specific domain exception — does not risk catching unrelated `IllegalStateException`s from JPA or proxy code.

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
Handles invalid enum values in query parameters (e.g., `?status=BOGUS`). Applies globally to all enum-typed query parameters across the API.

---

## 7. Testing

### `DemandListingServiceTest` (Mockito unit tests)

| Test | Assertion |
|------|-----------|
| `listOwn_noFilter_returnsAllNonDeleted` | Delegates to unfiltered repo method, maps results |
| `listOwn_withStatusFilter_delegatesFilteredQuery` | Delegates to status-filtered repo method |
| `create_validRequest_savesAndReturnsModel` | `repo.save()` called, mapper called |
| `create_speciesNotFound_throwsResourceNotFoundException` | `speciesRepo` returns empty → exception |
| `create_locationNotFound_throwsResourceNotFoundException` | `locationRepo` returns empty → exception |
| `update_openListing_appliesNonNullFieldsOnly` | Null fields unchanged; `status` field in request ignored |
| `update_newSpeciesNotFound_throwsResourceNotFoundException` | Non-null `speciesId` not found → exception |
| `update_newLocationNotFound_throwsResourceNotFoundException` | Non-null `locationId` not found → exception |
| `update_closedListing_throwsListingClosedException` | `status == CLOSED` → `ListingClosedException` |
| `update_notOwned_throwsResourceNotFoundException` | Repo returns empty → exception |
| `delete_softDeletesRow_neverCallsDeleteById` | `is_deleted = true`, `save` called, `deleteById` never called |
| `delete_closedListing_softDeletesSuccessfully` | CLOSED listing deleted without guard |
| `delete_alreadySoftDeleted_throwsResourceNotFoundException` | `findByIdAndVendorIdAndIsDeletedFalse` returns empty → 404 |
| `getById_softDeleted_throwsResourceNotFoundException` | Same repo filter → 404 for soft-deleted row |
| `close_openListing_setsStatusClosed` | `status` becomes `CLOSED` |
| `close_alreadyClosed_isIdempotent` | No exception; `repo.save()` never called (`verify(repo, never()).save(any())`) |
| `vendorName_null_mapsToNullInResponse` | `userRepo.findById()` returns empty → `vendorName` is `null`, no exception |

### `VendorDemandListingControllerTest` (`@WebMvcTest`)

`@WebMvcTest` loads method security automatically in this project — existing `AdminAdvisoryControllerTest` confirms 403 tests work without extra configuration.

| Test | Expected status |
|------|----------------|
| `list_asVendor_returns200` | 200 |
| `list_asNonVendor_returns403` | 403 — confirms method security is wired |
| `list_invalidStatusParam_returns400` | 400 — sends `?status=BOGUS`, confirms `MethodArgumentTypeMismatchException` handler produces `ErrorResponse` format |
| `create_validRequest_returns201` | 201 |
| `create_missingSpeciesId_returns400` | 400 — omits required `speciesId`, confirms `@Valid` fires |
| `create_belowMinQuantity_returns400` | 400 — sends `quantityKg: 0.0`, confirms `@DecimalMin` fires |
| `getById_notFound_returns404` | 404 |
| `getById_invalidIdFormat_returns400` | 400 — sends `/vendor/demand-listings/abc`, confirms `MethodArgumentTypeMismatchException` handler fires for path variable |
| `update_closedListing_returns409` | 409 — service throws `ListingClosedException` |
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
  exception/ListingClosedException.java
  security/SecurityUtils.java
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
    — add ListingClosedException → 409
    — add MethodArgumentTypeMismatchException → 400
  controller/AdminController.java
    — replace inline Long.parseLong(...) with SecurityUtils.currentUserId()
```
