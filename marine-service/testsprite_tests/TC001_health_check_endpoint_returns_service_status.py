import requests

BASE_URL = "http://localhost:8081/api"
TIMEOUT = 30

def test_health_check_endpoint_returns_service_status():
    url = f"{BASE_URL}/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to /health failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate required fields existence and types
    assert "status" in data, "'status' field missing in response"
    assert isinstance(data["status"], str), "'status' field is not a string"

    assert "version" in data, "'version' field missing in response"
    assert isinstance(data["version"], str), "'version' field is not a string"

    assert "timestamp" in data, "'timestamp' field missing in response"
    # timestamp validation: must be int or str representing timestamp
    assert isinstance(data["timestamp"], (int, str)), "'timestamp' field is not int or string"

    assert "cache_entry_count" in data, "'cache_entry_count' field missing in response"
    assert isinstance(data["cache_entry_count"], int), "'cache_entry_count' field is not an integer"


test_health_check_endpoint_returns_service_status()