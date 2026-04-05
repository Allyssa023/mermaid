from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    UNSAFE = "UNSAFE"


class FishingZone(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    region: str


class MarineData(BaseModel):
    wave_height_m: Optional[float] = Field(None)
    swell_height_m: Optional[float] = Field(None)
    swell_period_s: Optional[float] = Field(None)
    swell_direction_deg: Optional[float] = Field(None)


class WeatherData(BaseModel):
    wind_speed_kmh: float
    wind_direction_deg: float
    wind_gusts_kmh: float
    precipitation_mm: float
    temperature_c: float
    cloud_cover_pct: float


class RiskAssessment(BaseModel):
    level: RiskLevel
    score: int = Field(..., ge=0, le=10)
    factors: list[str] = Field(default_factory=list)
    advisory: str


class ZoneConditions(BaseModel):
    zone: FishingZone
    timestamp: datetime
    marine: MarineData
    weather: WeatherData
    risk: RiskAssessment
    data_source: str = "Open-Meteo"


class HourlyForecastPoint(BaseModel):
    time: datetime
    marine: MarineData
    weather: WeatherData
    risk: RiskAssessment


class DailyForecastSummary(BaseModel):
    date: date
    max_wave_height_m: Optional[float]
    avg_wind_speed_kmh: float
    max_wind_speed_kmh: float
    max_wind_gusts_kmh: float
    total_precipitation_mm: float
    dominant_risk: RiskLevel
    safe_hours: int
    caution_hours: int
    unsafe_hours: int


class ZoneForecast(BaseModel):
    zone: FishingZone
    generated_at: datetime
    daily_summary: list[DailyForecastSummary]
    hourly: list[HourlyForecastPoint]


class AllConditionsResponse(BaseModel):
    zones: list[ZoneConditions]
    generated_at: datetime


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    cache_entries: int
