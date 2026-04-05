from django.urls import path
from conditions.views import (
    AllConditionsView,
    ZoneConditionsView,
    ZoneForecastView,
    ZoneListView,
)

urlpatterns = [
    path("zones", ZoneListView.as_view()),
    path("<str:zone_id>/forecast", ZoneForecastView.as_view()),  # MUST be before zone_id
    path("<str:zone_id>", ZoneConditionsView.as_view()),
    path("", AllConditionsView.as_view()),
]
