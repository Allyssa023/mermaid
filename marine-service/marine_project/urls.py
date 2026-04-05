from django.contrib import admin
from django.urls import path, include

# No trailing slash on "api/conditions" — the Java backend calls /api/conditions
# (no slash). Django's APPEND_SLASH would 301-redirect without a match here, which
# the Java backend may not follow. Match the exact paths the spec defines.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/conditions", include("conditions.urls")),
    path("api/", include("conditions.health_urls")),
]
