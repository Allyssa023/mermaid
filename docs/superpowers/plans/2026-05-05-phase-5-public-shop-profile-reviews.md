# Phase 5 — Public Shop Page + Shop Profile + Reviews

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Vendor edits a public-facing shop profile (logo, banner, hours, pickup pin, slug). Buyers land on `/shop/:vendorIdOrSlug` and see profile + storefront listings + reviews. Vendor sees incoming reviews and can reply.

**Spec reference:** §5.3 (V37), §9 Phase 5.

---

## File Structure

### New backend files

```
backend/src/main/resources/db/migration/V37__create_shop_profile.sql
backend/src/main/java/com/mermaid/app/domain/ShopProfile.java
backend/src/main/java/com/mermaid/app/repository/ShopProfileRepository.java
backend/src/main/java/com/mermaid/app/mapper/ShopProfileMapper.java
backend/src/main/java/com/mermaid/app/service/ShopProfileService.java
backend/src/main/java/com/mermaid/app/controller/VendorShopController.java
backend/src/main/java/com/mermaid/app/controller/PublicShopController.java
```

### Modified backend files

- `api.yaml` — `/vendor/shop/profile`, `/public/shop/{vendorIdOrSlug}`. Reuse existing `/buyer/reviews/**` and vendor read endpoints if present; if missing add `/vendor/reviews` (vendor-side incoming reviews + reply).
- Existing `Review` entity reused. If reply field doesn't exist, add nullable `vendor_reply TEXT` + `vendor_reply_at TIMESTAMPTZ` via a small migration appended to V37 or a separate V37b.

### New frontend files

```
frontend/src/vendor/ShopProfile.jsx
frontend/src/vendor/Reviews.jsx
frontend/src/vendor/api/shop.js
frontend/src/vendor/api/reviews.js
```

### Modified frontend files

- `frontend/src/buyer/PublicShop.jsx` — replace Phase 0 placeholder with real public shop page.
- `frontend/src/buyer/Marketplace.jsx` / `ListingDetail.jsx` — vendor-name links route to `/shop/:slug` (or vendorId) when a profile exists.

### Tests

```
backend/src/test/java/com/mermaid/app/service/ShopProfileServiceTest.java
backend/src/test/java/com/mermaid/app/controller/VendorShopControllerTest.java
backend/src/test/java/com/mermaid/app/controller/PublicShopControllerTest.java

frontend/src/vendor/__tests__/ShopProfile.test.jsx
frontend/src/buyer/__tests__/PublicShop.test.jsx
```

---

## Task 1: Worktree + baseline

- [ ] Branch `vendor-phase-5-public-shop-reviews`. Phase 4 merged.

## Task 2: V37 — `shop_profiles`

```sql
CREATE TABLE shop_profiles (
    id                  BIGSERIAL    PRIMARY KEY,
    vendor_id           BIGINT       NOT NULL UNIQUE REFERENCES users(id),
    slug                VARCHAR(50)  NOT NULL UNIQUE
        CONSTRAINT chk_slug_format CHECK (slug ~ '^[a-z][a-z0-9-]{2,49}$'),
    display_name        VARCHAR(80)  NOT NULL CHECK (char_length(display_name) >= 2),
    bio                 TEXT,
    logo_url            VARCHAR(500),
    banner_url          VARCHAR(500),
    hours_json          JSONB,
    pickup_location_id  BIGINT       REFERENCES market_locations(id),
    lat                 NUMERIC(9,6),
    lng                 NUMERIC(9,6),
    is_deleted          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_profiles_slug ON shop_profiles (slug) WHERE is_deleted = false;

-- Reviews vendor reply (idempotent guard)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_reply_at TIMESTAMPTZ;
```

## Task 3: Domain + repo + mapper

- [ ] `ShopProfile` entity. `@Type(JsonBinaryType.class)` or `@JdbcTypeCode(SqlTypes.JSON)` on `hoursJson` (string-typed `Map<String,Object>`).
- [ ] `ShopProfileRepository` — `findByVendorIdAndIsDeletedFalse`, `findBySlugAndIsDeletedFalse`, `existsBySlugAndIsDeletedFalse`.
- [ ] Mapper: `toVendorView` (full), `toPublicView` (excludes nothing sensitive — hours, slug, etc all public; no private fields exist on this entity).

## Task 4: `ShopProfileService`

```java
public interface ShopProfileService {
    ShopProfile getMine(Long vendorId);                  // create-on-first-read (lazy init)
    ShopProfile updateMine(Long vendorId, ShopProfileRequest req);
    PublicShopView getPublic(String idOrSlug);
}
```

- [ ] **Slug validation.** Java regex `Pattern.compile("^[a-z][a-z0-9-]{2,49}$")` — pre-DB to give a clean 400; uniqueness collision → catch DataIntegrityViolation → `IllegalArgumentException`.
- [ ] **`getPublic(idOrSlug)`** — try numeric parse; if int → `findByVendorId`; else → `findBySlug`. Return 404 via `ResourceNotFoundException` if missing.
- [ ] **`PublicShopView`** DTO — profile fields + active storefront listings (call `StorefrontListingService.listForBuyerMarketplace(vendorIdFilter=vendorId)`) + recent reviews summary (avg rating, count, last 10 reviews).
- [ ] **`updateMine`** — assert displayName length 2-80; slug regex; hoursJson optional shape `{ mon: "08-17", tue: ... }` (no schema enforcement — accept Map<String,Object>).

## Task 5: `api.yaml`

- `GET /vendor/shop/profile` (mine; auto-create on first read with default slug `vendor-{id}` and displayName from user record)
- `PUT /vendor/shop/profile`
- `GET /public/shop/{vendorIdOrSlug}` — public, no auth required (add to `SecurityConfig` permitAll list)
- `GET /vendor/reviews` — incoming reviews for current vendor
- `POST /vendor/reviews/{id}/reply` (body: text)
- Schemas: `ShopProfile`, `ShopProfileRequest`, `PublicShopView`, `ReviewWithReply`.
- Regenerate.

## Task 6: SecurityConfig — public route

- [ ] Add `"/api/public/shop/**"` to permitAll list. Verify path against current Spring Security config.

## Task 7: Controllers

- [ ] **`VendorShopController`** — `@PreAuthorize("hasRole('VENDOR')")`. GET/PUT.
- [ ] **`PublicShopController`** — no auth annotation. Single GET. Response includes profile + listings + reviews summary.
- [ ] **Reviews vendor side** — `@PreAuthorize("hasRole('VENDOR')")`; list reviews where `vendor_id = current`; reply endpoint sets `vendor_reply` + `vendor_reply_at` (only if not already replied — idempotency check or allow overwrite, decide: **allow overwrite** for simplicity; UI shows last edit time).

## Task 8: `ShopProfile.jsx`

- [ ] **Step 1: Layout.** Form: display name, slug (with availability check on blur via debounced GET), bio, logo upload, banner upload, hours grid (Mon-Sun start/end inputs), pickup location dropdown.
- [ ] **Step 2:** "Preview public page" button → opens `/shop/:slug` in new tab.
- [ ] **Step 3:** Slug input shows live validation against regex.

## Task 9: `Reviews.jsx`

- [ ] List incoming reviews (rating, text, buyer name, order id link, created_at). Reply textarea per review (existing reply shown if present, editable). "Post reply" button.

## Task 10: `PublicShop.jsx` (buyer-side)

**File:** `frontend/src/buyer/PublicShop.jsx` — replace Phase 0 placeholder.

- [ ] Route already wired in Phase 0: `/shop/:vendorIdOrSlug`.
- [ ] Layout: banner, logo + display name + avg rating, bio, hours table, pickup location pin (reuse Leaflet already in buyer codebase), storefront listings grid (links to `/buyer/listing/:id`), reviews list.
- [ ] No auth — accessible logged-out (verify route + Security permits).
- [ ] 404 state when slug not found.

## Task 11: Cross-link from buyer marketplace

- [ ] In `Marketplace.jsx` and `ListingDetail.jsx`, vendor-name display becomes a `<Link to={'/shop/' + (profile.slug || vendorId)}>`. Embed slug in listing DTO from backend so frontend doesn't need a second call (extend `BuyerListingDetail` mapper).

## Task 12: Tests

- [ ] `ShopProfileServiceTest` — slug regex enforcement (8 cases: too short, starts with digit, uppercase, valid, etc); duplicate slug → `IllegalArgumentException`; `getPublic` resolves both numeric id and slug; auto-create on first `getMine` call.
- [ ] `VendorShopControllerTest` — GET/PUT happy path + 401/403.
- [ ] `PublicShopControllerTest` — no-auth GET works (use `MockMvc` without JWT post-processor); 404 for missing.
- [ ] `ShopProfile.test.jsx` — slug input shows error for invalid format.
- [ ] `PublicShop.test.jsx` — renders profile + listings; 404 fallback rendered when API 404s.

## Task 13: Manual QA

- [ ] Vendor → Shop Profile → set slug `rosario-fish`, upload logo + banner, save.
- [ ] Open `/shop/rosario-fish` in incognito (logged out) → page renders profile + listings + reviews.
- [ ] Open `/shop/<vendorId>` → same page.
- [ ] Buyer leaves review on a completed order → vendor Reviews page shows it; vendor replies; refresh → buyer-side review shows the reply.
- [ ] Try slug `1invalid` (starts with digit) → 400.
- [ ] Try slug already taken → 400.

## Task 14: Verify + commit

- [ ] All tests green. `superpowers:verification-before-completion`.
- [ ] Commit:
  ```
  feat(vendor): phase 5 — public shop page + profile + reviews

  - V37: shop_profiles + reviews.vendor_reply / vendor_reply_at
  - ShopProfileService with slug regex (^[a-z][a-z0-9-]{2,49}$)
  - PublicShopController (no auth) at /public/shop/{idOrSlug}
  - Vendor ShopProfile.jsx + Reviews.jsx
  - Buyer PublicShop.jsx (replaces Phase 0 placeholder)
  - Marketplace/ListingDetail link vendor name to /shop/:slug

  Spec: §9 Phase 5
  ```

## Exit criteria

- [ ] Buyer can land on `/shop/:slug` (and `/shop/:vendorId`), see profile + listings + reviews — without login.
- [ ] Slug regex enforced; collision returns 400.
- [ ] Vendor can view incoming reviews and post a reply that buyer sees.
- [ ] Vendor preview matches public view.
