# My Trips Frontend — Design Spec

**Date:** 2026-03-31
**Feature:** My Trips view for the MERMAID Fisherman Dashboard
**Status:** Approved

---

## 1. Architecture & Component Structure

A new `frontend/src/MyTrips.jsx` file owns all trip-related state and logic. `FishermanDashboard.jsx` renders `<MyTrips token={token} />` when `activeNav === 'trips'`.

The existing `apiGet` helper in `FishermanDashboard.jsx` is extracted into `frontend/src/api.js` so both files share it without duplication.

### Component Tree

```
MyTrips                          ← root: owns all state, all API calls
  ├─ TripTabs                    ← "Active Trip" | "History" tab switcher
  ├─ ActiveTripView              ← shown when activeTab === 'active'
  │    ├─ EmptyState             ← no active trip → "Start Trip" button
  │    ├─ StartTripModal         ← modal form: departurePoint, targetArea, vesselName, notes
  │    ├─ TripHeaderCard         ← status badge, dates, duration counter, trip meta
  │    ├─ SafetyChecklistSection ← collapsible, 6 checkboxes, save button
  │    ├─ CatchLogsSection       ← collapsible, catch cards + "Add Catch" button
  │    │    └─ AddCatchForm      ← searchable species select, quantity, price, notes
  │    └─ EndTripButton          ← confirm dialog with optional notes
  └─ TripHistoryList             ← shown when activeTab === 'history'
       └─ TripHistoryCard[]      ← expandable: summary → checklist + catch detail
```

All sub-components are defined in `MyTrips.jsx` — they are tightly coupled to trip state and not reused elsewhere. Split into a folder only if the file grows unwieldy.

---

## 2. Data Flow & API Calls

`MyTrips` fetches on mount and refetches after each mutation.

### State

| State | API | When fetched |
|---|---|---|
| `activeTrip` | `GET /trips?status=ACTIVE` | mount, after start/end |
| `history` | `GET /trips?status=COMPLETED` + `GET /trips?status=CANCELLED` (merged) | mount, after end |
| `catches` | `GET /trips/{tripId}/catches` | when active trip exists |
| `fishSpecies` | `GET /fish-species` | once on mount |

### Mutations

| Action | Endpoint | Post-mutation |
|---|---|---|
| Start trip | `POST /trips` | refetch activeTrip |
| Save checklist | `PUT /trips/{tripId}/checklist` | update activeTrip in state |
| Add catch | `POST /trips/{tripId}/catches` | refetch catches |
| End trip | `POST /trips/{tripId}/end` | refetch activeTrip + history |

History cards fetch their catches lazily: `GET /trips/{tripId}/catches` is called only when a history card is expanded, not on list load.

---

## 3. UI Layout & Key Interactions

### Tab Bar

Two pill-style tab buttons ("Active Trip" / "History") matching the existing `sidebar__link` visual style.

### Active Trip Tab — No Active Trip

Centered empty state with an icon, "No active trip" message, and a prominent "Start Trip" button.

`StartTripModal` fields:
- `departurePoint` — text, required, 2–150 chars
- `targetArea` — text, required, 2–150 chars
- `vesselName` — text, optional, max 100 chars
- `notes` — textarea, optional, max 500 chars

Client-side validation runs before submit. Submit → `POST /trips`.

### Active Trip Tab — Trip In Progress

**TripHeaderCard:** ACTIVE status badge (green), vessel name, departure → target area, start time, live duration counter (ticking every second).

**SafetyChecklistSection:** Collapsible. Six labeled checkboxes:
- Fuel checked
- Engine checked
- Radio checked
- Life vest checked
- Weather reviewed
- Emergency kit checked

"Save Checklist" button disabled until a change is made. If checklist already saved, shows `checklistCompletedAt` timestamp.

**CatchLogsSection:** Collapsible. Lists catch cards showing species name, quantity (kg), price/kg (if set), notes. "Add Catch" button opens inline `AddCatchForm`:
- Species — searchable/filterable select (type to filter list from `GET /fish-species`)
- Quantity (kg) — number, required, must be > 0
- Price per kg — number, optional
- Notes — text, optional

**EndTripButton:** Rendered at the bottom of the active trip scrollable content (not CSS fixed), warning/red style. Opens a confirm dialog with an optional notes field. Confirm → `POST /trips/{id}/end`.

### History Tab

List of `TripHistoryCard` components, newest first. Collapsed summary shows:
- Status badge (COMPLETED / CANCELLED)
- Departure → target area
- Vessel name
- Date range (startedAt – endedAt)
- "Tap to view details" hint (no catch count — the Trip schema has no `catchCount` field and catches are fetched lazily on expand)

Expanded view shows:
- Full checklist state (checkmark per item)
- Catch log table (species, kg, price/kg, notes)
- If no catches: "No catches logged" empty state

Catches are fetched lazily on expand.

---

## 4. Error Handling

| Scenario | Handling |
|---|---|
| Initial load failure | Inline error banner at top of MyTrips with Retry button (matches existing `db-error` pattern) |
| Mutation failure | Error message shown inside the form/modal that triggered it; modal stays open for retry |
| History lazy-load failure | Error text inside expanded card with a small retry link |
| 409 conflicts | Surface the server's `ErrorResponse.message` field directly — no special-casing |

**Loading states:** `Skeleton` components (matching existing pattern) during initial load. Buttons show disabled/spinner state during in-flight mutations to prevent double-submit.

---

## 5. Testing

No automated test infrastructure is introduced (none exists for the frontend). Manual verification checkpoints:

### Happy Path
1. No active trip → empty state → Start Trip modal → submit → active trip card appears
2. Active trip → expand checklist → check all boxes → Save → timestamp appears
3. Active trip → expand catch logs → Add Catch → species search filters → submit → catch appears
4. Active trip → End Trip → confirm with notes → moves to History tab
5. History tab → expand card → checklist checkmarks and catch table render

### Edge Cases
- Start Trip with missing required fields shows client-side validation error
- Add Catch with quantity ≤ 0 rejected client-side before submit
- History expand with no catches shows "No catches logged" empty state
- API error during start trip keeps modal open with error message visible
