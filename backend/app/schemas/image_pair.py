from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Schema for creating a new image pair
class ImagePairCreate(BaseModel):
    before_image_id: int = Field(gt=0)
    after_image_id: int = Field(gt=0)
    label: str | None = Field(default=None, max_length=200)


# Schema for returning an image pair
class ImagePairRead(BaseModel):
    id: int
    before_image_id: int
    after_image_id: int
    label: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
