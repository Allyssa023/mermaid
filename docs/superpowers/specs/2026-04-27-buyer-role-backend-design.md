# Buyer/Consumer Role — Backend Design Spec

**Date:** 2026-04-27
**Project:** MERMAID (Marine Early-warning, Risk Monitoring & Advisory Information for Demand)
**Scope:** Backend only. Frontend (BuyerDashboard + Leaflet map) is a separate cycle.

---

## Problem Statement

MERMAID currently supports three roles: ADMIN, VENDOR, FISHERMAN. There is no role for retail consumers (buyers) who want to browse what wet market vendors are selling, see where stalls are located on a map, place orders, and communicate with vendors. The `orders` table already has a `buyer_id` FK (V18 migration), anticipating this role. This spec defines the backend work needed to activate it.

---

## Decisions

| Question | Decision |
|----------|----------|
| Can buyers browse without login? | Yes — listing browse is public |
| What can buyers see? | Vendor demand listings only (not catch alerts) |
| Can buyers place orders? | Yes (requires BUYER account) |
| Can buyers message vendors? | Yes (uses existing messages table) |
| Delivery address? | Yes — new `delivery_address` column on orders |
| Market location coordinates? | Add `lat`/`lng` to `market_locations`, seed La Union markets |
| Map library (frontend) | Leaflet + OpenStreetMap |
| Controller architecture | New `/buyer/` namespace (mirrors existing `/vendor/` pattern) |

---

## Data Layer

### Migration V22 — `market_locations` coordinates + BUYER role constraint

File: `backend/src/main/resources/db/migration/V22__add_market_location_coords_and_buyer_role.sql`

- `ALTER TABLE market_locations ADD COLUMN lat NUMERIC(9,6)`
- `ALTER TABLE market_locations ADD COLUMN lng NUMERIC(9,6)`
- `UPDATE` each active La Union market with real GPS coordinates (looked up during implementation from V10 market names)
- Drop and recreate `users_role_check` constraint to include `'BUYER'`
- **Note:** Dropping and recreating a CHECK constraint acquires an `ACCESS EXCLUSIVE` lock on the `users` table. This is safe in dev/staging. On production, schedule during a maintenance window or use `NOT VALID` + `VALIDATE CONSTRAINT` to reduce lock time.

### Migration V23 — `orders` delivery address

File: `backend/src/main/resources/db/migration/V23__add_delivery_address_to_orders.sql`

- `ALTER TABLE orders ADD COLUMN delivery_address TEXT`
- Nullable — only populated when `dispatch_mode = 'DELIVERY'`

---

## API Layer (`api.yaml`)

All changes go in `backend/src/main/resources/openapi/api.yaml`. After editing, run `./mvnw generate-sources`.

### Schema changes

**`MarketLocationDto`** — add optional fields:
```yaml
lat:
  type: number
  format: double
lng:
  type: number
  format: double
```

**`RegisterRequest.role` enum** — add `BUYER` alongside `VENDOR` and `FISHERMAN`.

**New `PlaceOrderRequest` schema:**
```yaml
required: [listingId, dispatchMode]
properties:
  listingId: integer (int64)
  orderedQtyKg: number
  orderedQtyEstimate: string
  dispatchMode: string, enum: [PICKUP, DELIVERY]
  deliveryAddress: string (required when dispatchMode=DELIVERY — validated in service)
  notes: string
```

**New `BuyerOrderResponse` schema** — fields: `id`, `listingId`, `sellerId`, `speciesName`, `orderedQtyKg`, `orderedQtyEstimate`, `agreedPricePerKg`, `dispatchMode`, `deliveryAddress`, `status`, `notes`, `createdAt`.

### New endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/buyer/marketplace/listings` | None (public) | Browse open vendor demand listings |
| POST | `/buyer/orders` | BUYER | Place an order against a listing |
| GET | `/buyer/orders` | BUYER | List own orders (optional `?status=` filter) |
| GET | `/buyer/orders/{orderId}` | BUYER | Get single order (ownership enforced) |

Query params on `GET /buyer/marketplace/listings`: `speciesId`, `locationId`, `minOfferPrice`, `maxOfferPrice` — same as fisherman marketplace.

---

## Domain Entities

### `Order.java`
File: `backend/src/main/java/com/mermaid/app/domain/Order.java`

Add:
```java
@Column(name = "delivery_address", columnDefinition = "TEXT")
private String deliveryAddress;
```

### `MarketLocation.java`
File: `backend/src/main/java/com/mermaid/app/domain/MarketLocation.java`

Add:
```java
@Column(name = "lat", precision = 9, scale = 6)
private BigDecimal lat;

@Column(name = "lng", precision = 9, scale = 6)
private BigDecimal lng;
```

---

## Repository

### `OrderRepository.java`
File: `backend/src/main/java/com/mermaid/app/repository/OrderRepository.java`

The repository already has `findAllByParticipant(Long userId)` and `findAllByParticipantAndStatus(Long userId, String status)` covering both buyer and seller retrieval. `BuyerOrderService` will use these existing queries and filter results to buyer-owned orders only, keeping a single retrieval pattern across roles. No new query methods needed.

---

## Mappers

### `MarketLocationMapper.java`
File: `backend/src/main/java/com/mermaid/app/mapper/MarketLocationMapper.java`

In `toDto()`, add:
```java
dto.setLat(entity.getLat());
dto.setLng(entity.getLng());
```

### New `BuyerOrderMapper.java`
File: `backend/src/main/java/com/mermaid/app/mapper/BuyerOrderMapper.java`

Maps `Order` entity → `BuyerOrderResponse` DTO. Resolves species name from the species relationship.

---

## Service Layer

### New `BuyerOrderService.java`
File: `backend/src/main/java/com/mermaid/app/service/BuyerOrderService.java`

**`placeOrder(Long buyerId, PlaceOrderRequest request)`** — `@Transactional`
1. Load listing by ID; throw `ResourceNotFoundException` if not found, deleted, or not OPEN
2. Validate: if `dispatchMode == DELIVERY` and `deliveryAddress` is blank → throw `IllegalArgumentException`
3. Build `Order`: `buyerId` from param, `sellerId` = `listing.vendorId`, `demandListingId`, `speciesId`, `agreedPricePerKg` = `listing.offerPricePerKg`, `status = PENDING`
4. Save and return mapped response

**`getMyOrders(Long buyerId, String status)`** — `@Transactional(readOnly = true)`
- Delegates to existing `OrderRepository.findAllByParticipant(buyerId)` or `findAllByParticipantAndStatus(buyerId, status)`, then filters to buyer-owned orders. Note: `status` is `String` — no `OrderStatus` enum exists in the domain; the valid values (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `DISPUTED`) are enforced by the DB CHECK constraint.

**`getOrderById(Long buyerId, Long orderId)`** — `@Transactional(readOnly = true)`
- Loads order; throws `ResourceNotFoundException` if not found or `buyerId` doesn't match

No new service needed for listing browse — delegates to existing `MarketplaceService.browseListings(speciesId, locationId, minOfferPrice, maxOfferPrice)`.

---

## Controllers

### New `BuyerMarketplaceController.java`
File: `backend/src/main/java/com/mermaid/app/controller/BuyerMarketplaceController.java`

- Implements generated `BuyerMarketplaceApi` interface
- No `@PreAuthorize` — public access handled at `SecurityConfig` level
- Delegates to `MarketplaceService.browseListings(speciesId, locationId, minOfferPrice, maxOfferPrice)` — the same method used by the fisherman `MarketplaceController`

### New `BuyerOrderController.java`
File: `backend/src/main/java/com/mermaid/app/controller/BuyerOrderController.java`

- Implements generated `BuyerOrdersApi` interface
- `@PreAuthorize("hasRole('BUYER')")` at class level
- Uses `SecurityUtils.currentUserId()` for `buyerId` — same pattern as `VendorDemandListingController`

---

## Security Config

File: `backend/src/main/java/com/mermaid/app/config/SecurityConfig.java`

Add to public permit list:
```java
.requestMatchers(HttpMethod.GET, "/buyer/marketplace/listings").permitAll()
```

### `ChatController.java`
File: `backend/src/main/java/com/mermaid/app/controller/ChatController.java`

The actual messages controller is `ChatController` (not `MessagesController`). It has no class-level `@PreAuthorize` — it relies on the catch-all `.anyRequest().authenticated()` in `SecurityConfig`. Since BUYER is an authenticated role, **no change is needed** — BUYER users can access chat endpoints automatically once they have a valid JWT. No modification required.

---

## Error Handling

All exceptions map through the existing `GlobalExceptionHandler` — no new exception types needed:

| Condition | Exception | HTTP |
|-----------|-----------|------|
| Listing not found or closed | `ResourceNotFoundException` | 404 |
| DELIVERY order without address | `IllegalArgumentException` | 400 |
| Order not found or not owned | `ResourceNotFoundException` | 404 |

---

## Files Summary

**Create (6 files):**
- `V22__add_market_location_coords_and_buyer_role.sql`
- `V23__add_delivery_address_to_orders.sql`
- `BuyerOrderService.java`
- `BuyerOrderMapper.java`
- `BuyerMarketplaceController.java`
- `BuyerOrderController.java`

**Modify (6 files):**
- `api.yaml`
- `Order.java`
- `MarketLocation.java`
- `MarketLocationMapper.java`
- `SecurityConfig.java`
- ~~`ChatController.java`~~ — no change needed (BUYER auto-inherits `.anyRequest().authenticated()`)

---

## Verification

1. **Migrations apply cleanly** — `./mvnw spring-boot:run` shows V22 and V23 OK with no errors
2. **Sources generate** — `./mvnw generate-sources` produces `BuyerMarketplaceApi` and `BuyerOrdersApi` interfaces
3. **BUYER registration** — `POST /auth/register` with `role: BUYER` succeeds; JWT contains `ROLE_BUYER`
4. **Public browse** — `GET /buyer/marketplace/listings` with no Authorization header returns 200
5. **Order validation** — `POST /buyer/orders` with `dispatchMode: DELIVERY` and no `deliveryAddress` returns 400
6. **Order placement** — same with `deliveryAddress` present returns 201
7. **Order ownership** — `GET /buyer/orders/{id}` with a different user's JWT returns 404
8. **Coordinates in response** — `GET /lookups/market-locations` includes non-null `lat`/`lng` for La Union markets
9. **Existing roles unaffected** — fisherman and vendor endpoints return correct responses without change
