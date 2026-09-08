from collections.abc import Generator
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Add backend/app to sys.path using an absolute path based on __file__
# This preserves the project's app-as-import-root convention (e.g. from core.database import ...)
# ---------------------------------------------------------------------------
APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from core.config import settings # noqa: E402
from core.database import Base, get_db  # noqa: E402
from main import app  # noqa: E402
from models.satellite import Satellite  # noqa: E402, F401

# In-memory SQLite database using StaticPool to maintain the schema across connections in tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine_test,
)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """TestClient fixture that sets up clean in-memory tables and overrides get_db."""
    # 1. Create all database tables on the in-memory test engine
    Base.metadata.create_all(bind=engine_test)

    # 2. Dependency override for get_db to use test database sessions
    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # 3. Yield TestClient for running requests
    with TestClient(app, headers={"X-API-Key": settings.api_key}) as test_client:
        yield test_client

    # 4. Teardown: clear dependency overrides and drop all tables
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine_test)

