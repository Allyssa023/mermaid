# Storefront Listing Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix and complete vendor storefront listing CRUD — required photo upload on create, available-kg display, duplicate lot prevention, and management-only Storefront page.

**Architecture:** Seven sequential tasks: api.yaml schema change → repository guard → service guard → controller wire-up → frontend API helper → StorefrontEditor rewrite → Inventory modal rewrite. Backend tasks first (Tasks 1–4) so the generated DTO exists before the controller compiles; frontend tasks after (Tasks 5–7).

**Tech Stack:** Spring Boot Java (OpenAPI-first, `./mvnw generate-sources`), JPA/JPQL, React/Vite, TanStack Query v5, existing `apiUpload` helper in `src/api.js`.

---

## File Map

| File | Role in this feature |
|------|---------------------|
| `backend/src/main/resources/openapi/api.yaml` | Add `StorefrontListingUpdateRequest` schema; wire PUT endpoint; add 409 to PUT |
| `backend/src/main/java/com/mermaid/app/repository/StorefrontListingLotRepository.java` | Add `existsByLotIdInActiveListing` JPQL method |
| `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java` | Add duplicate lot check inside `validateLots()` |
| `backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java` | Add test for duplicate lot guard |
| `backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java` | Add `fromUpdateRequest()` helper; update `vendorUpdateStorefrontListing()` |
| `frontend/src/vendor/api/storefront.js` | Add `uploadListingPhoto` function |
| `frontend/src/vendor/StorefrontEditor.jsx` | Remove create path; fix edit modal + photo; add delete confirm; swap table columns |
| `frontend/src/vendor/Inventory.jsx` | Add listings query for duplicate guard; add photo upload + description to modal |

---

## Task 1: api.yaml — New update schema + wire PUT + add 409

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

### Context
The PUT endpoint at `/vendor/storefront/listings/{listingId}` currently uses `StorefrontListingRequest` (which requires `speciesId` and `lotIds`). We need a separate update schema that omits those fields (lots are locked at creation). We also need a 409 response on the PUT path.

- [ ] **Step 1: Change the PUT endpoint requestBody schema**

In `api.yaml`, find the PUT endpoint block (around line 1052). Change line 1063:
```yaml
              $ref: '#/components/schemas/StorefrontListingRequest'
```
to:
```yaml
              $ref: '#/components/schemas/StorefrontListingUpdateRequest'
```

- [ ] **Step 2: Add 409 response to the PUT endpoint**

After the `'401'` response on the PUT path (currently the last response, around line 1076), add:
```yaml
        '409':
          $ref: '#/components/responses/Conflict'
```

- [ ] **Step 3: Add StorefrontListingUpdateRequest schema**

In the `components/schemas` section, after the closing line of `StorefrontListingRequest` (the `minItems: 1` line around line 6538) and before `StorefrontListingResponse`, insert:

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

- [ ] **Step 4: Regenerate sources**

```bash
cd backend
./mvnw generate-sources
```

Expected: BUILD SUCCESS. The generated file `target/generated-sources/openapi/src/main/java/com/mermaid/app/model/StorefrontListingUpdateRequest.java` should now exist.

- [ ] **Step 4a: Inspect the generated DTO — REQUIRED before Task 4**

Open the generated file and check how `description` and `photoUrl` are declared:

```bash
grep -n "description\|photoUrl\|JsonNullable" \
  target/generated-sources/openapi/src/main/java/com/mermaid/app/model/StorefrontListingUpdateRequest.java
```

**If the field is `JsonNullable<String>`** (most common with `openApiNullable: true`):
```java
// getter looks like: JsonNullable<String> getDescription()
// guard in fromUpdateRequest():
if (req.getDescription() != null && req.getDescription().isPresent())
    entity.setDescription(req.getDescription().get());
```

**If the field is plain `String`** (nullable-without-JsonNullable config):
```java
// getter looks like: String getDescription()
// guard in fromUpdateRequest():
if (req.getDescription() != null)
    entity.setDescription(req.getDescription());
```

Note which pattern the generator produced and use the matching guard in Task 4 Step 2.

- [ ] **Step 5: Verify build still compiles (controller will fail — that's expected)**

```bash
./mvnw compile 2>&1 | grep -E "ERROR|BUILD"
```

Expected: Compile error in `VendorStorefrontController` complaining about `StorefrontListingRequest` on the update method — this is expected and will be fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(api): add StorefrontListingUpdateRequest schema, wire PUT, add 409"
```

---

## Task 2: Repository — Duplicate lot guard query

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/repository/StorefrontListingLotRepository.java`

### Context
`StorefrontListingLot` has a composite `@EmbeddedId` of type `StorefrontListingLot.Id` with fields `listingId` and `lotId`. JPQL must use `sll.id.listingId` and `sll.id.lotId` — NOT `sll.listingId` / `sll.lotId`. The `isDeleted` flag lives on `StorefrontListing`, not on the join table.

- [ ] **Step 1: Add the query method**

Open `backend/src/main/java/com/mermaid/app/repository/StorefrontListingLotRepository.java`. Add after the existing `findByIdLotId` method:

```java
    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(sll) > 0 FROM StorefrontListingLot sll " +
        "JOIN StorefrontListing sl ON sll.id.listingId = sl.id " +
        "WHERE sll.id.lotId = :lotId AND sl.isDeleted = false")
    boolean existsByLotIdInActiveListing(@org.springframework.data.repository.query.Param("lotId") Long lotId);
```

- [ ] **Step 2: Verify compile**

```bash
cd backend
./mvnw compile -pl . 2>&1 | grep -E "ERROR|BUILD"
```

Expected: Same compile error as before (controller still broken) — repository itself compiles fine.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/repository/StorefrontListingLotRepository.java
git commit -m "feat(repo): add existsByLotIdInActiveListing guard query"
```

---

## Task 3: Service — Add duplicate lot guard + test

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java`
- Modify: `backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java`

### Context
`validateLots()` (line 125 of `StorefrontListingService`) already checks ownership, species match, and remaining stock. We add one more check: if the lot is already linked to any non-deleted listing, throw `IllegalStateException`. Mockito returns `false` by default for booleans, so existing tests need no changes — the guard is only triggered when `existsByLotIdInActiveListing` returns `true`.

- [ ] **Step 1: Write the failing test first**

In `StorefrontListingServiceTest.java`, add this test inside the `// ---- create ----` section, after `create_speciesMismatch_throws`:

```java
    @Test
    void create_lotAlreadyInActiveListing_throws() {
        InventoryLot lot = lot(1L, 10L, 5L, bd("20.00"));
        when(lotRepo.findById(1L)).thenReturn(Optional.of(lot));
        when(listingLotRepo.existsByLotIdInActiveListing(1L)).thenReturn(true);

        assertThatThrownBy(() ->
                service.create(10L, listing(null, null, 5L), List.of(1L)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already assigned");

        verify(listingLotRepo, never()).save(any());
    }
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend
./mvnw test -Dtest=StorefrontListingServiceTest#create_lotAlreadyInActiveListing_throws
```

Expected: FAIL — `IllegalStateException` not thrown (the check doesn't exist yet).

- [ ] **Step 3: Add the guard in validateLots()**

In `StorefrontListingService.java`, inside `validateLots()` (after the `!allowEmpty` stock check at line 135), add:

```java
            if (listingLotRepo.existsByLotIdInActiveListing(lotId)) {
                throw new IllegalStateException(
                    "Lot " + lotId + " is already assigned to an existing listing");
            }
```

The full updated `validateLots()` method:

```java
    private void validateLots(Long vendorId, Long speciesId, List<Long> lotIds, boolean allowEmpty) {
        for (Long lotId : lotIds) {
            InventoryLot lot = lotRepo.findById(lotId)
                    .orElseThrow(() -> new IllegalArgumentException("Lot not found: " + lotId));
            if (!vendorId.equals(lot.getVendorId())) {
                throw new IllegalArgumentException("Lot " + lotId + " does not belong to vendor");
            }
            if (!speciesId.equals(lot.getSpeciesId())) {
                throw new IllegalArgumentException("Lot " + lotId + " species mismatch");
            }
            if (!allowEmpty && lot.getRemainingKg().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Lot " + lotId + " has no remaining stock");
            }
            if (listingLotRepo.existsByLotIdInActiveListing(lotId)) {
                throw new IllegalStateException(
                    "Lot " + lotId + " is already assigned to an existing listing");
            }
        }
    }
```

- [ ] **Step 4: Run all StorefrontListingService tests**

```bash
cd backend
./mvnw test -Dtest=StorefrontListingServiceTest
```

Expected: All tests PASS (Mockito returns `false` by default for the new boolean method, so existing tests are unaffected).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java \
        backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java
git commit -m "feat(service): guard against duplicate lot assignment on listing create"
```

---

## Task 4: Controller — Wire StorefrontListingUpdateRequest

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java`

### Context
The controller currently has one `fromRequest(StorefrontListingRequest req)` helper used by both create and update. After code generation, the update method's generated interface signature will expect `StorefrontListingUpdateRequest`. We add `fromUpdateRequest()` for that path and update the update method. The `service.update()` call passes `null` for `lotIds` — the service already skips lot re-linking when `lotIds` is null.

- [ ] **Step 1: Add the import for the new DTO**

In `VendorStorefrontController.java`, add after the existing `StorefrontListingRequest` import:

```java
import com.mermaid.app.model.StorefrontListingUpdateRequest;
```

- [ ] **Step 2: Add fromUpdateRequest() helper**

After the existing `fromRequest()` method (line 100), add the helper using whichever accessor style the generator produced (confirmed in Task 1 Step 4a).

**Version A — JsonNullable fields:**
```java
    private StorefrontListing fromUpdateRequest(StorefrontListingUpdateRequest req) {
        StorefrontListing entity = new StorefrontListing();
        entity.setTitle(req.getTitle());
        if (req.getDescription() != null && req.getDescription().isPresent())
            entity.setDescription(req.getDescription().get());
        if (req.getPhotoUrl() != null && req.getPhotoUrl().isPresent())
            entity.setPhotoUrl(req.getPhotoUrl().get());
        if (req.getPricePerKg() != null)
            entity.setPricePerKg(BigDecimal.valueOf(req.getPricePerKg()));
        if (req.getMinQtyKg() != null)
            entity.setMinQtyKg(BigDecimal.valueOf(req.getMinQtyKg()));
        return entity;
    }
```

**Version B — plain String fields:**
```java
    private StorefrontListing fromUpdateRequest(StorefrontListingUpdateRequest req) {
        StorefrontListing entity = new StorefrontListing();
        entity.setTitle(req.getTitle());
        if (req.getDescription() != null)
            entity.setDescription(req.getDescription());
        if (req.getPhotoUrl() != null)
            entity.setPhotoUrl(req.getPhotoUrl());
        if (req.getPricePerKg() != null)
            entity.setPricePerKg(BigDecimal.valueOf(req.getPricePerKg()));
        if (req.getMinQtyKg() != null)
            entity.setMinQtyKg(BigDecimal.valueOf(req.getMinQtyKg()));
        return entity;
    }
```

Use the version that matches the generated DTO from Task 1 Step 4a.

- [ ] **Step 3: Update vendorUpdateStorefrontListing() method signature and body**

Replace the existing `vendorUpdateStorefrontListing` method:

```java
    @Override
    public ResponseEntity<StorefrontListingResponse> vendorUpdateStorefrontListing(
            Long listingId, StorefrontListingUpdateRequest request) {
        Long vendorId = SecurityUtils.currentUserId();
        StorefrontListing patch = fromUpdateRequest(request);
        StorefrontListing saved = service.update(vendorId, listingId, patch, null);
        return ResponseEntity.ok(
                mapper.toDto(saved, inventoryService.availableKg(vendorId, saved.getSpeciesId())));
    }
```

- [ ] **Step 4: Compile and run all backend tests**

```bash
cd backend
./mvnw test
```

Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java
git commit -m "feat(controller): wire StorefrontListingUpdateRequest for PUT endpoint"
```

---

## Task 5: Frontend API helper — uploadListingPhoto

**Files:**
- Modify: `frontend/src/vendor/api/storefront.js`

### Context
`apiUpload` already exists in `frontend/src/api.js` and handles `FormData` uploads. The backend `POST /uploads` endpoint accepts `subDir` as a query parameter (`@RequestParam`). We pass it in the URL to avoid any ambiguity with multipart form field parsing.

- [ ] **Step 1: Add the import and helper**

Open `frontend/src/vendor/api/storefront.js`. Add at the top:

```js
import { apiUpload } from '../../api'
```

And add at the bottom:

```js
export const uploadListingPhoto = (file) =>
  apiUpload('/uploads?subDir=listings', file)
```

The complete file after changes:

```js
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../../api'

export const listListings = () => apiGet('/vendor/storefront/listings')

export const getListing = (id) => apiGet(`/vendor/storefront/listings/${id}`)

export const createListing = (body) => apiPost('/vendor/storefront/listings', null, body)

export const updateListing = (id, body) => apiPut(`/vendor/storefront/listings/${id}`, null, body)

export const deleteListing = (id) => apiDelete(`/vendor/storefront/listings/${id}`)

export const publishListing = (id) => apiPost(`/vendor/storefront/listings/${id}/publish`, null, {})

export const unpublishListing = (id) => apiPost(`/vendor/storefront/listings/${id}/unpublish`, null, {})

export const uploadListingPhoto = (file) =>
  apiUpload('/uploads?subDir=listings', file)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/vendor/api/storefront.js
git commit -m "feat(api): add uploadListingPhoto helper"
```

---

## Task 6: StorefrontEditor.jsx — Management-only rewrite

**Files:**
- Modify: `frontend/src/vendor/StorefrontEditor.jsx`

### Context
The current file has a broken create path (sends `speciesName` instead of `speciesId`, no `lotIds`), a broken update path (sends `speciesName`), no delete button, and no Available kg column. We rewrite the file completely. Creation no longer happens here — the Inventory page handles it.

**Photo upload flow in the edit modal:** User clicks "Change photo" or the upload area → file picker opens → on valid select, call `uploadListingPhoto(file)` → on success store the URL in `form.photoUrl`. The Save button works normally — the URL is just a field in the update body.

- [ ] **Step 1: Replace StorefrontEditor.jsx completely**

Replace the entire file with:

```jsx
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { I } from '../icons'
import { listListings, updateListing, deleteListing, publishListing, unpublishListing, uploadListingPhoto } from './api/storefront'
import { TableRowSkeleton } from '../components/Skeleton'
import ApiError from '../components/ApiError'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export default function StorefrontEditor() {
  const [modal, setModal]               = useState(null)
  const [form, setForm]                 = useState({})
  const [deleteConfirmId, setDeleteId]  = useState(null)
  const [photoUploading, setUploading]  = useState(false)
  const [photoError, setPhotoError]     = useState('')
  const [saveError, setSaveError]       = useState('')
  const fileRef = useRef(null)

  const qc = useQueryClient()
  const listingsQ = useQuery({ queryKey: ['vendor', 'storefront'], queryFn: listListings })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor', 'storefront'] })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => updateListing(id, body),
    onSuccess: () => { invalidate(); setModal(null); setSaveError('') },
    onError: (e) => setSaveError(e?.message ?? 'Failed to save'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => { invalidate(); setDeleteId(null) },
  })
  const publishMut = useMutation({ mutationFn: publishListing,  onSuccess: invalidate })
  const unpubMut   = useMutation({ mutationFn: unpublishListing, onSuccess: invalidate })

  if (listingsQ.isLoading) return <div className="page"><TableRowSkeleton rows={5} /></div>
  if (listingsQ.error)     return <div className="page"><ApiError error={listingsQ.error} onRetry={listingsQ.refetch} /></div>
  const listings = listingsQ.data ?? []

  const statusChip = { PUBLISHED: 'safe', SOLD_OUT: 'unsafe', DRAFT: 'caution', UNPUBLISHED: '' }

  const openEdit = (l) => {
    setForm({ ...l })
    setModal(l)
    setSaveError('')
    setPhotoError('')
  }

  const handleSave = () => {
    setSaveError('')
    updateMut.mutate({
      id:          form.id,
      title:       form.title,
      pricePerKg:  Number(form.pricePerKg),
      minQtyKg:    Number(form.minQtyKg),
      description: form.description ?? null,
      photoUrl:    form.photoUrl ?? null,
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('File must be JPEG, PNG, or WebP')
      return
    }
    if (file.size > MAX_BYTES) {
      setPhotoError('File must be under 5 MB')
      return
    }
    setUploading(true)
    try {
      const { url } = await uploadListingPhoto(file)
      setForm(f => ({ ...f, photoUrl: url }))
    } catch {
      setPhotoError('Upload failed — try again')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Storefront</div>
          <h1 className="page__title" style={{marginTop: 4}}>Your <em>listings</em></h1>
          <p className="page__sub">What buyers see in your shop. Create listings from the Inventory tab.</p>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        {listings.length === 0 ? (
          <div className="empty">
            <div className="empty__title">No listings yet</div>
            <p>Head to your Inventory tab to list a lot for sale.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th><th>Species</th><th>Price/kg</th><th>Min qty</th>
                <th>Available</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.title}</strong></td>
                  <td className="muted-data">{l.speciesName}</td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>₱{l.pricePerKg}</td>
                  <td className="muted-data">{l.minQtyKg} kg</td>
                  <td style={{fontFamily: 'var(--font-mono)'}}>
                    {l.availableKg != null ? `${l.availableKg} kg` : <span className="muted-data">—</span>}
                  </td>
                  <td>
                    <span className={`chip ${statusChip[l.status] ? `chip--${statusChip[l.status]}` : ''}`}>
                      {l.status}
                    </span>
                  </td>
                  <td style={{textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end'}}>
                    {l.status === 'DRAFT' || l.status === 'UNPUBLISHED'
                      ? <button className="btn btn--ghost btn--sm" onClick={() => publishMut.mutate(l.id)}>Publish</button>
                      : <button className="btn btn--ghost btn--sm" onClick={() => unpubMut.mutate(l.id)}>Unpublish</button>
                    }
                    <button className="btn btn--ghost btn--sm" onClick={() => openEdit(l)}><I.Edit size={11} /> Edit</button>
                    {deleteConfirmId === l.id ? (
                      <>
                        <span style={{fontSize: 12, alignSelf: 'center', color: 'var(--unsafe)'}}>Delete?</span>
                        <button className="btn btn--ghost btn--sm" style={{color: 'var(--unsafe)'}}
                          onClick={() => deleteMut.mutate(l.id)}>Confirm</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setDeleteId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn btn--ghost btn--sm" style={{color: 'var(--unsafe)'}}
                        onClick={() => setDeleteId(l.id)}><I.Trash size={11} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 540}}>
            <div className="modal__head">
              <div>
                <div className="eyebrow">Edit listing</div>
                <h2 className="modal__title">{form.title || 'Untitled listing'}</h2>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setModal(null)}><I.X size={12} /></button>
            </div>
            <div className="form-grid">
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Photo</label>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                  style={{display: 'none'}} onChange={handleFileChange} />
                {form.photoUrl ? (
                  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <img src={form.photoUrl} alt="listing" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 6}} />
                    <button className="btn btn--ghost btn--sm"
                      onClick={() => { setForm(f => ({ ...f, photoUrl: null })); fileRef.current?.click() }}>
                      Change photo
                    </button>
                  </div>
                ) : (
                  <div>
                    <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}
                      disabled={photoUploading}>
                      {photoUploading ? 'Uploading…' : 'Upload photo'}
                    </button>
                    {photoError && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 4}}>{photoError}</p>}
                  </div>
                )}
              </div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Title</label>
                <input className="input" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Price per kg (₱)</label>
                <input className="input" inputMode="decimal" value={form.pricePerKg ?? ''} onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Min order qty (kg)</label>
                <input className="input" inputMode="decimal" value={form.minQtyKg ?? ''} onChange={e => setForm(f => ({ ...f, minQtyKg: e.target.value }))} />
              </div>
              <div className="form-row" style={{gridColumn: '1 / -1'}}>
                <label>Description (optional)</label>
                <textarea className="input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            {saveError && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 8}}>{saveError}</p>}
            <div className="modal__foot">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}
                disabled={updateMut.isPending || photoUploading}>
                {updateMut.isPending ? 'Saving…' : 'Save listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the app starts and the Storefront tab loads**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`, log in as a vendor, navigate to the Storefront tab. Expected: table with Title, Species, Price/kg, Min qty, Available, Status columns. No "New listing" button. Each row has Publish/Unpublish, Edit, and a trash Delete button.

- [ ] **Step 3: Test Edit modal**

Click Edit on a listing. Expected: modal shows Title, Price per kg, Min qty, Description textarea, and Photo section. Fill in a new price, click Save. Expected: listing updates and modal closes.

- [ ] **Step 4: Test Delete with confirm**

Click the trash icon on a listing. Expected: "Delete?" text + Confirm/Cancel appear inline. Click Confirm. Expected: listing removed from table.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/vendor/StorefrontEditor.jsx
git commit -m "feat(storefront): management-only page with fix edit/delete/available-kg"
```

---

## Task 7: Inventory.jsx — Duplicate guard + photo upload in ListForSaleModal

**Files:**
- Modify: `frontend/src/vendor/Inventory.jsx`

### Context
The current `ListForSaleModal` has no photo upload and no guard against listing an already-listed lot. We need to:
1. Fetch listings on the Inventory page (same `['vendor', 'storefront']` query key — cached, no extra network call if Storefront was visited).
2. Compute a `Set` of lot IDs already in any listing.
3. Show "Listed" chip + hide "List for sale" for those lots.
4. Add required photo upload + description field to the modal.

- [ ] **Step 1: Verify `lotIds` exists in StorefrontListingResponse**

Before writing frontend guard code, confirm the API returns `lotIds`:

```bash
grep -n "lotIds" backend/src/main/resources/openapi/api.yaml
```

Expected: line ~6542 shows `lotIds` in `StorefrontListingResponse` required array, and line ~6582 shows the property definition. If absent, the guard will be a silent no-op.

- [ ] **Step 2: Add useRef to the React import in Inventory.jsx**

Change line 1 of `Inventory.jsx`:
```js
import { useState } from 'react'
```
to:
```js
import { useState, useRef } from 'react'
```

**This must be done before Step 5 — `ListForSaleModal` uses `useRef`.**

- [ ] **Step 3: Add listings query and listed lot IDs set to the Inventory component**

In `Inventory.jsx`, add `listListings` and `uploadListingPhoto` to the storefront import:

```js
import { createListing, listListings, uploadListingPhoto } from './api/storefront'
```

Inside the `Inventory()` component function, after the existing `speciesQ` query, add:

```js
  const listingsQ = useQuery({
    queryKey: ['vendor', 'storefront'],
    queryFn:  listListings,
  })
  const listedLotIds = new Set(
    (listingsQ.data ?? []).flatMap(l => l.lotIds ?? [])
  )
```

- [ ] **Step 4: Update the lot row to show "Listed" chip when already listed**

Replace the "List for sale" cell (currently the last `<td>` in the row):

```jsx
                    <td style={{textAlign: 'right'}}>
                      {listedLotIds.has(l.id) ? (
                        <span className="chip">Listed</span>
                      ) : l.remainingKg > 0 ? (
                        <button className="btn btn--primary btn--sm" onClick={() => setListLot(l)}>
                          <I.Plus size={11} /> List for sale
                        </button>
                      ) : null}
                    </td>
```

- [ ] **Step 5: Replace ListForSaleModal with photo upload + description**

Replace the entire `ListForSaleModal` function with:

```jsx
function ListForSaleModal({ lot, onClose, onSubmit }) {
  const [photoUrl, setPhotoUrl]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoErr] = useState('')
  const [title, setTitle]         = useState(`${lot.speciesName} – Lot #${lot.id}`)
  const [price, setPrice]         = useState(lot.costPerKg ?? '')
  const [minQty, setMinQty]       = useState('0.5')
  const [desc, setDesc]           = useState('')
  const [submitting, setBusy]     = useState(false)
  const [error, setError]         = useState('')
  const fileRef = useRef(null)

  const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_MB   = 5 * 1024 * 1024

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoErr('')
    if (!ACCEPTED.includes(file.type)) { setPhotoErr('File must be JPEG, PNG, or WebP'); return }
    if (file.size > MAX_MB)            { setPhotoErr('File must be under 5 MB'); return }
    setUploading(true)
    try {
      const { url } = await uploadListingPhoto(file)
      setPhotoUrl(url)
    } catch {
      setPhotoErr('Upload failed — try again')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    const p = Number(price)
    const q = Number(minQty)
    if (!photoUrl)            { setError('A photo is required'); return }
    if (!title.trim())        { setError('Title is required'); return }
    if (!p || p <= 0)         { setError('Enter a valid price per kg'); return }
    if (!q || q < 0.1)        { setError('Min qty must be at least 0.1 kg'); return }
    setBusy(true)
    try {
      await onSubmit({
        speciesId:  lot.speciesId,
        title:      title.trim(),
        pricePerKg: p,
        minQtyKg:   q,
        description: desc || null,
        photoUrl,
        lotIds: [lot.id],
      })
    } catch (e) {
      setError(e?.message ?? 'Failed to create listing')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}
      style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000}}>
      <div className="card" onClick={e => e.stopPropagation()} style={{width: 'min(480px, 92vw)', padding: 22}}>
        <div className="card__head">
          <div>
            <div className="eyebrow">Lot #{lot.id} · {lot.remainingKg} kg available</div>
            <div className="card__title">List for sale</div>
            <div className="card__sub">Creates a storefront listing buyers can order from.</div>
          </div>
        </div>

        <div style={{marginTop: 14}}>
          <label style={{fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6}}>
            Photo <span style={{color: 'var(--unsafe)'}}>*</span>
          </label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            style={{display: 'none'}} onChange={handleFile} />
          {photoUrl ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <img src={photoUrl} alt="preview" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 6}} />
              <button className="btn btn--ghost btn--sm"
                onClick={() => { setPhotoUrl(null); fileRef.current?.click() }}>Change</button>
            </div>
          ) : (
            <div>
              <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}
                disabled={uploading} style={{width: '100%', padding: '20px 0'}}>
                {uploading ? 'Uploading…' : '📷 Drag & drop or click to select · JPEG, PNG, WebP · Max 5 MB'}
              </button>
              {photoError && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 4}}>{photoError}</p>}
            </div>
          )}
        </div>

        <div className="form-grid" style={{marginTop: 12}}>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Listing title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Selling price / kg (₱)</label>
            <input className="input" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
            {lot.costPerKg && <span style={{fontSize: 11, color: 'var(--muted)'}}>Cost: ₱{lot.costPerKg}/kg</span>}
          </div>
          <div className="form-row">
            <label>Min order qty (kg)</label>
            <input className="input" inputMode="decimal" value={minQty} onChange={e => setMinQty(e.target.value)} />
          </div>
          <div className="form-row" style={{gridColumn: '1 / -1'}}>
            <label>Description (optional)</label>
            <textarea className="input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
        </div>

        {error && <p style={{color: 'var(--unsafe)', fontSize: 12, marginTop: 8}}>{error}</p>}
        <div className="row" style={{marginTop: 18, gap: 8, justifyContent: 'flex-end'}}>
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn--primary" onClick={submit}
            disabled={submitting || !photoUrl || uploading}>
            {submitting ? 'Creating…' : 'Create listing'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify duplicate guard works**

In the browser, go to Inventory. Lots that already have a listing should show a "Listed" chip instead of the "List for sale" button.

- [ ] **Step 7: Verify photo upload in ListForSaleModal**

Click "List for sale" on an unlisted lot. Expected:
- Photo section at top with file picker
- "Create listing" button is disabled until a photo is uploaded
- After selecting a valid image, preview appears and button enables
- Filling in price and submitting creates the listing

- [ ] **Step 8: Commit**

```bash
git add frontend/src/vendor/Inventory.jsx
git commit -m "feat(inventory): duplicate guard + required photo upload in List for sale modal"
```

---

---

## Final Verification

- [ ] Run all backend tests: `cd backend && ./mvnw test` — all pass
- [ ] Run frontend lint: `cd frontend && npm run lint` — no errors
- [ ] Full flow smoke test:
  1. Complete a fisherman→vendor order → lot appears in Inventory
  2. Click "List for sale" → photo required, can't submit without it
  3. Upload photo → preview appears → fill price → Create listing
  4. Go to Storefront tab → listing appears with correct Available kg
  5. Edit the listing → change price → Save → price updates
  6. Click trash → confirm → listing gone
  7. Back to Inventory → lot now shows "Listed" chip, no "List for sale" button
  8. Try creating a second listing for same lot via API (e.g. Postman) → 409 ILLEGAL_STATE
