from django.urls import path
from conditions.views import HealthView

urlpatterns = [
    path("health", HealthView.as_view()),
]
