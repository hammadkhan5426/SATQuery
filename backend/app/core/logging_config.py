import logging
from pathlib import Path
import sys

# Anchor the log file to backend/app.log using an absolute path based on this file's location
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # -> backend/
LOG_FILE = BASE_DIR / "app.log"
LOG_FORMAT = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"


def setup_logging():
    """Configure logging to output to both the console and backend/app.log."""
    logging.basicConfig(
        level=logging.INFO,
        format=LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
        ],
        force=True,
    )

