"""
Marine risk computation engine.

Risk levels follow PAGASA (Philippine Atmospheric, Geophysical and
Astronomical Services Administration) severity thresholds adapted for
small-scale fishermen in Philippine coastal waters.

  SAFE    — Green  — Normal fishing conditions
  CAUTION — Yellow — Exercise care; small vessels stay near shore
  UNSAFE  — Red    — Do NOT go out; dangerous sea conditions
"""

from app.models.marine import MarineData, RiskAssessment, RiskLevel, WeatherData

# --- Scoring tables --------------------------------------------------------
# Each entry: (upper_bound_exclusive, points)
# Points accumulate; final score clamped to [0, 10].

_WAVE_SCORES: list[tuple[float, int]] = [
    (1.25, 0),          # ≤ 1.25 m  — calm (0–4 ft)
    (2.50, 3),          # ≤ 2.50 m  — rough (4–8 ft)
    (4.00, 6),          # ≤ 4.00 m  — very rough (8–13 ft)
    (float("inf"), 9),  # > 4.00 m  — extremely rough
]

_WIND_SCORES: list[tuple[float, int]] = [
    (30,  0),           # ≤ 30 km/h  — light breeze
    (60,  2),           # ≤ 60 km/h  — PAGASA Signal #1 range
    (100, 5),           # ≤ 100 km/h — PAGASA Signal #2 range
    (float("inf"), 8),  # > 100 km/h — Signal #3+ / typhoon
]

_GUST_THRESHOLD_KMH = 60    # gusts above this add +1
_HEAVY_RAIN_MM_H = 10       # precipitation above this adds +1

# --- Level thresholds ------------------------------------------------------
_SAFE_MAX_SCORE = 2
_CAUTION_MAX_SCORE = 5


def _score_from_table(value: float, table: list[tuple[float, int]]) -> int:
    for upper, points in table:
        if value <= upper:
            return points
    return table[-1][1]


def compute_risk(marine: MarineData, weather: WeatherData) -> RiskAssessment:
    """Compute a composite risk score and return a full RiskAssessment."""
    score = 0
    factors: list[str] = []

    # Wave height
    wave = marine.wave_height_m or 0.0
    wave_pts = _score_from_table(wave, _WAVE_SCORES)
    score += wave_pts
    if wave_pts > 0:
        factors.append(f"Wave height {wave:.1f} m")

    # Wind speed
    wind = weather.wind_speed_kmh
    wind_pts = _score_from_table(wind, _WIND_SCORES)
    score += wind_pts
    if wind_pts > 0:
        factors.append(f"Wind {wind:.0f} km/h")

    # Gust bonus
    if weather.wind_gusts_kmh > _GUST_THRESHOLD_KMH:
        score += 1
        factors.append(f"Gusts {weather.wind_gusts_kmh:.0f} km/h")

    # Heavy precipitation bonus
    if weather.precipitation_mm > _HEAVY_RAIN_MM_H:
        score += 1
        factors.append(f"Heavy rain {weather.precipitation_mm:.1f} mm/h")

    score = min(score, 10)

    if score <= _SAFE_MAX_SCORE:
        level = RiskLevel.SAFE
        advisory = (
            "Sea conditions are safe for fishing. "
            "Stay alert for sudden weather changes and monitor PAGASA bulletins."
        )
    elif score <= _CAUTION_MAX_SCORE:
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
