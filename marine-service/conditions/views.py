import logging
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
from services import open_meteo, snapshot_store

logger = logging.getLogger(__name__)

# Shared in-memory cache — also written by the background scheduler.
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


def _resolve_zone_conditions(zone_id: str):
    """Return cached ZoneConditions, falling back to the DB snapshot. Never fetches live."""
    data = _cache.get(f"conditions:{zone_id}")
    if data is not None:
        return data
    data = snapshot_store.load_snapshot(zone_id)
    if data is not None:
        _cache.set(f"conditions:{zone_id}", data, settings.CONDITIONS_CACHE_TTL)
    return data


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
        # Fast path: full aggregate already cached.
        cached_all = _cache.get("conditions:all")
        if cached_all:
            return Response(AllConditionsSerializer(cached_all).data)

        # Assemble from per-zone cache / DB snapshots (never fetches live).
        zones = list(FishingZone.objects.filter(is_active=True))
        zones_data = [d for d in (_resolve_zone_conditions(z.id) for z in zones) if d is not None]

        if not zones_data:
            return Response(
                {"detail": "Marine data service temporarily unavailable — no cached data yet"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_obj = type("AllConditions", (), {
            "zones": zones_data,
            "generated_at": datetime.now(timezone.utc),
        })()
        if len(zones_data) == len(zones):
            _cache.set("conditions:all", response_obj, settings.CONDITIONS_CACHE_TTL)
        return Response(AllConditionsSerializer(response_obj).data)


class ZoneConditionsView(APIView):
    authentication_classes = [ApiKeyAuthentication]
    permission_classes = [HasValidApiKey]

    def get(self, request, zone_id):
        _get_zone_or_404(zone_id)
        data = _resolve_zone_conditions(zone_id)
        if data is None:
            return Response(
                {"detail": f"No data available for zone '{zone_id}' yet — try again shortly"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(ZoneConditionsSerializer(data).data)


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
