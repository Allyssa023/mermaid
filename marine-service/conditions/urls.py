from django.urls import path
from conditions.views import (
    AllConditionsView,
    ZoneConditionsView,
    ZoneForecastView,
    ZoneListView,
)

# The main urls.py mounts us at "api/conditions" (no trailing slash).
# Django strips that prefix and passes the remainder, which starts with "/"
# for any sub-path (e.g. "/zones", "/agoo"). The empty-string pattern handles
# the exact "/api/conditions" match; "/" handles "/api/conditions/".
urlpatterns = [
    path("/zones", ZoneListView.as_view()),
    path("/<str:zone_id>/forecast", ZoneForecastView.as_view()),  # MUST be before zone_id
    path("/<str:zone_id>", ZoneConditionsView.as_view()),
    path("/", AllConditionsView.as_view()),
    path("", AllConditionsView.as_view()),
]
