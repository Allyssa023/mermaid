from django.contrib import admin
from conditions.models import FishingZone, RiskConfig, RiskThreshold


@admin.register(FishingZone)
class FishingZoneAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "region", "lat", "lng", "is_active"]
    list_filter = ["region", "is_active"]
    search_fields = ["id", "name"]
    list_editable = ["is_active"]


@admin.register(RiskThreshold)
class RiskThresholdAdmin(admin.ModelAdmin):
    list_display = ["parameter", "order", "upper_bound", "score_points"]
    list_filter = ["parameter"]
    ordering = ["parameter", "order"]


@admin.register(RiskConfig)
class RiskConfigAdmin(admin.ModelAdmin):
    list_display = [
        "safe_max_score", "caution_max_score",
        "gust_threshold_kmh", "heavy_rain_mm_h", "updated_at",
    ]
