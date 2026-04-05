from django.contrib import admin
from django.urls import path, include
from conditions.views import AllConditionsView

# /api/conditions (no trailing slash) is a direct route so the Java backend
# can call it without a redirect. Sub-paths (/zones, /<zone_id>, etc.) and
# /api/conditions/ (trailing slash) are handled via the include.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/conditions", AllConditionsView.as_view()),
    path("api/conditions/", include("conditions.urls")),
    path("api/", include("conditions.health_urls")),
]
