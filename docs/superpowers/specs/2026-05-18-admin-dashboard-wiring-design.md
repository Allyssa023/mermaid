# Admin Dashboard Wiring — Design Spec

**Date:** 2026-05-18
**Branch:** need-tuloy
**Status:** Approved

## Overview

Wire the MERMAID admin dashboard (`AdminDashboard.jsx`) to real backend data. Replace all mock `const` arrays and hardcoded values with React Query hooks backed by new and existing API endpoints. Make all static buttons functional with proper CRUD modals and actions. Approach: backend-first (DB migration → OpenAPI → services/entities → controllers), then frontend wiring.

## 1. Database Schema Changes

Single Flyway migration: `V{next}__admin_telemetry.sql`

```sql
-- 1. Track last login time per user (also updates User.java entity)
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;

-- 2. Login events for 30-day DAU chart
CREATE TABLE login_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_events_date ON login_events (DATE(logged_in_at));

-- 3. Audit log for admin actions + system events
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   BIGINT REFERENCES users(id),
  actor_name VARCHAR(200) NOT NULL,
  kind       VARCHAR(30)  NOT NULL,  -- user | advisory | lookup | system | flag
  action     VARCHAR(100) NOT NULL,
  target     VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);
```

No existing tables modified beyond `last_login_at` on `users`.

### 1a. `User.java` entity update

Add field alongside the migration:

```java
@Column(name = "last_login_at")
private OffsetDateTime lastLoginAt;
// + getter/setter
```

## 2. Backend Changes

### 2a. OpenAPI (`api.yaml`) — schema additions

**`UserSummary` — add fields:**
```yaml
createdAt:
  type: string
  format: date-time
lastLoginAt:
  type: string
  format: date-time
  nullable: true
```

**New schemas:**

`AdminMetrics`:
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
    activeNow:        { type: integer }   # last_login_at > now() - 15 min
    totalTrips:       { type: integer }
    activeTrips:      { type: integer }
    tripsToday:       { type: integer }
    totalListings:    { type: integer }
    openListings:     { type: integer }
    totalOrders:      { type: integer }
    ordersToday:      { type: integer }
    disputedOrders:   { type: integer }
    activeAdvisories: { type: integer }   # powers rail badge
```

`AdminDauEntry`:
```yaml
AdminDauEntry:
  type: object
  required: [date, count]
  properties:
    date:  { type: string, format: date }
    count: { type: integer }
```

`HealthCheck`:
```yaml
HealthCheck:
  type: object
  required: [name, status, detail]
  properties:
    name:   { type: string }
    status: { type: string, enum: [OK, WARN, DOWN] }
    detail: { type: string }
```

`AuditEntry`:
```yaml
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

**New paths (all require `ROLE_ADMIN`):**

| Method | Path | Operation ID | Response schema |
|--------|------|-------------|-----------------|
| `GET` | `/admin/fish-species` | `adminListFishSpecies` | `array of FishSpecies` (incl. inactive) |
| `GET` | `/admin/market-locations` | `adminListMarketLocations` | `array of MarketLocation` (incl. inactive) |
| `POST` | `/admin/fish-species/{speciesId}/reactivate` | `adminReactivateFishSpecies` | `FishSpecies` |
| `POST` | `/admin/market-locations/{locationId}/reactivate` | `adminReactivateMarketLocation` | `MarketLocation` |
| `GET` | `/admin/metrics` | `adminGetMetrics` | `AdminMetrics` |
| `GET` | `/admin/dau` | `adminGetDau` | `array of AdminDauEntry` |
| `GET` | `/admin/health` | `adminGetHealth` | `array of HealthCheck` |
| `GET` | `/admin/audit-log` | `adminListAuditLog` | `array of AuditEntry`; optional `kind` query param |

### 2b. New repository query methods needed

**`UserRepository`:**
```java
long countByRole(Role role);
long countByCreatedAtAfter(OffsetDateTime cutoff);
long countByLastLoginAtAfter(OffsetDateTime cutoff);
```

**`TripRepository`:**
```java
long countByStatus(String status);   // "ACTIVE"
long countByCreatedAtAfter(OffsetDateTime cutoff);
```

**`StorefrontListingRepository` (or equivalent):**
```java
// JpaRepository.count() is inherited; also need:
long countByStatus(StorefrontListingStatus status);   // StorefrontListingStatus.PUBLISHED = open
```

**`OrderRepository`:**
```java
long countByStatus(String status);   // "DISPUTED"
long countByCreatedAtAfter(OffsetDateTime cutoff);
```

**`AdvisoryRepository`:**
```java
long countByIsActiveTrue();
```

### 2c. New / updated services

**`AdminUserService`:**
- `toUserSummary()` — add `createdAt` and `lastLoginAt` mapping from `User` entity

**`FishSpeciesService`:**
- Add `listAll()` — `repo.findAll()` ordered by `commonName`, all species regardless of `active`
- Add `reactivate(id)` — sets `active = true`, saves, returns model

**`MarketLocationService`:**
- Add `listAll()` — `repo.findAll()`, all locations regardless of `active`
- Add `reactivate(id)` — sets `active = true`, saves, returns model

**`AdminMetricsService` (new):**
- Injects: `UserRepository`, `TripRepository`, listing repo, `OrderRepository`, `AdvisoryRepository`
- `getMetrics()` builds `AdminMetrics` from the repository query methods in 2b
- `activeNow` = `countByLastLoginAtAfter(OffsetDateTime.now().minusMinutes(15))`
- `newThisWeek` = `countByCreatedAtAfter(OffsetDateTime.now().minusDays(7))`
- `tripsToday` = `countByCreatedAtAfter(startOfToday)`
- `ordersToday` = `countByCreatedAtAfter(startOfToday)`

**`AuditLogService` (new):**
- `write(actorId, actorName, kind, action, target)` — inserts into `audit_log`; `@Transactional`; failures caught and logged at WARN, never propagated
- `list(String kind)` — `@Transactional(readOnly = true)`; returns entries ordered by `created_at DESC`, limit 200; filters by `kind` when non-null/non-"all"
- Called from service methods: `AdvisoryService` (create/update/delete/endNow), `FishSpeciesService` (create/update/delete/reactivate), `MarketLocationService` (create/update/delete/reactivate), `AdminUserService` (updateUser when active flag changes)

**`AdminHealthService` (new):**
- `@Value("${marine.service.url}")` injected for marine service base URL
- Checks DB: executes `SELECT 1` via `DataSource`, measures latency; status `OK` / `DOWN`
- Checks marine service: HTTP GET `${marine.service.url}/health` with 3s timeout; `OK` / `WARN` on timeout
- Checks storage: reads upload directory free space percent via `java.nio.file.FileStore`; `WARN` if < 20% free
- Mail queue: static `{ name: "Mail queue", status: "N/A", detail: "Not monitored" }`
- WebSocket connections: static `{ name: "WebSocket", status: "N/A", detail: "Not monitored" }`

**`AuthService` — `verifyOtp()` and `verifyEmail()`:**
- After issuing the JWT (successful completion): insert `login_events` row + set `user.lastLoginAt = now()` and save
- Applies to: `verifyOtp()`, `verifyEmail()` (auto-login on email confirmation), and the skip-OTP fast path in `login()` (email-not-verified bypass for dev)
- **Not** in `login()` itself (credentials check only, OTP not yet verified)

### 2d. `AdminController` — new methods (all 8 new operation IDs)

| Operation ID | Delegates to |
|---|---|
| `adminListFishSpecies` | `fishSpeciesService.listAll()` |
| `adminListMarketLocations` | `marketLocationService.listAll()` |
| `adminReactivateFishSpecies` | `fishSpeciesService.reactivate(id)` |
| `adminReactivateMarketLocation` | `marketLocationService.reactivate(id)` |
| `adminGetMetrics` | `adminMetricsService.getMetrics()` |
| `adminGetDau` | `dauService.getLast30Days()` (see below) |
| `adminGetHealth` | `adminHealthService.getHealthChecks()` |
| `adminListAuditLog` | `auditLogService.list(kind)` |

**`DauService` (new, simple):** queries `login_events` grouping by `DATE(logged_in_at)` for the last 30 days, returns list of `AdminDauEntry`. Uses a native query or JPQL date truncation. Missing days get `count: 0` filled in Java.

## 3. Frontend Changes

**File:** `frontend/src/AdminDashboard.jsx`
**New file:** `frontend/src/api/admin.js`

All mock `const` arrays (`ADMIN_USER`, `ADMIN_USERS`, `ADMIN_ADVISORIES`, etc.) are deleted. Each page component fetches its own data via React Query.

### 3a. `frontend/src/api/admin.js`

```js
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js'

// Users
export const fetchAdminUsers    = () => apiGet('/admin/users')
export const updateAdminUser    = (id, body) => apiPut(`/admin/users/${id}`, null, body)
export const createAdminUser    = (body) => apiPost('/admin/users', null, body)

// Advisories
export const fetchAdminAdvisories = () => apiGet('/admin/advisories')
export const createAdvisory       = (body) => apiPost('/admin/advisories', null, body)
export const updateAdvisory       = (id, body) => apiPut(`/admin/advisories/${id}`, null, body)
export const deleteAdvisory       = (id) => apiDelete(`/admin/advisories/${id}`)

// Species
export const fetchAdminSpecies  = () => apiGet('/admin/fish-species')
export const createSpecies      = (body) => apiPost('/admin/fish-species', null, body)
export const updateSpecies      = (id, body) => apiPut(`/admin/fish-species/${id}`, null, body)
export const deleteSpecies      = (id) => apiDelete(`/admin/fish-species/${id}`)
export const reactivateSpecies  = (id) => apiPost(`/admin/fish-species/${id}/reactivate`)

// Locations
export const fetchAdminLocations  = () => apiGet('/admin/market-locations')
export const createLocation       = (body) => apiPost('/admin/market-locations', null, body)
export const updateLocation       = (id, body) => apiPut(`/admin/market-locations/${id}`, null, body)
export const deleteLocation       = (id) => apiDelete(`/admin/market-locations/${id}`)
export const reactivateLocation   = (id) => apiPost(`/admin/market-locations/${id}/reactivate`)

// Metrics + telemetry
export const fetchAdminMetrics  = () => apiGet('/admin/metrics')
export const fetchAdminDau      = () => apiGet('/admin/dau')
export const fetchAdminHealth   = () => apiGet('/admin/health')
export const fetchAdminAuditLog = (kind) =>
  apiGet(`/admin/audit-log${kind && kind !== 'all' ? `?kind=${kind}` : ''}`)
```

### 3b. Per-page wiring

**`AdminDashboard` (root component):**
- Receives `user` prop from `App.jsx` (already the case)
- Passes `user` down to `AdminOverviewPage`
- Advisory rail badge = `metrics?.activeAdvisories ?? 0` (from the metrics query result)

**`AdminOverviewPage`:**
- Greeting uses `user.fullName` prop (no `ADMIN_USER` reference)
- `useQuery(['admin-metrics'])` → metric strip + user mix bars
- `useQuery(['admin-dau'])` → bar chart (same rendering logic, real data)
- `useQuery(['admin-health'])` → health list
- `useQuery(['admin-audit-log'])` → audit feed (first 8 rows shown)

**`AdminUsersPage`:**
- `useQuery(['admin-users'])` → table rows
- "Joined" column: `new Date(u.createdAt).toLocaleDateString('en-PH')`
- "Last seen" column: relative time from `u.lastLoginAt` (or "Never" if null)
- Tab counts from live data length
- `⋯` row button: popover with **Edit** (opens edit modal) and **Deactivate / Reactivate** (`PUT /admin/users/{id}` with `{ active: !u.active }`)
- "Invite user" button: modal with fullName + email + role + password → `POST /admin/users`

**`AdminAdvisoriesPage`:**
- `useQuery(['admin-advisories'])` → list
- **"New advisory"**: modal with title, message, severity (select), affectedArea, activeFrom (datetime-local), activeTo (datetime-local) → `POST /admin/advisories`
- **"Edit"**: same modal pre-filled → `PUT /admin/advisories/{id}`
- **"End now"**: confirm dialog → `PUT /admin/advisories/{id}` with `{ isActive: false, activeTo: new Date().toISOString() }` (field name is `isActive` — matches `AdvisoryUpdateRequest` schema in api.yaml)
- On any mutation success: invalidate `['admin-advisories']` and `['admin-metrics']`

**`AdminSpeciesPage`:**
- `useQuery(['admin-species'])` → table (all, including inactive rows)
- **"Add species"**: modal with commonName + scientificName → `POST /admin/fish-species`
- **"Edit"**: same modal pre-filled → `PUT /admin/fish-species/{id}`
- `⋯` button: **Deactivate** (if active → `DELETE /admin/fish-species/{id}`) or **Reactivate** (if inactive → `POST /admin/fish-species/{id}/reactivate`)

**`AdminLocationsPage`:**
- `useQuery(['admin-locations'])` → grid (all, including inactive)
- **"Add location"**: modal with name, municipality, province → `POST /admin/market-locations`
- `⋯` button: **Edit** (pre-fill modal → `PUT`) + **Deactivate** or **Reactivate** (same pattern as species)

**`AdminAuditPage`:**
- `useQuery(['admin-audit-log', filter])` → table, refetches when filter changes
- **"Export"**: converts current rows to CSV string, triggers `<a download>` click client-side

## 4. Error Handling

- All React Query errors show an inline error message inside the card (not full-page crash)
- CRUD mutation failures show inline error inside the modal form (same pattern as `AdminBfarPage`)
- `AuditLogService.write()` failures are caught, logged at WARN, and never propagate to the caller

## 5. What is NOT included

- Real-time WebSocket connection count — shown as "Not monitored" in health panel
- Mail queue depth — shown as "Not monitored" in health panel
- Role-specific activity counts in Users table (trips per fisherman, listings per vendor) — shown as "—" to avoid expensive joins on the list endpoint
- Storage uses actual disk usage of the upload directory via `FileStore` API
