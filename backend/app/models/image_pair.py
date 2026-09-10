from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ImagePair(Base):
    __tablename__ = "image_pairs"

    # Unique primary key that auto-increments for each new pair
    id: Mapped[int] = mapped_column(primary_key=True)

    # The two linked images — both reference existing SatelliteImage records
    before_image_id: Mapped[int] = mapped_column(
        ForeignKey("satellite_images.id"), nullable=False
    )
    after_image_id: Mapped[int] = mapped_column(
        ForeignKey("satellite_images.id"), nullable=False
    )

    # Optional human-readable label, e.g. "Port Expansion Bi-Temporal"
    label: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    # When this pairing was created
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
