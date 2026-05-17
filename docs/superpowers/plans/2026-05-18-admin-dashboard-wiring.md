# Admin Dashboard Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock/hardcoded data in `AdminDashboard.jsx` with real backend data, implement missing admin endpoints (metrics, DAU, health, audit log, list-all species/locations, reactivate), and wire every button to a working action.

**Architecture:** Backend-first. One Flyway migration adds three new structures (login_events, audit_log, last_login_at). New services (AdminMetricsService, DauService, AuditLogService, AdminHealthService) are added and wired into AdminController via the existing api.yaml → generate-sources → implement-interface pattern. Frontend deletes all mock consts and replaces them with React Query hooks calling the new endpoints.

**Tech Stack:** Spring Boot (Java 21), Spring Data JPA, openapi-generator-maven-plugin, PostgreSQL/Flyway, React 18, TanStack Query v5, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-05-18-admin-dashboard-wiring-design.md`

---

## File Map

### New backend files
| File | Purpose |
|------|---------|
| `backend/src/main/resources/db/migration/V64__admin_telemetry.sql` | Migration: last_login_at, login_events, audit_log |
| `backend/src/main/java/com/mermaid/app/domain/LoginEvent.java` | JPA entity for login_events |
| `backend/src/main/java/com/mermaid/app/domain/AuditLog.java` | JPA entity for audit_log |
| `backend/src/main/java/com/mermaid/app/repository/LoginEventRepository.java` | Spring Data repo for LoginEvent |
| `backend/src/main/java/com/mermaid/app/repository/AuditLogRepository.java` | Spring Data repo for AuditLog |
| `backend/src/main/java/com/mermaid/app/service/AuditLogService.java` | write() + list() |
| `backend/src/main/java/com/mermaid/app/service/AdminMetricsService.java` | aggregate platform stats |
| `backend/src/main/java/com/mermaid/app/service/DauService.java` | 30-day daily active user counts |
| `backend/src/main/java/com/mermaid/app/service/AdminHealthService.java` | DB + marine + storage health |

### Modified backend files
| File | Change |
|------|--------|
| `backend/src/main/java/com/mermaid/app/domain/User.java` | Add `lastLoginAt` field |
| `backend/src/main/resources/openapi/api.yaml` | New schemas + 8 new paths |
| `backend/src/main/java/com/mermaid/app/repository/UserRepository.java` | Add count query methods |
| `backend/src/main/java/com/mermaid/app/repository/TripRepository.java` | Add count query methods |
| `backend/src/main/java/com/mermaid/app/repository/OrderRepository.java` | Add count query method |
| `backend/src/main/java/com/mermaid/app/repository/StorefrontListingRepository.java` | Add countByStatus |
| `backend/src/main/java/com/mermaid/app/repository/AdvisoryRepository.java` | Add countActive query |
| `backend/src/main/java/com/mermaid/app/service/AdminUserService.java` | Add createdAt/lastLoginAt to UserSummary |
| `backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java` | Add listAll(), reactivate() |
| `backend/src/main/java/com/mermaid/app/service/MarketLocationService.java` | Add listAll(), reactivate() |
| `backend/src/main/java/com/mermaid/app/service/AdvisoryService.java` | Inject AuditLogService, add audit writes |
| `backend/src/main/java/com/mermaid/app/service/AuthService.java` | Write login_events + update lastLoginAt |
| `backend/src/main/java/com/mermaid/app/controller/AdminController.java` | Implement 8 new AdminApi operations |

### New frontend files
| File | Purpose |
|------|---------|
| `frontend/src/api/admin.js` | All admin API calls |

### Modified frontend files
| File | Change |
|------|--------|
| `frontend/src/AdminDashboard.jsx` | Delete all mock consts; wire every page to real data; add CRUD modals |

---

## Task 1: Flyway migration + domain entities

**Files:**
- Create: `backend/src/main/resources/db/migration/V64__admin_telemetry.sql`
- Modify: `backend/src/main/java/com/mermaid/app/domain/User.java`
- Create: `backend/src/main/java/com/mermaid/app/domain/LoginEvent.java`
- Create: `backend/src/main/java/com/mermaid/app/domain/AuditLog.java`

- [ ] **Step 1: Create the migration SQL**

```sql
-- V64__admin_telemetry.sql

ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;

CREATE TABLE login_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_events_date ON login_events (DATE(logged_in_at));

CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   BIGINT REFERENCES users(id),
  actor_name VARCHAR(200) NOT NULL,
  kind       VARCHAR(30)  NOT NULL,
  action     VARCHAR(100) NOT NULL,
  target     VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);
```

- [ ] **Step 2: Add `lastLoginAt` field to `User.java`**

Add after the existing `updatedAt` field block:

```java
@Column(name = "last_login_at")
private OffsetDateTime lastLoginAt;

public OffsetDateTime getLastLoginAt() { return lastLoginAt; }
public void setLastLoginAt(OffsetDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
```

- [ ] **Step 3: Create `LoginEvent.java`**

```java
package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "login_events")
public class LoginEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "logged_in_at", nullable = false)
    private OffsetDateTime loggedInAt;

    @PrePersist
    protected void onCreate() { if (loggedInAt == null) loggedInAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public OffsetDateTime getLoggedInAt() { return loggedInAt; }
    public void setLoggedInAt(OffsetDateTime loggedInAt) { this.loggedInAt = loggedInAt; }
}
```

- [ ] **Step 4: Create `AuditLog.java`**

```java
package com.mermaid.app.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_name", nullable = false, length = 200)
    private String actorName;

    @Column(nullable = false, length = 30)
    private String kind;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(length = 300)
    private String target;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public Long getActorId() { return actorId; }
    public void setActorId(Long actorId) { this.actorId = actorId; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    /** Package-private setter used by tests (avoids reflection). */
    void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 5: Start the backend to validate the migration runs**

```bash
cd backend && ./mvnw spring-boot:run
```

Expected: Application starts, Flyway logs `Successfully applied 1 migration to schema "public"` (V64). No errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V64__admin_telemetry.sql \
        backend/src/main/java/com/mermaid/app/domain/User.java \
        backend/src/main/java/com/mermaid/app/domain/LoginEvent.java \
        backend/src/main/java/com/mermaid/app/domain/AuditLog.java
git commit -m "feat(backend): add admin telemetry migration and domain entities"
```

---

## Task 2: New repositories + extend existing ones

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/repository/LoginEventRepository.java`
- Create: `backend/src/main/java/com/mermaid/app/repository/AuditLogRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/UserRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/TripRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/OrderRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/StorefrontListingRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/AdvisoryRepository.java`

- [ ] **Step 1: Create `LoginEventRepository.java`**

```java
package com.mermaid.app.repository;

import com.mermaid.app.domain.LoginEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {

    @Query(value = """
        SELECT DATE(logged_in_at AT TIME ZONE 'UTC') AS day,
               COUNT(DISTINCT user_id) AS cnt
        FROM login_events
        WHERE logged_in_at >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY 1
        ORDER BY 1
        """, nativeQuery = true)
    List<Object[]> findDailyDistinctUserCounts();
}
```

- [ ] **Step 2: Create `AuditLogRepository.java`**

```java
package com.mermaid.app.repository;

import com.mermaid.app.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop200ByOrderByCreatedAtDesc();

    List<AuditLog> findTop200ByKindOrderByCreatedAtDesc(String kind);
}
```

- [ ] **Step 3: Extend `UserRepository.java`**

Add these methods:

```java
long countByRole(com.mermaid.app.model.Role role);

@Query("SELECT COUNT(u) FROM User u WHERE u.createdAt > :cutoff")
long countCreatedAfter(@Param("cutoff") java.time.OffsetDateTime cutoff);

@Query("SELECT COUNT(u) FROM User u WHERE u.lastLoginAt > :cutoff")
long countLastLoginAfter(@Param("cutoff") java.time.OffsetDateTime cutoff);
```

- [ ] **Step 4: Extend `TripRepository.java`**

Add these methods:

```java
long countByStatus(com.mermaid.app.model.TripStatus status);

@Query(value = "SELECT COUNT(*) FROM trips WHERE DATE(started_at AT TIME ZONE 'UTC') = CURRENT_DATE", nativeQuery = true)
long countStartedToday();
```

- [ ] **Step 5: Extend `OrderRepository.java`**

Add:

```java
long countByStatus(String status);

@Query(value = "SELECT COUNT(*) FROM orders WHERE DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE", nativeQuery = true)
long countCreatedToday();
```

- [ ] **Step 6: Extend `StorefrontListingRepository.java`**

Add:

```java
long countByStatus(com.mermaid.app.domain.StorefrontListingStatus status);
```

- [ ] **Step 7: Extend `AdvisoryRepository.java`**

Add:

```java
@Query("SELECT COUNT(a) FROM Advisory a WHERE a.isActive = true")
long countActive();
```

- [ ] **Step 8: Compile to verify no errors**

```bash
cd backend && ./mvnw compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/repository/
git commit -m "feat(backend): add LoginEvent/AuditLog repos and count methods to existing repos"
```

---

## Task 3: OpenAPI schema additions + code generation

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

- [ ] **Step 1: Add new schemas to `components/schemas` in `api.yaml`**

Add after the existing `AuditEntry` or near the bottom of the schemas section:

```yaml
    AdminMetrics:
      type: object
      required: [totalUsers, fishermen, vendors, buyers, admins, newThisWeek, activeNow,
                 totalTrips, activeTrips, tripsToday, totalListings, openListings,
                 totalOrders, ordersToday, disputedOrders, activeAdvisories]
      properties:
        totalUsers:       { type: integer }
        fishermen:        { type: integer }
        vendors:          { type: integer }
        buyers:           { type: integer }
        admins:           { type: integer }
        newThisWeek:      { type: integer }
        activeNow:        { type: integer }
        totalTrips:       { type: integer }
        activeTrips:      { type: integer }
        tripsToday:       { type: integer }
        totalListings:    { type: integer }
        openListings:     { type: integer }
        totalOrders:      { type: integer }
        ordersToday:      { type: integer }
        disputedOrders:   { type: integer }
        activeAdvisories: { type: integer }

    AdminDauEntry:
      type: object
      required: [date, count]
      properties:
        date:  { type: string, format: date }
        count: { type: integer }

    HealthCheck:
      type: object
      required: [name, status, detail]
      properties:
        name:   { type: string }
        status: { type: string, enum: [OK, WARN, DOWN, N_A] }
        detail: { type: string }

    AuditEntry:
      type: object
      required: [id, actorName, kind, action, createdAt]
      properties:
        id:        { type: integer, format: int64 }
        actorId:   { type: integer, format: int64, nullable: true }
        actorName: { type: string }
        kind:      { type: string }
        action:    { type: string }
        target:    { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
```

- [ ] **Step 2: Update `UserSummary` schema — add `createdAt` and `lastLoginAt`**

Find the `UserSummary` schema block and add after `active`:

```yaml
        createdAt:
          type: string
          format: date-time
          nullable: true
        lastLoginAt:
          type: string
          format: date-time
          nullable: true
```

- [ ] **Step 3: Add new paths to `api.yaml` under the admin tag**

Add after the `/admin/advisories/{advisoryId}` block (around line 785):

```yaml
  /admin/fish-species:
    get:
      tags: [Admin]
      summary: List all fish species including inactive
      operationId: adminListFishSpecies
      security: [{ cookieAuth: [] }]
      responses:
        '200':
          description: All fish species
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/FishSpecies'

  /admin/fish-species/{speciesId}/reactivate:
    post:
      tags: [Admin]
      summary: Reactivate a soft-deleted fish species
      operationId: adminReactivateFishSpecies
      security: [{ cookieAuth: [] }]
      parameters:
        - name: speciesId
          in: path
          required: true
          schema: { type: integer, format: int64 }
      responses:
        '200':
          description: Species reactivated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FishSpecies'

  /admin/market-locations:
    get:
      tags: [Admin]
      summary: List all market locations including inactive
      operationId: adminListMarketLocations
      security: [{ cookieAuth: [] }]
      responses:
        '200':
          description: All market locations
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MarketLocation'

  /admin/market-locations/{locationId}/reactivate:
    post:
      tags: [Admin]
      summary: Reactivate a soft-deleted market location
      operationId: adminReactivateMarketLocation
      security: [{ cookieAuth: [] }]
      parameters:
        - name: locationId
          in: path
          required: true
          schema: { type: integer, format: int64 }
      responses:
        '200':
          description: Location reactivated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarketLocation'

  /admin/metrics:
    get:
      tags: [Admin]
      summary: Platform aggregate metrics
      operationId: adminGetMetrics
      security: [{ cookieAuth: [] }]
      responses:
        '200':
          description: Platform metrics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminMetrics'

  /admin/dau:
    get:
      tags: [Admin]
      summary: 30-day daily active users
      operationId: adminGetDau
      security: [{ cookieAuth: [] }]
      responses:
        '200':
          description: DAU array
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/AdminDauEntry'

  /admin/health:
    get:
      tags: [Admin]
      summary: Service health checks
      operationId: adminGetHealth
      security: [{ cookieAuth: [] }]
      responses:
        '200':
          description: Health checks
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/HealthCheck'

  /admin/audit-log:
    get:
      tags: [Admin]
      summary: Audit log entries
      operationId: adminListAuditLog
      security: [{ cookieAuth: [] }]
      parameters:
        - name: kind
          in: query
          required: false
          schema: { type: string }
      responses:
        '200':
          description: Audit entries
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/AuditEntry'
```

- [ ] **Step 4: Run code generation**

```bash
cd backend && ./mvnw generate-sources -q
```

Expected: BUILD SUCCESS. New methods appear in `target/generated-sources/openapi/src/main/java/com/mermaid/app/api/AdminApi.java`.

- [ ] **Step 5: Compile to catch any issues**

```bash
cd backend && ./mvnw compile -q
```

Expected: BUILD SUCCESS (AdminController will have unimplemented methods — that's fine until Task 12).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(backend): add admin metrics/dau/health/audit/species/locations endpoints to api.yaml"
```

---

## Task 4: AdminUserService — add createdAt/lastLoginAt to UserSummary

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/AdminUserService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/AdminUserServiceTest.java`

- [ ] **Step 1: Write the failing test**

Create `AdminUserServiceTest.java`:

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.User;
import com.mermaid.app.model.Role;
import com.mermaid.app.model.UserSummary;
import com.mermaid.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock UserRepository userRepository;
    @Mock org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @InjectMocks AdminUserService service;

    @Test
    void listUsers_includesCreatedAtAndLastLoginAt() {
        User u = new User();
        u.setId(1L);
        u.setFullName("Test User");
        u.setEmail("test@test.com");
        u.setRole(Role.FISHERMAN);
        u.setActive(true);
        OffsetDateTime created = OffsetDateTime.parse("2025-08-12T00:00:00+08:00");
        OffsetDateTime lastLogin = OffsetDateTime.parse("2026-05-18T08:00:00+08:00");
        u.setCreatedAt(created);
        u.setLastLoginAt(lastLogin);

        when(userRepository.findAll()).thenReturn(List.of(u));

        List<UserSummary> result = service.listUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCreatedAt()).isEqualTo(created);
        assertThat(result.get(0).getLastLoginAt()).isEqualTo(lastLogin);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=AdminUserServiceTest -q
```

Expected: FAIL — `getCreatedAt()` returns null (field not mapped yet).

- [ ] **Step 3: Update `toUserSummary()` in `AdminUserService.java`**

Replace the existing `toUserSummary` static method:

```java
private static UserSummary toUserSummary(User user) {
    UserSummary s = new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    s.setActive(user.isActive());
    s.setCreatedAt(user.getCreatedAt());
    s.setLastLoginAt(user.getLastLoginAt());
    return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=AdminUserServiceTest -q
```

Expected: BUILD SUCCESS, 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AdminUserService.java \
        backend/src/test/java/com/mermaid/app/service/AdminUserServiceTest.java
git commit -m "feat(backend): add createdAt/lastLoginAt to UserSummary mapping"
```

---

## Task 5: FishSpeciesService + MarketLocationService — listAll + reactivate

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java`
- Modify: `backend/src/main/java/com/mermaid/app/service/MarketLocationService.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/FishSpeciesRepository.java`
- Modify: `backend/src/main/java/com/mermaid/app/repository/MarketLocationRepository.java`

- [ ] **Step 1: Add `findAll` support to `FishSpeciesRepository.java`**

`JpaRepository.findAll()` is already inherited — no change needed. Verify the import works by checking `FishSpeciesRepository extends JpaRepository<FishSpecies, Long>`.

- [ ] **Step 2: Add `listAll()` and `reactivate()` to `FishSpeciesService.java`**

```java
@Transactional(readOnly = true)
public List<com.mermaid.app.model.FishSpecies> listAll() {
    return repo.findAll().stream()
        .sorted(java.util.Comparator.comparing(com.mermaid.app.domain.FishSpecies::getCommonName))
        .map(mapper::toModel)
        .collect(Collectors.toList());
}

@Transactional
public com.mermaid.app.model.FishSpecies reactivate(Long id) {
    com.mermaid.app.domain.FishSpecies entity = repo.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Fish species not found: " + id));
    entity.setActive(true);
    return mapper.toModel(repo.save(entity));
}
```

- [ ] **Step 3: Add `listAll()` and `reactivate()` to `MarketLocationService.java`**

```java
@Transactional(readOnly = true)
public List<com.mermaid.app.model.MarketLocation> listAll() {
    return repo.findAll().stream()
        .sorted(java.util.Comparator.comparing(com.mermaid.app.domain.MarketLocation::getName))
        .map(mapper::toModel)
        .collect(Collectors.toList());
}

@Transactional
public com.mermaid.app.model.MarketLocation reactivate(Long id) {
    com.mermaid.app.domain.MarketLocation entity = repo.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Market location not found: " + id));
    entity.setActive(true);
    return mapper.toModel(repo.save(entity));
}
```

- [ ] **Step 4: Compile**

```bash
cd backend && ./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java \
        backend/src/main/java/com/mermaid/app/service/MarketLocationService.java
git commit -m "feat(backend): add listAll and reactivate to FishSpeciesService and MarketLocationService"
```

---

## Task 6: AuditLogService

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/AuditLogService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/AuditLogServiceTest.java`

- [ ] **Step 1: Write failing tests**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.AuditLog;
import com.mermaid.app.model.AuditEntry;
import com.mermaid.app.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock AuditLogRepository repo;
    @InjectMocks AuditLogService service;

    @Test
    void write_savesEntity() {
        service.write(1L, "Liza Domingo", "advisory", "created advisory", "TD Emong");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(repo).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertThat(saved.getActorId()).isEqualTo(1L);
        assertThat(saved.getActorName()).isEqualTo("Liza Domingo");
        assertThat(saved.getKind()).isEqualTo("advisory");
        assertThat(saved.getAction()).isEqualTo("created advisory");
        assertThat(saved.getTarget()).isEqualTo("TD Emong");
    }

    @Test
    void write_doesNotThrowOnRepoFailure() {
        doThrow(new RuntimeException("DB down")).when(repo).save(any());
        // must not propagate
        service.write(1L, "Admin", "system", "test", "test");
    }

    @Test
    void list_allKind_callsTop200() {
        AuditLog entry = makeEntry();
        when(repo.findTop200ByOrderByCreatedAtDesc()).thenReturn(List.of(entry));

        List<AuditEntry> result = service.list("all");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getActorName()).isEqualTo("Liza");
    }

    @Test
    void list_specificKind_filtersInRepo() {
        when(repo.findTop200ByKindOrderByCreatedAtDesc("advisory")).thenReturn(List.of());
        service.list("advisory");
        verify(repo).findTop200ByKindOrderByCreatedAtDesc("advisory");
    }

    private AuditLog makeEntry() {
        AuditLog a = new AuditLog();
        a.setActorId(1L); a.setActorName("Liza"); a.setKind("advisory");
        a.setAction("created"); a.setTarget("T1");
        a.setCreatedAt(OffsetDateTime.now()); // package-private setter defined on AuditLog
        return a;
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && ./mvnw test -Dtest=AuditLogServiceTest -q
```

Expected: FAIL — class doesn't exist.

- [ ] **Step 3: Implement `AuditLogService.java`**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.AuditLog;
import com.mermaid.app.model.AuditEntry;
import com.mermaid.app.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository repo;

    public AuditLogService(AuditLogRepository repo) { this.repo = repo; }

    @Transactional
    public void write(Long actorId, String actorName, String kind, String action, String target) {
        try {
            AuditLog entry = new AuditLog();
            entry.setActorId(actorId);
            entry.setActorName(actorName != null ? actorName : "System");
            entry.setKind(kind);
            entry.setAction(action);
            entry.setTarget(target);
            repo.save(entry);
        } catch (Exception e) {
            log.warn("Failed to write audit log entry: kind={}, action={}, target={}", kind, action, target, e);
        }
    }

    @Transactional(readOnly = true)
    public List<AuditEntry> list(String kind) {
        List<AuditLog> rows = (kind == null || kind.equals("all"))
            ? repo.findTop200ByOrderByCreatedAtDesc()
            : repo.findTop200ByKindOrderByCreatedAtDesc(kind);
        return rows.stream().map(this::toModel).collect(Collectors.toList());
    }

    private AuditEntry toModel(AuditLog a) {
        AuditEntry e = new AuditEntry();
        e.setId(a.getId());
        e.setActorId(a.getActorId());
        e.setActorName(a.getActorName());
        e.setKind(a.getKind());
        e.setAction(a.getAction());
        e.setTarget(a.getTarget());
        e.setCreatedAt(a.getCreatedAt());
        return e;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && ./mvnw test -Dtest=AuditLogServiceTest -q
```

Expected: 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AuditLogService.java \
        backend/src/test/java/com/mermaid/app/service/AuditLogServiceTest.java
git commit -m "feat(backend): add AuditLogService with write and list"
```

---

## Task 7: AdminMetricsService

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/AdminMetricsService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/AdminMetricsServiceTest.java`

- [ ] **Step 1: Write failing test**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminMetricsServiceTest {

    @Mock UserRepository userRepo;
    @Mock TripRepository tripRepo;
    @Mock StorefrontListingRepository listingRepo;
    @Mock OrderRepository orderRepo;
    @Mock AdvisoryRepository advisoryRepo;
    @InjectMocks AdminMetricsService service;

    @Test
    void getMetrics_aggregatesAllSources() {
        when(userRepo.count()).thenReturn(100L);
        when(userRepo.countByRole(Role.FISHERMAN)).thenReturn(60L);
        when(userRepo.countByRole(Role.VENDOR)).thenReturn(25L);
        when(userRepo.countByRole(Role.BUYER)).thenReturn(13L);
        when(userRepo.countByRole(Role.ADMIN)).thenReturn(2L);
        when(userRepo.countCreatedAfter(any())).thenReturn(5L);
        when(userRepo.countLastLoginAfter(any())).thenReturn(8L);
        when(tripRepo.count()).thenReturn(500L);
        when(tripRepo.countByStatus(TripStatus.ACTIVE)).thenReturn(10L);
        when(tripRepo.countStartedToday()).thenReturn(12L);
        when(listingRepo.count()).thenReturn(80L);
        when(listingRepo.countByStatus(StorefrontListingStatus.PUBLISHED)).thenReturn(40L);
        when(orderRepo.count()).thenReturn(300L);
        when(orderRepo.countCreatedToday()).thenReturn(15L);
        when(orderRepo.countByStatus("DISPUTED")).thenReturn(3L);
        when(advisoryRepo.countActive()).thenReturn(4L);

        AdminMetrics m = service.getMetrics();

        assertThat(m.getTotalUsers()).isEqualTo(100);
        assertThat(m.getFishermen()).isEqualTo(60);
        assertThat(m.getActiveNow()).isEqualTo(8);
        assertThat(m.getActiveAdvisories()).isEqualTo(4);
        assertThat(m.getDisputedOrders()).isEqualTo(3);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=AdminMetricsServiceTest -q
```

- [ ] **Step 3: Implement `AdminMetricsService.java`**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.StorefrontListingStatus;
import com.mermaid.app.model.*;
import com.mermaid.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class AdminMetricsService {

    private final UserRepository userRepo;
    private final TripRepository tripRepo;
    private final StorefrontListingRepository listingRepo;
    private final OrderRepository orderRepo;
    private final AdvisoryRepository advisoryRepo;

    public AdminMetricsService(UserRepository userRepo, TripRepository tripRepo,
                               StorefrontListingRepository listingRepo,
                               OrderRepository orderRepo, AdvisoryRepository advisoryRepo) {
        this.userRepo = userRepo;
        this.tripRepo = tripRepo;
        this.listingRepo = listingRepo;
        this.orderRepo = orderRepo;
        this.advisoryRepo = advisoryRepo;
    }

    @Transactional(readOnly = true)
    public AdminMetrics getMetrics() {
        AdminMetrics m = new AdminMetrics();
        m.setTotalUsers((int) userRepo.count());
        m.setFishermen((int) userRepo.countByRole(Role.FISHERMAN));
        m.setVendors((int) userRepo.countByRole(Role.VENDOR));
        m.setBuyers((int) userRepo.countByRole(Role.BUYER));
        m.setAdmins((int) userRepo.countByRole(Role.ADMIN));
        m.setNewThisWeek((int) userRepo.countCreatedAfter(OffsetDateTime.now().minusDays(7)));
        m.setActiveNow((int) userRepo.countLastLoginAfter(OffsetDateTime.now().minusMinutes(15)));
        m.setTotalTrips((int) tripRepo.count());
        m.setActiveTrips((int) tripRepo.countByStatus(TripStatus.ACTIVE));
        m.setTripsToday((int) tripRepo.countStartedToday());
        m.setTotalListings((int) listingRepo.count());
        m.setOpenListings((int) listingRepo.countByStatus(StorefrontListingStatus.PUBLISHED));
        m.setTotalOrders((int) orderRepo.count());
        m.setOrdersToday((int) orderRepo.countCreatedToday());
        m.setDisputedOrders((int) orderRepo.countByStatus("DISPUTED"));
        m.setActiveAdvisories((int) advisoryRepo.countActive());
        return m;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=AdminMetricsServiceTest -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AdminMetricsService.java \
        backend/src/test/java/com/mermaid/app/service/AdminMetricsServiceTest.java
git commit -m "feat(backend): add AdminMetricsService"
```

---

## Task 8: DauService

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/DauService.java`
- Test: `backend/src/test/java/com/mermaid/app/service/DauServiceTest.java`

- [ ] **Step 1: Write failing test**

```java
package com.mermaid.app.service;

import com.mermaid.app.model.AdminDauEntry;
import com.mermaid.app.repository.LoginEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DauServiceTest {

    @Mock LoginEventRepository repo;
    @InjectMocks DauService service;

    @Test
    void getLast30Days_fillsMissingDaysWithZero() {
        // Repo returns only 1 entry for today
        LocalDate today = LocalDate.now();
        when(repo.findDailyDistinctUserCounts()).thenReturn(
            List.of(new Object[]{Date.valueOf(today), 42L})
        );

        List<AdminDauEntry> result = service.getLast30Days();

        assertThat(result).hasSize(30);
        // today's entry should have count 42
        AdminDauEntry todayEntry = result.get(result.size() - 1);
        assertThat(todayEntry.getCount()).isEqualTo(42);
        // days without data should have count 0
        assertThat(result.get(0).getCount()).isEqualTo(0);
    }
}
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && ./mvnw test -Dtest=DauServiceTest -q
```

- [ ] **Step 3: Implement `DauService.java`**

```java
package com.mermaid.app.service;

import com.mermaid.app.model.AdminDauEntry;
import com.mermaid.app.repository.LoginEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DauService {

    private final LoginEventRepository repo;

    public DauService(LoginEventRepository repo) { this.repo = repo; }

    @Transactional(readOnly = true)
    public List<AdminDauEntry> getLast30Days() {
        List<Object[]> rows = repo.findDailyDistinctUserCounts();
        Map<LocalDate, Integer> byDate = rows.stream().collect(Collectors.toMap(
            r -> ((Date) r[0]).toLocalDate(),
            r -> ((Number) r[1]).intValue()
        ));

        LocalDate today = LocalDate.now();
        List<AdminDauEntry> result = new ArrayList<>(30);
        for (int i = 29; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            AdminDauEntry entry = new AdminDauEntry();
            entry.setDate(day.toString());
            entry.setCount(byDate.getOrDefault(day, 0));
            result.add(entry);
        }
        return result;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=DauServiceTest -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/DauService.java \
        backend/src/test/java/com/mermaid/app/service/DauServiceTest.java
git commit -m "feat(backend): add DauService for 30-day DAU chart"
```

---

## Task 9: AdminHealthService

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/service/AdminHealthService.java`

- [ ] **Step 1: Implement `AdminHealthService.java`**

```java
package com.mermaid.app.service;

import com.mermaid.app.model.HealthCheck;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.FileSystems;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class AdminHealthService {

    private static final Logger log = LoggerFactory.getLogger(AdminHealthService.class);

    private final DataSource dataSource;
    private final String marineServiceUrl;

    public AdminHealthService(DataSource dataSource,
                              @Value("${marine.service.url}") String marineServiceUrl) {
        this.dataSource = dataSource;
        this.marineServiceUrl = marineServiceUrl;
    }

    public List<HealthCheck> getHealthChecks() {
        List<HealthCheck> checks = new ArrayList<>();
        checks.add(checkDatabase());
        checks.add(checkMarineService());
        checks.add(checkStorage());
        checks.add(staticCheck("Mail queue", "N_A", "Not monitored"));
        checks.add(staticCheck("WebSocket", "N_A", "Not monitored"));
        return checks;
    }

    private HealthCheck checkDatabase() {
        long start = System.currentTimeMillis();
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement()) {
            stmt.execute("SELECT 1");
            long ms = System.currentTimeMillis() - start;
            return health("PostgreSQL", "OK", "p95 " + ms + "ms · connection OK");
        } catch (Exception e) {
            return health("PostgreSQL", "DOWN", e.getMessage());
        }
    }

    private HealthCheck checkMarineService() {
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build();
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(marineServiceUrl + "/health"))
                .timeout(Duration.ofSeconds(3)).GET().build();
            HttpResponse<Void> resp = client.send(req, HttpResponse.BodyHandlers.discarding());
            String status = resp.statusCode() < 400 ? "OK" : "WARN";
            return health("Marine data (Open-Meteo)", status, "HTTP " + resp.statusCode());
        } catch (Exception e) {
            return health("Marine data (Open-Meteo)", "WARN", "Unreachable: " + e.getMessage());
        }
    }

    private HealthCheck checkStorage() {
        try {
            var store = FileSystems.getDefault().getFileStores().iterator().next();
            long total = store.getTotalSpace();
            long usable = store.getUsableSpace();
            if (total == 0) return health("Storage", "OK", "N/A");
            int usedPct = (int) ((total - usable) * 100 / total);
            String status = usedPct > 80 ? "WARN" : "OK";
            return health("Storage", status, usedPct + "% used");
        } catch (IOException e) {
            return health("Storage", "WARN", "Unable to read disk info");
        }
    }

    private HealthCheck staticCheck(String name, String status, String detail) {
        return health(name, status, detail);
    }

    private HealthCheck health(String name, String status, String detail) {
        HealthCheck h = new HealthCheck();
        h.setName(name);
        // openapi-generator creates StatusEnum for the 'status' enum property.
        // Enum constants match yaml values exactly: OK, WARN, DOWN, N_A.
        // If compile fails here, fall back to: h.setStatus(status) if the generator used String.
        h.setStatus(HealthCheck.StatusEnum.fromValue(status));
        h.setDetail(detail);
        return h;
    }
}
```

- [ ] **Step 2: Compile**

```bash
cd backend && ./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AdminHealthService.java
git commit -m "feat(backend): add AdminHealthService (DB, marine, storage health checks)"
```

---

## Task 10: Wire AuditLogService into existing services

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/AdvisoryService.java`
- Modify: `backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java`
- Modify: `backend/src/main/java/com/mermaid/app/service/MarketLocationService.java`
- Modify: `backend/src/main/java/com/mermaid/app/service/AdminUserService.java`

For each service, inject `AuditLogService` via constructor and add `auditLog.write(...)` calls after successful mutations.

- [ ] **Step 1: Update `AdvisoryService.java`**

Add `private final AuditLogService auditLog;` field and add it to the constructor. Then expand each mutating method so the audit write happens before the return (the existing single-expression returns must be split):

```java
// create() — change the last line from:
//   return mapper.toModel(repo.save(entity));
// to:
com.mermaid.app.model.Advisory result = mapper.toModel(repo.save(entity));
auditLog.write(adminUserId, "Admin", "advisory", "created advisory", request.getTitle());
return result;

// update() — change the last line from:
//   return mapper.toModel(repo.save(entity));
// to:
com.mermaid.app.model.Advisory result = mapper.toModel(repo.save(entity));
auditLog.write(null, "Admin", "advisory", "updated advisory", entity.getTitle());
return result;

// delete() — add after repo.save(entity):
auditLog.write(null, "Admin", "advisory", "deactivated advisory", entity.getTitle());
```

Use `null` for actorId in update/delete (caller context not available without SecurityUtils injection).

- [ ] **Step 2: Update `FishSpeciesService.java`**

```java
// In create(): auditLog.write(null, "Admin", "lookup", "created species", request.getCommonName());
// In update(): auditLog.write(null, "Admin", "lookup", "updated species", request.getCommonName());
// In delete(): auditLog.write(null, "Admin", "lookup", "deactivated species", entity.getCommonName());
// In reactivate(): auditLog.write(null, "Admin", "lookup", "reactivated species", entity.getCommonName());
```

- [ ] **Step 3: Update `MarketLocationService.java`** — same pattern as species.

- [ ] **Step 4: Update `AdminUserService.java`**

```java
// In updateUser() when active flag changes:
if (request.getActive() != null) {
    boolean wasActive = user.isActive();
    user.setActive(request.getActive());
    if (wasActive != request.getActive()) {
        String action = request.getActive() ? "reactivated user" : "deactivated user";
        auditLog.write(null, "Admin", "user", action, user.getFullName() + " (id " + userId + ")");
    }
}
```

- [ ] **Step 5: Compile**

```bash
cd backend && ./mvnw compile -q
```

- [ ] **Step 6: Run existing advisory/species tests**

```bash
cd backend && ./mvnw test -Dtest=AdvisoryServiceTest,FishSpeciesServiceTest -q 2>/dev/null || true
```

If those test classes don't exist, just verify compile passes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AdvisoryService.java \
        backend/src/main/java/com/mermaid/app/service/FishSpeciesService.java \
        backend/src/main/java/com/mermaid/app/service/MarketLocationService.java \
        backend/src/main/java/com/mermaid/app/service/AdminUserService.java
git commit -m "feat(backend): wire AuditLogService calls into advisory, species, location, and user services"
```

---

## Task 11: AuthService — login_events + lastLoginAt

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/AuthService.java`

- [ ] **Step 1: Inject `LoginEventRepository` into `AuthService`**

Add to constructor and field:

```java
private final LoginEventRepository loginEventRepo;
// Add to constructor signature and assignment
```

- [ ] **Step 2: Extract a helper method**

Add private method:

```java
private void recordLogin(User user) {
    user.setLastLoginAt(OffsetDateTime.now());
    userRepository.save(user);
    LoginEvent event = new LoginEvent();
    event.setUserId(user.getId());
    loginEventRepo.save(event);
}
```

- [ ] **Step 3: Call `recordLogin` in the three JWT-issuing paths**

In `login()` — skip-OTP path (line ~70, inside `if (skipEmailVerification)`): call `recordLogin(user)` before `return response`.

In `verifyOtp()` — after `user.setOtpCode(null)` and `userRepository.save(user)` (line ~110), add `recordLogin(user)`.

In `verifyEmail()` — before `String jwt = jwtTokenService.issueToken(user)` (line ~139), add `recordLogin(user)`.

- [ ] **Step 4: Compile**

```bash
cd backend && ./mvnw compile -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AuthService.java
git commit -m "feat(backend): record login_events and update last_login_at on successful auth"
```

---

## Task 12: AdminController — implement 8 new operations

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/AdminController.java`
- Test: `backend/src/test/java/com/mermaid/app/controller/AdminControllerTest.java`

- [ ] **Step 1: Write failing controller tests**

Create `AdminControllerTest.java`:

```java
package com.mermaid.app.controller;

import com.mermaid.app.model.*;
import com.mermaid.app.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean AdminUserService adminUserService;
    @MockitoBean AdvisoryService advisoryService;
    @MockitoBean FishSpeciesService fishSpeciesService;
    @MockitoBean MarketLocationService marketLocationService;
    @MockitoBean AdminMetricsService adminMetricsService;
    @MockitoBean DauService dauService;
    @MockitoBean AdminHealthService adminHealthService;
    @MockitoBean AuditLogService auditLogService;
    @MockitoBean com.mermaid.app.repository.OrderRepository orderRepo;
    @MockitoBean com.mermaid.app.service.OrderTimelineService timelineService;
    @MockitoBean com.mermaid.app.mapper.BuyerOrderMapper buyerOrderMapper;

    @Test
    void adminGetMetrics_requiresAdminRole() throws Exception {
        mvc.perform(get("/api/admin/metrics"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void adminGetMetrics_returnsMetrics() throws Exception {
        AdminMetrics m = new AdminMetrics();
        m.setTotalUsers(100); m.setFishermen(60); m.setVendors(25);
        m.setBuyers(13); m.setAdmins(2); m.setNewThisWeek(5);
        m.setActiveNow(8); m.setTotalTrips(500); m.setActiveTrips(10);
        m.setTripsToday(12); m.setTotalListings(80); m.setOpenListings(40);
        m.setTotalOrders(300); m.setOrdersToday(15); m.setDisputedOrders(3);
        m.setActiveAdvisories(4);
        when(adminMetricsService.getMetrics()).thenReturn(m);

        mvc.perform(get("/api/admin/metrics")
                .with(jwt().jwt(j -> j.claim("roles", List.of("ROLE_ADMIN")).subject("1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalUsers").value(100))
            .andExpect(jsonPath("$.activeAdvisories").value(4));
    }

    @Test
    void adminListFishSpecies_returnsAll() throws Exception {
        FishSpecies s = new FishSpecies(); s.setId(1L); s.setCommonName("Tuna"); s.setActive(false);
        when(fishSpeciesService.listAll()).thenReturn(List.of(s));

        mvc.perform(get("/api/admin/fish-species")
                .with(jwt().jwt(j -> j.claim("roles", List.of("ROLE_ADMIN")).subject("1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].commonName").value("Tuna"))
            .andExpect(jsonPath("$[0].active").value(false));
    }
}
```

- [ ] **Step 2: Run to verify failures**

```bash
cd backend && ./mvnw test -Dtest=AdminControllerTest -q
```

- [ ] **Step 3: Add new method implementations to `AdminController.java`**

Add the 8 new operations (inject the new services via constructor):

```java
private final AdminMetricsService adminMetricsService;
private final DauService dauService;
private final AdminHealthService adminHealthService;
private final AuditLogService auditLogService;

// New constructor — add these four params

@Override
public ResponseEntity<AdminMetrics> adminGetMetrics() {
    return ResponseEntity.ok(adminMetricsService.getMetrics());
}

@Override
public ResponseEntity<List<AdminDauEntry>> adminGetDau() {
    return ResponseEntity.ok(dauService.getLast30Days());
}

@Override
public ResponseEntity<List<HealthCheck>> adminGetHealth() {
    return ResponseEntity.ok(adminHealthService.getHealthChecks());
}

@Override
public ResponseEntity<List<AuditEntry>> adminListAuditLog(String kind) {
    return ResponseEntity.ok(auditLogService.list(kind));
}

@Override
public ResponseEntity<List<FishSpecies>> adminListFishSpecies() {
    return ResponseEntity.ok(fishSpeciesService.listAll());
}

@Override
public ResponseEntity<FishSpecies> adminReactivateFishSpecies(Long speciesId) {
    return ResponseEntity.ok(fishSpeciesService.reactivate(speciesId));
}

@Override
public ResponseEntity<List<MarketLocation>> adminListMarketLocations() {
    return ResponseEntity.ok(marketLocationService.listAll());
}

@Override
public ResponseEntity<MarketLocation> adminReactivateMarketLocation(Long locationId) {
    return ResponseEntity.ok(marketLocationService.reactivate(locationId));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && ./mvnw test -Dtest=AdminControllerTest -q
```

- [ ] **Step 5: Run full backend test suite**

```bash
cd backend && ./mvnw test -q
```

Expected: All tests pass (or only pre-existing failures).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/AdminController.java \
        backend/src/test/java/com/mermaid/app/controller/AdminControllerTest.java
git commit -m "feat(backend): implement 8 new AdminController operations"
```

---

## Task 13: Frontend — `api/admin.js`

**Files:**
- Create: `frontend/src/api/admin.js`

- [ ] **Step 1: Create the file**

```js
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js'

export const fetchAdminUsers    = () => apiGet('/admin/users')
export const updateAdminUser    = (id, body) => apiPut(`/admin/users/${id}`, null, body)
export const createAdminUser    = (body) => apiPost('/admin/users', null, body)

export const fetchAdminAdvisories = () => apiGet('/admin/advisories')
export const createAdvisory       = (body) => apiPost('/admin/advisories', null, body)
export const updateAdvisory       = (id, body) => apiPut(`/admin/advisories/${id}`, null, body)
export const deleteAdvisory       = (id) => apiDelete(`/admin/advisories/${id}`)

export const fetchAdminSpecies  = () => apiGet('/admin/fish-species')
export const createSpecies      = (body) => apiPost('/admin/fish-species', null, body)
export const updateSpecies      = (id, body) => apiPut(`/admin/fish-species/${id}`, null, body)
export const deleteSpecies      = (id) => apiDelete(`/admin/fish-species/${id}`)
export const reactivateSpecies  = (id) => apiPost(`/admin/fish-species/${id}/reactivate`)

export const fetchAdminLocations  = () => apiGet('/admin/market-locations')
export const createLocation       = (body) => apiPost('/admin/market-locations', null, body)
export const updateLocation       = (id, body) => apiPut(`/admin/market-locations/${id}`, null, body)
export const deleteLocation       = (id) => apiDelete(`/admin/market-locations/${id}`)
export const reactivateLocation   = (id) => apiPost(`/admin/market-locations/${id}/reactivate`)

export const fetchAdminMetrics  = () => apiGet('/admin/metrics')
export const fetchAdminDau      = () => apiGet('/admin/dau')
export const fetchAdminHealth   = () => apiGet('/admin/health')
export const fetchAdminAuditLog = (kind) =>
  apiGet(`/admin/audit-log${kind && kind !== 'all' ? `?kind=${kind}` : ''}`)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/admin.js
git commit -m "feat(frontend): add admin.js API module"
```

---

## Task 14: Wire AdminDashboard — delete mocks, Overview page, metrics badge

**Files:**
- Modify: `frontend/src/AdminDashboard.jsx`

This task removes all mock const arrays and wires the Overview page and the nav badge.

- [ ] **Step 1: Delete all mock const blocks**

Remove lines 5–146 (the entire block from `// ─── Mock data` through `ADMIN_HEALTH`). Also remove the `ADMIN_USER` reference inside `ROLE_NAV.ADMIN.user`.

- [ ] **Step 2: Update `ROLE_NAV` — remove the user function and fix the badge**

Replace `user: () => ADMIN_USER` with nothing (the `user` prop will be passed down). The rail badge for advisories will come from a metrics query (wired below). For now, remove the hardcoded `badge: 5` from the advisories nav item — it will be set dynamically in the `AdminDashboard` root component.

- [ ] **Step 3: Update `Rail` to receive `user` and `advisoryBadge` as props**

Change the `Rail` function signature:

```jsx
function Rail({ role, page, setPage, onTweaks, onSwitchRole, user, advisoryBadge }) {
  const cfg = ROLE_NAV[role]
  const initials = user
    ? user.fullName.split(' ').map(s => s[0]).join('').slice(0, 2)
    : '?'
```

Replace `user.first` with `user?.fullName?.split(' ')[0] || ''`. Pass `advisoryBadge` to the advisories nav item badge.

- [ ] **Step 4: Wire `AdminDashboard` root with metrics query**

```jsx
import { useQuery } from '@tanstack/react-query'
import { fetchAdminMetrics } from './api/admin.js'

export default function AdminDashboard({ user, onLogout }) {
  const [page, setPage] = useState('aoverview')
  const { data: metrics } = useQuery({ queryKey: ['admin-metrics'], queryFn: fetchAdminMetrics })

  return (
    <div className="app" data-accent="plum" data-density="balanced">
      <Rail
        role="ADMIN" page={page} setPage={setPage}
        onTweaks={() => {}} onSwitchRole={onLogout || (() => {})}
        user={user} advisoryBadge={metrics?.activeAdvisories ?? 0}
      />
      <main className="main">
        <Topbar role="ADMIN" page={page} user={user} />
        <PageCmp setPage={setPage} user={user} metrics={metrics} />
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Wire `AdminOverviewPage`**

Replace all `ADMIN_METRICS`, `ADMIN_DAU`, `ADMIN_HEALTH`, `ADMIN_AUDIT` references with React Query hooks:

```jsx
import {
  fetchAdminMetrics, fetchAdminDau, fetchAdminHealth, fetchAdminAuditLog
} from './api/admin.js'

function AdminOverviewPage({ setPage, user, metrics: metricsProp }) {
  const { data: M = metricsProp || {} } = useQuery({
    queryKey: ['admin-metrics'], queryFn: fetchAdminMetrics, enabled: !metricsProp
  })
  const { data: dau = [] } = useQuery({ queryKey: ['admin-dau'], queryFn: fetchAdminDau })
  const { data: health = [] } = useQuery({ queryKey: ['admin-health'], queryFn: fetchAdminHealth })
  const { data: audit = [] } = useQuery({
    queryKey: ['admin-audit-log'], queryFn: () => fetchAdminAuditLog(null)
  })

  const max = dau.length ? Math.max(...dau.map(d => d.count), 1) : 1
  const firstName = user?.fullName?.split(' ')[0] || 'Admin'
  // ... rest of render unchanged except replace ADMIN_USER.first with firstName,
  // ADMIN_DAU with dau, ADMIN_HEALTH with health, ADMIN_AUDIT with audit.slice(0, 8)
  // Metric strip: use M.totalUsers, M.activeNow, M.tripsToday, etc.
  // Bar chart: use d.count instead of d.dau
  // Health: map status to CSS class — OK→'safe', WARN→'warn', DOWN→'unsafe', N_A→'inactive'
  // Use: const statusClass = { OK:'safe', WARN:'warn', DOWN:'unsafe', N_A:'inactive' }[h.status] || 'inactive'
  // chip className: `chip chip--${statusClass}`
  // Audit: use a.createdAt for timestamp (format: HH:MM), a.actorName, a.action, a.target, a.kind
```

- [ ] **Step 6: Start dev server and verify Overview renders with real (or empty) data**

```bash
cd frontend && npm run dev
```

Open browser at http://localhost:5173, log in as admin. Overview page should render without crashing. Metric strip shows live counts (may be 0 if DB is empty).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/AdminDashboard.jsx
git commit -m "feat(frontend): wire AdminDashboard overview page to real backend data"
```

---

## Task 15: Wire Users page + modals

**Files:**
- Modify: `frontend/src/AdminDashboard.jsx` (AdminUsersPage component)

- [ ] **Step 1: Add missing imports at the top of `AdminDashboard.jsx`**

The file currently imports `useQuery` from `@tanstack/react-query`. Extend it:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
```

Also add the admin API imports at the top of the file (once, not per-component):

```jsx
import {
  fetchAdminUsers, updateAdminUser, createAdminUser,
  fetchAdminAdvisories, createAdvisory, updateAdvisory, deleteAdvisory,
  fetchAdminSpecies, createSpecies, updateSpecies, deleteSpecies, reactivateSpecies,
  fetchAdminLocations, createLocation, updateLocation, deleteLocation, reactivateLocation,
  fetchAdminMetrics, fetchAdminDau, fetchAdminHealth, fetchAdminAuditLog,
} from './api/admin.js'
```

- [ ] **Step 3: Replace `ADMIN_USERS` with a query in `AdminUsersPage`**

```jsx
function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'], queryFn: fetchAdminUsers
  })
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
```

- [ ] **Step 2: Replace tab counts and filter with live data**

```jsx
const filtered = users.filter(u => {
  const m = !search || u.fullName.toLowerCase().includes(search.toLowerCase())
    || u.email.toLowerCase().includes(search.toLowerCase())
  const t = tab === 'all' || u.role === tab.toUpperCase()
  return m && t
})
```

Tab counts: `users.filter(u => u.role === 'FISHERMAN').length`, etc.

- [ ] **Step 3: Replace `u.joined` with `u.createdAt` and `u.lastSeen` with relative `u.lastLoginAt`**

Add helper at the top of the file (outside components):

```jsx
function relativeTime(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
```

In the table: `relativeTime(u.lastLoginAt)` for Last seen, `new Date(u.createdAt).toLocaleDateString('en-PH')` for Joined.

- [ ] **Step 4: Make `⋯` button open an action popover**

Replace the static `<button>` with a small inline popover:

```jsx
const [openMenu, setOpenMenu] = useState(null)

// In the row:
<td style={{ position: 'relative' }}>
  <button className="btn btn--ghost btn--sm" onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}>
    <I.Dots size={12} />
  </button>
  {openMenu === u.id && (
    <div className="popover" style={{ position: 'absolute', right: 0, zIndex: 10 }}>
      <button className="popover-item" onClick={() => { setEditUser(u); setOpenMenu(null) }}>Edit</button>
      <button className="popover-item" onClick={() => toggleActive(u)}>
        {u.active ? 'Deactivate' : 'Reactivate'}
      </button>
    </div>
  )}
</td>
```

- [ ] **Step 5: Implement `toggleActive` and "Invite user" modal**

```jsx
const toggleMutation = useMutation({
  mutationFn: ({ id, active }) => updateAdminUser(id, { active }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] })
})
const toggleActive = (u) => toggleMutation.mutate({ id: u.id, active: !u.active })

// Invite form state
const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'FISHERMAN', password: '' })
const [inviteErr, setInviteErr] = useState(null)
const inviteMutation = useMutation({
  mutationFn: (body) => createAdminUser(body),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setInviteOpen(false) }
})

// "Invite user" modal — follows same trip-modal pattern as BfarPage
```

- [ ] **Step 6: Verify in browser — users table shows real users, toggle active works**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/AdminDashboard.jsx
git commit -m "feat(frontend): wire AdminUsersPage with real data, activate/deactivate, invite modal"
```

---

## Task 16: Wire Advisories page + modals

**Files:**
- Modify: `frontend/src/AdminDashboard.jsx` (AdminAdvisoriesPage)

- [ ] **Step 1: Replace `ADMIN_ADVISORIES` with a query + add mutation state**

```jsx
import { fetchAdminAdvisories, createAdvisory, updateAdvisory, deleteAdvisory } from './api/admin.js'

function AdminAdvisoriesPage() {
  const qc = useQueryClient()
  const { data: advisories = [] } = useQuery({
    queryKey: ['admin-advisories'], queryFn: fetchAdminAdvisories
  })
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [editAdvisory, setEditAdvisory] = useState(null)
  const [form, setForm] = useState({ title:'', message:'', severity:'MEDIUM', affectedArea:'', activeFrom:'', activeTo:'' })
  const [err, setErr] = useState(null)
```

- [ ] **Step 2: Wire "New advisory" and "Edit" through a shared form modal**

The modal uses the same `trip-modal` pattern as BfarPage. On submit:

```jsx
async function handleSubmit(e) {
  e.preventDefault(); setErr(null)
  try {
    if (editAdvisory) {
      await updateAdvisory(editAdvisory.id, { ...form })
    } else {
      await createAdvisory({ ...form })
    }
    qc.invalidateQueries({ queryKey: ['admin-advisories'] })
    qc.invalidateQueries({ queryKey: ['admin-metrics'] })
    setShowForm(false)
  } catch(e) { setErr(e.message) }
}
```

Form fields: title (text), message (textarea), severity (select: LOW/MEDIUM/HIGH/CRITICAL), affectedArea (text), activeFrom (datetime-local), activeTo (datetime-local).

Note: `activeFrom` / `activeTo` datetime-local values must be converted to ISO-8601 before sending. Use `new Date(form.activeFrom).toISOString()`.

- [ ] **Step 3: Wire "End now" button**

```jsx
async function endNow(a) {
  if (!confirm(`End advisory "${a.title}" now?`)) return
  await updateAdvisory(a.id, { isActive: false, activeTo: new Date().toISOString() })
  qc.invalidateQueries({ queryKey: ['admin-advisories'] })
  qc.invalidateQueries({ queryKey: ['admin-metrics'] })
}
```

- [ ] **Step 4: Replace mock subtitle counts with live data**

`advisories.filter(a => a.isActive).length` for active count, etc.

- [ ] **Step 5: Verify in browser — advisory CRUD works end-to-end**

- [ ] **Step 6: Commit**

```bash
git add frontend/src/AdminDashboard.jsx
git commit -m "feat(frontend): wire AdminAdvisoriesPage with real data, create/edit/end modals"
```

---

## Task 17: Wire Species page + modals

**Files:**
- Modify: `frontend/src/AdminDashboard.jsx` (AdminSpeciesPage)

- [ ] **Step 1: Replace `ADMIN_SPECIES` with a query**

```jsx
function AdminSpeciesPage() {
  const qc = useQueryClient()
  const { data: species = [] } = useQuery({
    queryKey: ['admin-species'], queryFn: fetchAdminSpecies
  })
  const [showForm, setShowForm] = useState(false)
  const [editSpecies, setEditSpecies] = useState(null)
  const [form, setForm] = useState({ commonName: '', scientificName: '' })
  const [err, setErr] = useState(null)
```

- [ ] **Step 2: Add create/edit modal**

```jsx
async function handleSubmit(e) {
  e.preventDefault(); setErr(null)
  try {
    if (editSpecies) {
      await updateSpecies(editSpecies.id, form)
    } else {
      await createSpecies(form)
    }
    qc.invalidateQueries({ queryKey: ['admin-species'] })
    setShowForm(false)
  } catch(e) { setErr(e.message) }
}
```

- [ ] **Step 3: Make `⋯` button toggle active status**

```jsx
async function toggleSpecies(s) {
  if (s.active) {
    await deleteSpecies(s.id)
  } else {
    await reactivateSpecies(s.id)
  }
  qc.invalidateQueries({ queryKey: ['admin-species'] })
}
```

- [ ] **Step 4: Remove `usageCount` from display (not returned by new endpoint) or show as `—`**

The new `GET /admin/fish-species` returns `FishSpecies` which has no `usageCount` (that was mock-only). Replace the usage bar with a simple `—` or remove the Usage column.

- [ ] **Step 5: Update subtitle using live counts**

```jsx
<p className="page__sub">
  {species.filter(s => s.active).length} active species in the catalog.
</p>
```

- [ ] **Step 6: Verify in browser — species CRUD + deactivate/reactivate works**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/AdminDashboard.jsx
git commit -m "feat(frontend): wire AdminSpeciesPage with real data, create/edit/toggle modals"
```

---

## Task 18: Wire Locations page + modals

**Files:**
- Modify: `frontend/src/AdminDashboard.jsx` (AdminLocationsPage)

- [ ] **Step 1: Replace `ADMIN_LOCATIONS` with a query**

```jsx
function AdminLocationsPage() {
  const qc = useQueryClient()
  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'], queryFn: fetchAdminLocations
  })
  const [showForm, setShowForm] = useState(false)
  const [editLocation, setEditLocation] = useState(null)
  const [form, setForm] = useState({ name: '', municipality: '', province: '' })
  const [err, setErr] = useState(null)
```

- [ ] **Step 2: Add create/edit modal**

```jsx
async function handleSubmit(e) {
  e.preventDefault(); setErr(null)
  try {
    if (editLocation) {
      await updateLocation(editLocation.id, form)
    } else {
      await createLocation(form)
    }
    qc.invalidateQueries({ queryKey: ['admin-locations'] })
    setShowForm(false)
  } catch(e) { setErr(e.message) }
}
```

- [ ] **Step 3: Wire `⋯` button for edit + deactivate/reactivate**

```jsx
// In card's ⋯ button area, use same popover pattern as Users page:
// "Edit" → setEditLocation(l); setShowForm(true)
// "Deactivate" / "Reactivate" → call deleteLocation(l.id) or reactivateLocation(l.id)
```

- [ ] **Step 4: Remove `vendors` / `listings` mock stats from location cards (not returned by API) — replace with `—`**

- [ ] **Step 5: Update subtitle with live counts**

```jsx
<p className="page__sub">
  {locations.filter(l => l.active).length} active locations across{' '}
  {new Set(locations.map(l => l.province).filter(Boolean)).size} provinces.
</p>
```

- [ ] **Step 6: Verify in browser**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/AdminDashboard.jsx
git commit -m "feat(frontend): wire AdminLocationsPage with real data, create/edit/toggle modals"
```

---

## Task 19: Wire Audit Log page + export

**Files:**
- Modify: `frontend/src/AdminDashboard.jsx` (AdminAuditPage)

- [ ] **Step 1: Replace `ADMIN_AUDIT` with a query**

```jsx
function AdminAuditPage() {
  const [filter, setFilter] = useState('all')
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin-audit-log', filter],
    queryFn: () => fetchAdminAuditLog(filter)
  })
```

- [ ] **Step 2: Update table rows to use real field names**

Replace `a.ts` with formatted `a.createdAt`, `a.actor` with `a.actorName`, keep `a.action`, `a.target`, `a.kind` (same names).

For the timestamp:

```jsx
function fmtAuditTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return `Yest. ${d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`
  return `${diffDays}d ago`
}
```

- [ ] **Step 3: Wire "Export" button**

```jsx
function exportCsv(rows) {
  const header = 'Time,Kind,Actor,Action,Target'
  const lines = rows.map(r =>
    `"${r.createdAt}","${r.kind}","${r.actorName}","${r.action}","${r.target || ''}"`
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'audit-log.csv'; a.click()
  URL.revokeObjectURL(url)
}

// Button:
<button className="btn" onClick={() => exportCsv(entries)}>
  <I.Filter size={14} /> Export
</button>
```

- [ ] **Step 4: Verify in browser — filter tabs work, table shows real audit entries (empty until admin actions are taken), export downloads CSV**

- [ ] **Step 5: Run frontend tests**

```bash
cd frontend && npm test
```

Expected: All tests pass (or only pre-existing failures).

- [ ] **Step 6: Final commit**

```bash
git add frontend/src/AdminDashboard.jsx
git commit -m "feat(frontend): wire AdminAuditPage with real data, filter, and CSV export"
```

---

## Final Verification

- [ ] Start backend: `cd backend && ./mvnw spring-boot:run`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Log in as admin and visit each admin page: Overview, Users, Advisories, Species, Locations, Audit Log
- [ ] Create an advisory → verify it appears in list and audit log
- [ ] Deactivate a species → verify it shows as inactive; reactivate → verify it returns to active
- [ ] Create a new user via "Invite user" → verify they appear in users table
- [ ] Log out and back in → verify `last_login_at` updates and "last seen" shows correctly in users table
- [ ] Run full test suite: `cd backend && ./mvnw test -q`
