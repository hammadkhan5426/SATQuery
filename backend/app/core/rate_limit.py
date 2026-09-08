from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared Limiter instance defined in its own module so that both main.py
# (for app-state attachment, middleware, and exception handling) and the routers
# (for route-level @limiter.limit decorators) can import it without circular dependencies.
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

