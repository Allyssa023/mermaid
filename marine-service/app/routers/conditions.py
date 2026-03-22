"""
Marine conditions endpoints.

All data endpoints require the X-API-Key header (service-to-service auth).
The /zones listing is intentionally public — it returns only static metadata.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.cache.ttl_cache import TTLCache
from app.config import get_settings
from app.dependencies import get_cache, get_http_client, require_api_key
from app.models.marine import (
    AllConditionsResponse,
    FishingZone,
    ZoneConditions,
    ZoneForecast,
)
from app.services import open_meteo
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Conditions"])

# ---------------------------------------------------------------------------
# Philippine fishing zones — static reference data
# ---------------------------------------------------------------------------
ZONES: dict[str, FishingZone] = {
    "manila_bay": FishingZone(
        id="manila_bay", name="Manila Bay", lat=14.50, lng=120.80, region="Luzon"
    ),
    "visayan_sea": FishingZone(
        id="visayan_sea", name="Visayan Sea", lat=11.50, lng=123.50, region="Visayas"
    ),
    "sulu_sea": FishingZone(
        id="sulu_sea", name="Sulu Sea", lat=8.50, lng=120.50, region="Mindanao"
    ),
    "sibuyan_sea": FishingZone(
        id="sibuyan_sea", name="Sibuyan Sea", lat=12.50, lng=122.50, region="Luzon"
    ),
    "south_china_sea": FishingZone(
        id="south_china_sea",
        name="South China Sea",
        lat=14.00,
        lng=117.00,
        region="Western Philippines",
    ),
    "pacific_coast": FishingZone(
        id="pacific_coast",
        name="Pacific Coast",
        lat=13.00,
        lng=126.00,
        region="Eastern Philippines",
    ),
    "leyte_gulf": FishingZone(
        id="leyte_gulf", name="Leyte Gulf", lat=10.50, lng=125.50, region="Visayas"
    ),
    "la_union": FishingZone(
        id="la_union", name="La Union Coast", lat=16.62, lng=120.10, region="Ilocos Region"
    ),
}


def _get_zone_or_404(zone_id: str) -> FishingZone:
    zone = ZONES.get(zone_id)
    if zone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone not found: '{zone_id}'. Call GET /api/conditions/zones for valid IDs.",
        )
    return zone


@asynccontextmanager
async def _open_meteo_errors(zone_id: str):
    try:
        yield
    except httpx.HTTPStatusError as exc:
        logger.error("Open-Meteo HTTP error for %s: %s", zone_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marine data service temporarily unavailable",
        )
    except httpx.RequestError as exc:
        logger.error("Open-Meteo request error for %s: %s", zone_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marine data service temporarily unavailable",
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get(
    "/zones",
    response_model=list[FishingZone],
    summary="List all fishing zones",
    description="Returns static zone metadata. No authentication required.",
)
async def list_zones() -> list[FishingZone]:
    return list(ZONES.values())


@router.get(
    "",
    response_model=AllConditionsResponse,
    summary="Current conditions — all zones",
    dependencies=[Depends(require_api_key)],
)
async def get_all_conditions(
    client: httpx.AsyncClient = Depends(get_http_client),
    cache: TTLCache = Depends(get_cache),
) -> AllConditionsResponse:
    cache_key = "conditions:all"
    cached: AllConditionsResponse | None = cache.get(cache_key)
    if cached:
        return cached

    tasks = [
        open_meteo.fetch_current_conditions(zone, client)
        for zone in ZONES.values()
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    zones_data: list[ZoneConditions] = []
    for zone, r in zip(ZONES.values(), results):  # gather preserves task order
        if isinstance(r, Exception):
            logger.warning("Failed to fetch zone %s: %s", zone.id, r)
        else:
            cache.set(f"conditions:{zone.id}", r, get_settings().conditions_cache_ttl)
            zones_data.append(r)

    if not zones_data:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marine data service temporarily unavailable",
        )

    response = AllConditionsResponse(
        zones=zones_data,
        generated_at=datetime.now(timezone.utc),
    )
    cache.set(cache_key, response, get_settings().conditions_cache_ttl)
    return response


@router.get(
    "/{zone_id}",
    response_model=ZoneConditions,
    summary="Current conditions — single zone",
    dependencies=[Depends(require_api_key)],
)
async def get_zone_conditions(
    zone_id: str,
    client: httpx.AsyncClient = Depends(get_http_client),
    cache: TTLCache = Depends(get_cache),
) -> ZoneConditions:
    zone = _get_zone_or_404(zone_id)

    cache_key = f"conditions:{zone_id}"
    cached: ZoneConditions | None = cache.get(cache_key)
    if cached:
        return cached

    async with _open_meteo_errors(zone_id):
        conditions = await open_meteo.fetch_current_conditions(zone, client)

    cache.set(cache_key, conditions, get_settings().conditions_cache_ttl)
    return conditions


@router.get(
    "/{zone_id}/forecast",
    response_model=ZoneForecast,
    summary="7-day forecast — single zone",
    dependencies=[Depends(require_api_key)],
)
async def get_zone_forecast(
    zone_id: str,
    client: httpx.AsyncClient = Depends(get_http_client),
    cache: TTLCache = Depends(get_cache),
) -> ZoneForecast:
    zone = _get_zone_or_404(zone_id)

    cache_key = f"forecast:{zone_id}"
    cached: ZoneForecast | None = cache.get(cache_key)
    if cached:
        return cached

    async with _open_meteo_errors(zone_id):
        forecast = await open_meteo.fetch_forecast(zone, client)

    cache.set(cache_key, forecast, get_settings().forecast_cache_ttl)
    return forecast
