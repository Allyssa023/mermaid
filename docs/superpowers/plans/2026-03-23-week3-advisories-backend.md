# Week 3 Backend: Advisories + Reference Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement admin advisories CRUD, public advisories feed, and reference data management (fish species + market locations) as the Week 3 manifesto milestone.

**Architecture:** Three new service+repo+mapper+entity triads (FishSpecies, MarketLocation, Advisory) follow the existing `AdminUserService` pattern exactly. Two new controllers (`AdvisoryController`, `LookupController`) implement generated OpenAPI interfaces. `AdminController` is un-stubbed to wire all three services. All new endpoints require a valid JWT; admin endpoints already enforce `hasRole('ADMIN')` at class level.

**Tech Stack:** Java 21, Spring Boot 3, Spring Data JPA, PostgreSQL, Flyway, JUnit 5 + Mockito, `@WebMvcTest` slices with `MockMvc`.

**Spec:** `docs/superpowers/specs/2026-03-23-week3-advisories-backend-design.md`

---

## File Map

### New files
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
  mapper/
    FishSpeciesMapper.java
    MarketLocationMapper.java
    AdvisoryMapper.java
  service/
    FishSpeciesService.java
    MarketLocationService.java
    AdvisoryService.java
  controller/
    LookupController.java
    AdvisoryController.java

backend/src/test/java/com/mermaid/app/
  service/
    FishSpeciesServiceTest.java
    MarketLocationServiceTest.java
    AdvisoryServiceTest.java
  controller/
    LookupControllerTest.java
    AdvisoryControllerTest.java
    AdminAdvisoryControllerTest.java
```

### Modified files
```
backend/src/main/java/com/mermaid/app/
  exception/GlobalExceptionHandler.java   — add IllegalArgumentException → 400
  controller/AdminController.java         — inject 3 services, replace stubs
```

---

## Task 1: DB Migrations

**Files:**
- Create: `backend/src/main/resources/db/migration/V4__create_reference_tables.sql`
- Create: `backend/src/main/resources/db/migration/V5__create_advisories_table.sql`
- Create: `backend/src/main/resources/db/migration/V6__seed_reference_data.sql`

> Flyway runs automatically on `spring-boot:run`. No unit test needed — verified by running the app or integration tests that start the context.

- [ ] **Step 1: Create V4 — reference tables**

```sql
-- V4__create_reference_tables.sql
CREATE TABLE fish_species (
    id              BIGSERIAL    PRIMARY KEY,
    common_name     VARCHAR(100) NOT NULL,
    scientific_name VARCHAR(150),
    active          BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_fish_species_common_name UNIQUE (common_name)
);

CREATE INDEX idx_fish_species_active ON fish_species (active) WHERE active = true;

CREATE TABLE market_locations (
    id           BIGSERIAL    PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    province     VARCHAR(100),
    active       BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_locations_active ON market_locations (active) WHERE active = true;
```

- [ ] **Step 2: Create V5 — advisories table**

```sql
-- V5__create_advisories_table.sql
CREATE TABLE advisories (
    id                  BIGSERIAL    PRIMARY KEY,
    title               VARCHAR(150) NOT NULL,
    message             TEXT         NOT NULL,
    severity            VARCHAR(20)  NOT NULL,
    affected_area       VARCHAR(150) NOT NULL,
    active_from         TIMESTAMPTZ  NOT NULL,
    active_to           TIMESTAMPTZ  NOT NULL,
    is_active           BOOLEAN      NOT NULL DEFAULT true,
    created_by_user_id  BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_advisories_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

CREATE INDEX idx_advisories_active ON advisories (is_active, active_from, active_to)
    WHERE is_active = true;
```

- [ ] **Step 3: Create V6 — seed data**

```sql
-- V6__seed_reference_data.sql
INSERT INTO fish_species (common_name, scientific_name) VALUES
    ('Bangus',      'Chanos chanos'),
    ('Tilapia',     'Oreochromis niloticus'),
    ('Galunggong',  'Decapterus macarellus'),
    ('Tanigue',     'Scomberomorus commerson'),
    ('Lapu-lapu',   'Epinephelus coioides'),
    ('Dilis',       'Stolephorus sp.'),
    ('Alumahan',    'Rastrelliger kanagurta'),
    ('Espada',      'Trichiurus lepturus'),
    ('Maya-maya',   'Lutjanus campechanus'),
    ('Pampano',     'Trachinotus blochii');

INSERT INTO market_locations (name, municipality, province) VALUES
    ('Navotas Fish Port Complex', 'Navotas',      'Metro Manila'),
    ('Divisoria Market',          'Manila',        'Metro Manila'),
    ('Commonwealth Market',       'Quezon City',   'Metro Manila'),
    ('Carbon Market',             'Cebu City',     'Cebu'),
    ('Taboan Public Market',      'Cebu City',     'Cebu');
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat: add Flyway migrations V4-V6 for reference tables, advisories, and seed data"
```

---

## Task 2: GlobalExceptionHandler — IllegalArgumentException → 400

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`

> This is exercised by `AdminAdvisoryControllerTest` in Task 8 (creating advisory with `activeTo` before `activeFrom`). No standalone test needed.

- [ ] **Step 1: Add handler method**

Open `GlobalExceptionHandler.java`. Add this method after the `handleResourceNotFound` handler:

```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ErrorResponse> handleIllegalArgument(
        IllegalArgumentException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.BAD_REQUEST, ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java
git commit -m "feat: map IllegalArgumentException to 400 in GlobalExceptionHandler"
```

---

## Task 3: FishSpecies Domain

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/FishSpecies.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/FishSpeciesRepository.java`
- Create: `backend/src/main/java/com/mermaid/app/mapper/FishSpeciesMapper.java`
- Create: `backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/FishSpeciesServiceTest.java`

- [ ] **Step 1: Write failing service tests**

```java
// FishSpeciesServiceTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.FishSpeciesMapper;
import com.mermaid.app.model.FishSpeciesCreateRequest;
import com.mermaid.app.repository.FishSpeciesRepository;
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
class FishSpeciesServiceTest {

    @Mock FishSpeciesRepository repo;
    @Mock FishSpeciesMapper mapper;
    @InjectMocks FishSpeciesService service;

    @Test
    void listActive_delegatesRepoAndMapsResults() {
        FishSpecies entity = fishSpeciesEntity(1L, "Bangus");
        com.mermaid.app.model.FishSpecies model = fishSpeciesModel(1L, "Bangus");
        when(repo.findAllByActiveTrue()).thenReturn(List.of(entity));
        when(mapper.toModel(entity)).thenReturn(model);

        List<com.mermaid.app.model.FishSpecies> result = service.listActive();

        assertEquals(1, result.size());
        assertEquals("Bangus", result.get(0).getCommonName());
    }

    @Test
    void delete_setsActiveFalse_neverHardDeletes() {
        FishSpecies entity = fishSpeciesEntity(1L, "Bangus");
        when(repo.findById(1L)).thenReturn(Optional.of(entity));

        service.delete(1L);

        assertFalse(entity.isActive());
        verify(repo).save(entity);
        verify(repo, never()).deleteById(any());
        verify(repo, never()).delete(any());
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.delete(99L));
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.update(99L, new FishSpeciesCreateRequest("Updated")));
    }

    // --- helpers ---

    private FishSpecies fishSpeciesEntity(Long id, String name) {
        FishSpecies e = new FishSpecies();
        e.setId(id);
        e.setCommonName(name);
        e.setActive(true);
        return e;
    }

    private com.mermaid.app.model.FishSpecies fishSpeciesModel(Long id, String name) {
        return new com.mermaid.app.model.FishSpecies(id, name, true);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=FishSpeciesServiceTest -DfailIfNoTests=false
```

Expected: compilation error — `FishSpeciesService`, `FishSpeciesRepository`, `FishSpeciesMapper` do not exist yet.

- [ ] **Step 3: Create FishSpecies entity**

```java
// domain/FishSpecies.java
package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fish_species")
public class FishSpecies {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "common_name", nullable = false, length = 100)
    private String commonName;

    @Column(name = "scientific_name", length = 150)
    private String scientificName;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCommonName() { return commonName; }
    public void setCommonName(String commonName) { this.commonName = commonName; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4: Create FishSpeciesRepository**

```java
// repository/FishSpeciesRepository.java
package com.mermaid.app.repository;

import com.mermaid.app.domain.FishSpecies;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FishSpeciesRepository extends JpaRepository<FishSpecies, Long> {
    List<FishSpecies> findAllByActiveTrue();
}
```

- [ ] **Step 5: Create FishSpeciesMapper**

```java
// mapper/FishSpeciesMapper.java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.FishSpecies;
import org.springframework.stereotype.Component;

@Component
public class FishSpeciesMapper {

    public com.mermaid.app.model.FishSpecies toModel(FishSpecies entity) {
        com.mermaid.app.model.FishSpecies m =
            new com.mermaid.app.model.FishSpecies(
                entity.getId(), entity.getCommonName(), entity.isActive());
        m.setScientificName(entity.getScientificName());
        return m;
    }
}
```

- [ ] **Step 6: Create FishSpeciesService**

```java
// service/FishSpeciesService.java
package com.mermaid.app.service;

import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.FishSpeciesMapper;
import com.mermaid.app.model.FishSpeciesCreateRequest;
import com.mermaid.app.repository.FishSpeciesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FishSpeciesService {

    private final FishSpeciesRepository repo;
    private final FishSpeciesMapper mapper;

    public FishSpeciesService(FishSpeciesRepository repo, FishSpeciesMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.FishSpecies> listActive() {
        return repo.findAllByActiveTrue().stream()
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional
    public com.mermaid.app.model.FishSpecies create(FishSpeciesCreateRequest request) {
        FishSpecies entity = new FishSpecies();
        entity.setCommonName(request.getCommonName().trim());
        entity.setScientificName(request.getScientificName());
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public com.mermaid.app.model.FishSpecies update(Long id, FishSpeciesCreateRequest request) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setCommonName(request.getCommonName().trim());
        entity.setScientificName(request.getScientificName());
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        FishSpecies entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
        entity.setActive(false);
        repo.save(entity);
    }
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd backend && ./mvnw test -Dtest=FishSpeciesServiceTest -DfailIfNoTests=false
```

Expected: `BUILD SUCCESS`, all 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/FishSpecies.java \
        backend/src/main/java/com/mermaid/app/repository/FishSpeciesRepository.java \
        backend/src/main/java/com/mermaid/app/mapper/FishSpeciesMapper.java \
        backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java \
        backend/src/test/java/com/mermaid/app/service/FishSpeciesServiceTest.java
git commit -m "feat: add FishSpecies entity, repo, mapper, and service with tests"
```

---

## Task 4: MarketLocation Domain

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/MarketLocation.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/MarketLocationRepository.java`
- Create: `backend/src/main/java/com/mermaid/app/mapper/MarketLocationMapper.java`
- Create: `backend/src/main/java/com/mermaid/app/service/MarketLocationService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/MarketLocationServiceTest.java`

> Identical pattern to Task 3. Follow the same shape — only field names differ.

- [ ] **Step 1: Write failing service tests**

```java
// MarketLocationServiceTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.MarketLocationMapper;
import com.mermaid.app.model.MarketLocationCreateRequest;
import com.mermaid.app.repository.MarketLocationRepository;
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
class MarketLocationServiceTest {

    @Mock MarketLocationRepository repo;
    @Mock MarketLocationMapper mapper;
    @InjectMocks MarketLocationService service;

    @Test
    void listActive_delegatesRepoAndMapsResults() {
        MarketLocation entity = locationEntity(1L, "Navotas Fish Port");
        com.mermaid.app.model.MarketLocation model = locationModel(1L, "Navotas Fish Port");
        when(repo.findAllByActiveTrue()).thenReturn(List.of(entity));
        when(mapper.toModel(entity)).thenReturn(model);

        List<com.mermaid.app.model.MarketLocation> result = service.listActive();

        assertEquals(1, result.size());
        assertEquals("Navotas Fish Port", result.get(0).getName());
    }

    @Test
    void delete_setsActiveFalse_neverHardDeletes() {
        MarketLocation entity = locationEntity(1L, "Navotas Fish Port");
        when(repo.findById(1L)).thenReturn(Optional.of(entity));

        service.delete(1L);

        assertFalse(entity.isActive());
        verify(repo).save(entity);
        verify(repo, never()).deleteById(any());
        verify(repo, never()).delete(any());
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.delete(99L));
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.update(99L, new MarketLocationCreateRequest("X", "Y")));
    }

    private MarketLocation locationEntity(Long id, String name) {
        MarketLocation e = new MarketLocation();
        e.setId(id);
        e.setName(name);
        e.setMunicipality("Navotas");
        e.setActive(true);
        return e;
    }

    private com.mermaid.app.model.MarketLocation locationModel(Long id, String name) {
        return new com.mermaid.app.model.MarketLocation(id, name, "Navotas", true);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=MarketLocationServiceTest -DfailIfNoTests=false
```

Expected: compilation error — `MarketLocationService`, `MarketLocationRepository`, `MarketLocationMapper` do not exist yet.

- [ ] **Step 3: Create MarketLocation entity**

```java
// domain/MarketLocation.java
package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "market_locations")
public class MarketLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String municipality;

    @Column(length = 100)
    private String province;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getMunicipality() { return municipality; }
    public void setMunicipality(String municipality) { this.municipality = municipality; }
    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4: Create MarketLocationRepository**

```java
// repository/MarketLocationRepository.java
package com.mermaid.app.repository;

import com.mermaid.app.domain.MarketLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MarketLocationRepository extends JpaRepository<MarketLocation, Long> {
    List<MarketLocation> findAllByActiveTrue();
}
```

- [ ] **Step 5: Create MarketLocationMapper**

```java
// mapper/MarketLocationMapper.java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.MarketLocation;
import org.springframework.stereotype.Component;

@Component
public class MarketLocationMapper {

    public com.mermaid.app.model.MarketLocation toModel(MarketLocation entity) {
        com.mermaid.app.model.MarketLocation m =
            new com.mermaid.app.model.MarketLocation(
                entity.getId(), entity.getName(), entity.getMunicipality(), entity.isActive());
        m.setProvince(entity.getProvince());
        return m;
    }
}
```

- [ ] **Step 6: Create MarketLocationService**

```java
// service/MarketLocationService.java
package com.mermaid.app.service;

import com.mermaid.app.domain.MarketLocation;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.MarketLocationMapper;
import com.mermaid.app.model.MarketLocationCreateRequest;
import com.mermaid.app.repository.MarketLocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MarketLocationService {

    private final MarketLocationRepository repo;
    private final MarketLocationMapper mapper;

    public MarketLocationService(MarketLocationRepository repo, MarketLocationMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.MarketLocation> listActive() {
        return repo.findAllByActiveTrue().stream()
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional
    public com.mermaid.app.model.MarketLocation create(MarketLocationCreateRequest request) {
        MarketLocation entity = new MarketLocation();
        entity.setName(request.getName().trim());
        entity.setMunicipality(request.getMunicipality().trim());
        entity.setProvince(request.getProvince());
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public com.mermaid.app.model.MarketLocation update(Long id, MarketLocationCreateRequest request) {
        MarketLocation entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + id));
        entity.setName(request.getName().trim());
        entity.setMunicipality(request.getMunicipality().trim());
        entity.setProvince(request.getProvince());
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        MarketLocation entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + id));
        entity.setActive(false);
        repo.save(entity);
    }
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd backend && ./mvnw test -Dtest=MarketLocationServiceTest -DfailIfNoTests=false
```

Expected: `BUILD SUCCESS`, all 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/MarketLocation.java \
        backend/src/main/java/com/mermaid/app/repository/MarketLocationRepository.java \
        backend/src/main/java/com/mermaid/app/mapper/MarketLocationMapper.java \
        backend/src/main/java/com/mermaid/app/service/MarketLocationService.java \
        backend/src/test/java/com/mermaid/app/service/MarketLocationServiceTest.java
git commit -m "feat: add MarketLocation entity, repo, mapper, and service with tests"
```

---

## Task 5: Advisory Domain

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/domain/Advisory.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/AdvisoryRepository.java`
- Create: `backend/src/main/java/com/mermaid/app/mapper/AdvisoryMapper.java`
- Create: `backend/src/main/java/com/mermaid/app/service/AdvisoryService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/AdvisoryServiceTest.java`

- [ ] **Step 1: Write failing service tests**

```java
// AdvisoryServiceTest.java
package com.mermaid.app.service;

import com.mermaid.app.domain.Advisory;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.AdvisoryMapper;
import com.mermaid.app.model.AdvisoryCreateRequest;
import com.mermaid.app.model.AdvisoryUpdateRequest;
import com.mermaid.app.model.Severity;
import com.mermaid.app.repository.AdvisoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class AdvisoryServiceTest {

    @Mock AdvisoryRepository repo;
    @Mock AdvisoryMapper mapper;
    @InjectMocks AdvisoryService service;

    @Test
    void create_whenActiveToNotAfterActiveFrom_throwsIllegalArgument() {
        OffsetDateTime now = OffsetDateTime.now();
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Flood Warning", "Avoid low-lying areas",
            Severity.HIGH, "Manila Bay",
            now.plusDays(5),   // activeFrom
            now.plusDays(1)    // activeTo — BEFORE activeFrom
        );

        assertThrows(IllegalArgumentException.class, () -> service.create(request, 1L));
        verify(repo, never()).save(any());
    }

    @Test
    void create_whenDatesValid_savesAndReturnsModel() {
        OffsetDateTime now = OffsetDateTime.now();
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Storm Warning", "Expect rough seas",
            Severity.HIGH, "Visayan Sea",
            now, now.plusDays(3)
        );
        Advisory saved = advisoryEntity(1L, Severity.HIGH);
        com.mermaid.app.model.Advisory model = advisoryModel(1L, Severity.HIGH);
        when(repo.save(any())).thenReturn(saved);
        when(mapper.toModel(saved)).thenReturn(model);

        com.mermaid.app.model.Advisory result = service.create(request, 42L);

        assertNotNull(result);
        verify(repo).save(any());
    }

    @Test
    void listActive_filtersBySeverity() {
        Advisory low = advisoryEntity(1L, Severity.LOW);
        Advisory high = advisoryEntity(2L, Severity.HIGH);
        when(repo.findActive(any())).thenReturn(List.of(low, high));
        when(mapper.toModel(high)).thenReturn(advisoryModel(2L, Severity.HIGH));

        List<com.mermaid.app.model.Advisory> result = service.listActive(Severity.HIGH);

        assertEquals(1, result.size());
        verify(mapper, never()).toModel(low);
    }

    @Test
    void listActive_noFilter_returnsAll() {
        Advisory a1 = advisoryEntity(1L, Severity.LOW);
        Advisory a2 = advisoryEntity(2L, Severity.HIGH);
        when(repo.findActive(any())).thenReturn(List.of(a1, a2));
        when(mapper.toModel(any())).thenReturn(advisoryModel(1L, Severity.LOW));

        List<com.mermaid.app.model.Advisory> result = service.listActive(null);

        assertEquals(2, result.size());
    }

    @Test
    void update_appliesOnlyNonNullFields() {
        Advisory entity = advisoryEntity(1L, Severity.LOW);
        entity.setTitle("Old Title");
        entity.setMessage("Old Message");
        when(repo.findById(1L)).thenReturn(Optional.of(entity));
        when(repo.save(entity)).thenReturn(entity);
        when(mapper.toModel(entity)).thenReturn(advisoryModel(1L, Severity.LOW));

        AdvisoryUpdateRequest request = new AdvisoryUpdateRequest();
        request.setTitle("New Title");
        // message intentionally not set — must remain "Old Message"

        service.update(1L, request);

        assertEquals("New Title", entity.getTitle());
        assertEquals("Old Message", entity.getMessage());
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.update(99L, new AdvisoryUpdateRequest()));
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(repo.existsById(99L)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> service.delete(99L));
        verify(repo, never()).deleteById(any());
    }

    // --- helpers ---

    private Advisory advisoryEntity(Long id, Severity severity) {
        Advisory e = new Advisory();
        e.setId(id);
        e.setTitle("Test Advisory");
        e.setMessage("Test message content");
        e.setSeverity(severity);
        e.setAffectedArea("Manila Bay");
        e.setActiveFrom(OffsetDateTime.now().minusHours(1));
        e.setActiveTo(OffsetDateTime.now().plusDays(2));
        e.setActive(true);
        return e;
    }

    private com.mermaid.app.model.Advisory advisoryModel(Long id, Severity severity) {
        return new com.mermaid.app.model.Advisory(
            id, "Test Advisory", "Test message content",
            severity, "Manila Bay",
            OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(2), true);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=AdvisoryServiceTest -DfailIfNoTests=false
```

Expected: compilation error — `AdvisoryService`, `AdvisoryRepository`, `AdvisoryMapper` do not exist yet.

- [ ] **Step 3: Create Advisory entity**

```java
// domain/Advisory.java
package com.mermaid.app.domain;

import com.mermaid.app.model.Severity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "advisories")
public class Advisory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity;

    @Column(name = "affected_area", nullable = false, length = 150)
    private String affectedArea;

    @Column(name = "active_from", nullable = false)
    private OffsetDateTime activeFrom;

    @Column(name = "active_to", nullable = false)
    private OffsetDateTime activeTo;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    public String getAffectedArea() { return affectedArea; }
    public void setAffectedArea(String affectedArea) { this.affectedArea = affectedArea; }
    public OffsetDateTime getActiveFrom() { return activeFrom; }
    public void setActiveFrom(OffsetDateTime activeFrom) { this.activeFrom = activeFrom; }
    public OffsetDateTime getActiveTo() { return activeTo; }
    public void setActiveTo(OffsetDateTime activeTo) { this.activeTo = activeTo; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean isActive) { this.isActive = isActive; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4: Create AdvisoryRepository**

```java
// repository/AdvisoryRepository.java
package com.mermaid.app.repository;

import com.mermaid.app.domain.Advisory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface AdvisoryRepository extends JpaRepository<Advisory, Long> {

    List<Advisory> findAllByOrderByCreatedAtDesc();

    @Query("SELECT a FROM Advisory a " +
           "WHERE a.isActive = true " +
           "AND a.activeFrom <= :now AND a.activeTo >= :now " +
           "ORDER BY a.createdAt DESC")
    List<Advisory> findActive(@Param("now") OffsetDateTime now);
}
```

- [ ] **Step 5: Create AdvisoryMapper**

```java
// mapper/AdvisoryMapper.java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.Advisory;
import org.springframework.stereotype.Component;

@Component
public class AdvisoryMapper {

    public com.mermaid.app.model.Advisory toModel(Advisory entity) {
        com.mermaid.app.model.Advisory m = new com.mermaid.app.model.Advisory(
            entity.getId(),
            entity.getTitle(),
            entity.getMessage(),
            entity.getSeverity(),
            entity.getAffectedArea(),
            entity.getActiveFrom(),
            entity.getActiveTo(),
            entity.isActive()
        );
        m.setCreatedByUserId(entity.getCreatedByUserId());
        m.setCreatedAt(entity.getCreatedAt());
        return m;
    }
}
```

- [ ] **Step 6: Create AdvisoryService**

```java
// service/AdvisoryService.java
package com.mermaid.app.service;

import com.mermaid.app.domain.Advisory;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.AdvisoryMapper;
import com.mermaid.app.model.AdvisoryCreateRequest;
import com.mermaid.app.model.AdvisoryUpdateRequest;
import com.mermaid.app.model.Severity;
import com.mermaid.app.repository.AdvisoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdvisoryService {

    private final AdvisoryRepository repo;
    private final AdvisoryMapper mapper;

    public AdvisoryService(AdvisoryRepository repo, AdvisoryMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Advisory> listAll() {
        return repo.findAllByOrderByCreatedAtDesc().stream()
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Advisory> listActive(Severity severityFilter) {
        return repo.findActive(OffsetDateTime.now()).stream()
            .filter(a -> severityFilter == null || a.getSeverity() == severityFilter)
            .map(mapper::toModel)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.Advisory getById(Long id) {
        return repo.findById(id)
            .map(mapper::toModel)
            .orElseThrow(() -> new ResourceNotFoundException("Advisory not found: " + id));
    }

    @Transactional
    public com.mermaid.app.model.Advisory create(AdvisoryCreateRequest request, Long adminUserId) {
        if (!request.getActiveTo().isAfter(request.getActiveFrom())) {
            throw new IllegalArgumentException("activeTo must be after activeFrom");
        }
        Advisory entity = new Advisory();
        entity.setTitle(request.getTitle().trim());
        entity.setMessage(request.getMessage().trim());
        entity.setSeverity(request.getSeverity());
        entity.setAffectedArea(request.getAffectedArea().trim());
        entity.setActiveFrom(request.getActiveFrom());
        entity.setActiveTo(request.getActiveTo());
        entity.setActive(request.getIsActive() != null ? request.getIsActive() : true);
        entity.setCreatedByUserId(adminUserId);
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public com.mermaid.app.model.Advisory update(Long id, AdvisoryUpdateRequest request) {
        Advisory entity = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Advisory not found: " + id));
        if (request.getTitle() != null)       entity.setTitle(request.getTitle().trim());
        if (request.getMessage() != null)     entity.setMessage(request.getMessage().trim());
        if (request.getSeverity() != null)    entity.setSeverity(request.getSeverity());
        if (request.getAffectedArea() != null) entity.setAffectedArea(request.getAffectedArea().trim());
        if (request.getActiveFrom() != null)  entity.setActiveFrom(request.getActiveFrom());
        if (request.getActiveTo() != null)    entity.setActiveTo(request.getActiveTo());
        if (request.getIsActive() != null)    entity.setActive(request.getIsActive());
        return mapper.toModel(repo.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResourceNotFoundException("Advisory not found: " + id);
        }
        repo.deleteById(id);
    }
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd backend && ./mvnw test -Dtest=AdvisoryServiceTest -DfailIfNoTests=false
```

Expected: `BUILD SUCCESS`, all 7 tests green.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/Advisory.java \
        backend/src/main/java/com/mermaid/app/repository/AdvisoryRepository.java \
        backend/src/main/java/com/mermaid/app/mapper/AdvisoryMapper.java \
        backend/src/main/java/com/mermaid/app/service/AdvisoryService.java \
        backend/src/test/java/com/mermaid/app/service/AdvisoryServiceTest.java
git commit -m "feat: add Advisory entity, repo, mapper, and service with tests"
```

---

## Task 6: LookupController

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/LookupController.java`
- Test: `backend/src/test/java/com/mermaid/app/controller/LookupControllerTest.java`

- [ ] **Step 1: Write failing controller tests**

```java
// LookupControllerTest.java
package com.mermaid.app.controller;

import com.mermaid.app.model.FishSpecies;
import com.mermaid.app.model.MarketLocation;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LookupController.class)
class LookupControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean FishSpeciesService fishSpeciesService;
    @MockitoBean MarketLocationService marketLocationService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void listFishSpecies_noJwt_returns401() throws Exception {
        mockMvc.perform(get("/lookups/fish-species"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void listFishSpecies_withJwt_returns200WithList() throws Exception {
        when(fishSpeciesService.listActive()).thenReturn(
            List.of(new FishSpecies(1L, "Bangus", true)));

        mockMvc.perform(get("/lookups/fish-species").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].commonName").value("Bangus"));
    }

    @Test
    void listMarketLocations_withJwt_returns200WithList() throws Exception {
        when(marketLocationService.listActive()).thenReturn(
            List.of(new MarketLocation(1L, "Navotas Fish Port", "Navotas", true)));

        mockMvc.perform(get("/lookups/market-locations").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].name").value("Navotas Fish Port"));
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=LookupControllerTest -DfailIfNoTests=false
```

Expected: compilation error — `LookupController` does not exist yet.

- [ ] **Step 3: Create LookupController**

```java
// controller/LookupController.java
package com.mermaid.app.controller;

import com.mermaid.app.api.LookupsApi;
import com.mermaid.app.model.FishSpecies;
import com.mermaid.app.model.MarketLocation;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class LookupController implements LookupsApi {

    private final FishSpeciesService fishSpeciesService;
    private final MarketLocationService marketLocationService;

    public LookupController(FishSpeciesService fishSpeciesService,
                            MarketLocationService marketLocationService) {
        this.fishSpeciesService = fishSpeciesService;
        this.marketLocationService = marketLocationService;
    }

    @Override
    public ResponseEntity<List<FishSpecies>> listFishSpecies() {
        return ResponseEntity.ok(fishSpeciesService.listActive());
    }

    @Override
    public ResponseEntity<List<MarketLocation>> listMarketLocations() {
        return ResponseEntity.ok(marketLocationService.listActive());
    }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd backend && ./mvnw test -Dtest=LookupControllerTest -DfailIfNoTests=false
```

Expected: `BUILD SUCCESS`, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/LookupController.java \
        backend/src/test/java/com/mermaid/app/controller/LookupControllerTest.java
git commit -m "feat: add LookupController for fish-species and market-locations endpoints"
```

---

## Task 7: AdvisoryController (public feed)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/AdvisoryController.java`
- Test: `backend/src/test/java/com/mermaid/app/controller/AdvisoryControllerTest.java`

- [ ] **Step 1: Write failing controller tests**

```java
// AdvisoryControllerTest.java
package com.mermaid.app.controller;

import com.mermaid.app.model.Advisory;
import com.mermaid.app.model.Severity;
import com.mermaid.app.service.AdvisoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdvisoryController.class)
class AdvisoryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean AdvisoryService advisoryService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void listAdvisories_noJwt_returns401() throws Exception {
        mockMvc.perform(get("/advisories"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void listAdvisories_defaultsToActiveOnly() throws Exception {
        when(advisoryService.listActive(null)).thenReturn(List.of(sampleAdvisory()));

        mockMvc.perform(get("/advisories").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].title").value("Storm Warning"));

        verify(advisoryService).listActive(null);
        verify(advisoryService, never()).listAll();
    }

    @Test
    void listAdvisories_activeOnlyFalse_callsListAll() throws Exception {
        when(advisoryService.listAll()).thenReturn(List.of(sampleAdvisory()));

        mockMvc.perform(get("/advisories").param("activeOnly", "false").with(jwt()))
               .andExpect(status().isOk());

        verify(advisoryService).listAll();
        verify(advisoryService, never()).listActive(any());
    }

    @Test
    void listAdvisories_withSeverityFilter_passesFilterToService() throws Exception {
        when(advisoryService.listActive(Severity.HIGH)).thenReturn(List.of());

        mockMvc.perform(get("/advisories")
               .param("severity", "HIGH")
               .with(jwt()))
               .andExpect(status().isOk());

        verify(advisoryService).listActive(Severity.HIGH);
    }

    private Advisory sampleAdvisory() {
        return new Advisory(
            1L, "Storm Warning", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2), true);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=AdvisoryControllerTest -DfailIfNoTests=false
```

Expected: compilation error — `AdvisoryController` does not exist yet.

- [ ] **Step 3: Create AdvisoryController**

```java
// controller/AdvisoryController.java
package com.mermaid.app.controller;

import com.mermaid.app.api.AdvisoriesApi;
import com.mermaid.app.model.Advisory;
import com.mermaid.app.model.Severity;
import com.mermaid.app.service.AdvisoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AdvisoryController implements AdvisoriesApi {

    private final AdvisoryService advisoryService;

    public AdvisoryController(AdvisoryService advisoryService) {
        this.advisoryService = advisoryService;
    }

    @Override
    public ResponseEntity<List<Advisory>> listAdvisories(Boolean activeOnly, Severity severity) {
        boolean filterActive = activeOnly == null || activeOnly;
        List<Advisory> result = filterActive
            ? advisoryService.listActive(severity)
            : advisoryService.listAll();
        return ResponseEntity.ok(result);
    }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd backend && ./mvnw test -Dtest=AdvisoryControllerTest -DfailIfNoTests=false
```

Expected: `BUILD SUCCESS`, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/AdvisoryController.java \
        backend/src/test/java/com/mermaid/app/controller/AdvisoryControllerTest.java
git commit -m "feat: add AdvisoryController for public advisories feed"
```

---

## Task 8: Wire AdminController

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/AdminController.java`
- Test: `backend/src/test/java/com/mermaid/app/controller/AdminAdvisoryControllerTest.java`

> The existing `AdminController` has all advisory, fish species, and market location methods stubbed with `UnsupportedOperationException`. Replace those stubs. The user management methods (`adminCreateUser`, `adminGetUser`, `adminListUsers`, `adminUpdateUser`) are already implemented — do not touch them.
>
> Key detail: `adminCreateAdvisory` cannot receive `Authentication` as a method parameter (the generated `AdminApi` interface has a fixed single-param signature). Use `SecurityContextHolder` inside the method body to get the admin user ID.

- [ ] **Step 1: Write failing controller tests**

```java
// AdminAdvisoryControllerTest.java
package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mermaid.app.model.*;
import com.mermaid.app.service.AdvisoryService;
import com.mermaid.app.service.AdminUserService;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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

@WebMvcTest(AdminController.class)
class AdminAdvisoryControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean AdvisoryService advisoryService;
    @MockitoBean FishSpeciesService fishSpeciesService;
    @MockitoBean MarketLocationService marketLocationService;
    @MockitoBean AdminUserService adminUserService;
    @MockitoBean JwtDecoder jwtDecoder;

    // --- Advisory CRUD ---

    @Test
    void adminListAdvisories_nonAdmin_returns403() throws Exception {
        mockMvc.perform(get("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_FISHERMAN")))))
               .andExpect(status().isForbidden());
    }

    @Test
    void adminListAdvisories_asAdmin_returns200() throws Exception {
        when(advisoryService.listAll()).thenReturn(List.of(sampleAdvisory()));

        mockMvc.perform(get("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN")))))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].title").value("Storm Warning"));
    }

    @Test
    void adminCreateAdvisory_validRequest_returns201() throws Exception {
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Storm Warning", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2));
        when(advisoryService.create(any(), eq(1L))).thenReturn(sampleAdvisory());

        mockMvc.perform(post("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.title").value("Storm Warning"));
    }

    @Test
    void adminCreateAdvisory_invalidDates_returns400() throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        AdvisoryCreateRequest request = new AdvisoryCreateRequest(
            "Bad Advisory", "Message content here",
            Severity.LOW, "Manila Bay",
            now.plusDays(5), now.plusDays(1));  // activeTo before activeFrom
        when(advisoryService.create(any(), any()))
            .thenThrow(new IllegalArgumentException("activeTo must be after activeFrom"));

        mockMvc.perform(post("/admin/advisories")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void adminDeleteAdvisory_notFound_returns404() throws Exception {
        org.mockito.Mockito.doThrow(new com.mermaid.app.exception.ResourceNotFoundException("Advisory not found: 99"))
            .when(advisoryService).delete(99L);

        mockMvc.perform(delete("/admin/advisories/99")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN")))))
               .andExpect(status().isNotFound());
    }

    // --- Fish species CRUD ---

    @Test
    void adminCreateFishSpecies_asAdmin_returns201() throws Exception {
        FishSpeciesCreateRequest request = new FishSpeciesCreateRequest("Bangus");
        when(fishSpeciesService.create(any())).thenReturn(new FishSpecies(1L, "Bangus", true));

        mockMvc.perform(post("/admin/fish-species")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.commonName").value("Bangus"));
    }

    @Test
    void adminDeleteFishSpecies_notFound_returns404() throws Exception {
        org.mockito.Mockito.doThrow(new com.mermaid.app.exception.ResourceNotFoundException("Fish species not found: 99"))
            .when(fishSpeciesService).delete(99L);

        mockMvc.perform(delete("/admin/fish-species/99")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN")))))
               .andExpect(status().isNotFound());
    }

    // --- Market location CRUD ---

    @Test
    void adminCreateMarketLocation_asAdmin_returns201() throws Exception {
        MarketLocationCreateRequest request = new MarketLocationCreateRequest("Carbon Market", "Cebu City");
        when(marketLocationService.create(any()))
            .thenReturn(new MarketLocation(1L, "Carbon Market", "Cebu City", true));

        mockMvc.perform(post("/admin/market-locations")
               .with(jwt().jwt(b -> b.subject("1").claim("roles", List.of("ROLE_ADMIN"))))
               .contentType(MediaType.APPLICATION_JSON)
               .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.name").value("Carbon Market"));
    }

    private Advisory sampleAdvisory() {
        return new Advisory(
            1L, "Storm Warning", "Rough seas expected",
            Severity.HIGH, "Visayan Sea",
            OffsetDateTime.now(), OffsetDateTime.now().plusDays(2), true);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && ./mvnw test -Dtest=AdminAdvisoryControllerTest -DfailIfNoTests=false
```

Expected: tests compile but fail — methods throw `UnsupportedOperationException`.

- [ ] **Step 3: Update AdminController — inject services and replace stubs**

Replace the entire `AdminController.java` with this implementation. Keep all existing imports and add the new service imports:

```java
package com.mermaid.app.controller;

import com.mermaid.app.api.AdminApi;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.*;
import com.mermaid.app.service.AdminUserService;
import com.mermaid.app.service.AdvisoryService;
import com.mermaid.app.service.FishSpeciesService;
import com.mermaid.app.service.MarketLocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class AdminController implements AdminApi {

    private final AdminUserService adminUserService;
    private final AdvisoryService advisoryService;
    private final FishSpeciesService fishSpeciesService;
    private final MarketLocationService marketLocationService;

    public AdminController(AdminUserService adminUserService,
                           AdvisoryService advisoryService,
                           FishSpeciesService fishSpeciesService,
                           MarketLocationService marketLocationService) {
        this.adminUserService = adminUserService;
        this.advisoryService = advisoryService;
        this.fishSpeciesService = fishSpeciesService;
        this.marketLocationService = marketLocationService;
    }

    // --- User management (existing) ---

    @Override
    public ResponseEntity<UserSummary> adminCreateUser(UserCreateRequest request) {
        return ResponseEntity.status(201).body(adminUserService.createUser(request));
    }

    @Override
    public ResponseEntity<UserSummary> adminGetUser(Long userId) {
        return ResponseEntity.ok(adminUserService.getUser(userId));
    }

    @Override
    public ResponseEntity<List<UserSummary>> adminListUsers() {
        return ResponseEntity.ok(adminUserService.listUsers());
    }

    @Override
    public ResponseEntity<UserSummary> adminUpdateUser(Long userId, UserUpdateRequest request) {
        return ResponseEntity.ok(adminUserService.updateUser(userId, request));
    }

    // --- Advisory CRUD ---

    @Override
    public ResponseEntity<List<Advisory>> adminListAdvisories() {
        return ResponseEntity.ok(advisoryService.listAll());
    }

    @Override
    public ResponseEntity<Advisory> adminGetAdvisoryById(Long advisoryId) {
        return ResponseEntity.ok(advisoryService.getById(advisoryId));
    }

    @Override
    public ResponseEntity<Advisory> adminCreateAdvisory(AdvisoryCreateRequest request) {
        Long adminUserId = Long.parseLong(
            SecurityContextHolder.getContext().getAuthentication().getName());
        return ResponseEntity.status(201).body(advisoryService.create(request, adminUserId));
    }

    @Override
    public ResponseEntity<Advisory> adminUpdateAdvisory(Long advisoryId, AdvisoryUpdateRequest request) {
        return ResponseEntity.ok(advisoryService.update(advisoryId, request));
    }

    @Override
    public ResponseEntity<Void> adminDeleteAdvisory(Long advisoryId) {
        advisoryService.delete(advisoryId);
        return ResponseEntity.noContent().build();
    }

    // --- Fish species CRUD ---

    @Override
    public ResponseEntity<FishSpecies> adminCreateFishSpecies(FishSpeciesCreateRequest request) {
        return ResponseEntity.status(201).body(fishSpeciesService.create(request));
    }

    @Override
    public ResponseEntity<FishSpecies> adminUpdateFishSpecies(Long speciesId, FishSpeciesCreateRequest request) {
        return ResponseEntity.ok(fishSpeciesService.update(speciesId, request));
    }

    @Override
    public ResponseEntity<Void> adminDeleteFishSpecies(Long speciesId) {
        fishSpeciesService.delete(speciesId);
        return ResponseEntity.noContent().build();
    }

    // --- Market location CRUD ---

    @Override
    public ResponseEntity<MarketLocation> adminCreateMarketLocation(MarketLocationCreateRequest request) {
        return ResponseEntity.status(201).body(marketLocationService.create(request));
    }

    @Override
    public ResponseEntity<MarketLocation> adminUpdateMarketLocation(Long locationId, MarketLocationCreateRequest request) {
        return ResponseEntity.ok(marketLocationService.update(locationId, request));
    }

    @Override
    public ResponseEntity<Void> adminDeleteMarketLocation(Long locationId) {
        marketLocationService.delete(locationId);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd backend && ./mvnw test -Dtest=AdminAdvisoryControllerTest -DfailIfNoTests=false
```

Expected: `BUILD SUCCESS`, all 8 tests green.

- [ ] **Step 5: Run the full test suite**

```bash
cd backend && ./mvnw test
```

Expected: `BUILD SUCCESS` — all existing tests still pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/AdminController.java \
        backend/src/test/java/com/mermaid/app/controller/AdminAdvisoryControllerTest.java
git commit -m "feat: wire AdminController with advisory, fish species, and market location services"
```

---

## Done

All Week 3 backend features are implemented and tested. Verify the app starts cleanly against a running PostgreSQL database (Flyway will apply V4–V6 automatically):

```bash
cd backend && ./mvnw spring-boot:run
```

Check that:
- `GET /api/lookups/fish-species` returns the 10 seeded species (requires Bearer token)
- `GET /api/lookups/market-locations` returns the 5 seeded locations
- `GET /api/advisories` returns empty list (no advisories posted yet)
- `POST /api/admin/advisories` creates an advisory (requires admin token)
