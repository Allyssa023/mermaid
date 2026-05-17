# Listing Detail Page & Freshness Photos Design

**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** Buyer listing detail page + vendor freshness photo upload + streamlined listing creation flow

---

## Overview

Two linked features:

1. **Buyer listing detail** — clicking a marketplace card navigates to a full detail page showing species info, vendor profile, freshness photos, and order actions.
2. **Vendor freshness photos** — vendors upload 5 labeled freshness-check photos (Eyes, Gills, Scales, Belly, Flesh) as part of listing creation. All 5 are required before a listing can go live.
3. **Streamlined creation flow** — the DRAFT → Publish two-step is eliminated. "List for sale" creates and publishes in one step.

---

## Feature 1: Buyer Listing Detail Page

### Routing

`BuyerDashboard` adds a `listingId` state alongside the existing `buyNow` state. `Marketplace.jsx` receives a `setListingId` prop. Clicking a listing card calls:

```js
setListingId(l.id)
setPage('blisting')
```

`renderPage` passes `listingId` to `ListingDetail`. `ListingDetail.jsx` is rewritten from scratch — the current file uses only mock data.

### Data

On mount, fetch `fetchListingDetail(listingId)` → `GET /buyer/marketplace/listings/{id}`.  
Response shape: `{ listing, vendor, relatedListings }`.  
`listing.availableKg` is already effective (subtracts active orders) after the earlier backend fix — no secondary stock call needed.

### Layout

Two-column on desktop, single-column on mobile:

**Left column:**
- Large cover photo (full-width in the column, 360px tall)
- Freshness photo grid below (2×3 grid for 5 labeled slots)
  - Each slot shows: label + thumbnail if uploaded, or a neutral "Not provided" placeholder
  - Slots: Eyes, Gills, Scales, Belly, Flesh

**Right column:**
- Species name (h1), vendor name chip, listing title
- Price (large display), available kg chip, delivery fee line
- Description paragraph
- Dispatch mode info (Pickup / Delivery)
- "Add to cart" button → opens `AddToCartModal`
- "Order now" button → `setBuyNow({ listing }); setPage('bcheckout')`

**Below both columns:**
- Vendor profile card: avatar, full name, rating, trade count, "View storefront" link
- Related listings horizontal strip (up to 4 cards, each clickable → navigates to their detail page)

**Back navigation:** "← Back to marketplace" button at top → `setPage('bbrowse')`.

### AddToCartModal (shared component)

The add-to-cart logic currently embedded in `Marketplace.jsx` is extracted to `src/components/modals/AddToCartModal.jsx`. It accepts `{ listing, onClose }` as props and internally handles:
- Fresh stock fetch on mount via `fetchListingDetail(listing.id)`
- Qty input with live `max` and `min` from fresh stock
- Client-side validation (qty > 0, qty ≥ minQtyKg, qty ≤ availableKg)
- Calls `addItem` from `CartContext`; errors surface inline

`Marketplace.jsx` and `ListingDetail.jsx` both use this component.  
`ListingDetail` passes the already-fetched listing — `AddToCartModal` still fires its own fresh stock check on mount (listing data could be seconds old by the time the buyer clicks "Add to cart").

---

## Feature 2: Vendor Freshness Photos

### Database

One Flyway migration adds 5 nullable columns to `storefront_listings`:

```sql
ALTER TABLE storefront_listings
  ADD COLUMN photo_eyes   VARCHAR(512),
  ADD COLUMN photo_gills  VARCHAR(512),
  ADD COLUMN photo_scales VARCHAR(512),
  ADD COLUMN photo_belly  VARCHAR(512),
  ADD COLUMN photo_flesh  VARCHAR(512);
```

### Backend

**`StorefrontListing.java`** — 5 new fields with standard getters/setters.

**`api.yaml`** — add the 5 fields as nullable strings to:
- `StorefrontListingSummary` (read path — buyers see them on the detail page)
- `CreateStorefrontListingRequest` (write path — vendors set them on creation)
- `UpdateStorefrontListingRequest` (write path — vendors can update them in the editor)

Run `./mvnw generate-sources` after schema changes.

**`StorefrontListingMapper` / `toBuyerSummary`** — map the 5 new fields into the DTO.

**`StorefrontListingService.create()`** — updated to:
1. Validate all 5 freshness photo URLs are non-null and non-blank → throw `IllegalStateException("All 5 freshness photos are required")` if any missing
2. Set status to `PUBLISHED` directly (no longer `DRAFT`)
3. Keep existing lot stock validation (lot must have `remainingKg > 0`)

**`StorefrontListingService.publish()`** — kept for the re-publish path (vendor unpublishes then re-publishes). Adds freshness photo validation before allowing re-publish.

**`StorefrontListingService.update()`** — maps the 5 new fields from patch if provided.

### Vendor UI — ListForSaleModal (Inventory.jsx)

The `ListForSaleModal` expands to include freshness photo upload slots. Changes:

- Modal gets `maxHeight: '85vh'` with `overflowY: 'auto'` and a sticky footer
- Below the cover photo section, a new **"Freshness photos (all required)"** section with a 2-column grid of 5 upload slots
- Each slot shows: label + freshness hint text + thumbnail or dashed empty state + Upload button
- A single hidden `<input type="file" ref={fileRef}>` is shared; a `currentSlot` state string (`'eyes' | 'gills' | 'scales' | 'belly' | 'flesh'`) tracks which slot triggered the picker
- On file select: upload via `uploadListingPhoto(file)` → store URL in the corresponding form state key
- `submit()` validates all 5 slots are filled before calling `createListing()`
- Submit button label: "List for sale" (no change)

Freshness hint text per slot:
- **Eyes** — "Clear, bright pupils"
- **Gills** — "Bright red, not brown"
- **Scales** — "Shiny, tight to skin"
- **Belly** — "Firm, not swollen"
- **Flesh** — "Pink/white, no discoloration"

### Vendor UI — StorefrontEditor.jsx

**Removed:**
- `publishMut` mutation and `publishListing` import
- "Publish" button per row (DRAFT → PUBLISHED path no longer exists in the UI)
- DRAFT status chip and `DRAFT` from `statusChip` map

**Updated:**
- Table row actions: Edit | Unpublish (if PUBLISHED) | Re-publish (if UNPUBLISHED) | Delete
- Edit modal gains the same 5 freshness photo slots as `ListForSaleModal` (shares the same upload pattern)
- `handleSave` sends the 5 freshness URLs alongside existing fields

### Buyer UI — ListingDetail.jsx (freshness section)

Freshness photo grid (display only):
- 5 slots in a 2×3 grid (5th slot spans or is alone in the last row)
- Each slot: label at top, thumbnail image if available, neutral grey placeholder with label if `null`
- No upload controls — read-only

---

## Data Flow Summary

```
Vendor clicks "List for sale" (Inventory)
  → ListForSaleModal: fill title/price/photos/5 freshness slots
  → createListing() POST /vendor/storefront/listings
  → StorefrontListingService.create(): validate 5 photos + stock → save as PUBLISHED
  → Listing appears in marketplace immediately

Buyer browses marketplace
  → clicks card → setListingId(id); setPage('blisting')
  → ListingDetail mounts → fetchListingDetail(id)
  → renders cover + freshness grid + order actions

Buyer clicks "Add to cart"
  → AddToCartModal mounts → fresh stock fetch
  → validates qty → addItem() → CartContext updates
```

---

## What Is Not Changing

- The `uploadListingPhoto` API call and file upload endpoint (`POST /uploads?subDir=listings`) — reused as-is for all 6 photos (cover + 5 freshness)
- Cart, checkout, and order flows — unchanged
- Existing `StorefrontListingSummary` fields — all preserved, 5 new fields added
- `StorefrontListingService.unpublish()` — unchanged
