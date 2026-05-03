"""
Background scheduler for proactive Open-Meteo data refresh.

Decouples API fetching from the request path: every SCHEDULER_INTERVAL_MINUTES
minutes (default 10), all active fishing zones are refreshed sequentially with a
small inter-zone throttle. Successful fetches update both the in-memory cache and
the DB snapshot. Failed zones are retried on the next tick (handled by open_meteo's
internal retry); a per-zone circuit breaker trips after 5 consecutive failures and
suspends that zone for 3 ticks (~30 min) before retrying.
"""

import logging
import time
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

_CIRCUIT_THRESHOLD = 5   # consecutive failures to trip
_CIRCUIT_SKIP_TICKS = 3  # ticks to sit out when tripped
_INTER_ZONE_DELAY_S = 0.25

_consecutive_failures: dict[str, int] = {}
_skip_ticks: dict[str, int] = {}

scheduler = BackgroundScheduler(timezone="UTC")


def _refresh_all_zones() -> None:
    import django.db
    from django.apps import apps
    from django.conf import settings
    from conditions.models import FishingZone
    from services import open_meteo, snapshot_store

    # Release stale DB connections acquired by earlier ticks in this thread.
    django.db.close_old_connections()

    # Resolve the shared in-memory cache from the views module.
    # Import is deferred to avoid a circular dependency at module load time.
    from conditions.views import _cache

    client = apps.get_app_config("conditions").http_client
    zones = list(FishingZone.objects.filter(is_active=True))

    for zone in zones:
        zid = zone.id

        # Circuit breaker: skip if tripped
        if _skip_ticks.get(zid, 0) > 0:
            _skip_ticks[zid] -= 1
            logger.info(
                "Circuit breaker active for zone %s — %d tick(s) remaining",
                zid, _skip_ticks[zid],
            )
            time.sleep(_INTER_ZONE_DELAY_S)
            continue

        try:
            conditions = open_meteo.fetch_current_conditions(zone, client)
            _consecutive_failures[zid] = 0
            _cache.set(f"conditions:{zid}", conditions, settings.CONDITIONS_CACHE_TTL)
            snapshot_store.save_snapshot(zid, conditions)
            logger.debug("Refreshed zone %s", zid)
        except Exception as exc:
            failures = _consecutive_failures.get(zid, 0) + 1
            _consecutive_failures[zid] = failures
            logger.warning(
                "Zone %s refresh failed (%d consecutive failure(s)): %s",
                zid, failures, exc,
            )
            if failures >= _CIRCUIT_THRESHOLD:
                _skip_ticks[zid] = _CIRCUIT_SKIP_TICKS
                _consecutive_failures[zid] = 0
                logger.error(
                    "Circuit breaker tripped for zone %s — pausing for %d ticks",
                    zid, _CIRCUIT_SKIP_TICKS,
                )

        time.sleep(_INTER_ZONE_DELAY_S)

    # Invalidate the aggregate cache so the next read assembles fresh per-zone data.
    _cache.invalidate("conditions:all")


def start_scheduler() -> None:
    from django.conf import settings

    interval = getattr(settings, "SCHEDULER_INTERVAL_MINUTES", 10)

    scheduler.add_job(
        _refresh_all_zones,
        trigger="interval",
        minutes=interval,
        next_run_time=datetime.now(timezone.utc),  # run immediately on startup
        id="refresh_conditions",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.start()
    logger.info("Background scheduler started (interval: %d min)", interval)
