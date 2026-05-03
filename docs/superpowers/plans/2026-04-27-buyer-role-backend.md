# Buyer Role — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a BUYER role that can publicly browse vendor demand listings, place orders with optional delivery address, and message vendors.

**Architecture:** New `/buyer/` controller namespace following the existing vendor/fisherman split. Listing browse is public (no auth). Order placement requires BUYER JWT. No new domain exceptions needed — existing GlobalExceptionHandler covers all error cases.

**Tech Stack:** Spring Boot, JPA, OpenAPI code generation (openapi-generator-maven-plugin), Flyway, MockMvc (tests)

**Spec:** `docs/superpowers/specs/2026-04-27-buyer-role-backend-design.md`

---

## File Map

**Create:**
- `backend/src/main/resources/db/migration/V22__add_market_location_coords_and_buyer_role.sql`
- `backend/src/main/resources/db/migration/V23__add_delivery_address_to_orders.sql`
- `backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java`
- `backend/src/main/java/com/mermaid/app/mapper/BuyerOrderMapper.java`
- `backend/src/main/java/com/mermaid/app/controller/BuyerMarketplaceController.java`
- `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java`
- `backend/src/test/java/com/mermaid/app/controller/BuyerMarketplaceControllerTest.java`
- `backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java`

**Modify:**
- `backend/src/main/resources/openapi/api.yaml` — new paths, schemas, BUYER in RegisterRequest, lat/lng on MarketLocation
- `backend/src/main/java/com/mermaid/app/domain/Order.java` — add `deliveryAddress`
- `backend/src/main/java/com/mermaid/app/domain/MarketLocation.java` — add `lat`, `lng`
- `backend/src/main/java/com/mermaid/app/mapper/MarketLocationMapper.java` — map lat/lng
- `backend/src/main/java/com/mermaid/app/config/SecurityConfig.java` — permit public listing endpoint

---

## Task 1: Database Migrations

**Files:**
- Create: `backend/src/main/resources/db/migration/V22__add_market_location_coords_and_buyer_role.sql`
- Create: `backend/src/main/resources/db/migration/V23__add_delivery_address_to_orders.sql`

- [ ] **Step 1: Write V22 migration**

```sql
-- V22__add_market_location_coords_and_buyer_role.sql

-- Add coordinate columns to market_locations
ALTER TABLE market_locations ADD COLUMN lat NUMERIC(9,6);
ALTER TABLE market_locations ADD COLUMN lng NUMERIC(9,6);

-- Seed GPS coordinates for active La Union markets
-- Coordinates sourced from OpenStreetMap / Google Maps for La Union, Philippines
UPDATE market_locations SET lat = 16.6158, lng = 120.3168
    WHERE name = 'City Public Market' AND municipality = 'City of San Fernando';
UPDATE market_locations SET lat = 16.6120, lng = 120.3140
    WHERE name = 'Auxiliary Wet Market' AND municipality = 'City of San Fernando';
UPDATE market_locations SET lat = 16.6200, lng = 120.3200
    WHERE name = 'Community Fish Landing Center' AND municipality = 'City of San Fernando';
UPDATE market_locations SET lat = 16.6023, lng = 120.3943
    WHERE name = 'Community Fish Landing Center' AND municipality = 'Luna';
UPDATE market_locations SET lat = 16.5237, lng = 120.3925
    WHERE name = 'Community Fish Landing Center' AND municipality = 'Balaoan';
UPDATE market_locations SET lat = 16.4983, lng = 120.3883
    WHERE name = 'Sto. Tomas Public Market' AND municipality = 'Sto. Tomas';
UPDATE market_locations SET lat = 16.5553, lng = 120.3397
    WHERE name = 'Aringay Public Market' AND municipality = 'Aringay';
UPDATE market_locations SET lat = 16.5753, lng = 120.3703
    WHERE name = 'Agoo Public Market' AND municipality = 'Agoo';
UPDATE market_locations SET lat = 16.6667, lng = 120.4833
    WHERE name = 'Rosario Public Market' AND municipality = 'Rosario';
UPDATE market_locations SET lat = 16.7667, lng = 120.3667
    WHERE name = 'Bacnotan Public Market' AND municipality = 'Bacnotan';
UPDATE market_locations SET lat = 16.5328, lng = 120.3333
    WHERE name = 'Bauang Public Market' AND municipality = 'Bauang';

-- Update role CHECK constraint to include BUYER
-- NOTE: DROP + ADD acquires ACCESS EXCLUSIVE lock. Safe in dev/staging.
-- On production: schedule during maintenance window.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN', 'VENDOR', 'FISHERMAN', 'BUYER'));
```

- [ ] **Step 2: Write V23 migration**

```sql
-- V23__add_delivery_address_to_orders.sql
ALTER TABLE orders ADD COLUMN delivery_address TEXT;
```

- [ ] **Step 3: Apply migrations (start the app or run migrate manually)**

```bash
cd backend
./mvnw spring-boot:run
```
Expected: Flyway output shows `V22__add_market_location_coords_and_buyer_role ... OK` and `V23__add_delivery_address_to_orders ... OK`. No errors.

- [ ] **Step 4: Verify coordinates seeded**

In psql or your DB client:
```sql
SELECT name, municipality, lat, lng FROM market_locations WHERE active = true AND lat IS NOT NULL;
```
Expected: 11 rows with non-null lat/lng.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V22__add_market_location_coords_and_buyer_role.sql
git add backend/src/main/resources/db/migration/V23__add_delivery_address_to_orders.sql
git commit -m "feat(db): add market location coords, delivery_address on orders, BUYER role constraint"
```

---

## Task 2: Update `api.yaml`

**File:** `backend/src/main/resources/openapi/api.yaml`

The api.yaml is the single source of truth. Changes here drive code generation.

- [ ] **Step 1: Add `Buyer Marketplace` and `Buyer Orders` tags**

In the `tags:` list (around line 14), add after the `Orders` tag:
```yaml
  - name: Buyer Marketplace
  - name: Buyer Orders
```

- [ ] **Step 2: Add `lat` and `lng` to the `MarketLocation` schema**

Find `MarketLocation:` schema (around line 1903). Add after `active`:
```yaml
        lat:
          type: number
          format: double
          nullable: true
        lng:
          type: number
          format: double
          nullable: true
```

- [ ] **Step 3: Add `BUYER` to `RegisterRequest.role` enum**

Find the `RegisterRequest` role property (around line 1742):
```yaml
          # BEFORE:
          enum: [VENDOR, FISHERMAN]
          description: Self-registration only allows VENDOR or FISHERMAN
          # AFTER:
          enum: [VENDOR, FISHERMAN, BUYER]
          description: Self-registration only allows VENDOR, FISHERMAN, or BUYER
```

- [ ] **Step 4: Add `deliveryAddress` field to the `Order` response schema**

Find the `Order` schema in `components/schemas`. Add after `notes`:
```yaml
        deliveryAddress:
          type: string
          nullable: true
```

- [ ] **Step 5: Add `BuyerPlaceOrderRequest` schema to `components/schemas`**

Add after the `MarketLocationCreateRequest` schema:
```yaml
    BuyerPlaceOrderRequest:
      type: object
      required: [listingId, dispatchMode]
      properties:
        listingId:
          type: integer
          format: int64
        orderedQtyKg:
          type: number
          format: double
          nullable: true
        orderedQtyEstimate:
          type: string
          nullable: true
        dispatchMode:
          type: string
          enum: [PICKUP, DELIVERY]
        deliveryAddress:
          type: string
          nullable: true
          description: Required when dispatchMode is DELIVERY
        notes:
          type: string
          nullable: true
```

- [ ] **Step 6: Add new buyer paths**

Add these three paths to the `paths:` section (after the existing `/marketplace/` block):

```yaml
  /buyer/marketplace/listings:
    get:
      tags: [Buyer Marketplace]
      summary: Browse open vendor demand listings (public)
      operationId: getBuyerMarketplaceListings
      security: []
      parameters:
        - in: query
          name: speciesId
          schema:
            type: integer
            format: int64
        - in: query
          name: locationId
          schema:
            type: integer
            format: int64
        - in: query
          name: minOfferPrice
          schema:
            type: number
            format: double
        - in: query
          name: maxOfferPrice
          schema:
            type: number
            format: double
      responses:
        '200':
          description: List of open demand listings
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/DemandListing'

  /buyer/orders:
    post:
      tags: [Buyer Orders]
      summary: Place an order against a vendor demand listing
      operationId: placeBuyerOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BuyerPlaceOrderRequest'
      responses:
        '201':
          description: Order placed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Validation error (e.g. missing deliveryAddress for DELIVERY)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Listing not found or closed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    get:
      tags: [Buyer Orders]
      summary: List buyer's own orders
      operationId: getBuyerOrders
      parameters:
        - in: query
          name: status
          schema:
            type: string
            enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED, DISPUTED]
      responses:
        '200':
          description: Orders list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'

  /buyer/orders/{orderId}:
    get:
      tags: [Buyer Orders]
      summary: Get a single buyer order by ID
      operationId: getBuyerOrderById
      parameters:
        - in: path
          name: orderId
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: Order detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '404':
          description: Order not found or not owned by this buyer
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

- [ ] **Step 7: Run code generation**

```bash
cd backend
./mvnw generate-sources
```
Expected: BUILD SUCCESS. Check `backend/target/generated-sources/openapi/src/main/java/com/mermaid/app/api/` — you should see new `BuyerMarketplaceApi.java` and `BuyerOrdersApi.java` interfaces. Check `com/mermaid/app/model/` for `BuyerPlaceOrderRequest.java`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(api): add buyer marketplace + order paths, lat/lng on MarketLocation, BUYER role"
```

---

## Task 3: Update Domain Entities

**Files:**
- Modify: `backend/src/main/java/com/mermaid/app/domain/Order.java`
- Modify: `backend/src/main/java/com/mermaid/app/domain/MarketLocation.java`

- [ ] **Step 1: Add `deliveryAddress` to `Order.java`**

Add the field after `notes` (around line 46):
```java
@Column(name = "delivery_address", columnDefinition = "TEXT")
private String deliveryAddress;
```

Add getter/setter at the bottom of the manual getter/setter block:
```java
public String getDeliveryAddress() { return deliveryAddress; }
public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
```

- [ ] **Step 2: Add `lat` and `lng` to `MarketLocation.java`**

Add import at the top:
```java
import java.math.BigDecimal;
```

Add fields after `active` (around line 24):
```java
@Column(precision = 9, scale = 6)
private BigDecimal lat;

@Column(precision = 9, scale = 6)
private BigDecimal lng;
```

Add getters/setters:
```java
public BigDecimal getLat() { return lat; }
public void setLat(BigDecimal lat) { this.lat = lat; }
public BigDecimal getLng() { return lng; }
public void setLng(BigDecimal lng) { this.lng = lng; }
```

- [ ] **Step 3: Verify the app starts cleanly**

```bash
cd backend
./mvnw spring-boot:run
```
Expected: no JPA validation errors, no Flyway errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/domain/Order.java
git add backend/src/main/java/com/mermaid/app/domain/MarketLocation.java
git commit -m "feat(domain): add deliveryAddress on Order, lat/lng on MarketLocation"
```

---

## Task 4: Update `MarketLocationMapper`

**File:** `backend/src/main/java/com/mermaid/app/mapper/MarketLocationMapper.java`

Current `toModel()` only maps id, name, municipality, active, province.

- [ ] **Step 1: Add lat/lng mapping**

The generated `com.mermaid.app.model.MarketLocation` will now have `setLat()`/`setLng()` (from code gen). Add after `setProvince`:
```java
if (entity.getLat() != null) {
    m.setLat(entity.getLat().doubleValue());
}
if (entity.getLng() != null) {
    m.setLng(entity.getLng().doubleValue());
}
```

> Note: the generated model uses `Double` (from `format: double` in api.yaml), while the domain entity uses `BigDecimal`. The `.doubleValue()` conversion is correct here.

- [ ] **Step 2: Run existing lookup test to confirm no regression**

```bash
cd backend
./mvnw test -Dtest=LookupControllerTest
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/mapper/MarketLocationMapper.java
git commit -m "feat(mapper): map lat/lng fields in MarketLocationMapper"
```

---

## Task 5: Create `BuyerOrderMapper`

**File:** `backend/src/main/java/com/mermaid/app/mapper/BuyerOrderMapper.java`

- [ ] **Step 1: Write the mapper**

```java
package com.mermaid.app.mapper;

import com.mermaid.app.domain.Order;
import org.springframework.stereotype.Component;

@Component
public class BuyerOrderMapper {

    public com.mermaid.app.model.Order toModel(Order entity) {
        com.mermaid.app.model.Order m = new com.mermaid.app.model.Order();
        m.setId(entity.getId());
        m.setBuyerId(entity.getBuyerId());
        m.setSellerId(entity.getSellerId());
        m.setDemandListingId(entity.getDemandListingId());
        m.setSpeciesId(entity.getSpecies() != null ? entity.getSpecies().getId() : null);
        m.setOrderedQtyKg(entity.getOrderedQtyKg() != null ? entity.getOrderedQtyKg().doubleValue() : null);
        m.setOrderedQtyEstimate(entity.getOrderedQtyEstimate());
        m.setAgreedPricePerKg(entity.getAgreedPricePerKg() != null ? entity.getAgreedPricePerKg().doubleValue() : null);
        m.setDispatchMode(entity.getDispatchMode());
        m.setDeliveryAddress(entity.getDeliveryAddress());
        m.setStatus(entity.getStatus());
        m.setNotes(entity.getNotes());
        m.setCreatedAt(entity.getCreatedAt());
        return m;
    }
}
```

> Check the generated `com.mermaid.app.model.Order` setters after running `./mvnw generate-sources` — adjust field names if the generator uses camelCase differently (e.g., `setDemandListingId` vs `setDemandListingid`). The model field names follow the api.yaml property names exactly.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/mapper/BuyerOrderMapper.java
git commit -m "feat(mapper): add BuyerOrderMapper"
```

---

## Task 6: Create `BuyerOrderService`

**File:** `backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java`

- [ ] **Step 1: Write the service**

```java
package com.mermaid.app.service;

import com.mermaid.app.domain.DemandListing;
import com.mermaid.app.domain.Order;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.BuyerOrderMapper;
import com.mermaid.app.model.BuyerPlaceOrderRequest;
import com.mermaid.app.repository.DemandListingRepository;
import com.mermaid.app.repository.FishSpeciesRepository;
import com.mermaid.app.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class BuyerOrderService {

    private final OrderRepository orderRepo;
    private final DemandListingRepository listingRepo;
    private final FishSpeciesRepository speciesRepo;
    private final BuyerOrderMapper mapper;

    public BuyerOrderService(OrderRepository orderRepo,
                              DemandListingRepository listingRepo,
                              FishSpeciesRepository speciesRepo,
                              BuyerOrderMapper mapper) {
        this.orderRepo   = orderRepo;
        this.listingRepo = listingRepo;
        this.speciesRepo = speciesRepo;
        this.mapper      = mapper;
    }

    @Transactional
    public com.mermaid.app.model.Order placeOrder(Long buyerId, BuyerPlaceOrderRequest request) {
        DemandListing listing = listingRepo.findById(request.getListingId())
            .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));

        if (listing.isDeleted() || !"OPEN".equals(listing.getStatus() != null ? listing.getStatus().getValue() : "")) {
            throw new ResourceNotFoundException("Listing is not available");
        }

        if ("DELIVERY".equals(request.getDispatchMode() != null ? request.getDispatchMode().getValue() : "")
                && (request.getDeliveryAddress() == null || request.getDeliveryAddress().isBlank())) {
            throw new IllegalArgumentException("deliveryAddress is required for DELIVERY orders");
        }

        Order order = new Order();
        order.setBuyerId(buyerId);
        order.setSellerId(listing.getVendorId());
        order.setDemandListingId(listing.getId());
        order.setSpecies(listing.getSpecies());
        order.setAgreedPricePerKg(listing.getOfferPricePerKg());
        order.setOrderedQtyKg(request.getOrderedQtyKg() != null
            ? BigDecimal.valueOf(request.getOrderedQtyKg()) : null);
        order.setOrderedQtyEstimate(request.getOrderedQtyEstimate());
        order.setDispatchMode(request.getDispatchMode() != null ? request.getDispatchMode().getValue() : null);
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setNotes(request.getNotes());

        return mapper.toModel(orderRepo.save(order));
    }

    @Transactional(readOnly = true)
    public List<com.mermaid.app.model.Order> getMyOrders(Long buyerId, String status) {
        List<com.mermaid.app.domain.Order> orders = (status != null && !status.isBlank())
            ? orderRepo.findAllByParticipantAndStatus(buyerId, status)
            : orderRepo.findAllByParticipant(buyerId);

        return orders.stream()
            .filter(o -> buyerId.equals(o.getBuyerId()))
            .map(mapper::toModel)
            .toList();
    }

    @Transactional(readOnly = true)
    public com.mermaid.app.model.Order getOrderById(Long buyerId, Long orderId) {
        Order order = orderRepo.findByIdAndParticipant(orderId, buyerId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!buyerId.equals(order.getBuyerId())) {
            throw new ResourceNotFoundException("Order not found");
        }
        return mapper.toModel(order);
    }
}
```

> **Important:** After running `./mvnw generate-sources`, verify the exact enum value accessor for `BuyerPlaceOrderRequest.DispatchMode` and `DemandListingStatus`. The generator typically creates an inner enum with a `getValue()` method. Check the generated source under `target/generated-sources/openapi/` and adjust `.getValue()` calls if the enum accessor is named differently (e.g., some generators use `.name()` or `.toString()`).

> **Also check:** `DemandListing.getStatus()` return type — it may be the generated `DemandListingStatus` enum. Adjust the comparison accordingly (e.g., `DemandListingStatus.OPEN.equals(listing.getStatus())`).

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java
git commit -m "feat(service): add BuyerOrderService for order placement and retrieval"
```

---

## Task 7: Create `BuyerMarketplaceController`

**File:** `backend/src/main/java/com/mermaid/app/controller/BuyerMarketplaceController.java`

- [ ] **Step 1: Write the controller**

```java
package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerMarketplaceApi;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class BuyerMarketplaceController implements BuyerMarketplaceApi {

    private final MarketplaceService service;

    public BuyerMarketplaceController(MarketplaceService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<List<DemandListing>> getBuyerMarketplaceListings(
            Long speciesId, Long locationId, Double minOfferPrice, Double maxOfferPrice) {
        return ResponseEntity.ok(
            service.browseListings(speciesId, locationId, minOfferPrice, maxOfferPrice));
    }
}
```

> No `@PreAuthorize` here — public access is enforced at `SecurityConfig` level. The generated `BuyerMarketplaceApi` interface provides the `@RequestMapping` annotations.

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/BuyerMarketplaceController.java
git commit -m "feat(controller): add BuyerMarketplaceController (public listing browse)"
```

---

## Task 8: Create `BuyerOrderController`

**File:** `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java`

- [ ] **Step 1: Write the controller**

```java
package com.mermaid.app.controller;

import com.mermaid.app.api.BuyerOrdersApi;
import com.mermaid.app.model.BuyerPlaceOrderRequest;
import com.mermaid.app.model.Order;
import com.mermaid.app.security.SecurityUtils;
import com.mermaid.app.service.BuyerOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('BUYER')")
public class BuyerOrderController implements BuyerOrdersApi {

    private final BuyerOrderService service;

    public BuyerOrderController(BuyerOrderService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<Order> placeBuyerOrder(BuyerPlaceOrderRequest request) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.status(201).body(service.placeOrder(buyerId, request));
    }

    @Override
    public ResponseEntity<List<Order>> getBuyerOrders(String status) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(service.getMyOrders(buyerId, status));
    }

    @Override
    public ResponseEntity<Order> getBuyerOrderById(Long orderId) {
        Long buyerId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(service.getOrderById(buyerId, orderId));
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java
git commit -m "feat(controller): add BuyerOrderController (BUYER-authenticated order management)"
```

---

## Task 9: Update `SecurityConfig`

**File:** `backend/src/main/java/com/mermaid/app/config/SecurityConfig.java`

- [ ] **Step 1: Add the public permit for buyer marketplace**

In `apiSecurityFilterChain`, the current permit block ends before `.anyRequest().authenticated()`. Add a new matcher before that line:

```java
// Add this line right before .anyRequest().authenticated()
.requestMatchers(org.springframework.http.HttpMethod.GET, "/buyer/marketplace/listings").permitAll()
```

The block should look like:
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(
        "/auth/login", "/auth/register", "/auth/register-message", "/auth/logout",
        "/auth/verify-email", "/auth/forgot-password", "/auth/reset-password",
        "/auth/otp/verify", "/oauth2/**", "/login/oauth2/**", "/ws-chat/**"
    ).permitAll()
    .requestMatchers("/error").permitAll()
    .requestMatchers(org.springframework.http.HttpMethod.GET, "/buyer/marketplace/listings").permitAll()
    .anyRequest().authenticated()
)
```

- [ ] **Step 2: Build to verify**

```bash
cd backend
./mvnw clean package -DskipTests
```
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/config/SecurityConfig.java
git commit -m "feat(security): permit public GET /buyer/marketplace/listings"
```

---

## Task 10: Write Tests — `BuyerMarketplaceControllerTest`

**File:** `backend/src/test/java/com/mermaid/app/controller/BuyerMarketplaceControllerTest.java`

Pattern: `@WebMvcTest` + `MockMvc` + `@MockitoBean` — same as `MarketplaceControllerTest`.

- [ ] **Step 1: Write the test class**

```java
package com.mermaid.app.controller;

import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.model.DemandListing;
import com.mermaid.app.model.DemandListingStatus;
import com.mermaid.app.service.MarketplaceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.openapitools.jackson.nullable.JsonNullableModule;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BuyerMarketplaceController.class)
@Import({BuyerMarketplaceControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerMarketplaceControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean MarketplaceService marketplaceService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void browse_noAuth_returns200() throws Exception {
        when(marketplaceService.browseListings(isNull(), isNull(), isNull(), isNull()))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/buyer/marketplace/listings"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_withFilters_returns200() throws Exception {
        when(marketplaceService.browseListings(2L, null, null, null))
            .thenReturn(List.of(sampleListing()));

        mockMvc.perform(get("/buyer/marketplace/listings?speciesId=2"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void browse_emptyResults_returns200WithEmptyArray() throws Exception {
        when(marketplaceService.browseListings(isNull(), isNull(), isNull(), isNull()))
            .thenReturn(List.of());

        mockMvc.perform(get("/buyer/marketplace/listings"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$").isArray())
               .andExpect(jsonPath("$").isEmpty());
    }

    private DemandListing sampleListing() {
        return new DemandListing(
            1L, 1L,
            new com.mermaid.app.model.FishSpecies(2L, "Bangus", true),
            new com.mermaid.app.model.MarketLocation(3L, "City Public Market", "City of San Fernando", true),
            5.0, 150.0, DemandListingStatus.OPEN, OffsetDateTime.now());
    }
}
```

- [ ] **Step 2: Run the test**

```bash
cd backend
./mvnw test -Dtest=BuyerMarketplaceControllerTest
```
Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/mermaid/app/controller/BuyerMarketplaceControllerTest.java
git commit -m "test(buyer): BuyerMarketplaceControllerTest — public listing browse"
```

---

## Task 11: Write Tests — `BuyerOrderControllerTest`

**File:** `backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java`

- [ ] **Step 1: Write the test class**

```java
package com.mermaid.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mermaid.app.config.JacksonConfig;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.BuyerPlaceOrderRequest;
import com.mermaid.app.model.Order;
import com.mermaid.app.service.BuyerOrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.openapitools.jackson.nullable.JsonNullableModule;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BuyerOrderController.class)
@Import({BuyerOrderControllerTest.TestConfig.class, JacksonConfig.class})
class BuyerOrderControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public com.fasterxml.jackson.databind.Module jsonNullableModule() {
            return new JsonNullableModule();
        }
    }

    @Autowired MockMvc mockMvc;
    @MockitoBean BuyerOrderService buyerOrderService;
    @MockitoBean JwtDecoder jwtDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JsonNullableModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static org.springframework.test.web.servlet.request.RequestPostProcessor asBuyer(long userId) {
        return jwt().jwt(b -> b.subject(String.valueOf(userId)))
                    .authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    // --- place order ---

    @Test
    void placeOrder_valid_returns201() throws Exception {
        when(buyerOrderService.placeOrder(eq(42L), any(BuyerPlaceOrderRequest.class)))
            .thenReturn(sampleOrder());

        mockMvc.perform(post("/buyer/orders")
               .with(asBuyer(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":1,\"dispatchMode\":\"PICKUP\"}"))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void placeOrder_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/buyer/orders")
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":1,\"dispatchMode\":\"PICKUP\"}"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void placeOrder_listingNotFound_returns404() throws Exception {
        when(buyerOrderService.placeOrder(anyLong(), any(BuyerPlaceOrderRequest.class)))
            .thenThrow(new ResourceNotFoundException("Listing not found"));

        mockMvc.perform(post("/buyer/orders")
               .with(asBuyer(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":99,\"dispatchMode\":\"PICKUP\"}"))
               .andExpect(status().isNotFound());
    }

    @Test
    void placeOrder_deliveryWithoutAddress_returns400() throws Exception {
        when(buyerOrderService.placeOrder(anyLong(), any(BuyerPlaceOrderRequest.class)))
            .thenThrow(new IllegalArgumentException("deliveryAddress is required for DELIVERY orders"));

        mockMvc.perform(post("/buyer/orders")
               .with(asBuyer(42L))
               .contentType(MediaType.APPLICATION_JSON)
               .content("{\"listingId\":1,\"dispatchMode\":\"DELIVERY\"}"))
               .andExpect(status().isBadRequest());
    }

    // --- list orders ---

    @Test
    void getMyOrders_returns200() throws Exception {
        when(buyerOrderService.getMyOrders(42L, null))
            .thenReturn(List.of(sampleOrder()));

        mockMvc.perform(get("/buyer/orders").with(asBuyer(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(10));
    }

    @Test
    void getMyOrders_withStatusFilter_returns200() throws Exception {
        when(buyerOrderService.getMyOrders(42L, "PENDING"))
            .thenReturn(List.of(sampleOrder()));

        mockMvc.perform(get("/buyer/orders?status=PENDING").with(asBuyer(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].id").value(10));
    }

    // --- get by ID ---

    @Test
    void getOrderById_ownOrder_returns200() throws Exception {
        when(buyerOrderService.getOrderById(42L, 10L))
            .thenReturn(sampleOrder());

        mockMvc.perform(get("/buyer/orders/10").with(asBuyer(42L)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void getOrderById_notOwned_returns404() throws Exception {
        when(buyerOrderService.getOrderById(anyLong(), anyLong()))
            .thenThrow(new ResourceNotFoundException("Order not found"));

        mockMvc.perform(get("/buyer/orders/99").with(asBuyer(42L)))
               .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private Order sampleOrder() {
        Order o = new Order();
        o.setId(10L);
        o.setBuyerId(42L);
        o.setSellerId(5L);
        o.setStatus("PENDING");
        o.setDispatchMode("PICKUP");
        o.setCreatedAt(OffsetDateTime.now());
        return o;
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
cd backend
./mvnw test -Dtest=BuyerOrderControllerTest
```
Expected: all 7 tests pass.

- [ ] **Step 3: Run the full test suite**

```bash
cd backend
./mvnw test
```
Expected: BUILD SUCCESS. All existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/com/mermaid/app/controller/BuyerOrderControllerTest.java
git commit -m "test(buyer): BuyerOrderControllerTest — order placement and retrieval"
```

---

## Task 12: End-to-End Smoke Test

Run these manually once the app is running (`./mvnw spring-boot:run`):

- [ ] **Register a BUYER account**
```bash
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@test.com","password":"password123","fullName":"Test Buyer","role":"BUYER"}'
```
Expected: `{"message":"Check your email..."}` (or 201 with user profile)

- [ ] **Browse listings without login**
```bash
curl -s http://localhost:8080/api/buyer/marketplace/listings | python -m json.tool
```
Expected: 200 with array of listings (may be empty if no active listings).

- [ ] **Check market locations include coordinates**
```bash
curl -s http://localhost:8080/api/lookups/market-locations | python -m json.tool
```
Expected: 200 with array of locations. At least some should have non-null `lat`/`lng`.

- [ ] **Final commit (if any cleanup needed)**
```bash
git add -A
git commit -m "feat: buyer role backend complete — register, browse, order"
```
