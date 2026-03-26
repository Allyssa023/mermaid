# Week 6 Backend: Trip Sessions, Safety Checklists & Catch Logs — Design Spec

**Date:** 2026-03-25
**Goal:** Complete the remaining MVP backend domain — trip lifecycle (start/end/list/get), safety checklists, and catch log CRUD — finishing the fisherman feature set.
**Scope:** Backend only. No Docker Compose. No frontend.

---

## 1. Context

Weeks 1–5 delivered auth, admin CRUD, marine conditions, advisories, reference data, vendor demand listings, and fisherman marketplace browse. Week 6 closes the loop on Isidro's (fisherman) core workflow:

1. Start a trip → save checklist → log catches during the trip → end trip.

The `api.yaml` contract already defines all endpoints under the `Trips` and `Catch Logs` tags. The OpenAPI generator produces two interfaces: `TripsApi` and `CatchLogsApi`. Week 6 implements both.

### Endpoints

| Method | Path | Operation ID | Tag |
|--------|------|--------------|-----|
| GET | `/trips` | `listTrips` | Trips |
| POST | `/trips` | `startTrip` | Trips |
| GET | `/trips/{tripId}` | `getTripById` | Trips |
| PUT | `/trips/{tripId}/checklist` | `saveTripChecklist` | Trips |
| POST | `/trips/{tripId}/end` | `endTrip` | Trips |
| GET | `/trips/{tripId}/catches` | `listCatchLogsByTrip` | Catch Logs |
| POST | `/trips/{tripId}/catches` | `createCatchLog` | Catch Logs |
| PUT | `/trips/{tripId}/catches/{catchId}` | `updateCatchLog` | Catch Logs |
| DELETE | `/trips/{tripId}/catches/{catchId}` | `deleteCatchLog` | Catch Logs |

All endpoints require `ROLE_FISHERMAN`. Enforced at class level via `@PreAuthorize("hasRole('FISHERMAN')")`.

---

## 2. Database

### Migration: `V8__create_trips.sql`

```sql
CREATE TABLE trips (
    id                     BIGSERIAL     PRIMARY KEY,
    fisherman_id           BIGINT        NOT NULL REFERENCES users(id),
    departure_point        VARCHAR(150)  NOT NULL,
    target_area            VARCHAR(150)  NOT NULL,
    vessel_name            VARCHAR(100),
    status                 VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE',
    started_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ended_at               TIMESTAMPTZ,
    notes                  VARCHAR(500),
    fuel_checked           BOOLEAN,
    engine_checked         BOOLEAN,
    radio_checked          BOOLEAN,
    life_vest_checked      BOOLEAN,
    weather_reviewed       BOOLEAN,
    emergency_kit_checked  BOOLEAN,
    checklist_completed_at TIMESTAMPTZ,
    CONSTRAINT chk_trips_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
);

-- covers both filtered (WHERE status = ?) and unfiltered list queries
CREATE INDEX idx_trips_fisherman ON trips (fisherman_id, status);
```

**Checklist stored inline on `trips`:** The safety checklist has 6 boolean fields and a timestamp. Embedding them as columns eliminates any join when fetching a trip with its checklist. All-null = checklist not yet submitted, maps to `null` in the response. This is the most efficient design for this shape of data.

### Migration: `V9__create_catch_logs.sql`

```sql
CREATE TABLE catch_logs (
    id                     BIGSERIAL      PRIMARY KEY,
    trip_id                BIGINT         NOT NULL REFERENCES trips(id),
    species_id             BIGINT         NOT NULL REFERENCES fish_species(id),
    quantity_kg            NUMERIC(10,2)  NOT NULL,
    estimated_price_per_kg NUMERIC(10,2),
    matched_listing_id     BIGINT         REFERENCES demand_listings(id) ON DELETE SET NULL,
    notes                  TEXT,
    logged_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT chk_catch_logs_quantity CHECK (quantity_kg >= 0.1)
);

-- primary access pattern: list all catches for a trip
CREATE INDEX idx_catch_logs_trip ON catch_logs (trip_id);
```

**FK decisions:**

| FK | Constraint | Rationale |
|----|-----------|-----------|
| `fisherman_id → users(id)` | `ON DELETE NO ACTION` (default) | Users are deactivated, never hard-deleted. |
| `trip_id → trips(id)` | `ON DELETE NO ACTION` (default) | Trips are never deleted. |
| `species_id → fish_species(id)` | `ON DELETE NO ACTION` (default) | Species are soft-deleted; hard delete blocked while catch logs reference them. |
| `matched_listing_id → demand_listings(id)` | `ON DELETE SET NULL` | Listings are soft-deleted so this FK never fires in practice. Declared defensively: if a listing row is ever hard-deleted, the catch history is preserved with a null reference. This fulfils the commitment made in the Week 4 spec. |

**Hard delete for catch logs:** No other table references catch logs by FK, so soft-delete adds overhead with no benefit. `deleteCatchLog` calls `deleteById`.

---

## 3. Domain Layer

### Entities

**`Trip.java`**
- `@Entity`, maps to `trips` table.
- `fishermanId` stored as bare `Long` — consistent with `DemandListing.vendorId` and `Advisory.createdByUserId`. No `@ManyToOne` to `User`.
- `status` typed as the generated `com.mermaid.app.model.TripStatus` enum.
- Checklist columns as boxed `Boolean` (nullable — null means not submitted).
- `@PrePersist` sets `startedAt = Instant.now()`.

**`CatchLog.java`**
- `@Entity`, maps to `catch_logs` table.
- `@ManyToOne(fetch = FetchType.LAZY)` on `species → FishSpecies`. LAZY gives explicit control — association only loads when requested via `@EntityGraph`.
- `tripId` and `matchedListingId` stored as bare `Long` (nullable for `matchedListingId`).
- `@PrePersist` sets `loggedAt = Instant.now()`.

### Repositories

**`TripRepository`**

```java
List<Trip> findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(Long fishermanId, TripStatus status);
List<Trip> findAllByFishermanIdOrderByStartedAtDescIdDesc(Long fishermanId);

// Ownership check baked in — returns empty if trip belongs to a different fisherman
Optional<Trip> findByIdAndFishermanId(Long id, Long fishermanId);
```

**`CatchLogRepository`**

```java
// @EntityGraph prevents N+1 — species loaded in a single JOIN for all rows
@EntityGraph(attributePaths = {"species"})
List<CatchLog> findAllByTripIdOrderByLoggedAtDesc(Long tripId);

// Ownership through trip — returns empty if catch belongs to a different trip
Optional<CatchLog> findByIdAndTripId(Long id, Long tripId);
```

The `findByIdAndTripId` method enforces catch-to-trip scoping. A catch that belongs to a different trip returns `Optional.empty()` → 404, preventing cross-trip access.

### Mappers

**`TripMapper.toModel(Trip entity)`** — maps all fields. Checklist: if all 6 boolean fields are `null` → returns `null` for the `checklist` response field; otherwise builds a `SafetyChecklist` model from the trip's inline columns. No repository injection — dependency-free, same pattern as all existing mappers.

**`CatchLogMapper.toModel(CatchLog entity)`** — maps all fields. Delegates the nested `species` object to the existing `FishSpeciesMapper`. Species is already JOIN-fetched via `@EntityGraph`, so no extra query is triggered.

---

## 4. Service Layer

### `TripNotActiveException` (new domain exception)

```java
public class TripNotActiveException extends RuntimeException {
    public TripNotActiveException(Long tripId) {
        super("Trip " + tripId + " is not active");
    }
}
```

Maps to 409 Conflict via a targeted handler in `GlobalExceptionHandler`. Same pattern as `ListingClosedException` from Week 5.

### `TripService`

**Injected:** `TripRepository`, `TripMapper`.

| Method | Signature | Key behaviour |
|--------|-----------|---------------|
| `listTrips` | `(TripStatus statusFilter)` | Null → unfiltered; otherwise status-filtered. Both ordered `started_at DESC, id DESC`. |
| `startTrip` | `(TripStartRequest)` | Sets `fishermanId` from `SecurityUtils.currentUserId()`. Status defaults to `ACTIVE`. |
| `getTripById` | `(Long tripId)` | Ownership via `findByIdAndFishermanId` → `ResourceNotFoundException` (404) if not found or not owned. |
| `saveTripChecklist` | `(Long tripId, SafetyChecklistRequest)` | Ownership check → guard: `status != ACTIVE` → `TripNotActiveException` (409). Sets all 6 booleans and `checklistCompletedAt = now()`. Saves. |
| `endTrip` | `(Long tripId, TripEndRequest)` | Ownership check → guard: `status != ACTIVE` → `TripNotActiveException` (409). Sets `status = COMPLETED`, `endedAt = now()`. Updates `notes` only if request field is non-null (partial). Saves. |

### `CatchLogService`

**Injected:** `CatchLogRepository`, `TripRepository`, `CatchLogMapper`, `FishSpeciesRepository`, `DemandListingRepository`.

**Private helper: `getOwnedActiveTrip(Long tripId)`** — bundles the ownership check and ACTIVE guard into a single reusable call. Used by all four write/read methods to eliminate duplicated ownership + status guard logic.

```java
private Trip getOwnedActiveTrip(Long tripId) {
    Trip trip = tripRepository.findByIdAndFishermanId(tripId, SecurityUtils.currentUserId())
        .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
    if (trip.getStatus() != TripStatus.ACTIVE) {
        throw new TripNotActiveException(tripId);
    }
    return trip;
}
```

| Method | Key behaviour |
|--------|---------------|
| `listByTrip(Long tripId)` | Verifies trip ownership (not the ACTIVE guard — read is allowed on completed trips). Fetches catches — species already loaded via `@EntityGraph`. |
| `create(Long tripId, CatchLogCreateRequest)` | `getOwnedActiveTrip`. Validates `speciesId` exists → 404 if not. If `matchedListingId` non-null, validates it exists in `DemandListingRepository` → 404 if not. Saves. |
| `update(Long tripId, Long catchId, CatchLogUpdateRequest)` | `getOwnedActiveTrip`. `findByIdAndTripId` → 404 if not found. Applies non-null fields only (partial PUT). Re-validates `speciesId`/`matchedListingId` if non-null. |
| `delete(Long tripId, Long catchId)` | `getOwnedActiveTrip`. `findByIdAndTripId` → 404 if not found. Hard delete via `deleteById`. |

> **`listByTrip` ownership note:** Ownership is checked (trip must belong to the calling fisherman) but the ACTIVE guard is not applied — a fisherman can view the catch history of a completed trip. Only mutations (create/update/delete) are blocked on non-ACTIVE trips.

All writes use `@Transactional`; reads use `@Transactional(readOnly = true)`.

---

## 5. Controllers

```java
@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class TripController implements TripsApi {
    // thin delegates to TripService
}

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class CatchLogController implements CatchLogsApi {
    // thin delegates to CatchLogService
}
```

No business logic in either controller. Method bodies are single-line delegates.

---

## 6. Error Handling

One addition to `GlobalExceptionHandler.java`:

```java
@ExceptionHandler(TripNotActiveException.class)
public ResponseEntity<ErrorResponse> handleTripNotActive(
        TripNotActiveException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
}
```

`MethodArgumentTypeMismatchException → 400` (for invalid `?status=BOGUS`) is already handled from Week 5. No change needed.

---

## 7. Testing

### `TripServiceTest` (Mockito unit tests)

| Test | Assertion |
|------|-----------|
| `listTrips_noFilter_returnsAll` | Unfiltered repo method called; results mapped |
| `listTrips_withStatusFilter_delegatesFilteredQuery` | Status-filtered repo method called |
| `startTrip_setsCorrectFishermanIdAndActiveStatus` | `SecurityUtils` ID used; status `ACTIVE` |
| `getTripById_notOwned_throwsResourceNotFoundException` | Repo returns empty → 404 |
| `saveTripChecklist_activeTrip_savesAllSixBooleans` | All 6 booleans set; `checklistCompletedAt` non-null |
| `saveTripChecklist_completedTrip_throwsTripNotActiveException` | 409 guard fires |
| `saveTripChecklist_cancelledTrip_throwsTripNotActiveException` | 409 guard fires |
| `endTrip_activeTrip_setsCompletedAndEndedAt` | Status `COMPLETED`; `endedAt` non-null |
| `endTrip_alreadyCompleted_throwsTripNotActiveException` | 409 guard fires |
| `endTrip_nullNotes_doesNotOverwriteExistingNotes` | Notes unchanged when request field is null |

### `CatchLogServiceTest` (Mockito unit tests)

| Test | Assertion |
|------|-----------|
| `listByTrip_notOwnedTrip_throwsResourceNotFoundException` | Ownership check fails → 404 |
| `listByTrip_completedTrip_returnsResults` | ACTIVE guard NOT applied to reads |
| `create_activeTrip_savesAndReturnsMappedModel` | Species validated; catch saved |
| `create_speciesNotFound_throwsResourceNotFoundException` | `FishSpeciesRepository` returns empty → 404 |
| `create_invalidMatchedListingId_throwsResourceNotFoundException` | `DemandListingRepository` returns empty → 404 |
| `create_completedTrip_throwsTripNotActiveException` | Guard fires before save |
| `update_nonNullFieldsOnly_applied` | Null fields in request leave entity fields unchanged |
| `update_newSpeciesNotFound_throwsResourceNotFoundException` | Non-null `speciesId` not found → 404 |
| `update_completedTrip_throwsTripNotActiveException` | Guard fires |
| `delete_activeTrip_callsDeleteById` | Hard delete; `save()` never called |
| `delete_completedTrip_throwsTripNotActiveException` | Guard fires |
| `delete_catchNotInTrip_throwsResourceNotFoundException` | `findByIdAndTripId` returns empty → 404 |

### Controller tests (`@WebMvcTest`)

`TripControllerTest`:
- `startTrip_asFisherman_returns201`
- `startTrip_asNonFisherman_returns403`
- `startTrip_missingDeparturePoint_returns400` — confirms `@Valid` fires on required field
- `getTripById_notFound_returns404`
- `saveTripChecklist_completedTrip_returns409` — service throws `TripNotActiveException`
- `endTrip_returns200`
- `listTrips_invalidStatusParam_returns400` — `?status=BOGUS` triggers `MethodArgumentTypeMismatchException`

`CatchLogControllerTest`:
- `createCatchLog_asFisherman_returns201`
- `createCatchLog_asNonFisherman_returns403`
- `createCatchLog_belowMinQuantity_returns400` — `quantityKg: 0.0` triggers `@DecimalMin`
- `createCatchLog_completedTrip_returns409`
- `updateCatchLog_returns200`
- `deleteCatchLog_returns204`
- `deleteCatchLog_notFound_returns404`

---

## 8. File Map

### New files
```
backend/src/main/resources/db/migration/
  V8__create_trips.sql
  V9__create_catch_logs.sql

backend/src/main/java/com/mermaid/app/
  exception/TripNotActiveException.java
  domain/Trip.java
  domain/CatchLog.java
  repository/TripRepository.java
  repository/CatchLogRepository.java
  mapper/TripMapper.java
  mapper/CatchLogMapper.java
  service/TripService.java
  service/CatchLogService.java
  controller/TripController.java
  controller/CatchLogController.java

backend/src/test/java/com/mermaid/app/
  service/TripServiceTest.java
  service/CatchLogServiceTest.java
  controller/TripControllerTest.java
  controller/CatchLogControllerTest.java
```

### Modified files
```
backend/src/main/java/com/mermaid/app/
  exception/GlobalExceptionHandler.java
    — add TripNotActiveException → 409
```
