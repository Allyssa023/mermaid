import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import httpx
from django.apps import apps
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from cache.ttl_cache import TTLCache
from conditions.authentication import ApiKeyAuthentication, HasValidApiKey
from conditions.models import FishingZone
from conditions.serializers import (
    AllConditionsSerializer,
    HealthResponseSerializer,
    ZoneConditionsSerializer,
    ZoneForecastSerializer,
)
from services import open_meteo

logger = logging.getLogger(__name__)

_cache = TTLCache()


def _get_http_client() -> httpx.Client:
    return apps.get_app_config("conditions").http_client


def _get_zone_or_404(zone_id: str) -> FishingZone:
    zone = FishingZone.objects.filter(pk=zone_id, is_active=True).first()
    if zone is None:
        raise NotFound(
            detail=f"Zone not found: '{zone_id}'. Call GET /api/conditions/zones for valid IDs."
        )
    return zone


def _fetch_zone_safe(zone: FishingZone, client: httpx.Client) -> object:
    cache_key = f"conditions:{zone.id}"
    cached = _cache.get(cache_key)
    if cached:
        return cached
    try:
        result = open_meteo.fetch_current_conditions(zone, client)
        _cache.set(cache_key, result, settings.CONDITIONS_CACHE_TTL)
        return result
    except Exception as exc:
        logger.warning("Failed to fetch zone %s: %s", zone.id, exc)
        return None


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        data = {
            "status": "ok",
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc),
            "cache_entries": _cache.size(),
        }
        return Response(HealthResponseSerializer(data).data)


class ZoneListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from conditions.serializers import FishingZoneSerializer
        zones = FishingZone.objects.filter(is_active=True)
        return Response(FishingZoneSerializer(zones, many=True).data)


class AllConditionsView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request):
        cached_all = _cache.get("conditions:all")
        if cached_all:
            return Response(AllConditionsSerializer(cached_all).data)

        client = _get_http_client()
        zones = list(FishingZone.objects.filter(is_active=True))

        with ThreadPoolExecutor(max_workers=max(len(zones), 1)) as executor:
            futures = [executor.submit(_fetch_zone_safe, zone, client) for zone in zones]
            results = [f.result() for f in futures]

        zones_data = [r for r in results if r is not None]

        if not zones_data:
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_obj = type("AllConditions", (), {
            "zones": zones_data,
            "generated_at": datetime.now(timezone.utc),
        })()
        _cache.set("conditions:all", response_obj, settings.CONDITIONS_CACHE_TTL)
        return Response(AllConditionsSerializer(response_obj).data)


class ZoneConditionsView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request, zone_id):
        zone = _get_zone_or_404(zone_id)
        cache_key = f"conditions:{zone_id}"
        cached = _cache.get(cache_key)
        if cached:
            return Response(ZoneConditionsSerializer(cached).data)

        client = _get_http_client()
        try:
            conditions = open_meteo.fetch_current_conditions(zone, client)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Open-Meteo error for %s: %s", zone_id, exc)
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        _cache.set(cache_key, conditions, settings.CONDITIONS_CACHE_TTL)
        return Response(ZoneConditionsSerializer(conditions).data)


class ZoneForecastView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request, zone_id):
        zone = _get_zone_or_404(zone_id)
        cache_key = f"forecast:{zone_id}"
        cached = _cache.get(cache_key)
        if cached:
            return Response(ZoneForecastSerializer(cached).data)

        client = _get_http_client()
        try:
            forecast = open_meteo.fetch_forecast(zone, client)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.error("Open-Meteo forecast error for %s: %s", zone_id, exc)
            return Response(
                {"detail": "Marine data service temporarily unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        _cache.set(cache_key, forecast, settings.FORECAST_CACHE_TTL)
        return Response(ZoneForecastSerializer(forecast).data)
