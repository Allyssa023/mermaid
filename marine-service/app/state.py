"""
Application-level shared state.

Centralised here so that lifespan (main.py) and dependencies can both
access the same objects without circular imports.
"""

import httpx

from app.cache.ttl_cache import TTLCache


class _AppState:
    http_client: httpx.AsyncClient | None = None
    cache: TTLCache = TTLCache()


state = _AppState()
