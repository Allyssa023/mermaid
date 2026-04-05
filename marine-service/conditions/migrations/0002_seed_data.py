from django.db import migrations


ZONES = [
    {"id": "sto_tomas",    "name": "Sto. Tomas",          "lat": 16.25, "lng": 120.22},
    {"id": "aringay",      "name": "Aringay",              "lat": 16.40, "lng": 120.23},
    {"id": "agoo",         "name": "Agoo",                 "lat": 16.32, "lng": 120.22},
    {"id": "rosario",      "name": "Rosario",              "lat": 16.19, "lng": 120.25},
    {"id": "san_fernando", "name": "City of San Fernando", "lat": 16.62, "lng": 120.20},
    {"id": "bacnotan",     "name": "Bacnotan",             "lat": 16.74, "lng": 120.23},
    {"id": "bauang",       "name": "Bauang",               "lat": 16.52, "lng": 120.21},
    {"id": "luna",         "name": "Luna",                 "lat": 16.85, "lng": 120.25},
    {"id": "bangar",       "name": "Bangar",               "lat": 16.89, "lng": 120.28},
    {"id": "caba",         "name": "Caba",                 "lat": 16.47, "lng": 120.22},
    {"id": "san_juan",     "name": "San Juan",             "lat": 16.68, "lng": 120.20},
    {"id": "balaoan",      "name": "Balaoan",              "lat": 16.80, "lng": 120.24},
]

WAVE_THRESHOLDS = [
    {"order": 1, "upper_bound": 1.25,   "score_points": 0},
    {"order": 2, "upper_bound": 2.50,   "score_points": 3},
    {"order": 3, "upper_bound": 4.00,   "score_points": 6},
    {"order": 4, "upper_bound": 9999.0, "score_points": 9},
]

WIND_THRESHOLDS = [
    {"order": 1, "upper_bound": 30.0,   "score_points": 0},
    {"order": 2, "upper_bound": 60.0,   "score_points": 2},
    {"order": 3, "upper_bound": 100.0,  "score_points": 5},
    {"order": 4, "upper_bound": 9999.0, "score_points": 8},
]


def seed_data(apps, schema_editor):
    FishingZone = apps.get_model("conditions", "FishingZone")
    RiskThreshold = apps.get_model("conditions", "RiskThreshold")
    RiskConfig = apps.get_model("conditions", "RiskConfig")

    for z in ZONES:
        FishingZone.objects.get_or_create(id=z["id"], defaults={**z, "region": "La Union"})

    for t in WAVE_THRESHOLDS:
        RiskThreshold.objects.get_or_create(
            parameter="WAVE", order=t["order"],
            defaults={"upper_bound": t["upper_bound"], "score_points": t["score_points"]},
        )
    for t in WIND_THRESHOLDS:
        RiskThreshold.objects.get_or_create(
            parameter="WIND", order=t["order"],
            defaults={"upper_bound": t["upper_bound"], "score_points": t["score_points"]},
        )

    if not RiskConfig.objects.exists():
        RiskConfig.objects.create()


def unseed_data(apps, schema_editor):
    apps.get_model("conditions", "FishingZone").objects.all().delete()
    apps.get_model("conditions", "RiskThreshold").objects.all().delete()
    apps.get_model("conditions", "RiskConfig").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("conditions", "0001_initial")]

    operations = [migrations.RunPython(seed_data, unseed_data)]
