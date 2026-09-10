from unittest.mock import patch
from fastapi.testclient import TestClient
import httpx


# ==============================================================================
# Helper Classes for Mocking External HTTP Calls
# ==============================================================================
# Why fake httpx?
# Celestrak is an external, third-party service whose servers can be slow,
# rate-limited, or temporarily down. In automated tests, we should never make
# real network calls because:
#   1. Real network calls make tests slow and fragile (flaky).
#   2. We want predictable, repeatable data for our assertions.
#   3. We want to test error scenarios (like 502 Bad Gateway) on demand.
# ==============================================================================

class FakeResponse:
    """A fake HTTP response mimicking an httpx.Response object.

    Provides the `.text` attribute for our parser and a `.raise_for_status()`
    method that triggers an error if status_code >= 400.
    """

    def __init__(self, text: str = "", status_code: int = 200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        """Simulate httpx's raise_for_status by raising HTTPStatusError for 4xx/5xx."""
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://celestrak.org")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError(
                f"HTTP error {self.status_code}",
                request=request,
                response=response,
            )


class FakeAsyncClient:
    """A fake asynchronous HTTP client mimicking httpx.AsyncClient.

    Supports the 'async with ...' context manager protocol via __aenter__
    and __aexit__. Accepts either a FakeResponse to return on get(),
    or an Exception instance to raise to simulate network errors.
    """

    def __init__(
        self,
        response: FakeResponse | None = None,
        exc: Exception | None = None,
        *args,
        **kwargs,
    ):
        self.response = response
        self.exc = exc

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None

    async def get(self, url: str, *args, **kwargs):
        """Return the pre-configured FakeResponse or raise the configured Exception."""
        if self.exc is not None:
            raise self.exc
        return self.response


# ==============================================================================
# Sample TLE Data for Testing
# ==============================================================================
# Celestrak provides orbital data in "3LE" (3-line element) format:
#   Line 1: Satellite Name
#   Line 2: TLE Line 1 (starts with "1 ", characters 3-7 are the NORAD ID)
#   Line 3: TLE Line 2 (starts with "2 ")
#
# Below are two dummy satellites:
#   - FAKE-SAT-1 with NORAD ID 11111
#   - FAKE-SAT-2 with NORAD ID 22222
# ==============================================================================
SAMPLE_TLE_TEXT = (
    "FAKE-SAT-1\n"
    "1 11111U 98067A   26241.27263584  .00006962  00000+0  13475-3 0  9997\n"
    "2 11111  51.6317 298.3548 0005039  86.9077 273.2487 15.48926826583086\n"
    "FAKE-SAT-2\n"
    "1 22222U 98067A   26241.27263584  .00006962  00000+0  13475-3 0  9997\n"
    "2 22222  51.6317 298.3548 0005039  86.9077 273.2487 15.48926826583086\n"
)


# ==============================================================================
# Automated Tests for /satellites/sync Endpoint
# ==============================================================================

def test_sync_creates_new_satellites(client: TestClient):
    """
    Real-world scenario: First-time sync with Celestrak.

    When the database is empty and we sync a group, every valid satellite in
    the response should be inserted as a new record (created == 2, updated == 0).
    """
    fake_client = FakeAsyncClient(response=FakeResponse(text=SAMPLE_TLE_TEXT))

    with patch("routers.satellites.httpx.AsyncClient", return_value=fake_client):
        response = client.post("/satellites/sync?group=stations")

    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "celestrak_stations"
    assert data["created"] == 2
    assert data["updated"] == 0
    assert data["total_synced"] == 2


def test_sync_upserts_existing_satellites(client: TestClient):
    """
    Real-world scenario: Re-syncing satellites that are already in our database.

    The first sync inserts the satellites (created == 2, updated == 0).
    The second sync with the same NORAD IDs should update them rather than
    crashing on duplicate keys or creating duplicate rows (created == 0, updated == 2).
    """
    fake_client = FakeAsyncClient(response=FakeResponse(text=SAMPLE_TLE_TEXT))

    with patch("routers.satellites.httpx.AsyncClient", return_value=fake_client):
        # First sync: initial creation
        res1 = client.post("/satellites/sync?group=stations")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["created"] == 2
        assert data1["updated"] == 0

        # Second sync: should update existing records instead of inserting new ones
        res2 = client.post("/satellites/sync?group=stations")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["created"] == 0
        assert data2["updated"] == 2


def test_sync_invalid_group_returns_400(client: TestClient):
    """
    Real-world scenario: A client sends an invalid or typoed Celestrak group name.

    The endpoint should validate the group against our ALLOWED_CELESTRAK_GROUPS
    allowlist and reject it with 400 Bad Request before attempting any HTTP call.
    """
    response = client.post("/satellites/sync?group=not_a_real_group")
    assert response.status_code == 400
    assert "Invalid group" in response.json()["detail"]


def test_sync_celestrak_failure_returns_502(client: TestClient):
    """
    Real-world scenario: Celestrak's server is down, times out, or has a connection error.

    When httpx raises a RequestError (network failure), our endpoint should catch
    it and return 502 Bad Gateway to let the client know the external upstream
    service failed.
    """
    fake_client = FakeAsyncClient(
        exc=httpx.RequestError("Connection failed", request=None)
    )

    with patch("routers.satellites.httpx.AsyncClient", return_value=fake_client):
        response = client.post("/satellites/sync?group=active")

    assert response.status_code == 502
    assert "Could not reach external satellite data service" in response.json()["detail"]

