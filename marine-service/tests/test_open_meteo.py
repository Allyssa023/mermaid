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
