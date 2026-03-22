import requests

BASE_URL = "http://localhost:8081/api"
TIMEOUT = 30

def test_current_conditions_all_zones_without_auth():
    url = f"{BASE_URL}/conditions"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 401, f"Expected 401 Unauthorized but got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_current_conditions_all_zones_without_auth()