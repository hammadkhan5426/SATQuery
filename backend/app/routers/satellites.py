from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
import httpx
from skyfield.api import EarthSatellite, load
from sqlalchemy.orm import Session

from core.database import get_db
from core.rate_limit import limiter
from models.satellite import Satellite
from schemas.satellite import SatelliteCreate, SatelliteRead, SatelliteUpdate

logger = logging.getLogger(__name__)

# Initialize Skyfield timescale (used for calculating satellite positions across time)
ts = load.timescale()

# Note: Every route explicitly declares @limiter.limit("60/minute") and takes "request: Request"
# because slowapi's global middleware-only approach was found to be unreliable with APIRouter in this project.
router = APIRouter(prefix="/satellites", tags=["satellites"])




# Celestrak group names we allow syncing from.
# Keeping a fixed allowlist prevents arbitrary URLs from being passed to the external service.
ALLOWED_CELESTRAK_GROUPS = {"stations", "active", "starlink", "gps-ops", "weather"}


# ---------------------------------------------------------------------------
# Core sync helper — extracted so it can be called from BOTH:
#   1. The POST /sync API endpoint (below)
#   2. A background scheduler (future task) that runs on a cron schedule
#
# Because the scheduler has no HTTP request context, this function raises a
# plain Python Exception on failure instead of an HTTPException.  The caller
# (endpoint or scheduler) decides what to do with that error.
# ---------------------------------------------------------------------------
async def sync_celestrak_group(group: str, db: Session) -> dict:
    """Fetch, parse, and upsert TLE data for a single Celestrak group.

    Args:
        group: A Celestrak group name (e.g. "stations", "starlink").
        db:    An active SQLAlchemy database session.

    Returns:
        A summary dict: {"source": ..., "created": ..., "updated": ..., "total_synced": ...}

    Raises:
        Exception: if the external Celestrak request fails for any reason.
    """
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"

    # Step 1: Fetch raw 3LE data from Celestrak with a 10-second timeout.
    # We raise a plain Exception here so both the API endpoint and the scheduler
    # can catch it and handle it in their own way.
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
        logger.error(f"Failed to fetch TLE data for group '{group}' from Celestrak: {exc}")
        raise Exception(
            f"Could not reach Celestrak for group '{group}': {exc}"
        )

    # Step 2: Parse 3LE format — groups of 3 non-blank lines per satellite:
    #   Line 0: Satellite name
    #   Line 1: TLE line 1 (starts with "1 ")
    #   Line 2: TLE line 2 (starts with "2 ")
    raw_lines = [
        line.strip() for line in response.text.splitlines() if line.strip()
    ]

    created_count = 0
    updated_count = 0
    now_utc = datetime.now(timezone.utc)

    i = 0
    while i < len(raw_lines):
        # Make sure we still have a full 3-line group remaining
        if i + 2 >= len(raw_lines):
            logger.warning(
                f"Incomplete 3LE group at line {i + 1} for group '{group}', skipping remainder."
            )
            break

        name = raw_lines[i]
        line1 = raw_lines[i + 1]
        line2 = raw_lines[i + 2]

        # Validate that line1 and line2 have the expected TLE line headers
        if not (line1.startswith("1 ") and line2.startswith("2 ")):
            logger.warning(
                f"Malformed TLE lines for '{name}' at line {i + 1} (group: '{group}'). Skipping."
            )
            i += 1
            continue

        # Extract the 5-digit NORAD catalog ID from characters 3–7 of TLE line 1
        try:
            norad_id = int(line1[2:7].strip())
        except (IndexError, ValueError) as err:
            logger.warning(
                f"Could not parse NORAD ID for '{name}' from '{line1}': {err}. Skipping."
            )
            i += 3
            continue

        # Step 3: Upsert — update existing record or create a new one
        existing_satellite = (
            db.query(Satellite).filter(Satellite.norad_id == norad_id).first()
        )
        if existing_satellite:
            existing_satellite.name = name
            existing_satellite.tle_line1 = line1
            existing_satellite.tle_line2 = line2
            existing_satellite.tle_updated_at = now_utc
            updated_count += 1
        else:
            new_satellite = Satellite(
                name=name,
                norad_id=norad_id,
                tle_line1=line1,
                tle_line2=line2,
                tle_updated_at=now_utc,
            )
            db.add(new_satellite)
            created_count += 1

        i += 3

    # Step 4: Commit all inserts/updates in a single database transaction
    db.commit()

    total_synced = created_count + updated_count

    logger.info(
        f"[{group}] Synced {total_synced} satellites: {created_count} created, {updated_count} updated"
    )

    return {
        "source": f"celestrak_{group}",
        "created": created_count,
        "updated": updated_count,
        "total_synced": total_synced,
    }


# Sync satellite TLE data from a chosen Celestrak group (defaults to "stations")
@router.post("/sync")
@limiter.limit("60/minute")
async def sync_satellites_from_celestrak(
    request: Request,
    group: str = Query(default="stations"),
    db: Session = Depends(get_db),
):
    # Validate that the requested group is in our allowlist before hitting Celestrak
    if group not in ALLOWED_CELESTRAK_GROUPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid group '{group}'. "
                f"Allowed groups are: {sorted(ALLOWED_CELESTRAK_GROUPS)}."
            ),
        )

    # Delegate all fetch/parse/upsert work to the shared helper function.
    # If the helper raises (e.g. network error), convert it to a 502 response here.
    try:
        return await sync_celestrak_group(group, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach external satellite data service (Celestrak): {exc}",
        )


# Create a new satellite record in the database
@router.post("/", response_model=SatelliteRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_satellite(
    request: Request, payload: SatelliteCreate, db: Session = Depends(get_db)
):

    # Check if a satellite with this norad_id already exists in the database
    existing_satellite = (
        db.query(Satellite).filter(Satellite.norad_id == payload.norad_id).first()
    )
    if existing_satellite:
        logger.warning(
            f"Failed to create satellite: NORAD ID {payload.norad_id} already exists."
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Satellite with NORAD ID {payload.norad_id} already exists.",
        )

    # Create a new SQLAlchemy model instance from the validated request data
    new_satellite = Satellite(
        name=payload.name,
        norad_id=payload.norad_id,
        launch_date=payload.launch_date,
        owner=payload.owner,
        satellite_type=payload.satellite_type,
        country_of_origin=payload.country_of_origin,
        orbit_type=payload.orbit_type,
    )
    # Add to the session, commit to save to SQLite, and refresh to get generated fields (like id and created_at)
    db.add(new_satellite)
    db.commit()
    db.refresh(new_satellite)
    logger.info(
        f"Created satellite '{new_satellite.name}' with ID {new_satellite.id} (NORAD ID: {new_satellite.norad_id})"
    )
    return new_satellite


# Retrieve satellite records with optional name search and pagination
@router.get("/", response_model=list[SatelliteRead])
@limiter.limit("60/minute")
def get_satellites(
    request: Request,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    # Optional case-insensitive partial match on the satellite name.
    # Example: ?search=iss matches "ISS (ZARYA)", "ISS DEB", etc.
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Satellite)

    # Apply the name filter BEFORE offset/limit so that pagination works on the
    # filtered results (e.g. "page 2 of matching satellites"), not the full table.
    if search and search.strip():
        query = query.filter(Satellite.name.ilike(f"%{search}%"))

    satellites = query.offset(skip).limit(limit).all()
    return satellites



# Retrieve a single satellite by its ID
@router.get("/{satellite_id}", response_model=SatelliteRead)
@limiter.limit("60/minute")
def get_satellite(
    request: Request, satellite_id: int, db: Session = Depends(get_db)
):
    # Query the database for a satellite matching the provided ID
    satellite = db.query(Satellite).filter(Satellite.id == satellite_id).first()
    if not satellite:
        logger.warning(f"Satellite with ID {satellite_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with ID {satellite_id} not found.",
        )
    return satellite


# Compute and retrieve the real-time geographic position of a satellite
@router.get("/{satellite_id}/position")
@limiter.limit("60/minute")
def get_satellite_position(
    request: Request, satellite_id: int, db: Session = Depends(get_db)
):
    # Step 1: Look up the satellite by ID (404 if not found)
    satellite = db.query(Satellite).filter(Satellite.id == satellite_id).first()
    if not satellite:
        logger.warning(
            f"Failed to compute position: Satellite with ID {satellite_id} not found."
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with ID {satellite_id} not found.",
        )

    # Step 2: Validate that TLE orbital elements are present (400 if missing)
    if not satellite.tle_line1 or not satellite.tle_line2:
        logger.warning(
            f"Satellite '{satellite.name}' (ID: {satellite_id}) has no TLE orbital data."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Satellite '{satellite.name}' has no orbital TLE data. Please sync orbital data first via POST /satellites/sync.",
        )

    # Step 3: Compute current position using Skyfield and SGP4 orbital mechanics
    # Create an EarthSatellite object from the two TLE lines and timescale
    satellite_obj = EarthSatellite(
        satellite.tle_line1,
        satellite.tle_line2,
        satellite.name,
        ts,
    )

    # Get the current time in the Skyfield timescale
    now = ts.now()

    # Propagate the satellite's orbit to the current time to get geocentric coordinates
    geocentric = satellite_obj.at(now)

    # Calculate the subpoint: the geographic point directly beneath the satellite on Earth
    subpoint = geocentric.subpoint()

    latitude = float(subpoint.latitude.degrees)
    longitude = float(subpoint.longitude.degrees)
    altitude_km = float(subpoint.elevation.km)
    computed_at = datetime.now(timezone.utc).isoformat()

    # Step 4: Log success
    logger.info(
        f"Computed position for satellite '{satellite.name}' (ID: {satellite.id}): Lat {latitude:.4f}, Lon {longitude:.4f}, Alt {altitude_km:.2f} km"
    )

    # Step 5: Return position payload
    return {
        "satellite_id": satellite.id,
        "name": satellite.name,
        "norad_id": satellite.norad_id,
        "latitude": latitude,
        "longitude": longitude,
        "altitude_km": altitude_km,
        "computed_at": computed_at,
    }



# Partially update an existing satellite by its ID
@router.patch("/{satellite_id}", response_model=SatelliteRead)
@limiter.limit("60/minute")
def update_satellite(
    request: Request,
    satellite_id: int,
    payload: SatelliteUpdate,
    db: Session = Depends(get_db),
):
    # Lookup the satellite by ID, returning 404 if not found
    satellite = db.query(Satellite).filter(Satellite.id == satellite_id).first()
    if not satellite:
        logger.warning(f"Failed to update: Satellite with ID {satellite_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with ID {satellite_id} not found.",
        )

    # If norad_id is being changed, check that no other satellite already uses it
    if payload.norad_id is not None and payload.norad_id != satellite.norad_id:
        conflict = (
            db.query(Satellite)
            .filter(
                Satellite.norad_id == payload.norad_id,
                Satellite.id != satellite_id,
            )
            .first()
        )
        if conflict:
            logger.warning(
                f"Failed to update satellite {satellite_id}: NORAD ID {payload.norad_id} already exists."
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Satellite with NORAD ID {payload.norad_id} already exists.",
            )
        satellite.norad_id = payload.norad_id

    # Update name if provided
    if payload.name is not None:
        satellite.name = payload.name

    # Update optional metadata fields if provided
    if payload.launch_date is not None:
        satellite.launch_date = payload.launch_date
    if payload.owner is not None:
        satellite.owner = payload.owner
    if payload.satellite_type is not None:
        satellite.satellite_type = payload.satellite_type
    if payload.country_of_origin is not None:
        satellite.country_of_origin = payload.country_of_origin
    if payload.orbit_type is not None:
        satellite.orbit_type = payload.orbit_type

    # Save changes and return the updated satellite
    db.commit()
    db.refresh(satellite)
    return satellite


# Delete a satellite by its ID
@router.delete("/{satellite_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def delete_satellite(
    request: Request, satellite_id: int, db: Session = Depends(get_db)
):
    # Lookup the satellite by ID, returning 404 if not found
    satellite = db.query(Satellite).filter(Satellite.id == satellite_id).first()
    if not satellite:
        logger.warning(f"Failed to delete: Satellite with ID {satellite_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Satellite with ID {satellite_id} not found.",
        )

    # Delete the record and commit the transaction
    db.delete(satellite)
    db.commit()
    logger.info(f"Deleted satellite with ID {satellite_id}.")
    return None




