import requests

BASE_URL = "http://localhost:8081/api"
API_KEY = "dev-marine-key-change-in-prod"
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBtZXJpYWQubG9jYWwiLCJmdWxsbmFtZSI6IlN5c3RlbSBBZG1pbiIsImlzcyI6Im1lcm1haWQtYXBpIiwiaWF0IjoxNzc0MDg0NzA3LCJleHAiOjE3NzQxNzExMDd9.HJ-r6l4Zs66YZGJy7DePBb8_UiIDJjzUqGPg21TvYW4"
TIMEOUT = 30

def test_marine_forecast_valid_zone_with_auth():
    session = requests.Session()
    try:
        # Step 1: Get list of zones (public endpoint, no auth)
        zones_resp = session.get(f"{BASE_URL}/conditions/zones", timeout=TIMEOUT)
        assert zones_resp.status_code == 200, f"Expected 200 for zones listing, got {zones_resp.status_code}"
        zones = zones_resp.json()
        assert isinstance(zones, list) and len(zones) > 0, "Zones list should be non-empty list"
        # Extract the first valid zone_id
        zone_id = None
        for zone in zones:
            if isinstance(zone, dict) and "id" in zone and isinstance(zone["id"], str) and zone["id"].strip():
                zone_id = zone["id"]
                break
        assert zone_id is not None, "No valid zone_id found in zones list"

        # Step 2: Call the forecast endpoint with proper auth and API key header
        headers = {
            "Authorization": f"Bearer {BEARER_TOKEN}",
            "X-API-Key": API_KEY,
            "Accept": "application/json"
        }
        forecast_resp = session.get(f"{BASE_URL}/conditions/{zone_id}/forecast", headers=headers, timeout=TIMEOUT)
        assert forecast_resp.status_code == 200, f"Expected 200 for forecast endpoint, got {forecast_resp.status_code}"

        forecast_data = forecast_resp.json()
        # Validate presence of daily summaries and hourly breakdowns with dominant risk levels
        # The forecast data should be a dict containing keys like 'daily' and 'hourly'
        assert isinstance(forecast_data, dict), "Forecast response should be a JSON object"

        # Checking for daily summaries
        daily = forecast_data.get("daily")
        assert daily is not None, "daily summaries key missing in forecast response"
        assert isinstance(daily, list) and len(daily) > 0, "daily summaries should be a non-empty list"

        # Check each daily summary has a dominant risk level
        for day_summary in daily:
            assert isinstance(day_summary, dict), "Each daily summary should be a dict"
            risk_level = day_summary.get("dominant_risk_level")
            assert risk_level in ("SAFE", "CAUTION", "UNSAFE"), f"Invalid or missing dominant_risk_level in daily summary: {risk_level}"

        # Checking for hourly breakdowns
        hourly = forecast_data.get("hourly")
        assert hourly is not None, "hourly breakdowns key missing in forecast response"
        assert isinstance(hourly, list) and len(hourly) > 0, "hourly breakdowns should be a non-empty list"

        # Each hourly entry should have risk level field (assuming 'risk_level')
        for hour_entry in hourly:
            assert isinstance(hour_entry, dict), "Each hourly breakdown should be a dict"
            risk_level_hour = hour_entry.get("risk_level")
            assert risk_level_hour in ("SAFE", "CAUTION", "UNSAFE"), f"Invalid or missing risk_level in hourly breakdown: {risk_level_hour}"

    finally:
        session.close()

test_marine_forecast_valid_zone_with_auth()