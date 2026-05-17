# Listing Detail Page & Freshness Photos Design

**Date:** 2026-05-17
**Status:** Approved
**Scope:** Buyer listing detail page + vendor freshness photo upload + streamlined listing creation flow

---

## Overview

Three linked changes:

1. **Buyer listing detail** — clicking a marketplace card navigates to a full detail page showing species info, vendor profile, freshness photos, and order actions.
2. **Vendor freshness photos** — vendors upload 5 labeled freshness-check photos (Eyes, Gills, Scales, Belly, Flesh) as part of listing creation. All 5 are required before a listing goes live.
3. **Streamlined creation flow** — the DRAFT → Publish two-step is eliminated. "List for sale" creates and publishes in one step. Vendors can still unpublish and re-publish existing listings.

---

## Feature 1: Buyer Listing Detail Page

### Routing

`BuyerDashboard` adds a `listingId` state alongside the existing `buyNow` state:

```jsx
const [listingId, setListingId] = useState(null)
```

`renderPage` is updated to pass both `setListingId` and `listingId`:

```jsx
case 'bbrowse':  return <Marketplace setPage={setPage} setBuyNow={setBuyNow} setListingId={setListingId} />
case 'blisting': return <ListingDetail setPage={setPage} listingId={listingId} setBuyNow={setBuyNow} />
```

`Marketplace.jsx` receives `setListingId` as a new prop. Clicking a card calls:

```js
setListingId(l.id)
setPage('blisting')
```

`PAGE_LABELS` in `BuyerDashboard` already has `blisting: 'Listing detail'` — no change needed there.

### Data

On mount, `ListingDetail` calls `fetchListingDetail(listingId)` → `GET /buyer/marketplace/listings/{id}`.
Response shape (already defined in api.yaml): `{ listing: StorefrontListingSummary, vendor: BuyerVendorProfile, relatedListings: StorefrontListingSummary[] }`.
`listing.availableKg` is effective (subtracts active orders) — no secondary stock call needed.
`ListingDetail.jsx` is rewritten from scratch; the current file uses only mock data.

### Dispatch mode display

`StorefrontListingSummary` has no `dispatchMode` field. On the detail page, dispatch info is derived from `deliveryFee`:
- `deliveryFee > 0` → show "Delivery available · ₱{deliveryFee} fee"
- `deliveryFee === 0` → show "Pickup only · Free"

No new API field required.

### "View storefront" link

The vendor profile card on the detail page includes a "View storefront" button. `BuyerDashboard` already has a `bvendor` page. The button calls `setPage('bvendor')` — the existing `bvendor` page is out of scope for this feature (it still uses mock data); this is a placeholder link for now.

### Layout

Two-column on desktop (CSS grid `grid--2-1`), single-column on mobile.

**Left column:**
- Large cover photo (full-width in column, `height: 360px`, `object-fit: cover`; fallback: species-initial placeholder matching existing marketplace card style)
- Freshness photo grid below (2-column CSS grid, 3 rows for 5 slots)
  - Each slot: label + hint text + thumbnail if URL present; neutral grey placeholder if `null`
  - Slots in order: Eyes, Gills, Scales, Belly, Flesh
  - 5th slot: `grid-column: 1 / -1` (spans full width, centered, capped at 50% width)

**Right column:**
- `eyebrow`: vendor name
- `h1`: species name (from `listing.speciesName`)
- Listing title (subtitle, muted)
- Price display: large `₱{pricePerKg}` + `/kg`
- Available kg chip (`chip--safe` if > 0)
- Dispatch info (derived from `deliveryFee` as above)
- Description paragraph
- Min order note if `minQtyKg` is set
- "Add to cart" button → opens `AddToCartModal` (see shared component below)
- "Order now" button → `setBuyNow({ listing }); setPage('bcheckout')`

**Below both columns:**
- Vendor profile card: avatar initial, full name, rating if available, "View storefront" button → `setPage('bvendor')`
- Related listings strip: horizontal flex scroll, up to 4 cards (same `buyer-card` component style used in marketplace grid), each clicking → `setListingId(r.id)` (stays on `blisting`, re-fetches)

**Back navigation:** "← Back to marketplace" button at page top → `setPage('bbrowse')`.

### AddToCartModal (new shared component)

Extracted to `src/components/modals/AddToCartModal.jsx`. Props: `{ listing, onClose }`.

Internally:
- On mount, fires `fetchListingDetail(listing.id)` for a fresh stock check (separate from the detail page fetch — listing data could be stale by the time the buyer clicks)
- Shows "checking stock…" while fetching; disables submit and input
- Populates qty input with `max={freshStock.availableKg}` and `min={freshStock.minQtyKg ?? 0.1}`
- Client-side validation before calling `addItem`: qty > 0; qty ≥ minQtyKg (if set); qty ≤ availableKg
- Errors surface inline; on success closes modal and invalidates cart

`Marketplace.jsx` replaces its inline modal implementation with `<AddToCartModal>`.
`ListingDetail.jsx` uses `<AddToCartModal>` for its "Add to cart" button.

---

## Feature 2: Vendor Freshness Photos

### Database

Migration `V63__add_freshness_photo_columns.sql`:

```sql
ALTER TABLE storefront_listings
  ADD COLUMN photo_eyes   VARCHAR(512),
  ADD COLUMN photo_gills  VARCHAR(512),
  ADD COLUMN photo_scales VARCHAR(512),
  ADD COLUMN photo_belly  VARCHAR(512),
  ADD COLUMN photo_flesh  VARCHAR(512);
```

All 5 columns are nullable (the DB constraint is loose; the service layer enforces the "all required" rule).

### Backend

**`StorefrontListing.java`** — 5 new fields (`photoEyes`, `photoGills`, `photoScales`, `photoBelly`, `photoFlesh`) with standard getters/setters and `@Column` annotations matching the migration column names.

**`api.yaml` — three schemas to update:**

1. `StorefrontListingSummary` (buyer read path — marketplace browse + detail):
   Add 5 nullable string fields: `photoEyes`, `photoGills`, `photoScales`, `photoBelly`, `photoFlesh`.

2. `StorefrontListingResponse` (vendor read path — storefront editor):
   Add the same 5 nullable string fields so the edit modal can pre-populate them.

3. `CreateStorefrontListingRequest`:
   Add the same 5 fields as **required** (non-nullable, minLength: 1) so the API enforces they are provided at creation time.

4. `UpdateStorefrontListingRequest`:
   Add the same 5 fields as nullable strings (optional update — vendor can change individual photos in the editor without re-uploading all 5).

Run `./mvnw generate-sources` after api.yaml changes.

**`StorefrontListingMapper`** — update all mapping methods:
- `toBuyerSummary` (used by marketplace list + detail): map all 5 fields from entity → DTO
- `toDto` (used by vendor storefront endpoints, returns `StorefrontListingResponse`): map all 5 fields from entity → DTO so the edit modal receives existing values

**`StorefrontListingService.create()`** — updated:
1. Validate all 5 freshness URLs are non-null and non-blank; if any missing throw `IllegalStateException("All 5 freshness photos are required before publishing")` — maps to HTTP 409 via `GlobalExceptionHandler`
2. Map the 5 fields from the request onto the draft entity
3. Set `status = PUBLISHED` directly (no longer `DRAFT`)
4. Keep existing lot stock validation

**`StorefrontListingService.publish()`** — kept for the re-publish path. Add the same freshness photo validation before allowing re-publish (throw `IllegalStateException` if any of the 5 are missing on the existing entity).

**`StorefrontListingService.update()`** — map the 5 new fields from patch if non-null.

**Validation note:** The `CreateStorefrontListingRequest` has the 5 fields marked required in api.yaml (minLength: 1), so OpenAPI bean validation will reject requests missing them at the controller layer before reaching the service. The service-level check in `create()` is a defense-in-depth fallback.

### Vendor UI — ListForSaleModal (Inventory.jsx)

The `ListForSaleModal` expands to include freshness photo slots:

- Modal container: `maxHeight: '85vh'`, `overflowY: 'auto'`, sticky `modal__foot` footer
- Below the existing cover photo row: a **"Freshness photos — all 5 required"** section header
- 2-column CSS grid containing 5 upload slots

**Each slot:**
- Label (bold) + hint text (muted, 11px) below
- If URL present: thumbnail `80×80px` + "Change" button
- If no URL: dashed-border placeholder + "Upload" button
- Upload/Change button triggers `fileRef.current.click()` after setting `currentSlot` state

**Shared file input pattern:**
- Single `<input type="file" ref={fileRef}>` element at the bottom of the modal (display none)
- `currentSlot` state: `null | 'eyes' | 'gills' | 'scales' | 'belly' | 'flesh'`
- To trigger upload for a slot: **set `currentSlot` first**, then call `fileRef.current.click()`
- In `onChange`: read `currentSlot` from state to know which URL field to update; reset `fileRef.current.value = ''` after upload
- If the picker is dismissed without selecting a file, `onChange` does not fire — `currentSlot` remains set but harmlessly stale until the next click

**State fields added:** `photoEyes`, `photoGills`, `photoScales`, `photoBelly`, `photoFlesh` (all `useState(null)`)

**`submit()` validation additions:**
- Check all 5 are non-null; if any missing: `setError('Please upload all 5 freshness photos')` and return

**`onSubmit` body additions:** pass `photoEyes`, `photoGills`, `photoScales`, `photoBelly`, `photoFlesh` alongside existing fields.

**Hint text per slot:**
- Eyes — "Clear, bright pupils"
- Gills — "Bright red, not brown"
- Scales — "Shiny, tight to skin"
- Belly — "Firm, not swollen"
- Flesh — "Pink/white, no discoloration"

### Vendor UI — StorefrontEditor.jsx

**Removed:**
- `publishMut` mutation and `publishListing` import
- "Publish" button per row (DRAFT → PUBLISHED path no longer exists)
- `DRAFT` entry from `statusChip` map

**Updated table row actions:** Edit | Unpublish (if PUBLISHED or SOLD_OUT) | Re-publish (if UNPUBLISHED) | Delete
- "Re-publish" calls `publishListing` (the existing API endpoint) — the import is kept for this purpose
- "Unpublish" calls `unpublishListing` — unchanged

**Edit modal additions:**
- Same 5 freshness photo slots as `ListForSaleModal`, using the same shared file input pattern
- `openModal(l)` pre-populates `form` with `photoEyes: l.photoEyes`, etc. (available because `StorefrontListingResponse` now includes these fields)
- `handleSave` sends the 5 URLs alongside existing fields
- No freshness-completeness check in the edit save path — vendor can save a partial edit; the re-publish endpoint enforces completeness

### Buyer UI — freshness section in ListingDetail.jsx

Display-only. 5 slots rendered from `listing.photoEyes` etc.:
- Slot with URL: label + `<img>` thumbnail (full slot width, `aspect-ratio: 4/3`, `object-fit: cover`)
- Slot without URL: label + grey placeholder div with "Not provided" text in muted style
- No upload controls

---

## Data Flow Summary

```
Vendor clicks "List for sale" (Inventory page)
  → ListForSaleModal: fill title / price / cover photo / 5 freshness slots
  → createListing() POST /vendor/storefront/listings
  → bean validation rejects if any freshness field missing (400)
  → StorefrontListingService.create(): service-level check → save as PUBLISHED
  → listing appears in marketplace immediately

Buyer browses marketplace
  → clicks card → setListingId(id); setPage('blisting')
  → ListingDetail mounts → fetchListingDetail(id)
  → renders: cover photo, freshness grid, price/info, Add to cart / Order now

Buyer clicks "Add to cart"
  → AddToCartModal mounts → fresh fetchListingDetail(id) for current stock
  → validates qty → addItem() → CartContext updates
```

---

## What Is Not Changing

- `uploadListingPhoto` API call and file upload endpoint (`POST /uploads?subDir=listings`) — reused for all 6 photos per listing
- Cart, checkout, and order flows — unchanged
- `StorefrontListingService.unpublish()` — unchanged
- `bvendor` page (vendor storefront) — remains on mock data, out of scope
- The `SOLD_OUT` status — still auto-set by the backend when effective stock hits 0
