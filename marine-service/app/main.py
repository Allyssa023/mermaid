"""
MERMAID Marine Service — FastAPI application entry point.

Responsibilities:
  - Manage the async HTTP client lifecycle (lifespan)
  - Configure CORS (restrict origins to frontend + Java backend)
  - Mount routers
  - Global exception handler for unhandled errors
"""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import conditions, health
from app.state import state

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create shared HTTP client. Shutdown: close it cleanly."""
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(settings.http_timeout),
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        headers={"Accept": "application/json", "User-Agent": "MERMAID-MarineService/1.0"},
        follow_redirects=True,
    )
    yield
    await state.http_client.aclose()
    logger.info("%s shutdown complete", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Internal microservice that fetches Philippine marine conditions from "
        "Open-Meteo and computes SAFE / CAUTION / UNSAFE risk levels for "
        "small-scale fishermen."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(),
    allow_methods=["GET"],
    allow_headers=["X-API-Key"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


app.include_router(health.router, prefix="/api")
app.include_router(conditions.router, prefix="/api/conditions")
