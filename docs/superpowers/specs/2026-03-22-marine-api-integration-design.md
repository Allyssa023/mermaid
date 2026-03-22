# Marine API Integration Design

**Date:** 2026-03-22
**Branch:** marine-api
**Status:** Approved — spec review pass 4

---

## Overview

Complete the marine API integration across all three tiers:

1. Fix efficiency and redundancy issues in the Python marine service
2. Expand the `api.yaml` schema to expose the full risk assessment model
3. Build the missing Java backend bridge (`MarineController` + `MarineServiceClient` + mapper + Caffeine cache)

The marine service (FastAPI, port 8081) is fully working. The Java backend has a `/marine/conditions` path defined in `api.yaml` but zero Java implementation. The frontend has no marine UI yet.

---

## Architecture

```
Frontend (React :5173)
    ↓ Bearer JWT
Backend (Spring Boot :8080)
    ├─ MarineController  →  MarineServiceClient (RestClient, manual retry-once, 5s timeout)
    │                                ↓ X-API-Key header
    └─ Caffeine cache (5 min, all-zones only — raw Cache<String,AllMarineConditionsResponse>)
        Marine Service (FastAPI :8081)
            ├─ TTL cache: conditions 15 min, forecast 1 hr
            └─ Open-Meteo Marine + Weather APIs (concurrent fetch)
```

---

## Section 1 — Python Marine Service Fixes

### 1.1 Cache warmup in `get_all_conditions`

**File:** `marine-service/app/routers/conditions.py`

After `asyncio.gather` resolves all zone conditions, write each successful `ZoneConditions` result into its individual `conditions:{zone_id}` cache key before building and caching the aggregate response. `asyncio.gather` preserves task input order, so `zip(ZONES.values(), results)` correctly correlates each zone to its result.

**Before (simplified):**
```python
zones_data = []
for r in results:
    if isinstance(r, Exception):
        logger.warning("Failed to fetch zone conditions: %s", r)
    else:
        zones_data.append(r)
response = AllConditionsResponse(zones=zones_data, ...)
cache.set("conditions:all", response, settings.conditions_cache_ttl)
return response
```

**After:**
```python
zones_data = []
# asyncio.gather preserves task order — zip is safe here
for zone, r in zip(ZONES.values(), results):
    if isinstance(r, Exception):
        logger.warning("Failed to fetch zone %s: %s", zone.id, r)
    else:
        # warm the per-zone cache so GET /{zone_id} is a hit for the next 15 min
        cache.set(f"conditions:{zone.id}", r, settings.conditions_cache_ttl)
        zones_data.append(r)
response = AllConditionsResponse(zones=zones_data, ...)
cache.set("conditions:all", response, settings.conditions_cache_ttl)
return response
```

Benefit: any subsequent `GET /{zone_id}` within the TTL window is a pure cache hit — no outbound HTTP call.

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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marine data service temporarily unavailable",
        )
    except httpx.RequestError as exc:
        logger.error("Open-Meteo request error for %s: %s", zone_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marine data service temporarily unavailable",
        )
```

Usage in the **single-zone handlers only** (`get_zone_conditions`, `get_zone_forecast`):
```python
async with _open_meteo_errors(zone_id):
    conditions = await open_meteo.fetch_current_conditions(zone, client)
```

Do NOT apply this context manager to `get_all_conditions`. That handler uses `asyncio.gather(*tasks, return_exceptions=True)`, which captures per-zone exceptions as return values — the context manager cannot wrap a `gather` call site.

Removes ~12 lines of copy-pasted error handling.

### 1.3 Remove module-level `settings` in `conditions.py`

**File:** `marine-service/app/routers/conditions.py`

Remove `settings = get_settings()` at module level. Access settings via `get_settings()` inline where needed — it is `@lru_cache` so there is no performance cost. Keeps config access consistent with `open_meteo.py`.

---

## Section 2 — `api.yaml` Schema Expansion

### 2.1 Remove existing marine path and schema

Before adding anything, **delete** these two existing blocks from `api.yaml`:

- The `/marine/conditions` path block (operationId `getMarineConditions`, `?areaCode` param) — currently around line 143
- The `MarineConditionsResponse` schema block (currently around line 1170) which has the flat `areaCode`/`windSpeedKph`/`rainfallMm`/`visibilityKm` shape

Neither is implemented in Java, so there is no migration concern.

`ErrorResponse` is already defined in `api.yaml` and used by auth endpoints — do not add a duplicate definition.

### 2.2 New schemas to add to `components/schemas`

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
    waveHeightM:
      type: number
      format: double
      nullable: true
    swellHeightM:
      type: number
      format: double
      nullable: true
    swellPeriodS:
      type: number
      format: double
      nullable: true
    swellDirectionDeg:
      type: number
      format: double
      nullable: true

WeatherDataDto:
  type: object
  required: [windSpeedKmh, windDirectionDeg, windGustsKmh, precipitationMm, temperatureC, cloudCoverPct]
  properties:
    windSpeedKmh:
      type: number
      format: double
    windDirectionDeg:
      type: number
      format: double
    windGustsKmh:
      type: number
      format: double
    precipitationMm:
      type: number
      format: double
    temperatureC:
      type: number
      format: double
    cloudCoverPct:
      type: number
      format: double

MarineConditionsResponse:
  type: object
  required: [zoneId, zoneName, region, lat, lng, observedAt, risk, marine, weather, dataSource]
  properties:
    zoneId:
      type: string
    zoneName:
      type: string
    region:
      type: string
    lat:
      type: number
      format: double
    lng:
      type: number
      format: double
    observedAt:
      type: string
      format: date-time
    risk:
      $ref: '#/components/schemas/RiskAssessmentDto'
    marine:
      $ref: '#/components/schemas/MarineDataDto'
    weather:
      $ref: '#/components/schemas/WeatherDataDto'
    dataSource:
      type: string

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

### 2.3 New endpoint path blocks

```yaml
/marine/conditions:
  get:
    tags: [Marine]
    summary: Current conditions — all zones
    operationId: getAllMarineConditions
    responses:
      '200':
        description: Conditions for all fishing zones
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AllMarineConditionsResponse'
      '503':
        description: Marine data service temporarily unavailable
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
        description: Zone ID — e.g. manila_bay, visayan_sea. See marine service /api/conditions/zones for full list.
    responses:
      '200':
        description: Conditions for the requested zone
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MarineConditionsResponse'
      '404':
        description: Zone ID not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '503':
        description: Marine data service temporarily unavailable
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

---

## Section 3 — Java Backend Bridge

### 3.1 Maven dependencies to add (`backend/pom.xml`)

```xml
<!-- Caffeine in-memory cache -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>

<!-- WireMock standalone — compatible with Spring Boot 4.0.3 (Spring Framework 7.x) -->
<!-- Do NOT use wiremock-spring-boot; it targets Boot 3.x and breaks on Boot 4 SPI -->
<dependency>
    <groupId>org.wiremock</groupId>
    <artifactId>wiremock</artifactId>
    <version>3.13.0</version>
    <scope>test</scope>
</dependency>
```

### 3.2 `application.properties` additions

```properties
# Marine service — override all three via env vars in non-local environments
marine.service.url=${MARINE_SERVICE_URL:http://localhost:8081}
# IMPORTANT: change MARINE_API_KEY env var in all non-local deployments
marine.service.api-key=${MARINE_API_KEY:dev-marine-key-change-in-prod}
marine.service.timeout-seconds=5
marine.cache.conditions-ttl-seconds=300
```

### 3.3 `CacheConfig.java`

**Package:** `com.mermaid.app.config`

```java
@Configuration
// NOTE: do NOT add @EnableCaching — we use the raw Caffeine Cache directly,
// not Spring's CacheManager abstraction. @EnableCaching is unnecessary and
// could cause conflicts if Spring tries to auto-configure a CacheManager.
public class CacheConfig {

    @Value("${marine.cache.conditions-ttl-seconds:300}")
    private long conditionsTtlSeconds;

    @Bean
    public Cache<String, AllMarineConditionsResponse> marineConditionsCache() {
        return Caffeine.newBuilder()
            .expireAfterWrite(conditionsTtlSeconds, TimeUnit.SECONDS)
            .maximumSize(1)  // single entry: the all-zones aggregate
            .build();
    }
}
```

`AllMarineConditionsResponse` here is the OpenAPI-generated model class. Inject `Cache<String, AllMarineConditionsResponse>` directly into `MarineController` — do NOT use `@Cacheable`.

### 3.4 `MarineServiceClient.java`

**Package:** `com.mermaid.app.client`

A `@Component` that wraps `RestClient` for all calls to the marine service. Field mapping from raw marine-service JSON to Java DTOs is done here (the marine service serialises snake_case JSON — the `RestClient` `ObjectMapper` must be configured with `SNAKE_CASE` naming strategy, or Jackson's `@JsonProperty` annotations used on the DTO fields).

```java
@Component
public class MarineServiceClient {

    private final RestClient restClient;

    public MarineServiceClient(
        @Value("${marine.service.url}") String baseUrl,
        @Value("${marine.service.api-key}") String apiKey,
        @Value("${marine.service.timeout-seconds:5}") int timeoutSeconds
    ) {
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("X-API-Key", apiKey)
            .requestFactory(buildFactory(timeoutSeconds))
            .build();
    }

    /**
     * JdkClientHttpRequestFactory — no extra Maven dep required with spring-boot-starter-webmvc.
     * Applies as read timeout (covers hung upstream connections).
     */
    private ClientHttpRequestFactory buildFactory(int timeoutSeconds) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        return factory;
    }

    /** Retry-once wrapper — no extra library required. */
    public MarineAllConditionsDto getAllConditions() {
        try {
            return callWithRetry(() ->
                restClient.get()
                    .uri("/api/conditions")
                    .retrieve()
                    .body(MarineAllConditionsDto.class)
            );
        } catch (HttpClientErrorException e) {
            // 401 = misconfigured API key (our bug, not user's) → surface as 503
            throw new MarineServiceUnavailableException("Marine service error: " + e.getStatusCode());
        }
    }

    public MarineZoneConditionsDto getZoneConditions(String zoneId) {
        try {
            return callWithRetry(() ->
                restClient.get()
                    .uri("/api/conditions/{zoneId}", zoneId)
                    .retrieve()
                    .body(MarineZoneConditionsDto.class)
            );
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ResourceNotFoundException("Zone not found: " + zoneId);
            }
            // 401 = misconfigured API key (our config error, not user's) → 503
            throw new MarineServiceUnavailableException("Marine service error: " + e.getStatusCode());
        }
    }

    /**
     * Retries once on 5xx or network failure — no delay, no extra library.
     * Does NOT catch HttpClientErrorException (4xx) — callers handle those.
     */
    private <T> T callWithRetry(Supplier<T> call) {
        try {
            return call.get();
        } catch (HttpServerErrorException | ResourceAccessException firstEx) {
            try {
                return call.get();
            } catch (HttpServerErrorException | ResourceAccessException secondEx) {
                throw new MarineServiceUnavailableException("Marine service unavailable after retry");
            }
        }
    }
}
```

**DTOs** (`MarineAllConditionsDto`, `MarineZoneConditionsDto`, etc.) are plain POJOs in package `com.mermaid.app.client.dto` that mirror the marine service JSON structure. They are separate from the OpenAPI-generated models — the mapper converts between them.

Key snake_case fields to handle in DTOs (marine service JSON → Java field):
- `data_source` → `dataSource`
- `wave_height_m` → `waveHeightM`
- `wind_speed_kmh` → `windSpeedKmh`
- etc.

Use `@JsonProperty("snake_case_name")` on each field, or configure the `ObjectMapper` on the `RestClient` with `PropertyNamingStrategies.SNAKE_CASE`.

### 3.5 `MarineConditionsMapper.java`

**Package:** `com.mermaid.app.mapper`

A `@Component` with pure mapping methods — no I/O, fully unit-testable.

Field mapping table (marine service JSON → `MarineConditionsResponse` OpenAPI model):

| Source (marine service) | Target (Java model) |
|---|---|
| `zone.id` | `zoneId` |
| `zone.name` | `zoneName` |
| `zone.region` | `region` |
| `zone.lat` | `lat` |
| `zone.lng` | `lng` |
| `timestamp` | `observedAt` |
| `risk.level` | `risk.level` |
| `risk.score` | `risk.score` |
| `risk.factors` | `risk.factors` |
| `risk.advisory` | `risk.advisory` |
| `marine.wave_height_m` | `marine.waveHeightM` |
| `marine.swell_height_m` | `marine.swellHeightM` |
| `marine.swell_period_s` | `marine.swellPeriodS` |
| `marine.swell_direction_deg` | `marine.swellDirectionDeg` |
| `weather.wind_speed_kmh` | `weather.windSpeedKmh` |
| `weather.wind_direction_deg` | `weather.windDirectionDeg` |
| `weather.wind_gusts_kmh` | `weather.windGustsKmh` |
| `weather.precipitation_mm` | `weather.precipitationMm` |
| `weather.temperature_c` | `weather.temperatureC` |
| `weather.cloud_cover_pct` | `weather.cloudCoverPct` |
| `data_source` | `dataSource` |
| `generated_at` (on `AllConditionsResponse`) | `generatedAt` (on `AllMarineConditionsResponse`) |

**DTO class names** (package `com.mermaid.app.client.dto`):
- `MarineAllConditionsDto` — wraps `zones` list + `generated_at`
- `MarineZoneConditionsDto` — wraps `zone`, `timestamp`, `marine`, `weather`, `risk`, `data_source`
- `MarineZoneDto` — `id`, `name`, `region`, `lat`, `lng`
- `MarineDataDto` — `wave_height_m`, `swell_height_m`, `swell_period_s`, `swell_direction_deg`
- `MarineWeatherDto` — `wind_speed_kmh`, `wind_direction_deg`, `wind_gusts_kmh`, `precipitation_mm`, `temperature_c`, `cloud_cover_pct`
- `MarineRiskDto` — `level`, `score`, `factors`, `advisory`

All snake_case fields use `@JsonProperty("snake_case_name")` annotations.

Methods:
- `toResponse(MarineZoneConditionsDto dto)` → `MarineConditionsResponse`
- `toAllResponse(MarineAllConditionsDto dto)` → `AllMarineConditionsResponse`

### 3.6 `MarineController.java`

**Package:** `com.mermaid.app.controller`

Implements generated `MarineApi` interface. No `@PreAuthorize` needed — `SecurityConfig` requires auth for all non-public endpoints by default.

```java
@RestController
public class MarineController implements MarineApi {

    private static final String CACHE_KEY = "all";

    private final MarineServiceClient client;
    private final MarineConditionsMapper mapper;
    private final Cache<String, AllMarineConditionsResponse> cache;

    // constructor injection

    @Override
    public ResponseEntity<AllMarineConditionsResponse> getAllMarineConditions() {
        AllMarineConditionsResponse cached = cache.getIfPresent(CACHE_KEY);
        if (cached != null) return ResponseEntity.ok(cached);

        AllMarineConditionsResponse response = mapper.toAllResponse(client.getAllConditions());
        cache.put(CACHE_KEY, response);
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<MarineConditionsResponse> getMarineConditionsByZone(String zoneId) {
        // Per-zone endpoint goes direct to client — marine service has its own 15-min cache.
        // Java-side caching is only on the all-zones aggregate to absorb dashboard load spikes;
        // per-zone requests are expected to be low-frequency (fisherman checking a specific area).
        return ResponseEntity.ok(mapper.toResponse(client.getZoneConditions(zoneId)));
    }
}
```

### 3.7 `MarineServiceUnavailableException.java`

**Package:** `com.mermaid.app.exception`

```java
public class MarineServiceUnavailableException extends RuntimeException {
    public MarineServiceUnavailableException(String message) {
        super(message);
    }
}
```

### 3.8 `GlobalExceptionHandler.java` update

Add a handler for the new exception alongside the existing handlers. Follow the existing pattern exactly — use the private `errorResponse()` helper, inject `HttpServletRequest`, no logger (consistent with the rest of the class):

```java
@ExceptionHandler(MarineServiceUnavailableException.class)
public ResponseEntity<ErrorResponse> handleMarineServiceUnavailable(
        MarineServiceUnavailableException ex, HttpServletRequest request) {
    ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
}
```

---

## Section 4 — Error Handling Contract

| Scenario | Exception / detection | Java behavior |
|---|---|---|
| Marine service 404 (unknown zone) | `HttpClientErrorException` with `NOT_FOUND` | Rethrow as `ResourceNotFoundException` → 404 |
| Marine service 401 (bad API key) | `HttpClientErrorException` with status != 404 | Log as config error, throw `MarineServiceUnavailableException` → 503 |
| Marine service 5xx | `HttpServerErrorException` | Retry once; on second failure throw `MarineServiceUnavailableException` → 503 |
| Network timeout / refused | `ResourceAccessException` | Retry once; on second failure throw `MarineServiceUnavailableException` → 503 |
| Unknown zone from client | `ResourceNotFoundException` (before calling client) | 404 |

Retry is a **manual attempt counter** — no Spring Retry library required. No delay between attempts. Covers `HttpServerErrorException` (5xx) and `ResourceAccessException` (timeout/network). Does not retry on 4xx.

---

## Section 5 — Testing

### Python (`marine-service`)

- **TC011** — `GET /api/conditions` then `GET /api/conditions/manila_bay`: assert no outbound HTTP call on the second request (validates cache warmup from §1.1)

### Java (`backend`)

- **`MarineServiceClientTest`** — WireMock stubs:
  - Happy path: `GET /api/conditions` returns full JSON, fields mapped correctly
  - 503 with retry: first call returns 503, second call returns 200 — assert only two outbound requests made
  - Timeout: connection timeout → retry → second timeout → `MarineServiceUnavailableException`
  - 404: `getZoneConditions("bad_zone")` → `ResourceNotFoundException`

- **`MarineControllerTest`** — `@WebMvcTest` with mocked `MarineServiceClient`:
  - No JWT → 401
  - Valid JWT → 200 with correct JSON structure
  - `getAllMarineConditions()` called twice → `MarineServiceClient.getAllConditions()` called only once (cache hit)
  - Unknown zone → 404
  - Client throws `MarineServiceUnavailableException` → 503

- **`MarineConditionsMapperTest`** — unit test all field mappings from sample DTO instances, including null-safe marine fields (`waveHeightM` can be null)

---

## Files Changed Summary

| File | Change |
|---|---|
| `marine-service/app/routers/conditions.py` | Cache warmup + deduplicated error handler + remove module-level settings |
| `backend/pom.xml` | Add `spring-boot-starter-cache`, `caffeine`, `wiremock-spring-boot` |
| `backend/src/main/resources/openapi/api.yaml` | Remove old flat path+schema; add new structured schemas + two endpoint paths |
| `backend/src/main/resources/application.properties` | Add marine service URL, API key, timeout, cache TTL |
| `backend/src/main/java/.../config/CacheConfig.java` | New — raw `Caffeine.Cache<String, AllMarineConditionsResponse>` bean |
| `backend/src/main/java/.../client/MarineServiceClient.java` | New — RestClient + JdkClientHttpRequestFactory + manual retry |
| `backend/src/main/java/.../client/dto/MarineAllConditionsDto.java` | New |
| `backend/src/main/java/.../client/dto/MarineZoneConditionsDto.java` | New |
| `backend/src/main/java/.../client/dto/MarineZoneDto.java` | New |
| `backend/src/main/java/.../client/dto/MarineDataDto.java` | New |
| `backend/src/main/java/.../client/dto/MarineWeatherDto.java` | New |
| `backend/src/main/java/.../client/dto/MarineRiskDto.java` | New |
| `backend/src/main/java/.../mapper/MarineConditionsMapper.java` | New — explicit field-by-field mapping (see §3.5 table) |
| `backend/src/main/java/.../controller/MarineController.java` | New — implements MarineApi, injects raw cache |
| `backend/src/main/java/.../exception/MarineServiceUnavailableException.java` | New — typed exception |
| `backend/src/main/java/.../exception/GlobalExceptionHandler.java` | Add handler for `MarineServiceUnavailableException` |
