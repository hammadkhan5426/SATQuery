from fastapi.testclient import TestClient
from datetime import datetime, timezone
from pathlib import Path
import sys

TESTS_DIR = Path(__file__).resolve().parent
if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))

from main import app  # noqa: E402
from core.database import get_db  # noqa: E402
from models.satellite import Satellite

def test_create_satellite_success(client: TestClient):
    """Test creating a satellite with valid data returns 201 and correct fields."""
    response = client.post(
        "/satellites/",
        json={"name": "ISS (ZARYA)", "norad_id": 25544},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "ISS (ZARYA)"
    assert data["norad_id"] == 25544
    assert "id" in data
    assert "created_at" in data


def test_create_satellite_duplicate_norad_id(client: TestClient):
    """Test creating a duplicate NORAD ID returns 409 Conflict."""
    # Create the first satellite
    res1 = client.post(
        "/satellites/",
        json={"name": "Hubble Space Telescope", "norad_id": 20580},
    )
    assert res1.status_code == 201

    # Attempt to create another satellite with the same norad_id
    res2 = client.post(
        "/satellites/",
        json={"name": "Duplicate Hubble", "norad_id": 20580},
    )
    assert res2.status_code == 409
    assert "20580" in res2.json()["detail"]


def test_create_satellite_invalid_input(client: TestClient):
    """Test creating a satellite with invalid fields returns 422 Unprocessable Entity."""
    # Empty name
    res_empty_name = client.post(
        "/satellites/",
        json={"name": "", "norad_id": 25544},
    )
    assert res_empty_name.status_code == 422

    # Whitespace-only name
    res_whitespace_name = client.post(
        "/satellites/",
        json={"name": "   ", "norad_id": 25544},
    )
    assert res_whitespace_name.status_code == 422

    # Non-positive NORAD ID (zero)
    res_zero_norad = client.post(
        "/satellites/",
        json={"name": "Test Sat", "norad_id": 0},
    )
    assert res_zero_norad.status_code == 422

    # Negative NORAD ID
    res_neg_norad = client.post(
        "/satellites/",
        json={"name": "Test Sat", "norad_id": -5},
    )
    assert res_neg_norad.status_code == 422


def test_get_satellites_pagination(client: TestClient):
    """Test listing satellites with pagination (skip and limit)."""
    # Create 3 satellites
    for i in range(1, 4):
        client.post(
            "/satellites/",
            json={"name": f"Sat {i}", "norad_id": 10000 + i},
        )

    # Page 1: limit 2
    res_page1 = client.get("/satellites/?skip=0&limit=2")
    assert res_page1.status_code == 200
    data_page1 = res_page1.json()
    assert len(data_page1) == 2
    assert data_page1[0]["name"] == "Sat 1"
    assert data_page1[1]["name"] == "Sat 2"

    # Page 2: skip 2, limit 2
    res_page2 = client.get("/satellites/?skip=2&limit=2")
    assert res_page2.status_code == 200
    data_page2 = res_page2.json()
    assert len(data_page2) == 1
    assert data_page2[0]["name"] == "Sat 3"


def test_get_satellite_by_id(client: TestClient):
    """Test retrieving a satellite by ID and handling 404 for missing IDs."""
    # Create a satellite
    create_res = client.post(
        "/satellites/",
        json={"name": "Tiangong", "norad_id": 48274},
    )
    sat_id = create_res.json()["id"]

    # Retrieve existing
    get_res = client.get(f"/satellites/{sat_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Tiangong"

    # Retrieve non-existent ID
    missing_res = client.get("/satellites/99999")
    assert missing_res.status_code == 404


def test_update_satellite(client: TestClient):
    """Test partially updating a satellite (PATCH) and conflict handling."""
    # Create two satellites
    sat1 = client.post(
        "/satellites/", json={"name": "Sat A", "norad_id": 100}
    ).json()
    sat2 = client.post(
        "/satellites/", json={"name": "Sat B", "norad_id": 200}
    ).json()

    # Successfully update name only
    update_res = client.patch(
        f"/satellites/{sat1['id']}",
        json={"name": "Sat A Updated"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Sat A Updated"
    assert update_res.json()["norad_id"] == 100

    # Conflict: Attempt to update Sat 1 norad_id to Sat 2's norad_id (200)
    conflict_res = client.patch(
        f"/satellites/{sat1['id']}",
        json={"norad_id": sat2["norad_id"]},
    )
    assert conflict_res.status_code == 409

    # 404 on missing satellite
    missing_patch = client.patch(
        "/satellites/99999",
        json={"name": "Does Not Exist"},
    )
    assert missing_patch.status_code == 404


def test_delete_satellite(client: TestClient):
    """Test deleting a satellite returns 204 and subsequent lookups return 404."""
    # Create a satellite
    sat = client.post(
        "/satellites/", json={"name": "To Delete", "norad_id": 500}
    ).json()

    # Delete the satellite
    delete_res = client.delete(f"/satellites/{sat['id']}")
    assert delete_res.status_code == 204

    # Verify it is deleted
    get_res = client.get(f"/satellites/{sat['id']}")
    assert get_res.status_code == 404

    # Deleting again returns 404
    delete_missing = client.delete(f"/satellites/{sat['id']}")
    assert delete_missing.status_code == 404

def test_get_satellite_position_not_found(client: TestClient):
    """Test that requesting a position for a non-existent satellite returns 404."""
    response = client.get("/satellites/9999/position")
    assert response.status_code == 404


def test_get_satellite_position_no_tle_data(client: TestClient):
    """Test that a satellite with no TLE data returns 400 with a clear message."""
    # Create a satellite via the normal API — this does NOT set TLE data
    create_res = client.post(
        "/satellites/",
        json={"name": "No TLE Sat", "norad_id": 90001},
    )
    sat_id = create_res.json()["id"]

    response = client.get(f"/satellites/{sat_id}/position")
    assert response.status_code == 400
    assert "sync" in response.json()["detail"].lower()


def test_get_satellite_position_success(client: TestClient):
    """
    Test that a satellite WITH real TLE data returns a valid computed position.

    The normal POST /satellites/ endpoint doesn't accept TLE fields (they're only
    set via the /sync endpoint), so to test the success case we insert a Satellite
    row directly into the test database with real sample TLE data for the ISS.
    """
    override_get_db = app.dependency_overrides[get_db]
    db_gen = override_get_db()
    db = next(db_gen)
    try:
        satellite = Satellite(
            name="ISS (ZARYA)",
            norad_id=25544,
            tle_line1="1 25544U 98067A   26241.27263584  .00006962  00000+0  13475-3 0  9997",
            tle_line2="2 25544  51.6317 298.3548 0005039  86.9077 273.2487 15.48926826583086",
            tle_updated_at=datetime.now(timezone.utc),
        )
        db.add(satellite)
        db.commit()
        db.refresh(satellite)
        sat_id = satellite.id
    finally:
        db_gen.close()

    response = client.get(f"/satellites/{sat_id}/position")
    assert response.status_code == 200

    data = response.json()
    assert "latitude" in data
    assert "longitude" in data
    assert "altitude_km" in data
    assert "computed_at" in data

    assert -90 <= data["latitude"] <= 90
    assert -180 <= data["longitude"] <= 180
    assert 200 <= data["altitude_km"] <= 2000


def test_search_satellites_case_insensitive(client: TestClient):
    """Test that searching by name is case-insensitive (e.g. 'iss' matches 'ISS (ZARYA)')."""
    client.post("/satellites/", json={"name": "ISS (ZARYA)", "norad_id": 25544})
    client.post("/satellites/", json={"name": "Hubble Space Telescope", "norad_id": 20580})

    response = client.get("/satellites/?search=iss")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "ISS (ZARYA)"


def test_search_satellites_partial_match(client: TestClient):
    """Test that searching by name matches partial substrings."""
    client.post("/satellites/", json={"name": "CSS (TIANHE)", "norad_id": 48274})
    client.post("/satellites/", json={"name": "CSS (WENTIAN)", "norad_id": 53239})
    client.post("/satellites/", json={"name": "Voyager 1", "norad_id": 10359})

    response = client.get("/satellites/?search=CSS")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for item in data:
        assert "CSS" in item["name"]


def test_search_satellites_no_matches(client: TestClient):
    """Test that searching for a term with no matches returns an empty list."""
    client.post("/satellites/", json={"name": "ISS (ZARYA)", "norad_id": 25544})

    response = client.get("/satellites/?search=nonexistentxyz")
    assert response.status_code == 200
    assert response.json() == []


def test_search_satellites_combined_with_pagination(client: TestClient):
    """Test that search and pagination parameters work together correctly."""
    client.post("/satellites/", json={"name": "Starlink-1", "norad_id": 44713})
    client.post("/satellites/", json={"name": "Starlink-2", "norad_id": 44714})
    client.post("/satellites/", json={"name": "Starlink-3", "norad_id": 44715})

    response = client.get("/satellites/?search=Star&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_search_satellites_no_search_param(client: TestClient):
    """Test that omitting the search parameter returns all satellites as default."""
    client.post("/satellites/", json={"name": "Sat Alpha", "norad_id": 60001})
    client.post("/satellites/", json={"name": "Sat Beta", "norad_id": 60002})

    response = client.get("/satellites/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_request_without_api_key_is_rejected(client: TestClient):
    """Test that a request without a valid API key header is rejected with 401 Unauthorized.

    The `client` fixture sends a valid X-API-Key header by default.
    By explicitly passing `headers={"X-API-Key": ""}`, we override the default
    header for this single request to simulate an empty/missing key.
    """
    response = client.get("/health", headers={"X-API-Key": ""})
    assert response.status_code == 401


def test_request_with_wrong_api_key_is_rejected(client: TestClient):
    """Test that a request with an incorrect API key header is rejected with 401 Unauthorized.

    Overriding the header per-request replaces the fixture's valid key
    with an invalid value.
    """
    response = client.get(
        "/health", headers={"X-API-Key": "totally-wrong-key-12345"}
    )
    assert response.status_code == 401


def test_request_with_correct_api_key_succeeds(client: TestClient):
    """Test that a request with a valid API key succeeds with 200 OK.

    Uses the `client` fixture normally, which automatically includes the
    configured valid X-API-Key header.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"