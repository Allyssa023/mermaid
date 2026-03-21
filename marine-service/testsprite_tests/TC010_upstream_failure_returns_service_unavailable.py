import requests

BASE_URL = "http://localhost:8081/api"
API_KEY = "dev-marine-key-change-in-prod"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBtZXJtYWlkLmxvY2FsIiwiZnVsbE5hbWUiOiJTeXN0ZW0gQWRtaW4iLCJpc3MiOiJtZXJtYWlkLWFwaSIsImlhdCI6MTc3NDA4NDcwNywiZXhwIjoxNzc0MTcxMTA3fQ.HJ-r6l4Zs66YZGJy7DePBb8_UiIDJjzUqGPg21TvYW4"
HEADERS = {
    "X-API-Key": API_KEY,
    "Authorization": f"Bearer {AUTH_TOKEN}"
}
TIMEOUT = 30

def test_upstream_failure_returns_service_unavailable():
    # Test /conditions endpoint for 503
    conditions_url = f"{BASE_URL}/conditions"
    response = requests.get(conditions_url, headers=HEADERS, timeout=TIMEOUT)
    assert response.status_code == 503, f"/conditions expected 503 but got {response.status_code}"
    json_resp = response.json()
    assert "Marine data service unavailable" in str(json_resp), f"/conditions response content unexpected: {json_resp}"

    # Get zone ids from /conditions/zones (public, no auth)
    zones_url = f"{BASE_URL}/conditions/zones"
    zones_response = requests.get(zones_url, timeout=TIMEOUT)
    assert zones_response.status_code == 200, f"/conditions/zones expected 200 but got {zones_response.status_code}"
    zones = zones_response.json()
    assert isinstance(zones, list) and len(zones) > 0, "/conditions/zones returned empty or invalid list"

    # Pick first zone_id from zones list to test /conditions/{zone_id} and /conditions/{zone_id}/forecast
    zone_id = zones[0].get("id")
    assert isinstance(zone_id, str) and zone_id != "", "Invalid zone_id from /conditions/zones response"

    # Test /conditions/{zone_id} endpoint for 503
    zone_condition_url = f"{BASE_URL}/conditions/{zone_id}"
    resp_zone = requests.get(zone_condition_url, headers=HEADERS, timeout=TIMEOUT)
    assert resp_zone.status_code == 503, f"/conditions/{zone_id} expected 503 but got {resp_zone.status_code}"
    json_zone = resp_zone.json()
    assert "Marine data service unavailable" in str(json_zone), f"/conditions/{zone_id} response content unexpected: {json_zone}"

    # Test /conditions/{zone_id}/forecast endpoint for 503
    forecast_url = f"{BASE_URL}/conditions/{zone_id}/forecast"
    resp_forecast = requests.get(forecast_url, headers=HEADERS, timeout=TIMEOUT)
    assert resp_forecast.status_code == 503, f"/conditions/{zone_id}/forecast expected 503 but got {resp_forecast.status_code}"
    json_forecast = resp_forecast.json()
    assert "Marine data service unavailable" in str(json_forecast), f"/conditions/{zone_id}/forecast response content unexpected: {json_forecast}"

test_upstream_failure_returns_service_unavailable()