import requests

BASE_URL = "http://localhost:8081/api"
TIMEOUT = 30

def test_fishing_zones_listing_returns_all_zones():
    url = f"{BASE_URL}/conditions/zones"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
        zones = response.json()
        assert isinstance(zones, list), "Response is not a list"
        assert len(zones) > 0, "Zones list is empty"
        for zone in zones:
            assert isinstance(zone, dict), "Zone item is not a dict"
            assert "id" in zone, "Zone missing 'id'"
            assert isinstance(zone["id"], str), "'id' is not string"
            assert "name" in zone, "Zone missing 'name'"
            assert isinstance(zone["name"], str), "'name' is not string"
            assert "coords" in zone, "Zone missing 'coords'"
            coords = zone["coords"]
            assert isinstance(coords, (list, dict)), "'coords' is not list or dict"
            assert "metadata" in zone, "Zone missing 'metadata'"
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with exception: {e}"

test_fishing_zones_listing_returns_all_zones()