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
