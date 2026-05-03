import atexit
import logging
import sys

from django.apps import AppConfig

logger = logging.getLogger(__name__)

# Management commands that don't serve HTTP — skip the scheduler for these.
_NO_SCHEDULER_CMDS = {"migrate", "makemigrations", "shell", "test", "check", "collectstatic"}


class ConditionsConfig(AppConfig):
    name = "conditions"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        import httpx
        from django.conf import settings

        self.http_client = httpx.Client(
            timeout=httpx.Timeout(
                connect=3.0,
                read=settings.HTTP_TIMEOUT,
                write=5.0,
                pool=3.0,
            ),
            headers={
                "Accept": "application/json",
                "User-Agent": "MERMAID-MarineService/1.0",
            },
            follow_redirects=True,
        )
        atexit.register(self.http_client.close)

        cmd = sys.argv[1] if len(sys.argv) > 1 else ""
        serving = cmd not in _NO_SCHEDULER_CMDS

        # Prime in-memory cache from DB snapshots only when actually serving requests.
        # Skipped during management commands (migrate, etc.) where the DB may not be ready.
        if serving:
            self._prime_cache(settings)

        # Start the background refresh scheduler for the same reason.
        if serving and getattr(settings, "SCHEDULER_ENABLED", True):
            from services.scheduler import start_scheduler
            try:
                start_scheduler()
            except Exception as exc:
                logger.error("Failed to start background scheduler: %s", exc)

    def _prime_cache(self, settings) -> None:
        from conditions.views import _cache
        from services.snapshot_store import prime_cache_from_db

        count = prime_cache_from_db(_cache, settings.CONDITIONS_CACHE_TTL)
        if count:
            logger.info("Primed in-memory cache with %d zone snapshot(s) from DB", count)
        else:
            logger.info("No DB snapshots found — will fill after first scheduler tick")
