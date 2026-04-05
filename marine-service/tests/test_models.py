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
