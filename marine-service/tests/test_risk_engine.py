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
