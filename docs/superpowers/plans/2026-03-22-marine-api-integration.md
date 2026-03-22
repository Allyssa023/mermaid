# Marine API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Python marine service, expand the backend API schema, and build the missing Java bridge controller so the frontend can fetch marine conditions through the Spring Boot backend.

**Architecture:** The Python marine service (port 8081) already works and has its own TTL cache. The Java backend (port 8080) needs a `MarineServiceClient` (RestClient + manual retry) and `MarineController` that proxies requests and adds a 5-minute Caffeine cache for the all-zones aggregate. The mapper converts between Python's snake_case JSON DTOs and the OpenAPI-generated Java models.

**Tech Stack:** Python 3/FastAPI (marine service), Spring Boot 4.0.3/Java 17 (backend), OpenAPI Generator Maven plugin 7.20 (code generation), Caffeine (in-memory cache), WireMock 3.13 (HTTP stub testing), JUnit 5 + Spring Security Test

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `marine-service/app/routers/conditions.py` | Modify | Cache warmup, deduplicated error handler, remove module-level settings |
| `marine-service/testsprite_tests/TC011_cache_warmup_after_all_conditions.py` | Create | Prove per-zone cache is warm after GET /api/conditions |
| `marine-service/requirements-dev.txt` | Create | pytest + pytest-asyncio for test-only deps |
| `backend/pom.xml` | Modify | Add `spring-boot-starter-cache`, `caffeine`, `org.wiremock:wiremock:3.13.0` |
| `backend/src/main/resources/openapi/api.yaml` | Modify | Remove old flat schema; add RiskAssessmentDto, MarineDataDto, WeatherDataDto, MarineConditionsResponse, AllMarineConditionsResponse + two endpoint paths |
| `backend/src/main/resources/application.properties` | Modify | Add marine service URL, API key, timeout, cache TTL |
| `backend/src/main/java/com/mermaid/app/client/dto/MarineZoneDto.java` | Create | DTO for zone metadata from marine service JSON |
| `backend/src/main/java/com/mermaid/app/client/dto/MarineDataDto.java` | Create | DTO for wave/swell data |
| `backend/src/main/java/com/mermaid/app/client/dto/MarineWeatherDto.java` | Create | DTO for wind/temp/precip data |
| `backend/src/main/java/com/mermaid/app/client/dto/MarineRiskDto.java` | Create | DTO for risk level/score/factors/advisory |
| `backend/src/main/java/com/mermaid/app/client/dto/MarineZoneConditionsDto.java` | Create | Root DTO for single-zone response |
| `backend/src/main/java/com/mermaid/app/client/dto/MarineAllConditionsDto.java` | Create | Root DTO for all-zones response |
| `backend/src/main/java/com/mermaid/app/exception/MarineServiceUnavailableException.java` | Create | Typed exception for marine service failures |
| `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java` | Modify | Add handler for MarineServiceUnavailableException |
| `backend/src/main/java/com/mermaid/app/config/CacheConfig.java` | Create | Raw Caffeine `Cache<String, AllMarineConditionsResponse>` bean |
| `backend/src/main/java/com/mermaid/app/mapper/MarineConditionsMapper.java` | Create | Explicit field-by-field DTO → OpenAPI model mapping |
| `backend/src/main/java/com/mermaid/app/client/MarineServiceClient.java` | Create | RestClient + JdkClientHttpRequestFactory + manual retry-once |
| `backend/src/main/java/com/mermaid/app/controller/MarineController.java` | Create | Implements MarineApi; all-zones with Caffeine cache, per-zone direct |
| `backend/src/test/java/com/mermaid/app/mapper/MarineConditionsMapperTest.java` | Create | Unit test all field mappings |
| `backend/src/test/java/com/mermaid/app/client/MarineServiceClientTest.java` | Create | WireMock: happy path, 503 retry, timeout, 404 |
| `backend/src/test/java/com/mermaid/app/controller/MarineControllerTest.java` | Create | @WebMvcTest: JWT auth, cache hit, 404, 503 |

---

## Task 1: Python — Write TC011 cache warmup test (failing first)

**Files:**
- Create: `marine-service/requirements-dev.txt`
- Create: `marine-service/testsprite_tests/TC011_cache_warmup_after_all_conditions.py`

- [ ] **Step 1: Create `requirements-dev.txt` with test deps**

```
pytest==8.3.5
pytest-asyncio==0.25.3
```

- [ ] **Step 2: Write the failing test**

Create `marine-service/testsprite_tests/TC011_cache_warmup_after_all_conditions.py`:

```python
"""
TC011 — Cache warmup: GET /api/conditions warms per-zone cache.

After fetching all zones, a subsequent GET /api/conditions/manila_bay
must be served from cache — no second call to open_meteo.fetch_current_conditions.
"""
import pytest
from unittest.mock import AsyncMock, patch, call
from fastapi.testclient import TestClient

from app.main import app
from app.state import state
from app.models.marine import (
    FishingZone, MarineData, WeatherData, RiskAssessment, RiskLevel, ZoneConditions
)
from datetime import datetime, timezone

API_KEY = "dev-marine-key-change-in-prod"
HEADERS = {"X-API-Key": API_KEY}


def _fake_conditions(zone_id: str) -> ZoneConditions:
    zone = FishingZone(id=zone_id, name=zone_id, lat=0.0, lng=0.0, region="Test")
    marine = MarineData(wave_height_m=0.5, swell_height_m=0.3, swell_period_s=6.0, swell_direction_deg=90.0)
    weather = WeatherData(
        wind_speed_kmh=10.0, wind_direction_deg=180.0, wind_gusts_kmh=15.0,
        precipitation_mm=0.0, temperature_c=28.0, cloud_cover_pct=20.0
    )
    risk = RiskAssessment(level=RiskLevel.SAFE, score=0, factors=[], advisory="Safe.")
    return ZoneConditions(zone=zone, timestamp=datetime.now(timezone.utc), marine=marine, weather=weather, risk=risk)


def test_all_conditions_warms_per_zone_cache():
    state.cache.clear()

    # Return a fake ZoneConditions for whichever zone is requested
    async def fake_fetch(zone, client):
        return _fake_conditions(zone.id)

    with patch(
        "app.routers.conditions.open_meteo.fetch_current_conditions",
        side_effect=fake_fetch
    ) as mock_fetch:
        with TestClient(app) as client:
            # First call — fetches all 8 zones from Open-Meteo
            r1 = client.get("/api/conditions", headers=HEADERS)
            assert r1.status_code == 200
            calls_after_all = mock_fetch.call_count
            assert calls_after_all == 8, f"Expected 8 Open-Meteo calls, got {calls_after_all}"

            # Second call — should be a cache hit, zero new Open-Meteo calls
            r2 = client.get("/api/conditions/manila_bay", headers=HEADERS)
            assert r2.status_code == 200
            assert mock_fetch.call_count == calls_after_all, (
                f"Cache warmup failed: Open-Meteo was called again for manila_bay. "
                f"Total calls: {mock_fetch.call_count}, expected: {calls_after_all}"
            )
```

- [ ] **Step 3: Run the test — expect it to FAIL**

```bash
cd marine-service
pip install pytest pytest-asyncio
pytest testsprite_tests/TC011_cache_warmup_after_all_conditions.py -v
```

Expected: FAIL — the second call triggers an extra `fetch_current_conditions` call because the all-conditions handler does not warm the per-zone cache yet.

---

## Task 2: Python — Fix `conditions.py`

**Files:**
- Modify: `marine-service/app/routers/conditions.py`

- [ ] **Step 1: Add the `_open_meteo_errors` context manager**

Add this function after the `_get_zone_or_404` helper and before the route definitions:

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

- [ ] **Step 2: Replace the `get_all_conditions` result loop with cache-warming version**

Find the `for r in results:` loop in `get_all_conditions` and replace:

```python
    zones_data: list[ZoneConditions] = []
    for zone, r in zip(ZONES.values(), results):  # gather preserves task order
        if isinstance(r, Exception):
            logger.warning("Failed to fetch zone %s: %s", zone.id, r)
        else:
            cache.set(f"conditions:{zone.id}", r, get_settings().conditions_cache_ttl)
            zones_data.append(r)
```

- [ ] **Step 3: Replace the two try/except blocks in `get_zone_conditions` and `get_zone_forecast`**

In `get_zone_conditions`, replace:
```python
    try:
        conditions = await open_meteo.fetch_current_conditions(zone, client)
    except httpx.HTTPStatusError as exc:
        logger.error("Open-Meteo HTTP error for zone %s: %s", zone_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Marine data service temporarily unavailable")
    except httpx.RequestError as exc:
        logger.error("Open-Meteo request error for zone %s: %s", zone_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Marine data service temporarily unavailable")
```
With:
```python
    async with _open_meteo_errors(zone_id):
        conditions = await open_meteo.fetch_current_conditions(zone, client)
```

Do the same in `get_zone_forecast` (replace its identical try/except with `async with _open_meteo_errors(zone_id):`).

- [ ] **Step 4: Remove the module-level `settings = get_settings()` line**

Delete this line near the top of the file:
```python
settings = get_settings()
```

The only remaining reference to `settings` in `get_all_conditions` is `settings.conditions_cache_ttl` — replace it with `get_settings().conditions_cache_ttl`. Do the same in `get_zone_conditions` (`settings.conditions_cache_ttl`) and `get_zone_forecast` (`settings.forecast_cache_ttl`).

Also check `list_zones` — remove any residual references if present.

- [ ] **Step 5: Run TC011 — expect it to PASS now**

```bash
cd marine-service
pytest testsprite_tests/TC011_cache_warmup_after_all_conditions.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add marine-service/app/routers/conditions.py \
        marine-service/testsprite_tests/TC011_cache_warmup_after_all_conditions.py \
        marine-service/requirements-dev.txt
git commit -m "fix(marine-service): cache warmup, dedup error handling, inline settings"
```

---

## Task 3: api.yaml — Replace marine schema and endpoints

**Files:**
- Modify: `backend/src/main/resources/openapi/api.yaml`

> The OpenAPI generator runs on every `mvn compile`. Editing `api.yaml` is the primary action; verification is done by running `mvn generate-sources`.

- [ ] **Step 1: Delete the old `/marine/conditions` path block**

Find and delete the entire block starting at `/marine/conditions:` (around line 143) — the one with `operationId: getMarineConditions` and an `?areaCode` query param. Stop deleting before `/advisories:`.

- [ ] **Step 2: Delete the old flat `MarineConditionsResponse` schema**

In `components/schemas`, find and delete the `MarineConditionsResponse:` block (around line 1170) — the one with `areaCode`, `windSpeedKph`, `rainfallMm`, `visibilityKm`.

Do NOT delete `RiskLevel` — it is already defined and used elsewhere.

- [ ] **Step 3: Add new schemas to `components/schemas`**

Paste these new schemas into `components/schemas` (after the last existing schema):

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

- [ ] **Step 4: Add new endpoint path blocks to `paths`**

Paste these into `paths` (place them where the old `/marine/conditions` block was, before `/advisories:`):

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
          description: "Zone ID — e.g. manila_bay, visayan_sea"
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

- [ ] **Step 5: Run code generation — expect it to SUCCEED**

```bash
cd backend
./mvnw generate-sources
```

Expected: BUILD SUCCESS. Generated sources land in `target/generated-sources/openapi/src/main/java/com/mermaid/app/`. Verify:
- `com/mermaid/app/api/MarineApi.java` exists with `getAllMarineConditions()` and `getMarineConditionsByZone(String zoneId)` methods
- `com/mermaid/app/model/MarineConditionsResponse.java` exists with `zoneId`, `risk`, `marine`, `weather` fields
- `com/mermaid/app/model/AllMarineConditionsResponse.java` exists
- `com/mermaid/app/model/RiskAssessmentDto.java`, `MarineDataDto.java`, `WeatherDataDto.java` exist

If the build fails, the YAML is malformed — check indentation (YAML uses 2-space indent, paths are under `paths:` at 2 spaces, schemas are under `components.schemas` at 4 spaces).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/openapi/api.yaml
git commit -m "feat(api): expand marine schema with full risk assessment model"
```

---

## Task 4: Maven deps and `application.properties`

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Add Caffeine and WireMock to `pom.xml`**

In `<dependencies>`, add after the existing security deps:

```xml
<!-- Caffeine in-memory cache — used directly (no @EnableCaching needed) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>

<!-- WireMock standalone — Spring Boot 4 compatible (do NOT use wiremock-spring-boot) -->
<dependency>
    <groupId>org.wiremock</groupId>
    <artifactId>wiremock</artifactId>
    <version>3.13.0</version>
    <scope>test</scope>
</dependency>
```

- [ ] **Step 2: Add marine service properties to `application.properties`**

Append to end of `backend/src/main/resources/application.properties`:

```properties
# Marine service integration
# Override all three via env vars in non-local environments
marine.service.url=${MARINE_SERVICE_URL:http://localhost:8081}
# IMPORTANT: set MARINE_API_KEY env var in all non-local deployments
marine.service.api-key=${MARINE_API_KEY:dev-marine-key-change-in-prod}
marine.service.timeout-seconds=5
marine.cache.conditions-ttl-seconds=300
```

- [ ] **Step 3: Verify `mvn compile` still works**

```bash
cd backend
./mvnw compile
```

Expected: BUILD SUCCESS (the new deps download and resolve cleanly).

- [ ] **Step 4: Commit**

```bash
git add backend/pom.xml backend/src/main/resources/application.properties
git commit -m "build: add Caffeine cache and WireMock deps; add marine service properties"
```

---

## Task 5: Java DTOs

**Files:**
- Create 6 files in `backend/src/main/java/com/mermaid/app/client/dto/`

These are plain POJOs with Lombok `@Data` and Jackson `@JsonProperty` for snake_case mapping. No business logic.

- [ ] **Step 1: Create `MarineZoneDto.java`**

```java
package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MarineZoneDto {
    private String id;
    private String name;
    private double lat;
    private double lng;
    private String region;
}
```

- [ ] **Step 2: Create `MarineDataDto.java`**

```java
package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MarineDataDto {
    @JsonProperty("wave_height_m")    private Double waveHeightM;
    @JsonProperty("swell_height_m")   private Double swellHeightM;
    @JsonProperty("swell_period_s")   private Double swellPeriodS;
    @JsonProperty("swell_direction_deg") private Double swellDirectionDeg;
}
```

- [ ] **Step 3: Create `MarineWeatherDto.java`**

```java
package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MarineWeatherDto {
    @JsonProperty("wind_speed_kmh")    private double windSpeedKmh;
    @JsonProperty("wind_direction_deg") private double windDirectionDeg;
    @JsonProperty("wind_gusts_kmh")    private double windGustsKmh;
    @JsonProperty("precipitation_mm")  private double precipitationMm;
    @JsonProperty("temperature_c")     private double temperatureC;
    @JsonProperty("cloud_cover_pct")   private double cloudCoverPct;
}
```

- [ ] **Step 4: Create `MarineRiskDto.java`**

```java
package com.mermaid.app.client.dto;

import lombok.Data;
import java.util.List;

@Data
public class MarineRiskDto {
    private String level;   // "SAFE", "CAUTION", or "UNSAFE"
    private int score;
    private List<String> factors;
    private String advisory;
}
```

- [ ] **Step 5: Create `MarineZoneConditionsDto.java`**

```java
package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class MarineZoneConditionsDto {
    private MarineZoneDto zone;
    private OffsetDateTime timestamp;
    private MarineDataDto marine;
    private MarineWeatherDto weather;
    private MarineRiskDto risk;
    @JsonProperty("data_source") private String dataSource;
}
```

- [ ] **Step 6: Create `MarineAllConditionsDto.java`**

```java
package com.mermaid.app.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;

@Data
public class MarineAllConditionsDto {
    private List<MarineZoneConditionsDto> zones;
    @JsonProperty("generated_at") private OffsetDateTime generatedAt;
}
```

- [ ] **Step 7: Verify compilation**

```bash
cd backend
./mvnw compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/client/dto/
git commit -m "feat(marine): add marine service client DTOs"
```

---

## Task 6: Exception + `GlobalExceptionHandler` (TDD)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/exception/MarineServiceUnavailableException.java`
- Modify: `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Write a failing test for the new exception handler**

Create `backend/src/test/java/com/mermaid/app/exception/MarineServiceUnavailableExceptionHandlerTest.java`:

```java
package com.mermaid.app.exception;

import com.mermaid.app.model.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class MarineServiceUnavailableExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void marine503_returns503WithMessage() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/marine/conditions");
        MarineServiceUnavailableException ex =
            new MarineServiceUnavailableException("Marine service unavailable after retry");

        ResponseEntity<ErrorResponse> response =
            handler.handleMarineServiceUnavailable(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Marine service unavailable after retry");
        assertThat(response.getBody().getStatus()).isEqualTo(503);
    }
}
```

- [ ] **Step 2: Run the test — expect it to FAIL**

```bash
cd backend
./mvnw test -pl . -Dtest=MarineServiceUnavailableExceptionHandlerTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: FAIL — `MarineServiceUnavailableException` and the handler method don't exist yet.

- [ ] **Step 3: Create `MarineServiceUnavailableException.java`**

```java
package com.mermaid.app.exception;

public class MarineServiceUnavailableException extends RuntimeException {
    public MarineServiceUnavailableException(String message) {
        super(message);
    }
}
```

- [ ] **Step 4: Add the handler to `GlobalExceptionHandler.java`**

Open `backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java` and add this handler method after the existing `handleNotImplemented` method, before the closing brace:

```java
    @ExceptionHandler(MarineServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleMarineServiceUnavailable(
            MarineServiceUnavailableException ex, HttpServletRequest request) {
        ErrorResponse body = errorResponse(request.getRequestURI(), HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
```

- [ ] **Step 5: Run the test — expect it to PASS**

```bash
./mvnw test -pl . -Dtest=MarineServiceUnavailableExceptionHandlerTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/exception/MarineServiceUnavailableException.java \
        backend/src/main/java/com/mermaid/app/exception/GlobalExceptionHandler.java \
        backend/src/test/java/com/mermaid/app/exception/MarineServiceUnavailableExceptionHandlerTest.java
git commit -m "feat(marine): add MarineServiceUnavailableException and 503 handler"
```

---

## Task 7: `CacheConfig`

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/config/CacheConfig.java`

No TDD here — the config is verified implicitly by the controller test in Task 10.

- [ ] **Step 1: Create `CacheConfig.java`**

```java
package com.mermaid.app.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.mermaid.app.model.AllMarineConditionsResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Provides a raw Caffeine cache for the all-zones marine conditions aggregate.
 *
 * NOTE: @EnableCaching is intentionally NOT used. We inject and use this
 * Cache<K,V> bean directly — no Spring CacheManager abstraction involved.
 * Do NOT add @Cacheable annotations anywhere in the marine integration.
 */
@Configuration
public class CacheConfig {

    @Value("${marine.cache.conditions-ttl-seconds:300}")
    private long conditionsTtlSeconds;

    @Bean
    public Cache<String, AllMarineConditionsResponse> marineConditionsCache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(conditionsTtlSeconds, TimeUnit.SECONDS)
                .maximumSize(1) // single entry: key="all", value=all-zones aggregate
                .build();
    }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd backend
./mvnw compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/config/CacheConfig.java
git commit -m "feat(marine): add Caffeine cache bean for all-zones conditions"
```

---

## Task 8: `MarineConditionsMapper` (TDD)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/mapper/MarineConditionsMapper.java`
- Create: `backend/src/test/java/com/mermaid/app/mapper/MarineConditionsMapperTest.java`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/mermaid/app/mapper/MarineConditionsMapperTest.java`:

```java
package com.mermaid.app.mapper;

import com.mermaid.app.client.dto.*;
import com.mermaid.app.model.*;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MarineConditionsMapperTest {

    private final MarineConditionsMapper mapper = new MarineConditionsMapper();

    private MarineZoneConditionsDto sampleZoneDto() {
        MarineZoneDto zone = new MarineZoneDto();
        zone.setId("manila_bay");
        zone.setName("Manila Bay");
        zone.setRegion("Luzon");
        zone.setLat(14.50);
        zone.setLng(120.80);

        MarineDataDto marine = new MarineDataDto();
        marine.setWaveHeightM(1.2);
        marine.setSwellHeightM(0.8);
        marine.setSwellPeriodS(7.0);
        marine.setSwellDirectionDeg(135.0);

        MarineWeatherDto weather = new MarineWeatherDto();
        weather.setWindSpeedKmh(20.0);
        weather.setWindDirectionDeg(90.0);
        weather.setWindGustsKmh(30.0);
        weather.setPrecipitationMm(0.0);
        weather.setTemperatureC(28.0);
        weather.setCloudCoverPct(10.0);

        MarineRiskDto risk = new MarineRiskDto();
        risk.setLevel("SAFE");
        risk.setScore(1);
        risk.setFactors(List.of("Wave height 1.2 m"));
        risk.setAdvisory("Sea conditions are safe for fishing.");

        MarineZoneConditionsDto dto = new MarineZoneConditionsDto();
        dto.setZone(zone);
        dto.setTimestamp(OffsetDateTime.parse("2026-03-22T08:00:00Z"));
        dto.setMarine(marine);
        dto.setWeather(weather);
        dto.setRisk(risk);
        dto.setDataSource("Open-Meteo");
        return dto;
    }

    @Test
    void toResponse_mapsAllZoneFields() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getZoneId()).isEqualTo("manila_bay");
        assertThat(r.getZoneName()).isEqualTo("Manila Bay");
        assertThat(r.getRegion()).isEqualTo("Luzon");
        assertThat(r.getLat()).isEqualTo(14.50);
        assertThat(r.getLng()).isEqualTo(120.80);
        assertThat(r.getDataSource()).isEqualTo("Open-Meteo");
    }

    @Test
    void toResponse_mapsTimestampToObservedAt() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getObservedAt()).isNotNull();
    }

    @Test
    void toResponse_mapsRiskAssessment() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getRisk().getLevel().getValue()).isEqualTo("SAFE");
        assertThat(r.getRisk().getScore()).isEqualTo(1);
        assertThat(r.getRisk().getFactors()).containsExactly("Wave height 1.2 m");
        assertThat(r.getRisk().getAdvisory()).isEqualTo("Sea conditions are safe for fishing.");
    }

    @Test
    void toResponse_mapsMarine_nullWaveHeightAllowed() {
        MarineZoneConditionsDto dto = sampleZoneDto();
        dto.getMarine().setWaveHeightM(null);
        MarineConditionsResponse r = mapper.toResponse(dto);
        assertThat(r.getMarine().getWaveHeightM()).isNull();
    }

    @Test
    void toResponse_mapsWeather() {
        MarineConditionsResponse r = mapper.toResponse(sampleZoneDto());
        assertThat(r.getWeather().getWindSpeedKmh()).isEqualTo(20.0);
        assertThat(r.getWeather().getTemperatureC()).isEqualTo(28.0);
    }

    @Test
    void toAllResponse_mapsGeneratedAtAndZonesList() {
        MarineZoneConditionsDto zoneDto = sampleZoneDto();
        MarineAllConditionsDto all = new MarineAllConditionsDto();
        all.setZones(List.of(zoneDto));
        all.setGeneratedAt(OffsetDateTime.parse("2026-03-22T08:00:00Z"));

        AllMarineConditionsResponse r = mapper.toAllResponse(all);
        assertThat(r.getGeneratedAt()).isNotNull();
        assertThat(r.getZones()).hasSize(1);
        assertThat(r.getZones().get(0).getZoneId()).isEqualTo("manila_bay");
    }
}
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
cd backend
./mvnw test -pl . -Dtest=MarineConditionsMapperTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: FAIL — `MarineConditionsMapper` does not exist.

- [ ] **Step 3: Create `MarineConditionsMapper.java`**

```java
package com.mermaid.app.mapper;

import com.mermaid.app.client.dto.*;
import com.mermaid.app.model.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class MarineConditionsMapper {

    public MarineConditionsResponse toResponse(MarineZoneConditionsDto dto) {
        MarineConditionsResponse r = new MarineConditionsResponse();
        r.setZoneId(dto.getZone().getId());
        r.setZoneName(dto.getZone().getName());
        r.setRegion(dto.getZone().getRegion());
        r.setLat(dto.getZone().getLat());
        r.setLng(dto.getZone().getLng());
        r.setObservedAt(dto.getTimestamp());
        r.setDataSource(dto.getDataSource());
        r.setRisk(mapRisk(dto.getRisk()));
        r.setMarine(mapMarine(dto.getMarine()));
        r.setWeather(mapWeather(dto.getWeather()));
        return r;
    }

    public AllMarineConditionsResponse toAllResponse(MarineAllConditionsDto dto) {
        AllMarineConditionsResponse r = new AllMarineConditionsResponse();
        r.setGeneratedAt(dto.getGeneratedAt());
        r.setZones(dto.getZones().stream().map(this::toResponse).collect(Collectors.toList()));
        return r;
    }

    private RiskAssessmentDto mapRisk(MarineRiskDto src) {
        RiskAssessmentDto r = new RiskAssessmentDto();
        r.setLevel(RiskLevel.fromValue(src.getLevel()));
        r.setScore(src.getScore());
        r.setFactors(src.getFactors());
        r.setAdvisory(src.getAdvisory());
        return r;
    }

    private MarineDataDto mapMarine(com.mermaid.app.client.dto.MarineDataDto src) {
        com.mermaid.app.model.MarineDataDto r = new com.mermaid.app.model.MarineDataDto();
        r.setWaveHeightM(src.getWaveHeightM());
        r.setSwellHeightM(src.getSwellHeightM());
        r.setSwellPeriodS(src.getSwellPeriodS());
        r.setSwellDirectionDeg(src.getSwellDirectionDeg());
        return r;
    }

    private WeatherDataDto mapWeather(MarineWeatherDto src) {
        WeatherDataDto r = new WeatherDataDto();
        r.setWindSpeedKmh(src.getWindSpeedKmh());
        r.setWindDirectionDeg(src.getWindDirectionDeg());
        r.setWindGustsKmh(src.getWindGustsKmh());
        r.setPrecipitationMm(src.getPrecipitationMm());
        r.setTemperatureC(src.getTemperatureC());
        r.setCloudCoverPct(src.getCloudCoverPct());
        return r;
    }
}
```

> **Note on name collision:** `com.mermaid.app.client.dto.MarineDataDto` and `com.mermaid.app.model.MarineDataDto` share a simple name. Use fully-qualified names in the mapper for the `mapMarine` method to keep it unambiguous (as shown above).

- [ ] **Step 4: Run tests — expect PASS**

```bash
./mvnw test -pl . -Dtest=MarineConditionsMapperTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: PASS all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/mapper/MarineConditionsMapper.java \
        backend/src/test/java/com/mermaid/app/mapper/MarineConditionsMapperTest.java
git commit -m "feat(marine): add MarineConditionsMapper with full field mapping"
```

---

## Task 9: `MarineServiceClient` (TDD with WireMock)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/client/MarineServiceClient.java`
- Create: `backend/src/test/java/com/mermaid/app/client/MarineServiceClientTest.java`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/test/java/com/mermaid/app/client/MarineServiceClientTest.java`:

```java
package com.mermaid.app.client;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.mermaid.app.client.dto.MarineAllConditionsDto;
import com.mermaid.app.client.dto.MarineZoneConditionsDto;
import com.mermaid.app.exception.MarineServiceUnavailableException;
import com.mermaid.app.exception.ResourceNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class MarineServiceClientTest {

    private WireMockServer wireMock;
    private MarineServiceClient client;

    // Minimal valid JSON for a single zone (all required fields)
    private static final String ZONE_JSON = """
        {
          "zone": {"id":"manila_bay","name":"Manila Bay","lat":14.5,"lng":120.8,"region":"Luzon"},
          "timestamp": "2026-03-22T08:00:00Z",
          "marine": {"wave_height_m":1.0,"swell_height_m":0.5,"swell_period_s":6.0,"swell_direction_deg":90.0},
          "weather": {"wind_speed_kmh":20.0,"wind_direction_deg":180.0,"wind_gusts_kmh":25.0,
                      "precipitation_mm":0.0,"temperature_c":28.0,"cloud_cover_pct":10.0},
          "risk": {"level":"SAFE","score":1,"factors":["Wave height 1.0 m"],"advisory":"Safe."},
          "data_source": "Open-Meteo"
        }
        """;

    private static final String ALL_JSON = """
        {
          "zones": [%s],
          "generated_at": "2026-03-22T08:00:00Z"
        }
        """.formatted(ZONE_JSON);

    @BeforeEach
    void setUp() {
        wireMock = new WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort());
        wireMock.start();
        client = new MarineServiceClient(
            "http://localhost:" + wireMock.port(),
            "test-api-key",
            5
        );
    }

    @AfterEach
    void tearDown() {
        wireMock.stop();
    }

    @Test
    void getAllConditions_happyPath_returnsDto() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .withHeader("X-API-Key", equalTo("test-api-key"))
            .willReturn(okJson(ALL_JSON)));

        MarineAllConditionsDto result = client.getAllConditions();

        assertThat(result.getZones()).hasSize(1);
        assertThat(result.getZones().get(0).getZone().getId()).isEqualTo("manila_bay");
        assertThat(result.getGeneratedAt()).isNotNull();
    }

    @Test
    void getAllConditions_503ThenSuccess_retriesOnce() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .inScenario("retry").whenScenarioStateIs("Started")
            .willReturn(serverError())
            .willSetStateTo("retried"));
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .inScenario("retry").whenScenarioStateIs("retried")
            .willReturn(okJson(ALL_JSON)));

        MarineAllConditionsDto result = client.getAllConditions();
        assertThat(result.getZones()).hasSize(1);
        wireMock.verify(2, getRequestedFor(urlEqualTo("/api/conditions")));
    }

    @Test
    void getAllConditions_503Twice_throwsUnavailable() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions"))
            .willReturn(serverError()));

        assertThatThrownBy(() -> client.getAllConditions())
            .isInstanceOf(MarineServiceUnavailableException.class);
        wireMock.verify(2, getRequestedFor(urlEqualTo("/api/conditions")));
    }

    @Test
    void getZoneConditions_404_throwsResourceNotFound() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions/bad_zone"))
            .willReturn(notFound()));

        assertThatThrownBy(() -> client.getZoneConditions("bad_zone"))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("bad_zone");
    }

    @Test
    void getZoneConditions_happyPath_returnsDto() {
        wireMock.stubFor(get(urlEqualTo("/api/conditions/manila_bay"))
            .willReturn(okJson(ZONE_JSON)));

        MarineZoneConditionsDto result = client.getZoneConditions("manila_bay");
        assertThat(result.getZone().getId()).isEqualTo("manila_bay");
        assertThat(result.getRisk().getLevel()).isEqualTo("SAFE");
    }
}
```

- [ ] **Step 2: Run the tests — expect FAIL**

```bash
cd backend
./mvnw test -pl . -Dtest=MarineServiceClientTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: FAIL — `MarineServiceClient` does not exist.

- [ ] **Step 3: Create `MarineServiceClient.java`**

```java
package com.mermaid.app.client;

import com.mermaid.app.client.dto.MarineAllConditionsDto;
import com.mermaid.app.client.dto.MarineZoneConditionsDto;
import com.mermaid.app.exception.MarineServiceUnavailableException;
import com.mermaid.app.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.function.Supplier;

@Component
public class MarineServiceClient {

    private final RestClient restClient;

    public MarineServiceClient(
            @Value("${marine.service.url}") String baseUrl,
            @Value("${marine.service.api-key}") String apiKey,
            @Value("${marine.service.timeout-seconds:5}") int timeoutSeconds) {

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-API-Key", apiKey)
                .requestFactory(factory)
                .build();
    }

    public MarineAllConditionsDto getAllConditions() {
        try {
            return callWithRetry(() -> restClient.get()
                    .uri("/api/conditions")
                    .retrieve()
                    .body(MarineAllConditionsDto.class));
        } catch (HttpClientErrorException e) {
            // 401 = misconfigured API key — our bug, not user's → 503
            throw new MarineServiceUnavailableException("Marine service error: " + e.getStatusCode());
        }
    }

    public MarineZoneConditionsDto getZoneConditions(String zoneId) {
        try {
            return callWithRetry(() -> restClient.get()
                    .uri("/api/conditions/{zoneId}", zoneId)
                    .retrieve()
                    .body(MarineZoneConditionsDto.class));
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ResourceNotFoundException("Zone not found: " + zoneId);
            }
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
        } catch (HttpServerErrorException | ResourceAccessException first) {
            try {
                return call.get();
            } catch (HttpServerErrorException | ResourceAccessException second) {
                throw new MarineServiceUnavailableException("Marine service unavailable after retry");
            }
        }
    }
}
```

- [ ] **Step 4: Run the tests — expect PASS**

```bash
./mvnw test -pl . -Dtest=MarineServiceClientTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: PASS all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/client/MarineServiceClient.java \
        backend/src/test/java/com/mermaid/app/client/MarineServiceClientTest.java
git commit -m "feat(marine): add MarineServiceClient with RestClient and manual retry"
```

---

## Task 10: `MarineController` (TDD with `@WebMvcTest`)

**Files:**
- Create: `backend/src/main/java/com/mermaid/app/controller/MarineController.java`
- Create: `backend/src/test/java/com/mermaid/app/controller/MarineControllerTest.java`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/test/java/com/mermaid/app/controller/MarineControllerTest.java`:

```java
package com.mermaid.app.controller;

import com.github.benmanes.caffeine.cache.Cache;
import com.mermaid.app.client.MarineServiceClient;
import com.mermaid.app.config.CacheConfig;
import com.mermaid.app.exception.MarineServiceUnavailableException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.mapper.MarineConditionsMapper;
import com.mermaid.app.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MarineController.class)
@Import({CacheConfig.class})
class MarineControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean MarineServiceClient client;
    @MockitoBean MarineConditionsMapper mapper;
    @MockitoBean JwtDecoder jwtDecoder;  // prevents SecurityConfig from building a real one

    @Autowired Cache<String, AllMarineConditionsResponse> cache;

    private AllMarineConditionsResponse sampleAllResponse() {
        MarineConditionsResponse zone = new MarineConditionsResponse();
        zone.setZoneId("manila_bay");
        zone.setZoneName("Manila Bay");
        zone.setRegion("Luzon");
        zone.setLat(14.5);
        zone.setLng(120.8);
        zone.setObservedAt(OffsetDateTime.now());
        zone.setDataSource("Open-Meteo");

        RiskAssessmentDto risk = new RiskAssessmentDto();
        risk.setLevel(RiskLevel.SAFE);
        risk.setScore(0);
        risk.setFactors(List.of());
        risk.setAdvisory("Safe.");
        zone.setRisk(risk);

        zone.setMarine(new MarineDataDto());
        zone.setWeather(new WeatherDataDto());

        AllMarineConditionsResponse all = new AllMarineConditionsResponse();
        all.setZones(List.of(zone));
        all.setGeneratedAt(OffsetDateTime.now());
        return all;
    }

    @BeforeEach
    void clearCache() {
        cache.invalidateAll();
    }

    @Test
    void getAllConditions_noJwt_returns401() throws Exception {
        mockMvc.perform(get("/marine/conditions"))
               .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllConditions_withJwt_returns200() throws Exception {
        AllMarineConditionsResponse expected = sampleAllResponse();
        when(mapper.toAllResponse(any())).thenReturn(expected);
        when(client.getAllConditions()).thenReturn(null); // mapper is mocked, dto value irrelevant

        mockMvc.perform(get("/marine/conditions").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.zones[0].zoneId").value("manila_bay"))
               .andExpect(jsonPath("$.zones[0].risk.level").value("SAFE"));
    }

    @Test
    void getAllConditions_calledTwice_clientCalledOnce() throws Exception {
        AllMarineConditionsResponse expected = sampleAllResponse();
        when(mapper.toAllResponse(any())).thenReturn(expected);
        when(client.getAllConditions()).thenReturn(null);

        mockMvc.perform(get("/marine/conditions").with(jwt())).andExpect(status().isOk());
        mockMvc.perform(get("/marine/conditions").with(jwt())).andExpect(status().isOk());

        verify(client, times(1)).getAllConditions(); // second call is a cache hit
    }

    @Test
    void getZoneConditions_withJwt_returns200() throws Exception {
        MarineConditionsResponse zone = sampleAllResponse().getZones().get(0);
        when(mapper.toResponse(any())).thenReturn(zone);
        when(client.getZoneConditions("manila_bay")).thenReturn(null);

        mockMvc.perform(get("/marine/conditions/manila_bay").with(jwt()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.zoneId").value("manila_bay"));
    }

    @Test
    void getZoneConditions_unknownZone_returns404() throws Exception {
        when(client.getZoneConditions("bad_zone"))
            .thenThrow(new ResourceNotFoundException("Zone not found: bad_zone"));

        mockMvc.perform(get("/marine/conditions/bad_zone").with(jwt()))
               .andExpect(status().isNotFound());
    }

    @Test
    void getAllConditions_clientThrows503_returns503() throws Exception {
        when(client.getAllConditions())
            .thenThrow(new MarineServiceUnavailableException("unavailable"));

        mockMvc.perform(get("/marine/conditions").with(jwt()))
               .andExpect(status().isServiceUnavailable());
    }
}
```

- [ ] **Step 2: Run the tests — expect FAIL**

```bash
cd backend
./mvnw test -pl . -Dtest=MarineControllerTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: FAIL — `MarineController` does not exist.

- [ ] **Step 3: Create `MarineController.java`**

```java
package com.mermaid.app.controller;

import com.github.benmanes.caffeine.cache.Cache;
import com.mermaid.app.api.MarineApi;
import com.mermaid.app.client.MarineServiceClient;
import com.mermaid.app.mapper.MarineConditionsMapper;
import com.mermaid.app.model.AllMarineConditionsResponse;
import com.mermaid.app.model.MarineConditionsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MarineController implements MarineApi {

    private static final String CACHE_KEY = "all";

    private final MarineServiceClient client;
    private final MarineConditionsMapper mapper;
    private final Cache<String, AllMarineConditionsResponse> cache;

    public MarineController(
            MarineServiceClient client,
            MarineConditionsMapper mapper,
            Cache<String, AllMarineConditionsResponse> cache) {
        this.client = client;
        this.mapper = mapper;
        this.cache = cache;
    }

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
        // Goes direct to client — marine service has its own 15-min cache.
        // Java-side caching is only on the all-zones aggregate to absorb dashboard load spikes.
        return ResponseEntity.ok(mapper.toResponse(client.getZoneConditions(zoneId)));
    }
}
```

- [ ] **Step 4: Run the tests — expect PASS**

```bash
./mvnw test -pl . -Dtest=MarineControllerTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: PASS all 6 tests.

- [ ] **Step 5: Run the full test suite to confirm nothing is broken**

```bash
./mvnw test
```

Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/mermaid/app/controller/MarineController.java \
        backend/src/test/java/com/mermaid/app/controller/MarineControllerTest.java
git commit -m "feat(marine): add MarineController with Caffeine cache and JWT protection"
```

---

## Final Verification

- [ ] **Start all three services and do a manual end-to-end check**

Terminal 1 — marine service:
```bash
cd marine-service
uvicorn app.main:app --reload --port 8081
```

Terminal 2 — backend:
```bash
cd backend
./mvnw spring-boot:run
```

Terminal 3 — verify:
```bash
# 1. Login to get a JWT (replace with a real registered account)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mermaid.local","password":"your-password"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 2. Fetch all zones
curl -s http://localhost:8080/api/marine/conditions \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# 3. Fetch a single zone
curl -s http://localhost:8080/api/marine/conditions/manila_bay \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# 4. Fetch unknown zone — expect 404
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8080/api/marine/conditions/bad_zone \
  -H "Authorization: Bearer $TOKEN"
```

Expected:
- Step 2: JSON with `zones` array, each zone has `zoneId`, `risk.level`, `risk.advisory`, `marine.waveHeightM`, `weather.windSpeedKmh`
- Step 3: Single zone JSON
- Step 4: `404`
