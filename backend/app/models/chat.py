from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    # Unique primary key that auto-increments for each new session
    id: Mapped[int] = mapped_column(primary_key=True)

    # A short human-readable title for this session (e.g. "Port Expansion Bi-Temporal")
    title: Mapped[str] = mapped_column(String, nullable=False)

    # When this session was first created
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # One session has many messages; deleting a session deletes its messages too
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Which session this message belongs to
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id"), nullable=False
    )

    # Who sent it: "user" or "assistant"
    sender: Mapped[str] = mapped_column(String, nullable=False)

    # The actual message text (Text, not String, since messages can be long)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # When this message was sent
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Link back to the parent session
    session: Mapped["ChatSession"] = relationship(back_populates="messages")
