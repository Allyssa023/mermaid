import requests

def test_current_conditions_all_zones_with_valid_auth():
    base_url = "http://localhost:8081/api"
    url = f"{base_url}/conditions"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBtZXJtYWlkLmxvY2FsIiwiZnVsbE5hbWUiOiJTeXN0ZW0gQWRtaW4iLCJpc3MiOiJtZXJtYWlkLWFwaSIsImlhdCI6MTc3NDA4NDcwNywiZXhwIjoxNzc0MTcxMTA3fQ.HJ-r6l4Zs66YZGJy7DePBb8_UiIDJjzUqGPg21TvYW4"
    }
    timeout = 30

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {str(e)}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate required keys in response (AllConditionsResponse schema)
    # According to description it should contain 'zones' and computed risk levels in each zone
    assert "zones" in data, "Response JSON does not contain 'zones' key"
    zones = data["zones"]
    assert isinstance(zones, list), "'zones' should be a list"
    assert len(zones) > 0, "'zones' list is empty"

    for zone in zones:
        # Each zone expected to have at least: id, risk_level (computed risk)
        assert isinstance(zone, dict), "Each zone item should be a dictionary"
        assert "id" in zone, "Zone object missing 'id' field"
        assert isinstance(zone["id"], str), "'id' in zone should be a string"
        # computed risk_level must be present and within allowed values
        assert "risk_level" in zone, f"Zone {zone.get('id')} missing 'risk_level'"
        assert zone["risk_level"] in ("SAFE", "CAUTION", "UNSAFE"), f"Zone {zone.get('id')} has invalid risk_level"

test_current_conditions_all_zones_with_valid_auth()