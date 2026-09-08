from collections.abc import Generator
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from core.config import settings

# Default SQLite database path anchored to the backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # -> backend/
SQLITE_DEFAULT_URL = f"sqlite:///{BASE_DIR / 'database.db'}"

# Use DATABASE_URL from .env if provided, otherwise fallback to local SQLite default
SQLALCHEMY_DATABASE_URL = settings.database_url or SQLITE_DEFAULT_URL

# SQLite requires check_same_thread=False to allow multiple threads in FastAPI,
# whereas PostgreSQL does not support or need this connection argument.
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create the SQLAlchemy engine bound to the resolved database URL
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
)

# Create a sessionmaker factory bound to the engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class for SQLAlchemy 2.0 models to inherit from
class Base(DeclarativeBase):
    pass


# Dependency generator that yields a database session and closes it after the request
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
