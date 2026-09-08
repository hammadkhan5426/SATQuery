from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from core.config import settings

# APIKeyHeader extracts the key from incoming request headers named "X-API-Key".
# Setting auto_error=False prevents FastAPI from automatically raising a 403 when
# the header is missing, allowing us to handle missing keys with our custom 401 error.
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify that incoming requests supply a valid API key via the X-API-Key header.

    Applied globally at the app level in main.py to enforce authentication across
    all routes consistently without having to repeat the dependency on every route.
    """
    # Check if the key was omitted (None) or does not match the configured secret
    if not api_key or api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Include it in the 'X-API-Key' header.",
        )
    return True

