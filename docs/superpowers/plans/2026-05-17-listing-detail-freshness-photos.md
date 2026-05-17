# Listing Detail & Freshness Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a buyer listing detail page with freshness photo display, and require vendors to upload 5 labeled freshness photos (Eyes, Gills, Scales, Belly, Flesh) when listing a lot for sale — all in one publish step (no more DRAFT state).

**Architecture:** Backend-first — DB migration → api.yaml schema changes → codegen → service/mapper updates → frontend. Frontend splits into: shared `AddToCartModal` component, rewritten `ListingDetail` page, expanded `ListForSaleModal` in Inventory, and updated `StorefrontEditor`.

**Tech Stack:** Spring Boot (Java 21), OpenAPI codegen (openapi-generator-maven-plugin v7.20.0), React 18 + Vite, TanStack Query v5, PostgreSQL + Flyway.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/src/main/resources/db/migration/V63__add_freshness_photo_columns.sql` | Create | Add 5 freshness photo columns to `storefront_listings` |
| `backend/src/main/resources/openapi/api.yaml` | Modify | Add 5 freshness fields to 4 schemas |
| `backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java` | Modify | 5 new fields + getters/setters |
| `backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java` | Modify | Map 5 new fields in `toDto` and `toBuyerSummary` |
| `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java` | Modify | `create()` → PUBLISHED directly + freshness validation; `publish()` + freshness validation; `update()` maps new fields |
| `frontend/src/components/modals/AddToCartModal.jsx` | Create | Shared add-to-cart modal with fresh stock fetch |
| `frontend/src/buyer/Marketplace.jsx` | Modify | Use `AddToCartModal`; card click → `setListingId` + navigate |
| `frontend/src/buyer/ListingDetail.jsx` | Rewrite | Full detail page with freshness grid, vendor card, related listings |
| `frontend/src/buyer/BuyerDashboard.jsx` | Modify | Add `listingId` state; wire `setListingId` into `renderPage` |
| `frontend/src/vendor/Inventory.jsx` | Modify | Expand `ListForSaleModal` with 5 freshness slots |
| `frontend/src/vendor/StorefrontEditor.jsx` | Modify | Remove Publish button; add freshness slots to edit modal; update row actions |

---

## Task 1: DB Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V63__add_freshness_photo_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE storefront_listings
  ADD COLUMN photo_eyes   VARCHAR(512),
  ADD COLUMN photo_gills  VARCHAR(512),
  ADD COLUMN photo_scales VARCHAR(512),
  ADD COLUMN photo_belly  VARCHAR(512),
  ADD COLUMN photo_flesh  VARCHAR(512);
```

- [ ] **Step 2: Run the backend to apply the migration**

```bash
cd backend
./mvnw spring-boot:run
```

Expected: Flyway logs `Successfully applied 1 migration to schema "public", now at version v63`.
Stop the server after confirming (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V63__add_freshness_photo_columns.sql
git commit -m "db: add freshness photo columns to storefront_listings (V63)"
```

---

## Task 2: api.yaml Schema Changes + Codegen

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml` (4 schemas)

The 5 freshness fields to add everywhere (copy-paste this block):
```yaml
        photoEyes:
          type: string
          nullable: true
          maxLength: 512
        photoGills:
          type: string
          nullable: true
          maxLength: 512
        photoScales:
          type: string
          nullable: true
          maxLength: 512
        photoBelly:
          type: string
          nullable: true
          maxLength: 512
        photoFlesh:
          type: string
          nullable: true
          maxLength: 512
```

- [ ] **Step 1: Add 5 nullable fields to `StorefrontListingSummary` (around line 6849, after `photoUrl`)**

In `api.yaml`, find `StorefrontListingSummary` and add the 5 fields after the `photoUrl` property.

- [ ] **Step 2: Add 5 nullable fields to `StorefrontListingResponse` (around line 6794, after `photoUrl`)**

Same block added after `photoUrl` in `StorefrontListingResponse`.

- [ ] **Step 3: Add 5 fields as required + minLength:1 to `StorefrontListingRequest` (around line 6718)**

Add these to `StorefrontListingRequest.properties` AND to the `required` list:
```yaml
        photoEyes:
          type: string
          minLength: 1
          maxLength: 512
        photoGills:
          type: string
          minLength: 1
          maxLength: 512
        photoScales:
          type: string
          minLength: 1
          maxLength: 512
        photoBelly:
          type: string
          minLength: 1
          maxLength: 512
        photoFlesh:
          type: string
          minLength: 1
          maxLength: 512
```

Update `required` list (line ~6705) to add: `photoEyes, photoGills, photoScales, photoBelly, photoFlesh`.

- [ ] **Step 4: Add 5 nullable fields to `StorefrontListingUpdateRequest` (around line 6755, after `photoUrl`)**

Same nullable block as step 1.

- [ ] **Step 5: Run codegen**

```bash
cd backend
./mvnw generate-sources
```

Expected: BUILD SUCCESS. Generated classes appear in `target/generated-sources/openapi/`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "api: add freshness photo fields to storefront schemas"
```

---

## Task 3: Domain Entity + Mapper

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java`
- Modify: `backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java`

- [ ] **Step 1: Add 5 fields to `StorefrontListing.java`**

After the existing `private String photoUrl;` field (around line 28), add:

```java
@Column(name = "photo_eyes")
private String photoEyes;

@Column(name = "photo_gills")
private String photoGills;

@Column(name = "photo_scales")
private String photoScales;

@Column(name = "photo_belly")
private String photoBelly;

@Column(name = "photo_flesh")
private String photoFlesh;
```

Add getters and setters for each (follow the same pattern as `getPhotoUrl()` / `setPhotoUrl()`).

- [ ] **Step 2: Update `StorefrontListingMapper.toDto()` to map all 5 new fields**

After `dto.setPhotoUrl(JsonNullable.of(entity.getPhotoUrl()));` (line ~51), add:

```java
dto.setPhotoEyes(JsonNullable.of(entity.getPhotoEyes()));
dto.setPhotoGills(JsonNullable.of(entity.getPhotoGills()));
dto.setPhotoScales(JsonNullable.of(entity.getPhotoScales()));
dto.setPhotoBelly(JsonNullable.of(entity.getPhotoBelly()));
dto.setPhotoFlesh(JsonNullable.of(entity.getPhotoFlesh()));
```

- [ ] **Step 3: Update `StorefrontListingMapper.toBuyerSummary()` to map all 5 new fields**

After `dto.setPhotoUrl(JsonNullable.of(entity.getPhotoUrl()));` (line ~73), add:

```java
dto.setPhotoEyes(JsonNullable.of(entity.getPhotoEyes()));
dto.setPhotoGills(JsonNullable.of(entity.getPhotoGills()));
dto.setPhotoScales(JsonNullable.of(entity.getPhotoScales()));
dto.setPhotoBelly(JsonNullable.of(entity.getPhotoBelly()));
dto.setPhotoFlesh(JsonNullable.of(entity.getPhotoFlesh()));
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd backend
./mvnw compile
```

Expected: BUILD SUCCESS, no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java \
        backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java
git commit -m "feat(backend): add freshness photo fields to StorefrontListing entity and mapper"
```

---

## Task 4: Service Layer — create(), publish(), update()

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java`

- [ ] **Step 1: Write a failing test for freshness validation on create**

In `backend/src/test/java/com/mermaid/app/service/` create or find a `StorefrontListingServiceTest.java`. Add:

```java
@Test
void create_missingFreshnessPhotos_throws() {
    // Arrange
    StorefrontListing draft = new StorefrontListing();
    draft.setSpeciesId(1L);
    draft.setTitle("Test Fish");
    draft.setPricePerKg(BigDecimal.valueOf(100));
    draft.setPhotoUrl("http://example.com/cover.jpg");
    // Intentionally omit freshness photos
    List<Long> lotIds = List.of(1L);

    when(lotRepo.findById(1L)).thenReturn(Optional.of(lotWithStock(5.0)));

    // Act + Assert
    assertThrows(IllegalStateException.class, () ->
        service.create(1L, draft, lotIds));
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend
./mvnw test -Dtest=StorefrontListingServiceTest#create_missingFreshnessPhotos_throws
```

Expected: FAIL (no validation exists yet).

- [ ] **Step 3: Update `create()` — add freshness validation, map 5 fields, publish directly**

Find `StorefrontListingService.create()`. Replace its body with:

```java
@Transactional
public StorefrontListing create(Long vendorId, StorefrontListing draft, List<Long> lotIds) {
    validateLots(vendorId, draft.getSpeciesId(), lotIds, false, null);
    validateFreshnessPhotos(draft);
    draft.setVendorId(vendorId);
    draft.setStatus(StorefrontListingStatus.PUBLISHED);
    StorefrontListing saved = listingRepo.save(draft);
    saveLotLinks(saved.getId(), lotIds);
    return saved;
}
```

Add a private helper at the bottom of the class:

```java
private void validateFreshnessPhotos(StorefrontListing listing) {
    if (isBlank(listing.getPhotoEyes()) ||
        isBlank(listing.getPhotoGills()) ||
        isBlank(listing.getPhotoScales()) ||
        isBlank(listing.getPhotoBelly()) ||
        isBlank(listing.getPhotoFlesh())) {
        throw new IllegalStateException("All 5 freshness photos are required before publishing");
    }
}

private static boolean isBlank(String s) {
    return s == null || s.isBlank();
}
```

- [ ] **Step 4: Update `publish()` — add freshness validation before re-publishing**

In the existing `publish()` method, add `validateFreshnessPhotos(listing);` after the stock checks (before `listing.setStatus(StorefrontListingStatus.PUBLISHED)`).

- [ ] **Step 5: Update `update()` — map 5 new fields from patch**

In the existing `update()` method, after `if (patch.getPhotoUrl() != null) listing.setPhotoUrl(patch.getPhotoUrl());`, add:

```java
if (patch.getPhotoEyes()  != null) listing.setPhotoEyes(patch.getPhotoEyes());
if (patch.getPhotoGills() != null) listing.setPhotoGills(patch.getPhotoGills());
if (patch.getPhotoScales()!= null) listing.setPhotoScales(patch.getPhotoScales());
if (patch.getPhotoBelly() != null) listing.setPhotoBelly(patch.getPhotoBelly());
if (patch.getPhotoFlesh() != null) listing.setPhotoFlesh(patch.getPhotoFlesh());
```

- [ ] **Step 6: Update the controller to map request → entity for the 5 new fields**

In `VendorStorefrontController.java`, find the method that calls `service.create()`. It builds a `StorefrontListing` from the request. Add mapping for the 5 new fields:

```java
draft.setPhotoEyes(request.getPhotoEyes());
draft.setPhotoGills(request.getPhotoGills());
draft.setPhotoScales(request.getPhotoScales());
draft.setPhotoBelly(request.getPhotoBelly());
draft.setPhotoFlesh(request.getPhotoFlesh());
```

Do the same in the `update()` controller method, mapping from `StorefrontListingUpdateRequest`.

- [ ] **Step 7: Run the failing test again — it should now pass**

```bash
cd backend
./mvnw test -Dtest=StorefrontListingServiceTest#create_missingFreshnessPhotos_throws
```

Expected: PASS.

- [ ] **Step 8: Run all backend tests**

```bash
cd backend
./mvnw test
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java \
        backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java \
        backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java
git commit -m "feat(backend): freshness photo validation; create() publishes directly"
```

---

## Task 5: AddToCartModal (shared frontend component)

**Files:**
- Create: `frontend/src/components/modals/AddToCartModal.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState, useEffect } from 'react'
import { fetchListingDetail } from '../../buyer/api/marketplace'
import { useCart } from '../../context/CartContext'
import CrudModal from './CrudModal'

export default function AddToCartModal({ listing, onClose }) {
  const { addItem } = useCart()
  const [qty, setQty]               = useState(listing.minQtyKg ?? 1)
  const [notes, setNotes]           = useState('')
  const [err, setErr]               = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [freshStock, setFreshStock] = useState(null)
  const [checking, setChecking]     = useState(true)

  useEffect(() => {
    setChecking(true)
    fetchListingDetail(listing.id)
      .then(detail => {
        const l = detail?.listing ?? detail
        setFreshStock({ availableKg: l?.availableKg ?? listing.availableKg, minQtyKg: l?.minQtyKg ?? listing.minQtyKg })
        setQty(l?.minQtyKg ?? listing.minQtyKg ?? 1)
      })
      .catch(() => setFreshStock({ availableKg: listing.availableKg, minQtyKg: listing.minQtyKg }))
      .finally(() => setChecking(false))
  }, [listing.id])

  async function handleConfirm() {
    const n = Number(qty)
    const avail = freshStock?.availableKg ?? 0
    const min   = freshStock?.minQtyKg    ?? 0
    if (!n || n <= 0)   { setErr('Quantity must be greater than 0'); return }
    if (min && n < min) { setErr(`Minimum order is ${min} kg`); return }
    if (n > avail)      { setErr(`Only ${avail} kg available`); return }
    setSubmitting(true)
    setErr('')
    try {
      await addItem({ listingId: listing.id, quantityKg: n, notes: notes || null })
      onClose()
    } catch (e) {
      setErr(e?.message ?? 'Could not add to cart')
    } finally {
      setSubmitting(false)
    }
  }

  const soldOut = !checking && (freshStock?.availableKg ?? 0) <= 0

  return (
    <CrudModal
      title={`Add to cart — ${listing.title ?? listing.speciesName}`}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel={soldOut ? 'Sold out' : 'Add to cart'}
      loading={submitting || checking}
    >
      <div className="form-grid">
        <div className="form-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Quantity (kg)
            {checking && <span className="muted-data" style={{ fontSize: 11 }}>checking stock…</span>}
            {!checking && freshStock && (
              <span className={`chip chip--${freshStock.availableKg > 0 ? 'safe' : 'unsafe'}`} style={{ fontSize: 10 }}>
                {freshStock.availableKg > 0 ? `${freshStock.availableKg} kg available` : 'Sold out'}
              </span>
            )}
          </label>
          <input
            className="input"
            type="number"
            step="0.1"
            min={freshStock?.minQtyKg ?? 0.1}
            max={freshStock?.availableKg ?? undefined}
            value={qty}
            disabled={checking || soldOut}
            onChange={e => { setQty(e.target.value); setErr('') }}
          />
        </div>
        <div className="form-row">
          <label>Notes (optional)</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
      {err && <p style={{ color: 'var(--unsafe)', fontSize: 12, marginTop: 8 }}>{err}</p>}
    </CrudModal>
  )
}
```

- [ ] **Step 2: Check that CrudModal exists and accepts these props**

Read `frontend/src/components/modals/CrudModal.jsx` — confirm it accepts `title`, `onClose`, `onConfirm`, `confirmLabel`, `loading`, and `children`. If `confirmLabel` is not supported, add it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/modals/AddToCartModal.jsx
git commit -m "feat(frontend): add shared AddToCartModal component"
```

---

## Task 6: Marketplace.jsx — use AddToCartModal + card click routing

**Files:**
- Modify: `frontend/src/buyer/Marketplace.jsx`

- [ ] **Step 1: Add `setListingId` to the component's props**

```jsx
export default function Marketplace({ setPage, setBuyNow, setListingId }) {
```

- [ ] **Step 2: Remove the inline add-to-cart state and logic**

Remove these state variables: `cartModal`, `qty`, `notes`, `addErr`, `freshStock`, `fetchingStock`.
Remove the `openCartModal` function and the `addToCartMut` mutation.
Remove the `AddToCartModal`-equivalent JSX inside the return (the `{cartModal && ...}` block).

- [ ] **Step 3: Add `cartModal` state (just the listing object) and `AddToCartModal` import**

```jsx
import AddToCartModal from '../../components/modals/AddToCartModal'
// ...
const [cartModal, setCartModal] = useState(null)
```

- [ ] **Step 4: Update card actions**

Replace the old `onClick` on "Add to cart":
```jsx
onClick={() => setCartModal(l)}
```

Replace the old `onClick` on card click (title/body area):
```jsx
onClick={() => { setListingId(l.id); setPage('blisting') }}
```

Add a click handler to the card body (the `buyer-card` div, not the footer buttons). The title/species name and hero image should be clickable. Ensure the "Add to cart" and "Order now" footer buttons use `e.stopPropagation()` so card click doesn't fire:
```jsx
onClick={e => { e.stopPropagation(); setCartModal(l) }}
```

- [ ] **Step 5: Render AddToCartModal**

At the bottom of the return, after the listings grid:
```jsx
{cartModal && <AddToCartModal listing={cartModal} onClose={() => setCartModal(null)} />}
```

- [ ] **Step 6: Start the dev server and manually verify**

```bash
cd frontend && npm run dev
```

- Log in as a buyer, go to Marketplace.
- Click "Add to cart" on a listing → modal opens with stock check.
- Click the card body → navigates to `blisting` (will show old mock ListingDetail for now — that's OK).
- Close modal with Cancel → modal dismisses cleanly.
- Submit with 0 qty → inline error appears inside modal (not full page).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/buyer/Marketplace.jsx
git commit -m "feat(frontend): marketplace card click routes to detail; use shared AddToCartModal"
```

---

## Task 7: BuyerDashboard.jsx — wire listingId state

**Files:**
- Modify: `frontend/src/buyer/BuyerDashboard.jsx`

**Context:** `renderPage` is a **module-level function** (line 110), not inside the component. State variables from `BuyerDashboard` are not in scope there. The fix is to add `listingId`/`setListingId` to the function signature AND update the single call site that passes them in.

- [ ] **Step 1: Add `listingId` state inside `BuyerDashboard`**

Inside the `BuyerDashboard` component body (after `const [buyNow, setBuyNow] = useState(null)`), add:

```jsx
const [listingId, setListingId] = useState(null)
```

- [ ] **Step 2: Update `renderPage` function signature (line 110)**

```jsx
function renderPage(page, setPage, buyNow, setBuyNow, user, onLogout, listingId, setListingId) {
```

- [ ] **Step 3: Update the call site (line 137)**

```jsx
{renderPage(page, setPage, buyNow, setBuyNow, user, onLogout, listingId, setListingId)}
```

- [ ] **Step 4: Update the two affected `case` lines inside `renderPage`**

```jsx
case 'bbrowse':  return <Marketplace setPage={setPage} setBuyNow={setBuyNow} setListingId={setListingId} />
case 'blisting': return <ListingDetail setPage={setPage} listingId={listingId} setBuyNow={setBuyNow} setListingId={setListingId} />
```

Note: `setListingId` is also passed to `ListingDetail` so related listing cards can navigate in-place (see Task 8).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/buyer/BuyerDashboard.jsx
git commit -m "feat(frontend): wire listingId state in BuyerDashboard for listing detail routing"
```

---

## Task 8: ListingDetail.jsx — full rewrite

**Files:**
- Rewrite: `frontend/src/buyer/ListingDetail.jsx`

- [ ] **Step 1: Write the new ListingDetail component**

Replace the entire file content with:

```jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { I } from '../icons'
import { fetchListingDetail } from './api/marketplace'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'
import AddToCartModal from '../components/modals/AddToCartModal'

const FRESHNESS_SLOTS = [
  { key: 'photoEyes',   label: 'Eyes',   hint: 'Clear, bright pupils' },
  { key: 'photoGills',  label: 'Gills',  hint: 'Bright red, not brown' },
  { key: 'photoScales', label: 'Scales', hint: 'Shiny, tight to skin' },
  { key: 'photoBelly',  label: 'Belly',  hint: 'Firm, not swollen' },
  { key: 'photoFlesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration' },
]

function FreshnessGrid({ listing }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Freshness check</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FRESHNESS_SLOTS.map(({ key, label, hint }, i) => {
          const url = listing[key]
          const isLast = i === FRESHNESS_SLOTS.length - 1
          return (
            <div
              key={key}
              style={{
                gridColumn: isLast ? '1 / -1' : undefined,
                maxWidth: isLast ? '50%' : undefined,
                margin: isLast ? '0 auto' : undefined,
                width: isLast ? '100%' : undefined,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
              <div className="muted-data" style={{ fontSize: 10, marginBottom: 6 }}>{hint}</div>
              {url ? (
                <img
                  src={url}
                  alt={label}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/3', borderRadius: 8,
                  background: 'var(--surface-2)', display: 'grid', placeItems: 'center',
                  color: 'var(--ink-4)', fontSize: 11,
                }}>
                  Not provided
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ListingDetail({ setPage, listingId, setBuyNow, setListingId }) {
  const [showCart, setShowCart] = useState(false)

  const detailQ = useQuery({
    queryKey: ['listingDetail', listingId],
    queryFn: () => fetchListingDetail(listingId),
    enabled: !!listingId,
    staleTime: 10_000,
  })

  if (!listingId) return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}>
        <I.ChevL size={11} /> Back to marketplace
      </button>
      <div className="empty" style={{ marginTop: 32 }}>No listing selected.</div>
    </div>
  )

  if (detailQ.isLoading) return <div className="page"><TableRowSkeleton /></div>
  if (detailQ.error)     return <div className="page"><ApiError error={detailQ.error} onRetry={detailQ.refetch} /></div>

  const { listing, vendor, relatedListings = [] } = detailQ.data ?? {}
  if (!listing) return null

  const dispatchInfo = (listing.deliveryFee ?? 0) > 0
    ? `Delivery available · ₱${listing.deliveryFee} fee`
    : 'Pickup only · Free'

  const vendorInitial = (vendor?.fullName || 'V')[0].toUpperCase()

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm" onClick={() => setPage('bbrowse')}>
        <I.ChevL size={11} /> Back to marketplace
      </button>

      <div className="grid grid--2-1" style={{ marginTop: 18, gap: 24, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div>
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl}
              alt={listing.title}
              style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: 360, borderRadius: 12, background: 'var(--accent-soft)',
              color: 'var(--accent)', display: 'grid', placeItems: 'center',
              fontSize: 72, fontWeight: 600, fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              {listing.speciesName?.[0] ?? '?'}
            </div>
          )}
          <FreshnessGrid listing={listing} />
        </div>

        {/* Right column */}
        <div>
          <div className="eyebrow">{vendor?.fullName}</div>
          <h1 className="page__title" style={{ marginTop: 4, fontSize: 32 }}>{listing.speciesName}</h1>
          {listing.title && listing.title !== listing.speciesName && (
            <div className="muted-data" style={{ marginTop: 2 }}>{listing.title}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
            <span style={{ fontSize: 38, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>
              ₱{listing.pricePerKg}
            </span>
            <span className="muted-data">/kg</span>
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`chip chip--${(listing.availableKg ?? 0) > 0 ? 'safe' : 'unsafe'}`}>
              {(listing.availableKg ?? 0) > 0 ? `${listing.availableKg} kg available` : 'Sold out'}
            </span>
            <span className="muted-data" style={{ fontSize: 12 }}>{dispatchInfo}</span>
          </div>

          {listing.minQtyKg && (
            <div className="muted-data" style={{ marginTop: 6, fontSize: 12 }}>
              Minimum order: {listing.minQtyKg} kg
            </div>
          )}

          {listing.description && (
            <p style={{ marginTop: 16, lineHeight: 1.6 }}>{listing.description}</p>
          )}

          <div className="row" style={{ gap: 10, marginTop: 22 }}>
            <button
              className="btn btn--primary"
              style={{ flex: 2 }}
              disabled={(listing.availableKg ?? 0) <= 0}
              onClick={() => { setBuyNow({ listing }); setPage('bcheckout') }}
            >
              Order now
            </button>
            <button
              className="btn"
              style={{ flex: 1 }}
              disabled={(listing.availableKg ?? 0) <= 0}
              onClick={() => setShowCart(true)}
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>

      {/* Vendor card */}
      <div className="card" style={{ marginTop: 28, padding: 18 }}>
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 20,
          }}>
            {vendorInitial}
          </div>
          <div style={{ flex: 1 }}>
            <strong>{vendor?.fullName}</strong>
            {vendor?.rating && (
              <div className="muted-data" style={{ fontSize: 12, marginTop: 2 }}>
                ★ {vendor.rating} · {vendor.tradeCount ?? 0} trades
              </div>
            )}
          </div>
          <button className="btn btn--sm" onClick={() => setPage('bvendor')}>View storefront</button>
        </div>
      </div>

      {/* Related listings */}
      {relatedListings.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>More like this</div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
            {relatedListings.map(r => (
              <div
                key={r.id}
                className="buyer-card"
                style={{ minWidth: 180, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setListingId(r.id)}
              >
                <div className="buyer-card__hero" style={r.photoUrl ? { backgroundImage: `url(${r.photoUrl})` } : {}}>
                  {!r.photoUrl && <I.Fish size={24} style={{ opacity: 0.3 }} />}
                </div>
                <div className="buyer-card__body">
                  <div className="buyer-card__species">{r.title ?? r.speciesName}</div>
                  <div className="buyer-card__vendor">{r.vendorName}</div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ₱{r.pricePerKg}<small>/kg</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCart && <AddToCartModal listing={listing} onClose={() => setShowCart(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and manually verify**

```bash
cd frontend && npm run dev
```

- Log in as a buyer → Marketplace → click a card body → listing detail page loads with real data.
- Check freshness grid: photos show if uploaded; placeholders show if not.
- "Add to cart" → `AddToCartModal` opens.
- "Order now" → checkout page.
- "Back to marketplace" → returns to grid.
- Vendor card shows name; "View storefront" navigates to `bvendor`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/buyer/ListingDetail.jsx
git commit -m "feat(frontend): rewrite ListingDetail with real data, freshness grid, AddToCartModal"
```

---

## Task 9: Vendor Inventory — expand ListForSaleModal with freshness slots

**Files:**
- Modify: `frontend/src/vendor/Inventory.jsx`

- [ ] **Step 1: Add freshness state variables to `ListForSaleModal`**

After the existing `const [photoUrl, setPhotoUrl] = useState(null)` line, add:

```jsx
const [photoEyes,   setPhotoEyes]   = useState(null)
const [photoGills,  setPhotoGills]  = useState(null)
const [photoScales, setPhotoScales] = useState(null)
const [photoBelly,  setPhotoBelly]  = useState(null)
const [photoFlesh,  setPhotoFlesh]  = useState(null)
const [currentSlot, setCurrentSlot] = useState(null)
```

- [ ] **Step 2: Update the shared file input + upload handler to support slots**

Replace the existing `handlePhotoChange` with a version that routes to the right state setter:

```jsx
const SLOT_SETTERS = {
  cover: setPhotoUrl,
  eyes:  setPhotoEyes,
  gills: setPhotoGills,
  scales: setPhotoScales,
  belly: setPhotoBelly,
  flesh: setPhotoFlesh,
}

const handlePhotoChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) { setPhotoError('File must be JPEG, PNG, or WebP under 5 MB'); return }
  if (file.size > 5 * 1024 * 1024) { setPhotoError('File must be JPEG, PNG, or WebP under 5 MB'); return }
  setPhotoError('')
  setPhotoUploading(true)
  try {
    const data = await uploadListingPhoto(file)
    const setter = SLOT_SETTERS[currentSlot] ?? setPhotoUrl
    setter(data.url)
  } catch {
    setPhotoError('Upload failed — try again')
  } finally {
    setPhotoUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }
}
```

The existing cover photo upload button already calls `fileRef.current?.click()`. Update it to set `currentSlot` first:

```jsx
onClick={() => { setCurrentSlot('cover'); fileRef.current?.click() }}
```

- [ ] **Step 3: Add freshness validation to `submit()`**

After `if (!photoUrl) ...`, add:

```jsx
if (!photoEyes || !photoGills || !photoScales || !photoBelly || !photoFlesh) {
  setError('Please upload all 5 freshness photos')
  return
}
```

- [ ] **Step 4: Pass freshness URLs in the `onSubmit` body**

Update the `await onSubmit(...)` call to include:

```jsx
await onSubmit({
  speciesId: lot.speciesId,
  title: title.trim(),
  pricePerKg: p,
  minQtyKg: q,
  description: description || null,
  photoUrl,
  photoEyes,
  photoGills,
  photoScales,
  photoBelly,
  photoFlesh,
  lotIds: [lot.id],
  deliveryFee: deliveryFee ? Number(deliveryFee) : null,
})
```

- [ ] **Step 5: Add the freshness slots UI to the modal**

The modal container div needs a scroll constraint. Find the modal root div and add:
```jsx
style={{ width: 'min(520px, 92vw)', padding: 22, maxHeight: '85vh', overflowY: 'auto' }}
```

After the existing cover photo `form-row`, add:

```jsx
{/* Freshness photos */}
<div className="form-row" style={{ gridColumn: '1 / -1' }}>
  <label style={{ fontWeight: 600 }}>
    Freshness photos <span style={{ color: 'var(--unsafe)' }}>* all 5 required</span>
  </label>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
    {[
      { slot: 'eyes',   label: 'Eyes',   hint: 'Clear, bright pupils',      url: photoEyes   },
      { slot: 'gills',  label: 'Gills',  hint: 'Bright red, not brown',     url: photoGills  },
      { slot: 'scales', label: 'Scales', hint: 'Shiny, tight to skin',      url: photoScales },
      { slot: 'belly',  label: 'Belly',  hint: 'Firm, not swollen',         url: photoBelly  },
      { slot: 'flesh',  label: 'Flesh',  hint: 'Pink/white, no discoloration', url: photoFlesh },
    ].map(({ slot, label, hint, url }, i) => {
      const isLast = i === 4
      return (
        <div key={slot} style={{ gridColumn: isLast ? '1 / -1' : undefined, maxWidth: isLast ? '50%' : undefined }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
          <div className="muted-data" style={{ fontSize: 10, marginBottom: 6 }}>{hint}</div>
          {url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={url} alt={label} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
              <button className="btn btn--ghost btn--sm" type="button"
                onClick={() => { setCurrentSlot(slot); fileRef.current?.click() }}>Change</button>
            </div>
          ) : (
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              style={{ border: '1.5px dashed var(--line)', width: '100%', padding: '12px 0' }}
              onClick={() => { setCurrentSlot(slot); fileRef.current?.click() }}
            >
              Upload
            </button>
          )}
        </div>
      )
    })}
  </div>
</div>
```

- [ ] **Step 6: Manually test the full "List for sale" flow**

Log in as a vendor → Inventory → click "List for sale":
- Modal scrolls if needed.
- Upload cover photo → appears.
- Upload each of 5 freshness slots → each thumbnail appears.
- Submit with one slot missing → inline error "Please upload all 5 freshness photos".
- Submit with all 5 → listing created and appears as PUBLISHED in StorefrontEditor immediately.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/vendor/Inventory.jsx
git commit -m "feat(frontend): expand ListForSaleModal with 5 freshness photo slots"
```

---

## Task 10: StorefrontEditor.jsx — remove Publish button, add freshness to edit modal

**Files:**
- Modify: `frontend/src/vendor/StorefrontEditor.jsx`

- [ ] **Step 1: Remove `publishMut` from StorefrontEditor**

Find and delete:
```jsx
const publishMut = useMutation({ mutationFn: publishListing, onSuccess: invalidate })
```

Keep `unpubMut` and keep the `publishListing` import (it's still used for Re-publish).

- [ ] **Step 2: Remove `DRAFT` from `statusChip` map**

```jsx
const statusChip = { PUBLISHED: 'safe', SOLD_OUT: 'unsafe', UNPUBLISHED: '' }
```

- [ ] **Step 3: Add `republishMut` and update table row actions**

After the `unpubMut` declaration, add:

```jsx
const republishMut = useMutation({ mutationFn: publishListing, onSuccess: invalidate })
```

Then replace the existing Publish/Unpublish button block in each row with:

```jsx
{(l.status === 'PUBLISHED' || l.status === 'SOLD_OUT')
  ? <button className="btn btn--ghost btn--sm" onClick={() => unpubMut.mutate(l.id)}>Unpublish</button>
  : l.status === 'UNPUBLISHED'
    ? <button className="btn btn--ghost btn--sm" onClick={() => republishMut.mutate(l.id)}>Re-publish</button>
    : null
}
```

- [ ] **Step 4: Add freshness photo state to `openModal` and edit modal**

In `openModal(l)`, expand the form initialization:
```jsx
const openModal = (l) => {
  setForm({
    ...l,
    photoEyes:   l.photoEyes   ?? null,
    photoGills:  l.photoGills  ?? null,
    photoScales: l.photoScales ?? null,
    photoBelly:  l.photoBelly  ?? null,
    photoFlesh:  l.photoFlesh  ?? null,
  })
  setSaveError('')
  setPhotoError('')
  setPhotoUploading(false)
  setModal(l)
}
```

- [ ] **Step 5: Update `handleSave` to send freshness fields**

Add to the `updateMut.mutate(...)` call body:
```jsx
updateMut.mutate({
  id: form.id,
  title: form.title.trim(),
  pricePerKg: Number(form.pricePerKg),
  minQtyKg: m,
  description: form.description ?? null,
  photoUrl: form.photoUrl ?? null,
  photoEyes:   form.photoEyes   ?? null,
  photoGills:  form.photoGills  ?? null,
  photoScales: form.photoScales ?? null,
  photoBelly:  form.photoBelly  ?? null,
  photoFlesh:  form.photoFlesh  ?? null,
})
```

- [ ] **Step 6: Add shared file input pattern to edit modal**

Add `currentSlot` state at the component level (alongside existing `photoUploading` etc.):
```jsx
const [currentSlot, setCurrentSlot] = useState(null)
```

Update existing cover photo `handlePhotoChange` to route by `currentSlot` (same pattern as Inventory.jsx Task 9 Step 2). Update the existing cover photo upload button to set `currentSlot('cover')` first.

- [ ] **Step 7: Add freshness photo slots to the edit modal**

Inside the edit modal `form-grid`, after the existing `<div className="form-row">` for Photo, add the same 5-slot grid from Task 9 Step 5, but using `form.photoEyes` etc. from form state, and updating via `setForm(f => ({ ...f, photoEyes: data.url }))` etc. The slot setter lookup:

```jsx
const SLOT_FORM_KEYS = {
  cover: 'photoUrl',
  eyes:  'photoEyes',
  gills: 'photoGills',
  scales: 'photoScales',
  belly: 'photoBelly',
  flesh: 'photoFlesh',
}
// In handlePhotoChange (edit modal):
const key = SLOT_FORM_KEYS[currentSlot] ?? 'photoUrl'
setForm(f => ({ ...f, [key]: data.url }))
```

- [ ] **Step 8: Manually verify edit modal**

Log in as vendor → StorefrontEditor → Edit a listing that has freshness photos:
- Modal shows existing freshness thumbnails pre-populated.
- Change one photo → thumbnail updates.
- Save → listing updated.
- Listing without freshness photos shows empty slots → vendor can upload without re-uploading all (partial update is fine in edit).

- [ ] **Step 9: Run frontend lint**

```bash
cd frontend && npm run lint -- src/vendor/StorefrontEditor.jsx
```

Fix any `no-unused-vars` errors from the removed `publishMut`.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/vendor/StorefrontEditor.jsx
git commit -m "feat(frontend): remove draft/publish flow; add freshness photo edit in StorefrontEditor"
```

---

## Task 11: Final integration smoke test

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && ./mvnw test
```

Expected: All tests pass.

- [ ] **Step 2: Run frontend lint**

```bash
cd frontend && npm run lint
```

No new errors introduced by this feature.

- [ ] **Step 3: Run frontend unit tests**

```bash
cd frontend && npm test
```

Expected: All existing tests pass (no new unit tests required for this feature — it's UI-heavy and covered by manual verification above).

- [ ] **Step 4: End-to-end flow verification**

1. **Vendor creates listing:** Inventory → List for sale → fill all fields + 5 freshness photos → submit → appears in StorefrontEditor as PUBLISHED.
2. **Buyer sees it:** Marketplace → listing card appears with correct stock → click card body → ListingDetail loads with cover photo + freshness grid + price/info.
3. **Buyer adds to cart:** "Add to cart" → AddToCartModal → stock check → valid qty → cart updates.
4. **Vendor edits listing:** StorefrontEditor → Edit → freshness slots pre-populated → change one → Save → confirmed.
5. **Vendor unpublishes:** StorefrontEditor → Unpublish → status shows UNPUBLISHED → listing disappears from marketplace.
6. **Vendor re-publishes:** StorefrontEditor → Re-publish → listing returns to marketplace.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: listing detail page + vendor freshness photos + streamlined publish flow"
```
