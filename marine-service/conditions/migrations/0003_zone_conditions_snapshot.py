from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("conditions", "0002_seed_data")]

    operations = [
        migrations.CreateModel(
            name="ZoneConditionsSnapshot",
            fields=[
                ("zone_id", models.CharField(max_length=50, primary_key=True, serialize=False)),
                ("data_json", models.TextField()),
                ("fetched_at", models.DateTimeField()),
            ],
            options={"db_table": "conditions_snapshot"},
        ),
    ]
