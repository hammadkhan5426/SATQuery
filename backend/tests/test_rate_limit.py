# ==============================================================================
# Why a small isolated test app with a low limit, rather than hitting real routes?
#
# Option A — firing 65 real requests to production routes at 60/minute:
#   Too slow (needs 60+ requests), too coupled (must know real route paths),
#   and brittle (any auth or business-logic change breaks rate-limit tests).
#
# Option B — modifying the real @limiter.limit("60/minute") decorators:
#   Would change production behavior and pollute source code with test concerns.
#
# Chosen approach — isolated test app with @limiter.limit("2/minute"):
#   We import the REAL shared `limiter` singleton from core.rate_limit and wire
#   it into a tiny throwaway FastAPI app using the EXACT same setup as main.py
#   (app.state.limiter, RateLimitExceeded handler, SlowAPIASGIMiddleware,
#   include_router). This proves the production wiring pattern works end-to-end
#   while keeping tests fast (only 3 requests needed to reach the limit).
# ==============================================================================

from pathlib import Path
import sys

import pytest
from fastapi import APIRouter, FastAPI, Request
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

# Import the REAL shared limiter — the same singleton used by every production route.
from core.rate_limit import limiter  # noqa: E402


# ==============================================================================
# Small standalone test app that mirrors main.py's wiring pattern exactly
# ==============================================================================

# A minimal APIRouter, mirroring how routers/health.py and routers/satellites.py
# are structured — proves the include_router path works, not just direct app routes.
test_router = APIRouter()


@test_router.get("/test-limit")
@limiter.limit("2/minute")  # Deliberately low so we can hit the limit in 3 requests
def rate_limited_route(request: Request):
    # "request: Request" is required by this project's slowapi setup —
    # the middleware inspects it to track per-client request counts.
    return {"ok": True}


# Build a throwaway FastAPI app using the exact same three-step wiring as main.py:
#   1. app.state.limiter = limiter
#   2. app.add_exception_handler(RateLimitExceeded, ...)
#   3. app.add_middleware(SlowAPIASGIMiddleware)
test_app = FastAPI()
test_app.state.limiter = limiter
test_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
test_app.add_middleware(SlowAPIASGIMiddleware)
test_app.include_router(test_router)

# TestClient wraps our test app — no auth headers needed since there's no verify_api_key here
test_client = TestClient(test_app, raise_server_exceptions=False)


# ==============================================================================
# Per-test fixture: reset the limiter's internal counters before each test
# ==============================================================================

@pytest.fixture(autouse=True)
def reset_limiter():
    """Reset the shared limiter's request-count storage before each test.

    `limiter` is a module-level singleton imported from core.rate_limit.
    It's shared across this entire test session (including test_satellites.py,
    test_sync.py, etc.). Without resetting it here, request counts from a
    previous test in this file would bleed into the next, causing false 429s.
    """
    limiter.reset()
    yield


# ==============================================================================
# Tests
# ==============================================================================

def test_rate_limit_blocks_after_threshold():
    """
    Real-world scenario: A client fires more requests than our rate limit allows.

    With @limiter.limit("2/minute"), the first two requests should succeed (200)
    and the third should be rejected (429 Too Many Requests). This proves that:
    - The limiter correctly counts requests per client.
    - The SlowAPIASGIMiddleware intercepts the request before our route runs.
    - The RateLimitExceeded exception handler correctly converts the breach
      into an HTTP 429 response.
    """
    res1 = test_client.get("/test-limit")
    res2 = test_client.get("/test-limit")
    res3 = test_client.get("/test-limit")  # This one should be blocked

    assert res1.status_code == 200, "First request within limit should be allowed"
    assert res2.status_code == 200, "Second request within limit should be allowed"
    assert res3.status_code == 429, "Third request exceeds limit and should be rejected"


def test_rate_limit_exceeded_response_body():
    """
    Real-world scenario: When a request is rate-limited, the client receives a
    clear, structured error response (not a raw framework exception or 500).

    This test proves that `_rate_limit_exceeded_handler` (the slowapi built-in
    exception handler registered on the app) is correctly wired up. Without it,
    an unhandled RateLimitExceeded exception might bubble up as a 500 error or
    an empty body rather than the expected {"detail": "..."} JSON response.
    """
    # Send two allowed requests first, then trigger the 429
    test_client.get("/test-limit")
    test_client.get("/test-limit")
    res = test_client.get("/test-limit")  # This one gets blocked

    assert res.status_code == 429
    body = res.json()
    assert "error" in body, (
        "Rate limit response body must contain an 'error' key — "
        "this confirms _rate_limit_exceeded_handler is correctly registered "
        "and not just raising an unhandled exception."
    )

