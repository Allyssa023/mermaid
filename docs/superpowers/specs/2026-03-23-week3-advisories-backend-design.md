# Week 3 Backend Design: Admin Advisories + Reference Data

**Date:** 2026-03-23
**Branch:** marine-api-login
**Scope:** Backend only (frontend deferred)

## Goal

Implement the Week 3 manifesto milestone: Admin advisories CRUD + public advisories feed + reference data management (fish species and market locations). All three are foundational — advisories feed the fisherman dashboard; fish species and market locations are required by Week 4 demand listings.

## Decisions Made

| Question | Decision |
|----------|----------|
| Scope | Advisories + fish species + market locations |
| Advisory active filter logic | AND: `isActive = true` AND `now` is within `[activeFrom, activeTo]` |
| Reference data seed | Yes — both fish species and market locations seeded in V6 migration |
| Service structure | Three separate services (Option B), mirroring existing `AdminUserService` pattern |

## Database Migrations

Three new Flyway scripts, continuing from V3:

### V4\_\_create\_reference\_tables.sql
Creates `fish_species` and `market_locations`:

```sql
CREATE TABLE fish_species (
    id              BIGSERIAL PRIMARY KEY,
    common_name     VARCHAR(100) NOT NULL,
    scientific_name VARCHAR(150),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market_locations (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    province     VARCHAR(100),
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### V5\_\_create\_advisories\_table.sql
Creates `advisories`:

```sql
CREATE TABLE advisories (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(150) NOT NULL,
    message             TEXT NOT NULL,
    severity            VARCHAR(20) NOT NULL,
    affected_area       VARCHAR(150) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL,
    active_to           TIMESTAMPTZ NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Notes:
- `severity` stored as `VARCHAR`, mapped to `Severity` enum (`LOW/MEDIUM/HIGH/CRITICAL`) via `@Enumerated(EnumType.STRING)`
- `created_by_user_id` is nullable with `ON DELETE SET NULL` so deleting an admin user does not orphan their advisories

### V6\_\_seed\_reference\_data.sql
Inserts ~10 common Philippine fish species and 3–5 sample market locations. Provides usable data immediately for testing and demo without admin setup.

## Domain Layer

### Entities

**`FishSpecies.java`**
- Fields: `id`, `commonName`, `scientificName`, `active`, `createdAt`
- `@PrePersist` sets `createdAt`

**`MarketLocation.java`**
- Fields: `id`, `name`, `municipality`, `province`, `active`, `createdAt`

**`Advisory.java`**
- Fields: `id`, `title`, `message`, `severity` (`@Enumerated(EnumType.STRING)`), `affectedArea`, `activeFrom`, `activeTo`, `isActive`, `createdByUserId` (`Long` — no `@ManyToOne`, avoids eager user graph loading), `createdAt`

### Repositories

**`FishSpeciesRepository extends JpaRepository<FishSpecies, Long>`**
- `List<FishSpecies> findAllByActiveTrue()`

**`MarketLocationRepository extends JpaRepository<MarketLocation, Long>`**
- `List<MarketLocation> findAllByActiveTrue()`

**`AdvisoryRepository extends JpaRepository<Advisory, Long>`**
- `List<Advisory> findAllByOrderByCreatedAtDesc()` — for admin (all rows)
- `List<Advisory> findAllByIsActiveTrueAndActiveFromBeforeAndActiveToAfter(Instant now1, Instant now2)` — for public active feed (AND logic)
- Severity filter applied as an additional `@Query` or in-memory filter in the service

## Service Layer

All services live in `com.mermaid.app.service`. Each uses a dedicated mapper class to convert between JPA entities and generated OpenAPI model classes.

### `FishSpeciesService`

| Method | Behaviour |
|--------|-----------|
| `listActive()` | `findAllByActiveTrue()`, map to API models |
| `create(request)` | Save new entity, return API model |
| `update(id, request)` | Load (throw `ResourceNotFoundException` if missing), apply changes, save |
| `delete(id)` | Load, set `active = false` (soft delete — safe for future FK references from demand listings) |

### `MarketLocationService`
Identical shape to `FishSpeciesService` with its own entity and repository.

### `AdvisoryService`

| Method | Behaviour |
|--------|-----------|
| `listAll()` | All rows, ordered by `createdAt desc` — for admin view |
| `listActive(Severity filter)` | AND logic: `isActive = true` AND `now` in `[activeFrom, activeTo]`; optional severity filter |
| `getById(id)` | Throws `ResourceNotFoundException` if missing |
| `create(request, adminUserId)` | Sets `createdByUserId` from authenticated JWT principal; validates `activeTo > activeFrom` |
| `update(id, request)` | Partial update — only applies non-null fields from `AdvisoryUpdateRequest` |
| `delete(id)` | Hard delete (advisories have no FK dependents) |

## Controller & API Layer

### `AdminController` (existing — remove stubs)
- Inject `AdvisoryService`, `FishSpeciesService`, `MarketLocationService`
- Advisory `create` method extracts admin user ID from `Authentication` principal
- Class-level `@PreAuthorize("hasRole('ADMIN')")` already in place — no security changes needed

### `AdvisoryController` (new)
- Implements generated `AdvisoriesApi` interface
- `GET /advisories?activeOnly=true&severity=HIGH` — delegates to `AdvisoryService`
- Requires valid Bearer token (inherits global security); any role may call it
- No additional `@PreAuthorize` annotation needed

### `LookupController` (new)
- Implements generated `LookupsApi` interface
- `GET /lookups/fish-species` → `FishSpeciesService.listActive()`
- `GET /lookups/market-locations` → `MarketLocationService.listActive()`
- Requires valid Bearer token; open to all roles

`SecurityConfig.java` requires **no changes** — all new endpoints require authentication, which is the default.

## Error Handling

No new exception types needed.

| Scenario | Handling |
|----------|----------|
| Entity not found | `ResourceNotFoundException` → existing `GlobalExceptionHandler` → `404` |
| `activeTo` not after `activeFrom` | `IllegalArgumentException` in `AdvisoryService.create` → `400` (add mapping to `GlobalExceptionHandler` if not already present) |
| Validation on request bodies | Existing `@Valid` + `GlobalExceptionHandler` → `400` |

## Testing

| Test class | What it covers |
|------------|----------------|
| `AdvisoryServiceTest` | AND active filter logic with mocked repo; partial update applies only non-null fields; `activeTo > activeFrom` validation throws on violation |
| `FishSpeciesServiceTest` | `delete` sets `active = false`, not a hard delete |
| `MarketLocationServiceTest` | Same soft-delete verification |
| `AdminControllerTest` | Advisory CRUD with seeded admin JWT; asserts `403` for non-admin tokens |
| `AdvisoryControllerTest` | `activeOnly=true` returns only in-range + flagged advisories; severity filter works |

## File Checklist

New files to create:

```
backend/src/main/resources/db/migration/
  V4__create_reference_tables.sql
  V5__create_advisories_table.sql
  V6__seed_reference_data.sql

backend/src/main/java/com/mermaid/app/
  domain/
    FishSpecies.java
    MarketLocation.java
    Advisory.java
  repository/
    FishSpeciesRepository.java
    MarketLocationRepository.java
    AdvisoryRepository.java
  service/
    FishSpeciesService.java
    MarketLocationService.java
    AdvisoryService.java
  mapper/
    FishSpeciesMapper.java
    MarketLocationMapper.java
    AdvisoryMapper.java
  controller/
    AdvisoryController.java
    LookupController.java

backend/src/test/java/com/mermaid/app/
  service/
    AdvisoryServiceTest.java
    FishSpeciesServiceTest.java
    MarketLocationServiceTest.java
  controller/
    AdminControllerTest.java
    AdvisoryControllerTest.java
```

Existing files to modify:

```
backend/src/main/java/com/mermaid/app/controller/AdminController.java
  — remove UnsupportedOperationException stubs, inject and wire three new services

backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java
  — add IllegalArgumentException → 400 mapping if not present
```
