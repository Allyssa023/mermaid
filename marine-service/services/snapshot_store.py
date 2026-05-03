"""
DB-backed snapshot store for ZoneConditions.

Provides crash-resilient persistence so the in-memory cache can be primed
on restart without waiting for the first scheduler tick to hit Open-Meteo.
"""

import json
import logging

logger = logging.getLogger(__name__)


def load_snapshot(zone_id: str):
    """Return a ZoneConditions pydantic object from the DB snapshot, or None."""
    from conditions.models import ZoneConditionsSnapshot
    from services.models import ZoneConditions

    try:
        snap = ZoneConditionsSnapshot.objects.get(zone_id=zone_id)
        return ZoneConditions.model_validate_json(snap.data_json)
    except ZoneConditionsSnapshot.DoesNotExist:
        return None
    except Exception as exc:
        logger.warning("Failed to load snapshot for zone %s: %s", zone_id, exc)
        return None


def save_snapshot(zone_id: str, conditions) -> None:
    """Upsert a ZoneConditions snapshot to the DB."""
    from conditions.models import ZoneConditionsSnapshot

    try:
        ZoneConditionsSnapshot.objects.update_or_create(
            zone_id=zone_id,
            defaults={
                "data_json": conditions.model_dump_json(),
                "fetched_at": conditions.timestamp,
            },
        )
    except Exception as exc:
        logger.warning("Failed to save snapshot for zone %s: %s", zone_id, exc)


def prime_cache_from_db(cache, ttl: int) -> int:
    """
    Load all DB snapshots into the in-memory cache.
    Returns the number of zones primed.
    """
    from conditions.models import ZoneConditionsSnapshot
    from services.models import ZoneConditions

    count = 0
    try:
        for snap in ZoneConditionsSnapshot.objects.all():
            try:
                conditions = ZoneConditions.model_validate_json(snap.data_json)
                cache.set(f"conditions:{snap.zone_id}", conditions, ttl)
                count += 1
            except Exception as exc:
                logger.warning("Skipping corrupt snapshot for zone %s: %s", snap.zone_id, exc)
    except Exception as exc:
        logger.warning("Could not prime cache from DB (DB may not be ready): %s", exc)
    return count
