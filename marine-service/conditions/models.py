from django.db import models


class FishingZone(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    lat = models.FloatField()
    lng = models.FloatField()
    region = models.CharField(max_length=100, default="La Union")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "conditions_fishingzone"
        indexes = [models.Index(fields=["is_active"])]

    def __str__(self):
        return f"{self.name} ({self.id})"


class RiskThreshold(models.Model):
    PARAMETER_CHOICES = [("WAVE", "Wave Height"), ("WIND", "Wind Speed")]

    parameter = models.CharField(max_length=10, choices=PARAMETER_CHOICES)
    upper_bound = models.FloatField(help_text="Upper bound for this tier. Use 9999.0 for 'infinity'.")
    score_points = models.IntegerField(help_text="Points added when value <= upper_bound.")
    order = models.IntegerField(help_text="Evaluation order (ascending).")

    class Meta:
        db_table = "conditions_riskthreshold"
        ordering = ["parameter", "order"]

    def __str__(self):
        return f"{self.parameter} tier {self.order}: <= {self.upper_bound} → {self.score_points}pts"


class RiskConfig(models.Model):
    safe_max_score = models.IntegerField(default=2)
    caution_max_score = models.IntegerField(default=5)
    gust_threshold_kmh = models.FloatField(default=60.0)
    heavy_rain_mm_h = models.FloatField(default=10.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conditions_riskconfig"

    def __str__(self):
        return f"RiskConfig (safe≤{self.safe_max_score}, caution≤{self.caution_max_score})"
