from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Schema for creating a new chat session
class ChatSessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


# Schema for returning a chat session
class ChatSessionRead(BaseModel):
    id: int
    title: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Schema for creating a new message within a session
class ChatMessageCreate(BaseModel):
    sender: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1)


# Schema for returning a chat message
class ChatMessageRead(BaseModel):
    id: int
    session_id: int
    sender: str
    content: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
