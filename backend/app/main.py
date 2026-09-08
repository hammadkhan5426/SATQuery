from contextlib import asynccontextmanager

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware

from core.auth import verify_api_key
from core.config import settings
from core.database import SessionLocal
from core.logging_config import setup_logging
from core.rate_limit import limiter
from models import satellite  # noqa: F401 - needed so Base knows about this table
from routers import health, satellites
from routers.satellites import sync_celestrak_group

# Configure logging before initializing the app
setup_logging()
logger = logging.getLogger(__name__)

# Create the scheduler at module level so it can be started/stopped in the lifespan.
# AsyncIOScheduler integrates with FastAPI's asyncio event loop.
scheduler = AsyncIOScheduler()


async def scheduled_sync_job():
    """Background job that syncs TLE data for multiple Celestrak groups.

    This function runs on the APScheduler 24-hour interval.  It is NOT an HTTP
    endpoint, so it cannot use Depends(get_db) — that mechanism only works for
    FastAPI request handling.  Instead, we manually create a SQLAlchemy session
    using SessionLocal() and close it ourselves in a finally block.
    """
    logger.info("Starting scheduled satellite sync...")

    # Create a fresh database session for this background job.
    # Unlike API endpoints (which get a session injected via Depends), background
    # jobs must manage their own session lifecycle manually.
    db = SessionLocal()

    # Groups to sync on each scheduled run.
    # Add more group names here if you want to expand the scheduled sync later.
    groups_to_sync = ["stations", "active"]

    synced_summary = []

    try:
        for group in groups_to_sync:
            # Each group is wrapped in its own try/except so that a failure for
            # one group (e.g. Celestrak is temporarily unreachable for "active")
            # does not prevent the remaining groups from being attempted.
            try:
                result = await sync_celestrak_group(group, db)
                synced_summary.append(
                    f"{group}: {result['created']} created, {result['updated']} updated"
                )
            except Exception as exc:
                logger.error(
                    f"Scheduled sync failed for group '{group}': {exc}", exc_info=True
                )
    finally:
        # Always close the session when done, even if an unexpected error occurs.
        db.close()

    logger.info(
        f"Scheduled satellite sync complete. Results: {'; '.join(synced_summary) if synced_summary else 'none'}"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Schedule the sync job to run every 24 hours.
    # next_run_time is NOT set here intentionally, so the job does NOT fire
    # immediately when the dev server starts (which would be disruptive during
    # hot-reloads). The first run will happen 24 hours after startup.
    scheduler.add_job(
        scheduled_sync_job,
        "interval",
        hours=24,
        id="celestrak_sync",
    )
    scheduler.start()
    logger.info("APScheduler started — satellite sync scheduled every 24 hours.")

    yield  # Application runs here (serving requests)

    # --- SHUTDOWN ---
    # Cleanly stop the scheduler when the application exits.
    # wait=False means we don't block waiting for running jobs to finish.
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped.")


app = FastAPI(
    title=settings.app_title,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
    # Enforce API key authentication across all endpoints in the application
    dependencies=[Depends(verify_api_key)],
)

# Attach limiter instance to FastAPI app state so SlowAPIMiddleware can access it
app.state.limiter = limiter

# Register slowapi's custom exception handler for RateLimitExceeded.
# When a client exceeds 60 requests/minute, this automatically returns a 429 Too Many Requests response.
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add SlowAPIMiddleware:
# Intercepts all incoming HTTP requests and checks them against the Limiter's default_limits.
# This enforces the 60 requests/minute limit globally across all routes without modifying individual routers.
app.add_middleware(SlowAPIASGIMiddleware)

# CORS (Cross-Origin Resource Sharing) configuration:
# Permits requests from allowed frontend origins (read from .env via settings.cors_origins_list)
origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for any unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the unhandled error with full traceback information
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )


app.include_router(health.router)
app.include_router(satellites.router)






