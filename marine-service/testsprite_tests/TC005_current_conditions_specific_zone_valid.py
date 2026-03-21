import requests

BASE_URL = "http://localhost:8081/api"
API_KEY_HEADER = {"X-API-Key": "dev-marine-key-change-in-prod"}
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBtZXJtYWlkLmxvY2FsIiwiZnVsbE5hbWUiOiJTeXN0ZW0gQWRtaW4iLCJpc3MiOiJtZXJtYWlkLWFwaSIsImlhdCI6MTc3NDA4NDcwNywiZXhwIjoxNzc0MTcxMTA3fQ.HJ-r6l4Zs66YZGJy7DePBb8_UiIDJjzUqGPg21TvYW4"
HEADERS_AUTH = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    **API_KEY_HEADER,
}
TIMEOUT = 30


def test_current_conditions_specific_zone_valid():
    zones_url = f"{BASE_URL}/conditions/zones"

    # Get available zones (public, no auth needed)
    try:
        zones_response = requests.get(zones_url, timeout=TIMEOUT)
        zones_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to get fishing zones: {e}"

    zones_data = zones_response.json()
    assert isinstance(zones_data, list) and len(zones_data) > 0, "Zones list is empty or not a list"

    # Use the first zone_id from the zones list
    zone_id = zones_data[0].get("id")
    assert isinstance(zone_id, str) and zone_id, "Invalid zone_id from zones response"

    conditions_url = f"{BASE_URL}/conditions/{zone_id}"

    try:
        resp = requests.get(conditions_url, headers=HEADERS_AUTH, timeout=TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to /conditions/{zone_id} failed: {e}"

    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"

    data = resp.json()
    # Validate presence and types of required fields
    assert isinstance(data, dict), "Response JSON is not an object"
    # Expected fields: wave_height (number), wind_speed (number), risk_level (string)
    assert "wave_height" in data, "Missing wave_height in response"
    assert isinstance(data["wave_height"], (int, float)), "wave_height is not a number"

    assert "wind_speed" in data, "Missing wind_speed in response"
    assert isinstance(data["wind_speed"], (int, float)), "wind_speed is not a number"

    assert "risk_level" in data, "Missing risk_level in response"
    assert isinstance(data["risk_level"], str), "risk_level is not a string"
    assert data["risk_level"] in ("SAFE", "CAUTION", "UNSAFE"), "risk_level value is invalid"


test_current_conditions_specific_zone_valid()