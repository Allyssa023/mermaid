import atexit
from django.apps import AppConfig


class ConditionsConfig(AppConfig):
    name = "conditions"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        import httpx
        from django.conf import settings

        self.http_client = httpx.Client(
            timeout=settings.HTTP_TIMEOUT,
            headers={
                "Accept": "application/json",
                "User-Agent": "MERMAID-MarineService/1.0",
            },
            follow_redirects=True,
        )
        atexit.register(self.http_client.close)
