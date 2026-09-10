# ==============================================================================
# NOTE: pytest-asyncio IS REQUIRED for this file.
#
# It is NOT currently listed in pyproject.toml's [dependency-groups] dev section.
# Before running these tests, install it with:
#
#   uv add --dev pytest-asyncio
#
# Without it, pytest.mark.asyncio has no effect and the tests will be skipped
# or will fail with a "coroutine was never awaited" error.
# ==============================================================================

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# Why we import from "main" rather than going through the HTTP client:
# scheduled_sync_job() is NOT an HTTP endpoint — it's a plain async Python
# function called by APScheduler on a 24-hour timer. There is no route to POST
# to, so we call it directly and test its internal behavior.
from pathlib import Path
import sys

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from main import scheduled_sync_job  # noqa: E402


# ==============================================================================
# Why mock SessionLocal and sync_celestrak_group?
#
# - SessionLocal: These tests verify scheduling logic (ordering, error isolation,
#   session lifecycle), NOT database query correctness. Using a real database
#   would require a full database setup and make the tests slower and more
#   fragile. A MagicMock() is all we need — it just has to be passed through
#   to sync_celestrak_group, which is itself also mocked.
#
# - sync_celestrak_group: It hits the Celestrak network. That's tested
#   separately in test_sync.py with its own HTTP-level mocks. Here we only
#   care about how the scheduler calls and handles sync_celestrak_group,
#   not what the function itself does internally.
# ==============================================================================


@pytest.mark.asyncio
async def test_scheduled_sync_calls_both_groups_in_order():
    """
    Real-world scenario: Normal, happy-path scheduled sync run.

    On every scheduled 24-hour tick, the job should:
    1. Open exactly ONE database session (not one per group).
    2. Call sync_celestrak_group("stations", db) first.
    3. Call sync_celestrak_group("active", db) second.
    4. Close that ONE database session exactly once when both groups are done.

    This test verifies the call order, that the same db session object is
    reused for both groups, and that cleanup happens in the right place.
    """
    fake_db = MagicMock()  # Fake database session — only .close() will be checked

    with patch("main.SessionLocal", return_value=fake_db) as mock_session_local, \
         patch(
             "main.sync_celestrak_group",
             new_callable=AsyncMock,
             return_value={"created": 1, "updated": 0, "total_synced": 1},
         ) as mock_sync:

        await scheduled_sync_job()

    # sync_celestrak_group must be called exactly twice (once per group)
    assert mock_sync.call_count == 2

    # Verify call order and that BOTH calls used the SAME db session object
    first_call_args = mock_sync.call_args_list[0]
    second_call_args = mock_sync.call_args_list[1]

    assert first_call_args.args[0] == "stations", "First group synced should be 'stations'"
    assert second_call_args.args[0] == "active", "Second group synced should be 'active'"

    # The same db session object must be passed to both calls (not created fresh each time)
    assert first_call_args.args[1] is fake_db, "First call should receive the shared db session"
    assert second_call_args.args[1] is fake_db, "Second call should receive the same db session"

    # The database session must be closed exactly once, at the end, not per group
    fake_db.close.assert_called_once()


@pytest.mark.asyncio
async def test_scheduled_sync_continues_after_one_group_fails():
    """
    Real-world scenario: Celestrak is temporarily down for one group.

    If syncing "stations" fails (e.g. network error or Celestrak outage),
    the scheduler should:
    1. Log the error (swallow the exception — NOT crash the whole job).
    2. Continue and still attempt syncing "active" as if nothing happened.
    3. Still close the database session exactly once when done.

    This is the key failure-isolation property of the per-group try/except
    design: one group failing never blocks the others.
    """
    fake_db = MagicMock()  # Fake database session — only .close() will be checked

    # side_effect as a list: first call raises, second call returns normally
    side_effects = [
        Exception("Celestrak is down for stations"),
        {"created": 3, "updated": 0, "total_synced": 3},
    ]

    with patch("main.SessionLocal", return_value=fake_db), \
         patch(
             "main.sync_celestrak_group",
             new_callable=AsyncMock,
             side_effect=side_effects,
         ) as mock_sync:

        # Must NOT raise — the per-group try/except swallows the first error
        await scheduled_sync_job()

    # Both groups must have been attempted, even though the first one failed
    assert mock_sync.call_count == 2, (
        "sync_celestrak_group should be called for both groups even when the "
        "first one raises an exception"
    )

    # The database session must still be properly closed despite the exception
    fake_db.close.assert_called_once()

