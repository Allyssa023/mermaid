# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MERMAID** — Marine Early-warning, Risk Monitoring & Advisory Information for Demand. A fisheries safety and market coordination platform for small-scale fishermen and wet market vendors.

**Four user roles:** `FISHERMAN`, `VENDOR`, `BUYER`, `ADMIN`. Isidro is the fisherman persona; Rosario is the wet market vendor persona.

## Architecture

Three-tier system:

```
Frontend (React/Vite :5173)
    ↓ /api proxy → Backend (:8080)
Backend (Spring Boot Java :8080)
    ├─ Auth, advisories, reference data (fish species, market locations), admin CRUD
    └─ Calls marine-service for conditions (X-API-Key header)
        ↓
Marine Service (FastAPI Python :8081)
    └─ Fetches Open-Meteo API, caches, returns risk levels (SAFE/CAUTION/UNSAFE)

PostgreSQL (:5432) — mermaid_db, Flyway migrations run on startup
```

The backend is **API-first**: `backend/src/main/resources/openapi/api.yaml` is the source of truth and drives code generation via the `openapi-generator-maven-plugin` (v7.20.0). It generates interfaces into `com.mermaid.app.api` and DTOs into `com.mermaid.app.model`. Controllers implement those generated interfaces — never write a controller method signature by hand.

The marine service is **stateless** with in-memory TTL caching (15 min conditions, 1 hour forecasts).

## Common Commands

### Backend
```bash
cd backend
./mvnw spring-boot:run              # Run locally (runs Flyway migrations on start)
./mvnw clean package                # Build JAR
./mvnw test                         # Run all tests
./mvnw test -Dtest=FooServiceTest   # Run a single test class
./mvnw test -Dtest=FooServiceTest#myMethodName  # Run a single test method
./mvnw generate-sources             # Regenerate OpenAPI interfaces and DTOs only
```

### Frontend
```bash
cd frontend
npm run dev      # Dev server on port 5173
npm run build    # Production build to dist/
npm run lint     # ESLint
npm test         # Run Vitest unit tests (vitest run)
```

### Marine Service
```bash
cd marine-service
uvicorn app.main:app --reload    # Dev server on port 8081
```

## Environment Setup

**Backend** (`backend/src/main/resources/application.properties`):
- DB: PostgreSQL on `localhost:5432/mermaid_db` (default user: `postgres`, pass: `1234`)
- JWT: HS256, secret and expiry configurable via env vars; secret must be ≥ 32 bytes
- Runs on `/api` context path
- **Xendit** (optional): set `xendit.secret-key`, `xendit.public-key`, `xendit.webhook-token`, and `xendit.return-url` to activate the payment gateway. `XenditPaymentGatewayService` is `@ConditionalOnExpression` — if the key is blank a no-op stub is used.

**Marine Service** (`marine-service/.env`, see `.env.example`):
- `MARINE_API_KEY` — shared secret used by the Java backend (`X-API-Key` header)
- `PORT=8081`
- `ALLOWED_ORIGINS` — space-separated list

## Backend Architecture Patterns

### Service–Repository–Mapper triad
Every domain object follows the same pattern (modeled after `AdminUserService`):

```
domain/Foo.java          — JPA @Entity
repository/FooRepository — extends JpaRepository<Foo, Long>
mapper/FooMapper         — maps entity ↔ generated model DTO
service/FooService       — business logic, all writes are @Transactional
```

Service methods use `@Transactional(readOnly = true)` for reads and `@Transactional` for writes. `GlobalExceptionHandler` maps domain exceptions to HTTP responses:

| Exception | HTTP | Error Code |
|-----------|------|------------|
| `ResourceNotFoundException` | 404 | — |
| `IllegalArgumentException` | 400 | — |
| `EmailAlreadyExistsException` | 409 | — |
| `EmailNotVerifiedException` | 403 | — |
| `AccessDeniedException` | 403 | — |
| `ListingClosedException` | 409 | `LISTING_CLOSED` |
| `InsufficientStockException` | 409 | `INSUFFICIENT_STOCK` |
| `IllegalStateException` | 409 | `ILLEGAL_STATE` |
| `DuplicateInterestException` | 409 | `DUPLICATE_INTEREST` |
| `DealConflictException` | 409 | `DEAL_CONFLICT` |
| `TripNotActiveException` | 409 | — |
| `MarineServiceUnavailableException` | 503 | — |
| `InvalidCredentialsException` | 401 | — |
| `UnsupportedOperationException` | 501 | — |

### Soft delete
All domain entities use soft delete — never call `deleteById()`. Set the boolean active flag to `false` and call `save()`. The `fish_species` and `market_locations` tables index on `active = true`; the `advisories` table uses `is_active`.

### Security
Spring Security is an OAuth2 resource server (stateless, no sessions). JWT roles are extracted from the `roles` claim as a list of strings (e.g. `["ROLE_VENDOR"]`) by `JwtAuthenticationConverter`. Public endpoints: `/auth/login`, `/auth/register`, `/error`. Everything else requires a valid Bearer token. Admin-only controllers carry `@PreAuthorize("hasRole('ADMIN')")` at class level. Role-based guards on individual methods use `hasRole('VENDOR')`, `hasRole('FISHERMAN')`, `hasRole('BUYER')` etc.

`SecurityUtils.currentUserId()` extracts the authenticated user's ID from the JWT for use in service calls.

### Adding new endpoints
1. Define the path, request/response schemas, and `required` fields (with `minLength`/`maxLength`) in `api.yaml`.
2. Run `./mvnw generate-sources` (or `clean package`) — the plugin regenerates interfaces and models.
3. Implement the generated interface in a new or existing controller.
4. Add a Flyway migration (`V{n}__description.sql`) if schema changes are needed. Never modify existing migration files.

### Controller tests
Use `@WebMvcTest(FooController.class)` + `MockMvc`. Mock all service dependencies with `@MockitoBean`. Authenticate with `SecurityMockMvcRequestPostProcessors.jwt()` and set `.claim("roles", List.of("ROLE_ADMIN"))` for admin tests. `@MockitoBean JwtDecoder jwtDecoder` is required in every controller test slice to satisfy the security auto-configuration.

### WebSocket / Real-time
`WebSocketConfig` sets up STOMP over SockJS at `/ws`. Three per-user queues used across the app:
- `/user/queue/messages` — deal chat messages (carry `dealId` in `ChatMessage`)
- `/user/queue/deals` — deal lifecycle events (NEGOTIATING → AGREED/EXPIRED/CANCELLED)
- `/user/queue/notifications` — bell pings (new order, proposal, etc.)

`ChatController` handles `@MessageMapping("/chat.send")` and broadcasts via `SimpMessagingTemplate`. `NotificationEventListener` listens for Spring `ApplicationEvent`s (e.g., `OrderStatusChangeEvent`) and pushes to `/user/queue/notifications`.

### Order lifecycle
All orders use a single RETAIL flow (no separate procurement-order kind in practice). Status progression:

```
PENDING → CONFIRMED → COMPLETED
```

Sub-steps overlaid on this: handoff confirmation (seller then buyer), then payment recording (vendor records, fisherman confirms). `OrderService` publishes `OrderStatusChangeEvent` on every transition so `NotificationEventListener` can push real-time bell pings.

### CatchAlert flow
Fisherman posts a `CatchAlert` (ACTIVE) with species, kg, landing site, and asking price. Vendors browse the procurement feed, add alerts to a `ProcurementCart`, then start a `Deal` to negotiate. On deal acceptance a RETAIL `Order` is created; `claimedKg` on the alert is incremented and the alert flips to SOLD when fully claimed.

### Deal negotiation
Vendor starts a deal from a procurement cart row → `Deal` (NEGOTIATING) + opening `DealProposal`. Either party counters via `POST /deals/{id}/proposals`; a partial unique index `uq_deal_proposals_pending` enforces one pending proposal per deal. Accepting a proposal row-locks the alert, creates an `Order`, transitions the deal to AGREED, and sweeps competing peer deals (OVERCOMMIT → SUPERSEDED; sold-out alert → CANCELLED with reason `ALERT_SOLD_OUT`). `DealExpirySweeper` runs every 60 s and expires stale NEGOTIATING deals.

## Marine Service Structure

```
marine-service/app/
  main.py            — FastAPI app, CORS, lifespan, router mounting
  config.py          — env-var settings
  dependencies.py    — dependency injection helpers
  routers/           — route handlers (conditions, health)
  services/          — risk_engine.py (thresholds), caching layer
  models/            — Pydantic models
```

Risk levels (`SAFE`/`CAUTION`/`UNSAFE`) are computed by `risk_engine.py` from wave height, wind speed, gusts, and precipitation thresholds.

## Frontend Structure

The frontend is a multi-role SPA. `App.jsx` reads the JWT role and mounts the appropriate dashboard. Role dispatch:

| Role | Root component |
|------|---------------|
| `FISHERMAN` | `fisherman/FishermanDashboard.jsx` |
| `VENDOR` | `vendor/VendorDashboard.jsx` |
| `BUYER` | `buyer/BuyerDashboard.jsx` |
| `ADMIN` | `AdminDashboard.jsx` |

Each role has its own layout, page files, and `api/` module directory. Shared infrastructure:

- **`src/context/AuthContext.jsx`** — JWT storage, user object, login/logout
- **`src/context/StompContext.jsx`** — single STOMP client (SockJS); all pages share this connection. Deal chat, deal events, and notification bell subscribe here.
- **`src/lib/queryClient.js`** — global React Query client (TanStack Query v5)
- **`src/api.js`** — Axios instance with `/api` base URL and auth header injection
- **`src/components/DealChatPane.jsx`** — shared deal chat pane used by both vendor and fisherman Messages pages

Frontend tests use **Vitest** + React Testing Library (`npm test`). Test files live beside the pages they test in `__tests__/` subdirectories.

## Project Status

**Fully implemented:**
- Auth: login, register, email verification, Google OAuth2, current-user endpoint
- Admin: user management, advisories CRUD, fish species & market location CRUD
- Marine conditions with risk assessment
- Fisherman: trip sessions (ACTIVE→ENDED lifecycle with safety checklist), catch logs (domain entity, service, mapper, controller all implemented), catch alerts, procurement feed, earnings, profile
- Vendor: demand listings, storefront editor, inventory management, shop profile, analytics, payouts, procurement cart, watchlist, deal negotiation, orders inbox
- Buyer: marketplace, cart, checkout (Xendit e-wallet/card), addresses, orders, favorites, reviews, recommendations, public shop, payment return page
- Deals negotiation: full backend + frontend (vendor ProcurementFeed, fisherman ActiveDeals, shared Messages page with chat)
- Real-time: STOMP WebSocket for chat, deal events, and notification bell (all three roles)
- File uploads: `FileUploadController` serves and stores images; `LocalStorageService` writes to local disk
- Payments: Xendit `/v3/payment_requests` for GCash, PayMaya, and card; webhook handler at `POST /payments/webhook`; BFAR reference prices lookup
- Notifications: `Notification` entity, `NotificationController`, `NotificationEventListener` publishing via STOMP

**Still MVP-pending:** Docker Compose orchestration.
