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
    wave_height_m: Optional[float] = Field(None, description="Significant wave height (m)")
    swell_height_m: Optional[float] = Field(None, description="Swell wave height (m)")
    swell_period_s: Optional[float] = Field(None, description="Swell wave period (s)")
    swell_direction_deg: Optional[float] = Field(None, description="Swell wave direction (°)")


class WeatherData(BaseModel):
    wind_speed_kmh: float = Field(..., description="Wind speed at 10 m (km/h)")
    wind_direction_deg: float = Field(..., description="Wind direction (°)")
    wind_gusts_kmh: float = Field(..., description="Wind gusts at 10 m (km/h)")
    precipitation_mm: float = Field(..., description="Precipitation (mm/h)")
    temperature_c: float = Field(..., description="Air temperature (°C)")
    cloud_cover_pct: float = Field(..., description="Cloud cover (%)")


class RiskAssessment(BaseModel):
    level: RiskLevel
    score: int = Field(..., ge=0, le=10, description="Composite risk score (0–10)")
    factors: list[str] = Field(default_factory=list, description="Contributing hazard factors")
    advisory: str = Field(..., description="Plain-language safety advisory")


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
