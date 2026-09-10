from logging.config import fileConfig
from pathlib import Path
import sys

from alembic import context

# ---------------------------------------------------------------------------
# Add backend/app to sys.path using an absolute path based on __file__
# This preserves the project's app-as-import-root convention (e.g. from core.database import ...)
# ---------------------------------------------------------------------------
APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

# Import the existing Base, engine, and models from the application
from core.database import SQLALCHEMY_DATABASE_URL, Base, engine  # noqa: E402
from models.satellite import Satellite  # noqa: E402, F401
from models.satellite_image import SatelliteImage  # noqa: E402, F401
from models.chat import ChatMessage, ChatSession  # noqa: E402, F401
from models.image_pair import ImagePair  # noqa: E402, F401
from models.analysis_result import AnalysisResult  # noqa: E402, F401
# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point target_metadata to the application's Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Use the existing absolute SQLite URL from the database configuration
    url = SQLALCHEMY_DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we use the existing engine from core.database.
    """
    # Use the existing SQLAlchemy engine from core.database
    connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

