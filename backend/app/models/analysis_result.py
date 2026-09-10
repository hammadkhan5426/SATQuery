from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    # Unique primary key that auto-increments for each new analysis
    id: Mapped[int] = mapped_column(primary_key=True)

    # Which image pair this analysis was run on
    image_pair_id: Mapped[int] = mapped_column(
        ForeignKey("image_pairs.id"), nullable=False
    )

    # The natural-language question that triggered this analysis
    question: Mapped[str] = mapped_column(Text, nullable=False)

    # What kind of analysis was actually performed, e.g. "change_detection" or "refused"
    task: Mapped[str] = mapped_column(String, nullable=False)

    # The final natural-language answer
    answer: Mapped[str] = mapped_column(Text, nullable=False)

    # Confidence score between 0 and 1
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Ordered list of steps actually executed, e.g. ["validate_images", "change_detection"]
    # Stored as JSON since this is a variable-length list of strings, not a fixed schema
    execution_trace: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # List of detected regions, each a dict with type/area/confidence/geojson
    # Stored as JSON for the same reason — flexible, not a fixed relational schema
    regions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # When this analysis was created
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
