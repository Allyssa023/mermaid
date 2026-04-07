"""
Open-Meteo API client — synchronous version.

Uses the free Open-Meteo Marine API and Weather API (no API key required).
Marine + weather data for the same location are requested concurrently via
ThreadPoolExecutor(max_workers=2).
"""

import logging
import time
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

    marine_data = get_marine()
    time.sleep(0.25)  # Pause to respect Open-Meteo free tier burst limits
    weather_data = get_weather()
    time.sleep(0.25)

    return marine_data, weather_data


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
