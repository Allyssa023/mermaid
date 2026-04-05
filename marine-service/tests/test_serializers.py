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
