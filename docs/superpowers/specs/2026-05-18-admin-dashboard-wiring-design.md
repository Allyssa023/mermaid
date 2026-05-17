# Admin Dashboard Wiring — Design Spec

**Date:** 2026-05-18
**Branch:** need-tuloy
**Status:** Approved

## Overview

Wire the MERMAID admin dashboard (`AdminDashboard.jsx`) to real backend data. Replace all mock `const` arrays and hardcoded values with React Query hooks backed by new and existing API endpoints. Make all static buttons functional with proper CRUD modals and actions. Approach: backend-first (DB migration → OpenAPI → services → controllers), then frontend wiring.

## 1. Database Schema Changes

Single Flyway migration: `V{next}__admin_telemetry.sql`

```sql
-- 1. Track last login time per user
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
- `AdminMetrics` — platform aggregate counters
- `AdminDauEntry` — `{ date: string, count: integer }`
- `HealthCheck` — `{ name: string, status: string, detail: string }`
- `AuditEntry` — `{ id, actorId, actorName, kind, action, target, createdAt }`

**New paths (all under `AdminApi`, require `ROLE_ADMIN`):**

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| `GET` | `/admin/fish-species` | `adminListFishSpecies` | All species incl. inactive |
| `GET` | `/admin/market-locations` | `adminListMarketLocations` | All locations incl. inactive |
| `GET` | `/admin/metrics` | `adminGetMetrics` | Platform aggregate stats |
| `GET` | `/admin/dau` | `adminGetDau` | 30-day DAU array |
| `GET` | `/admin/health` | `adminGetHealth` | Service health checks |
| `GET` | `/admin/audit-log` | `adminListAuditLog` | Audit entries, `kind` filter param |

### 2b. New / updated services

**`AdminUserService`:**
- `toUserSummary()` — add `createdAt` and `lastLoginAt` mapping from `User` entity

**`FishSpeciesService`:**
- Add `listAll()` — returns all species regardless of `active` flag (for admin)

**`MarketLocationService`:**
- Add `listAll()` — returns all locations regardless of `active` flag (for admin)

**`AdminMetricsService` (new):**
- Queries user repo for counts by role (FISHERMAN, VENDOR, BUYER, ADMIN)
- Counts `newThisWeek` from `users.created_at > now() - 7 days`
- Counts `activeNow` from `users.last_login_at > now() - 15 minutes`
- Queries trip repo for total, active, today counts
- Queries storefront listing repo for total, open counts
- Queries order repo for total, today, disputed counts

**`AuditLogService` (new):**
- `write(actorId, actorName, kind, action, target)` — inserts into `audit_log`; non-transactional, failures logged but not propagated
- `list(kind)` — returns entries ordered by `created_at DESC`, limit 200
- Called from: `AdvisoryService` (create/update/delete), `FishSpeciesService` (create/update/delete), `MarketLocationService` (create/update/delete), `AdminUserService` (update active flag)

**`AdminHealthService` (new):**
- Checks DB: executes `SELECT 1` via `DataSource`, measures latency
- Checks marine service: HTTP GET to `marine-service` health URL with timeout
- Checks storage: reads disk free space percentage from `java.nio.file.FileStore`
- Returns fixed list of `HealthCheck` objects; status `OK` / `WARN` / `DOWN`

**`AuthController` / `AuthService`:**
- On successful login: insert `login_events` row + update `users.last_login_at = now()`

### 2c. `AdminController` — new method implementations

Implement the six new `AdminApi` operations, delegating to the services above.

## 3. Frontend Changes

**File:** `frontend/src/AdminDashboard.jsx`

All mock `const` arrays (`ADMIN_USER`, `ADMIN_USERS`, `ADMIN_ADVISORIES`, etc.) are deleted. Each page component fetches its own data via React Query.

### 3a. Shared admin API module

New file: `frontend/src/api/admin.js`

```js
// Users
export const fetchAdminUsers      = () => apiGet('/admin/users')
export const updateAdminUser      = (id, body) => apiPut(`/admin/users/${id}`, null, body)
export const createAdminUser      = (body) => apiPost('/admin/users', null, body)

// Advisories
export const fetchAdminAdvisories = () => apiGet('/admin/advisories')
export const createAdvisory       = (body) => apiPost('/admin/advisories', null, body)
export const updateAdvisory       = (id, body) => apiPut(`/admin/advisories/${id}`, null, body)
export const deleteAdvisory       = (id) => apiDelete(`/admin/advisories/${id}`)

// Species
export const fetchAdminSpecies    = () => apiGet('/admin/fish-species')
export const createSpecies        = (body) => apiPost('/admin/fish-species', null, body)
export const updateSpecies        = (id, body) => apiPut(`/admin/fish-species/${id}`, null, body)
export const deleteSpecies        = (id) => apiDelete(`/admin/fish-species/${id}`)

// Locations
export const fetchAdminLocations  = () => apiGet('/admin/market-locations')
export const createLocation       = (body) => apiPost('/admin/market-locations', null, body)
export const updateLocation       = (id, body) => apiPut(`/admin/market-locations/${id}`, null, body)
export const deleteLocation       = (id) => apiDelete(`/admin/market-locations/${id}`)

// Metrics + telemetry
export const fetchAdminMetrics    = () => apiGet('/admin/metrics')
export const fetchAdminDau        = () => apiGet('/admin/dau')
export const fetchAdminHealth     = () => apiGet('/admin/health')
export const fetchAdminAuditLog   = (kind) => apiGet(`/admin/audit-log${kind && kind !== 'all' ? `?kind=${kind}` : ''}`)
```

### 3b. Per-page wiring

**`AdminOverviewPage`:**
- Greeting uses `user.fullName` (prop passed from `AdminDashboard`)
- `useQuery(['admin-metrics'])` → metric strip + user mix bars
- `useQuery(['admin-dau'])` → bar chart (same rendering, real data)
- `useQuery(['admin-health'])` → health list
- `useQuery(['admin-audit-log'])` → audit feed (first 8 rows)
- Advisory badge on rail item = `metrics.activeAdvisories`

**`AdminUsersPage`:**
- `useQuery(['admin-users'])` → table rows
- "Joined" column: `new Date(u.createdAt).toLocaleDateString()`
- "Last seen" column: relative time from `u.lastLoginAt` (or "Never")
- Tab counts from live data
- `⋯` row button: popover with **Edit** (opens edit modal) and **Deactivate / Reactivate** (`PUT /admin/users/{id}` with `{ active: !u.active }`)
- "Invite user" button: modal with email + role + fullName → `POST /admin/users`

**`AdminAdvisoriesPage`:**
- `useQuery(['admin-advisories'])` → list
- **"New advisory"**: modal with title, message, severity (select), affectedArea, activeFrom, activeTo → `POST`; on success invalidate query + write audit
- **"Edit"**: same modal pre-filled → `PUT`
- **"End now"**: confirm dialog → `PUT` with `{ isActive: false, activeTo: now }`

**`AdminSpeciesPage`:**
- `useQuery(['admin-species'])` → table (all, including inactive)
- **"Add species"**: modal with commonName + scientificName → `POST`
- **"Edit"**: modal pre-filled → `PUT`
- `⋯` button: **Deactivate / Reactivate** → `DELETE` (soft) or `PUT` with `{ active: true }`

**`AdminLocationsPage`:**
- `useQuery(['admin-locations'])` → grid (all, including inactive)
- **"Add location"**: modal with name, municipality, province → `POST`
- `⋯` button: **Edit** (pre-fill modal → `PUT`) + **Deactivate / Reactivate**

**`AdminAuditPage`:**
- `useQuery(['admin-audit-log', filter])` → table, refetches on filter change
- **"Export"**: converts current rows to CSV string, triggers `<a download>` click client-side

## 4. Error Handling

- All React Query errors show an inline error message in the card (not a full-page crash)
- CRUD mutations show inline error in modal form on failure (same pattern as `AdminBfarPage`)
- `AuditLogService.write()` failures are caught and logged at WARN level; never propagate to caller

## 5. What is NOT included

- Real-time WebSocket connection count in health panel (shown as static "N/A")
- Mail queue depth (no mail queue integration; shown as static "N/A")
- Storage percentage (uses `FileStore` API, shows actual disk usage of upload directory)
- Role-based activity counts (trips per fisherman, listings per vendor) in the Users table — those columns show "—" until we have a dedicated query; not worth the join cost for the list endpoint
