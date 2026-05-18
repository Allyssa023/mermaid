# Vendor Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 9 vendor pages (shell + 8 content pages) to the MERMAID v2 dark design system from `mermaid_vendor2/`, with 3 small backend additions (view count, species-series endpoint, buyer tier) and real data throughout — no mock data.

**Architecture:** `VendorDashboard.jsx` keeps its `useState`-based page switching (no React Router migration), gains a `[data-vendor-shell]` attribute, hover-expand rail via `onMouseEnter`/`onMouseLeave`, and GSAP page transitions. A new scoped `vendor-shell.css` mirrors `fisherman-shell.css` structure. Each content page is rewritten in place to match the `mermaid_vendor2/` designs using Recharts for charts.

**Tech Stack:** React 18, GSAP 3.15.0 (already installed), Recharts 3.8.1 (already installed), TanStack Query v5, Spring Boot (API-first via `api.yaml`), PostgreSQL + Flyway, JetBrains Mono / Space Grotesk / Rubik fonts.

---

## File Map

**New files:**
- `frontend/src/vendor/vendor-shell.css` — design tokens + shell layout + rail + topbar CSS, scoped via `[data-vendor-shell]`

**Modified — Backend:**
- `backend/src/main/resources/db/migration/V65__storefront_listing_view_count.sql` — new migration
- `backend/src/main/resources/openapi/api.yaml` — add `viewCount` to `StorefrontListingResponse`, add `tier` to `RepeatBuyer`, add `VendorSpeciesSeries` schema + `GET /vendor/analytics/species-series` path, add `GET /vendor/storefront/stats` path
- `backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java` — add `viewCount` column
- `backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java` — map `viewCount`
- `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java` — add `incrementViewCount(id)`, add `getStats(vendorId)`
- `backend/src/main/java/com/mermaid/app/controller/PublicShopController.java` — call `incrementViewCount` on listing GET
- `backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java` — implement `vendorGetStorefrontStats` (new generated method)
- `backend/src/main/java/com/mermaid/app/service/AnalyticsService.java` — add `getSpeciesSeries(vendorId, days)`, update `repeatBuyers()` to add `tier`
- `backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java` — implement `vendorSpeciesSeries` (new generated method)

**Modified — Frontend:**
- `frontend/src/vendor/VendorDashboard.jsx` — add `[data-vendor-shell]`, hover-rail, GSAP transitions, updated Rail + Topbar
- `frontend/src/vendor/api/analytics.js` — add `getSpeciesSeries(days)`, add `getStorefrontStats()`
- `frontend/src/vendor/api/storefront.js` — add `getStorefrontStats()`
- `frontend/src/vendor/Home.jsx` — full redesign
- `frontend/src/vendor/StorefrontEditor.jsx` — full redesign
- `frontend/src/vendor/Inventory.jsx` — full redesign
- `frontend/src/vendor/OrdersInbox.jsx` — full redesign
- `frontend/src/vendor/ProcurementFeed.jsx` — redesign (tabs preserved, restyled)
- `frontend/src/vendor/Messages.jsx` — full redesign
- `frontend/src/vendor/Analytics.jsx` — full redesign
- `frontend/src/vendor/Reviews.jsx` — full redesign
- `frontend/src/vendor/ShopProfile.jsx` — full redesign

**Modified — Tests:**
- `backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java` — add view count tests
- `backend/src/test/java/com/mermaid/app/service/AnalyticsServiceTest.java` — add species-series and tier tests
- `frontend/src/vendor/__tests__/Home.test.jsx` — add freshness timeline test
- `frontend/src/vendor/__tests__/Analytics.test.jsx` — add tier chip test
- `frontend/src/vendor/__tests__/ProcurementFeed.test.jsx` — add match% test (existing must still pass)

---

## Task 1: Flyway migration — add view_count to storefront_listings

**Files:**
- Create: `backend/src/main/resources/db/migration/V65__storefront_listing_view_count.sql`

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE storefront_listings ADD COLUMN view_count INT NOT NULL DEFAULT 0;
CREATE INDEX idx_storefront_listings_view_count
  ON storefront_listings(view_count DESC)
  WHERE is_deleted = false;
```

- [ ] **Step 2: Run backend to apply migration**

```bash
cd backend
./mvnw spring-boot:run
```
Expected: Flyway logs `Successfully applied 1 migration to schema "public"... V65`.

- [ ] **Step 3: Stop server and commit**

```bash
git add backend/src/main/resources/db/migration/V65__storefront_listing_view_count.sql
git commit -m "feat(db): add view_count column to storefront_listings (V65)"
```

---

## Task 2: Domain + mapper — wire view_count

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java`
- Modify: `backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java`

- [ ] **Step 1: Read the domain file**

Open `backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java`. Find the last field declaration before the `@PrePersist` / `@PreUpdate` block.

- [ ] **Step 2: Add field**

Add after the existing `updatedAt` field:
```java
@Column(name = "view_count", nullable = false)
private int viewCount = 0;
```
Also add a getter:
```java
public int getViewCount() { return viewCount; }
```
And setter:
```java
public void setViewCount(int viewCount) { this.viewCount = viewCount; }
```

- [ ] **Step 3: Read the mapper file**

Open `StorefrontListingMapper.java`. Find the `toResponse` or `toDto` method that builds `StorefrontListingResponse`.

- [ ] **Step 4: Map viewCount**

In the builder/setter chain that populates the DTO, add:
```java
.viewCount(listing.getViewCount())
```
(The generated `StorefrontListingResponse` won't have this field yet — that's added in Task 3. Come back to this setter after Task 3.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/StorefrontListing.java
git add backend/src/main/java/com/mermaid/app/mapper/StorefrontListingMapper.java
git commit -m "feat(domain): add viewCount field to StorefrontListing"
```

---

## Task 3: api.yaml additions — viewCount, tier, species-series, storefront-stats

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

This task adds all three schema additions and two new paths in one batch so `generate-sources` runs once cleanly.

- [ ] **Step 1: Add `viewCount` to `StorefrontListingResponse` schema**

Find the `StorefrontListingResponse` schema block (around line 6954). After `updatedAt`:
```yaml
        viewCount:
          type: integer
          description: Cumulative public shop view count
          default: 0
```

- [ ] **Step 2: Add `tier` to `RepeatBuyer` schema**

Find `RepeatBuyer:` schema. After `lastOrder`:
```yaml
        tier:
          type: string
          enum: [VIP, REGULAR, NEW]
          nullable: true
```

- [ ] **Step 3: Add `VendorSpeciesSeries` schema**

Find the `components: schemas:` block. Append a new schema entry (alphabetical order near other Vendor schemas):
```yaml
    VendorSpeciesSeriesItem:
      type: object
      required: [speciesId, commonName, localName, revenueShare, revenueDelta, lotsCount, pricePerKg, lastWindowRevenue, daily]
      properties:
        speciesId:
          type: integer
          format: int64
        commonName:
          type: string
        localName:
          type: string
        revenueShare:
          type: number
          format: float
          description: Revenue share 0..100 among vendor's top species
        revenueDelta:
          type: number
          format: float
          description: % change vs prior window of equal length
        lotsCount:
          type: integer
        pricePerKg:
          type: number
          format: double
        lastWindowRevenue:
          type: number
          format: double
        daily:
          type: array
          items:
            type: object
            required: [date, revenue, qtyKg]
            properties:
              date:
                type: string
                format: date
              revenue:
                type: number
                format: double
              qtyKg:
                type: number
                format: double

    StorefrontStats:
      type: object
      required: [totalViews, byListing]
      properties:
        totalViews:
          type: integer
          description: Cumulative total view count across all vendor listings
        byListing:
          type: array
          items:
            type: object
            required: [listingId, views]
            properties:
              listingId:
                type: integer
                format: int64
              views:
                type: integer
```

- [ ] **Step 4: Add `GET /vendor/analytics/species-series` path**

Find the analytics paths block (near `/vendor/analytics/repeat-buyers`). Insert:
```yaml
  /vendor/analytics/species-series:
    get:
      tags: [Vendor Analytics]
      operationId: vendorSpeciesSeries
      summary: Per-species daily revenue series (top 3 species)
      security: [{bearerAuth: []}]
      parameters:
        - name: days
          in: query
          schema:
            type: integer
            default: 30
            minimum: 7
            maximum: 365
      responses:
        '200':
          description: Species series data
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/VendorSpeciesSeriesItem'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

- [ ] **Step 5: Add `GET /vendor/storefront/stats` path**

Find the storefront paths block (near `/vendor/storefront/listings`). Insert:
```yaml
  /vendor/storefront/stats:
    get:
      tags: [Vendor Storefront]
      operationId: vendorGetStorefrontStats
      summary: Aggregate view-count stats for vendor's listings
      security: [{bearerAuth: []}]
      responses:
        '200':
          description: Storefront stats
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StorefrontStats'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

- [ ] **Step 6: Regenerate sources**

```bash
cd backend
./mvnw generate-sources
```
Expected: BUILD SUCCESS. Verify new interface methods exist:
```bash
grep -r "vendorSpeciesSeries\|vendorGetStorefrontStats" target/generated-sources/
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(api): add viewCount, tier, species-series, storefront-stats to api.yaml"
```

---

## Task 4: Service — incrementViewCount + getStorefrontStats

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java`

- [ ] **Step 1: Write failing tests first**

In `backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java`, add:
```java
@Test
void incrementViewCount_incrementsMonotonically() {
    StorefrontListing listing = new StorefrontListing();
    listing.setId(1L);
    listing.setViewCount(5);
    when(listingRepo.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(listing));
    when(listingRepo.save(any())).thenAnswer(i -> i.getArgument(0));

    service.incrementViewCount(1L);

    ArgumentCaptor<StorefrontListing> cap = ArgumentCaptor.forClass(StorefrontListing.class);
    verify(listingRepo).save(cap.capture());
    assertThat(cap.getValue().getViewCount()).isEqualTo(6);
}

@Test
void incrementViewCount_silentlyIgnoresMissingId() {
    when(listingRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.empty());
    assertDoesNotThrow(() -> service.incrementViewCount(99L));
    verify(listingRepo, never()).save(any());
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
./mvnw test -Dtest=StorefrontListingServiceTest#incrementViewCount_incrementsMonotonically -pl .
```
Expected: FAIL (method doesn't exist yet).

- [ ] **Step 3: Implement incrementViewCount**

In `StorefrontListingService.java`, add:
```java
@Transactional
public void incrementViewCount(Long listingId) {
    listingRepo.findByIdAndIsDeletedFalse(listingId).ifPresent(l -> {
        l.setViewCount(l.getViewCount() + 1);
        listingRepo.save(l);
    });
}
```

- [ ] **Step 4: Implement getStorefrontStats**

```java
@Transactional(readOnly = true)
public Map<String, Object> getStorefrontStats(Long vendorId) {
    List<StorefrontListing> listings = listingRepo.findByVendorIdAndIsDeletedFalse(vendorId);
    int totalViews = listings.stream().mapToInt(StorefrontListing::getViewCount).sum();
    List<Map<String, Object>> byListing = listings.stream()
        .map(l -> { Map<String,Object> m = new LinkedHashMap<>();
                    m.put("listingId", l.getId());
                    m.put("views", l.getViewCount());
                    return m; })
        .toList();
    return Map.of("totalViews", totalViews, "byListing", byListing);
}
```

- [ ] **Step 5: Run all service tests**

```bash
./mvnw test -Dtest=StorefrontListingServiceTest
```
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/StorefrontListingService.java
git add backend/src/test/java/com/mermaid/app/service/StorefrontListingServiceTest.java
git commit -m "feat(service): add incrementViewCount and getStorefrontStats"
```

---

## Task 5: Controller — wire viewCount increment + storefront stats endpoint

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/controller/PublicShopController.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java`

- [ ] **Step 1: Read PublicShopController**

Find the method that handles `GET /shop/{slug}/listings/{id}` (the public listing detail). It likely calls `storefrontListingService.getPublicListing(id)` or similar.

- [ ] **Step 2: Call incrementViewCount**

Before returning the listing DTO, add:
```java
storefrontListingService.incrementViewCount(id);
```

- [ ] **Step 3: Implement vendorGetStorefrontStats in VendorStorefrontController**

The generated interface `VendorStorefrontApi` will now have a `vendorGetStorefrontStats()` method. Add the implementation:
```java
@Override
public ResponseEntity<StorefrontStats> vendorGetStorefrontStats() {
    Long vendorId = SecurityUtils.currentUserId();
    Map<String, Object> data = storefrontListingService.getStorefrontStats(vendorId);
    int totalViews = ((Number) data.get("totalViews")).intValue();
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> byListingRaw = (List<Map<String, Object>>) data.get("byListing");
    List<StorefrontStatsByListing> byListing = byListingRaw.stream().map(m -> {
        StorefrontStatsByListing item = new StorefrontStatsByListing();
        item.setListingId(((Number) m.get("listingId")).longValue());
        item.setViews(((Number) m.get("views")).intValue());
        return item;
    }).toList();
    StorefrontStats dto = new StorefrontStats(totalViews, byListing);
    return ResponseEntity.ok(dto);
}
```
> Note: `StorefrontStatsByListing` is the inner DTO generated from the `byListing` array schema. Check the generated class name in `target/generated-sources/` and adjust if needed.

- [ ] **Step 4: Build to confirm compilation**

```bash
cd backend
./mvnw clean package -DskipTests
```
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/PublicShopController.java
git add backend/src/main/java/com/mermaid/app/controller/VendorStorefrontController.java
git commit -m "feat(controller): wire view count increment and storefront stats endpoint"
```

---

## Task 6: Species-series service + endpoint

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/service/AnalyticsService.java`
- Modify: `backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java`
- Modify: `backend/src/test/java/com/mermaid/app/service/AnalyticsServiceTest.java`

- [ ] **Step 1: Write failing tests**

Add to `AnalyticsServiceTest`:
```java
@Test
void speciesSeries_fillsMissingDaysWithZero() {
    // Seed: vendor 1L has one COMPLETED order on day 1, species 10L
    // Days window: 3
    // Expected daily array has 3 entries; days with no orders have revenue=0, qtyKg=0
    List<Map<String,Object>> series = analyticsService.getSpeciesSeries(1L, 3);
    // At least one series entry
    assertThat(series).isNotEmpty();
    Map<String,Object> top = series.get(0);
    @SuppressWarnings("unchecked")
    List<?> daily = (List<?>) top.get("daily");
    assertThat(daily).hasSize(3);
}

@Test
void speciesSeries_revenueDelta_priorWindowZero_returnsPlus100() {
    // Seed: vendor 1L has a COMPLETED order today for species 10L, but NO orders in
    // the prior window (which spans from 2×days ago to days ago).
    // Call with days=365 so the prior window predates any test data.
    // The service rule: if priorRevenue == 0 and currentRevenue > 0, delta = 100.
    List<Map<String,Object>> series = analyticsService.getSpeciesSeries(1L, 365);
    assertThat(series).isNotEmpty();
    double delta = ((Number) series.get(0).get("revenueDelta")).doubleValue();
    assertThat(delta).isEqualTo(100.0);
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
./mvnw test -Dtest=AnalyticsServiceTest#speciesSeries_fillsMissingDaysWithZero
```
Expected: FAIL.

- [ ] **Step 3: Implement getSpeciesSeries**

Add to `AnalyticsService`:
```java
@Transactional(readOnly = true)
public List<Map<String, Object>> getSpeciesSeries(Long vendorId, int days) {
    OffsetDateTime now    = OffsetDateTime.now(ZoneOffset.UTC);
    OffsetDateTime start  = now.minusDays(days);
    OffsetDateTime priorStart = now.minusDays(days * 2L);

    List<Order> currentOrders = orderRepo.findCompletedByVendorAndKindInRange(
            vendorId, OrderKind.RETAIL, start, now);
    List<Order> priorOrders = orderRepo.findCompletedByVendorAndKindInRange(
            vendorId, OrderKind.RETAIL, priorStart, start);

    // Group current orders by species
    Map<Long, List<Order>> bySpeciesCurrent = currentOrders.stream()
        .filter(o -> o.getSpecies() != null)
        .collect(Collectors.groupingBy(o -> o.getSpecies().getId()));

    // Top 3 species by current revenue
    List<Long> top3 = bySpeciesCurrent.entrySet().stream()
        .sorted(Comparator.comparingDouble((Map.Entry<Long, List<Order>> e) ->
            e.getValue().stream()
                .filter(o -> o.getAgreedPricePerKg() != null && o.getOrderedQtyKg() != null)
                .mapToDouble(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()).doubleValue())
                .sum()
        ).reversed())
        .limit(3)
        .map(Map.Entry::getKey)
        .toList();

    double totalRevenue = bySpeciesCurrent.values().stream()
        .flatMap(List::stream)
        .filter(o -> o.getAgreedPricePerKg() != null && o.getOrderedQtyKg() != null)
        .mapToDouble(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()).doubleValue())
        .sum();

    // Build date spine: days entries from (now - days) to now
    List<LocalDate> spine = new ArrayList<>();
    for (int i = 0; i < days; i++) {
        spine.add(start.toLocalDate().plusDays(i));
    }

    List<Map<String, Object>> result = new ArrayList<>();
    for (Long speciesId : top3) {
        List<Order> ords = bySpeciesCurrent.get(speciesId);
        String commonName = ords.get(0).getSpecies().getCommonName();
        String localName  = ords.get(0).getSpecies().getLocalName() != null
                            ? ords.get(0).getSpecies().getLocalName() : commonName;

        double speciesRevenue = ords.stream()
            .filter(o -> o.getAgreedPricePerKg() != null && o.getOrderedQtyKg() != null)
            .mapToDouble(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()).doubleValue())
            .sum();
        double revenueShare = totalRevenue > 0 ? (speciesRevenue / totalRevenue * 100) : 0;

        // Prior window revenue for this species
        double priorRevenue = priorOrders.stream()
            .filter(o -> o.getSpecies() != null && o.getSpecies().getId().equals(speciesId)
                      && o.getAgreedPricePerKg() != null && o.getOrderedQtyKg() != null)
            .mapToDouble(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()).doubleValue())
            .sum();
        double revenueDelta = priorRevenue > 0
            ? (speciesRevenue - priorRevenue) / priorRevenue * 100
            : (speciesRevenue > 0 ? 100 : 0);

        // Group orders by day
        Map<LocalDate, List<Order>> byDay = ords.stream()
            .filter(o -> o.getCompletedAt() != null)
            .collect(Collectors.groupingBy(o -> o.getCompletedAt().toLocalDate()));

        // Build daily series with zero-fill for missing days
        List<Map<String, Object>> daily = spine.stream().map(date -> {
            List<Order> dayOrds = byDay.getOrDefault(date, List.of());
            double rev = dayOrds.stream()
                .filter(o -> o.getAgreedPricePerKg() != null && o.getOrderedQtyKg() != null)
                .mapToDouble(o -> o.getAgreedPricePerKg().multiply(o.getOrderedQtyKg()).doubleValue())
                .sum();
            double qty = dayOrds.stream()
                .filter(o -> o.getOrderedQtyKg() != null)
                .mapToDouble(o -> o.getOrderedQtyKg().doubleValue())
                .sum();
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("date", date.toString());
            d.put("revenue", rev);
            d.put("qtyKg", qty);
            return d;
        }).collect(Collectors.toList());

        double avgPrice = ords.stream()
            .filter(o -> o.getAgreedPricePerKg() != null)
            .mapToDouble(o -> o.getAgreedPricePerKg().doubleValue())
            .average().orElse(0);

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("speciesId",         speciesId);
        entry.put("commonName",         commonName);
        entry.put("localName",          localName);
        entry.put("revenueShare",       revenueShare);
        entry.put("revenueDelta",       revenueDelta);
        entry.put("lotsCount",          ords.size());
        entry.put("pricePerKg",         avgPrice);
        entry.put("lastWindowRevenue",  speciesRevenue);
        entry.put("daily",              daily);
        result.add(entry);
    }
    return result;
}
```

- [ ] **Step 4: Update repeatBuyers to add tier**

In `AnalyticsService`, add a private helper:
```java
private String deriveTier(int orderCount) {
    if (orderCount >= 10) return "VIP";
    if (orderCount >= 3)  return "REGULAR";
    return "NEW";
}
```

In `repeatBuyers()`, in the loop that builds each `entry` map, add:
```java
entry.put("tier", deriveTier(orderCount));
```

- [ ] **Step 5: Write tier test**

```java
@Test
void repeatBuyers_derivesTierCorrectly() {
    // Create 3 buyers with 10, 3, 1 orders each in test data
    // Then call repeatBuyers and verify tier values
    // (Adapt to match existing test setup in AnalyticsServiceTest)
    assertThat(analyticsService.deriveTierPublic(10)).isEqualTo("VIP");
    assertThat(analyticsService.deriveTierPublic(3)).isEqualTo("REGULAR");
    assertThat(analyticsService.deriveTierPublic(1)).isEqualTo("NEW");
}
```
> If `deriveTier` is private, make it package-private (`String deriveTier(...)`) for testing.

- [ ] **Step 6: Implement vendorSpeciesSeries in controller**

In `VendorAnalyticsController`, add:
```java
@Override
public ResponseEntity<List<VendorSpeciesSeriesItem>> vendorSpeciesSeries(Integer days) {
    Long vendorId = SecurityUtils.currentUserId();
    int d = days != null ? days : 30;
    List<Map<String, Object>> data = analyticsService.getSpeciesSeries(vendorId, d);
    List<VendorSpeciesSeriesItem> dtos = data.stream().map(m -> {
        VendorSpeciesSeriesItem item = new VendorSpeciesSeriesItem();
        item.setSpeciesId(((Number) m.get("speciesId")).longValue());
        item.setCommonName((String) m.get("commonName"));
        item.setLocalName((String) m.get("localName"));
        item.setRevenueShare(((Number) m.get("revenueShare")).floatValue());
        item.setRevenueDelta(((Number) m.get("revenueDelta")).floatValue());
        item.setLotsCount(((Number) m.get("lotsCount")).intValue());
        item.setPricePerKg(((Number) m.get("pricePerKg")).doubleValue());
        item.setLastWindowRevenue(((Number) m.get("lastWindowRevenue")).doubleValue());
        @SuppressWarnings("unchecked")
        List<Map<String,Object>> rawDaily = (List<Map<String,Object>>) m.get("daily");
        item.setDaily(rawDaily.stream().map(d2 -> {
            VendorSpeciesSeriesItemDailyInner pt = new VendorSpeciesSeriesItemDailyInner();
            pt.setDate(java.time.LocalDate.parse((String) d2.get("date")));
            pt.setRevenue(((Number) d2.get("revenue")).doubleValue());
            pt.setQtyKg(((Number) d2.get("qtyKg")).doubleValue());
            return pt;
        }).toList());
        return item;
    }).toList();
    return ResponseEntity.ok(dtos);
}
```
> The exact generated class names (`VendorSpeciesSeriesItemDailyInner` etc.) depend on the generator. Check `target/generated-sources/openapi/src/main/java/com/mermaid/app/model/` and adjust accordingly.

- [ ] **Step 7: Build and run tests**

```bash
cd backend
./mvnw clean package
./mvnw test -Dtest=AnalyticsServiceTest
```
Expected: All PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/AnalyticsService.java
git add backend/src/main/java/com/mermaid/app/controller/VendorAnalyticsController.java
git add backend/src/test/java/com/mermaid/app/service/AnalyticsServiceTest.java
git commit -m "feat(analytics): add species-series endpoint and buyer tier derivation"
```

---

## Task 7: Frontend API modules — new fetchers

**Files:**
- Modify: `frontend/src/vendor/api/analytics.js`
- Modify: `frontend/src/vendor/api/storefront.js`

- [ ] **Step 1: Add getSpeciesSeries to analytics.js**

```js
export const getSpeciesSeries = (days = 30) =>
  apiGet(`/vendor/analytics/species-series?days=${days}`)
```

- [ ] **Step 2: Add getStorefrontStats to storefront.js**

```js
export const getStorefrontStats = () => apiGet('/vendor/storefront/stats')
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/vendor/api/analytics.js frontend/src/vendor/api/storefront.js
git commit -m "feat(frontend/api): add getSpeciesSeries and getStorefrontStats fetchers"
```

---

## Task 8: vendor-shell.css

**Files:**
- Create: `frontend/src/vendor/vendor-shell.css`

- [ ] **Step 1: Create the file**

The CSS is scoped via `[data-vendor-shell]` and mirrors `fisherman-shell.css` exactly, with these additions: `--tide`, `--tide-soft`, `--kelp`, `--kelp-soft`, `--coral`, `--coral-soft`, `--font-mono` (JetBrains Mono). Copy the fisherman shell structure and replace every `[data-fisherman-shell]` selector with `[data-vendor-shell]` and every `.f-rail` class with `.v-rail`.

```css
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

[data-vendor-shell] {
  --bg-app:              #0e0820;
  --bg-canvas:           #1f1633;
  --bg-card:             #1a1230;
  --bg-card-2:           #221940;
  --bg-card-3:           #2a2050;
  --bg-elev:             rgba(255,255,255,0.04);
  --bg-input:            rgba(255,255,255,0.04);
  --hairline:            rgba(255,255,255,0.08);
  --hairline-2:          rgba(255,255,255,0.05);
  --hairline-violet:     #362d59;
  --ink-1:               #ffffff;
  --ink-2:               rgba(255,255,255,0.78);
  --ink-3:               rgba(255,255,255,0.56);
  --ink-4:               rgba(255,255,255,0.38);
  --ink-5:               rgba(255,255,255,0.22);
  --safe:                #6ee7b7;
  --safe-soft:           rgba(110,231,183,0.12);
  --caution:             #fcd34d;
  --caution-soft:        rgba(252,211,77,0.12);
  --unsafe:              #fb7185;
  --unsafe-soft:         rgba(251,113,133,0.12);
  --accent-lime:         #c2ef4e;
  --accent-soft:         rgba(194,239,78,0.12);
  --accent-violet:       #6a5fc1;
  --accent-violet-deep:  #422082;
  --accent-violet-mid:   #79628c;
  --accent-pink:         #fa7faa;
  /* vendor marine extensions */
  --tide:                #5ec8e6;
  --tide-soft:           rgba(94,200,230,0.14);
  --kelp:                #46d39a;
  --kelp-soft:           rgba(70,211,154,0.16);
  --coral:               #ff8a6b;
  --coral-soft:          rgba(255,138,107,0.16);
  --rail-w:              76px;
  --rail-w-open:         256px;
  --font-display:        'Space Grotesk', 'Rubik', system-ui, sans-serif;
  --font-ui:             'Rubik', system-ui, sans-serif;
  --font-mono:           'JetBrains Mono', 'Monaco', 'Menlo', monospace;
  --font-code:           var(--font-mono);
  --paper-2:             rgba(106,95,193,0.15);
}

/* Shell layout */
[data-vendor-shell] {
  display: grid;
  grid-template-columns: var(--rail-w) 1fr;
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(94,200,230,0.10), transparent 60%),
    radial-gradient(ellipse 60% 50% at 90% 30%, rgba(66,32,130,0.18), transparent 60%),
    var(--bg-app);
  color: var(--ink-1);
  font-family: var(--font-ui);
  overflow: hidden;
  transition: grid-template-columns 200ms ease-out;
  -webkit-font-smoothing: antialiased;
}
[data-vendor-shell][data-rail-open="true"] {
  grid-template-columns: var(--rail-w-open) 1fr;
}

/* Rail */
.v-rail {
  position: sticky; top: 0; height: 100vh;
  width: var(--rail-w);
  overflow: hidden;
  display: flex; flex-direction: column;
  border-right: 1px solid var(--hairline);
  background: rgba(14,8,32,0.85);
  backdrop-filter: blur(12px);
  transition: width 250ms ease;
  z-index: 10;
  flex-shrink: 0;
}
[data-vendor-shell][data-rail-open="true"] .v-rail {
  width: var(--rail-w-open);
}

/* Rail brand/logo */
.v-rail__brand {
  display: flex; align-items: center; gap: 10px;
  padding: 20px 16px 16px;
  min-height: 64px;
  flex-shrink: 0;
}
.v-rail__mark {
  width: 32px; height: 32px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-lime);
  border-radius: 8px;
  font-family: var(--font-display); font-size: 15px; font-weight: 700;
  color: #0e0820;
}
.v-rail__wordmark {
  opacity: 0;
  white-space: nowrap;
  transition: opacity 80ms ease 0ms;
  display: flex; flex-direction: column; gap: 1px;
}
[data-vendor-shell][data-rail-open="true"] .v-rail__wordmark {
  opacity: 1;
  transition: opacity 100ms ease 200ms;
}
.v-rail__name {
  font-family: var(--font-display); font-size: 12px; font-weight: 700;
  letter-spacing: 0.08em; color: var(--ink-1);
}
.v-rail__role {
  font-size: 10px; color: var(--ink-3); letter-spacing: 0.03em;
}

/* Nav items */
.v-rail__items {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 8px 0;
}
.v-rail-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 22px;
  cursor: pointer;
  border-radius: 0;
  color: var(--ink-3);
  transition: color 150ms, background 150ms;
  position: relative;
  white-space: nowrap;
  min-height: 40px;
}
.v-rail-item:hover { color: var(--ink-1); background: var(--bg-elev); }
.v-rail-item--on {
  color: var(--accent-lime);
  background: var(--accent-soft);
  box-shadow: inset 3px 0 0 var(--accent-lime);
}

/* Icon slot — always 32px, centred in the 76px collapsed rail */
.v-rail-item__icon {
  width: 32px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}

/* Label — hidden when collapsed */
.v-rail-item__label {
  font-size: 13px; font-weight: 500; flex: 1;
  opacity: 0; transition: opacity 80ms ease 0ms;
}
[data-vendor-shell][data-rail-open="true"] .v-rail-item__label {
  opacity: 1;
  transition: opacity 100ms ease 200ms;
}

/* Badge dot (collapsed) */
.v-rail-item__dot {
  position: absolute; top: 7px; right: 16px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-lime);
}
[data-vendor-shell][data-rail-open="true"] .v-rail-item__dot {
  display: none;
}

/* Badge pill (expanded) */
.v-rail-item__pill {
  display: none;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-lime);
  font-size: 10px; font-weight: 600;
  font-family: var(--font-mono);
}
[data-vendor-shell][data-rail-open="true"] .v-rail-item__pill {
  display: inline-flex; align-items: center;
}

/* Rail user card */
.v-rail__bottom {
  padding: 12px 14px; flex-shrink: 0;
  border-top: 1px solid var(--hairline);
}
.v-rail__user {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; border-radius: 8px;
  padding: 6px 4px;
  transition: background 150ms;
}
.v-rail__user:hover { background: var(--bg-elev); }
.v-rail__avatar {
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-violet);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
}
.v-rail__user-info {
  opacity: 0; white-space: nowrap;
  transition: opacity 80ms ease 0ms;
  display: flex; flex-direction: column; gap: 1px;
}
[data-vendor-shell][data-rail-open="true"] .v-rail__user-info {
  opacity: 1; transition: opacity 100ms ease 200ms;
}
.v-rail__user-name { font-size: 12px; font-weight: 600; color: var(--ink-1); }
.v-rail__user-role { font-size: 10px; color: var(--ink-4); }

/* Main area */
.v-main {
  display: flex; flex-direction: column;
  min-height: 100vh; overflow: hidden;
}

/* Topbar */
.v-topbar {
  height: 56px; flex-shrink: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 0 24px;
  border-bottom: 1px solid var(--hairline);
  background: rgba(14,8,32,0.70);
  backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 5;
}
.v-crumbs {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px;
}
.v-crumbs span { color: var(--ink-3); }
.v-crumbs .sep { color: var(--ink-5); }
.v-crumbs strong { color: var(--ink-1); font-weight: 600; }
.v-topbar__spacer { flex: 1; }
.v-topbar__icon-btn {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: transparent; border: none; cursor: pointer;
  color: var(--ink-3); transition: color 150ms, background 150ms;
}
.v-topbar__icon-btn:hover { color: var(--ink-1); background: var(--bg-elev); }

/* Page content scroll area */
.v-page {
  flex: 1; overflow-y: auto;
  padding: 24px;
}

/* Shared panel / card primitives */
.v-panel {
  background: var(--bg-card);
  border: 1px solid var(--hairline);
  border-radius: 14px;
  padding: 20px;
}
.v-panel--elevated {
  background: var(--bg-card-2);
  border-color: var(--hairline-violet);
}
.v-kpi-strip {
  display: grid;
  gap: 12px;
}
.v-kpi-cell {
  background: var(--bg-card);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.v-kpi-cell__label {
  font-size: 11px; font-weight: 500; color: var(--ink-4);
  letter-spacing: 0.04em; text-transform: uppercase;
}
.v-kpi-cell__value {
  font-family: var(--font-display); font-size: 22px; font-weight: 700;
  color: var(--ink-1); letter-spacing: -0.02em;
}
.v-kpi-cell__sub { font-size: 11px; color: var(--ink-3); }

/* Page header */
.v-page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 20px;
}
.v-page-header__title {
  font-family: var(--font-display); font-size: 26px; font-weight: 700;
  color: var(--ink-1); letter-spacing: -0.02em;
}
.v-page-header__title em { color: var(--accent-lime); font-style: normal; }
.v-page-header__sub { font-size: 13px; color: var(--ink-3); margin-top: 2px; }
.v-page-header__actions { display: flex; gap: 8px; align-items: center; }

/* Buttons */
.v-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  border: none; cursor: pointer; transition: background 150ms, color 150ms;
}
.v-btn--primary {
  background: var(--accent-lime); color: #0e0820;
}
.v-btn--primary:hover { background: #d4f46a; }
.v-btn--ghost {
  background: var(--bg-elev); color: var(--ink-2);
  border: 1px solid var(--hairline);
}
.v-btn--ghost:hover { background: var(--bg-card-2); color: var(--ink-1); }
.v-btn--sm { padding: 5px 10px; font-size: 12px; }

/* Status chips */
.v-chip {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
}
.v-chip--lime  { background: var(--accent-soft);   color: var(--accent-lime); }
.v-chip--tide  { background: var(--tide-soft);     color: var(--tide); }
.v-chip--kelp  { background: var(--kelp-soft);     color: var(--kelp); }
.v-chip--coral { background: var(--coral-soft);    color: var(--coral); }
.v-chip--muted { background: var(--bg-elev);       color: var(--ink-3); }
.v-chip--caution { background: var(--caution-soft); color: var(--caution); }
.v-chip--unsafe  { background: var(--unsafe-soft);  color: var(--unsafe); }

/* Tab strip */
.v-tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 16px;
}
.v-tab {
  padding: 8px 14px;
  font-size: 13px; font-weight: 500; color: var(--ink-3);
  border: none; background: transparent; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 150ms, border-color 150ms;
}
.v-tab:hover { color: var(--ink-1); }
.v-tab--on { color: var(--accent-lime); border-bottom-color: var(--accent-lime); }

/* Table */
.v-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.v-table th {
  text-align: left; padding: 8px 12px;
  font-size: 11px; font-weight: 600; color: var(--ink-4);
  letter-spacing: 0.04em; text-transform: uppercase;
  border-bottom: 1px solid var(--hairline);
}
.v-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--hairline-2);
  color: var(--ink-2);
}
.v-table tr:last-child td { border-bottom: none; }
.v-table tr:hover td { background: var(--bg-elev); }

/* Mono data values */
.v-mono { font-family: var(--font-mono); }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/vendor/vendor-shell.css
git commit -m "feat(vendor): add vendor-shell.css design tokens and shell layout"
```

---

## Task 9: VendorDashboard.jsx — shell rework

**Files:**
- Modify: `frontend/src/vendor/VendorDashboard.jsx`

Rewrite the shell to add `[data-vendor-shell]`, hover-expand rail, GSAP page transitions, updated `Rail` and `Topbar` components. The existing payment-return and messages routing `useEffect`s must be preserved exactly.

- [ ] **Step 1: Import additions**

Read the current import block at the top of `VendorDashboard.jsx`. Confirm that `useLocation`, `useNavigate` are already imported from `'react-router-dom'` — they must stay. Then add the following if not already present:
```js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'   // KEEP — required by existing useEffects
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import '../design-system.css'
import './vendor-shell.css'
import { getVendorHome } from './api/home'
```
Remove the old `import { I } from '../icons'` if it's only used in the old Rail/Topbar (keep if pages also use it — check).

- [ ] **Step 2: Replace Rail component**

Replace the entire `Rail` function with:
```jsx
function Rail({ page, navigate, user, onLogout, badgeCounts }) {
  const initials = user
    ? (user.fullName || user.first || 'V').slice(0, 1) +
      ((user.fullName || '').split(' ')[1]?.slice(0, 1) || '')
    : 'V'
  const displayName = user?.first || user?.fullName?.split(' ')[0] || 'Vendor'
  const displaySub  = user?.businessName || user?.business || 'Vendor'

  return (
    <nav className="v-rail">
      <div className="v-rail__brand">
        <div className="v-rail__mark">M</div>
        <div className="v-rail__wordmark">
          <span className="v-rail__name">MERMAID</span>
          <span className="v-rail__role">Vendor console</span>
        </div>
      </div>

      <div className="v-rail__items">
        {VENDOR_NAV_ITEMS.map(it => {
          const Icon = I[it.icon]
          const badge = badgeCounts?.[it.id]
          return (
            <div
              key={it.id}
              className={`v-rail-item${page === it.id ? ' v-rail-item--on' : ''}`}
              onClick={() => navigate(it.id)}
              title={it.label}
            >
              <span className="v-rail-item__icon"><Icon size={17} /></span>
              <span className="v-rail-item__label">{it.label}</span>
              {badge > 0 && <span className="v-rail-item__dot" />}
              {badge > 0 && <span className="v-rail-item__pill">{badge}</span>}
            </div>
          )
        })}
      </div>

      <div className="v-rail__bottom">
        <div className="v-rail__user" onClick={onLogout} title="Log out">
          <div className="v-rail__avatar">{initials}</div>
          <div className="v-rail__user-info">
            <span className="v-rail__user-name">{displayName}</span>
            <span className="v-rail__user-role">VENDOR · {displaySub}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Replace Topbar component**

```jsx
function Topbar({ page }) {
  const label = PAGE_LABELS[page] || page
  return (
    <div className="v-topbar">
      <div className="v-crumbs">
        <span>Mermaid</span>
        <span className="sep"> / </span>
        <span>Vendor</span>
        <span className="sep"> / </span>
        <strong>{label}</strong>
      </div>
      <div className="v-topbar__spacer" />
    </div>
  )
}
```

- [ ] **Step 4: Rewrite VendorDashboard default export**

Replace the `VendorDashboard` function body (preserve all existing `useEffect`s verbatim):
```jsx
export default function VendorDashboard({ user, onLogout }) {
  const [page, setPage] = useState('vdashboard')
  const [pageState, setPageState] = useState(null)
  const [railOpen, setRailOpen] = useState(false)
  const pageRef = useRef(null)
  const location = useLocation()
  const routerNavigate = useNavigate()

  // Shell-level home data for rail badges
  const homeQ = useQuery({
    queryKey: ['vendor-home'],
    queryFn: getVendorHome,
    staleTime: 60_000,
  })
  const home = homeQ.data
  const badgeCounts = {
    vinventory:   home?.lots?.length ?? 0,
    vorders:      (home?.openOrders?.new ?? 0) + (home?.openOrders?.preparing ?? 0),
    vprocurement: home?.recentMatchedCatchAlerts?.length ?? 0,
    vmessages:    home?.unreadMessageCount ?? 0,
  }

  // === PRESERVE THESE TWO useEffects EXACTLY ===
  useEffect(() => {
    if (location.pathname.startsWith('/vendor/messages') && page !== 'vmessages') {
      setPage('vmessages')
      setPageState(null)
    }
  }, [location.pathname, page])

  useEffect(() => {
    if (location.pathname === '/payment/return') {
      const params = new URLSearchParams(location.search)
      const orderId = params.get('orderId')
      setPage('vprocurement')
      setPageState({ paymentReturnOrderId: orderId })
      routerNavigate('/', { replace: true })
    }
  }, [location.pathname])
  // === END PRESERVED EFFECTS ===

  const navigate = useCallback((id, state = null) => {
    if (id === page) return
    if (!pageRef.current) { setPage(id); setPageState(state); return }
    gsap.killTweensOf(pageRef.current)
    gsap.to(pageRef.current, {
      opacity: 0, duration: 0.12,
      onComplete: () => {
        setPage(id)
        setPageState(state)
        gsap.fromTo(pageRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        )
      }
    })
    if (id !== 'vmessages' && location.pathname.startsWith('/vendor/messages')) {
      routerNavigate('/', { replace: true })
    }
  }, [page, location.pathname, routerNavigate])

  return (
    <StompProvider>
      <div
        className="app"
        data-vendor-shell
        data-rail-open={String(railOpen)}
      >
        <Rail
          page={page}
          navigate={navigate}
          user={user}
          onLogout={onLogout}
          badgeCounts={badgeCounts}
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
        />
        <div className="v-main"
          onMouseEnter={() => setRailOpen(false)}
        >
          <Topbar page={page} />
          <div className="v-page" ref={pageRef}>
            <PageContent page={page} pageState={pageState} navigate={navigate} />
          </div>
        </div>
      </div>
    </StompProvider>
  )
}
```

> Note: `onMouseEnter`/`onMouseLeave` should be on the `<nav>` element inside `Rail`. Pass them as props and apply them there. The `v-main` div listens to `onMouseEnter` so that moving into the content area collapses the rail.

- [ ] **Step 5: Update Rail to apply hover handlers to the nav element**

In the `Rail` function signature, accept `{ ..., onMouseEnter, onMouseLeave }` and apply to the `<nav className="v-rail">` element.

- [ ] **Step 6: Smoke-test in browser**

Start the frontend dev server:
```bash
cd frontend && npm run dev
```
Log in as a vendor, verify the rail collapses to icons, hovers open, labels fade in with 200ms delay, and `--accent-lime` active pill appears on the current page.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/vendor/VendorDashboard.jsx
git commit -m "feat(vendor): add hover-expand rail and GSAP page transitions to VendorDashboard"
```

---

## Task 10: Dashboard page (Home.jsx)

**Files:**
- Modify: `frontend/src/vendor/Home.jsx`

The Dashboard is the most complex page. Read `frontend/src/vendor/Home.jsx` in full before modifying.

- [ ] **Step 1: Read the current file**

Open `frontend/src/vendor/Home.jsx` in full.

- [ ] **Step 2: Write the freshness test first**

In `frontend/src/vendor/__tests__/Home.test.jsx`, add:
```jsx
import { freshnessPct } from '../Home'

test('freshnessPct returns 0 for brand-new lot', () => {
  const now = Date.now()
  expect(freshnessPct(now)).toBeCloseTo(0, 0)
})

test('freshnessPct returns 100 for lot older than 6 days', () => {
  const ancient = Date.now() - 7 * 86400 * 1000
  expect(freshnessPct(ancient)).toBe(100)
})
```

Export `freshnessPct` as a named export from `Home.jsx`:
```js
export const freshnessPct = (receivedAt) =>
  Math.min(100, ((Date.now() - receivedAt) / (6 * 86400 * 1000)) * 100)
```

- [ ] **Step 3: Run test to confirm it fails first**

```bash
cd frontend && npm test -- Home
```
Expected: FAIL (freshnessPct not exported yet).

- [ ] **Step 4: Implement the full Home.jsx**

Replace `Home.jsx` entirely. Key structure:

```jsx
import { useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { I } from '../../icons'
import { getVendorHome } from '../api/home'
import { unpublishListing } from '../api/storefront'
import { getSpeciesSeries } from '../api/analytics'
import { getMarineConditions } from '../../api/marine'  // confirm exact import path

export const freshnessPct = (receivedAtMs) =>
  Math.min(100, ((Date.now() - receivedAtMs) / (6 * 86400 * 1000)) * 100)

export default function Home({ setPage }) {
  const qc = useQueryClient()
  const homeQ = useQuery({ queryKey: ['vendor-home'], queryFn: getVendorHome })
  const seriesQ = useQuery({ queryKey: ['vendor-species-series', 30], queryFn: () => getSpeciesSeries(30) })
  const marineQ = useQuery({
    queryKey: ['marine-conditions'],
    queryFn: () => getMarineConditions(),   // single La Union coord call
    staleTime: 15 * 60 * 1000,
  })

  const home    = homeQ.data
  const series  = seriesQ.data ?? []
  const marine  = marineQ.data

  // --- Derived: featured listing (highest-stock PUBLISHED listing) ---
  const featured = home?.listings
    ?.filter(l => l.status === 'PUBLISHED')
    ?.sort((a, b) => (b.availableKg ?? 0) - (a.availableKg ?? 0))[0]

  // --- Mutations ---
  const unpublish = useMutation({
    mutationFn: (id) => unpublishListing(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-home'] }),
  })

  // --- GSAP KPI count-up on mount ---
  // (apply to KPI value DOM nodes via ref array)

  if (homeQ.isLoading) return <div className="v-page-loading">Loading…</div>

  const firstName = home?.vendor?.firstName ?? home?.vendor?.fullName?.split(' ')[0] ?? 'there'

  return (
    <div>
      {/* Header */}
      <div className="v-page-header">
        <div>
          <h1 className="v-page-header__title">Good morning, <em>{firstName}</em></h1>
          <div className="v-page-header__sub">{home?.vendor?.businessName}</div>
        </div>
        <div className="v-page-header__actions">
          <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setPage('vprocurement')}>Browse catch</button>
          <button className="v-btn v-btn--primary v-btn--sm" onClick={() => setPage('vstore')}>New listing</button>
        </div>
      </div>

      {/* Species sparkline cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 220px', gap: 12, marginBottom: 20 }}>
        {series.slice(0, 3).map(s => (
          <div key={s.speciesId} className="v-panel">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{s.localName}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{s.commonName}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.revenueShare?.toFixed(0)}%</div>
            <div style={{ fontSize: 11, color: s.revenueDelta >= 0 ? 'var(--kelp)' : 'var(--coral)' }}>
              {s.revenueDelta >= 0 ? '+' : ''}{s.revenueDelta?.toFixed(1)}% vs prior
            </div>
            <div style={{ height: 48, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height={48}>
                <LineChart data={s.daily}>
                  <Line type="monotone" dataKey="revenue" stroke="var(--accent-lime)"
                        strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
              {s.lotsCount} lots · ₱{s.pricePerKg?.toFixed(0)}/kg avg
            </div>
          </div>
        ))}
        {/* Advisory promo card */}
        <div className="v-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MERMAID Advisory</div>
          {marine && (
            <div className={`v-chip v-chip--${marine.riskLevel === 'SAFE' ? 'kelp' : marine.riskLevel === 'CAUTION' ? 'caution' : 'coral'}`}>
              {marine.riskLevel} · La Union coast
            </div>
          )}
          <div style={{ flex: 1 }} />
          <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => marineQ.refetch()}>Refresh</button>
        </div>
      </div>

      {/* Active listing hero */}
      {featured && (
        <div className="v-panel v-panel--elevated" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="v-chip v-chip--kelp">LIVE</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                {featured.speciesName}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--accent-lime)', marginTop: 4 }}>
                {((featured.lots?.[0]?.initialKg ?? 0) - (featured.availableKg ?? 0)).toFixed(2)} kg sold
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setPage('vstore')}>Edit listing</button>
                <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => unpublish.mutate(featured.id)}>Unlist</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                ₱{featured.pricePerKg}/kg ask · {featured.availableKg}kg remaining
              </div>
            </div>
            {/* Freshness timeline */}
            {featured.lots?.[0]?.receivedAt && (() => {
              const pct = freshnessPct(new Date(featured.lots[0].receivedAt).getTime())
              const day = (pct / 100 * 6).toFixed(1)
              return (
                <div style={{ width: 200 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6 }}>Freshness window</div>
                  <div style={{ position: 'relative', height: 8, background: 'var(--hairline)', borderRadius: 4 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0,
                      width: `${100 - pct}%`, height: '100%',
                      background: 'linear-gradient(90deg, var(--kelp), var(--caution))',
                      borderRadius: 4, transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-5)', marginTop: 2 }}>
                    <span>Iced D0</span><span>D3</span><span>Spoil</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Day {day}</div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Mini stats */}
      <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Avg agreed/kg', value: `₱${(home?.avgAgreedPriceKg ?? 0).toFixed(0)}` },
          { label: 'Sell ratio', value: `${featured ? ((((featured.lots?.[0]?.initialKg ?? 0) - (featured.availableKg ?? 0)) / (featured.lots?.[0]?.initialKg || 1)) * 100).toFixed(0) : '—'}%` },
          { label: 'Margin', value: featured ? `+${(((featured.pricePerKg - (featured.costPerKg ?? 0)) / (featured.costPerKg || 1)) * 100).toFixed(0)}%` : '—' },
          { label: 'Days in inventory', value: featured?.lots?.[0]?.receivedAt ? `${((Date.now() - new Date(featured.lots[0].receivedAt).getTime()) / 86400000).toFixed(1)}d` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="v-kpi-cell">
            <div className="v-kpi-cell__label">{label}</div>
            <div className="v-kpi-cell__value v-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Lower grid: orders + advisory + low stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>
        {/* Orders panel */}
        <div className="v-panel">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Recent orders</div>
          {home?.openOrders?.recent?.slice(0, 5).map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--hairline-2)' }}>
              <span className="v-chip v-chip--muted">{o.status}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{o.buyerName} · {o.speciesName}</span>
              <span className="v-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>₱{o.totalAmount?.toFixed(0)}</span>
            </div>
          ))}
          <button className="v-btn v-btn--ghost v-btn--sm" style={{ marginTop: 10 }} onClick={() => setPage('vorders')}>View all</button>
        </div>

        {/* Right column: advisory + low stock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Advisory hero */}
          <div className="v-panel">
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Marine conditions · La Union</div>
            {marine ? (
              <>
                <div className={`v-chip v-chip--${marine.riskLevel === 'SAFE' ? 'kelp' : marine.riskLevel === 'CAUTION' ? 'caution' : 'coral'}`} style={{ marginBottom: 8 }}>
                  {marine.riskLevel}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Wave', value: `${marine.waveHeight}m` },
                    { label: 'Wind', value: `${marine.windSpeed}kt` },
                    { label: 'Gusts', value: `${marine.gusts}kt` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 9, color: 'var(--ink-4)' }}>{label}</div>
                      <div className="v-mono" style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Loading…</div>}
          </div>

          {/* Low stock */}
          <div className="v-panel">
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Low stock</div>
            {home?.lowStock?.map(lot => (
              <div key={lot.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, flex: 1 }}>{lot.speciesName}</span>
                <span className="v-mono v-chip v-chip--coral">{lot.remainingKg}kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Procurement panel */}
      {home?.recentMatchedCatchAlerts?.length > 0 && (
        <div className="v-panel">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Source fresh catch</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {home.recentMatchedCatchAlerts.slice(0, 6).map(alert => {
              const inWatchlist = home.watchlistSpeciesIds?.includes(alert.speciesId)
              const matchPct = inWatchlist ? 100 : 60
              return (
                <div key={alert.id} className="v-panel" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="v-chip v-chip--lime">{matchPct}%</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>#{alert.code}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.speciesLocalName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{alert.fisherName}</div>
                  <div className="v-mono" style={{ marginTop: 6, fontSize: 13 }}>
                    {alert.quantityKg}kg · ₱{alert.askingPrice}/kg
                  </div>
                  <button className="v-btn v-btn--ghost v-btn--sm" style={{ marginTop: 8, width: '100%' }}
                    onClick={() => setPage('vprocurement')}>
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

> **Important:** The exact field names on `home` (e.g. `home.openOrders.recent`, `home.avgAgreedPriceKg`, `home.watchlistSpeciesIds`) depend on what `getVendorHome()` currently returns. Read `frontend/src/vendor/api/home.js` and the existing `Home.jsx` before this step to know the exact field names and adjust accordingly.

- [ ] **Step 5: Run tests**

```bash
cd frontend && npm test -- Home
```
Expected: freshnessPct tests PASS. Existing tests still pass.

- [ ] **Step 6: Verify in browser**

Browse to Dashboard. Check: sparkline cards render (empty data OK), featured listing hero shows if there's a PUBLISHED listing, freshness timeline renders, KPI cells show values.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/vendor/Home.jsx frontend/src/vendor/__tests__/Home.test.jsx
git commit -m "feat(vendor/home): complete Dashboard redesign — MERMAID v2"
```

---

## Task 11: Storefront page (StorefrontEditor.jsx)

**Files:**
- Modify: `frontend/src/vendor/StorefrontEditor.jsx`

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/StorefrontEditor.jsx` in full. Note the existing listing query, create/edit modal logic, and publish/unpublish mutations.

- [ ] **Step 2: Add getStorefrontStats to imports**

```js
import { listListings, publishListing, unpublishListing, getStorefrontStats } from '../api/storefront'
```

- [ ] **Step 3: Add stats query**

```js
const statsQ = useQuery({ queryKey: ['storefront-stats'], queryFn: getStorefrontStats })
const stats  = statsQ.data
```

- [ ] **Step 4: Rewrite the JSX**

Replace the page render with:
```jsx
<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">Your public <em>listings</em></h1>
    </div>
    <div className="v-page-header__actions">
      <button className="v-btn v-btn--ghost v-btn--sm"
        onClick={() => window.open(`/shop/${user?.slug ?? ''}`, '_blank')}>
        Preview shop
      </button>
      <button className="v-btn v-btn--primary v-btn--sm" onClick={openCreateModal}>
        New listing
      </button>
    </div>
  </div>

  {/* KPI strip */}
  <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
    {[
      { label: 'Total listings', value: listings.length },
      { label: 'Views 30d', value: stats?.totalViews ?? '—' },
      { label: 'Active', value: listings.filter(l => l.status === 'PUBLISHED' || l.status === 'SOLD_OUT').length },
      { label: 'Drafts', value: listings.filter(l => l.status === 'DRAFT').length },
      { label: 'Paused', value: listings.filter(l => l.status === 'UNPUBLISHED').length },
    ].map(({ label, value }) => (
      <div key={label} className="v-kpi-cell">
        <div className="v-kpi-cell__label">{label}</div>
        <div className="v-kpi-cell__value v-mono">{value}</div>
      </div>
    ))}
  </div>

  {/* Tab strip */}
  <div className="v-tabs">
    {['all', 'active', 'drafts', 'paused'].map(t => (
      <button key={t}
        className={`v-tab${tab === t ? ' v-tab--on' : ''}`}
        onClick={() => setTab(t)}>
        {t.charAt(0).toUpperCase() + t.slice(1)}
      </button>
    ))}
  </div>

  {/* Listing grid */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
    {filteredListings.map(listing => (
      <ListingCard key={listing.id} listing={listing}
        views={stats?.byListing?.find(b => b.listingId === listing.id)?.views ?? 0}
        onEdit={() => openEditModal(listing)}
        onPublish={() => publishMutation.mutate(listing.id)}
        onUnpublish={() => unpublishMutation.mutate(listing.id)}
      />
    ))}
  </div>

  {/* Keep existing create/edit modal JSX */}
</div>
```

Filter logic:
```js
const filteredListings = listings.filter(l => {
  if (tab === 'active')  return l.status === 'PUBLISHED' || l.status === 'SOLD_OUT'
  if (tab === 'drafts')  return l.status === 'DRAFT'
  if (tab === 'paused')  return l.status === 'UNPUBLISHED'
  return true
})
```

`ListingCard` component (inline):
```jsx
function ListingCard({ listing, views, onEdit, onPublish, onUnpublish }) {
  const statusColor = { PUBLISHED: 'kelp', DRAFT: 'muted', UNPUBLISHED: 'coral', SOLD_OUT: 'caution' }
  return (
    <div className="v-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ height: 120, background: 'var(--bg-card-3)', position: 'relative' }}>
        {listing.photoUrl && <img src={listing.photoUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <span className={`v-chip v-chip--${statusColor[listing.status] || 'muted'}`}
          style={{ position: 'absolute', top: 8, left: 8 }}>
          {listing.status}
        </span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{listing.title}</div>
        <div className="v-mono" style={{ fontSize: 13, color: 'var(--accent-lime)', marginTop: 2 }}>
          ₱{listing.pricePerKg}/kg
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
          <span>{listing.availableKg}kg stock</span>
          <span>{views} views</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button className="v-btn v-btn--ghost v-btn--sm" onClick={onEdit}>Edit</button>
          {listing.status === 'PUBLISHED'
            ? <button className="v-btn v-btn--ghost v-btn--sm" onClick={onUnpublish}>Unpublish</button>
            : listing.status === 'DRAFT'
              ? <button className="v-btn v-btn--primary v-btn--sm" onClick={onPublish}>Publish</button>
              : null}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Open Storefront tab. Check: KPI strip shows, tabs filter correctly, listing cards render with status badges and view counts.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/vendor/StorefrontEditor.jsx
git commit -m "feat(vendor/storefront): redesign Storefront page — MERMAID v2"
```

---

## Task 12: Inventory page (Inventory.jsx)

**Files:**
- Modify: `frontend/src/vendor/Inventory.jsx`

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/Inventory.jsx`. Note the existing `useQuery` for lots, threshold/filter state, and lot-edit modal logic.

- [ ] **Step 2: Rewrite JSX**

Keep all existing query hooks and modal logic. Replace the render output with the v2 design:

```jsx
<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">Your <em>lots</em></h1>
    </div>
    <div className="v-page-header__actions">
      <button className="v-btn v-btn--ghost v-btn--sm" onClick={openAdjustModal}>Adjust lot</button>
    </div>
  </div>

  {/* KPI strip */}
  <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
    {[
      { label: 'On-hand kg', value: `${onHandKg.toFixed(1)}kg` },
      { label: 'Cost value', value: `₱${(costValue / 1000).toFixed(1)}k` },
      { label: 'Turnover %', value: `${turnoverPct.toFixed(0)}%` },
      { label: 'Low stock', value: lowStockCount },
      { label: 'Avg age', value: `${avgAge.toFixed(1)}d` },
    ].map(({ label, value }) => (
      <div key={label} className="v-kpi-cell">
        <div className="v-kpi-cell__label">{label}</div>
        <div className="v-kpi-cell__value v-mono">{value}</div>
      </div>
    ))}
  </div>

  {/* Controls */}
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
    <input type="number" placeholder="Low threshold kg" value={threshold}
      onChange={e => setThreshold(Number(e.target.value))}
      style={{ background: 'var(--bg-input)', border: '1px solid var(--hairline)', borderRadius: 8,
               padding: '7px 12px', color: 'var(--ink-1)', width: 160, fontSize: 13 }} />
    {['all', 'active', 'low', 'soldout'].map(f => (
      <button key={f}
        className={`v-btn v-btn--ghost v-btn--sm${filter === f ? ' v-tab--on' : ''}`}
        onClick={() => setFilter(f)}>
        {f === 'soldout' ? 'Sold out' : f.charAt(0).toUpperCase() + f.slice(1)}
      </button>
    ))}
  </div>

  {/* Lot rows */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {filteredLots.map(lot => {
      const freshPct = freshnessPct(new Date(lot.receivedAt).getTime())
      const barColor = freshPct < 50 ? 'var(--kelp)' : freshPct < 80 ? 'var(--caution)' : 'var(--coral)'
      return (
        <div key={lot.id} className="v-panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-card-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🐟
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{lot.speciesName ?? lot.speciesCommonName}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>#{lot.code} · received {new Date(lot.receivedAt).toLocaleDateString()}</div>
            <div style={{ marginTop: 6, height: 4, background: 'var(--hairline)', borderRadius: 2, width: 120 }}>
              <div style={{ height: 4, borderRadius: 2, background: barColor, width: `${100 - freshPct}%`, transition: 'width 0.4s' }} />
            </div>
          </div>
          <div className="v-mono" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{lot.remainingKg}kg</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>of {lot.initialKg}kg</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {lot.remainingKg === 0
              ? <span className="v-chip v-chip--muted">Sold out</span>
              : <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => openEditModal(lot)}>Edit</button>}
          </div>
        </div>
      )
    })}
  </div>
</div>
```

Derived KPI values (compute before return):
```js
const onHandKg     = lots.reduce((s, l) => s + (l.remainingKg ?? 0), 0)
const costValue    = lots.reduce((s, l) => s + ((l.remainingKg ?? 0) * (l.costPerKg ?? 0)), 0)
const initialTotal = lots.reduce((s, l) => s + (l.initialKg ?? 0), 0)
const turnoverPct  = initialTotal > 0 ? ((initialTotal - onHandKg) / initialTotal * 100) : 0
const lowStockCount = lots.filter(l => l.remainingKg <= threshold && l.remainingKg > 0).length
const avgAge       = lots.length > 0
  ? lots.reduce((s, l) => s + ((Date.now() - new Date(l.receivedAt).getTime()) / 86400000), 0) / lots.length
  : 0
```

Import `freshnessPct` from `../Home` (or duplicate the small helper here):
```js
const freshnessPct = (ms) => Math.min(100, ((Date.now() - ms) / (6 * 86400 * 1000)) * 100)
```

- [ ] **Step 3: Verify in browser**

Open Inventory tab. KPI strip populated, lot rows show freshness bars, controls work.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/vendor/Inventory.jsx
git commit -m "feat(vendor/inventory): redesign Inventory page — MERMAID v2"
```

---

## Task 13: Orders page (OrdersInbox.jsx)

**Files:**
- Modify: `frontend/src/vendor/OrdersInbox.jsx`

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/OrdersInbox.jsx`. Identify: the main orders query, status filter state, and where `OrderCard` is rendered.

- [ ] **Step 2: Update status filter to include in-transit pseudo-filter**

```js
const IN_TRANSIT_STATUSES = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'AWAITING_RECEIPT']

const filteredOrders = orders.filter(o => {
  if (statusFilter === 'all')       return true
  if (statusFilter === 'in-transit') return IN_TRANSIT_STATUSES.includes(o.status)
  return o.status === statusFilter.toUpperCase()
})
```

- [ ] **Step 3: Compute pipeline bucket counts**

```js
const buckets = {
  pending:   orders.filter(o => o.status === 'PENDING').length,
  confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
  inTransit: orders.filter(o => IN_TRANSIT_STATUSES.includes(o.status)).length,
  completed: orders.filter(o => o.status === 'COMPLETED').length,
}
const bucketTotal = Math.max(1, buckets.pending + buckets.confirmed + buckets.inTransit + buckets.completed)
```

- [ ] **Step 4: Rewrite JSX**

```jsx
<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">Order <em>inbox</em></h1>
    </div>
    <div className="v-page-header__actions">
      <button className="v-btn v-btn--ghost v-btn--sm" onClick={exportOrders}>Export CSV</button>
    </div>
  </div>

  {/* KPI strip */}
  <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
    {[
      { label: 'Pending', value: buckets.pending },
      { label: 'Confirmed', value: buckets.confirmed },
      { label: 'Completed 7d', value: orders.filter(o => o.status === 'COMPLETED').length },
      { label: 'Cancelled 7d', value: orders.filter(o => o.status === 'CANCELLED').length },
      { label: 'Open value', value: `₱${orders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status)).reduce((s,o) => s + (o.totalAmount ?? 0), 0).toFixed(0)}` },
    ].map(({ label, value }) => (
      <div key={label} className="v-kpi-cell">
        <div className="v-kpi-cell__label">{label}</div>
        <div className="v-kpi-cell__value v-mono">{value}</div>
      </div>
    ))}
  </div>

  {/* Pipeline visualizer */}
  <div className="v-panel" style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', gap: 6, height: 32, alignItems: 'stretch' }}>
      {[
        { label: 'Pending', count: buckets.pending, color: 'var(--accent-lime)' },
        { label: 'Confirmed', count: buckets.confirmed, color: 'var(--tide)' },
        { label: 'In transit', count: buckets.inTransit, color: 'var(--coral)' },
        { label: 'Completed', count: buckets.completed, color: 'var(--accent-violet-mid)' },
      ].map(b => (
        <div key={b.label}
          style={{ flex: Math.max(0.5, b.count / bucketTotal), background: b.color,
                   borderRadius: 4, display: 'flex', alignItems: 'center',
                   padding: '0 8px', minWidth: 48, transition: 'flex 0.4s' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0e0820', whiteSpace: 'nowrap' }}>
            {b.label} {b.count}
          </span>
        </div>
      ))}
    </div>
  </div>

  {/* Filter pills */}
  <div className="v-tabs" style={{ marginBottom: 16 }}>
    {['all', 'pending', 'confirmed', 'in-transit', 'completed', 'cancelled'].map(f => (
      <button key={f} className={`v-tab${statusFilter === f ? ' v-tab--on' : ''}`}
        onClick={() => setStatusFilter(f)}>
        {f === 'in-transit' ? 'In transit' : f.charAt(0).toUpperCase() + f.slice(1)}
      </button>
    ))}
  </div>

  {/* Order cards */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {filteredOrders.map(o => <OrderCard key={o.id} order={o} role="vendor" />)}
  </div>
</div>
```

- [ ] **Step 5: Verify in browser**

Open Orders tab. Pipeline visualizer fills proportionally. Filter pills switch buckets.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/vendor/OrdersInbox.jsx
git commit -m "feat(vendor/orders): redesign Orders page with pipeline visualizer — MERMAID v2"
```

---

## Task 14: Source Catch page (ProcurementFeed.jsx)

**Files:**
- Modify: `frontend/src/vendor/ProcurementFeed.jsx`

The 4 existing tabs (feed/cart/orders/credits) are fully wired — only the visual layer changes. Do not touch tab logic, query hooks, mutations, or `SettleCreditModal`.

- [ ] **Step 1: Read the current file**

Open `ProcurementFeed.jsx` in full. Note the `tab` state, all 4 query hooks (`feedQ`, `cartQ` / `cartItems`, `ordersQ`, `creditOrders`), and the watchlist modal.

- [ ] **Step 2: Add match% helper**

At the top of the file, add:
```js
const matchPct = (alert, watchlistSpeciesIds) =>
  watchlistSpeciesIds?.includes(alert.speciesId) ? 100 : 60
```

- [ ] **Step 3: Write test**

In `frontend/src/vendor/__tests__/ProcurementFeed.test.jsx`, add:
```js
import { matchPct } from '../ProcurementFeed'  // export it

test('matchPct returns 100 for watchlist species', () => {
  expect(matchPct({ speciesId: 5 }, [5, 10])).toBe(100)
})
test('matchPct returns 60 for non-watchlist species', () => {
  expect(matchPct({ speciesId: 3 }, [5, 10])).toBe(60)
})
```

Export `matchPct` as a named export.

- [ ] **Step 4: Rewrite the JSX header + tab strip**

```jsx
<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">Source fresh <em>catch</em></h1>
    </div>
    <div className="v-page-header__actions">
      <button className="v-btn v-btn--ghost v-btn--sm" onClick={openWatchlistModal}>Edit watchlist</button>
    </div>
  </div>

  <div className="v-tabs">
    {[
      { id: 'feed',    label: 'Live feed',  count: feedQ.data?.length },
      { id: 'cart',    label: 'Cart',       count: cartItems.length },
      { id: 'orders',  label: 'My orders',  count: supplierOrders.length },
      { id: 'credits', label: 'Credits',    count: creditOrders.length },
    ].map(t => (
      <button key={t.id} className={`v-tab${tab === t.id ? ' v-tab--on' : ''}`}
        onClick={() => setTab(t.id)}>
        {t.label}{t.count > 0 && ` (${t.count})`}
      </button>
    ))}
  </div>

  {tab === 'feed' && <FeedTab ... />}
  {tab === 'cart' && <CartTab ... />}
  {tab === 'orders' && <OrdersTab ... />}
  {tab === 'credits' && <CreditsTab ... />}
</div>
```

Keep `FeedTab`, `CartTab`, `OrdersTab`, `CreditsTab` as the existing render logic extracted into inline sections — just update their wrapper divs to use `v-panel`, `v-chip`, `v-btn` classes instead of the old class names.

The feed tab KPI strip:
```jsx
<div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
  {[
    { label: 'Open alerts', value: feedQ.data?.length ?? 0 },
    { label: 'On watchlist', value: feedQ.data?.filter(a => watchlistSpeciesIds.includes(a.speciesId)).length ?? 0 },
    { label: 'Avg ask/kg', value: feedQ.data?.length ? `₱${(feedQ.data.reduce((s,a) => s + a.askingPrice, 0) / feedQ.data.length).toFixed(0)}` : '—' },
    { label: 'Spend 30d', value: `₱${(procurementSpend30d ?? 0).toFixed(0)}` },
  ].map(({ label, value }) => (
    <div key={label} className="v-kpi-cell">
      <div className="v-kpi-cell__label">{label}</div>
      <div className="v-kpi-cell__value v-mono">{value}</div>
    </div>
  ))}
</div>
```

Alert card grid (in feed tab):
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
  {sortedAlerts.map(alert => (
    <div key={alert.id} className="v-panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="v-chip v-chip--lime">{matchPct(alert, watchlistSpeciesIds)}%</span>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>#{alert.code}</span>
      </div>
      <div style={{ fontWeight: 600 }}>{alert.speciesLocalName}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{alert.fisherFullName}</div>
      <div className="v-mono" style={{ marginTop: 6 }}>{alert.quantityKg}kg · ₱{alert.askingPrice}/kg</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => addToCart(alert.id)}>Cart</button>
        <button className="v-btn v-btn--primary v-btn--sm" onClick={() => startDeal(alert.id)}>Deal</button>
      </div>
    </div>
  ))}
</div>
```

Sort pills (only "Best match" and "Expiring"):
```jsx
<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
  {['match', 'expiring'].map(s => (
    <button key={s} className={`v-btn v-btn--ghost v-btn--sm${sort === s ? ' v-tab--on' : ''}`}
      onClick={() => setSort(s)}>
      {s === 'match' ? 'Best match' : 'Expiring'}
    </button>
  ))}
</div>
```

- [ ] **Step 5: Run existing tests**

```bash
cd frontend && npm test -- ProcurementFeed
```
Expected: All PASS (including the match% new tests).

- [ ] **Step 6: Verify in browser**

Open Source Catch tab. All 4 tabs switch cleanly. Alert cards show match% badge.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/vendor/ProcurementFeed.jsx frontend/src/vendor/__tests__/ProcurementFeed.test.jsx
git commit -m "feat(vendor/procurement): redesign Source Catch page — MERMAID v2"
```

---

## Task 15: Messages page (Messages.jsx)

**Files:**
- Modify: `frontend/src/vendor/Messages.jsx`

The deal list and `DealChatPane` component handle all logic. This task resets the layout chrome only.

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/Messages.jsx`. Note: deal list query, selected deal state, `DealChatPane` import.

- [ ] **Step 2: Rewrite JSX layout**

```jsx
<div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 56px - 48px)', overflow: 'hidden', borderRadius: 14 }}>
  {/* Left: conversation list */}
  <div style={{ width: 350, flexShrink: 0, borderRight: '1px solid var(--hairline)',
                background: 'var(--bg-card)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--hairline)' }}>
      <div className="v-page-header__title" style={{ fontSize: 18 }}>
        Negotiate <em>in flight</em>
      </div>
    </div>

    {/* Filter tabs */}
    <div className="v-tabs" style={{ padding: '0 12px', borderBottom: '1px solid var(--hairline)' }}>
      {['all', 'unread', 'negotiating', 'agreed'].map(f => (
        <button key={f} className={`v-tab${listFilter === f ? ' v-tab--on' : ''}`}
          onClick={() => setListFilter(f)} style={{ fontSize: 12 }}>
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>

    {/* Deal list */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {filteredDeals.map(deal => (
        <div key={deal.id}
          style={{ padding: '12px 16px', cursor: 'pointer',
                   background: selectedDealId === deal.id ? 'var(--bg-card-2)' : 'transparent',
                   borderBottom: '1px solid var(--hairline-2)' }}
          onClick={() => setSelectedDealId(deal.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-violet)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700 }}>
                {deal.counterpartName?.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{deal.counterpartName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{relativeTime(deal.lastMessageAt)}</span>
              {deal.unreadCount > 0 && (
                <span className="v-chip v-chip--lime" style={{ padding: '1px 5px', fontSize: 10 }}>
                  {deal.unreadCount}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2 }}>
            #{deal.code} · {deal.speciesLocalName} · {deal.quantityKg}kg
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }} className="v-mono">{deal.lastMessagePreview}</span>
            <span className={`v-chip v-chip--${deal.status === 'AGREED' ? 'kelp' : deal.status === 'NEGOTIATING' ? 'tide' : 'muted'}`}>
              {deal.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Right: thread */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                background: 'var(--bg-canvas)' }}>
    {selectedDealId
      ? <DealChatPane dealId={selectedDealId} role="vendor" />
      : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--ink-4)', fontSize: 14 }}>
          Select a conversation
        </div>
      )}
  </div>
</div>
```

Filter logic:
```js
const filteredDeals = deals.filter(d => {
  if (listFilter === 'unread')      return d.unreadCount > 0
  if (listFilter === 'negotiating') return d.status === 'NEGOTIATING'
  if (listFilter === 'agreed')      return d.status === 'AGREED'
  return true
})
```

- [ ] **Step 3: Verify in browser**

Open Messages. Conversation list shows, clicking a row loads the chat pane, filter tabs work.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/vendor/Messages.jsx
git commit -m "feat(vendor/messages): redesign Messages page — MERMAID v2"
```

---

## Task 16: Analytics page (Analytics.jsx)

**Files:**
- Modify: `frontend/src/vendor/Analytics.jsx`

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/Analytics.jsx`. Note existing `range` state, query hooks for `salesSummary`, `revenueBySpecies`, `procurementSpend`, `repeatBuyers`.

- [ ] **Step 2: Write tier chip test**

In `frontend/src/vendor/__tests__/Analytics.test.jsx`, add inside the existing `describe('Analytics', ...)` block. The file already mocks `getRepeatBuyers` via `vi.mock` — use the same pattern:

```jsx
it('renders VIP tier chip for buyer with 10+ orders', async () => {
  getRepeatBuyers.mockResolvedValue([
    { buyerId: 1, buyerName: 'Maria Santos', orderCount: 10, totalSpent: 12000, tier: 'VIP' },
  ])
  wrap(<Analytics />)
  expect(await screen.findByText('VIP')).toBeInTheDocument()
})

it('renders REGULAR tier chip for buyer with 3–9 orders', async () => {
  getRepeatBuyers.mockResolvedValue([
    { buyerId: 2, buyerName: 'Jose Cruz', orderCount: 5, totalSpent: 6000, tier: 'REGULAR' },
  ])
  wrap(<Analytics />)
  expect(await screen.findByText('REGULAR')).toBeInTheDocument()
})
```

- [ ] **Step 3: Rewrite JSX**

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ...existing query hooks...

const rangeParams = {
  '7d':  { from: daysAgo(7),  to: today() },
  '30d': { from: daysAgo(30), to: today() },
  '90d': { from: daysAgo(90), to: today() },
  '1y':  { from: daysAgo(365), to: today() },
}[range]

<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">How your shop is <em>performing</em></h1>
    </div>
    <div className="v-page-header__actions">
      {['7d', '30d', '90d', '1y'].map(r => (
        <button key={r} className={`v-btn v-btn--ghost v-btn--sm${range === r ? ' v-tab--on' : ''}`}
          onClick={() => setRange(r)}>
          {r}
        </button>
      ))}
    </div>
  </div>

  {/* KPI strip */}
  <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
    {[
      { label: 'Orders',      value: summary?.totalOrders ?? 0 },
      { label: 'Revenue',     value: `₱${((summary?.totalRevenue ?? 0) / 1000).toFixed(1)}k` },
      { label: 'Volume kg',   value: `${(summary?.totalQtyKg ?? 0).toFixed(0)}kg` },
      { label: 'AOV',         value: `₱${(summary?.avgOrderValue ?? 0).toFixed(0)}` },
      { label: 'Repeat rate', value: `${repeatRate}%` },
    ].map(({ label, value }) => (
      <div key={label} className="v-kpi-cell">
        <div className="v-kpi-cell__label">{label}</div>
        <div className="v-kpi-cell__value v-mono">{value}</div>
      </div>
    ))}
  </div>

  {/* Charts row */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
    <div className="v-panel">
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Revenue by species</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={revenueBySpecies} layout="vertical">
          <XAxis type="number" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} />
          <YAxis type="category" dataKey="speciesName" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} width={80} />
          <Tooltip contentStyle={{ background: 'var(--bg-card-2)', border: '1px solid var(--hairline)', borderRadius: 8 }} />
          <Bar dataKey="totalRevenue" fill="var(--accent-lime)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="v-panel">
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Procurement spend by species</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={procurementSpend} layout="vertical">
          <XAxis type="number" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} />
          <YAxis type="category" dataKey="speciesName" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} width={80} />
          <Tooltip contentStyle={{ background: 'var(--bg-card-2)', border: '1px solid var(--hairline)', borderRadius: 8 }} />
          <Bar dataKey="totalSpend" fill="var(--accent-pink)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Repeat buyers table */}
  <div className="v-panel">
    <div style={{ fontWeight: 600, marginBottom: 12 }}>Repeat buyers</div>
    <table className="v-table">
      <thead>
        <tr>
          <th>Buyer</th><th>Tier</th><th>Orders</th><th>Total spent</th><th>Last order</th><th></th>
        </tr>
      </thead>
      <tbody>
        {repeatBuyers.map(b => (
          <tr key={b.buyerId}>
            <td>{b.buyerName ?? `Buyer #${b.buyerId}`}</td>
            <td>
              <span className={`v-chip v-chip--${b.tier === 'VIP' ? 'lime' : b.tier === 'REGULAR' ? 'tide' : 'muted'}`}>
                {b.tier ?? 'NEW'}
              </span>
            </td>
            <td className="v-mono">{b.orderCount}</td>
            <td className="v-mono">₱{b.totalSpent?.toFixed(0)}</td>
            <td style={{ color: 'var(--ink-3)' }}>{b.lastOrder ? new Date(b.lastOrder).toLocaleDateString() : '—'}</td>
            <td>
              <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setPage('vorders', { buyerId: b.buyerId })}>
                View orders
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

`repeatRate` derived value:
```js
const totalBuyers  = summary?.uniqueBuyers ?? 0
const repeatCount  = repeatBuyers.length
const repeatRate   = totalBuyers > 0 ? Math.round(repeatCount / totalBuyers * 100) : 0
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- Analytics
```
Expected: All PASS.

- [ ] **Step 5: Verify in browser**

Open Analytics. Charts render, tier chips show on repeat buyer table rows.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/vendor/Analytics.jsx frontend/src/vendor/__tests__/Analytics.test.jsx
git commit -m "feat(vendor/analytics): redesign Analytics page with Recharts and tier chips — MERMAID v2"
```

---

## Task 17: Reviews page (Reviews.jsx)

**Files:**
- Modify: `frontend/src/vendor/Reviews.jsx`

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/Reviews.jsx`. Note the reviews query, reply mutation, and per-review reply state.

- [ ] **Step 2: Rewrite JSX**

```jsx
<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">Customer <em>reviews</em></h1>
    </div>
  </div>

  {/* Top row */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
    {/* Rating snapshot */}
    <div className="v-panel">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, lineHeight: 1 }}>
            {avgRating.toFixed(1)}
          </div>
          <div style={{ color: 'var(--accent-lime)', fontSize: 18, marginTop: 4 }}>
            {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>{reviews.length} reviews</div>
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length
            const pct   = reviews.length > 0 ? count / reviews.length * 100 : 0
            return (
              <div key={star} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', width: 16 }}>{star}★</span>
                <div style={{ flex: 1, height: 6, background: 'var(--hairline)', borderRadius: 3 }}>
                  <div style={{ height: 6, background: 'var(--accent-lime)', borderRadius: 3, width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-4)', width: 20 }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>

    {/* Quick stats */}
    <div className="v-panel">
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Quick stats</div>
      {[
        { label: 'Reply rate', value: `${replyRate}%` },
        { label: 'Awaiting reply', value: reviews.filter(r => !r.reply).length },
      ].map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                                   borderBottom: '1px solid var(--hairline-2)' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
          <span className="v-mono" style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Review cards */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {reviews.map(review => (
      <ReviewCard key={review.id} review={review}
        onReply={(text) => replyMutation.mutate({ id: review.id, reply: text })} />
    ))}
  </div>
</div>
```

`ReviewCard` component:
```jsx
function ReviewCard({ review, onReply }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  return (
    <div className="v-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-violet)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700 }}>
            {review.reviewerName?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{review.reviewerName}</div>
            <div style={{ color: 'var(--accent-lime)', fontSize: 12 }}>
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
          {new Date(review.createdAt).toLocaleDateString()}
          <span className="v-chip v-chip--muted" style={{ marginLeft: 8 }}>#{review.orderCode}</span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>{review.comment}</div>
      {review.reply ? (
        <div style={{ background: 'var(--bg-card-2)', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4 }}>YOUR REPLY</div>
          <div style={{ fontSize: 13 }}>{review.reply}</div>
        </div>
      ) : open ? (
        <div>
          <textarea rows={2} value={text} onChange={e => setText(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--hairline)',
                     borderRadius: 8, padding: 8, color: 'var(--ink-1)', fontSize: 13, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="v-btn v-btn--primary v-btn--sm" onClick={() => { onReply(text); setOpen(false) }}>Post reply</button>
          </div>
        </div>
      ) : (
        <button className="v-btn v-btn--ghost v-btn--sm" onClick={() => setOpen(true)}>Reply</button>
      )}
    </div>
  )
}
```

Derived values:
```js
const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
const replied   = reviews.filter(r => r.reply).length
const replyRate = reviews.length > 0 ? Math.round(replied / reviews.length * 100) : 0
```

- [ ] **Step 3: Verify in browser**

Open Reviews. Distribution bars fill, reply toggle works inline.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/vendor/Reviews.jsx
git commit -m "feat(vendor/reviews): redesign Reviews page — MERMAID v2"
```

---

## Task 18: Shop Profile page (ShopProfile.jsx)

**Files:**
- Modify: `frontend/src/vendor/ShopProfile.jsx`

- [ ] **Step 1: Read current file**

Open `frontend/src/vendor/ShopProfile.jsx`. Note: existing shop profile query, update mutation, business hours state, and banner/logo upload handlers.

- [ ] **Step 2: Rewrite JSX**

```jsx
<div>
  <div className="v-page-header">
    <div>
      <h1 className="v-page-header__title">Your <em>public shop</em></h1>
      <div className="v-page-header__sub">mermaid.ph/shop/{shop?.slug}</div>
    </div>
    <div className="v-page-header__actions">
      <button className="v-btn v-btn--ghost v-btn--sm"
        onClick={() => window.open(`/shop/${shop?.slug}`, '_blank')}>
        Preview
      </button>
      <button className="v-btn v-btn--primary v-btn--sm" onClick={handleSave}>Save changes</button>
    </div>
  </div>

  {/* Banner + logo */}
  <div style={{ position: 'relative', height: 160, borderRadius: 14, overflow: 'hidden',
                background: 'var(--bg-card-3)', marginBottom: 20 }}>
    {shop?.bannerUrl && <img src={shop.bannerUrl} alt="Banner"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    <button className="v-btn v-btn--ghost v-btn--sm"
      style={{ position: 'absolute', bottom: 10, right: 10 }}
      onClick={() => bannerInputRef.current?.click()}>
      Change banner
    </button>
    <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }}
      onChange={handleBannerUpload} />
  </div>

  {/* KPI strip (3 cells) */}
  <div className="v-kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
    {[
      { label: 'Repeat rate', value: `${analytics?.repeatRate ?? 0}%` },
      { label: 'Fulfillment %', value: `${fulfillmentPct}%` },
      { label: 'Listings', value: shop?.listingCount ?? 0 },
    ].map(({ label, value }) => (
      <div key={label} className="v-kpi-cell">
        <div className="v-kpi-cell__label">{label}</div>
        <div className="v-kpi-cell__value v-mono">{value}</div>
      </div>
    ))}
  </div>

  {/* Two-column form */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
    {/* Basic info */}
    <div className="v-panel">
      <div style={{ fontWeight: 600, marginBottom: 14 }}>Basic info</div>
      {[
        { label: 'Display name', field: 'displayName' },
        { label: 'Bio', field: 'bio', multiline: true },
        { label: 'Pickup location', field: 'pickupLocation' },
      ].map(({ label, field, multiline }) => (
        <div key={field} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--ink-4)', display: 'block', marginBottom: 4 }}>{label}</label>
          {multiline
            ? <textarea rows={3} value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--hairline)',
                         borderRadius: 8, padding: '8px 10px', color: 'var(--ink-1)', fontSize: 13, resize: 'vertical' }} />
            : <input type="text" value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--hairline)',
                         borderRadius: 8, padding: '8px 10px', color: 'var(--ink-1)', fontSize: 13 }} />}
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: 'var(--ink-4)', display: 'block', marginBottom: 4 }}>Public slug</label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)',
                      border: '1px solid var(--hairline)', borderRadius: 8, overflow: 'hidden' }}>
          <span style={{ padding: '8px 10px', fontSize: 12, color: 'var(--ink-4)' }}>mermaid.ph/shop/</span>
          <input type="text" value={form.slug ?? ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '8px 10px',
                     color: 'var(--ink-1)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>
    </div>

    {/* Business hours */}
    <div className="v-panel">
      <div style={{ fontWeight: 600, marginBottom: 14 }}>Business hours</div>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
        <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ width: 32, fontSize: 12, color: 'var(--ink-3)' }}>{day}</span>
          <input type="time" value={hours[i]?.open ?? '06:00'}
            disabled={hours[i]?.closed}
            onChange={e => updateHours(i, 'open', e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--hairline)',
                     borderRadius: 6, padding: '4px 8px', color: 'var(--ink-1)', fontSize: 12 }} />
          <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>–</span>
          <input type="time" value={hours[i]?.close ?? '18:00'}
            disabled={hours[i]?.closed}
            onChange={e => updateHours(i, 'close', e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--hairline)',
                     borderRadius: 6, padding: '4px 8px', color: 'var(--ink-1)', fontSize: 12 }} />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!hours[i]?.closed}
              onChange={e => updateHours(i, 'closed', e.target.checked)} />
            Closed
          </label>
        </div>
      ))}
    </div>
  </div>
</div>
```

Derived value:
```js
const fulfillmentPct = (() => {
  const completed = analytics?.totalOrders ?? 0
  const cancelled = analytics?.cancelledOrders ?? 0
  const total = completed + cancelled
  return total > 0 ? Math.round(completed / total * 100) : 100
})()
```

> **Note:** The exact field names on `shop` depend on what `GET /vendor/shop/profile` returns. Check `ShopProfile.jsx`'s existing query and adjust form fields accordingly.

- [ ] **Step 3: Verify in browser**

Open Shop Profile. Banner renders, form fields populate from API, hours grid works, save button fires mutation.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/vendor/ShopProfile.jsx
git commit -m "feat(vendor/shop-profile): redesign Shop Profile page — MERMAID v2"
```

---

## Task 19: Final smoke test + polish

- [ ] **Step 1: Full backend test suite**

```bash
cd backend && ./mvnw test
```
Expected: All tests pass (0 failures). Fix any compilation errors from generated types.

- [ ] **Step 2: Full frontend test suite**

```bash
cd frontend && npm test
```
Expected: All tests pass.

- [ ] **Step 3: Browser walkthrough**

- Log in as vendor.
- Rail: hover-expand smooth, labels fade in 200ms after rail starts opening.
- Click each of the 9 nav items — page transition opacity fade is visible (120ms out / 200ms in).
- Dashboard: species sparkline cards render, featured listing hero shows if seeded, KPI cells populated.
- Storefront: tabs filter correctly (All/Active/Drafts/Paused), view count appears in KPI strip.
- Inventory: KPI strip populated, freshness bars rendered.
- Orders: pipeline visualizer bars proportional to order counts, in-transit filter covers 4 statuses.
- Source Catch: all 4 tabs switch cleanly, alert cards show match% badge.
- Messages: deal list filters work, selecting a deal loads `DealChatPane`.
- Analytics: both Recharts bar charts render, tier chips visible on repeat buyer rows.
- Reviews: star distribution bars fill, inline reply textarea opens/closes.
- Shop Profile: form fields populated, business hours grid editable.

- [ ] **Step 4: Fix any visual regressions found**

Address any issues found in step 3 before committing.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(vendor): complete dashboard redesign — MERMAID v2 dark system"
```

---

## Implementation notes

**Field name verification:** Every page task says "read the current file first." This is critical — the existing pages use specific field names from the API responses (e.g., `home.openOrders.new`, `home.lots`, etc.) that differ from the design doc's generic names. Always verify before replacing.

**Generated class names:** After adding schemas to `api.yaml` and running `generate-sources`, check `target/generated-sources/openapi/src/main/java/com/mermaid/app/model/` for the exact class names of the new types (`VendorSpeciesSeriesItem`, `VendorSpeciesSeriesItemDailyInner`, `StorefrontStats`, etc.) before writing controller code that instantiates them.

**Marine conditions import:** The `getMarineConditions()` call in Home.jsx needs to use the correct existing import path. Check `frontend/src/fisherman/Home.jsx` to see how the fisherman dashboard calls it, and replicate.

**La Union coordinates:** When calling the marine-service from the frontend, pass the La Union default coordinate (e.g., `16.62°N, 120.32°E`). Do not pass a user-selected coordinate or hardcode Manila/Cebu coords.

**Test setup:** Some test files use `vi.mock` for the API modules. When adding new test cases, follow the existing `vi.mock` pattern in the same file rather than importing fetchers directly.
