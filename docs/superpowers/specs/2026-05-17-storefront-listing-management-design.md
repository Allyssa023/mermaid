# Storefront Listing Management Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix and complete the vendor storefront listing flow — full CRUD with required photo upload on create, available-kg display, duplicate lot prevention, and management-only Storefront page.

**Architecture:** Storefront page becomes management-only (no create); creation always flows from Inventory → "List for sale" modal with required photo upload. Backend adds a separate update schema (no lot re-assignment on edit), adds a duplicate lot guard on create, and the Storefront controller is updated to wire the new schema. `availableKg` is already computed and returned by the existing mapper — no backend schema change needed there. Duplicate lot enforcement lives in both backend (409) and frontend (visual guard).

**Tech Stack:** Spring Boot (Java), OpenAPI-first (api.yaml), React/Vite, TanStack Query, existing `apiUpload` helper, existing `POST /api/uploads` endpoint.

---

## 1. Backend Changes

### 1.1 New `StorefrontListingUpdateRequest` schema + wire into PUT endpoint

Add to `api.yaml` alongside the existing `StorefrontListingRequest`:

```yaml
StorefrontListingUpdateRequest:
  type: object
  required: [title, pricePerKg]
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
    description:
      type: string
      nullable: true
      maxLength: 2000
    photoUrl:
      type: string
      nullable: true
      maxLength: 500
    pricePerKg:
      type: number
      format: double
      minimum: 0
    minQtyKg:
      type: number
      format: double
      minimum: 0.1
      default: 0.5
```

`speciesId` and `lotIds` are intentionally absent — lots are locked at creation.

Wire `PUT /vendor/storefront/listings/{listingId}` to use `StorefrontListingUpdateRequest` instead of `StorefrontListingRequest`. Also add a `409` response entry to the PUT path in `api.yaml` (consistent with the `GlobalExceptionHandler` contract).

After changing `api.yaml`, run `./mvnw generate-sources` to regenerate the `VendorStorefrontApi` interface and the new `StorefrontListingUpdateRequest` DTO.

In `VendorStorefrontController`:
- Add a new `fromUpdateRequest(StorefrontListingUpdateRequest req)` helper that maps only `title`, `pricePerKg`, `minQtyKg`, `description`, `photoUrl` onto a `StorefrontListing` patch object.
- Update `vendorUpdateStorefrontListing()` to use `fromUpdateRequest(request)` and pass `null` for `lotIds` to `service.update()` — the service already skips lot re-linking when `lotIds` is null or empty.
- Keep the existing `fromRequest(StorefrontListingRequest req)` helper for the create path.

### 1.2 Duplicate lot guard on create

`availableKg` is already computed and returned by `StorefrontListingMapper.toDto()` (line 52) — no schema change needed.

Add a duplicate lot guard in `StorefrontListingService.create()` via a new repository method. In `StorefrontListingLotRepository`, add:

```java
@Query("SELECT COUNT(sll) > 0 FROM StorefrontListingLot sll " +
       "JOIN StorefrontListing sl ON sll.id.listingId = sl.id " +
       "WHERE sll.id.lotId = :lotId AND sl.isDeleted = false")
boolean existsByLotIdInActiveListing(@Param("lotId") Long lotId);
```

Note: `StorefrontListingLot` uses a composite `@EmbeddedId` of type `StorefrontListingLot.Id`. The correct JPQL path for the embedded fields is `sll.id.listingId` and `sll.id.lotId` — NOT `sll.listingId` / `sll.lotId`.

In `StorefrontListingService.validateLots()`, after the existing ownership/stock checks for each `lotId`, add:

```java
if (listingLotRepo.existsByLotIdInActiveListing(lotId)) {
    throw new IllegalStateException("Lot " + lotId + " is already assigned to an existing listing");
}
```

This throws `IllegalStateException` → `GlobalExceptionHandler` maps it to `409 ILLEGAL_STATE`.

---

## 2. Frontend — `StorefrontEditor.jsx` (management-only)

### 2.1 Remove create path

- Remove the "New listing" `<button>` from the page header.
- Remove `createMut` and the `createListing` import.
- `handleSave` becomes update-only: explicitly build the body as `{ id: form.id, title: form.title, pricePerKg: Number(form.pricePerKg), minQtyKg: Number(form.minQtyKg), description: form.description ?? null, photoUrl: form.photoUrl ?? null }` — do NOT spread the entire `form` object (it contains stale fields like `speciesName` from the old broken form).
- The existing **update** branch of `handleSave` (line 34 in the current file) also passes `speciesName: form.speciesName` — this field does not exist on `StorefrontListingUpdateRequest` and must be removed at the same time.
- Update empty state: *"No listings yet. Head to your Inventory tab to list a lot for sale."*

### 2.2 Table columns

| Column | Change |
|--------|--------|
| Title | unchanged |
| Species | unchanged |
| Price/kg | unchanged |
| Min qty | unchanged |
| **Lots** | **Remove** |
| **Available** | **Add** — shows `l.availableKg` from response (e.g. `12.5 kg`); `availableKg` is already returned by the backend |
| Status | unchanged |
| Actions | Add Delete; keep Edit and Publish/Unpublish |

### 2.3 Edit modal — fixed fields + photo

Replace the broken form fields with:
- **Title** (text input, required)
- **Price per kg ₱** (numeric input, required)
- **Min order qty kg** (numeric input)
- **Description** (textarea, optional)
- **Photo** — if `form.photoUrl` is set, show `<img>` thumbnail (80×80) with a "Change photo" button that clears `photoUrl` and shows the file picker; if no photo, show the file-picker upload widget (same upload flow as Section 3.2 below).

### 2.4 Delete with confirm

Each row gets a "Delete" ghost-danger button. Clicking sets a `deleteConfirmId` state. While `deleteConfirmId === l.id`, replace the row's action area with an inline confirmation: *"Delete this listing?"* and **Confirm** / **Cancel** buttons. Confirming calls `deleteListing(id)` (the `_deleteMut` already defined in the component but never wired to the UI) then invalidates `['vendor', 'storefront']`.

---

## 3. Frontend — `Inventory.jsx` "List for sale" modal

### 3.1 Duplicate guard (visual)

On mount, `Inventory.jsx` fetches the vendor's listings using query key `['vendor', 'storefront']` (same key as `StorefrontEditor` — TanStack Query deduplicates the network call if both pages are mounted, and the cache is shared). It computes a `Set<number>` of lot IDs that appear in any listing's `lotIds` array. `StorefrontListingResponse` already includes `lotIds: array of integer` (confirmed in `api.yaml` line 6542) — no schema change needed for this guard to work.

Lots whose `id` is in this set:
- Show a "Listed" chip and no "List for sale" button.

The backend 409 guard remains the authoritative safety net for race conditions.

### 3.2 Photo upload — required, inline in modal

The modal gains a photo section at the top:

```
[ Drag & drop or click to select ]
Accepted: JPEG, PNG, WebP · Max 5 MB
```

Behaviour:
1. User selects a file → frontend validates type (`image/jpeg`, `image/png`, `image/webp`) and size (≤ 5 MB) client-side. Show inline error and reject if invalid.
2. On valid selection, immediately calls `uploadListingPhoto(file)` (see Section 3.3).
3. During upload: show spinner in the preview area; disable **Create listing** button.
4. On success: show preview thumbnail; store returned `url` in `photoUrl` state.
5. On failure: show inline error ("Upload failed — try again") with a retry button; keep form open.
6. **Create listing** button stays disabled until `photoUrl` is set.

### 3.3 Form fields (same modal, below photo)

| Field | Pre-fill | Required |
|-------|----------|----------|
| Title | `{speciesName} – Lot #{id}` | Yes |
| Selling price / kg (₱) | `costPerKg` | Yes |
| Cost basis note | shown below price field as `"Cost: ₱{costPerKg}/kg"` | display only |
| Min order qty (kg) | `0.5` | No |
| Description | empty | No |

On submit: `createListing({ speciesId: lot.speciesId, title, pricePerKg: Number(price), minQtyKg: Number(minQty), description: description || null, photoUrl, lotIds: [lot.id] })`.

### 3.4 New API helpers

In `vendor/api/storefront.js`, add:

```js
import { apiUpload } from '../../api'

// subDir passed as URL query param so Spring's @RequestParam binds it from the query string
export const uploadListingPhoto = (file) =>
  apiUpload('/uploads?subDir=listings', file)
```

`apiUpload` in `api.js` already exists and handles `FormData` — no changes to `api.js` needed. Passing `subDir` as a URL query param (not a form field) avoids any ambiguity in Spring's `@RequestParam` resolution for multipart requests.

---

## 4. Files Touched

| File | Action |
|------|--------|
| `backend/src/main/resources/openapi/api.yaml` | Add `StorefrontListingUpdateRequest`; wire PUT to new schema; add 409 response to PUT path |
| `backend/src/main/java/com/mermaid/app/repository/StorefrontListingLotRepository.java` | Add `existsByLotIdInActiveListing(@Param("lotId") Long lotId)` JPQL query method |
| `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java` | Add duplicate lot check in `validateLots()` |
| `backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java` | Add `fromUpdateRequest()` helper; update `vendorUpdateStorefrontListing()` to use it and pass `null` for lotIds |
| `frontend/src/vendor/StorefrontEditor.jsx` | Remove create path; fix edit modal (correct fields + photo upload); add delete confirm; add Available column; remove Lots column |
| `frontend/src/vendor/Inventory.jsx` | Add listings query for duplicate guard; add photo upload to modal; add description field |
| `frontend/src/vendor/api/storefront.js` | Add `uploadListingPhoto` helper; import `apiUpload` from `../../api` |

---

## 5. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Lot already listed (backend 409) | Show error in modal: "This lot is already part of an active listing" |
| Photo wrong type / too large (client) | Block file selection, show inline: "File must be JPEG, PNG, or WebP under 5 MB" |
| Photo upload fails (server) | Show inline error with retry; keep form open; Create button stays disabled |
| Network error on create/update | Show error in modal footer; form stays open |

---

## 6. Out of Scope

- Changing which lots back an existing listing (lots locked at creation)
- Bulk listing operations
- Buyer-facing photo display changes (buyer marketplace already consumes `photoUrl` from `StorefrontListingSummary`)
- Full photo management / gallery (single photo per listing only)
- i18n (project has no i18n layer)
