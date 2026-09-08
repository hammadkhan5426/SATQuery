from fastapi import APIRouter, Request

from core.config import settings
from core.rate_limit import limiter

# Note: Every route explicitly declares @limiter.limit("60/minute") and takes "request: Request"
# because slowapi's global middleware-only approach was found to be unreliable with APIRouter in this project.
router = APIRouter()


@router.get("/")
@limiter.limit("60/minute")
def read_root(request: Request):
    return {
        "name": "SATQuery",
        "status": "online",
        "version": settings.app_version,
    }


@router.get("/health")
@limiter.limit("60/minute")
def health_check(request: Request):
    return {
        "status": "healthy",
    }