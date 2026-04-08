# Marketplace Browse & Express Interest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Marketplace page where fishermen can browse vendor demand listings, expand rows for details, and express interest with a short message.

**Architecture:** API-first: add endpoints to `api.yaml` first and run codegen before touching Java. Backend follows the existing Service–Repository–Mapper triad. Frontend is a new `Marketplace.jsx` component wired into the existing sidebar navigation in `FishermanDashboard.jsx`.

**Tech Stack:** Spring Boot 3 (Java), OpenAPI 7.20.0 codegen, JPA/Hibernate, PostgreSQL/Flyway, React/Vite

**Spec:** `docs/superpowers/specs/2026-04-01-marketplace-browse-interest-design.md`

---

## File Map

### Backend — Create
- `backend/src/main/resources/db/migration/V11__listing_interests.sql`
- `backend/src/main/java/com/mermaid/app/domain/ListingInterest.java`
- `backend/src/main/java/com/mermaid/app/repository/ListingInterestRepository.java`
- `backend/src/main/java/com/mermaid/app/exception/DuplicateInterestException.java`
- `backend/src/main/java/com/mermaid/app/service/ListingInterestService.java`
- `backend/src/main/java/com/mermaid/app/mapper/ListingInterestMapper.java`
- `backend/src/test/java/com/mermaid/app/service/ListingInterestServiceTest.java`

### Backend — Modify
- `backend/src/main/resources/openapi/api.yaml` (2 passes: ErrorResponse code field, then new endpoints/schemas)
- `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/mermaid/app/controller/MarketplaceController.java`
- `backend/src/test/java/com/mermaid/app/controller/MarketplaceControllerTest.java`

### Frontend — Create
- `frontend/src/Marketplace.jsx`

### Frontend — Modify
- `frontend/src/FishermanDashboard.jsx`

---

## Task 1: Add `code` field to `ErrorResponse` in api.yaml

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Add `code` property to `ErrorResponse` schema in api.yaml**

  Find the `ErrorResponse:` schema (around line 1595). Add `code` after `path`:

  ```yaml
      path:
        type: string
      code:
        type: string
        nullable: true
  ```

- [ ] **Step 2: Regenerate sources**

  ```bash
  cd backend
  ./mvnw generate-sources
  ```

  Expected: BUILD SUCCESS. The generated `ErrorResponse` class in `target/generated-sources/openapi/src/main/java/com/mermaid/app/model/ErrorResponse.java` now has `setCode()`.

- [ ] **Step 3: Update `GlobalExceptionHandler` to support the code field**

  Add a two-arg overload of `errorResponse` and update `handleListingClosed` to pass the code:

  ```java
  // Replace the private helper at the bottom of GlobalExceptionHandler:

  @ExceptionHandler(ListingClosedException.class)
  public ResponseEntity<ErrorResponse> handleListingClosed(
          ListingClosedException ex, HttpServletRequest request) {
      ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT,
              ex.getMessage(), "LISTING_CLOSED");
      return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  // keep all other handlers as-is, then replace the private helper:
  private static ErrorResponse errorResponse(String path, HttpStatus status, String message) {
      return errorResponse(path, status, message, null);
  }

  private static ErrorResponse errorResponse(String path, HttpStatus status, String message, String code) {
      ErrorResponse r = new ErrorResponse();
      r.setTimestamp(OffsetDateTime.now());
      r.setStatus(status.value());
      r.setError(status.getReasonPhrase());
      r.setMessage(message);
      r.setPath(path);
      if (code != null) r.setCode(JsonNullable.of(code));
      return r;
  }
  ```

  Note: `code` is nullable in the schema so it will be `JsonNullable<String>`. Add import `org.openapitools.jackson.nullable.JsonNullable`.

- [ ] **Step 4: Run all existing backend tests**

  ```bash
  cd backend
  ./mvnw test
  ```

  Expected: All previously passing tests still pass.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/resources/openapi/api.yaml \
          backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java
  git commit -m "feat: add code field to ErrorResponse; tag LISTING_CLOSED on 409"
  ```

---

## Task 2: Add new API endpoints and schemas to api.yaml

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Add new endpoints after `/marketplace/offers/lookup` (around line 730)**

  ```yaml
    /marketplace/listings/{listingId}/interest:
      post:
        tags: [Marketplace]
        summary: Express interest in a demand listing
        operationId: expressInterestInListing
        parameters:
          - $ref: '#/components/parameters/ListingId'
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListingInterestRequest'
        responses:
          '201':
            description: Interest expressed
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/ListingInterest'
          '404':
            description: Listing not found
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/ErrorResponse'
          '409':
            description: Already interested or listing is closed (check `code` field for DUPLICATE_INTEREST or LISTING_CLOSED)
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/ErrorResponse'

    /marketplace/my-interests:
      get:
        tags: [Marketplace]
        summary: List fisherman's expressed interests
        operationId: getMyInterests
        responses:
          '200':
            description: Expressed interests
            content:
              application/json:
                schema:
                  type: array
                  items:
                    $ref: '#/components/schemas/ListingInterestDetail'
  ```

- [ ] **Step 2: Add new schemas before `ErrorResponse:` in the components/schemas section**

  ```yaml
      ListingInterestRequest:
        type: object
        required: [message]
        properties:
          message:
            type: string
            minLength: 1
            maxLength: 500

      ListingInterest:
        type: object
        required: [id, listingId, fishermanId, message, createdAt]
        properties:
          id:
            type: integer
            format: int64
          listingId:
            type: integer
            format: int64
          fishermanId:
            type: integer
            format: int64
          fishermanName:
            type: string
            nullable: true
          message:
            type: string
          createdAt:
            type: string
            format: date-time

      ListingInterestDetail:
        type: object
        required: [id, message, createdAt, listing]
        properties:
          id:
            type: integer
            format: int64
          message:
            type: string
          createdAt:
            type: string
            format: date-time
          listing:
            $ref: '#/components/schemas/DemandListing'
  ```

- [ ] **Step 3: Regenerate sources**

  ```bash
  cd backend
  ./mvnw generate-sources
  ```

  Expected: BUILD SUCCESS. Verify new interfaces `expressInterestInListing` and `getMyInterests` appear in `target/generated-sources/openapi/.../api/MarketplaceApi.java`.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/main/resources/openapi/api.yaml
  git commit -m "feat: add expressInterest and myInterests endpoints to api.yaml"
  ```

---

## Task 3: Flyway migration V11

**Files:**
- Create: `backend/src/main/resources/db/migration/V11__listing_interests.sql`

- [ ] **Step 1: Create the migration file**

  ```sql
  CREATE TABLE listing_interests (
      id              BIGSERIAL    PRIMARY KEY,
      listing_id      BIGINT       NOT NULL REFERENCES demand_listings(id),
      fisherman_id    BIGINT       NOT NULL REFERENCES users(id),
      message         VARCHAR(500) NOT NULL,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_listing_fisherman UNIQUE (listing_id, fisherman_id)
  );

  CREATE INDEX idx_listing_interests_fisherman ON listing_interests (fisherman_id);
  CREATE INDEX idx_listing_interests_listing   ON listing_interests (listing_id);
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add backend/src/main/resources/db/migration/V11__listing_interests.sql
  git commit -m "feat: add listing_interests table migration V11"
  ```

---

## Task 4: `ListingInterest` entity + `ListingInterestRepository`

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/ListingInterest.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/ListingInterestRepository.java`

- [ ] **Step 1: Create the entity**

  ```java
  package com.mermaid.app.domain;

  import jakarta.persistence.*;
  import java.time.OffsetDateTime;

  @Entity
  @Table(name = "listing_interests")
  public class ListingInterest {

      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "listing_id", nullable = false)
      private DemandListing listing;

      @Column(name = "fisherman_id", nullable = false)
      private Long fishermanId;

      @Column(nullable = false, length = 500)
      private String message;

      @Column(name = "created_at", nullable = false)
      private OffsetDateTime createdAt;

      @PrePersist
      protected void onCreate() {
          if (createdAt == null) createdAt = OffsetDateTime.now();
      }

      public Long getId()                        { return id; }
      public void setId(Long id)                 { this.id = id; }
      public DemandListing getListing()          { return listing; }
      public void setListing(DemandListing l)    { this.listing = l; }
      public Long getFishermanId()               { return fishermanId; }
      public void setFishermanId(Long id)        { this.fishermanId = id; }
      public String getMessage()                 { return message; }
      public void setMessage(String message)     { this.message = message; }
      public OffsetDateTime getCreatedAt()       { return createdAt; }
      public void setCreatedAt(OffsetDateTime t) { this.createdAt = t; }
  }
  ```

- [ ] **Step 2: Create the repository**

  ```java
  package com.mermaid.app.repository;

  import com.mermaid.app.domain.ListingInterest;
  import org.springframework.data.jpa.repository.JpaRepository;
  import java.util.List;

  public interface ListingInterestRepository extends JpaRepository<ListingInterest, Long> {
      boolean existsByListing_IdAndFishermanId(Long listingId, Long fishermanId);
      List<ListingInterest> findByFishermanIdOrderByCreatedAtDesc(Long fishermanId);
  }
  ```

- [ ] **Step 3: Compile to verify**

  ```bash
  cd backend
  ./mvnw compile
  ```

  Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/domain/ListingInterest.java \
          backend/src/main/java/com/mermaid/app/repository/ListingInterestRepository.java
  git commit -m "feat: add ListingInterest entity and repository"
  ```

---

## Task 5: `DuplicateInterestException` + update `GlobalExceptionHandler`

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/exception/DuplicateInterestException.java`
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Create the exception**

  ```java
  package com.mermaid.app.exception;

  public class DuplicateInterestException extends RuntimeException {
      public DuplicateInterestException(Long listingId) {
          super("You have already expressed interest in listing " + listingId);
      }
  }
  ```

- [ ] **Step 2: Add handler to `GlobalExceptionHandler`**

  Add after the `handleListingClosed` handler:

  ```java
  @ExceptionHandler(DuplicateInterestException.class)
  public ResponseEntity<ErrorResponse> handleDuplicateInterest(
          DuplicateInterestException ex, HttpServletRequest request) {
      ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT,
              ex.getMessage(), "DUPLICATE_INTEREST");
      return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }
  ```

- [ ] **Step 3: Run tests**

  ```bash
  cd backend
  ./mvnw test
  ```

  Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/exception/DuplicateInterestException.java \
          backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java
  git commit -m "feat: add DuplicateInterestException with DUPLICATE_INTEREST code"
  ```

---

## Task 6: `ListingInterestService` + test

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/ListingInterestService.java`
- Create: `backend/src/test/java/com/mermaid/app/service/ListingInterestServiceTest.java`

- [ ] **Step 1: Write the failing service tests first**

  ```java
  package com.mermaid.app.service;

  import com.mermaid.app.domain.DemandListing;
  import com.mermaid.app.domain.ListingInterest;
  import com.mermaid.app.domain.User;
  import com.mermaid.app.exception.DuplicateInterestException;
  import com.mermaid.app.exception.ListingClosedException;
  import com.mermaid.app.exception.ResourceNotFoundException;
  import com.mermaid.app.mapper.ListingInterestMapper;
  import com.mermaid.app.model.DemandListingStatus;
  import com.mermaid.app.repository.DemandListingRepository;
  import com.mermaid.app.repository.ListingInterestRepository;
  import com.mermaid.app.repository.UserRepository;
  import org.junit.jupiter.api.Test;
  import org.junit.jupiter.api.extension.ExtendWith;
  import org.mockito.InjectMocks;
  import org.mockito.Mock;
  import org.mockito.junit.jupiter.MockitoExtension;

  import java.util.List;
  import java.util.Optional;

  import static org.junit.jupiter.api.Assertions.*;
  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.Mockito.*;

  @ExtendWith(MockitoExtension.class)
  class ListingInterestServiceTest {

      @Mock ListingInterestRepository interestRepo;
      @Mock DemandListingRepository listingRepo;
      @Mock UserRepository userRepo;
      @Mock ListingInterestMapper mapper;
      @InjectMocks ListingInterestService service;

      @Test
      void express_listingNotFound_throwsResourceNotFound() {
          when(listingRepo.findById(99L)).thenReturn(Optional.empty());
          assertThrows(ResourceNotFoundException.class,
              () -> service.express(99L, 1L, "I can bring fish"));
      }

      @Test
      void express_listingClosed_throwsListingClosed() {
          DemandListing closed = listing(1L, DemandListingStatus.CLOSED);
          when(listingRepo.findById(1L)).thenReturn(Optional.of(closed));
          assertThrows(ListingClosedException.class,
              () -> service.express(1L, 1L, "I can bring fish"));
      }

      @Test
      void express_duplicate_throwsDuplicateInterest() {
          DemandListing open = listing(1L, DemandListingStatus.OPEN);
          when(listingRepo.findById(1L)).thenReturn(Optional.of(open));
          when(interestRepo.existsByListing_IdAndFishermanId(1L, 5L)).thenReturn(true);
          assertThrows(DuplicateInterestException.class,
              () -> service.express(1L, 5L, "I can bring fish"));
      }

      @Test
      void express_success_savesAndReturnsModel() {
          DemandListing open = listing(1L, DemandListingStatus.OPEN);
          User fisherman = user(5L, "Isidro Cruz");
          ListingInterest saved = new ListingInterest();

          when(listingRepo.findById(1L)).thenReturn(Optional.of(open));
          when(interestRepo.existsByListing_IdAndFishermanId(1L, 5L)).thenReturn(false);
          when(userRepo.findById(5L)).thenReturn(Optional.of(fisherman));
          when(interestRepo.save(any())).thenReturn(saved);

          service.express(1L, 5L, "I can bring 40kg tomorrow");

          verify(interestRepo).save(any(ListingInterest.class));
          verify(mapper).toModel(eq(saved), eq("Isidro Cruz"));
      }

      @Test
      void myInterests_returnsAllForFisherman() {
          ListingInterest i = interestWithListing(1L, 5L, 10L);
          when(interestRepo.findByFishermanIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(i));
          when(userRepo.findAllById(any())).thenReturn(List.of(user(10L, "Rosario")));

          service.myInterests(5L);

          verify(mapper).toDetailModel(eq(i), eq("Rosario"));
      }

      // --- helpers ---

      private DemandListing listing(Long id, DemandListingStatus status) {
          DemandListing l = new DemandListing();
          l.setId(id);
          l.setVendorId(10L);
          l.setStatus(status);
          return l;
      }

      private User user(Long id, String name) {
          User u = new User();
          u.setId(id);
          u.setFullName(name);
          return u;
      }

      private ListingInterest interestWithListing(Long id, Long fishermanId, Long vendorId) {
          DemandListing l = new DemandListing();
          l.setId(1L);
          l.setVendorId(vendorId);
          ListingInterest i = new ListingInterest();
          i.setId(id);
          i.setFishermanId(fishermanId);
          i.setListing(l);
          i.setMessage("test");
          return i;
      }
  }
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd backend
  ./mvnw test -Dtest=ListingInterestServiceTest
  ```

  Expected: FAIL — `ListingInterestService` doesn't exist yet.

- [ ] **Step 3: Implement `ListingInterestService`**

  ```java
  package com.mermaid.app.service;

  import com.mermaid.app.domain.DemandListing;
  import com.mermaid.app.domain.ListingInterest;
  import com.mermaid.app.domain.User;
  import com.mermaid.app.exception.DuplicateInterestException;
  import com.mermaid.app.exception.ListingClosedException;
  import com.mermaid.app.exception.ResourceNotFoundException;
  import com.mermaid.app.mapper.ListingInterestMapper;
  import com.mermaid.app.model.DemandListingStatus;
  import com.mermaid.app.model.ListingInterestDetail;
  import com.mermaid.app.repository.DemandListingRepository;
  import com.mermaid.app.repository.ListingInterestRepository;
  import com.mermaid.app.repository.UserRepository;
  import org.springframework.stereotype.Service;
  import org.springframework.transaction.annotation.Transactional;

  import java.util.List;
  import java.util.Map;
  import java.util.stream.Collectors;

  @Service
  public class ListingInterestService {

      private final ListingInterestRepository interestRepo;
      private final DemandListingRepository listingRepo;
      private final UserRepository userRepo;
      private final ListingInterestMapper mapper;

      public ListingInterestService(ListingInterestRepository interestRepo,
                                     DemandListingRepository listingRepo,
                                     UserRepository userRepo,
                                     ListingInterestMapper mapper) {
          this.interestRepo = interestRepo;
          this.listingRepo  = listingRepo;
          this.userRepo     = userRepo;
          this.mapper       = mapper;
      }

      @Transactional
      public com.mermaid.app.model.ListingInterest express(Long listingId, Long fishermanId, String message) {
          DemandListing listing = listingRepo.findById(listingId)
              .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));

          if (listing.getStatus() != DemandListingStatus.OPEN) {
              throw new ListingClosedException(listingId);
          }

          if (interestRepo.existsByListing_IdAndFishermanId(listingId, fishermanId)) {
              throw new DuplicateInterestException(listingId);
          }

          String fishermanName = userRepo.findById(fishermanId)
              .map(User::getFullName).orElse("Unknown");

          ListingInterest interest = new ListingInterest();
          interest.setListing(listing);
          interest.setFishermanId(fishermanId);
          interest.setMessage(message);
          ListingInterest saved = interestRepo.save(interest);

          return mapper.toModel(saved, fishermanName);
      }

      @Transactional(readOnly = true)
      public List<ListingInterestDetail> myInterests(Long fishermanId) {
          List<ListingInterest> interests =
              interestRepo.findByFishermanIdOrderByCreatedAtDesc(fishermanId);

          List<Long> vendorIds = interests.stream()
              .map(i -> i.getListing().getVendorId())
              .distinct().toList();

          Map<Long, String> vendorNames = userRepo.findAllById(vendorIds).stream()
              .collect(Collectors.toMap(User::getId, User::getFullName));

          return interests.stream()
              .map(i -> mapper.toDetailModel(i,
                  vendorNames.getOrDefault(i.getListing().getVendorId(), "Unknown Vendor")))
              .toList();
      }
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  cd backend
  ./mvnw test -Dtest=ListingInterestServiceTest
  ```

  Expected: All 5 tests pass. (Mapper is mocked, so `toModel`/`toDetailModel` return null — that's fine for these unit tests.)

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/service/ListingInterestService.java \
          backend/src/test/java/com/mermaid/app/service/ListingInterestServiceTest.java
  git commit -m "feat: add ListingInterestService with express and myInterests"
  ```

---

## Task 7: `ListingInterestMapper`

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/mapper/ListingInterestMapper.java`

- [ ] **Step 1: Create the mapper**

  ```java
  package com.mermaid.app.mapper;

  import com.mermaid.app.domain.ListingInterest;
  import com.mermaid.app.model.ListingInterestDetail;
  import org.openapitools.jackson.nullable.JsonNullable;
  import org.springframework.stereotype.Component;

  @Component
  public class ListingInterestMapper {

      private final DemandListingMapper demandListingMapper;

      public ListingInterestMapper(DemandListingMapper demandListingMapper) {
          this.demandListingMapper = demandListingMapper;
      }

      /** Maps to the flat ListingInterest DTO (used in the 201 response). */
      public com.mermaid.app.model.ListingInterest toModel(ListingInterest entity, String fishermanName) {
          com.mermaid.app.model.ListingInterest m = new com.mermaid.app.model.ListingInterest(
              entity.getId(),
              entity.getListing().getId(),
              entity.getFishermanId(),
              entity.getMessage(),
              entity.getCreatedAt()
          );
          m.setFishermanName(JsonNullable.of(fishermanName));
          return m;
      }

      /** Maps to ListingInterestDetail (used in GET /my-interests). */
      public ListingInterestDetail toDetailModel(ListingInterest entity, String vendorName) {
          ListingInterestDetail d = new ListingInterestDetail(
              entity.getId(),
              entity.getMessage(),
              entity.getCreatedAt(),
              demandListingMapper.toModel(entity.getListing(), vendorName)
          );
          return d;
      }
  }
  ```

  > **Note:** The generated `ListingInterest` and `ListingInterestDetail` constructors are driven by the `required` fields in api.yaml. If the constructor signature doesn't match, check the generated class in `target/generated-sources/openapi/` and adjust the `new` call accordingly. Use setter-based construction if the generated class doesn't have a matching all-args constructor.

- [ ] **Step 2: Compile to verify**

  ```bash
  cd backend
  ./mvnw compile
  ```

  Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/mapper/ListingInterestMapper.java
  git commit -m "feat: add ListingInterestMapper"
  ```

---

## Task 8: Update `MarketplaceController` + extend controller test

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/MarketplaceController.java`
- Modify: `backend/src/test/java/com/mermaid/app/controller/MarketplaceControllerTest.java`

- [ ] **Step 1: Write failing controller tests**

  Add the following tests and mocks to `MarketplaceControllerTest`. Add `@MockitoBean ListingInterestService interestService;` alongside the existing `marketplaceService` mock.

  ```java
  @MockitoBean ListingInterestService interestService;

  // --- expressInterest ---

  @Test
  void expressInterest_validRequest_returns201() throws Exception {
      when(interestService.express(eq(1L), eq(42L), eq("I can bring 40kg")))
          .thenReturn(sampleInterest());

      mockMvc.perform(post("/marketplace/listings/1/interest")
             .with(asFisherman(42L))
             .contentType(MediaType.APPLICATION_JSON)
             .content("{\"message\":\"I can bring 40kg\"}"))
             .andExpect(status().isCreated())
             .andExpect(jsonPath("$.id").value(10));
  }

  @Test
  void expressInterest_listingNotFound_returns404() throws Exception {
      when(interestService.express(anyLong(), anyLong(), anyString()))
          .thenThrow(new com.mermaid.app.exception.ResourceNotFoundException("not found"));

      mockMvc.perform(post("/marketplace/listings/99/interest")
             .with(asFisherman(1L))
             .contentType(MediaType.APPLICATION_JSON)
             .content("{\"message\":\"hello\"}"))
             .andExpect(status().isNotFound());
  }

  @Test
  void expressInterest_duplicate_returns409WithCode() throws Exception {
      when(interestService.express(anyLong(), anyLong(), anyString()))
          .thenThrow(new com.mermaid.app.exception.DuplicateInterestException(1L));

      mockMvc.perform(post("/marketplace/listings/1/interest")
             .with(asFisherman(1L))
             .contentType(MediaType.APPLICATION_JSON)
             .content("{\"message\":\"hello\"}"))
             .andExpect(status().isConflict())
             .andExpect(jsonPath("$.code").value("DUPLICATE_INTEREST"));
  }

  @Test
  void expressInterest_listingClosed_returns409WithCode() throws Exception {
      when(interestService.express(anyLong(), anyLong(), anyString()))
          .thenThrow(new com.mermaid.app.exception.ListingClosedException(1L));

      mockMvc.perform(post("/marketplace/listings/1/interest")
             .with(asFisherman(1L))
             .contentType(MediaType.APPLICATION_JSON)
             .content("{\"message\":\"hello\"}"))
             .andExpect(status().isConflict())
             .andExpect(jsonPath("$.code").value("LISTING_CLOSED"));
  }

  @Test
  void getMyInterests_returns200() throws Exception {
      when(interestService.myInterests(42L))
          .thenReturn(List.of(sampleInterestDetail()));

      mockMvc.perform(get("/marketplace/my-interests")
             .with(asFisherman(42L)))
             .andExpect(status().isOk())
             .andExpect(jsonPath("$[0].id").value(10));
  }

  // Add to helpers section:
  private com.mermaid.app.model.ListingInterest sampleInterest() {
      com.mermaid.app.model.ListingInterest i = new com.mermaid.app.model.ListingInterest();
      i.setId(10L);
      i.setListingId(1L);
      i.setFishermanId(42L);
      i.setMessage("I can bring 40kg");
      i.setCreatedAt(OffsetDateTime.now());
      return i;
  }

  private com.mermaid.app.model.ListingInterestDetail sampleInterestDetail() {
      com.mermaid.app.model.ListingInterestDetail d = new com.mermaid.app.model.ListingInterestDetail();
      d.setId(10L);
      d.setMessage("I can bring 40kg");
      d.setCreatedAt(OffsetDateTime.now());
      d.setListing(sampleListing());
      return d;
  }
  ```

  Also add these imports:
  ```java
  import org.springframework.http.MediaType;
  import static org.mockito.ArgumentMatchers.anyLong;
  import static org.mockito.ArgumentMatchers.anyString;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd backend
  ./mvnw test -Dtest=MarketplaceControllerTest
  ```

  Expected: New tests fail — controller methods not implemented yet.

- [ ] **Step 3: Implement new methods in `MarketplaceController`**

  ```java
  package com.mermaid.app.controller;

  import com.mermaid.app.api.MarketplaceApi;
  import com.mermaid.app.model.DemandListing;
  import com.mermaid.app.model.ListingInterest;
  import com.mermaid.app.model.ListingInterestDetail;
  import com.mermaid.app.model.ListingInterestRequest;
  import com.mermaid.app.model.OfferLookupItem;
  import com.mermaid.app.security.SecurityUtils;
  import com.mermaid.app.service.ListingInterestService;
  import com.mermaid.app.service.MarketplaceService;
  import org.springframework.http.ResponseEntity;
  import org.springframework.security.access.prepost.PreAuthorize;
  import org.springframework.web.bind.annotation.RestController;

  import java.util.List;

  @RestController
  @PreAuthorize("hasRole('FISHERMAN')")
  public class MarketplaceController implements MarketplaceApi {

      private final MarketplaceService service;
      private final ListingInterestService interestService;

      public MarketplaceController(MarketplaceService service,
                                    ListingInterestService interestService) {
          this.service         = service;
          this.interestService = interestService;
      }

      @Override
      public ResponseEntity<List<DemandListing>> browseMarketplaceListings(
              Long speciesId, Long locationId, Double minOfferPrice, Double maxOfferPrice) {
          return ResponseEntity.ok(service.browseListings(speciesId, locationId, minOfferPrice, maxOfferPrice));
      }

      @Override
      public ResponseEntity<List<OfferLookupItem>> lookupActiveOffers(Long speciesId, Long locationId) {
          return ResponseEntity.ok(service.lookupOffers(speciesId, locationId));
      }

      @Override
      public ResponseEntity<ListingInterest> expressInterestInListing(
              Long listingId, ListingInterestRequest request) {
          Long fishermanId = SecurityUtils.currentUserId();
          return ResponseEntity.status(201)
              .body(interestService.express(listingId, fishermanId, request.getMessage()));
      }

      @Override
      public ResponseEntity<List<ListingInterestDetail>> getMyInterests() {
          return ResponseEntity.ok(interestService.myInterests(SecurityUtils.currentUserId()));
      }
  }
  ```

- [ ] **Step 4: Run all tests**

  ```bash
  cd backend
  ./mvnw test
  ```

  Expected: All tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/java/com/mermaid/app/controller/MarketplaceController.java \
          backend/src/test/java/com/mermaid/app/controller/MarketplaceControllerTest.java
  git commit -m "feat: implement expressInterest and getMyInterests in MarketplaceController"
  ```

---

## Task 9: `Marketplace.jsx` frontend

**Files:**
- Create: `frontend/src/Marketplace.jsx`
- Modify: `frontend/src/FishermanDashboard.jsx`

- [ ] **Step 1: Wire up the placeholder in `FishermanDashboard.jsx`**

  Find the `activeNav === 'trips'` ternary (around line 294) and add the market case:

  ```jsx
  import Marketplace from './Marketplace'

  // In the render:
  {activeNav === 'trips'  ? <MyTrips token={token} /> :
   activeNav === 'market' ? <Marketplace token={token} /> :
   <>
     {/* existing marine dashboard content */}
   </>
  }
  ```

- [ ] **Step 2: Create `Marketplace.jsx`**

  ```jsx
  import { useState, useEffect, useCallback } from 'react'
  import { apiGet, apiPost } from './api'

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function fmtDeadline(iso) {
    if (!iso) return null
    const d = new Date(iso)
    const now = new Date()
    const diffMs = d - now
    const diffDays = Math.ceil(diffMs / 86400000)
    if (diffDays < 0)  return { label: 'Overdue', urgent: true }
    if (diffDays === 0) return { label: 'Today',  urgent: true }
    return { label: fmtDate(iso), urgent: false }
  }

  function Skeleton({ height = '48px', radius = '12px' }) {
    return <div className="skeleton" style={{ height, borderRadius: radius }} />
  }

  // ─── MarketplaceTabs ──────────────────────────────────────────────────────────

  function MarketplaceTabs({ active, onChange, interestCount }) {
    return (
      <div className="trips-tabs">
        <button
          className={`trips-tab${active === 'browse' ? ' trips-tab--on' : ''}`}
          onClick={() => onChange('browse')}
        >
          Browse
        </button>
        <button
          className={`trips-tab${active === 'interests' ? ' trips-tab--on' : ''}`}
          onClick={() => onChange('interests')}
        >
          My Interests
          {interestCount > 0 && (
            <span style={{
              marginLeft: 6,
              background: 'rgba(125,211,252,0.15)',
              color: '#7DD3FC',
              borderRadius: 99,
              fontSize: 11,
              padding: '1px 7px',
              fontWeight: 600,
            }}>{interestCount}</span>
          )}
        </button>
      </div>
    )
  }

  // ─── FilterBar ────────────────────────────────────────────────────────────────

  function FilterBar({ species, locations, filters, onChange, onClear, count }) {
    return (
      <div className="mkt-filter-bar">
        <select
          className="mkt-filter-select"
          value={filters.speciesId}
          onChange={e => onChange({ ...filters, speciesId: e.target.value })}
        >
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
        </select>
        <select
          className="mkt-filter-select"
          value={filters.locationId}
          onChange={e => onChange({ ...filters, locationId: e.target.value })}
        >
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="mkt-price-range">
          <span className="mkt-price-range__peso">₱</span>
          <input
            className="mkt-price-range__input"
            type="number"
            placeholder="Min"
            min="0"
            value={filters.minPrice}
            onChange={e => onChange({ ...filters, minPrice: e.target.value })}
          />
          <span className="mkt-price-range__sep">–</span>
          <input
            className="mkt-price-range__input"
            type="number"
            placeholder="Max"
            min="0"
            value={filters.maxPrice}
            onChange={e => onChange({ ...filters, maxPrice: e.target.value })}
          />
        </div>
        <button className="mkt-filter-clear" onClick={onClear}>Clear</button>
        <span className="mkt-filter-count">{count} listing{count !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  // ─── InterestModal ────────────────────────────────────────────────────────────

  function InterestModal({ listing, token, onSuccess, onClose }) {
    const [message, setMessage]     = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError]           = useState(null)

    async function submit(e) {
      e.preventDefault()
      if (!message.trim()) { setError('Please write a message'); return }
      setSubmitting(true)
      setError(null)
      try {
        const result = await apiPost(`/marketplace/listings/${listing.id}/interest`, token, {
          message: message.trim(),
        })
        onSuccess(result)
      } catch (err) {
        if (err.message?.includes('DUPLICATE_INTEREST')) {
          setError("You've already expressed interest in this listing")
        } else if (err.message?.includes('LISTING_CLOSED')) {
          setError('This listing is no longer accepting interest')
        } else {
          setError(err.message || 'Something went wrong')
        }
        setSubmitting(false)
      }
    }

    return (
      <div
        className="trip-modal-overlay"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="trip-modal">
          <div className="trip-modal__header">
            <h2 className="trip-modal__title">Express Interest</h2>
            <button className="trip-modal__close" onClick={onClose}>✕</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              <strong style={{ color: '#7DD3FC' }}>{listing.fishSpecies?.commonName}</strong>
              {' '}at{' '}
              <strong style={{ color: '#fff' }}>{listing.marketLocation?.name}</strong>
              {' '}— ₱{listing.offerPricePerKg}/kg
            </p>
          </div>
          <form className="trip-form" onSubmit={submit}>
            {error && <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0 }}>{error}</p>}
            <label className="trip-form__label">
              Your message to the vendor *
              <textarea
                className="trip-form__textarea"
                placeholder="e.g. I can bring 40kg of fresh Bangus by tomorrow morning…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </label>
            <div className="trip-form__actions">
              <button type="button" className="trip-btn trip-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="trip-btn trip-btn--primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Interest'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ─── ListingRow ───────────────────────────────────────────────────────────────

  function ListingRow({ listing, isInterested, sentMessage, onInterest }) {
    const [open, setOpen] = useState(false)
    const deadline = fmtDeadline(listing.neededBy)

    return (
      <div className={`mkt-row${open ? ' mkt-row--open' : ''}${isInterested ? ' mkt-row--interested' : ''}`}>
        {/* ── Summary row ── */}
        <div className="mkt-row__summary" onClick={() => setOpen(o => !o)}>
          <div className="mkt-row__species-col">
            <span className="mkt-row__chevron">{open ? '▾' : '▸'}</span>
            <div>
              <p className="mkt-row__species">{listing.fishSpecies?.commonName}</p>
              <p className="mkt-row__vendor">{listing.vendorName || '—'}</p>
            </div>
          </div>
          <div className="mkt-row__location">📍 {listing.marketLocation?.name}</div>
          <div className="mkt-row__price">₱{listing.offerPricePerKg}</div>
          <div className="mkt-row__qty">{listing.quantityKg} kg</div>
          <div className={`mkt-row__deadline${deadline?.urgent ? ' mkt-row__deadline--urgent' : ''}`}>
            {deadline ? deadline.label : '—'}
          </div>
          <div onClick={e => e.stopPropagation()}>
            {listing.status !== 'OPEN' ? (
              <span className="mkt-btn mkt-btn--closed">Closed</span>
            ) : isInterested ? (
              <span className="mkt-btn mkt-btn--interested">✓ Interested</span>
            ) : (
              <button
                className="mkt-btn mkt-btn--cta"
                onClick={() => onInterest(listing)}
              >
                I'm Interested
              </button>
            )}
          </div>
        </div>

        {/* ── Expanded section ── */}
        {open && (
          <div className="mkt-row__detail">
            <div className="mkt-row__detail-grid">
              <div>
                <p className="mkt-row__detail-label">Vendor Note</p>
                <p className="mkt-row__detail-text">
                  {listing.notes || <span style={{ color: 'rgba(255,255,255,0.25)' }}>No notes provided.</span>}
                </p>
              </div>
              {isInterested && sentMessage && (
                <div>
                  <p className="mkt-row__detail-label">Your Message</p>
                  <p className="mkt-row__detail-text" style={{ fontStyle: 'italic' }}>
                    "{sentMessage}"
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(125,211,252,0.5)', marginTop: 4 }}>
                    Chat coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── BrowseTab ────────────────────────────────────────────────────────────────

  function BrowseTab({ listings, species, locations, interestedSet, sentMessages, loading, error, onLoad, onInterest }) {
    const [filters, setFilters] = useState({
      speciesId: '', locationId: '', minPrice: '', maxPrice: '',
    })

    const filtered = listings.filter(l => {
      if (filters.speciesId  && String(l.fishSpecies?.id)   !== filters.speciesId)  return false
      if (filters.locationId && String(l.marketLocation?.id) !== filters.locationId) return false
      if (filters.minPrice   && l.offerPricePerKg < Number(filters.minPrice))       return false
      if (filters.maxPrice   && l.offerPricePerKg > Number(filters.maxPrice))       return false
      return true
    })

    if (error) return (
      <div className="db-error">
        <span>{error}</span>
        <button className="db-error__retry" onClick={onLoad}>Retry</button>
      </div>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <FilterBar
          species={species}
          locations={locations}
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters({ speciesId: '', locationId: '', minPrice: '', maxPrice: '' })}
          count={filtered.length}
        />
        <div className="mkt-col-headers">
          <span>Species · Vendor</span>
          <span>Location</span>
          <span style={{ textAlign: 'right' }}>Price/kg</span>
          <span style={{ textAlign: 'right' }}>Quantity</span>
          <span style={{ textAlign: 'center' }}>Needed By</span>
          <span />
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
            <Skeleton /><Skeleton /><Skeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="db-empty">
            <p>No listings match your filters.</p>
            <button
              className="trip-btn trip-btn--ghost"
              style={{ marginTop: 4, fontSize: 13 }}
              onClick={() => setFilters({ speciesId: '', locationId: '', minPrice: '', maxPrice: '' })}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="mkt-list">
            {filtered.map(l => (
              <ListingRow
                key={l.id}
                listing={l}
                isInterested={interestedSet.has(l.id)}
                sentMessage={sentMessages[l.id]}
                onInterest={onInterest}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── MyInterestsTab ───────────────────────────────────────────────────────────

  function MyInterestsTab({ interests }) {
    if (interests.length === 0) return (
      <div className="trip-empty">
        <span className="trip-empty__icon">🤝</span>
        <p className="trip-empty__msg">No interests yet. Browse listings to find buyers.</p>
      </div>
    )

    return (
      <div className="mkt-list">
        {interests.map(i => (
          <div key={i.id} className="mkt-interest-row">
            <div className="mkt-interest-row__main">
              <p className="mkt-row__species">{i.listing?.fishSpecies?.commonName}</p>
              <p className="mkt-row__vendor">
                {i.listing?.vendorName || '—'} · 📍 {i.listing?.marketLocation?.name}
              </p>
            </div>
            <div className="mkt-interest-row__price">
              ₱{i.listing?.offerPricePerKg}/kg
            </div>
            <div className="mkt-interest-row__msg">
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Your message</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                "{i.message}"
              </p>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', alignSelf: 'flex-end' }}>
              {fmtDate(i.createdAt)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ─── Marketplace root ─────────────────────────────────────────────────────────

  export default function Marketplace({ token }) {
    const [activeTab, setActiveTab]         = useState('browse')
    const [listings, setListings]           = useState([])
    const [species, setSpecies]             = useState([])
    const [locations, setLocations]         = useState([])
    const [myInterests, setMyInterests]     = useState([])
    const [interestedSet, setInterestedSet] = useState(new Set())
    const [sentMessages, setSentMessages]   = useState({})   // { [listingId]: message }
    const [loading, setLoading]             = useState(true)
    const [error, setError]                 = useState(null)
    const [interestModal, setInterestModal] = useState(null) // listing object or null

    const load = useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        const [l, s, loc, mi] = await Promise.all([
          apiGet('/marketplace/listings', token),
          apiGet('/lookups/fish-species', token),
          apiGet('/lookups/market-locations', token),
          apiGet('/marketplace/my-interests', token),
        ])
        setListings(l)
        setSpecies(s)
        setLocations(loc)
        setMyInterests(mi)
        const ids = new Set(mi.map(i => i.listing?.id))
        setInterestedSet(ids)
        const msgs = {}
        mi.forEach(i => { if (i.listing?.id) msgs[i.listing.id] = i.message })
        setSentMessages(msgs)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, [token])

    useEffect(() => { load() }, [load])

    function handleInterestSuccess(result) {
      // Optimistic: add to interested set and sent messages
      setInterestedSet(prev => new Set([...prev, result.listingId]))
      setSentMessages(prev => ({ ...prev, [result.listingId]: result.message }))
      // Append to myInterests list using the 201 response body
      setMyInterests(prev => [
        {
          id: result.id,
          message: result.message,
          createdAt: result.createdAt,
          listing: listings.find(l => l.id === result.listingId),
        },
        ...prev,
      ])
      setInterestModal(null)
    }

    return (
      <div className="trips-page">
        <div className="trips-page-header">
          <div>
            <h2 className="trips-page-header__title">Marketplace</h2>
            <p className="trips-page-header__sub">Demand listings from La Union vendors</p>
          </div>
          {myInterests.length > 0 && (
            <span className="trips-page-header__active-chip">
              {myInterests.length} interest{myInterests.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <MarketplaceTabs
          active={activeTab}
          onChange={setActiveTab}
          interestCount={myInterests.length}
        />

        {activeTab === 'browse' ? (
          <BrowseTab
            listings={listings}
            species={species}
            locations={locations}
            interestedSet={interestedSet}
            sentMessages={sentMessages}
            loading={loading}
            error={error}
            onLoad={load}
            onInterest={setInterestModal}
          />
        ) : (
          <MyInterestsTab interests={myInterests} />
        )}

        {interestModal && (
          <InterestModal
            listing={interestModal}
            token={token}
            onSuccess={handleInterestSuccess}
            onClose={() => setInterestModal(null)}
          />
        )}
      </div>
    )
  }
  ```

- [ ] **Step 3: Add CSS for marketplace components to `dashboard.css`**

  Append to the end of `frontend/src/dashboard.css`:

  ```css
  /* ════════════════════════════════════════
     MARKETPLACE
     ════════════════════════════════════════ */

  /* ── Filter bar ── */
  .mkt-filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 14px 0 10px;
  }
  .mkt-filter-select {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 9px;
    color: rgba(255,255,255,0.7);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    font-family: inherit;
  }
  .mkt-filter-select:focus { border-color: #0e7490; }
  .mkt-price-range {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 9px;
    padding: 8px 12px;
  }
  .mkt-price-range__peso { font-size: 12px; color: rgba(255,255,255,0.4); }
  .mkt-price-range__sep  { font-size: 12px; color: rgba(255,255,255,0.3); }
  .mkt-price-range__input {
    background: none;
    border: none;
    color: #fff;
    font-size: 13px;
    width: 54px;
    outline: none;
    font-family: inherit;
  }
  .mkt-filter-clear {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px;
    color: rgba(255,255,255,0.4);
    font-size: 13px;
    padding: 8px 14px;
    font-family: inherit;
  }
  .mkt-filter-clear:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
  .mkt-filter-count {
    margin-left: auto;
    font-size: 12px;
    color: rgba(255,255,255,0.3);
  }

  /* ── Column headers ── */
  .mkt-col-headers {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 130px;
    gap: 8px;
    padding: 6px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .mkt-col-headers span {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: rgba(255,255,255,0.28);
  }

  /* ── Listing list ── */
  .mkt-list { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }

  /* ── Listing row ── */
  .mkt-row {
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(8,20,38,0.65);
    transition: border-color 0.18s;
  }
  .mkt-row--interested { background: rgba(14,116,144,0.07); border-color: rgba(14,116,144,0.22); }
  .mkt-row__summary {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 130px;
    gap: 8px;
    align-items: center;
    padding: 13px 16px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .mkt-row__summary:hover { background: rgba(255,255,255,0.03); }
  .mkt-row__species-col {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mkt-row__chevron { font-size: 12px; color: rgba(255,255,255,0.25); flex-shrink: 0; }
  .mkt-row__species { font-size: 14px; font-weight: 700; color: #fff; }
  .mkt-row__vendor  { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .mkt-row__location { font-size: 13px; color: rgba(255,255,255,0.55); }
  .mkt-row__price   { text-align: right; font-size: 15px; font-weight: 700; color: #7DD3FC; }
  .mkt-row__qty     { text-align: right; font-size: 13px; color: rgba(255,255,255,0.55); }
  .mkt-row__deadline { text-align: center; font-size: 12px; color: rgba(255,255,255,0.45); }
  .mkt-row__deadline--urgent { color: #FCA5A5; font-weight: 600; }

  /* ── Row action buttons ── */
  .mkt-btn {
    display: block;
    width: 100%;
    padding: 7px 0;
    border-radius: 8px;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
  }
  .mkt-btn--cta        { background: #0e7490; color: #fff; cursor: pointer; border: none; transition: background .18s; }
  .mkt-btn--cta:hover  { background: #0891b2; }
  .mkt-btn--interested { background: rgba(34,197,94,0.1); color: #86efac; border: 1px solid rgba(34,197,94,0.25); }
  .mkt-btn--closed     { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.08); }

  /* ── Expanded detail ── */
  .mkt-row__detail {
    padding: 14px 18px 16px 40px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(4,12,24,0.5);
  }
  .mkt-row__detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .mkt-row__detail-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: rgba(255,255,255,0.3);
    margin-bottom: 6px;
  }
  .mkt-row__detail-text {
    font-size: 13px;
    color: rgba(255,255,255,0.65);
    line-height: 1.5;
  }

  /* ── My Interests rows ── */
  .mkt-interest-row {
    display: grid;
    grid-template-columns: 2fr 1fr 2fr auto;
    gap: 12px;
    align-items: start;
    padding: 14px 16px;
    background: rgba(8,20,38,0.65);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
  }
  .mkt-interest-row__price {
    font-size: 15px;
    font-weight: 700;
    color: #7DD3FC;
    padding-top: 2px;
  }
  .mkt-interest-row__msg { font-size: 13px; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .mkt-col-headers { display: none; }
    .mkt-row__summary {
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
    }
    .mkt-row__location,
    .mkt-row__price,
    .mkt-row__qty,
    .mkt-row__deadline { display: none; }
    .mkt-interest-row { grid-template-columns: 1fr; }
  }
  ```

- [ ] **Step 4: Start the frontend dev server and manually test**

  ```bash
  cd frontend
  npm run dev
  ```

  Verify in the browser:
  - Clicking "Marketplace" in the sidebar loads the page
  - Browse tab shows listings (or empty state if backend not running)
  - Filters work client-side
  - Clicking a row expands it
  - Clicking "I'm Interested" opens the modal
  - My Interests tab shows interests

- [ ] **Step 5: Run frontend lint**

  ```bash
  cd frontend
  npm run lint
  ```

  Expected: No errors.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/Marketplace.jsx \
          frontend/src/FishermanDashboard.jsx \
          frontend/src/dashboard.css
  git commit -m "feat: add Marketplace page with browse, expand, and express interest"
  ```

---

## Done

After all tasks: run `cd backend && ./mvnw test` one final time to confirm all tests pass, then the feature is complete.

**Out of scope:** Chat (WebSockets), vendor view of interests, withdrawing interest. Those are in a separate future spec.
