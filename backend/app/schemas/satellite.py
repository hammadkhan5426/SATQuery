from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# Schema for validating incoming data when creating a satellite
class SatelliteCreate(BaseModel):
    # Name must be between 1 and 100 characters (whitespace is automatically stripped)
    name: str = Field(min_length=1, max_length=100)
    # NORAD catalog ID must be a positive integer
    norad_id: int = Field(gt=0)

    # Optional additional metadata
    launch_date: datetime | None = None
    owner: str | None = Field(default=None, max_length=100)
    satellite_type: str | None = Field(default=None, max_length=50)
    country_of_origin: str | None = Field(default=None, max_length=100)
    orbit_type: str | None = Field(default=None, max_length=20)

    # Automatically strip leading and trailing whitespace from string inputs
    model_config = ConfigDict(str_strip_whitespace=True)


# Schema for partially updating an existing satellite (all fields optional)
class SatelliteUpdate(BaseModel):
    # Optional updated name (1-100 characters, whitespace stripped)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    # Optional updated NORAD ID (must be > 0)
    norad_id: int | None = Field(default=None, gt=0)

    # Optional updated metadata
    launch_date: datetime | None = None
    owner: str | None = Field(default=None, max_length=100)
    satellite_type: str | None = Field(default=None, max_length=50)
    country_of_origin: str | None = Field(default=None, max_length=100)
    orbit_type: str | None = Field(default=None, max_length=20)

    # Automatically strip leading and trailing whitespace from string inputs
    model_config = ConfigDict(str_strip_whitespace=True)




# Schema for serializing satellite data returned in API responses
class SatelliteRead(BaseModel):
    id: int
    name: str
    norad_id: int
    created_at: datetime

    # Optional TLE orbital data (None until synced from an external provider)
    tle_line1: str | None = None
    tle_line2: str | None = None
    tle_updated_at: datetime | None = None

    # Optional additional metadata
    launch_date: datetime | None = None
    owner: str | None = None
    satellite_type: str | None = None
    country_of_origin: str | None = None
    orbit_type: str | None = None

    # Enable reading data from ORM / SQLAlchemy model attributes
    model_config = ConfigDict(from_attributes=True)


