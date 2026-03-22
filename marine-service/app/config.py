from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "MERMAID Marine Service"
    app_version: str = "1.0.0"
    port: int = 8081

    # External API base URLs (Open-Meteo — free, no API key required)
    open_meteo_marine_url: str = "https://marine-api.open-meteo.com/v1/marine"
    open_meteo_weather_url: str = "https://api.open-meteo.com/v1/forecast"

    # Service-to-service API key (Java backend → this service)
    marine_api_key: str = "dev-marine-key-change-in-prod"

    # Allowed CORS origins (space-separated)
    allowed_origins: str = "http://localhost:5173 http://localhost:8080"

    # Cache TTL in seconds
    conditions_cache_ttl: int = 900   # 15 minutes
    forecast_cache_ttl: int = 3600    # 1 hour

    # HTTP client settings
    http_timeout: float = 10.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
