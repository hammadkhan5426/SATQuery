from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class SatelliteImage(Base):
    __tablename__ = "satellite_images"

    # Unique primary key that auto-increments for each new uploaded image
    id: Mapped[int] = mapped_column(primary_key=True)

    # The filename as originally uploaded by the user (for display purposes)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)

    # A generated, safe, unique filename used to store the file on disk
    # (avoids collisions and path issues from arbitrary user-supplied filenames)
    stored_filename: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    # MIME type of the uploaded file, e.g. "image/tiff", "image/png", "image/jpeg"
    content_type: Mapped[str] = mapped_column(String, nullable=False)

    # Size of the uploaded file in bytes
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Sensor that captured the image, e.g. "Sentinel-2", "WorldView-3" (free text, optional)
    sensor: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # Imaging modality, e.g. "Optical", "SAR", "Thermal Infrared" (free text, optional)
    modality: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # Optional link to one of our tracked satellites (not every image needs to be linked)
    satellite_id: Mapped[int | None] = mapped_column(
        ForeignKey("satellites.id"), nullable=True, default=None
    )

    # When the imagery was actually captured (distinct from when it was uploaded to us)
    captured_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, default=None
    )

    # Ground Sample Distance in meters — the resolution of the imagery (optional)
    gsd_meters: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)

    # When this image was uploaded to our system, automatically set to current UTC time
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )