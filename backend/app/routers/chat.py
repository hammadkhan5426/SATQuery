import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.rate_limit import limiter
from models.chat import ChatMessage, ChatSession
from schemas.chat import ChatMessageCreate, ChatMessageRead, ChatSessionCreate, ChatSessionRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["chat"])


# Create a new chat session
@router.post("/", response_model=ChatSessionRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_session(request: Request, payload: ChatSessionCreate, db: Session = Depends(get_db)):
    new_session = ChatSession(title=payload.title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    logger.info(f"Created chat session '{new_session.title}' (ID: {new_session.id})")
    return new_session


# List all chat sessions, most recent first
@router.get("/", response_model=list[ChatSessionRead])
@limiter.limit("60/minute")
def list_sessions(
    request: Request,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sessions


# Get a single session by ID
@router.get("/{session_id}", response_model=ChatSessionRead)
@limiter.limit("60/minute")
def get_session(request: Request, session_id: int, db: Session = Depends(get_db)):
    chat_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Session with ID {session_id} not found.")
    return chat_session


# Delete a session (and all its messages, via cascade)
@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def delete_session(request: Request, session_id: int, db: Session = Depends(get_db)):
    chat_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Session with ID {session_id} not found.")
    db.delete(chat_session)
    db.commit()
    logger.info(f"Deleted chat session with ID {session_id}.")
    return None


# Add a new message to a session
@router.post("/{session_id}/messages", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def add_message(
    request: Request,
    session_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
):
    chat_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Session with ID {session_id} not found.")

    new_message = ChatMessage(
        session_id=session_id, sender=payload.sender, content=payload.content
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message


# List all messages in a session, oldest first (natural reading order)
@router.get("/{session_id}/messages", response_model=list[ChatMessageRead])
@limiter.limit("60/minute")
def list_messages(
    request: Request,
    session_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    chat_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail=f"Session with ID {session_id} not found.")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return messages
