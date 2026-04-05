# Marine Service Django + DRF Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the FastAPI marine service with Django + Django REST Framework, adding a PostgreSQL database for zone definitions and configurable risk thresholds, while keeping all 5 API endpoints and their response contracts unchanged.

**Architecture:** Django project (`marine_project`) with a single `conditions` app. DRF handles routing and serialization. Services layer (`services/`) stays framework-agnostic with sync `httpx.Client`. In-memory TTL cache stays unchanged. DB models (`FishingZone`, `RiskThreshold`, `RiskConfig`) replace hardcoded dicts and constants.

**Tech Stack:** Django 6.0.1, djangorestframework~=3.15.0, django-cors-headers~=4.6.0, httpx, pydantic, psycopg2-binary, pytest + pytest-django

---

## File Map

### Created
| File | Responsibility |
|------|---------------|
| `marine-service/manage.py` | Django management entry point |
| `marine-service/marine_project/__init__.py` | Package marker |
| `marine-service/marine_project/settings.py` | All Django + app config, reads `.env` |
| `marine-service/marine_project/urls.py` | Top-level URL routing |
| `marine-service/marine_project/wsgi.py` | WSGI entry point |
| `marine-service/conditions/__init__.py` | Package marker |
| `marine-service/conditions/apps.py` | `ConditionsConfig` — creates shared `httpx.Client` in `ready()` |
| `marine-service/conditions/models.py` | `FishingZone`, `RiskThreshold`, `RiskConfig` ORM models |
| `marine-service/conditions/migrations/0001_initial.py` | Schema migration (generated) |
| `marine-service/conditions/migrations/0002_seed_data.py` | Seeds 12 zones + 8 threshold rows + 1 RiskConfig |
| `marine-service/conditions/serializers.py` | DRF serializers for all response shapes |
| `marine-service/conditions/authentication.py` | `ApiKeyAuthentication` + `HasValidApiKey` |
| `marine-service/conditions/views.py` | 5 DRF `APIView` classes |
| `marine-service/conditions/urls.py` | Conditions URL patterns (forecast before zone_id) |
| `marine-service/conditions/admin.py` | Django admin registrations |
| `marine-service/services/__init__.py` | Package marker |
| `marine-service/services/models.py` | Pydantic models (moved from `app/models/marine.py`) |
| `marine-service/tests/__init__.py` | Package marker |
| `marine-service/tests/test_risk_engine.py` | Unit tests for `compute_risk` |
| `marine-service/tests/test_authentication.py` | Unit tests for `ApiKeyAuthentication` + `HasValidApiKey` |
| `marine-service/tests/test_open_meteo.py` | Unit tests for parser functions and daily aggregation |
| `marine-service/tests/test_serializers.py` | Roundtrip test for `ZoneConditionsSerializer` |
| `marine-service/tests/test_views.py` | Integration tests for all 5 endpoints via DRF test client |

### Created (new path — existing app/ versions are deleted)
| File | Responsibility |
|------|---------------|
| `marine-service/services/open_meteo.py` | Sync rewrite (`httpx.Client`, `ThreadPoolExecutor`) — new file at new path |
| `marine-service/services/risk_engine.py` | DB-backed thresholds — new file at new path |

### Modified
| File | Change |
|------|--------|
| `marine-service/requirements.txt` | Remove fastapi/uvicorn/starlette; add djangorestframework, django-cors-headers |
| `marine-service/requirements-dev.txt` | Add `pytest-django` |

### Retained (unchanged)
| File | Notes |
|------|-------|
| `marine-service/cache/__init__.py` | Kept as-is |
| `marine-service/cache/ttl_cache.py` | Kept as-is; exposes `.get()`, `.set()`, `.size()`, `.invalidate()`, `.clear()` |

### Deleted
| Path | Reason |
|------|--------|
| `marine-service/app/` | Entire FastAPI app package replaced by Django project |

---

## Task 1: Update requirements and install dependencies

**Files:**
- Modify: `marine-service/requirements.txt`
- Modify: `marine-service/requirements-dev.txt`

- [ ] **Step 1: Update requirements.txt**

Replace contents of `marine-service/requirements.txt` with:

```
Django==6.0.1
djangorestframework~=3.15.0
django-cors-headers~=4.6.0
httpx==0.28.1
pydantic==2.12.5
pydantic-settings==2.13.1
psycopg2-binary==2.9.11
python-dotenv==1.2.2
```

- [ ] **Step 2: Update requirements-dev.txt**

```
pytest==8.3.5
pytest-django==4.9.0
```

(`pytest-asyncio` is no longer needed — no async code.)

- [ ] **Step 3: Install updated dependencies**

```bash
cd marine-service
pip install -r requirements.txt -r requirements-dev.txt
```

Expected: packages install without errors. `django-admin --version` prints `6.0.1`.

- [ ] **Step 4: Commit**

```bash
git add marine-service/requirements.txt marine-service/requirements-dev.txt
git commit -m "chore(marine): update requirements for Django + DRF refactor"
```

---

## Task 2: Scaffold Django project

**Files:**
- Create: `marine-service/manage.py`
- Create: `marine-service/marine_project/__init__.py`
- Create: `marine-service/marine_project/settings.py`
- Create: `marine-service/marine_project/urls.py`
- Create: `marine-service/marine_project/wsgi.py`
- Create: `marine-service/conditions/__init__.py`
- Create: `marine-service/conditions/apps.py`

- [ ] **Step 1: Create manage.py**

Create `marine-service/manage.py`:

```python
#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marine_project.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
```

- [ ] **Step 2: Create marine_project/settings.py**

Create `marine-service/marine_project/__init__.py` (empty).

Create `marine-service/marine_project/settings.py`:

```python
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-change-in-prod")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "conditions.apps.ConditionsConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "marine_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "marine_project.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "mermaid_db"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "1234"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5173 http://localhost:8080"
).split()

STATIC_URL = "/static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Marine service settings
MARINE_API_KEY = os.environ.get("MARINE_API_KEY", "dev-marine-key-change-in-prod")
APP_VERSION = "1.0.0"
CONDITIONS_CACHE_TTL = int(os.environ.get("CONDITIONS_CACHE_TTL", "900"))
FORECAST_CACHE_TTL = int(os.environ.get("FORECAST_CACHE_TTL", "3600"))
HTTP_TIMEOUT = float(os.environ.get("HTTP_TIMEOUT", "30.0"))
OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
```

- [ ] **Step 3: Create marine_project/urls.py**

Create `marine-service/marine_project/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

# No trailing slash on "api/conditions" — the Java backend calls /api/conditions
# (no slash). Django's APPEND_SLASH would 301-redirect without a match here, which
# the Java backend may not follow. Match the exact paths the spec defines.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/conditions", include("conditions.urls")),
    path("api/", include("conditions.health_urls")),
]
```

- [ ] **Step 4: Create marine_project/wsgi.py**

Create `marine-service/marine_project/wsgi.py`:

```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marine_project.settings")
application = get_wsgi_application()
```

- [ ] **Step 5: Create conditions package**

Create `marine-service/conditions/__init__.py` (empty).

Create `marine-service/conditions/apps.py`:

```python
import atexit
from django.apps import AppConfig


class ConditionsConfig(AppConfig):
    name = "conditions"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        import httpx
        from django.conf import settings

        self.http_client = httpx.Client(
            timeout=settings.HTTP_TIMEOUT,
            headers={
                "Accept": "application/json",
                "User-Agent": "MERMAID-MarineService/1.0",
            },
            follow_redirects=True,
        )
        atexit.register(self.http_client.close)
```

- [ ] **Step 6: Verify Django recognises the project**

```bash
cd marine-service
python manage.py check --deploy 2>&1 | head -20
```

Expected: Output mentions warnings about `SECRET_KEY` or `DEBUG` (normal for dev) but no `SystemCheckError`.

- [ ] **Step 7: Commit scaffold**

```bash
git add marine-service/manage.py marine-service/marine_project/ marine-service/conditions/
git commit -m "feat(marine): scaffold Django project and conditions app"
```

---

## Task 3: DB models + migrations

**Files:**
- Create: `marine-service/conditions/models.py`
- Create: `marine-service/conditions/migrations/__init__.py`
- Create: `marine-service/conditions/migrations/0001_initial.py` (generated)
- Create: `marine-service/conditions/migrations/0002_seed_data.py`
- Create: `marine-service/tests/__init__.py`
- Create: `marine-service/tests/test_models.py`

- [ ] **Step 1: Create pytest.ini for pytest-django**

Create `marine-service/pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = marine_project.settings
python_files = tests/test_*.py
```

- [ ] **Step 2: Create tests/__init__.py**

Create `marine-service/tests/__init__.py` (empty).

- [ ] **Step 3: Write failing model tests**

Create `marine-service/tests/test_models.py`:

```python
import pytest
from django.test import TestCase


class TestFishingZone(TestCase):
    def test_str_representation(self):
        from conditions.models import FishingZone
        zone = FishingZone(id="agoo", name="Agoo", lat=16.32, lng=120.22, region="La Union")
        assert str(zone) == "Agoo (agoo)"

    def test_is_active_defaults_true(self):
        from conditions.models import FishingZone
        zone = FishingZone.objects.create(
            id="test_zone", name="Test", lat=0.0, lng=0.0, region="Test"
        )
        assert zone.is_active is True


class TestRiskThreshold(TestCase):
    def test_str_representation(self):
        from conditions.models import RiskThreshold
        t = RiskThreshold(parameter="WAVE", upper_bound=1.25, score_points=0, order=1)
        assert "WAVE" in str(t)
        assert "1.25" in str(t)


class TestRiskConfig(TestCase):
    def test_defaults(self):
        from conditions.models import RiskConfig
        config = RiskConfig.objects.create()
        assert config.safe_max_score == 2
        assert config.caution_max_score == 5
        assert config.gust_threshold_kmh == 60.0
        assert config.heavy_rain_mm_h == 10.0
```

- [ ] **Step 4: Run tests — verify they FAIL**

```bash
cd marine-service
pytest tests/test_models.py -v
```

Expected: `ImportError: No module named 'conditions.models'` or similar.

- [ ] **Step 5: Create conditions/models.py**

Create `marine-service/conditions/models.py`:

```python
from django.db import models


class FishingZone(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    lat = models.FloatField()
    lng = models.FloatField()
    region = models.CharField(max_length=100, default="La Union")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "conditions_fishingzone"
        indexes = [models.Index(fields=["is_active"])]

    def __str__(self):
        return f"{self.name} ({self.id})"


class RiskThreshold(models.Model):
    PARAMETER_CHOICES = [("WAVE", "Wave Height"), ("WIND", "Wind Speed")]

    parameter = models.CharField(max_length=10, choices=PARAMETER_CHOICES)
    upper_bound = models.FloatField(help_text="Upper bound for this tier. Use 9999.0 for 'infinity'.")
    score_points = models.IntegerField(help_text="Points added when value <= upper_bound.")
    order = models.IntegerField(help_text="Evaluation order (ascending).")

    class Meta:
        db_table = "conditions_riskthreshold"
        ordering = ["parameter", "order"]

    def __str__(self):
        return f"{self.parameter} tier {self.order}: <= {self.upper_bound} → {self.score_points}pts"


class RiskConfig(models.Model):
    safe_max_score = models.IntegerField(default=2)
    caution_max_score = models.IntegerField(default=5)
    gust_threshold_kmh = models.FloatField(default=60.0)
    heavy_rain_mm_h = models.FloatField(default=10.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conditions_riskconfig"

    def __str__(self):
        return f"RiskConfig (safe≤{self.safe_max_score}, caution≤{self.caution_max_score})"
```

- [ ] **Step 6: Generate schema migration**

```bash
cd marine-service
python manage.py makemigrations conditions
```

Expected: Creates `conditions/migrations/0001_initial.py`.

- [ ] **Step 7: Write seed data migration**

Create `marine-service/conditions/migrations/0002_seed_data.py`:

```python
from django.db import migrations


ZONES = [
    {"id": "sto_tomas",    "name": "Sto. Tomas",          "lat": 16.25, "lng": 120.22},
    {"id": "aringay",      "name": "Aringay",              "lat": 16.40, "lng": 120.23},
    {"id": "agoo",         "name": "Agoo",                 "lat": 16.32, "lng": 120.22},
    {"id": "rosario",      "name": "Rosario",              "lat": 16.19, "lng": 120.25},
    {"id": "san_fernando", "name": "City of San Fernando", "lat": 16.62, "lng": 120.20},
    {"id": "bacnotan",     "name": "Bacnotan",             "lat": 16.74, "lng": 120.23},
    {"id": "bauang",       "name": "Bauang",               "lat": 16.52, "lng": 120.21},
    {"id": "luna",         "name": "Luna",                 "lat": 16.85, "lng": 120.25},
    {"id": "bangar",       "name": "Bangar",               "lat": 16.89, "lng": 120.28},
    {"id": "caba",         "name": "Caba",                 "lat": 16.47, "lng": 120.22},
    {"id": "san_juan",     "name": "San Juan",             "lat": 16.68, "lng": 120.20},
    {"id": "balaoan",      "name": "Balaoan",              "lat": 16.80, "lng": 120.24},
]

WAVE_THRESHOLDS = [
    {"order": 1, "upper_bound": 1.25,   "score_points": 0},
    {"order": 2, "upper_bound": 2.50,   "score_points": 3},
    {"order": 3, "upper_bound": 4.00,   "score_points": 6},
    {"order": 4, "upper_bound": 9999.0, "score_points": 9},
]

WIND_THRESHOLDS = [
    {"order": 1, "upper_bound": 30.0,   "score_points": 0},
    {"order": 2, "upper_bound": 60.0,   "score_points": 2},
    {"order": 3, "upper_bound": 100.0,  "score_points": 5},
    {"order": 4, "upper_bound": 9999.0, "score_points": 8},
]


def seed_data(apps, schema_editor):
    FishingZone = apps.get_model("conditions", "FishingZone")
    RiskThreshold = apps.get_model("conditions", "RiskThreshold")
    RiskConfig = apps.get_model("conditions", "RiskConfig")

    for z in ZONES:
        FishingZone.objects.get_or_create(id=z["id"], defaults={**z, "region": "La Union"})

    for t in WAVE_THRESHOLDS:
        RiskThreshold.objects.get_or_create(
            parameter="WAVE", order=t["order"],
            defaults={"upper_bound": t["upper_bound"], "score_points": t["score_points"]},
        )
    for t in WIND_THRESHOLDS:
        RiskThreshold.objects.get_or_create(
            parameter="WIND", order=t["order"],
            defaults={"upper_bound": t["upper_bound"], "score_points": t["score_points"]},
        )

    if not RiskConfig.objects.exists():
        RiskConfig.objects.create()


def unseed_data(apps, schema_editor):
    apps.get_model("conditions", "FishingZone").objects.all().delete()
    apps.get_model("conditions", "RiskThreshold").objects.all().delete()
    apps.get_model("conditions", "RiskConfig").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("conditions", "0001_initial")]

    operations = [migrations.RunPython(seed_data, unseed_data)]
```

- [ ] **Step 8: Run migrations**

```bash
cd marine-service
python manage.py migrate
```

Expected: Applies `0001_initial` and `0002_seed_data` with no errors.

- [ ] **Step 9: Run model tests — verify they PASS**

```bash
pytest tests/test_models.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 10: Commit**

```bash
git add marine-service/conditions/models.py marine-service/conditions/migrations/ \
        marine-service/tests/ marine-service/pytest.ini
git commit -m "feat(marine): add Django models and seed migrations"
```

---

## Task 4: Move Pydantic models to services/models.py

**Files:**
- Create: `marine-service/services/__init__.py`
- Create: `marine-service/services/models.py`

- [ ] **Step 1: Create services/__init__.py**

Create `marine-service/services/__init__.py` (empty).

- [ ] **Step 2: Create services/models.py**

Copy `marine-service/app/models/marine.py` to `marine-service/services/models.py`, then update the import path at the top:

```python
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    UNSAFE = "UNSAFE"


class FishingZone(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    region: str


class MarineData(BaseModel):
    wave_height_m: Optional[float] = Field(None)
    swell_height_m: Optional[float] = Field(None)
    swell_period_s: Optional[float] = Field(None)
    swell_direction_deg: Optional[float] = Field(None)


class WeatherData(BaseModel):
    wind_speed_kmh: float
    wind_direction_deg: float
    wind_gusts_kmh: float
    precipitation_mm: float
    temperature_c: float
    cloud_cover_pct: float


class RiskAssessment(BaseModel):
    level: RiskLevel
    score: int = Field(..., ge=0, le=10)
    factors: list[str] = Field(default_factory=list)
    advisory: str


class ZoneConditions(BaseModel):
    zone: FishingZone
    timestamp: datetime
    marine: MarineData
    weather: WeatherData
    risk: RiskAssessment
    data_source: str = "Open-Meteo"


class HourlyForecastPoint(BaseModel):
    time: datetime
    marine: MarineData
    weather: WeatherData
    risk: RiskAssessment


class DailyForecastSummary(BaseModel):
    date: date
    max_wave_height_m: Optional[float]
    avg_wind_speed_kmh: float
    max_wind_speed_kmh: float
    max_wind_gusts_kmh: float
    total_precipitation_mm: float
    dominant_risk: RiskLevel
    safe_hours: int
    caution_hours: int
    unsafe_hours: int


class ZoneForecast(BaseModel):
    zone: FishingZone
    generated_at: datetime
    daily_summary: list[DailyForecastSummary]
    hourly: list[HourlyForecastPoint]


class AllConditionsResponse(BaseModel):
    zones: list[ZoneConditions]
    generated_at: datetime


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    cache_entries: int
```

- [ ] **Step 3: Verify import works**

```bash
cd marine-service
python -c "from services.models import ZoneConditions, RiskLevel; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add marine-service/services/
git commit -m "feat(marine): move Pydantic models to services/models.py"
```

---

## Task 5: Rewrite services/open_meteo.py as sync

**Files:**
- Modify: `marine-service/services/open_meteo.py`

> Note: The existing `app/services/open_meteo.py` is the reference. We are creating a new file at `services/open_meteo.py` — not modifying `app/services/open_meteo.py`.

- [ ] **Step 1: Write a failing parser test**

Create `marine-service/tests/test_open_meteo.py`:

```python
from django.test import TestCase
from unittest.mock import MagicMock, patch


class TestParseCurrentConditions(TestCase):
    def test_parse_marine_current_handles_missing_fields(self):
        """_parse_marine_current returns None fields when Open-Meteo omits them."""
        from services.open_meteo import _parse_marine_current
        data = {"current": {}}
        result = _parse_marine_current(data)
        assert result.wave_height_m is None
        assert result.swell_height_m is None

    def test_parse_weather_current_defaults_zeros_for_missing(self):
        from services.open_meteo import _parse_weather_current
        data = {"current": {}}
        result = _parse_weather_current(data)
        assert result.wind_speed_kmh == 0.0
        assert result.temperature_c == 28.0  # default fallback

    def test_idx_returns_none_for_out_of_range(self):
        from services.open_meteo import _idx
        d = {"wave_height": [1.0, 2.0]}
        assert _idx(d, "wave_height", 5) is None

    def test_aggregate_daily_groups_by_date(self):
        from services.open_meteo import _aggregate_daily
        from services.models import HourlyForecastPoint, MarineData, WeatherData, RiskAssessment, RiskLevel
        import datetime

        def _point(hour):
            return HourlyForecastPoint(
                time=datetime.datetime(2026, 4, 5, hour, 0, tzinfo=datetime.timezone.utc),
                marine=MarineData(wave_height_m=0.5),
                weather=WeatherData(
                    wind_speed_kmh=10, wind_direction_deg=0,
                    wind_gusts_kmh=12, precipitation_mm=0,
                    temperature_c=28, cloud_cover_pct=20,
                ),
                risk=RiskAssessment(
                    level=RiskLevel.SAFE, score=0,
                    factors=["No significant hazards detected"],
                    advisory="Safe.",
                ),
            )

        points = [_point(h) for h in range(3)]
        summaries = _aggregate_daily(points)
        assert len(summaries) == 1
        assert summaries[0].date == datetime.date(2026, 4, 5)
        assert summaries[0].safe_hours == 3
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd marine-service
pytest tests/test_open_meteo.py -v
```

Expected: `ImportError` — `services.open_meteo` does not exist yet.

- [ ] **Step 3: Create services/open_meteo.py (sync rewrite)**

Create `marine-service/services/open_meteo.py`:

```python
"""
Open-Meteo API client — synchronous version.

Uses the free Open-Meteo Marine API and Weather API (no API key required).
Marine + weather data for the same location are requested concurrently via
ThreadPoolExecutor(max_workers=2).
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone

import httpx
from django.conf import settings

from services.models import (
    DailyForecastSummary,
    FishingZone,
    HourlyForecastPoint,
    MarineData,
    RiskLevel,
    WeatherData,
    ZoneConditions,
    ZoneForecast,
)
from services.risk_engine import compute_risk

logger = logging.getLogger(__name__)

_MARINE_PARAMS = "wave_height,swell_wave_height,swell_wave_period,swell_wave_direction"
_WEATHER_PARAMS = (
    "wind_speed_10m,wind_direction_10m,wind_gusts_10m,"
    "precipitation,temperature_2m,cloud_cover"
)
_TIMEZONE = "Asia/Manila"


def fetch_current_conditions(zone, client: httpx.Client) -> ZoneConditions:
    """Accepts a Django ORM FishingZone or any object with .id/.lat/.lng/.name/.region."""
    marine_json, weather_json = _fetch_both(zone, client, hourly=False)
    marine = _parse_marine_current(marine_json)
    weather = _parse_weather_current(weather_json)
    pydantic_zone = FishingZone(
        id=zone.id, name=zone.name, lat=zone.lat, lng=zone.lng, region=zone.region
    )
    return ZoneConditions(
        zone=pydantic_zone,
        timestamp=datetime.now(timezone.utc),
        marine=marine,
        weather=weather,
        risk=compute_risk(marine, weather),
    )


def fetch_forecast(zone, client: httpx.Client) -> ZoneForecast:
    marine_json, weather_json = _fetch_both(zone, client, hourly=True)
    hourly_points = _build_hourly_points(marine_json, weather_json)
    daily = _aggregate_daily(hourly_points)
    pydantic_zone = FishingZone(
        id=zone.id, name=zone.name, lat=zone.lat, lng=zone.lng, region=zone.region
    )
    return ZoneForecast(
        zone=pydantic_zone,
        generated_at=datetime.now(timezone.utc),
        daily_summary=daily,
        hourly=hourly_points,
    )


def _fetch_both(zone, client: httpx.Client, *, hourly: bool) -> tuple[dict, dict]:
    key = "hourly" if hourly else "current"
    base = {"latitude": zone.lat, "longitude": zone.lng, "timezone": _TIMEZONE}

    def get_marine():
        r = client.get(settings.OPEN_METEO_MARINE_URL, params={**base, key: _MARINE_PARAMS})
        r.raise_for_status()
        return r.json()

    def get_weather():
        r = client.get(settings.OPEN_METEO_WEATHER_URL, params={**base, key: _WEATHER_PARAMS})
        r.raise_for_status()
        return r.json()

    with ThreadPoolExecutor(max_workers=2) as executor:
        marine_future = executor.submit(get_marine)
        weather_future = executor.submit(get_weather)
        return marine_future.result(), weather_future.result()


def _parse_marine_current(data: dict) -> MarineData:
    c = data.get("current", {})
    return MarineData(
        wave_height_m=c.get("wave_height"),
        swell_height_m=c.get("swell_wave_height"),
        swell_period_s=c.get("swell_wave_period"),
        swell_direction_deg=c.get("swell_wave_direction"),
    )


def _parse_weather_current(data: dict) -> WeatherData:
    c = data.get("current", {})
    return WeatherData(
        wind_speed_kmh=c.get("wind_speed_10m") or 0.0,
        wind_direction_deg=c.get("wind_direction_10m") or 0.0,
        wind_gusts_kmh=c.get("wind_gusts_10m") or 0.0,
        precipitation_mm=c.get("precipitation") or 0.0,
        temperature_c=c.get("temperature_2m") or 28.0,
        cloud_cover_pct=c.get("cloud_cover") or 0.0,
    )


def _build_hourly_points(marine_json: dict, weather_json: dict) -> list[HourlyForecastPoint]:
    mh = marine_json.get("hourly", {})
    wh = weather_json.get("hourly", {})
    times: list[str] = mh.get("time", [])
    points: list[HourlyForecastPoint] = []

    for i, t in enumerate(times):
        marine = MarineData(
            wave_height_m=_idx(mh, "wave_height", i),
            swell_height_m=_idx(mh, "swell_wave_height", i),
            swell_period_s=_idx(mh, "swell_wave_period", i),
            swell_direction_deg=_idx(mh, "swell_wave_direction", i),
        )
        weather = WeatherData(
            wind_speed_kmh=_idx(wh, "wind_speed_10m", i) or 0.0,
            wind_direction_deg=_idx(wh, "wind_direction_10m", i) or 0.0,
            wind_gusts_kmh=_idx(wh, "wind_gusts_10m", i) or 0.0,
            precipitation_mm=_idx(wh, "precipitation", i) or 0.0,
            temperature_c=_idx(wh, "temperature_2m", i) or 28.0,
            cloud_cover_pct=_idx(wh, "cloud_cover", i) or 0.0,
        )
        points.append(HourlyForecastPoint(
            time=datetime.fromisoformat(t).replace(tzinfo=timezone.utc),
            marine=marine,
            weather=weather,
            risk=compute_risk(marine, weather),
        ))

    return points


def _aggregate_daily(points: list[HourlyForecastPoint]) -> list[DailyForecastSummary]:
    buckets: dict[date, list[HourlyForecastPoint]] = {}
    for p in points:
        d = p.time.date()
        buckets.setdefault(d, []).append(p)

    summaries = []
    for day, day_points in sorted(buckets.items()):
        risk_counts = {RiskLevel.SAFE: 0, RiskLevel.CAUTION: 0, RiskLevel.UNSAFE: 0}
        max_wave = max_wind = max_gusts = total_precip = wind_sum = 0.0

        for p in day_points:
            risk_counts[p.risk.level] += 1
            if p.marine.wave_height_m is not None:
                max_wave = max(max_wave, p.marine.wave_height_m)
            max_wind = max(max_wind, p.weather.wind_speed_kmh)
            max_gusts = max(max_gusts, p.weather.wind_gusts_kmh)
            total_precip += p.weather.precipitation_mm
            wind_sum += p.weather.wind_speed_kmh

        dominant = (
            RiskLevel.UNSAFE if risk_counts[RiskLevel.UNSAFE] > 0
            else RiskLevel.CAUTION if risk_counts[RiskLevel.CAUTION] > 0
            else RiskLevel.SAFE
        )
        summaries.append(DailyForecastSummary(
            date=day,
            max_wave_height_m=max_wave or None,
            avg_wind_speed_kmh=round(wind_sum / len(day_points), 1),
            max_wind_speed_kmh=max_wind,
            max_wind_gusts_kmh=max_gusts,
            total_precipitation_mm=round(total_precip, 1),
            dominant_risk=dominant,
            safe_hours=risk_counts[RiskLevel.SAFE],
            caution_hours=risk_counts[RiskLevel.CAUTION],
            unsafe_hours=risk_counts[RiskLevel.UNSAFE],
        ))

    return summaries


def _idx(d: dict, key: str, i: int):
    lst = d.get(key, [])
    return lst[i] if i < len(lst) else None
```

- [ ] **Step 4: Run parser tests — verify they PASS**

```bash
cd marine-service
pytest tests/test_open_meteo.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add marine-service/services/open_meteo.py marine-service/tests/test_open_meteo.py
git commit -m "feat(marine): rewrite open_meteo service as sync with ThreadPoolExecutor"
```

---

## Task 6: Rewrite services/risk_engine.py for DB-backed thresholds

**Files:**
- Modify: `marine-service/services/risk_engine.py`
- Create: `marine-service/tests/test_risk_engine.py`

> Note: We are creating a new file at `services/risk_engine.py`. The old file is at `app/services/risk_engine.py` and is still there until Task 11.

- [ ] **Step 1: Write failing risk engine tests**

Create `marine-service/tests/test_risk_engine.py`:

```python
import pytest
from django.test import TestCase

from services.models import MarineData, WeatherData


class TestComputeRisk(TestCase):
    """Tests use the seeded DB thresholds from 0002_seed_data.py."""

    def test_calm_conditions_are_safe(self):
        from services.risk_engine import compute_risk
        marine = MarineData(wave_height_m=0.5)
        weather = WeatherData(
            wind_speed_kmh=10, wind_direction_deg=0,
            wind_gusts_kmh=15, precipitation_mm=0,
            temperature_c=28, cloud_cover_pct=20,
        )
        result = compute_risk(marine, weather)
        assert result.level.value == "SAFE"
        assert result.score <= 2

    def test_rough_sea_is_caution(self):
        from services.risk_engine import compute_risk
        marine = MarineData(wave_height_m=2.0)
        weather = WeatherData(
            wind_speed_kmh=50, wind_direction_deg=0,
            wind_gusts_kmh=55, precipitation_mm=2,
            temperature_c=28, cloud_cover_pct=60,
        )
        result = compute_risk(marine, weather)
        assert result.level.value == "CAUTION"
        assert 3 <= result.score <= 5

    def test_typhoon_conditions_are_unsafe(self):
        from services.risk_engine import compute_risk
        marine = MarineData(wave_height_m=5.0)
        weather = WeatherData(
            wind_speed_kmh=120, wind_direction_deg=0,
            wind_gusts_kmh=150, precipitation_mm=20,
            temperature_c=26, cloud_cover_pct=100,
        )
        result = compute_risk(marine, weather)
        assert result.level.value == "UNSAFE"
        assert result.score > 5

    def test_advisory_is_non_empty(self):
        from services.risk_engine import compute_risk
        marine = MarineData(wave_height_m=0.5)
        weather = WeatherData(
            wind_speed_kmh=5, wind_direction_deg=0,
            wind_gusts_kmh=8, precipitation_mm=0,
            temperature_c=28, cloud_cover_pct=0,
        )
        result = compute_risk(marine, weather)
        assert len(result.advisory) > 0

    def test_no_hazards_message_when_all_clear(self):
        from services.risk_engine import compute_risk
        marine = MarineData(wave_height_m=0.3)
        weather = WeatherData(
            wind_speed_kmh=5, wind_direction_deg=0,
            wind_gusts_kmh=8, precipitation_mm=0,
            temperature_c=28, cloud_cover_pct=0,
        )
        result = compute_risk(marine, weather)
        assert "No significant hazards" in result.factors[0]
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
cd marine-service
pytest tests/test_risk_engine.py -v
```

Expected: `ImportError` on `services.risk_engine` (file doesn't exist yet in new location).

- [ ] **Step 3: Create services/risk_engine.py**

Create `marine-service/services/risk_engine.py`:

```python
"""
Marine risk computation engine — DB-backed thresholds.

Thresholds are loaded from the DB on first call and cached in memory for the
process lifetime. A server restart is required after admin edits to RiskThreshold
or RiskConfig rows.
"""

import threading

from services.models import MarineData, RiskAssessment, RiskLevel, WeatherData

_cache: dict = {}
_lock = threading.Lock()


def _load_thresholds() -> dict:
    with _lock:
        if _cache:
            return _cache
        from conditions.models import RiskConfig, RiskThreshold

        wave_rows = RiskThreshold.objects.filter(parameter="WAVE").order_by("order")
        wind_rows = RiskThreshold.objects.filter(parameter="WIND").order_by("order")
        config = RiskConfig.objects.first()

        if config is None:
            raise RuntimeError(
                "RiskConfig row not found. "
                "Run migrations (python manage.py migrate) to seed the default configuration."
            )

        _cache["wave"] = [(r.upper_bound, r.score_points) for r in wave_rows]
        _cache["wind"] = [(r.upper_bound, r.score_points) for r in wind_rows]
        _cache["config"] = config
        return _cache


def _score_from_table(value: float, table: list[tuple[float, int]]) -> int:
    for upper, points in table:
        if value <= upper:
            return points
    return table[-1][1]


def compute_risk(marine: MarineData, weather: WeatherData) -> RiskAssessment:
    thresholds = _load_thresholds()
    config = thresholds["config"]

    score = 0
    factors: list[str] = []

    wave = marine.wave_height_m or 0.0
    wave_pts = _score_from_table(wave, thresholds["wave"])
    score += wave_pts
    if wave_pts > 0:
        factors.append(f"Wave height {wave:.1f} m")

    wind = weather.wind_speed_kmh
    wind_pts = _score_from_table(wind, thresholds["wind"])
    score += wind_pts
    if wind_pts > 0:
        factors.append(f"Wind {wind:.0f} km/h")

    if weather.wind_gusts_kmh > config.gust_threshold_kmh:
        score += 1
        factors.append(f"Gusts {weather.wind_gusts_kmh:.0f} km/h")

    if weather.precipitation_mm > config.heavy_rain_mm_h:
        score += 1
        factors.append(f"Heavy rain {weather.precipitation_mm:.1f} mm/h")

    score = min(score, 10)

    if score <= config.safe_max_score:
        level = RiskLevel.SAFE
        advisory = (
            "Sea conditions are safe for fishing. "
            "Stay alert for sudden weather changes and monitor PAGASA bulletins."
        )
    elif score <= config.caution_max_score:
        level = RiskLevel.CAUTION
        advisory = (
            "Rough seas expected. Exercise caution. "
            "Small vessels are advised to stay within 15 km of shore "
            "and avoid going out alone."
        )
    else:
        level = RiskLevel.UNSAFE
        advisory = (
            "Dangerous sea conditions. Fishing trips are NOT recommended. "
            "Follow all PAGASA advisories and local coast guard instructions."
        )

    return RiskAssessment(
        level=level,
        score=score,
        factors=factors if factors else ["No significant hazards detected"],
        advisory=advisory,
    )
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
cd marine-service
pytest tests/test_risk_engine.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add marine-service/services/risk_engine.py marine-service/tests/test_risk_engine.py
git commit -m "feat(marine): rewrite risk_engine with DB-backed thresholds"
```

---

## Task 7: Authentication

**Files:**
- Create: `marine-service/conditions/authentication.py`
- Create: `marine-service/tests/test_authentication.py`

- [ ] **Step 1: Write failing authentication tests**

Create `marine-service/tests/test_authentication.py`:

```python
from django.test import TestCase, RequestFactory
from unittest.mock import MagicMock


class TestApiKeyAuthentication(TestCase):
    def setUp(self):
        from conditions.authentication import ApiKeyAuthentication
        self.auth = ApiKeyAuthentication()
        self.factory = RequestFactory()

    def _make_request(self, key=None):
        request = self.factory.get("/api/conditions")
        if key:
            request.META["HTTP_X_API_KEY"] = key
        return request

    def test_valid_key_returns_auth_tuple(self):
        from django.test import override_settings
        with override_settings(MARINE_API_KEY="test-key"):
            from rest_framework.request import Request
            request = self._make_request(key="test-key")
            drf_request = Request(request)
            result = self.auth.authenticate(drf_request)
        assert result is not None
        assert result[0] is None
        assert result[1] == "test-key"

    def test_missing_key_returns_none(self):
        from rest_framework.request import Request
        request = self._make_request()
        drf_request = Request(request)
        result = self.auth.authenticate(drf_request)
        assert result is None

    def test_wrong_key_raises_authentication_failed(self):
        from django.test import override_settings
        from rest_framework.exceptions import AuthenticationFailed
        with override_settings(MARINE_API_KEY="correct-key"):
            from rest_framework.request import Request
            request = self._make_request(key="wrong-key")
            drf_request = Request(request)
            with self.assertRaises(AuthenticationFailed):
                self.auth.authenticate(drf_request)


class TestHasValidApiKey(TestCase):
    def test_authenticated_request_is_permitted(self):
        from conditions.authentication import HasValidApiKey
        perm = HasValidApiKey()
        request = MagicMock()
        request.auth = "some-key"
        assert perm.has_permission(request, None) is True

    def test_unauthenticated_request_is_denied(self):
        from conditions.authentication import HasValidApiKey
        perm = HasValidApiKey()
        request = MagicMock()
        request.auth = None
        assert perm.has_permission(request, None) is False
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
cd marine-service
pytest tests/test_authentication.py -v
```

Expected: `ImportError: cannot import name 'ApiKeyAuthentication'`

- [ ] **Step 3: Create conditions/authentication.py**

Create `marine-service/conditions/authentication.py`:

```python
import hmac

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission


class ApiKeyAuthentication(BaseAuthentication):
    """
    Service-to-service API key authentication via X-API-Key header.
    Returns (None, key) on success — no Django User involved.
    Returns None if header is absent (defers to next authenticator).
    Raises AuthenticationFailed if header is present but wrong.
    """

    def authenticate(self, request):
        key = request.META.get("HTTP_X_API_KEY")
        if key is None:
            return None
        expected = settings.MARINE_API_KEY
        if not hmac.compare_digest(key, expected):
            raise AuthenticationFailed("Invalid API key.")
        return (None, key)

    def authenticate_header(self, request):
        return "X-API-Key"


class HasValidApiKey(BasePermission):
    """
    Grants access if request.auth is set (i.e., ApiKeyAuthentication succeeded).
    Use instead of IsAuthenticated for API-key-only endpoints.
    """

    def has_permission(self, request, view):
        return request.auth is not None
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
cd marine-service
pytest tests/test_authentication.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add marine-service/conditions/authentication.py marine-service/tests/test_authentication.py
git commit -m "feat(marine): add ApiKeyAuthentication and HasValidApiKey"
```

---

## Task 8: DRF Serializers

**Files:**
- Create: `marine-service/conditions/serializers.py`

Serializers handle converting Pydantic objects to JSON-serializable dicts. Since our service layer returns Pydantic models (not Django ORM instances), we use `Serializer` (not `ModelSerializer`). Serializer correctness is primarily verified by `tests/test_views.py` (Task 9) which exercises the full view→serializer→response path. Task 8 adds one explicit roundtrip test to verify the serializer chain before views exist.

- [ ] **Step 1: Write a failing serializer roundtrip test**

Create `marine-service/tests/test_serializers.py`:

```python
from django.test import TestCase
from datetime import datetime, timezone
from services.models import (
    FishingZone, MarineData, WeatherData, RiskAssessment, RiskLevel, ZoneConditions
)


class TestZoneConditionsSerializer(TestCase):
    def test_serializes_zone_conditions_to_dict(self):
        from conditions.serializers import ZoneConditionsSerializer
        zc = ZoneConditions(
            zone=FishingZone(id="agoo", name="Agoo", lat=16.32, lng=120.22, region="La Union"),
            timestamp=datetime(2026, 4, 5, 10, 0, tzinfo=timezone.utc),
            marine=MarineData(wave_height_m=0.5),
            weather=WeatherData(
                wind_speed_kmh=10, wind_direction_deg=180,
                wind_gusts_kmh=15, precipitation_mm=0,
                temperature_c=28, cloud_cover_pct=20,
            ),
            risk=RiskAssessment(
                level=RiskLevel.SAFE, score=0,
                factors=["No significant hazards detected"],
                advisory="Safe.",
            ),
        )
        data = ZoneConditionsSerializer(zc).data
        assert data["zone"]["id"] == "agoo"
        assert data["risk"]["level"] == "SAFE"
        assert data["marine"]["wave_height_m"] == 0.5
        assert data["data_source"] == "Open-Meteo"
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd marine-service
pytest tests/test_serializers.py -v
```

Expected: `ImportError` — `conditions.serializers` not created yet.

- [ ] **Step 3: Create conditions/serializers.py**

Create `marine-service/conditions/serializers.py`:

```python
from rest_framework import serializers


class FishingZoneSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    region = serializers.CharField()


class MarineDataSerializer(serializers.Serializer):
    wave_height_m = serializers.FloatField(allow_null=True)
    swell_height_m = serializers.FloatField(allow_null=True)
    swell_period_s = serializers.FloatField(allow_null=True)
    swell_direction_deg = serializers.FloatField(allow_null=True)


class WeatherDataSerializer(serializers.Serializer):
    wind_speed_kmh = serializers.FloatField()
    wind_direction_deg = serializers.FloatField()
    wind_gusts_kmh = serializers.FloatField()
    precipitation_mm = serializers.FloatField()
    temperature_c = serializers.FloatField()
    cloud_cover_pct = serializers.FloatField()


class RiskAssessmentSerializer(serializers.Serializer):
    level = serializers.CharField()
    score = serializers.IntegerField()
    factors = serializers.ListField(child=serializers.CharField())
    advisory = serializers.CharField()


class ZoneConditionsSerializer(serializers.Serializer):
    zone = FishingZoneSerializer()
    timestamp = serializers.DateTimeField()
    marine = MarineDataSerializer()
    weather = WeatherDataSerializer()
    risk = RiskAssessmentSerializer()
    data_source = serializers.CharField()


class DailyForecastSummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    max_wave_height_m = serializers.FloatField(allow_null=True)
    avg_wind_speed_kmh = serializers.FloatField()
    max_wind_speed_kmh = serializers.FloatField()
    max_wind_gusts_kmh = serializers.FloatField()
    total_precipitation_mm = serializers.FloatField()
    dominant_risk = serializers.CharField()
    safe_hours = serializers.IntegerField()
    caution_hours = serializers.IntegerField()
    unsafe_hours = serializers.IntegerField()


class HourlyForecastPointSerializer(serializers.Serializer):
    time = serializers.DateTimeField()
    marine = MarineDataSerializer()
    weather = WeatherDataSerializer()
    risk = RiskAssessmentSerializer()


class ZoneForecastSerializer(serializers.Serializer):
    zone = FishingZoneSerializer()
    generated_at = serializers.DateTimeField()
    daily_summary = DailyForecastSummarySerializer(many=True)
    hourly = HourlyForecastPointSerializer(many=True)


class AllConditionsSerializer(serializers.Serializer):
    zones = ZoneConditionsSerializer(many=True)
    generated_at = serializers.DateTimeField()


class HealthResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    version = serializers.CharField()
    timestamp = serializers.DateTimeField()
    cache_entries = serializers.IntegerField()
```

- [ ] **Step 4: Run serializer test — verify it PASSES**

```bash
cd marine-service
pytest tests/test_serializers.py -v
```

Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add marine-service/conditions/serializers.py marine-service/tests/test_serializers.py
git commit -m "feat(marine): add DRF serializers for all response shapes"
```

---

## Task 9: Views, URLs, and health_urls

> **Note on AllConditions response shape:** The spec's code example stores the raw `zones_data` list in cache and returns `AllConditionsSerializer(cached_all, many=True)`. This plan intentionally wraps `zones_data` in an object with `.zones` and `.generated_at` fields to produce the correct `{"zones": [...], "generated_at": "..."}` envelope that matches `AllConditionsResponse`. Both the cache-hit and cache-miss paths use the same wrapper object, so the response shape is consistent.

**Files:**
- Create: `marine-service/conditions/views.py`
- Create: `marine-service/conditions/urls.py`
- Create: `marine-service/conditions/health_urls.py`
- Create: `marine-service/tests/test_views.py`

- [ ] **Step 1: Write failing view tests**

Create `marine-service/tests/test_views.py`:

```python
import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from services.models import (
    FishingZone, MarineData, WeatherData, RiskAssessment, RiskLevel, ZoneConditions
)


def _make_zone_conditions(zone_id="agoo"):
    zone = FishingZone(id=zone_id, name="Agoo", lat=16.32, lng=120.22, region="La Union")
    marine = MarineData(wave_height_m=0.5)
    weather = WeatherData(
        wind_speed_kmh=10, wind_direction_deg=180,
        wind_gusts_kmh=15, precipitation_mm=0,
        temperature_c=28, cloud_cover_pct=20,
    )
    risk = RiskAssessment(
        level=RiskLevel.SAFE, score=0,
        factors=["No significant hazards detected"],
        advisory="Sea conditions are safe for fishing.",
    )
    return ZoneConditions(
        zone=zone, timestamp=datetime.now(timezone.utc),
        marine=marine, weather=weather, risk=risk,
    )


@override_settings(MARINE_API_KEY="test-key")
class TestHealthView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_returns_200_without_auth(self):
        response = self.client.get("/api/health")
        assert response.status_code == 200

    def test_health_response_shape(self):
        response = self.client.get("/api/health")
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "timestamp" in data
        assert "cache_entries" in data
        assert data["status"] == "ok"


@override_settings(MARINE_API_KEY="test-key")
class TestZoneListView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_zones_returns_200_without_auth(self):
        response = self.client.get("/api/conditions/zones")
        assert response.status_code == 200

    def test_zones_returns_only_active_zones(self):
        from conditions.models import FishingZone
        FishingZone.objects.filter(id="agoo").update(is_active=False)
        response = self.client.get("/api/conditions/zones")
        ids = [z["id"] for z in response.json()]
        assert "agoo" not in ids


@override_settings(MARINE_API_KEY="test-key")
class TestAllConditionsView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_requires_api_key(self):
        response = self.client.get("/api/conditions/")
        assert response.status_code == 403

    @patch("conditions.views.open_meteo.fetch_current_conditions")
    def test_returns_conditions_with_valid_key(self, mock_fetch):
        mock_fetch.return_value = _make_zone_conditions()
        self.client.credentials(HTTP_X_API_KEY="test-key")
        response = self.client.get("/api/conditions/")
        assert response.status_code == 200
        data = response.json()
        assert "zones" in data
        assert "generated_at" in data


@override_settings(MARINE_API_KEY="test-key")
class TestZoneConditionsView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_requires_api_key(self):
        response = self.client.get("/api/conditions/agoo")
        assert response.status_code == 403

    @patch("conditions.views.open_meteo.fetch_current_conditions")
    def test_returns_conditions_for_valid_zone(self, mock_fetch):
        mock_fetch.return_value = _make_zone_conditions("agoo")
        self.client.credentials(HTTP_X_API_KEY="test-key")
        response = self.client.get("/api/conditions/agoo")
        assert response.status_code == 200
        data = response.json()
        assert data["zone"]["id"] == "agoo"

    def test_returns_404_for_unknown_zone(self):
        self.client.credentials(HTTP_X_API_KEY="test-key")
        response = self.client.get("/api/conditions/fake_zone")
        assert response.status_code == 404
        assert "fake_zone" in response.json()["detail"]

    @patch("conditions.views.open_meteo.fetch_forecast")
    def test_forecast_url_routes_to_forecast_view(self, mock_fetch):
        """Ensure /agoo/forecast routes to ZoneForecastView, not ZoneConditionsView."""
        from services.models import FishingZone as PydanticZone, ZoneForecast, DailyForecastSummary
        mock_fetch.return_value = ZoneForecast(
            zone=PydanticZone(id="agoo", name="Agoo", lat=16.32, lng=120.22, region="La Union"),
            generated_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
            daily_summary=[],
            hourly=[],
        )
        self.client.credentials(HTTP_X_API_KEY="test-key")
        response = self.client.get("/api/conditions/agoo/forecast")
        assert response.status_code == 200
        data = response.json()
        assert "daily_summary" in data
        assert "hourly" in data
        assert "zone" in data
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
cd marine-service
pytest tests/test_views.py -v
```

Expected: Multiple failures related to missing views/URLs.

- [ ] **Step 3: Create conditions/views.py**

Create `marine-service/conditions/views.py`:

```python
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import httpx
from django.apps import apps
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from cache.ttl_cache import TTLCache
from conditions.authentication import ApiKeyAuthentication, HasValidApiKey
from conditions.models import FishingZone
from conditions.serializers import (
    AllConditionsSerializer,
    HealthResponseSerializer,
    ZoneConditionsSerializer,
    ZoneForecastSerializer,
)
from services import open_meteo

logger = logging.getLogger(__name__)

_cache = TTLCache()


def _get_http_client() -> httpx.Client:
    return apps.get_app_config("conditions").http_client


def _get_zone_or_404(zone_id: str) -> FishingZone:
    zone = FishingZone.objects.filter(pk=zone_id, is_active=True).first()
    if zone is None:
        raise NotFound(
            detail=f"Zone not found: '{zone_id}'. Call GET /api/conditions/zones for valid IDs."
        )
    return zone


def _fetch_zone_safe(zone: FishingZone, client: httpx.Client) -> object:
    cache_key = f"conditions:{zone.id}"
    cached = _cache.get(cache_key)
    if cached:
        return cached
    try:
        result = open_meteo.fetch_current_conditions(zone, client)
        _cache.set(cache_key, result, settings.CONDITIONS_CACHE_TTL)
        return result
    except Exception as exc:
        logger.warning("Failed to fetch zone %s: %s", zone.id, exc)
        return None


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        data = {
            "status": "ok",
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc),
            "cache_entries": _cache.size(),
        }
        return Response(HealthResponseSerializer(data).data)


class ZoneListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from conditions.serializers import FishingZoneSerializer
        zones = FishingZone.objects.filter(is_active=True)
        return Response(FishingZoneSerializer(zones, many=True).data)


class AllConditionsView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request):
        cached_all = _cache.get("conditions:all")
        if cached_all:
            return Response(AllConditionsSerializer(cached_all).data)

        client = _get_http_client()
        zones = list(FishingZone.objects.filter(is_active=True))

        with ThreadPoolExecutor(max_workers=max(len(zones), 1)) as executor:
            futures = [executor.submit(_fetch_zone_safe, zone, client) for zone in zones]
            results = [f.result() for f in futures]

        zones_data = [r for r in results if r is not None]

        if not zones_data:
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_obj = type("AllConditions", (), {
            "zones": zones_data,
            "generated_at": datetime.now(timezone.utc),
        })()
        _cache.set("conditions:all", response_obj, settings.CONDITIONS_CACHE_TTL)
        return Response(AllConditionsSerializer(response_obj).data)


class ZoneConditionsView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request, zone_id):
        zone = _get_zone_or_404(zone_id)
        cache_key = f"conditions:{zone_id}"
        cached = _cache.get(cache_key)
        if cached:
            return Response(ZoneConditionsSerializer(cached).data)

        client = _get_http_client()
        try:
            conditions = open_meteo.fetch_current_conditions(zone, client)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Open-Meteo error for %s: %s", zone_id, exc)
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        _cache.set(cache_key, conditions, settings.CONDITIONS_CACHE_TTL)
        return Response(ZoneConditionsSerializer(conditions).data)


class ZoneForecastView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request, zone_id):
        zone = _get_zone_or_404(zone_id)
        cache_key = f"forecast:{zone_id}"
        cached = _cache.get(cache_key)
        if cached:
            return Response(ZoneForecastSerializer(cached).data)

        client = _get_http_client()
        try:
            forecast = open_meteo.fetch_forecast(zone, client)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Open-Meteo forecast error for %s: %s", zone_id, exc)
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        _cache.set(cache_key, forecast, settings.FORECAST_CACHE_TTL)
        return Response(ZoneForecastSerializer(forecast).data)
```

- [ ] **Step 4: Create conditions/urls.py**

Create `marine-service/conditions/urls.py`:

```python
from django.urls import path
from conditions.views import (
    AllConditionsView,
    ZoneConditionsView,
    ZoneForecastView,
    ZoneListView,
)

urlpatterns = [
    path("zones", ZoneListView.as_view()),
    path("<str:zone_id>/forecast", ZoneForecastView.as_view()),  # MUST be before zone_id
    path("<str:zone_id>", ZoneConditionsView.as_view()),
    path("", AllConditionsView.as_view()),
]
```

- [ ] **Step 5: Create conditions/health_urls.py**

Create `marine-service/conditions/health_urls.py`:

```python
from django.urls import path
from conditions.views import HealthView

urlpatterns = [
    path("health", HealthView.as_view()),
]
```

- [ ] **Step 6: Run view tests — verify they PASS**

```bash
cd marine-service
pytest tests/test_views.py -v
```

Expected: All tests PASS. (The URL-routing test for `forecast` may need the `ConditionsConfig.ready()` to not crash during testing — see next step if it fails with `httpx.Client` errors.)

> **If tests fail with `ConditionsConfig.ready()` / httpx errors during test setup:** Add to `marine_project/settings.py` at the bottom:
> ```python
> # Override in tests to skip httpx.Client creation
> import sys
> if 'pytest' in sys.modules:
>     from unittest.mock import MagicMock
>     # Patch will be applied per-test; AppConfig.ready() still runs
> ```
> More practically: if `ConditionsConfig.ready()` errors during tests because there's no network, the fix is to mock the client in test setup or check if the test DB migration includes seeds. The `test_views.py` mocks `open_meteo.fetch_current_conditions` already, so no real HTTP calls should occur.

- [ ] **Step 7: Commit**

```bash
git add marine-service/conditions/views.py marine-service/conditions/urls.py \
        marine-service/conditions/health_urls.py marine-service/tests/test_views.py
git commit -m "feat(marine): add DRF views and URL routing"
```

---

## Task 10: Admin registration

**Files:**
- Create: `marine-service/conditions/admin.py`

- [ ] **Step 1: Create conditions/admin.py**

Create `marine-service/conditions/admin.py`:

```python
from django.contrib import admin
from conditions.models import FishingZone, RiskConfig, RiskThreshold


@admin.register(FishingZone)
class FishingZoneAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "region", "lat", "lng", "is_active"]
    list_filter = ["region", "is_active"]
    search_fields = ["id", "name"]
    list_editable = ["is_active"]


@admin.register(RiskThreshold)
class RiskThresholdAdmin(admin.ModelAdmin):
    list_display = ["parameter", "order", "upper_bound", "score_points"]
    list_filter = ["parameter"]
    ordering = ["parameter", "order"]


@admin.register(RiskConfig)
class RiskConfigAdmin(admin.ModelAdmin):
    list_display = [
        "safe_max_score", "caution_max_score",
        "gust_threshold_kmh", "heavy_rain_mm_h", "updated_at",
    ]
```

- [ ] **Step 2: Verify admin loads**

```bash
cd marine-service
python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add marine-service/conditions/admin.py
git commit -m "feat(marine): register models in Django admin"
```

---

## Task 11: Delete app/ directory and run full test suite

**Files:**
- Delete: `marine-service/app/` (entire directory)

- [ ] **Step 1: Run full test suite first**

```bash
cd marine-service
pytest tests/ -v
```

Expected: All tests PASS before deleting anything.

- [ ] **Step 2: Delete app/ directory**

```bash
rm -rf marine-service/app/
```

- [ ] **Step 3: Run full test suite again**

```bash
cd marine-service
pytest tests/ -v
```

Expected: All tests still PASS (nothing should import from `app/` anymore).

- [ ] **Step 4: Commit**

```bash
git add -A marine-service/app/
git commit -m "chore(marine): remove FastAPI app/ directory"
```

---

## Task 12: Smoke test all 5 endpoints

This task verifies the running server works end-to-end with a real database and real HTTP requests to Open-Meteo.

- [ ] **Step 1: Create Django superuser and start server**

```bash
cd marine-service
python manage.py migrate
python manage.py createsuperuser  # follow prompts
python manage.py runserver 0.0.0.0:8081
```

- [ ] **Step 2: Test health endpoint (no auth)**

```bash
curl -s http://localhost:8081/api/health | python -m json.tool
```

Expected:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "...",
  "cache_entries": 0
}
```

- [ ] **Step 3: Test zones endpoint (no auth)**

```bash
curl -s http://localhost:8081/api/conditions/zones | python -m json.tool
```

Expected: JSON array of 12 zone objects, each with `id`, `name`, `lat`, `lng`, `region`.

- [ ] **Step 4: Test all conditions (with auth)**

```bash
curl -s -H "X-API-Key: dev-marine-key-change-in-prod" \
  http://localhost:8081/api/conditions/ | python -m json.tool
```

Expected: JSON with `zones` array and `generated_at`. Each zone has `risk.level` of `SAFE`, `CAUTION`, or `UNSAFE`.

- [ ] **Step 5: Test single zone conditions (with auth)**

```bash
curl -s -H "X-API-Key: dev-marine-key-change-in-prod" \
  http://localhost:8081/api/conditions/agoo | python -m json.tool
```

Expected: Single zone object with `zone.id == "agoo"` and `risk` object.

- [ ] **Step 6: Test forecast (with auth)**

```bash
curl -s -H "X-API-Key: dev-marine-key-change-in-prod" \
  http://localhost:8081/api/conditions/agoo/forecast | python -m json.tool
```

Expected: JSON with `daily_summary` (7 items) and `hourly` arrays.

- [ ] **Step 7: Test auth rejection**

```bash
curl -s http://localhost:8081/api/conditions/ | python -m json.tool
```

Expected: HTTP 403 with `{"detail": "..."}`

- [ ] **Step 8: Test 404 for unknown zone**

```bash
curl -s -H "X-API-Key: dev-marine-key-change-in-prod" \
  http://localhost:8081/api/conditions/fake_zone | python -m json.tool
```

Expected: HTTP 404 with `{"detail": "Zone not found: 'fake_zone'. Call GET /api/conditions/zones for valid IDs."}`

- [ ] **Step 9: Verify Django admin is accessible**

Open `http://localhost:8081/admin/` in a browser. Log in with the superuser. Verify you can see FishingZone (12 rows), RiskThreshold (8 rows), RiskConfig (1 row).

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat(marine): complete Django + DRF refactor — all endpoints smoke tested"
```

---

## Quick Reference

```bash
# Run all tests
cd marine-service && pytest tests/ -v

# Start dev server
cd marine-service && python manage.py runserver 0.0.0.0:8081

# Apply migrations
cd marine-service && python manage.py migrate

# Create admin user
cd marine-service && python manage.py createsuperuser

# Django admin UI
http://localhost:8081/admin/
```
