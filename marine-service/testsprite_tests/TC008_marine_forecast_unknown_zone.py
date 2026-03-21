import requests

def test_marine_forecast_unknown_zone():
    base_url = "http://localhost:8081/api"
    unknown_zone_id = "unknown-zone-xyz"
    url = f"{base_url}/conditions/{unknown_zone_id}/forecast"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBtZXJtYWlkLmxvY2FsIiwiZnVsbE5hbWUiOiJTeXN0ZW0gQWRtaW4iLCJpc3MiOiJtZXJtYWlkLWFwaSIsImlhdCI6MTc3NDA4NDcwNywiZXhwIjoxNzc0MTcxMTA3fQ.HJ-r6l4Zs66YZGJy7DePBb8_UiIDJjzUqGPg21TvYW4"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
    try:
        error_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"
    msg = error_response.get("message")
    assert isinstance(msg, str) and "Zone not found" in msg, "Error message does not indicate 'Zone not found'"

test_marine_forecast_unknown_zone()