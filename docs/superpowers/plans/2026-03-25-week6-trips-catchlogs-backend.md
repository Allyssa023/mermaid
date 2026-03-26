# Week 6 Backend: Trips, Checklists & Catch Logs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MERMAID backend MVP by implementing trip lifecycle management (start/end/list/get), safety checklists, and catch log CRUD for the fisherman persona.

**Architecture:** Two independent controller/service pairs — `TripController`/`TripService` and `CatchLogController`/`CatchLogService` — implementing the OpenAPI-generated `TripsApi` and `CatchLogsApi` interfaces. The safety checklist is stored as inline columns on the `trips` table (zero join overhead). `SecurityUtils.currentUserId()` is called in the controller and passed as a parameter to the service (matching the existing `VendorDemandListingController` pattern).

**Tech Stack:** Spring Boot 3, Spring Security (JWT), JPA/Hibernate, Flyway, OpenAPI Generator, JUnit 5, Mockito, MockMvc.

**Spec:** `docs/superpowers/specs/2026-03-25-week6-trips-catchlogs-backend-design.md`

---

## File Map

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
  mapper/TripMapperTest.java
  mapper/CatchLogMapperTest.java
  service/TripServiceTest.java
  service/CatchLogServiceTest.java
  controller/TripControllerTest.java
  controller/CatchLogControllerTest.java
```

### Modified files
```
backend/src/main/resources/openapi/api.yaml
  — add 409 response to saveTripChecklist and endTrip endpoints

backend/src/main/java/com/mermaid/app/
  exception/GlobalExceptionHandler.java
    — add TripNotActiveException → 409 handler
```

---

## Task 1: Update api.yaml and regenerate sources

**Files:** Modify `backend/src/main/resources/openapi/api.yaml`

The `saveTripChecklist` and `endTrip` endpoints are missing a `409` response declaration. Add it before running `generate-sources` so the generated interface stays in sync with the error behaviour.

- [ ] **Step 1: Add 409 response to `saveTripChecklist`**

In `api.yaml`, find the `PUT /trips/{tripId}/checklist` block. It currently has `'200'` and `'404'`. Add after the `'404'` block:

```yaml
        '409':
          description: Trip is not active
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

- [ ] **Step 2: Add 409 response to `endTrip`**

Find the `POST /trips/{tripId}/end` block. Same addition after its `'404'` block:

```yaml
        '409':
          description: Trip is not active
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

- [ ] **Step 3: Regenerate sources**

```bash
cd backend
./mvnw generate-sources
```

Expected: BUILD SUCCESS with no errors. The `TripsApi` and `CatchLogsApi` interfaces are already present from a previous generate; this run updates them with the 409 response metadata.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat: add 409 response to saveTripChecklist and endTrip in api.yaml"
```

---

## Task 2: Flyway migrations

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__create_trips.sql`
- Create: `backend/src/main/resources/db/migration/V9__create_catch_logs.sql`

Flyway applies migrations in version order on startup. Never modify existing migration files — always add new ones. The checklist columns are inline on `trips` (not a separate table) to eliminate join overhead.

- [ ] **Step 1: Create V8__create_trips.sql**

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

CREATE INDEX idx_trips_fisherman ON trips (fisherman_id, status);
```

- [ ] **Step 2: Create V9__create_catch_logs.sql**

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

CREATE INDEX idx_catch_logs_trip ON catch_logs (trip_id);
```

- [ ] **Step 3: Verify migrations apply**

Start the backend (requires a running PostgreSQL on `localhost:5432/mermaid_db`). Flyway will apply V8 and V9 automatically.

```bash
cd backend
./mvnw spring-boot:run
```

Expected: `Successfully applied 2 migrations` in the startup log. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat: add V8 trips and V9 catch_logs Flyway migrations"
```

---

## Task 3: TripNotActiveException + GlobalExceptionHandler

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/exception/TripNotActiveException.java`
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`

The pattern: a targeted domain exception class + a specific `@ExceptionHandler` method in `GlobalExceptionHandler`. Follows the exact same pattern as `ListingClosedException` (Week 5).

- [ ] **Step 1: Create TripNotActiveException**

```java
package com.mermaid.app.exception;

public class TripNotActiveException extends RuntimeException {
    public TripNotActiveException(Long tripId) {
        super("Trip " + tripId + " is not active");
    }
}
```

- [ ] **Step 2: Add handler to GlobalExceptionHandler**

Open `GlobalExceptionHandler.java`. After the `handleListingClosed` method, add:

```java
@ExceptionHandler(TripNotActiveException.class)
public ResponseEntity<ErrorResponse> handleTripNotActive(
        TripNotActiveException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.CONFLICT, ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/exception/
git commit -m "feat: add TripNotActiveException with 409 handler"
```

---

## Task 4: Trip entity + TripRepository

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/Trip.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/TripRepository.java`

Pattern reference: `DemandListing.java` and `DemandListingRepository.java`. The entity uses the generated `TripStatus` enum (from `com.mermaid.app.model`) directly — this is the established project pattern.

- [ ] **Step 1: Create Trip entity**

```java
package com.mermaid.app.domain;

import com.mermaid.app.model.TripStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fisherman_id", nullable = false)
    private Long fishermanId;

    @Column(name = "departure_point", nullable = false, length = 150)
    private String departurePoint;

    @Column(name = "target_area", nullable = false, length = 150)
    private String targetArea;

    @Column(name = "vessel_name", length = 100)
    private String vesselName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TripStatus status = TripStatus.ACTIVE;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(length = 500)
    private String notes;

    @Column(name = "fuel_checked")
    private Boolean fuelChecked;

    @Column(name = "engine_checked")
    private Boolean engineChecked;

    @Column(name = "radio_checked")
    private Boolean radioChecked;

    @Column(name = "life_vest_checked")
    private Boolean lifeVestChecked;

    @Column(name = "weather_reviewed")
    private Boolean weatherReviewed;

    @Column(name = "emergency_kit_checked")
    private Boolean emergencyKitChecked;

    @Column(name = "checklist_completed_at")
    private OffsetDateTime checklistCompletedAt;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) startedAt = OffsetDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFishermanId() { return fishermanId; }
    public void setFishermanId(Long fishermanId) { this.fishermanId = fishermanId; }
    public String getDeparturePoint() { return departurePoint; }
    public void setDeparturePoint(String departurePoint) { this.departurePoint = departurePoint; }
    public String getTargetArea() { return targetArea; }
    public void setTargetArea(String targetArea) { this.targetArea = targetArea; }
    public String getVesselName() { return vesselName; }
    public void setVesselName(String vesselName) { this.vesselName = vesselName; }
    public TripStatus getStatus() { return status; }
    public void setStatus(TripStatus status) { this.status = status; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getFuelChecked() { return fuelChecked; }
    public void setFuelChecked(Boolean fuelChecked) { this.fuelChecked = fuelChecked; }
    public Boolean getEngineChecked() { return engineChecked; }
    public void setEngineChecked(Boolean engineChecked) { this.engineChecked = engineChecked; }
    public Boolean getRadioChecked() { return radioChecked; }
    public void setRadioChecked(Boolean radioChecked) { this.radioChecked = radioChecked; }
    public Boolean getLifeVestChecked() { return lifeVestChecked; }
    public void setLifeVestChecked(Boolean lifeVestChecked) { this.lifeVestChecked = lifeVestChecked; }
    public Boolean getWeatherReviewed() { return weatherReviewed; }
    public void setWeatherReviewed(Boolean weatherReviewed) { this.weatherReviewed = weatherReviewed; }
    public Boolean getEmergencyKitChecked() { return emergencyKitChecked; }
    public void setEmergencyKitChecked(Boolean emergencyKitChecked) { this.emergencyKitChecked = emergencyKitChecked; }
    public OffsetDateTime getChecklistCompletedAt() { return checklistCompletedAt; }
    public void setChecklistCompletedAt(OffsetDateTime checklistCompletedAt) { this.checklistCompletedAt = checklistCompletedAt; }
}
```

- [ ] **Step 2: Create TripRepository**

```java
package com.mermaid.app.repository;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(Long fishermanId, TripStatus status);

    List<Trip> findAllByFishermanIdOrderByStartedAtDescIdDesc(Long fishermanId);

    // Ownership check baked in — returns empty if trip belongs to a different fisherman
    Optional<Trip> findByIdAndFishermanId(Long id, Long fishermanId);
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend
./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/Trip.java \
        backend/src/main/java/com/mermaid/app/repository/TripRepository.java
git commit -m "feat: add Trip entity and TripRepository"
```

---

## Task 5: TripMapper (TDD)

**Files:**
- Create test: `backend/src/test/java/com/mermaid/app/mapper/TripMapperTest.java`
- Create: `backend/src/main/java/com/mermaid/app/mapper/TripMapper.java`

The key behaviours to test: (1) all-null checklist booleans → `null` checklist in model; (2) non-null checklist booleans → `SafetyChecklist` model built from entity fields; (3) fishermanName is mapped correctly.

- [ ] **Step 1: Write the failing tests**

```java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.TripStatus;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class TripMapperTest {

    private final TripMapper mapper = new TripMapper();

    @Test
    void toModel_nullChecklist_returnsNullChecklist() {
        Trip entity = tripEntity();
        // All 6 checklist booleans remain null

        com.mermaid.app.model.Trip model = mapper.toModel(entity, "Isidro Cruz");

        assertEquals(1L, model.getId());
        assertEquals(42L, model.getFishermanId());
        assertNull(model.getChecklist().get()); // JsonNullable.of(null)
    }

    @Test
    void toModel_withChecklist_buildsChecklistFromColumns() {
        Trip entity = tripEntity();
        entity.setFuelChecked(true);
        entity.setEngineChecked(true);
        entity.setRadioChecked(false);
        entity.setLifeVestChecked(true);
        entity.setWeatherReviewed(true);
        entity.setEmergencyKitChecked(false);
        entity.setChecklistCompletedAt(OffsetDateTime.now());

        com.mermaid.app.model.Trip model = mapper.toModel(entity, "Isidro Cruz");

        var checklist = model.getChecklist().get();
        assertNotNull(checklist);
        assertTrue(checklist.getFuelChecked());
        assertFalse(checklist.getRadioChecked());
    }

    @Test
    void toModel_fishermanNameMapped() {
        Trip entity = tripEntity();

        com.mermaid.app.model.Trip model = mapper.toModel(entity, "Isidro Cruz");

        assertEquals("Isidro Cruz", model.getFishermanName().get());
    }

    private Trip tripEntity() {
        Trip e = new Trip();
        e.setId(1L);
        e.setFishermanId(42L);
        e.setStatus(TripStatus.ACTIVE);
        e.setDeparturePoint("Navotas Port");
        e.setTargetArea("Manila Bay");
        e.setStartedAt(OffsetDateTime.now());
        return e;
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
./mvnw test -Dtest=TripMapperTest -q
```

Expected: FAIL — `TripMapper` does not exist yet.

- [ ] **Step 3: Implement TripMapper**

```java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.model.SafetyChecklist;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

@Component
public class TripMapper {

    public com.mermaid.app.model.Trip toModel(Trip entity, String fishermanName) {
        com.mermaid.app.model.Trip m = new com.mermaid.app.model.Trip(
            entity.getId(),
            entity.getFishermanId(),
            entity.getStatus(),
            entity.getStartedAt()
        );
        m.setFishermanName(JsonNullable.of(fishermanName));
        m.setDeparturePoint(JsonNullable.of(entity.getDeparturePoint()));
        m.setTargetArea(JsonNullable.of(entity.getTargetArea()));
        m.setVesselName(JsonNullable.of(entity.getVesselName()));
        m.setEndedAt(JsonNullable.of(entity.getEndedAt()));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        m.setChecklist(JsonNullable.of(buildChecklist(entity)));
        return m;
    }

    private SafetyChecklist buildChecklist(Trip entity) {
        if (entity.getFuelChecked() == null
                && entity.getEngineChecked() == null
                && entity.getRadioChecked() == null
                && entity.getLifeVestChecked() == null
                && entity.getWeatherReviewed() == null
                && entity.getEmergencyKitChecked() == null) {
            return null;
        }
        SafetyChecklist c = new SafetyChecklist();
        c.setFuelChecked(entity.getFuelChecked());
        c.setEngineChecked(entity.getEngineChecked());
        c.setRadioChecked(entity.getRadioChecked());
        c.setLifeVestChecked(entity.getLifeVestChecked());
        c.setWeatherReviewed(entity.getWeatherReviewed());
        c.setEmergencyKitChecked(entity.getEmergencyKitChecked());
        c.setChecklistCompletedAt(JsonNullable.of(entity.getChecklistCompletedAt()));
        return c;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
./mvnw test -Dtest=TripMapperTest -q
```

Expected: BUILD SUCCESS, 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/mapper/TripMapper.java \
        backend/src/test/java/com/mermaid/app/mapper/TripMapperTest.java
git commit -m "feat: add TripMapper with checklist null handling (TDD)"
```

---

## Task 6: TripService (TDD)

**Files:**
- Create test: `backend/src/test/java/com/mermaid/app/service/TripServiceTest.java`
- Create: `backend/src/main/java/com/mermaid/app/service/TripService.java`

The service takes `fishermanId` as a parameter (passed in from the controller via `SecurityUtils.currentUserId()`). No need to mock `SecurityContextHolder` in service tests — see how `DemandListingServiceTest` passes `vendorId` directly.

- [ ] **Step 1: Write all failing tests**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock TripRepository tripRepo;
    @Mock TripMapper tripMapper;
    @Mock UserRepository userRepo;
    @InjectMocks TripService tripService;

    // --- listTrips ---

    @Test
    void listTrips_noFilter_callsUnfilteredQuery() {
        when(tripRepo.findAllByFishermanIdOrderByStartedAtDescIdDesc(42L)).thenReturn(List.of());
        when(userRepo.findById(42L)).thenReturn(Optional.empty());

        tripService.listTrips(null, 42L);

        verify(tripRepo).findAllByFishermanIdOrderByStartedAtDescIdDesc(42L);
        verify(tripRepo, never()).findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(any(), any());
    }

    @Test
    void listTrips_withStatusFilter_callsFilteredQuery() {
        when(tripRepo.findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(42L, TripStatus.ACTIVE))
            .thenReturn(List.of());
        when(userRepo.findById(42L)).thenReturn(Optional.empty());

        tripService.listTrips(TripStatus.ACTIVE, 42L);

        verify(tripRepo).findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(42L, TripStatus.ACTIVE);
        verify(tripRepo, never()).findAllByFishermanIdOrderByStartedAtDescIdDesc(any());
    }

    // --- startTrip ---

    @Test
    void startTrip_setsCorrectFishermanIdAndActiveStatus() {
        Trip savedTrip = activeTrip(1L, 42L);
        when(tripRepo.save(any(Trip.class))).thenReturn(savedTrip);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(tripMapper.toModel(savedTrip, null)).thenReturn(new com.mermaid.app.model.Trip());

        TripStartRequest req = new TripStartRequest("Navotas Port", "Manila Bay");
        tripService.startTrip(req, 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        assertEquals(42L, captor.getValue().getFishermanId());
        assertEquals(TripStatus.ACTIVE, captor.getValue().getStatus());
    }

    // --- getTripById ---

    @Test
    void getTripById_notOwned_throwsResourceNotFoundException() {
        when(tripRepo.findByIdAndFishermanId(99L, 42L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> tripService.getTripById(99L, 42L));
    }

    // --- saveTripChecklist ---

    @Test
    void saveTripChecklist_activeTrip_savesAllSixBooleans() {
        Trip trip = activeTrip(1L, 42L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);

        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, false, true, true, false);
        tripService.saveTripChecklist(1L, req, 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        Trip saved = captor.getValue();
        assertTrue(saved.getFuelChecked());
        assertFalse(saved.getRadioChecked());
        assertNotNull(saved.getChecklistCompletedAt());
    }

    @Test
    void saveTripChecklist_completedTrip_throwsTripNotActiveException() {
        Trip trip = activeTrip(1L, 42L);
        trip.setStatus(TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, true, true, true, true);
        assertThrows(TripNotActiveException.class,
            () -> tripService.saveTripChecklist(1L, req, 42L));
    }

    @Test
    void saveTripChecklist_cancelledTrip_throwsTripNotActiveException() {
        Trip trip = activeTrip(1L, 42L);
        trip.setStatus(TripStatus.CANCELLED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, true, true, true, true);
        assertThrows(TripNotActiveException.class,
            () -> tripService.saveTripChecklist(1L, req, 42L));
    }

    // --- endTrip ---

    @Test
    void endTrip_activeTrip_setsCompletedAndEndedAt() {
        Trip trip = activeTrip(1L, 42L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        tripService.endTrip(1L, new TripEndRequest(), 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        assertEquals(TripStatus.COMPLETED, captor.getValue().getStatus());
        assertNotNull(captor.getValue().getEndedAt());
    }

    @Test
    void endTrip_alreadyCompleted_throwsTripNotActiveException() {
        Trip trip = activeTrip(1L, 42L);
        trip.setStatus(TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> tripService.endTrip(1L, new TripEndRequest(), 42L));
    }

    @Test
    void endTrip_nullNotes_doesNotOverwriteExistingNotes() {
        Trip trip = activeTrip(1L, 42L);
        trip.setNotes("original note");
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(tripRepo.save(any())).thenReturn(trip);
        when(userRepo.findById(42L)).thenReturn(Optional.empty());
        when(tripMapper.toModel(any(), any())).thenReturn(new com.mermaid.app.model.Trip());

        TripEndRequest req = new TripEndRequest(); // notes field is null/undefined
        tripService.endTrip(1L, req, 42L);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepo).save(captor.capture());
        assertEquals("original note", captor.getValue().getNotes());
    }

    // --- helpers ---

    private Trip activeTrip(Long id, Long fishermanId) {
        Trip t = new Trip();
        t.setId(id);
        t.setFishermanId(fishermanId);
        t.setStatus(TripStatus.ACTIVE);
        t.setDeparturePoint("Navotas Port");
        t.setTargetArea("Manila Bay");
        t.setStartedAt(OffsetDateTime.now());
        return t;
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
./mvnw test -Dtest=TripServiceTest -q
```

Expected: FAIL — `TripService` does not exist.

- [ ] **Step 3: Implement TripService**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.Trip;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.TripMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.TripRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class TripService {

    private final TripRepository tripRepo;
    private final TripMapper tripMapper;
    private final UserRepository userRepo;

    public TripService(TripRepository tripRepo, TripMapper tripMapper, UserRepository userRepo) {
        this.tripRepo = tripRepo;
        this.tripMapper = tripMapper;
        this.userRepo = userRepo;
    }

    private String resolveFishermanName(Long fishermanId) {
        return userRepo.findById(fishermanId).map(u -> u.getFullName()).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Trip> listTrips(TripStatus statusFilter, Long fishermanId) {
        List<Trip> entities = statusFilter == null
            ? tripRepo.findAllByFishermanIdOrderByStartedAtDescIdDesc(fishermanId)
            : tripRepo.findAllByFishermanIdAndStatusOrderByStartedAtDescIdDesc(fishermanId, statusFilter);
        String fishermanName = resolveFishermanName(fishermanId);
        return entities.stream().map(e -> tripMapper.toModel(e, fishermanName)).toList();
    }

    @Transactional
    public com.mermaid.app.model.Trip startTrip(TripStartRequest req, Long fishermanId) {
        Trip trip = new Trip();
        trip.setFishermanId(fishermanId);
        trip.setDeparturePoint(req.getDeparturePoint());
        trip.setTargetArea(req.getTargetArea());
        if (req.getVesselName() != null && req.getVesselName().isPresent()) {
            trip.setVesselName(req.getVesselName().get());
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            trip.setNotes(req.getNotes().get());
        }
        Trip saved = tripRepo.save(trip);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.Trip getTripById(Long tripId, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
        return tripMapper.toModel(trip, resolveFishermanName(fishermanId));
    }

    @Transactional
    public SafetyChecklist saveTripChecklist(Long tripId, SafetyChecklistRequest req, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripNotActiveException(tripId);
        }
        trip.setFuelChecked(req.getFuelChecked());
        trip.setEngineChecked(req.getEngineChecked());
        trip.setRadioChecked(req.getRadioChecked());
        trip.setLifeVestChecked(req.getLifeVestChecked());
        trip.setWeatherReviewed(req.getWeatherReviewed());
        trip.setEmergencyKitChecked(req.getEmergencyKitChecked());
        trip.setChecklistCompletedAt(OffsetDateTime.now());
        tripRepo.save(trip);
        // Return the SafetyChecklist model directly (not the full Trip)
        SafetyChecklist c = new SafetyChecklist();
        c.setFuelChecked(req.getFuelChecked());
        c.setEngineChecked(req.getEngineChecked());
        c.setRadioChecked(req.getRadioChecked());
        c.setLifeVestChecked(req.getLifeVestChecked());
        c.setWeatherReviewed(req.getWeatherReviewed());
        c.setEmergencyKitChecked(req.getEmergencyKitChecked());
        c.setChecklistCompletedAt(
            org.openapitools.jackson.nullable.JsonNullable.of(trip.getChecklistCompletedAt()));
        return c;
    }

    @Transactional
    public com.mermaid.app.model.Trip endTrip(Long tripId, TripEndRequest req, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripNotActiveException(tripId);
        }
        trip.setStatus(TripStatus.COMPLETED);
        trip.setEndedAt(OffsetDateTime.now());
        if (req != null && req.getNotes() != null && req.getNotes().isPresent()) {
            trip.setNotes(req.getNotes().get());
        }
        Trip saved = tripRepo.save(trip);
        return tripMapper.toModel(saved, resolveFishermanName(fishermanId));
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
./mvnw test -Dtest=TripServiceTest -q
```

Expected: BUILD SUCCESS, 10 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/TripService.java \
        backend/src/test/java/com/mermaid/app/service/TripServiceTest.java
git commit -m "feat: add TripService with full lifecycle management (TDD)"
```

---

## Task 7: TripController (TDD)

**Files:**
- Create test: `backend/src/test/java/com/mermaid/app/controller/TripControllerTest.java`
- Create: `backend/src/main/java/com/mermaid/app/controller/TripController.java`

The test uses `@WebMvcTest` + `@MockitoBean`. The `@TestConfiguration` for `JsonNullableModule` is required (same as `VendorDemandListingControllerTest`). Use `ROLE_FISHERMAN` instead of `ROLE_VENDOR`. `@MockitoBean JwtDecoder jwtDecoder` is required in every controller test.

- [ ] **Step 1: Write the failing controller tests**

```java
package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.service.TripService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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

@WebMvcTest(TripController.class)
@Import(TripControllerTest.TestConfig.class)
class TripControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean TripService tripService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asFisherman(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_FISHERMAN"));
    }

    @Test
    void startTrip_asFisherman_returns201() throws Exception {
        TripStartRequest req = new TripStartRequest("Navotas Port", "Manila Bay");
        com.mermaid.app.model.Trip trip = new com.mermaid.app.model.Trip(1L, 42L, TripStatus.ACTIVE, OffsetDateTime.now());
        when(tripService.startTrip(any(), eq(42L))).thenReturn(trip);

        mockMvc.perform(post("/trips")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated());
    }

    @Test
    void startTrip_asNonFisherman_returns403() throws Exception {
        TripStartRequest req = new TripStartRequest("Navotas Port", "Manila Bay");

        mockMvc.perform(post("/trips")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VENDOR")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    @Test
    void startTrip_missingDeparturePoint_returns400() throws Exception {
        // departurePoint is required — omitting it triggers @Valid
        String body = "{\"targetArea\": \"Manila Bay\"}";

        mockMvc.perform(post("/trips")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getTripById_notFound_returns404() throws Exception {
        when(tripService.getTripById(eq(99L), any()))
            .thenThrow(new ResourceNotFoundException("Trip", 99L));

        mockMvc.perform(get("/trips/99").with(asFisherman(42L)))
            .andExpect(status().isNotFound());
    }

    @Test
    void saveTripChecklist_activeTrip_returns200() throws Exception {
        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, false, true, true, false);
        when(tripService.saveTripChecklist(eq(1L), any(), any()))
            .thenReturn(new SafetyChecklist());

        mockMvc.perform(put("/trips/1/checklist")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());
    }

    @Test
    void saveTripChecklist_completedTrip_returns409() throws Exception {
        SafetyChecklistRequest req = new SafetyChecklistRequest(true, true, true, true, true, true);
        when(tripService.saveTripChecklist(eq(1L), any(), any()))
            .thenThrow(new TripNotActiveException(1L));

        mockMvc.perform(put("/trips/1/checklist")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }

    @Test
    void endTrip_activeTrip_returns200() throws Exception {
        when(tripService.endTrip(eq(1L), any(), any()))
            .thenReturn(new com.mermaid.app.model.Trip(1L, 42L, TripStatus.COMPLETED, OffsetDateTime.now()));

        mockMvc.perform(post("/trips/1/end")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
    }

    @Test
    void endTrip_completedTrip_returns409() throws Exception {
        when(tripService.endTrip(eq(1L), any(), any()))
            .thenThrow(new TripNotActiveException(1L));

        mockMvc.perform(post("/trips/1/end")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isConflict());
    }

    @Test
    void listTrips_invalidStatusParam_returns400() throws Exception {
        mockMvc.perform(get("/trips?status=BOGUS").with(asFisherman(42L)))
            .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
./mvnw test -Dtest=TripControllerTest -q
```

Expected: FAIL — `TripController` does not exist.

- [ ] **Step 3: Implement TripController**

```java
package com.mermaid.app.controller;

import com.mermaid.app.api.TripsApi;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.TripService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class TripController implements TripsApi {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @Override
    public ResponseEntity<List<Trip>> listTrips(TripStatus status) {
        return ResponseEntity.ok(tripService.listTrips(status, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Trip> startTrip(TripStartRequest tripStartRequest) {
        return ResponseEntity.status(201).body(
            tripService.startTrip(tripStartRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Trip> getTripById(Long tripId) {
        return ResponseEntity.ok(tripService.getTripById(tripId, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<SafetyChecklist> saveTripChecklist(Long tripId,
                                                              SafetyChecklistRequest safetyChecklistRequest) {
        return ResponseEntity.ok(
            tripService.saveTripChecklist(tripId, safetyChecklistRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Trip> endTrip(Long tripId, TripEndRequest tripEndRequest) {
        return ResponseEntity.ok(
            tripService.endTrip(tripId, tripEndRequest, SecurityUtils.currentUserId()));
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
./mvnw test -Dtest=TripControllerTest -q
```

Expected: BUILD SUCCESS, 9 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/TripController.java \
        backend/src/test/java/com/mermaid/app/controller/TripControllerTest.java
git commit -m "feat: add TripController implementing TripsApi (TDD)"
```

---

## Task 8: CatchLog entity + CatchLogRepository

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/CatchLog.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/CatchLogRepository.java`

The `species` association is `LAZY` and will be loaded via `@EntityGraph` in list queries. `tripId` and `matchedListingId` are bare `Long` fields (no `@ManyToOne`).

- [ ] **Step 1: Create CatchLog entity**

```java
package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "catch_logs")
public class CatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id", nullable = false)
    private FishSpecies species;

    @Column(name = "quantity_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityKg;

    @Column(name = "estimated_price_per_kg", precision = 10, scale = 2)
    private BigDecimal estimatedPricePerKg;

    @Column(name = "matched_listing_id")
    private Long matchedListingId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "logged_at", nullable = false)
    private OffsetDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        if (loggedAt == null) loggedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }
    public FishSpecies getSpecies() { return species; }
    public void setSpecies(FishSpecies species) { this.species = species; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public BigDecimal getEstimatedPricePerKg() { return estimatedPricePerKg; }
    public void setEstimatedPricePerKg(BigDecimal v) { this.estimatedPricePerKg = v; }
    public Long getMatchedListingId() { return matchedListingId; }
    public void setMatchedListingId(Long matchedListingId) { this.matchedListingId = matchedListingId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public OffsetDateTime getLoggedAt() { return loggedAt; }
    public void setLoggedAt(OffsetDateTime loggedAt) { this.loggedAt = loggedAt; }
}
```

- [ ] **Step 2: Create CatchLogRepository**

```java
package com.mermaid.app.repository;

import com.mermaid.app.domain.CatchLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CatchLogRepository extends JpaRepository<CatchLog, Long> {

    // @EntityGraph prevents N+1: species is JOIN-fetched in a single query for all rows
    @EntityGraph(attributePaths = {"species"})
    List<CatchLog> findAllByTripIdOrderByLoggedAtDesc(Long tripId);

    // Scoped to a trip — returns empty if catch belongs to a different trip
    Optional<CatchLog> findByIdAndTripId(Long id, Long tripId);
}
```

- [ ] **Step 3: Compile check**

```bash
./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/CatchLog.java \
        backend/src/main/java/com/mermaid/app/repository/CatchLogRepository.java
git commit -m "feat: add CatchLog entity and CatchLogRepository"
```

---

## Task 9: CatchLogMapper (TDD)

**Files:**
- Create test: `backend/src/test/java/com/mermaid/app/mapper/CatchLogMapperTest.java`
- Create: `backend/src/main/java/com/mermaid/app/mapper/CatchLogMapper.java`

The mapper delegates the nested `species` object to the existing `FishSpeciesMapper`. Species is JOIN-fetched by `@EntityGraph`, so no extra query fires during mapping.

- [ ] **Step 1: Write the failing test**

```java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CatchLogMapperTest {

    private final CatchLogMapper mapper = new CatchLogMapper(new FishSpeciesMapper());

    @Test
    void toModel_mapsAllFields() {
        FishSpecies species = new FishSpecies();
        species.setId(3L);
        species.setCommonName("Bangus");
        species.setActive(true);

        CatchLog entity = new CatchLog();
        entity.setId(10L);
        entity.setTripId(1L);
        entity.setSpecies(species);
        entity.setQuantityKg(new BigDecimal("5.5"));
        entity.setEstimatedPricePerKg(new BigDecimal("120.00"));
        entity.setMatchedListingId(7L);
        entity.setNotes("fresh");
        entity.setLoggedAt(OffsetDateTime.now());

        com.mermaid.app.model.CatchLog model = mapper.toModel(entity);

        assertEquals(10L, model.getId());
        assertEquals(1L, model.getTripId());
        assertEquals("Bangus", model.getSpecies().getCommonName());
        assertEquals(5.5, model.getQuantityKg());
        assertEquals(120.0, model.getEstimatedPricePerKg().get());
        assertEquals(7L, model.getMatchedListingId().get());
        assertEquals("fresh", model.getNotes().get());
    }

    @Test
    void toModel_nullOptionalFields_mapToUndefined() {
        FishSpecies species = new FishSpecies();
        species.setId(3L);
        species.setCommonName("Bangus");
        species.setActive(true);

        CatchLog entity = new CatchLog();
        entity.setId(10L);
        entity.setTripId(1L);
        entity.setSpecies(species);
        entity.setQuantityKg(new BigDecimal("5.0"));
        entity.setLoggedAt(OffsetDateTime.now());
        // estimatedPricePerKg, matchedListingId, notes all null

        com.mermaid.app.model.CatchLog model = mapper.toModel(entity);

        assertNull(model.getEstimatedPricePerKg().get());
        assertNull(model.getMatchedListingId().get());
        assertNull(model.getNotes().get());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
./mvnw test -Dtest=CatchLogMapperTest -q
```

Expected: FAIL.

- [ ] **Step 3: Implement CatchLogMapper**

```java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.CatchLog;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class CatchLogMapper {

    private final FishSpeciesMapper fishSpeciesMapper;

    public CatchLogMapper(FishSpeciesMapper fishSpeciesMapper) {
        this.fishSpeciesMapper = fishSpeciesMapper;
    }

    public com.mermaid.app.model.CatchLog toModel(CatchLog entity) {
        com.mermaid.app.model.CatchLog m = new com.mermaid.app.model.CatchLog(
            entity.getId(),
            entity.getTripId(),
            fishSpeciesMapper.toModel(entity.getSpecies()),
            toDouble(entity.getQuantityKg()),
            entity.getLoggedAt()
        );
        m.setEstimatedPricePerKg(JsonNullable.of(toDouble(entity.getEstimatedPricePerKg())));
        m.setMatchedListingId(JsonNullable.of(entity.getMatchedListingId()));
        m.setNotes(JsonNullable.of(entity.getNotes()));
        return m;
    }

    private static Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
./mvnw test -Dtest=CatchLogMapperTest -q
```

Expected: BUILD SUCCESS, 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/mapper/CatchLogMapper.java \
        backend/src/test/java/com/mermaid/app/mapper/CatchLogMapperTest.java
git commit -m "feat: add CatchLogMapper (TDD)"
```

---

## Task 10: CatchLogService (TDD)

**Files:**
- Create test: `backend/src/test/java/com/mermaid/app/service/CatchLogServiceTest.java`
- Create: `backend/src/main/java/com/mermaid/app/service/CatchLogService.java`

The `getOwnedActiveTrip` private helper bundles ownership check + ACTIVE guard — used by all four mutation methods to eliminate duplication. `listByTrip` uses only the ownership check (ACTIVE guard not applied — reads on completed trips are allowed).

- [ ] **Step 1: Write all failing tests**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.Trip;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.CatchLogMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.CatchLogRepository;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.TripRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatchLogServiceTest {

    @Mock CatchLogRepository catchLogRepo;
    @Mock TripRepository tripRepo;
    @Mock CatchLogMapper catchLogMapper;
    @Mock FishSpeciesRepository speciesRepo;
    @Mock DemandListingRepository listingRepo;
    @InjectMocks CatchLogService catchLogService;

    // --- listByTrip ---

    @Test
    void listByTrip_notOwnedTrip_throwsResourceNotFoundException() {
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.listByTrip(1L, 42L));
    }

    @Test
    void listByTrip_completedTrip_returnsResults() {
        // ACTIVE guard NOT applied for reads — completed trips are readable
        Trip completedTrip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(completedTrip));
        when(catchLogRepo.findAllByTripIdOrderByLoggedAtDesc(1L)).thenReturn(List.of());

        assertDoesNotThrow(() -> catchLogService.listByTrip(1L, 42L));
    }

    // --- create ---

    @Test
    void create_activeTrip_savesAndReturnsMappedModel() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        FishSpecies species = speciesEntity(3L);
        CatchLog saved = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(3L)).thenReturn(Optional.of(species));
        when(catchLogRepo.save(any())).thenReturn(saved);
        when(catchLogMapper.toModel(saved)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, 5.0);
        assertDoesNotThrow(() -> catchLogService.create(1L, req, 42L));
        verify(catchLogRepo).save(any());
    }

    @Test
    void create_speciesNotFound_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

        CatchLogCreateRequest req = new CatchLogCreateRequest(99L, 5.0);
        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.create(1L, req, 42L));
    }

    @Test
    void create_invalidMatchedListingId_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        FishSpecies species = speciesEntity(3L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(3L)).thenReturn(Optional.of(species));
        when(listingRepo.findById(999L)).thenReturn(Optional.empty());

        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, 5.0);
        req.setMatchedListingId(
            org.openapitools.jackson.nullable.JsonNullable.of(999L));
        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.create(1L, req, 42L));
    }

    @Test
    void create_nullMatchedListingId_skipsListingValidation() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        FishSpecies species = speciesEntity(3L);
        CatchLog saved = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(speciesRepo.findById(3L)).thenReturn(Optional.of(species));
        when(catchLogRepo.save(any())).thenReturn(saved);
        when(catchLogMapper.toModel(saved)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, 5.0);
        // matchedListingId left as undefined/null — validation must not be attempted
        catchLogService.create(1L, req, 42L);

        verify(listingRepo, never()).findById(any());
    }

    @Test
    void create_completedTrip_throwsTripNotActiveException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> catchLogService.create(1L, new CatchLogCreateRequest(3L, 5.0), 42L));
    }

    // --- update ---

    @Test
    void update_nonNullFieldsOnly_applied() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        catchLog.setNotes("original");
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));
        when(catchLogRepo.save(any())).thenReturn(catchLog);
        when(catchLogMapper.toModel(catchLog)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        // notes field left null — must not overwrite existing value
        catchLogService.update(1L, 10L, req, 42L);

        verify(catchLogRepo).save(argThat(c -> "original".equals(c.getNotes())));
    }

    @Test
    void update_nullMatchedListingId_clearsField() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        catchLog.setMatchedListingId(5L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));
        when(catchLogRepo.save(any())).thenReturn(catchLog);
        when(catchLogMapper.toModel(catchLog)).thenReturn(new com.mermaid.app.model.CatchLog());

        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        req.setMatchedListingId(
            org.openapitools.jackson.nullable.JsonNullable.of(null)); // explicit null = clear
        catchLogService.update(1L, 10L, req, 42L);

        verify(catchLogRepo).save(argThat(c -> c.getMatchedListingId() == null));
        verify(listingRepo, never()).findById(any());
    }

    @Test
    void update_newSpeciesNotFound_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));
        when(speciesRepo.findById(99L)).thenReturn(Optional.empty());

        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        req.setSpeciesId(99L);
        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.update(1L, 10L, req, 42L));
    }

    @Test
    void update_catchNotInTrip_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.update(1L, 99L, new CatchLogUpdateRequest(), 42L));
    }

    @Test
    void update_completedTrip_throwsTripNotActiveException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> catchLogService.update(1L, 10L, new CatchLogUpdateRequest(), 42L));
    }

    // --- delete ---

    @Test
    void delete_activeTrip_callsDeleteById() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        CatchLog catchLog = catchLogEntity(10L, 1L);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(catchLog));

        catchLogService.delete(1L, 10L, 42L);

        verify(catchLogRepo).deleteById(10L);
        verify(catchLogRepo, never()).save(any());
    }

    @Test
    void delete_completedTrip_throwsTripNotActiveException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.COMPLETED);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));

        assertThrows(TripNotActiveException.class,
            () -> catchLogService.delete(1L, 10L, 42L));
    }

    @Test
    void delete_catchNotInTrip_throwsResourceNotFoundException() {
        Trip trip = tripEntity(1L, 42L, TripStatus.ACTIVE);
        when(tripRepo.findByIdAndFishermanId(1L, 42L)).thenReturn(Optional.of(trip));
        when(catchLogRepo.findByIdAndTripId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> catchLogService.delete(1L, 99L, 42L));
    }

    // --- helpers ---

    private Trip tripEntity(Long id, Long fishermanId, TripStatus status) {
        Trip t = new Trip();
        t.setId(id);
        t.setFishermanId(fishermanId);
        t.setStatus(status);
        t.setDeparturePoint("Navotas Port");
        t.setTargetArea("Manila Bay");
        t.setStartedAt(OffsetDateTime.now());
        return t;
    }

    private FishSpecies speciesEntity(Long id) {
        FishSpecies s = new FishSpecies();
        s.setId(id);
        s.setCommonName("Bangus");
        s.setActive(true);
        return s;
    }

    private CatchLog catchLogEntity(Long id, Long tripId) {
        CatchLog c = new CatchLog();
        c.setId(id);
        c.setTripId(tripId);
        c.setQuantityKg(new BigDecimal("5.0"));
        c.setLoggedAt(OffsetDateTime.now());
        FishSpecies s = speciesEntity(3L);
        c.setSpecies(s);
        return c;
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
./mvnw test -Dtest=CatchLogServiceTest -q
```

Expected: FAIL — `CatchLogService` does not exist.

- [ ] **Step 3: Implement CatchLogService**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.domain.Trip;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.mapper.CatchLogMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.CatchLogRepository;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.TripRepository;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class CatchLogService {

    private final CatchLogRepository catchLogRepo;
    private final TripRepository tripRepo;
    private final CatchLogMapper catchLogMapper;
    private final FishSpeciesRepository speciesRepo;
    private final DemandListingRepository listingRepo;

    public CatchLogService(CatchLogRepository catchLogRepo,
                           TripRepository tripRepo,
                           CatchLogMapper catchLogMapper,
                           FishSpeciesRepository speciesRepo,
                           DemandListingRepository listingRepo) {
        this.catchLogRepo = catchLogRepo;
        this.tripRepo = tripRepo;
        this.catchLogMapper = catchLogMapper;
        this.speciesRepo = speciesRepo;
        this.listingRepo = listingRepo;
    }

    /** Ownership + ACTIVE guard combined — used by all mutation methods. */
    private Trip getOwnedActiveTrip(Long tripId, Long fishermanId) {
        Trip trip = tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new TripNotActiveException(tripId);
        }
        return trip;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.CatchLog> listByTrip(Long tripId, Long fishermanId) {
        // Ownership check only — completed trips are readable
        tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
        return catchLogRepo.findAllByTripIdOrderByLoggedAtDesc(tripId)
            .stream().map(catchLogMapper::toModel).toList();
    }

    @Transactional
    public com.mermaid.app.model.CatchLog create(Long tripId, CatchLogCreateRequest req, Long fishermanId) {
        getOwnedActiveTrip(tripId, fishermanId);

        FishSpecies species = speciesRepo.findById(req.getSpeciesId())
            .orElseThrow(() -> new ResourceNotFoundException("FishSpecies", req.getSpeciesId()));

        // Validate matchedListingId only if explicitly provided and non-null
        Long listingId = unwrap(req.getMatchedListingId());
        if (listingId != null) {
            listingRepo.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("DemandListing", listingId));
        }

        CatchLog log = new CatchLog();
        log.setTripId(tripId);
        log.setSpecies(species);
        log.setQuantityKg(BigDecimal.valueOf(req.getQuantityKg()));
        log.setEstimatedPricePerKg(req.getEstimatedPricePerKg() != null && req.getEstimatedPricePerKg().isPresent()
            ? BigDecimal.valueOf(req.getEstimatedPricePerKg().get()) : null);
        log.setMatchedListingId(listingId);
        log.setNotes(unwrap(req.getNotes()));

        return catchLogMapper.toModel(catchLogRepo.save(log));
    }

    @Transactional
    public com.mermaid.app.model.CatchLog update(Long tripId, Long catchId,
                                                   CatchLogUpdateRequest req, Long fishermanId) {
        getOwnedActiveTrip(tripId, fishermanId);

        CatchLog log = catchLogRepo.findByIdAndTripId(catchId, tripId)
            .orElseThrow(() -> new ResourceNotFoundException("CatchLog", catchId));

        if (req.getSpeciesId() != null) {
            FishSpecies species = speciesRepo.findById(req.getSpeciesId())
                .orElseThrow(() -> new ResourceNotFoundException("FishSpecies", req.getSpeciesId()));
            log.setSpecies(species);
        }
        if (req.getQuantityKg() != null) {
            log.setQuantityKg(BigDecimal.valueOf(req.getQuantityKg()));
        }
        if (req.getEstimatedPricePerKg() != null && req.getEstimatedPricePerKg().isPresent()) {
            Double price = req.getEstimatedPricePerKg().get();
            log.setEstimatedPricePerKg(price == null ? null : BigDecimal.valueOf(price));
        }
        // matchedListingId: JsonNullable.of(null) = clear; JsonNullable.of(id) = validate + set; undefined = leave
        if (req.getMatchedListingId() != null && req.getMatchedListingId().isPresent()) {
            Long newListingId = req.getMatchedListingId().get();
            if (newListingId != null) {
                listingRepo.findById(newListingId)
                    .orElseThrow(() -> new ResourceNotFoundException("DemandListing", newListingId));
            }
            log.setMatchedListingId(newListingId);
        }
        if (req.getNotes() != null && req.getNotes().isPresent()) {
            log.setNotes(req.getNotes().get());
        }

        return catchLogMapper.toModel(catchLogRepo.save(log));
    }

    @Transactional
    public void delete(Long tripId, Long catchId, Long fishermanId) {
        getOwnedActiveTrip(tripId, fishermanId);
        CatchLog log = catchLogRepo.findByIdAndTripId(catchId, tripId)
            .orElseThrow(() -> new ResourceNotFoundException("CatchLog", catchId));
        catchLogRepo.deleteById(log.getId());
    }

    private static <T> T unwrap(JsonNullable<T> jn) {
        return (jn != null && jn.isPresent()) ? jn.get() : null;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
./mvnw test -Dtest=CatchLogServiceTest -q
```

Expected: BUILD SUCCESS, 15 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/CatchLogService.java \
        backend/src/test/java/com/mermaid/app/service/CatchLogServiceTest.java
git commit -m "feat: add CatchLogService with ownership and ACTIVE guards (TDD)"
```

---

## Task 11: CatchLogController (TDD)

**Files:**
- Create test: `backend/src/test/java/com/mermaid/app/controller/CatchLogControllerTest.java`
- Create: `backend/src/main/java/com/mermaid/app/controller/CatchLogController.java`

- [ ] **Step 1: Write the failing controller tests**

```java
package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.exception.TripNotActiveException;
import com.mermaid.app.model.*;
import com.mermaid.app.service.CatchLogService;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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

@WebMvcTest(CatchLogController.class)
@Import(CatchLogControllerTest.TestConfig.class)
class CatchLogControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean CatchLogService catchLogService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asFisherman(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_FISHERMAN"));
    }

    private com.mermaid.app.model.CatchLog catchLogModel() {
        FishSpecies species = new FishSpecies(3L, "Bangus", true);
        return new com.mermaid.app.model.CatchLog(1L, 1L, species, 5.0, OffsetDateTime.now());
    }

    @Test
    void createCatchLog_asFisherman_returns201() throws Exception {
        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, 5.0);
        when(catchLogService.create(eq(1L), any(), any())).thenReturn(catchLogModel());

        mockMvc.perform(post("/trips/1/catches")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated());
    }

    @Test
    void createCatchLog_asNonFisherman_returns403() throws Exception {
        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, 5.0);

        mockMvc.perform(post("/trips/1/catches")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VENDOR")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    @Test
    void createCatchLog_belowMinQuantity_returns400() throws Exception {
        // quantityKg: 0.0 violates @DecimalMin("0.1")
        String body = "{\"speciesId\": 3, \"quantityKg\": 0.0}";

        mockMvc.perform(post("/trips/1/catches")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createCatchLog_completedTrip_returns409() throws Exception {
        CatchLogCreateRequest req = new CatchLogCreateRequest(3L, 5.0);
        when(catchLogService.create(eq(1L), any(), any()))
            .thenThrow(new TripNotActiveException(1L));

        mockMvc.perform(post("/trips/1/catches")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }

    @Test
    void updateCatchLog_returns200() throws Exception {
        CatchLogUpdateRequest req = new CatchLogUpdateRequest();
        when(catchLogService.update(eq(1L), eq(10L), any(), any()))
            .thenReturn(catchLogModel());

        mockMvc.perform(put("/trips/1/catches/10")
                .with(asFisherman(42L))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());
    }

    @Test
    void deleteCatchLog_returns204() throws Exception {
        mockMvc.perform(delete("/trips/1/catches/10").with(asFisherman(42L)))
            .andExpect(status().isNoContent());
    }

    @Test
    void deleteCatchLog_notFound_returns404() throws Exception {
        when(catchLogService.listByTrip(eq(1L), any()))  // reuse as stub target
            .thenReturn(List.of());
        // For delete, use the service throwing exception
        org.mockito.Mockito.doThrow(new ResourceNotFoundException("CatchLog", 99L))
            .when(catchLogService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/trips/1/catches/99").with(asFisherman(42L)))
            .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
./mvnw test -Dtest=CatchLogControllerTest -q
```

Expected: FAIL — `CatchLogController` does not exist.

- [ ] **Step 3: Implement CatchLogController**

```java
package com.mermaid.app.controller;

import com.mermaid.app.api.CatchLogsApi;
import com.mermaid.app.model.*;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.CatchLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('FISHERMAN')")
public class CatchLogController implements CatchLogsApi {

    private final CatchLogService catchLogService;

    public CatchLogController(CatchLogService catchLogService) {
        this.catchLogService = catchLogService;
    }

    @Override
    public ResponseEntity<List<CatchLog>> listCatchLogsByTrip(Long tripId) {
        return ResponseEntity.ok(catchLogService.listByTrip(tripId, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<CatchLog> createCatchLog(Long tripId, CatchLogCreateRequest catchLogCreateRequest) {
        return ResponseEntity.status(201).body(
            catchLogService.create(tripId, catchLogCreateRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<CatchLog> updateCatchLog(Long tripId, Long catchId,
                                                    CatchLogUpdateRequest catchLogUpdateRequest) {
        return ResponseEntity.ok(
            catchLogService.update(tripId, catchId, catchLogUpdateRequest, SecurityUtils.currentUserId()));
    }

    @Override
    public ResponseEntity<Void> deleteCatchLog(Long tripId, Long catchId) {
        catchLogService.delete(tripId, catchId, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
./mvnw test -Dtest=CatchLogControllerTest -q
```

Expected: BUILD SUCCESS, 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/CatchLogController.java \
        backend/src/test/java/com/mermaid/app/controller/CatchLogControllerTest.java
git commit -m "feat: add CatchLogController implementing CatchLogsApi (TDD)"
```

---

## Task 12: Full test suite verification

Run the complete backend test suite to confirm nothing is broken.

- [ ] **Step 1: Run all tests**

```bash
cd backend
./mvnw test
```

Expected: BUILD SUCCESS. All existing tests (auth, admin, advisories, demand listings, marketplace) plus all new tests pass. Zero failures.

- [ ] **Step 2: If any test fails, investigate and fix before proceeding**

Common failure causes:
- Missing import in a new class → add the import
- `@MockitoBean` vs `@MockBean` — this project uses `@MockitoBean` (Spring Boot 3.4+), not the older `@MockBean`
- The `TestConfig` inner class for `JsonNullableModule` is required in every controller test — don't omit it

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: address test failures from full suite run"
```
