from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.dependencies import get_cache
from app.cache.ttl_cache import TTLCache
from app.models.marine import HealthResponse

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health check",
    description="Returns service status. No authentication required.",
)
async def health_check(cache: TTLCache = Depends(get_cache)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc),
        cache_entries=cache.size(),
    )
