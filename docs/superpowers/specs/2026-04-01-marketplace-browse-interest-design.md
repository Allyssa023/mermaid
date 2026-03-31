# Marketplace Browse & Express Interest — Design Spec

**Date:** 2026-04-01
**Scope:** Sub-project 1 of 3 (Browse + Interest). Chat (WebSockets) is a separate future spec.
**Persona:** Isidro (fisherman) browsing vendor demand listings to find where to sell his catch.

---

## 1. Overview

Add a functional Marketplace page to the fisherman dashboard. Isidro can:
- Browse active demand listings from La Union vendors with filters (species, location, price range)
- Expand a listing row to see vendor notes
- Express interest in a listing by sending a short message ("I can bring 40kg by tomorrow morning")
- View his submitted interests in a separate tab

The "I'm Interested" submission creates a `ListingInterest` record and opens the door for a future chat thread (built in a separate spec).

---

## 2. Frontend

### 2.1 Routing

`FishermanDashboard.jsx` — extend the `activeNav` switch:

```jsx
{activeNav === 'trips'  ? <MyTrips token={token} /> :
 activeNav === 'market' ? <Marketplace token={token} /> :
 /* marine conditions dashboard */}
```

### 2.2 New file: `frontend/src/Marketplace.jsx`

**Components:**

| Component | Responsibility |
|-----------|---------------|
| `Marketplace` (root) | Parallel-fetches listings, species, locations, and my-interests on mount. Owns tab, filter, and interested-set state. |
| `MarketplaceTabs` | "Browse" / "My Interests" tabs. My Interests tab shows a count badge when non-zero. Same visual pattern as `TripTabs`. |
| `FilterBar` | Species dropdown, location dropdown, price range (min/max inputs), Clear button, results count label. Filtering is client-side on the already-fetched array. |
| `ListingRow` | Expandable row. Collapsed: species, vendor name, location, price/kg, quantity, needed-by, "I'm Interested" button. Expanded: vendor notes + sent-message (if already interested). |
| `InterestModal` | Modal with a textarea (1–500 chars) and "Send Interest" button. Appears when "I'm Interested" is clicked on a non-interested row. |
| `MyInterestsTab` | Renders the fisherman's expressed interests using the same data fetched on mount. Rows show species, vendor, location, price, message snippet, posted date. |

### 2.3 Page layout

```
trips-page-header
  Title: "Marketplace"
  Subtitle: "Demand listings from La Union vendors"

MarketplaceTabs
  [Browse]  [My Interests (3)]

--- Browse tab ---
FilterBar
  [All Species ▾]  [All Locations ▾]  [₱ Min – Max]  [Clear]  "12 listings"

Column headers
  Species · Vendor | Location | Price/kg | Quantity | Needed By | (action)

ListingRows (expandable)
  ▸ Collapsed: summary row + "I'm Interested" / "✓ Interested" button
  ▾ Expanded:  vendor notes + (if interested) sent message

--- My Interests tab ---
Rows: species, vendor, location, price, message snippet, sent date
Empty state: anchor icon + "No interests yet"
```

### 2.4 Listing row states

| State | Button appearance |
|-------|------------------|
| Not interested | Teal "I'm Interested" button |
| Already interested | Green "✓ Interested" chip (disabled) |
| Listing closed | "Closed" grey chip (no button) |

### 2.5 Interest flow (optimistic)

1. Fisherman clicks "I'm Interested" → `InterestModal` opens
2. He writes a message → clicks "Send Interest"
3. Frontend immediately adds `listingId` to the interested `Set` (optimistic update)
4. `POST /marketplace/listings/{listingId}/interest` is called
5. On success: toast "Interest sent!", modal closes, My Interests count increments
6. On failure: rollback optimistic update, show inline error in modal, keep modal open

---

## 3. Backend

### 3.1 New Flyway migration: `V11__listing_interests.sql`

```sql
CREATE TABLE listing_interests (
  id              BIGSERIAL PRIMARY KEY,
  listing_id      BIGINT NOT NULL REFERENCES demand_listings(id),
  fisherman_id    BIGINT NOT NULL REFERENCES users(id),
  message         VARCHAR(500) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_listing_fisherman UNIQUE (listing_id, fisherman_id)
);

CREATE INDEX idx_listing_interests_fisherman ON listing_interests(fisherman_id);
CREATE INDEX idx_listing_interests_listing   ON listing_interests(listing_id);
```

### 3.2 New API endpoints in `api.yaml`

**`POST /marketplace/listings/{listingId}/interest`**
- Auth: `ROLE_FISHERMAN`
- Body: `ListingInterestRequest { message: string, minLength: 1, maxLength: 500 }`
- Response 201: `ListingInterest { id, listingId, fishermanId, fishermanName, message, createdAt }`
- Response 404: listing not found
- Response 409: already interested OR listing is not OPEN (`ListingClosedException`)

**`GET /marketplace/my-interests`**
- Auth: `ROLE_FISHERMAN`
- Response 200: `ListingInterestDetail[]`

```
ListingInterestDetail {
  id, message, createdAt,
  listing: {
    id, fishSpecies, marketLocation,
    quantityKg, offerPricePerKg,
    vendorName, neededBy, status
  }
}
```

### 3.3 Backend layer

Follows the existing Service–Repository–Mapper triad pattern:

| Layer | Class |
|-------|-------|
| Entity | `ListingInterest` (`@Entity`, soft-delete not applicable — hard deletes are fine here) |
| Repository | `ListingInterestRepository extends JpaRepository<ListingInterest, Long>` |
| Service | `ListingInterestService` — `express(listingId, fishermanId, message)`, `myInterests(fishermanId)` |
| Mapper | `ListingInterestMapper` — entity ↔ generated DTO |
| Controller | `MarketplaceInterestController implements MarketplaceApi` (generated) |

**`express()` logic:**
1. Load listing by id — throw `ResourceNotFoundException` if absent
2. Check `listing.status == OPEN` — throw `ListingClosedException` if not
3. Check no existing interest for `(listingId, fishermanId)` — throw `DuplicateInterestException` (→ 409) if found
4. Save and return

**Exception mapping** (add to `GlobalExceptionHandler`):
- `DuplicateInterestException` → 409

---

## 4. Data Flow

```
Mount
  ├─ GET /marketplace/listings          → listings[]
  ├─ GET /lookups/fish-species          → species[]
  ├─ GET /lookups/market-locations      → locations[]
  └─ GET /marketplace/my-interests      → myInterests[]
                                          → build interestedSet (Set of listingIds)

Filter change (client-side, no refetch)
  listings.filter(species, location, price)

Express interest
  POST /marketplace/listings/{id}/interest { message }
  → optimistic: add to interestedSet
  → success: toast, update myInterests list
  → failure: rollback interestedSet, show modal error
```

---

## 5. Error Handling

| Scenario | UX |
|----------|-----|
| Network error on load | Error banner with Retry button |
| No listings match filters | "No listings match your filters" empty state + Clear Filters link |
| Duplicate interest (409) | Modal inline error: "You've already expressed interest in this listing" |
| Listing closed (409) | Row button replaced with "Closed" chip; modal shows "This listing is no longer accepting interest" |
| Message too short | Client-side validation before submit |
| `neededBy` = today | Deadline shown in red "Today" |
| `neededBy` = past | Shown in red "Overdue" |
| No interests yet | Anchor icon + "No interests yet. Browse listings to find buyers." |

---

## 6. Out of Scope (future spec)

- Chat / WebSocket messaging between fisherman and vendor
- Vendor-side view of received interests
- Withdrawing / cancelling an expressed interest
- Push notifications for new interests
