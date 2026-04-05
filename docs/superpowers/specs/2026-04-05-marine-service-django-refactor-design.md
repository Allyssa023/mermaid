# Marine Service — Django + DRF Refactor Design

**Date:** 2026-04-05
**Branch:** week6-ayos
**Author:** Brainstormed with Claude Code

## Overview

Refactor the MERMAID marine service from FastAPI to Django + Django REST Framework (DRF). The service gains a PostgreSQL database for zone definitions and configurable risk thresholds. All existing API contracts (URLs, response shapes, auth header) remain unchanged so the Java backend requires no modifications.

---

## Goals

- Replace FastAPI with Django + DRF as the web framework
- Add PostgreSQL database (reusing `mermaid_db`) for:
  - `FishingZone` — replace hardcoded `ZONES` dict with DB-managed records
  - `RiskThreshold` — replace hardcoded scoring tables with DB-managed rows
  - `RiskConfig` — global risk level cutoffs, admin-editable
- Keep in-memory TTL cache (15 min conditions, 1 hr forecast) — aligned to Open-Meteo's 15-min update cadence
- Keep all 5 API endpoints at identical URLs with identical response shapes
- Sync views with `ThreadPoolExecutor` for parallel zone fetching (replaces `asyncio.gather`)

## Non-Goals

- No Redis or persistent cache (in-memory TTL is sufficient for single-process dev)
- No historical conditions log
- No API key DB table (single static key from `.env` is sufficient for now)
- No gunicorn (added later during Docker/production setup)

---

## Project Structure

```
marine-service/
  manage.py
  marine_project/               # Django project settings package
    __init__.py
    settings.py                 # replaces config.py; reads .env
    urls.py                     # top-level URL conf
    wsgi.py
  conditions/                   # single Django app
    __init__.py
    models.py                   # FishingZone, RiskThreshold, RiskConfig
    serializers.py              # DRF serializers (replaces Pydantic response models)
    views.py                    # DRF APIViews
    urls.py                     # conditions-specific URL patterns
    admin.py                    # Django admin registration
    authentication.py           # ApiKeyAuthentication (replaces require_api_key dep)
    migrations/
      0001_initial.py           # schema migration
      0002_seed_data.py         # data migration: 12 zones + default thresholds
  services/
    __init__.py
    open_meteo.py               # sync rewrite (httpx.Client, no async/await)
    risk_engine.py              # loads thresholds from DB instead of hardcoded tables
  cache/
    __init__.py
    ttl_cache.py                # unchanged in-memory TTL cache
  requirements.txt
  .env / .env.example
```

**Deleted:** `app/` directory entirely (FastAPI entry point, FastAPI routers, Pydantic-only models, `state.py`, `dependencies.py`).

---

## Database Models

### `FishingZone`

Replaces the hardcoded `ZONES` dict in `conditions.py`. Seeded via data migration with the existing 12 La Union zones.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `CharField(primary_key=True)` | e.g. `"sto_tomas"` |
| `name` | `CharField` | e.g. `"Sto. Tomas"` |
| `lat` | `FloatField` | |
| `lng` | `FloatField` | |
| `region` | `CharField` | default `"La Union"` |
| `is_active` | `BooleanField` | default `True`; soft delete |

### `RiskThreshold`

One row per scoring tier per parameter. Replaces `_WAVE_SCORES` and `_WIND_SCORES` in `risk_engine.py`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `AutoField` | |
| `parameter` | `CharField(choices)` | `WAVE`, `WIND` |
| `upper_bound` | `FloatField` | use `9999` for "infinity" tier |
| `score_points` | `IntegerField` | points added when value ≤ upper_bound |
| `order` | `IntegerField` | evaluation order (ascending) |

### `RiskConfig`

Single-row table for global risk level cutoffs and bonus thresholds. Admin-editable.

| Field | Type | Default |
|-------|------|---------|
| `safe_max_score` | `IntegerField` | `2` |
| `caution_max_score` | `IntegerField` | `5` |
| `gust_threshold_kmh` | `FloatField` | `60.0` |
| `heavy_rain_mm_h` | `FloatField` | `10.0` |
| `updated_at` | `DateTimeField(auto_now=True)` | |

---

## API Endpoints

All URLs unchanged. Java backend requires no modifications.

| Method | URL | Auth | View |
|--------|-----|------|------|
| `GET` | `/api/health` | None | `HealthView` |
| `GET` | `/api/conditions/zones` | None | `ZoneListView` |
| `GET` | `/api/conditions` | `X-API-Key` | `AllConditionsView` |
| `GET` | `/api/conditions/{zone_id}` | `X-API-Key` | `ZoneConditionsView` |
| `GET` | `/api/conditions/{zone_id}/forecast` | `X-API-Key` | `ZoneForecastView` |

### Authentication

`ApiKeyAuthentication` — a custom DRF `BaseAuthentication` subclass in `conditions/authentication.py`. Reads `X-API-Key` header, compares against `settings.MARINE_API_KEY` using `hmac.compare_digest` (timing-safe). Raises `AuthenticationFailed` on mismatch. Applied via `authentication_classes` and `permission_classes = [IsAuthenticated]` on protected views.

### Parallel Fetching (`AllConditionsView`)

Uses `concurrent.futures.ThreadPoolExecutor` to call `open_meteo.fetch_current_conditions` for all active zones concurrently. Equivalent speed to the current `asyncio.gather` pattern, compatible with sync DRF views.

```python
with ThreadPoolExecutor(max_workers=len(zones)) as executor:
    futures = {executor.submit(fetch_current_conditions, zone, client): zone for zone in zones}
    results = [f.result() for f in futures]
```

---

## Services Layer

### `services/open_meteo.py`

Rewritten as synchronous. `httpx.AsyncClient` → `httpx.Client`. All `async def` → `def`, all `await` removed. `asyncio.gather` for marine+weather concurrent fetch replaced with `ThreadPoolExecutor` (same pattern as views layer). All parsing logic (`_parse_marine_current`, `_parse_weather_current`, `_build_hourly_points`, `_aggregate_daily`) is unchanged.

### `services/risk_engine.py`

`compute_risk` signature unchanged. Scoring tables (`_WAVE_SCORES`, `_WIND_SCORES`, `_GUST_THRESHOLD_KMH`, `_HEAVY_RAIN_MM_H`, `_SAFE_MAX_SCORE`, `_CAUTION_MAX_SCORE`) loaded from DB via a cached queryset at startup instead of hardcoded module-level constants. A simple module-level `_load_thresholds()` function reads from `RiskThreshold` and `RiskConfig` on first call and caches in memory (invalidated on Django startup).

---

## Configuration (`marine_project/settings.py`)

Reads from `.env` — same file, same keys as the current `.env.example`. No environment changes needed.

```python
MARINE_API_KEY         # X-API-Key secret
ALLOWED_ORIGINS        # space-separated CORS origins
CONDITIONS_CACHE_TTL   # default 900 (15 min)
FORECAST_CACHE_TTL     # default 3600 (1 hr)
HTTP_TIMEOUT           # default 30.0
DB_NAME / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT
```

Database: `mermaid_db` on `localhost:5432` — same Postgres instance used by the Java backend. The marine service gets its own Django-managed tables inside the same DB (no schema conflicts; Django uses `django_` prefixed system tables and `conditions_` prefixed app tables).

---

## Requirements Changes

```
# Remove
fastapi==0.135.1
uvicorn==0.42.0
starlette==0.52.1

# Add
djangorestframework==3.15.x
django-cors-headers==4.x       # replaces FastAPI CORSMiddleware
```

Kept: `django==6.0.1`, `httpx`, `pydantic`, `psycopg2-binary`, `python-dotenv`

---

## Migration Plan (Implementation Order)

1. Scaffold Django project — `manage.py`, `marine_project/` settings package, `conditions/` app
2. Write `conditions/models.py` — `FishingZone`, `RiskThreshold`, `RiskConfig`
3. `makemigrations` → schema migration (`0001_initial.py`)
4. Write data migration (`0002_seed_data.py`) — seed 12 La Union zones + default threshold rows
5. Rewrite `services/open_meteo.py` as sync
6. Update `services/risk_engine.py` to load thresholds from DB
7. Write `conditions/serializers.py` — DRF serializers replacing Pydantic response models
8. Write `conditions/authentication.py` — `ApiKeyAuthentication`
9. Write `conditions/views.py` + `conditions/urls.py`
10. Register models in `conditions/admin.py`
11. Wire top-level `marine_project/urls.py`
12. Delete `app/` directory
13. Update `requirements.txt`
14. Smoke test all 5 endpoints

---

## Dev Commands (After Refactor)

```bash
cd marine-service
python manage.py migrate          # run migrations (creates tables + seeds data)
python manage.py runserver 8081   # dev server on port 8081 (same port as before)
python manage.py createsuperuser  # create Django admin user
# Admin UI available at http://localhost:8081/admin
```
