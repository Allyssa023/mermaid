# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MERMAID** — Marine Early-warning, Risk Monitoring & Advisory Information for Demand. A fisheries safety and market coordination platform for small-scale fishermen and wet market vendors.

**Two user personas:** Isidro (fisherman) and Rosario (wet market vendor).

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
```

### Frontend
```bash
cd frontend
npm run dev      # Dev server on port 5173
npm run build    # Production build to dist/
npm run lint     # ESLint
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

Service methods use `@Transactional(readOnly = true)` for reads and `@Transactional` for writes. Throw `ResourceNotFoundException` (→ 404) and `IllegalArgumentException` (→ 400) — both are handled in `GlobalExceptionHandler`.

### Soft delete
All domain entities use soft delete — never call `deleteById()`. Set the boolean active flag to `false` and call `save()`. The `fish_species` and `market_locations` tables index on `active = true`; the `advisories` table uses `is_active`.

### Security
Spring Security is an OAuth2 resource server (stateless, no sessions). JWT roles are extracted from the `roles` claim as a list of strings (e.g. `["ROLE_ADMIN"]`) by `JwtAuthenticationConverter`. Public endpoints: `/auth/login`, `/auth/register`, `/error`. Everything else requires a valid Bearer token. Admin-only controllers carry `@PreAuthorize("hasRole('ADMIN')")` at class level.

### Adding new endpoints
1. Define the path, request/response schemas, and `required` fields (with `minLength`/`maxLength`) in `api.yaml`.
2. Run `./mvnw generate-sources` (or `clean package`) — the plugin regenerates interfaces and models.
3. Implement the generated interface in a new or existing controller.
4. Add a Flyway migration (`V{n}__description.sql`) if schema changes are needed. Never modify existing migration files.

### Controller tests
Use `@WebMvcTest(FooController.class)` + `MockMvc`. Mock all service dependencies with `@MockitoBean`. Authenticate with `SecurityMockMvcRequestPostProcessors.jwt()` and set `.claim("roles", List.of("ROLE_ADMIN"))` for admin tests. `@MockitoBean JwtDecoder jwtDecoder` is required in every controller test slice to satisfy the security auto-configuration.

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

## Project Status

**Implemented:** Auth (login/register/current-user), admin user management, marine conditions with risk assessment, admin advisories CRUD, fish species and market location reference data (lookup endpoints + admin CRUD).

**Still MVP-pending:** Vendor demand listings, fisherman marketplace, trip sessions, safety checklists, catch logging, Docker Compose orchestration.

**Frontend:** Early MVP stage — currently a single `App.jsx` with login/register UI. No component structure yet.
