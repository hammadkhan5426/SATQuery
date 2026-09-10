from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Schema for the /validate endpoint request
class ValidateImagesRequest(BaseModel):
    before_image_id: int = Field(gt=0)
    after_image_id: int = Field(gt=0)


# Schema for the /validate endpoint response
class ValidateImagesResponse(BaseModel):
    compatible: bool
    issues: list[str]


# Schema for the /analyze endpoint request
class AnalyzeRequest(BaseModel):
    image_pair_id: int = Field(gt=0)
    question: str = Field(min_length=1)


# Schema for a single detected region within an analysis result
class Region(BaseModel):
    type: str
    area: float
    confidence: float
    geojson: dict | None = None


# Schema for returning a full analysis result
class AnalysisResultRead(BaseModel):
    id: int
    image_pair_id: int
    question: str
    task: str
    answer: str
    confidence: float
    execution_trace: list[str]
    regions: list[Region]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
