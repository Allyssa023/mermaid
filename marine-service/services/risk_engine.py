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
