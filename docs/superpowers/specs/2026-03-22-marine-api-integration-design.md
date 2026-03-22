# Marine API Integration Design

**Date:** 2026-03-22
**Branch:** marine-api
**Status:** Approved

---

## Overview

Complete the marine API integration across all three tiers:

1. Fix efficiency and redundancy issues in the Python marine service
2. Expand the `api.yaml` schema to expose the full risk assessment model
3. Build the missing Java backend bridge (`MarineController` + `MarineServiceClient` + mapper + cache)

The marine service (FastAPI, port 8081) is fully working. The Java backend has the `/marine/conditions` path defined in `api.yaml` but no implementation. The frontend has no marine UI yet.

---

## Architecture

```
Frontend (React :5173)
    ↓ Bearer JWT
Backend (Spring Boot :8080)
    ├─ MarineController  →  MarineServiceClient (RestClient, retry-once, 5s timeout)
    │                                ↓ X-API-Key header
    └─ Caffeine cache (5 min, all-zones)
        Marine Service (FastAPI :8081)
            ├─ TTL cache: conditions 15 min, forecast 1 hr
            └─ Open-Meteo Marine + Weather APIs (concurrent fetch)
```

---

## Section 1 — Python Marine Service Fixes

### 1.1 Cache warmup in `get_all_conditions`

**File:** `marine-service/app/routers/conditions.py`

After `asyncio.gather` resolves all zone conditions, write each `ZoneConditions` result into its individual `conditions:{zone_id}` cache key before building and caching the aggregate response.

**Before (simplified):**
```python
zones_data = [r for r in results if not isinstance(r, Exception)]
response = AllConditionsResponse(zones=zones_data, ...)
cache.set("conditions:all", response, ttl)
return response
```

**After:**
```python
zones_data = []
for zone, r in zip(ZONES.values(), results):
    if isinstance(r, Exception):
        logger.warning("Failed to fetch zone %s: %s", zone.id, r)
    else:
        cache.set(f"conditions:{zone.id}", r, settings.conditions_cache_ttl)
        zones_data.append(r)
response = AllConditionsResponse(zones=zones_data, ...)
cache.set("conditions:all", response, settings.conditions_cache_ttl)
return response
```

Benefit: any subsequent `GET /{zone_id}` within the TTL window is a pure cache hit.

### 1.2 Deduplicate `httpx` error handling

**File:** `marine-service/app/routers/conditions.py`

Both `get_zone_conditions` and `get_zone_forecast` contain identical `try/except` blocks. Extract into a reusable async context manager:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def _open_meteo_errors(zone_id: str):
    try:
        yield
    except httpx.HTTPStatusError as exc:
        logger.error("Open-Meteo HTTP error for %s: %s", zone_id, exc)
        raise HTTPException(status_code=503, detail="Marine data service temporarily unavailable")
    except httpx.RequestError as exc:
        logger.error("Open-Meteo request error for %s: %s", zone_id, exc)
        raise HTTPException(status_code=503, detail="Marine data service temporarily unavailable")
```

Usage:
```python
async with _open_meteo_errors(zone_id):
    conditions = await open_meteo.fetch_current_conditions(zone, client)
```

Removes ~12 lines of copy-pasted error handling.

### 1.3 Remove module-level `settings` in `conditions.py`

**File:** `marine-service/app/routers/conditions.py`

Remove `settings = get_settings()` at module level. Access settings only where needed via `get_settings()` inline (it is `@lru_cache` so there is no performance cost). This keeps config access consistent across the codebase.

---

## Section 2 — `api.yaml` Schema Expansion

### 2.1 Replace `MarineConditionsResponse`

Remove the existing flat schema and replace with a structured model that maps 1:1 to the marine service's `ZoneConditions` output.

```yaml
RiskAssessmentDto:
  type: object
  required: [level, score, factors, advisory]
  properties:
    level:
      $ref: '#/components/schemas/RiskLevel'
    score:
      type: integer
      minimum: 0
      maximum: 10
    factors:
      type: array
      items:
        type: string
    advisory:
      type: string

MarineDataDto:
  type: object
  properties:
    waveHeightM:    { type: number, format: double, nullable: true }
    swellHeightM:   { type: number, format: double, nullable: true }
    swellPeriodS:   { type: number, format: double, nullable: true }
    swellDirectionDeg: { type: number, format: double, nullable: true }

WeatherDataDto:
  type: object
  required: [windSpeedKmh, windDirectionDeg, windGustsKmh, precipitationMm, temperatureC, cloudCoverPct]
  properties:
    windSpeedKmh:    { type: number, format: double }
    windDirectionDeg: { type: number, format: double }
    windGustsKmh:    { type: number, format: double }
    precipitationMm: { type: number, format: double }
    temperatureC:    { type: number, format: double }
    cloudCoverPct:   { type: number, format: double }

MarineConditionsResponse:
  type: object
  required: [zoneId, zoneName, region, observedAt, risk, marine, weather, dataSource]
  properties:
    zoneId:      { type: string }
    zoneName:    { type: string }
    region:      { type: string }
    lat:         { type: number, format: double }
    lng:         { type: number, format: double }
    observedAt:  { type: string, format: date-time }
    risk:        { $ref: '#/components/schemas/RiskAssessmentDto' }
    marine:      { $ref: '#/components/schemas/MarineDataDto' }
    weather:     { $ref: '#/components/schemas/WeatherDataDto' }
    dataSource:  { type: string }

AllMarineConditionsResponse:
  type: object
  required: [zones, generatedAt]
  properties:
    zones:
      type: array
      items:
        $ref: '#/components/schemas/MarineConditionsResponse'
    generatedAt:
      type: string
      format: date-time
```

### 2.2 Replace endpoint definitions

```yaml
/marine/conditions:
  get:
    tags: [Marine]
    summary: Current conditions — all zones
    operationId: getAllMarineConditions
    responses:
      '200':
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AllMarineConditionsResponse'
      '503':
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'

/marine/conditions/{zoneId}:
  get:
    tags: [Marine]
    summary: Current conditions — single zone
    operationId: getMarineConditionsByZone
    parameters:
      - in: path
        name: zoneId
        required: true
        schema:
          type: string
    responses:
      '200':
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MarineConditionsResponse'
      '404':
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '503':
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

## Section 3 — Java Backend Bridge

### 3.1 `application.properties` additions

```properties
marine.service.url=${MARINE_SERVICE_URL:http://localhost:8081}
marine.service.api-key=${MARINE_API_KEY:dev-marine-key-change-in-prod}
marine.service.timeout-seconds=5
marine.cache.conditions-ttl-seconds=300
```

### 3.2 `MarineServiceClient.java`

**Package:** `com.mermaid.app.client`

- `@Component` that builds a `RestClient` on construction from injected properties
- Configured with `ConnectTimeout` and `ReadTimeout` of 5 seconds
- `getAllConditions()` — `GET /api/conditions` with `X-API-Key` header, returns raw marine-service `AllConditionsResponse` DTO
- `getZoneConditions(String zoneId)` — `GET /api/conditions/{zoneId}`, returns raw `ZoneConditions` DTO
- Both methods catch `RestClientResponseException` (4xx/5xx) and `ResourceAccessException` (timeout/network)
- On 404 from marine service → rethrow as `ResourceNotFoundException`
- On 5xx or network error → retry once, then throw `MarineServiceUnavailableException`

### 3.3 `MarineConditionsMapper.java`

**Package:** `com.mermaid.app.mapper`

A `@Component` with pure mapping methods (no I/O, fully unit-testable):

- `toMarineConditionsResponse(ZoneConditionsDto dto)` → `MarineConditionsResponse`
- `toAllMarineConditionsResponse(AllConditionsDtoFromMarineService dto)` → `AllMarineConditionsResponse`

All field mappings explicit — no reflection-based mappers to keep the code readable.

### 3.4 `MarineController.java`

**Package:** `com.mermaid.app.controller`

Implements generated `MarineApi` interface:

```java
@RestController
public class MarineController implements MarineApi {
    // getAllMarineConditions() — checks Caffeine cache first, calls client, maps, caches, returns
    // getMarineConditionsByZone(zoneId) — calls client directly (marine service has its own cache)
}
```

No `@PreAuthorize` needed — `SecurityConfig` already requires auth for all non-public endpoints.

### 3.5 Caffeine cache configuration

**File:** `CacheConfig.java` (new `@Configuration`)

```java
@Bean
public Cache marineConditionsCache() {
    return Caffeine.newBuilder()
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .maximumSize(1)   // only one "all zones" entry
        .build();
}
```

`getAllMarineConditions` checks this cache before calling `MarineServiceClient`. On cache miss, fetches, maps, stores result, returns.

---

## Section 4 — Error Handling

| Scenario | Behavior |
|---|---|
| Marine service 401 | Log as config error, return 503 to caller |
| Marine service 404 (unknown zone) | Return 404 to caller |
| Marine service 503 | Retry once, then return 503 with `"Marine data temporarily unavailable"` |
| Network timeout | Retry once, then return 503 |
| Unknown zone ID from client | Return 404 before calling marine service |

`MarineServiceUnavailableException` is added and handled in the existing `GlobalExceptionHandler`.

---

## Section 5 — Testing

### Python (marine-service)

- **TC011** — `GET /api/conditions` then `GET /api/conditions/manila_bay`: assert no outbound HTTP call on second request (verify cache warmup)

### Java (backend)

- **`MarineServiceClientTest`** — WireMock stubs: happy path, 503 with retry, timeout
- **`MarineControllerTest`** — `@WebMvcTest` with mocked client: JWT required, correct 200 mapping, 404 for unknown zone, 503 propagation
- **`MarineConditionsMapperTest`** — unit test all field mappings with sample DTOs

---

## Files Changed Summary

| File | Change |
|---|---|
| `marine-service/app/routers/conditions.py` | Cache warmup + deduplicated error handling + remove module-level settings |
| `backend/src/main/resources/openapi/api.yaml` | Replace flat schema with structured DTOs + add `/{zoneId}` endpoint |
| `backend/src/main/resources/application.properties` | Add marine service URL, API key, timeout, cache TTL properties |
| `backend/src/main/java/.../client/MarineServiceClient.java` | New — RestClient wrapper with retry |
| `backend/src/main/java/.../mapper/MarineConditionsMapper.java` | New — pure field mapping |
| `backend/src/main/java/.../controller/MarineController.java` | New — implements MarineApi |
| `backend/src/main/java/.../config/CacheConfig.java` | New — Caffeine cache bean |
| `backend/src/main/java/.../exception/MarineServiceUnavailableException.java` | New — typed exception |
| `backend/src/main/java/.../exception/GlobalExceptionHandler.java` | Add handler for new exception |
