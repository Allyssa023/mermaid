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
