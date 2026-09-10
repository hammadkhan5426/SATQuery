from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Satellite(Base):
    __tablename__ = "satellites"

    # Unique primary key that auto-increments for each new satellite
    id: Mapped[int] = mapped_column(primary_key=True)

    # Name of the satellite (required)
    name: Mapped[str] = mapped_column(String, nullable=False)

    # Unique NORAD catalog identifier to prevent duplicates and allow external matching (required)
    norad_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)

    # Creation timestamp, automatically set to the current UTC time
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    # First line of the Two-Line Element (TLE) orbital data (optional)
    tle_line1: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        default=None,
    )

    # Second line of the Two-Line Element (TLE) orbital data (optional)
    tle_line2: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        default=None,
    )

    # Timestamp when TLE orbital data was last updated (optional, set upon sync)
    tle_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        default=None,
    )

    # Date the satellite was launched (optional)
    launch_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        default=None,
    )

    # Owning organization or operator, e.g. "NASA", "SpaceX" (optional)
    owner: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # Category/purpose of the satellite, e.g. "communication", "weather", "military" (optional)
    satellite_type: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # Country of origin/registration (optional)
    country_of_origin: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # Orbit classification, e.g. "LEO", "MEO", "GEO" (optional)
    orbit_type: Mapped[str | None] = mapped_column(String, nullable=True, default=None)


