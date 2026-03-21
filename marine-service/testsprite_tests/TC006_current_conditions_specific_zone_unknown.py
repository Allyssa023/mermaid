import requests

BASE_URL = "http://localhost:8081/api"
API_KEY = "dev-marine-key-change-in-prod"
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBtZXJtYWlkLmxvY2FsIiwiZnVsbE5hbWUiOiJTeXN0ZW0gQWRtaW4iLCJpc3MiOiJldG9yaWFsLWFwaSIsImlhdCI6MTc3NDA4NDcwNywiZXhwIjoxNzc0MTcxMTA3fQ.HJ-r6l4Zs66YZGJy7DePBb8_UiIDJjzUqGPg21TvYW4"
TIMEOUT = 30

def test_get_conditions_unknown_zone_404():
    zone_id = "unknown-zone-id-1234567890"
    url = f"{BASE_URL}/conditions/{zone_id}"
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "X-API-Key": API_KEY,
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
    # Verify response content includes 'Not Found' message
    try:
        json_resp = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"
    # Accept either 'message' or 'detail' as error message field
    error_msg = json_resp.get('message') or json_resp.get('detail')
    assert error_msg is not None, "Response JSON missing 'message' or 'detail' field"
    assert "Not Found" in error_msg, f"Expected 'Not Found' message but got: {error_msg}"

test_get_conditions_unknown_zone_404()
