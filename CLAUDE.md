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
    ├─ Auth, advisories, demand listings, trip/catch logging
    └─ Calls marine-service for conditions (X-API-Key header)
        ↓
Marine Service (FastAPI Python :8081)
    └─ Fetches Open-Meteo API, caches, returns risk levels (SAFE/CAUTION/UNSAFE)

PostgreSQL (:5432) — mermaid_db, Flyway migrations run on startup
```

The backend is **API-first**: `backend/src/main/resources/openapi/api.yaml` is the source of truth and drives code generation via the OpenAPI Maven plugin. Controllers implement the generated interfaces.

The marine service is **stateless** with in-memory TTL caching (15 min conditions, 1 hour forecasts).

## Common Commands

### Frontend
```bash
cd frontend
npm run dev      # Dev server on port 5173
npm run build    # Production build to dist/
npm run lint     # ESLint
```

### Backend
```bash
cd backend
./mvnw spring-boot:run    # Run locally
./mvnw clean package      # Build JAR
./mvnw test               # Run tests
```

### Marine Service
```bash
cd marine-service
uvicorn app.main:app --reload    # Dev server on port 8081
```

## Environment Setup

**Backend** (`backend/src/main/resources/application.properties`):
- DB: PostgreSQL on `localhost:5432/mermaid_db` (default user: `postgres`, pass: `1234`)
- JWT secret and expiry configurable via env vars
- Runs on `/api` context path

**Marine Service** (`marine-service/.env`, see `.env.example`):
- `MARINE_API_KEY` — shared secret used by the Java backend when calling this service
- `PORT=8081`
- `ALLOWED_ORIGINS` — space-separated list

## Key Conventions

- **Database migrations:** Add Flyway scripts in `backend/src/main/resources/db/migration/` using `V{n}__description.sql` naming. Never modify existing migration files.
- **OpenAPI spec:** When adding new backend endpoints, define them in `api.yaml` first; the Maven plugin generates the interface stubs.
- **Risk levels:** The marine service emits `SAFE`, `CAUTION`, or `UNSAFE` based on wave height, wind speed, gusts, and precipitation thresholds in `marine-service/app/services/risk_engine.py`.
- **Security:** Spring Security is configured as an OAuth2 resource server using JWT. Public endpoints are whitelisted in `SecurityConfig.java`; all others require a valid Bearer token.
- **Frontend API calls:** All `/api/*` requests from the dev server are proxied to `localhost:8080` via Vite config. No CORS issues in dev.

## Project Status (as of branch `marine-api`)

Implemented: Auth (login/register/current-user), admin user management, marine conditions service with risk assessment.

Still MVP-pending per manifesto: vendor demand listings, fisherman marketplace, admin advisories CRUD, trip sessions, safety checklists, catch logging, Docker Compose orchestration.
