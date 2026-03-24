# Week 4 Backend: Vendor Demand Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement vendor demand listings CRUD — 6 endpoints for Rosario to post, edit, close, and delete her fish purchase requests.

**Architecture:** Service-repository-mapper triad following the established Advisory pattern. `DemandListingMapper` takes `vendorName` as a parameter (not injected repo) to avoid N+1. Repository uses `@EntityGraph` on list queries only; single-row queries rely on Hibernate LAZY access (negligible for one row). Ownership is enforced at the repository query level — `findByIdAndVendorIdAndIsDeletedFalse` prevents a vendor from confirming another vendor's listing exists.

**Tech Stack:** Spring Boot 3 / Java 21, Spring Data JPA, Spring Security (JWT / `@PreAuthorize`), OpenAPI-first (`api.yaml` → Maven plugin → generated interfaces), Flyway migrations, JUnit 5 / Mockito, MockMvc.

---

## File Map

### New files
```
backend/src/main/resources/db/migration/V7__create_demand_listings.sql
backend/src/main/java/com/mermaid/app/exception/ListingClosedException.java
backend/src/main/java/com/mermaid/app/security/SecurityUtils.java
backend/src/main/java/com/mermaid/app/domain/DemandListing.java
backend/src/main/java/com/mermaid/app/repository/DemandListingRepository.java
backend/src/main/java/com/mermaid/app/mapper/DemandListingMapper.java
backend/src/main/java/com/mermaid/app/service/DemandListingService.java
backend/src/main/java/com/mermaid/app/controller/VendorDemandListingController.java
backend/src/test/java/com/mermaid/app/service/DemandListingServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorDemandListingControllerTest.java
```

### Modified files
```
backend/src/main/resources/openapi/api.yaml
  — remove `status` field from DemandListingUpdateRequest schema (lines 1373-1374)
backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java
  — add ListingClosedException → 409 handler
  — add MethodArgumentTypeMismatchException → 400 handler
backend/src/main/java/com/mermaid/app/controller/AdminController.java
  — replace inline Long.parseLong(...) with SecurityUtils.currentUserId()
```

---

## Task 1: Remove `status` from `DemandListingUpdateRequest` in `api.yaml`

The `DemandListingUpdateRequest` schema currently advertises a `status` field that the service silently ignores. Remove it before writing any code so the generated class never has it.

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml` (lines 1373-1374)

- [ ] **Step 1: Delete the `status` property from `DemandListingUpdateRequest`**

  In `api.yaml`, find the `DemandListingUpdateRequest` schema (around line 1348). It ends with:
  ```yaml
        neededBy:
          type: string
          format: date-time
          nullable: true
        status:
          $ref: '#/components/schemas/DemandListingStatus'
  ```
  Delete the `status` block (the two lines `status:` and `$ref: ...`). The schema should end at `neededBy`.

- [ ] **Step 2: Regenerate sources**

  ```bash
  cd backend
  ./mvnw generate-sources -q
  ```
  Expected: BUILD SUCCESS. No errors.

- [ ] **Step 3: Verify `status` is gone from the generated class**

  ```bash
  grep -n "status" backend/target/generated-sources/openapi/src/main/java/com/mermaid/app/model/DemandListingUpdateRequest.java
  ```
  Expected: **no output** (the field is gone).

- [ ] **Step 4: Verify existing tests still pass**

  ```bash
  cd backend
  ./mvnw test -q
  ```
  Expected: BUILD SUCCESS. All 16 existing tests green.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/resources/openapi/api.yaml
  git commit -m "fix: remove status field from DemandListingUpdateRequest schema"
  ```

---

## Task 2: Flyway migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V7__create_demand_listings.sql`

- [ ] **Step 1: Create the migration file**

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

  > FK constraints use PostgreSQL default `ON DELETE NO ACTION` (implicit). Users and species/locations are deactivated, never hard-deleted — this is intentional. `NO ACTION` is a safety net against accidental raw SQL deletes.

- [ ] **Step 2: Commit**

  ```bash
  git add backend/src/main/resources/db/migration/V7__create_demand_listings.sql
  git commit -m "feat: add V7 demand_listings migration with indexes and check constraints"
  ```

  > The migration runs automatically on next app startup via Flyway. No manual SQL execution needed.

---

## Task 3: Foundation classes — `ListingClosedException` and `SecurityUtils`

Two small, dependency-free files. No tests needed for these (trivial constructors/static methods).

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/exception/ListingClosedException.java`
- Create: `backend/src/main/java/com/mermaid/app/security/SecurityUtils.java`

- [ ] **Step 1: Create `ListingClosedException`**

  ```java
  package com.mermaid.app.exception;

  public class ListingClosedException extends RuntimeException {
      public ListingClosedException(Long listingId) {
          super("Demand listing " + listingId + " is closed and cannot be modified");
      }
  }
  ```

- [ ] **Step 2: Create `SecurityUtils`**

  ```java
  package com.mermaid.app.security;

  import org.springframework.security.core.context.SecurityContextHolder;

  public final class SecurityUtils {
      private SecurityUtils() {}

      public static Long currentUserId() {
          return Long.parseLong(
              SecurityContextHolder.getContext().getAuthentication().getName());
      }
  }
  ```

  > The JWT subject is always the numeric user ID (`String.valueOf(user.getId())` in `JwtTokenService`). Parsing as `Long` is correct by contract.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/exception/ListingClosedException.java \
          backend/src/main/java/com/mermaid/app/security/SecurityUtils.java
  git commit -m "feat: add ListingClosedException and SecurityUtils"
  ```

---

## Task 4: Extend `GlobalExceptionHandler` + refactor `AdminController`

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/AdminController.java`

- [ ] **Step 1: Add two handlers to `GlobalExceptionHandler`**

  Add these two methods after the existing `handleMarineServiceUnavailable` handler, before the private `errorResponse` helper:

  ```java
  @ExceptionHandler(ListingClosedException.class)
  public ResponseEntity<ErrorResponse> handleListingClosed(
          ListingClosedException ex, HttpServletRequest request) {
      ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
      return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ErrorResponse> handleTypeMismatch(
          org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex,
          HttpServletRequest request) {
      String message = String.format("Invalid value '%s' for parameter '%s'", ex.getValue(), ex.getName());
      ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.BAD_REQUEST, message);
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }
  ```

  Also add the import at the top of the file:
  ```java
  import com.mermaid.app.exception.ListingClosedException;
  ```

- [ ] **Step 2: Refactor `AdminController` to use `SecurityUtils`**

  In `AdminController`, replace the inline extraction in `adminCreateAdvisory`:

  **Before:**
  ```java
  import org.springframework.security.core.context.SecurityContextHolder;
  // ...
  Long adminUserId = Long.parseLong(
      SecurityContextHolder.getContext().getAuthentication().getName());
  ```

  **After:**
  ```java
  import com.mermaid.app.security.SecurityUtils;
  // ...
  Long adminUserId = SecurityUtils.currentUserId();
  ```

  Remove the `import org.springframework.security.core.context.SecurityContextHolder;` line from `AdminController.java` — it's no longer needed there.

- [ ] **Step 3: Run existing tests to confirm nothing broke**

  ```bash
  cd backend
  ./mvnw test -q
  ```
  Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java \
          backend/src/main/java/com/mermaid/app/controller/AdminController.java
  git commit -m "feat: add ListingClosed/TypeMismatch handlers; use SecurityUtils in AdminController"
  ```

---

## Task 5: `DemandListing` entity + `DemandListingRepository`

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/DemandListing.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/DemandListingRepository.java`

- [ ] **Step 1: Create the entity**

  ```java
  package com.mermaid.app.domain;

  import com.mermaid.app.model.DemandListingStatus;
  import jakarta.persistence.*;
  import java.math.BigDecimal;
  import java.time.OffsetDateTime;

  @Entity
  @Table(name = "demand_listings")
  public class DemandListing {

      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @Column(name = "vendor_id", nullable = false)
      private Long vendorId;

      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "species_id", nullable = false)
      private FishSpecies species;

      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "location_id", nullable = false)
      private MarketLocation location;

      @Column(name = "quantity_kg", nullable = false, precision = 10, scale = 2)
      private BigDecimal quantityKg;

      @Column(name = "offer_price_per_kg", nullable = false, precision = 10, scale = 2)
      private BigDecimal offerPricePerKg;

      @Column(columnDefinition = "TEXT")
      private String notes;

      @Column(name = "needed_by")
      private OffsetDateTime neededBy;

      @Enumerated(EnumType.STRING)
      @Column(nullable = false, length = 10)
      private DemandListingStatus status = DemandListingStatus.OPEN;

      @Column(name = "is_deleted", nullable = false)
      private boolean isDeleted = false;

      @Column(name = "posted_at", nullable = false)
      private OffsetDateTime postedAt;

      @Column(name = "updated_at")
      private OffsetDateTime updatedAt;

      @PrePersist
      protected void onCreate() {
          if (postedAt == null) postedAt = OffsetDateTime.now();
      }

      @PreUpdate
      protected void onUpdate() {
          updatedAt = OffsetDateTime.now();
      }

      public Long getId() { return id; }
      public void setId(Long id) { this.id = id; }
      public Long getVendorId() { return vendorId; }
      public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
      public FishSpecies getSpecies() { return species; }
      public void setSpecies(FishSpecies species) { this.species = species; }
      public MarketLocation getLocation() { return location; }
      public void setLocation(MarketLocation location) { this.location = location; }
      public BigDecimal getQuantityKg() { return quantityKg; }
      public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
      public BigDecimal getOfferPricePerKg() { return offerPricePerKg; }
      public void setOfferPricePerKg(BigDecimal offerPricePerKg) { this.offerPricePerKg = offerPricePerKg; }
      public String getNotes() { return notes; }
      public void setNotes(String notes) { this.notes = notes; }
      public OffsetDateTime getNeededBy() { return neededBy; }
      public void setNeededBy(OffsetDateTime neededBy) { this.neededBy = neededBy; }
      public DemandListingStatus getStatus() { return status; }
      public void setStatus(DemandListingStatus status) { this.status = status; }
      public boolean isDeleted() { return isDeleted; }
      public void setDeleted(boolean deleted) { isDeleted = deleted; }
      public OffsetDateTime getPostedAt() { return postedAt; }
      public void setPostedAt(OffsetDateTime postedAt) { this.postedAt = postedAt; }
      public OffsetDateTime getUpdatedAt() { return updatedAt; }
      public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
  }
  ```

  > `quantityKg` and `offerPricePerKg` are `BigDecimal` on the entity (matching `NUMERIC(10,2)` in the DB) but `Double` on the API model (generated from `api.yaml`). The mapper converts between them.

- [ ] **Step 2: Create the repository**

  ```java
  package com.mermaid.app.repository;

  import com.mermaid.app.domain.DemandListing;
  import com.mermaid.app.model.DemandListingStatus;
  import org.springframework.data.jpa.repository.EntityGraph;
  import org.springframework.data.jpa.repository.JpaRepository;

  import java.util.List;
  import java.util.Optional;

  public interface DemandListingRepository extends JpaRepository<DemandListing, Long> {

      @EntityGraph(attributePaths = {"species", "location"})
      List<DemandListing> findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(Long vendorId);

      @EntityGraph(attributePaths = {"species", "location"})
      List<DemandListing> findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
              Long vendorId, DemandListingStatus status);

      Optional<DemandListing> findByIdAndVendorIdAndIsDeletedFalse(Long id, Long vendorId);
  }
  ```

  > The third method combines existence and ownership checks in one query. If the listing belongs to another vendor it returns `Optional.empty()` → service throws `ResourceNotFoundException` → 404. A vendor cannot confirm whether listing ID N exists at all.

- [ ] **Step 3: Verify compilation**

  ```bash
  cd backend
  ./mvnw compile -q
  ```
  Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/domain/DemandListing.java \
          backend/src/main/java/com/mermaid/app/repository/DemandListingRepository.java
  git commit -m "feat: add DemandListing entity and repository"
  ```

---

## Task 6: `DemandListingMapper`

No dedicated test file — mapper logic is covered indirectly by service tests. Verify by reading the output.

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/mapper/DemandListingMapper.java`

- [ ] **Step 1: Create the mapper**

  ```java
  package com.mermaid.app.mapper;

  import com.mermaid.app.domain.DemandListing;
  import org.openapitools.jackson.nullable.JsonNullable;
  import org.springframework.stereotype.Component;

  import java.math.BigDecimal;

  @Component
  public class DemandListingMapper {

      private final FishSpeciesMapper fishSpeciesMapper;
      private final MarketLocationMapper marketLocationMapper;

      public DemandListingMapper(FishSpeciesMapper fishSpeciesMapper,
                                  MarketLocationMapper marketLocationMapper) {
          this.fishSpeciesMapper = fishSpeciesMapper;
          this.marketLocationMapper = marketLocationMapper;
      }

      public com.mermaid.app.model.DemandListing toModel(DemandListing entity, String vendorName) {
          com.mermaid.app.model.DemandListing m = new com.mermaid.app.model.DemandListing(
              entity.getId(),
              entity.getVendorId(),
              fishSpeciesMapper.toModel(entity.getSpecies()),
              marketLocationMapper.toModel(entity.getLocation()),
              toDouble(entity.getQuantityKg()),
              toDouble(entity.getOfferPricePerKg()),
              entity.getStatus(),
              entity.getPostedAt()
          );
          m.setVendorName(JsonNullable.of(vendorName));
          m.setNotes(JsonNullable.of(entity.getNotes()));
          m.setNeededBy(JsonNullable.of(entity.getNeededBy()));
          m.setUpdatedAt(JsonNullable.of(entity.getUpdatedAt()));
          return m;
      }

      private static Double toDouble(BigDecimal value) {
          return value == null ? null : value.doubleValue();
      }
  }
  ```

  > `vendorName` is `null` when `userRepo.findById(vendorId)` returns empty. `JsonNullable.of(null)` serializes as JSON `null` — valid since `vendorName` is `nullable: true` in the schema.

- [ ] **Step 2: Compile**

  ```bash
  cd backend
  ./mvnw compile -q
  ```
  Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/mapper/DemandListingMapper.java
  git commit -m "feat: add DemandListingMapper"
  ```

---

## Task 7: `DemandListingService` (TDD)

Write all 17 failing tests first, then implement the service to make them pass. Tests are grouped by operation.

**Files:**
- Create: `backend/src/test/java/com/mermaid/app/service/DemandListingServiceTest.java`
- Create: `backend/src/main/java/com/mermaid/app/service/DemandListingService.java`

- [ ] **Step 1: Write the full test class**

  ```java
  package com.mermaid.app.service;

  import com.mermaid.app.domain.DemandListing;
  import com.mermaid.app.domain.FishSpecies;
  import com.mermaid.app.domain.MarketLocation;
  import com.mermaid.app.domain.User;
  import com.mermaid.app.exception.ListingClosedException;
  import com.mermaid.app.exception.ResourceNotFoundException;
  import com.mermaid.app.mapper.DemandListingMapper;
  import com.mermaid.app.model.DemandListingCreateRequest;
  import com.mermaid.app.model.DemandListingStatus;
  import com.mermaid.app.model.DemandListingUpdateRequest;
  import com.mermaid.app.repository.DemandListingRepository;
  import com.mermaid.app.repository.FishSpeciesRepository;
  import com.mermaid.app.repository.MarketLocationRepository;
  import com.mermaid.app.repository.UserRepository;
  import org.junit.jupiter.api.Test;
  import org.junit.jupiter.api.extension.ExtendWith;
  import org.mockito.InjectMocks;
  import org.mockito.Mock;
  import org.mockito.junit.jupiter.MockitoExtension;

  import java.math.BigDecimal;
  import java.time.OffsetDateTime;
  import java.util.List;
  import java.util.Optional;

  import static org.junit.jupiter.api.Assertions.*;
  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.ArgumentMatchers.eq;
  import static org.mockito.Mockito.*;

  @ExtendWith(MockitoExtension.class)
  class DemandListingServiceTest {

      @Mock DemandListingRepository repo;
      @Mock DemandListingMapper mapper;
      @Mock FishSpeciesRepository speciesRepo;
      @Mock MarketLocationRepository locationRepo;
      @Mock UserRepository userRepo;
      @InjectMocks DemandListingService service;

      // --- listOwn ---

      @Test
      void listOwn_noFilter_returnsAllNonDeleted() {
          DemandListing e = openListing(1L, 10L);
          when(repo.findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(10L))
              .thenReturn(List.of(e));
          when(userRepo.findById(10L)).thenReturn(Optional.empty());
          when(mapper.toModel(e, null)).thenReturn(modelListing(1L));

          List<com.mermaid.app.model.DemandListing> result = service.listOwn(10L, null);

          assertEquals(1, result.size());
          verify(repo).findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(10L);
          verify(repo, never()).findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(any(), any());
      }

      @Test
      void listOwn_withStatusFilter_delegatesFilteredQuery() {
          DemandListing e = openListing(1L, 10L);
          when(repo.findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(
                  10L, DemandListingStatus.OPEN))
              .thenReturn(List.of(e));
          when(userRepo.findById(10L)).thenReturn(Optional.empty());
          when(mapper.toModel(e, null)).thenReturn(modelListing(1L));

          List<com.mermaid.app.model.DemandListing> result = service.listOwn(10L, DemandListingStatus.OPEN);

          assertEquals(1, result.size());
          verify(repo, never()).findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(any());
      }

      @Test
      void listOwn_vendorNameNull_mapsToNullVendorName() {
          DemandListing e = openListing(1L, 10L);
          when(repo.findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(10L))
              .thenReturn(List.of(e));
          when(userRepo.findById(10L)).thenReturn(Optional.empty());
          when(mapper.toModel(e, null)).thenReturn(modelListing(1L));

          // must not throw — null vendorName is valid
          assertDoesNotThrow(() -> service.listOwn(10L, null));
          verify(mapper).toModel(e, null);
      }

      // --- create ---

      @Test
      void create_validRequest_savesAndReturnsModel() {
          FishSpecies species = speciesEntity(2L);
          MarketLocation location = locationEntity(3L);
          when(speciesRepo.findById(2L)).thenReturn(Optional.of(species));
          when(locationRepo.findById(3L)).thenReturn(Optional.of(location));
          DemandListing saved = openListing(1L, 42L);
          when(repo.save(any())).thenReturn(saved);
          when(userRepo.findById(42L)).thenReturn(Optional.empty());
          when(mapper.toModel(saved, null)).thenReturn(modelListing(1L));

          com.mermaid.app.model.DemandListing result =
              service.create(createRequest(2L, 3L), 42L);

          assertNotNull(result);
          verify(repo).save(any());
      }

      @Test
      void create_speciesNotFound_throwsResourceNotFoundException() {
          when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

          assertThrows(ResourceNotFoundException.class,
              () -> service.create(createRequest(99L, 3L), 1L));
          verify(repo, never()).save(any());
      }

      @Test
      void create_locationNotFound_throwsResourceNotFoundException() {
          when(speciesRepo.findById(2L)).thenReturn(Optional.of(speciesEntity(2L)));
          when(locationRepo.findById(99L)).thenReturn(Optional.empty());

          assertThrows(ResourceNotFoundException.class,
              () -> service.create(createRequest(2L, 99L), 1L));
          verify(repo, never()).save(any());
      }

      // --- update ---

      @Test
      void update_openListing_appliesNonNullFieldsOnly() {
          DemandListing entity = openListing(1L, 10L);
          entity.setQuantityKg(new BigDecimal("5.00"));
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
          when(repo.save(entity)).thenReturn(entity);
          when(userRepo.findById(10L)).thenReturn(Optional.empty());
          when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

          DemandListingUpdateRequest req = new DemandListingUpdateRequest();
          req.setQuantityKg(10.0);
          // speciesId intentionally not set — must not throw

          service.update(1L, 10L, req);

          assertEquals(new BigDecimal("10.0"), entity.getQuantityKg());
          verify(speciesRepo, never()).findById(any());
      }

      @Test
      void update_newSpeciesNotFound_throwsResourceNotFoundException() {
          DemandListing entity = openListing(1L, 10L);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
          when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

          DemandListingUpdateRequest req = new DemandListingUpdateRequest();
          req.setSpeciesId(99L);

          assertThrows(ResourceNotFoundException.class, () -> service.update(1L, 10L, req));
          verify(repo, never()).save(any());
      }

      @Test
      void update_newLocationNotFound_throwsResourceNotFoundException() {
          DemandListing entity = openListing(1L, 10L);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
          when(locationRepo.findById(99L)).thenReturn(Optional.empty());

          DemandListingUpdateRequest req = new DemandListingUpdateRequest();
          req.setLocationId(99L);

          assertThrows(ResourceNotFoundException.class, () -> service.update(1L, 10L, req));
          verify(repo, never()).save(any());
      }

      @Test
      void update_closedListing_throwsListingClosedException() {
          DemandListing entity = openListing(1L, 10L);
          entity.setStatus(DemandListingStatus.CLOSED);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));

          assertThrows(ListingClosedException.class,
              () -> service.update(1L, 10L, new DemandListingUpdateRequest()));
          verify(repo, never()).save(any());
      }

      @Test
      void update_notOwned_throwsResourceNotFoundException() {
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.empty());

          assertThrows(ResourceNotFoundException.class,
              () -> service.update(1L, 10L, new DemandListingUpdateRequest()));
      }

      // --- delete ---

      @Test
      void delete_softDeletesRow_neverCallsDeleteById() {
          DemandListing entity = openListing(1L, 10L);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));

          service.delete(1L, 10L);

          assertTrue(entity.isDeleted());
          verify(repo).save(entity);
          verify(repo, never()).deleteById(any());
          verify(repo, never()).delete(any());
      }

      @Test
      void delete_closedListing_softDeletesSuccessfully() {
          DemandListing entity = openListing(1L, 10L);
          entity.setStatus(DemandListingStatus.CLOSED);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));

          // should NOT throw — CLOSED listings can be deleted
          assertDoesNotThrow(() -> service.delete(1L, 10L));
          assertTrue(entity.isDeleted());
      }

      @Test
      void delete_alreadySoftDeleted_throwsResourceNotFoundException() {
          // repo filters is_deleted=false, so already-deleted listings return empty
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.empty());

          assertThrows(ResourceNotFoundException.class, () -> service.delete(1L, 10L));
      }

      @Test
      void getById_softDeleted_throwsResourceNotFoundException() {
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.empty());

          assertThrows(ResourceNotFoundException.class, () -> service.getById(1L, 10L));
      }

      // --- close ---

      @Test
      void close_openListing_setsStatusClosed() {
          DemandListing entity = openListing(1L, 10L);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
          when(repo.save(entity)).thenReturn(entity);
          when(userRepo.findById(10L)).thenReturn(Optional.empty());
          when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

          service.close(1L, 10L);

          assertEquals(DemandListingStatus.CLOSED, entity.getStatus());
          verify(repo).save(entity);
      }

      @Test
      void close_alreadyClosed_isIdempotent() {
          DemandListing entity = openListing(1L, 10L);
          entity.setStatus(DemandListingStatus.CLOSED);
          when(repo.findByIdAndVendorIdAndIsDeletedFalse(1L, 10L)).thenReturn(Optional.of(entity));
          when(userRepo.findById(10L)).thenReturn(Optional.empty());
          when(mapper.toModel(entity, null)).thenReturn(modelListing(1L));

          service.close(1L, 10L);

          // no save call — avoids spurious updated_at bump
          verify(repo, never()).save(any());
      }

      // --- helpers ---

      private DemandListing openListing(Long id, Long vendorId) {
          DemandListing e = new DemandListing();
          e.setId(id);
          e.setVendorId(vendorId);
          e.setSpecies(speciesEntity(2L));
          e.setLocation(locationEntity(3L));
          e.setQuantityKg(new BigDecimal("5.00"));
          e.setOfferPricePerKg(new BigDecimal("150.00"));
          e.setStatus(DemandListingStatus.OPEN);
          e.setPostedAt(OffsetDateTime.now());
          return e;
      }

      private FishSpecies speciesEntity(Long id) {
          FishSpecies s = new FishSpecies();
          s.setId(id);
          s.setCommonName("Bangus");
          return s;
      }

      private MarketLocation locationEntity(Long id) {
          MarketLocation l = new MarketLocation();
          l.setId(id);
          l.setName("Carbon Market");
          l.setMunicipality("Cebu City");
          return l;
      }

      private DemandListingCreateRequest createRequest(Long speciesId, Long locationId) {
          return new DemandListingCreateRequest(speciesId, locationId, 5.0, 150.0);
      }

      private com.mermaid.app.model.DemandListing modelListing(Long id) {
          return new com.mermaid.app.model.DemandListing(
              id, 10L,
              new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
              new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
              5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
      }
  }
  ```

- [ ] **Step 2: Run tests — confirm they all fail (class not found)**

  ```bash
  cd backend
  ./mvnw test -Dtest=DemandListingServiceTest -q 2>&1 | tail -5
  ```
  Expected: FAILURE — `DemandListingService` does not exist yet.

- [ ] **Step 3: Write the service**

  ```java
  package com.mermaid.app.service;

  import com.mermaid.app.domain.DemandListing;
  import com.mermaid.app.domain.FishSpecies;
  import com.mermaid.app.domain.MarketLocation;
  import com.mermaid.app.exception.ListingClosedException;
  import com.mermaid.app.exception.ResourceNotFoundException;
  import com.mermaid.app.mapper.DemandListingMapper;
  import com.mermaid.app.model.DemandListingCreateRequest;
  import com.mermaid.app.model.DemandListingStatus;
  import com.mermaid.app.model.DemandListingUpdateRequest;
  import com.mermaid.app.repository.DemandListingRepository;
  import com.mermaid.app.repository.FishSpeciesRepository;
  import com.mermaid.app.repository.MarketLocationRepository;
  import com.mermaid.app.repository.UserRepository;
  import org.springframework.stereotype.Service;
  import org.springframework.transaction.annotation.Transactional;

  import java.math.BigDecimal;
  import java.util.List;
  import java.util.stream.Collectors;

  @Service
  public class DemandListingService {

      private final DemandListingRepository repo;
      private final DemandListingMapper mapper;
      private final FishSpeciesRepository speciesRepo;
      private final MarketLocationRepository locationRepo;
      private final UserRepository userRepo;

      public DemandListingService(DemandListingRepository repo,
                                   DemandListingMapper mapper,
                                   FishSpeciesRepository speciesRepo,
                                   MarketLocationRepository locationRepo,
                                   UserRepository userRepo) {
          this.repo = repo;
          this.mapper = mapper;
          this.speciesRepo = speciesRepo;
          this.locationRepo = locationRepo;
          this.userRepo = userRepo;
      }

      @Transactional(readOnly = true)
      public List<com.mermaid.app.model.DemandListing> listOwn(Long vendorId, DemandListingStatus statusFilter) {
          List<DemandListing> entities = statusFilter == null
              ? repo.findAllByVendorIdAndIsDeletedFalseOrderByPostedAtDescIdDesc(vendorId)
              : repo.findAllByVendorIdAndStatusAndIsDeletedFalseOrderByPostedAtDescIdDesc(vendorId, statusFilter);

          String vendorName = userRepo.findById(vendorId)
              .map(u -> u.getFullName())
              .orElse(null);

          return entities.stream()
              .map(e -> mapper.toModel(e, vendorName))
              .collect(Collectors.toList());
      }

      @Transactional
      public com.mermaid.app.model.DemandListing create(DemandListingCreateRequest request, Long vendorId) {
          FishSpecies species = speciesRepo.findById(request.getSpeciesId())
              .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + request.getSpeciesId()));
          MarketLocation location = locationRepo.findById(request.getLocationId())
              .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + request.getLocationId()));

          DemandListing entity = new DemandListing();
          entity.setVendorId(vendorId);
          entity.setSpecies(species);
          entity.setLocation(location);
          entity.setQuantityKg(BigDecimal.valueOf(request.getQuantityKg()));
          entity.setOfferPricePerKg(BigDecimal.valueOf(request.getOfferPricePerKg()));
          if (request.getNotes().isPresent())    entity.setNotes(request.getNotes().get());
          if (request.getNeededBy().isPresent()) entity.setNeededBy(request.getNeededBy().get());

          DemandListing saved = repo.save(entity);
          String vendorName = userRepo.findById(vendorId).map(u -> u.getFullName()).orElse(null);
          return mapper.toModel(saved, vendorName);
      }

      @Transactional(readOnly = true)
      public com.mermaid.app.model.DemandListing getById(Long listingId, Long vendorId) {
          DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
              .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));
          String vendorName = userRepo.findById(vendorId).map(u -> u.getFullName()).orElse(null);
          return mapper.toModel(entity, vendorName);
      }

      @Transactional
      public com.mermaid.app.model.DemandListing update(Long listingId, Long vendorId,
                                                          DemandListingUpdateRequest request) {
          DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
              .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));

          if (entity.getStatus() == DemandListingStatus.CLOSED) {
              throw new ListingClosedException(listingId);
          }

          if (request.getSpeciesId() != null) {
              FishSpecies species = speciesRepo.findById(request.getSpeciesId())
                  .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + request.getSpeciesId()));
              entity.setSpecies(species);
          }
          if (request.getLocationId() != null) {
              MarketLocation location = locationRepo.findById(request.getLocationId())
                  .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + request.getLocationId()));
              entity.setLocation(location);
          }
          if (request.getQuantityKg() != null)      entity.setQuantityKg(BigDecimal.valueOf(request.getQuantityKg()));
          if (request.getOfferPricePerKg() != null) entity.setOfferPricePerKg(BigDecimal.valueOf(request.getOfferPricePerKg()));
          if (request.getNotes().isPresent())        entity.setNotes(request.getNotes().get());
          if (request.getNeededBy().isPresent())     entity.setNeededBy(request.getNeededBy().get());

          DemandListing saved = repo.save(entity);
          String vendorName = userRepo.findById(vendorId).map(u -> u.getFullName()).orElse(null);
          return mapper.toModel(saved, vendorName);
      }

      @Transactional
      public void delete(Long listingId, Long vendorId) {
          DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
              .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));
          entity.setDeleted(true);
          repo.save(entity);
      }

      @Transactional
      public com.mermaid.app.model.DemandListing close(Long listingId, Long vendorId) {
          DemandListing entity = repo.findByIdAndVendorIdAndIsDeletedFalse(listingId, vendorId)
              .orElseThrow(() -> new ResourceNotFoundException("Demand listing not found: " + listingId));

          String vendorName = userRepo.findById(vendorId).map(u -> u.getFullName()).orElse(null);

          if (entity.getStatus() == DemandListingStatus.CLOSED) {
              // idempotent: already closed — return without saving (no updated_at bump)
              return mapper.toModel(entity, vendorName);
          }

          entity.setStatus(DemandListingStatus.CLOSED);
          return mapper.toModel(repo.save(entity), vendorName);
      }
  }
  ```

  > **Note on `DemandListingUpdateRequest.notes` and `neededBy`:** These fields are `JsonNullable` in the generated class. `isPresent()` returns `true` only when the client explicitly sent the field (even if `null`). This mirrors the existing pattern in `AdvisoryService.update`.

- [ ] **Step 4: Run tests — confirm all 17 pass**

  ```bash
  cd backend
  ./mvnw test -Dtest=DemandListingServiceTest -q
  ```
  Expected: BUILD SUCCESS. `Tests run: 17, Failures: 0`.

- [ ] **Step 5: Run the full test suite**

  ```bash
  cd backend
  ./mvnw test -q
  ```
  Expected: BUILD SUCCESS. All existing tests still green.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/test/java/com/mermaid/app/service/DemandListingServiceTest.java \
          backend/src/main/java/com/mermaid/app/service/DemandListingService.java
  git commit -m "feat: add DemandListingService with 17 unit tests"
  ```

---

## Task 8: `VendorDemandListingController` (TDD)

**Files:**
- Create: `backend/src/test/java/com/mermaid/app/controller/VendorDemandListingControllerTest.java`
- Create: `backend/src/main/java/com/mermaid/app/controller/VendorDemandListingController.java`

- [ ] **Step 1: Write the full controller test class**

  ```java
  package com.mermaid.app.controller;

  import com.fasterxml.jackson.databind.ObjectMapper;
  import com.fasterxml.jackson.databind.SerializationFeature;
  import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
  import com.mermaid.app.model.*;
  import com.mermaid.app.service.DemandListingService;
  import org.junit.jupiter.api.Test;
  import org.openapitools.jackson.nullable.JsonNullableModule;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.context.TestConfiguration;
  import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
  import org.springframework.context.annotation.Bean;
  import org.springframework.context.annotation.Import;
  import org.springframework.http.MediaType;
  import org.springframework.security.oauth2.jwt.JwtDecoder;
  import org.springframework.test.context.bean.override.mockito.MockitoBean;
  import org.springframework.test.web.servlet.MockMvc;

  import java.time.OffsetDateTime;
  import java.util.List;

  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.ArgumentMatchers.eq;
  import static org.mockito.Mockito.when;
  import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

  @WebMvcTest(VendorDemandListingController.class)
  @Import(VendorDemandListingControllerTest.TestConfig.class)
  class VendorDemandListingControllerTest {

      @TestConfiguration
      static class TestConfig {
          @Bean
          public com.fasterxml.jackson.databind.Module jsonNullableModule() {
              return new JsonNullableModule();
          }
      }

      @Autowired MockMvc mockMvc;

      private final ObjectMapper objectMapper = new ObjectMapper()
          .registerModule(new JavaTimeModule())
          .registerModule(new JsonNullableModule())
          .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

      @MockitoBean DemandListingService demandListingService;
      @MockitoBean JwtDecoder jwtDecoder;

      // --- list ---

      @Test
      void list_asVendor_returns200() throws Exception {
          when(demandListingService.listOwn(eq(1L), any())).thenReturn(List.of(sampleListing()));

          mockMvc.perform(get("/vendor/demand-listings")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isOk())
                 .andExpect(jsonPath("$[0].id").value(1));
      }

      @Test
      void list_asNonVendor_returns403() throws Exception {
          mockMvc.perform(get("/vendor/demand-listings")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_FISHERMAN")))))
                 .andExpect(status().isForbidden());
      }

      @Test
      void list_invalidStatusParam_returns400() throws Exception {
          mockMvc.perform(get("/vendor/demand-listings?status=BOGUS")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isBadRequest());
      }

      // --- create ---

      @Test
      void create_validRequest_returns201() throws Exception {
          DemandListingCreateRequest request = new DemandListingCreateRequest(2L, 3L, 5.0, 150.0);
          when(demandListingService.create(any(), eq(1L))).thenReturn(sampleListing());

          mockMvc.perform(post("/vendor/demand-listings")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR"))))
                 .contentType(MediaType.APPLICATION_JSON)
                 .content(objectMapper.writeValueAsString(request)))
                 .andExpect(status().isCreated())
                 .andExpect(jsonPath("$.id").value(1));
      }

      @Test
      void create_missingSpeciesId_returns400() throws Exception {
          // speciesId is required — send a body without it
          String body = "{\"locationId\":3,\"quantityKg\":5.0,\"offerPricePerKg\":150.0}";

          mockMvc.perform(post("/vendor/demand-listings")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR"))))
                 .contentType(MediaType.APPLICATION_JSON)
                 .content(body))
                 .andExpect(status().isBadRequest());
      }

      @Test
      void create_belowMinQuantity_returns400() throws Exception {
          // quantityKg: 0.0 violates @DecimalMin("0.1")
          DemandListingCreateRequest request = new DemandListingCreateRequest(2L, 3L, 0.0, 150.0);

          mockMvc.perform(post("/vendor/demand-listings")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR"))))
                 .contentType(MediaType.APPLICATION_JSON)
                 .content(objectMapper.writeValueAsString(request)))
                 .andExpect(status().isBadRequest());
      }

      // --- getById ---

      @Test
      void getById_notFound_returns404() throws Exception {
          when(demandListingService.getById(eq(99L), eq(1L)))
              .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("Demand listing not found: 99"));

          mockMvc.perform(get("/vendor/demand-listings/99")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isNotFound());
      }

      @Test
      void getById_invalidIdFormat_returns400() throws Exception {
          mockMvc.perform(get("/vendor/demand-listings/abc")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isBadRequest());
      }

      // --- update ---

      @Test
      void update_closedListing_returns409() throws Exception {
          when(demandListingService.update(eq(1L), eq(1L), any()))
              .thenThrow(new com.mermaid.app.exception.ListingClosedException(1L));

          mockMvc.perform(put("/vendor/demand-listings/1")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR"))))
                 .contentType(MediaType.APPLICATION_JSON)
                 .content("{}"))
                 .andExpect(status().isConflict());
      }

      // --- delete ---

      @Test
      void delete_notFound_returns404() throws Exception {
          org.mockito.Mockito.doThrow(
              new com.mermaid.app.exception.ResourceNotFoundException("Demand listing not found: 99"))
              .when(demandListingService).delete(99L, 1L);

          mockMvc.perform(delete("/vendor/demand-listings/99")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isNotFound());
      }

      // --- close ---

      @Test
      void close_returns200() throws Exception {
          when(demandListingService.close(eq(1L), eq(1L))).thenReturn(sampleListing());

          mockMvc.perform(post("/vendor/demand-listings/1/close")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isOk())
                 .andExpect(jsonPath("$.id").value(1));
      }

      @Test
      void close_notFound_returns404() throws Exception {
          when(demandListingService.close(eq(99L), eq(1L)))
              .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("Demand listing not found: 99"));

          mockMvc.perform(post("/vendor/demand-listings/99/close")
                 .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_VENDOR")))))
                 .andExpect(status().isNotFound());
      }

      // --- helper ---

      private com.mermaid.app.model.DemandListing sampleListing() {
          return new com.mermaid.app.model.DemandListing(
              1L, 1L,
              new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
              new com.mermaid.app.model.MarketLocation(3L, "Carbon Market", "Cebu City", true),
              5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
      }
  }
  ```

- [ ] **Step 2: Run tests — confirm they fail (controller not found)**

  ```bash
  cd backend
  ./mvnw test -Dtest=VendorDemandListingControllerTest -q 2>&1 | tail -5
  ```
  Expected: FAILURE.

- [ ] **Step 3: Write the controller**

  ```java
  package com.mermaid.app.controller;

  import com.mermaid.app.api.VendorDemandListingsApi;
  import com.mermaid.app.model.DemandListing;
  import com.mermaid.app.model.DemandListingCreateRequest;
  import com.mermaid.app.model.DemandListingStatus;
  import com.mermaid.app.model.DemandListingUpdateRequest;
  import com.mermaid.app.security.SecurityUtils;
  import com.mermaid.app.service.DemandListingService;
  import org.springframework.http.ResponseEntity;
  import org.springframework.security.access.prepost.PreAuthorize;
  import org.springframework.web.bind.annotation.RestController;

  import java.util.List;

  @RestController
  @PreAuthorize("hasRole('VENDOR')")
  public class VendorDemandListingController implements VendorDemandListingsApi {

      private final DemandListingService service;

      public VendorDemandListingController(DemandListingService service) {
          this.service = service;
      }

      @Override
      public ResponseEntity<List<DemandListing>> vendorListDemandListings(DemandListingStatus status) {
          return ResponseEntity.ok(service.listOwn(SecurityUtils.currentUserId(), status));
      }

      @Override
      public ResponseEntity<DemandListing> vendorCreateDemandListing(DemandListingCreateRequest request) {
          return ResponseEntity.status(201).body(service.create(request, SecurityUtils.currentUserId()));
      }

      @Override
      public ResponseEntity<DemandListing> vendorGetDemandListingById(Long listingId) {
          return ResponseEntity.ok(service.getById(listingId, SecurityUtils.currentUserId()));
      }

      @Override
      public ResponseEntity<DemandListing> vendorUpdateDemandListing(Long listingId,
                                                                       DemandListingUpdateRequest request) {
          return ResponseEntity.ok(service.update(listingId, SecurityUtils.currentUserId(), request));
      }

      @Override
      public ResponseEntity<Void> vendorDeleteDemandListing(Long listingId) {
          service.delete(listingId, SecurityUtils.currentUserId());
          return ResponseEntity.noContent().build();
      }

      @Override
      public ResponseEntity<DemandListing> vendorCloseDemandListing(Long listingId) {
          return ResponseEntity.ok(service.close(listingId, SecurityUtils.currentUserId()));
      }
  }
  ```

- [ ] **Step 4: Run controller tests — confirm all 12 pass**

  ```bash
  cd backend
  ./mvnw test -Dtest=VendorDemandListingControllerTest -q
  ```
  Expected: BUILD SUCCESS. `Tests run: 12, Failures: 0`.

- [ ] **Step 5: Run the full test suite**

  ```bash
  cd backend
  ./mvnw test -q
  ```
  Expected: BUILD SUCCESS. All tests green (16 existing + 17 service + 12 controller = 45).

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/test/java/com/mermaid/app/controller/VendorDemandListingControllerTest.java \
          backend/src/main/java/com/mermaid/app/controller/VendorDemandListingController.java
  git commit -m "feat: add VendorDemandListingController with 12 controller tests"
  ```

---

## Done

All 8 tasks produce a fully-tested vendor demand listings backend:

- 1 Flyway migration with indexes and check constraints
- 6 new source files + 3 modified files
- 29 new tests (17 service + 12 controller), all passing
- Full soft-delete, ownership enforcement, idempotent close, 409 on update-closed-listing
