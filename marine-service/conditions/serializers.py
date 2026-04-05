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
    level = serializers.CharField(source="level.value")
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
    dominant_risk = serializers.CharField(source="dominant_risk.value")
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
