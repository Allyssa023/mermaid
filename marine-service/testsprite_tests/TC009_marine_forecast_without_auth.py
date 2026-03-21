import requests

BASE_URL = "http://localhost:8081"
TIMEOUT = 30

def test_marine_forecast_without_auth():
    try:
        # First get a valid zone_id from the public zones endpoint
        zones_resp = requests.get(f"{BASE_URL}/conditions/zones", timeout=TIMEOUT)
        zones_resp.raise_for_status()
        zones = zones_resp.json()
        assert isinstance(zones, list) and len(zones) > 0, "Zones list should not be empty"
        zone_id = zones[0]["id"]
        
        # Call the forecast endpoint without Authorization header
        forecast_resp = requests.get(f"{BASE_URL}/conditions/{zone_id}/forecast", timeout=TIMEOUT)
        
        # Validate that status code is 401 Unauthorized
        assert forecast_resp.status_code == 401, f"Expected 401 Unauthorized, got {forecast_resp.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_marine_forecast_without_auth()