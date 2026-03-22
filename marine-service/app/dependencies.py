"""
FastAPI dependency providers.
"""

import httpx
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.cache.ttl_cache import TTLCache
from app.config import get_settings
from app.state import state

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


def get_http_client() -> httpx.AsyncClient:
    if state.http_client is None:  # pragma: no cover
        raise RuntimeError("HTTP client not initialised — lifespan error")
    return state.http_client


def get_cache() -> TTLCache:
    return state.cache


async def require_api_key(api_key: str = Security(_api_key_header)) -> None:
    """
    Validate the shared service-to-service API key.
    Using Security() registers the scheme in OpenAPI → shows the lock in Swagger UI.
    """
    if api_key != get_settings().marine_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
