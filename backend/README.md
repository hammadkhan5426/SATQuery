# SATQuery Backend

SATQuery is a satellite-tracking backend REST API built with **FastAPI**, **SQLAlchemy 2.0**, and **SQLite**. It lets you register and manage cataloged satellites by their NORAD catalog identifiers, automatically sync real orbital tracking data from [Celestrak](https://celestrak.org/), and compute a satellite's real-time geographic position using orbital mechanics.

---

## 🚀 Tech Stack

- **Language:** Python 3.12+
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Type-annotated `Mapped` columns)
- **Database:** SQLite (local persistent `database.db` with isolated in-memory testing)
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
- **Validation & Settings:** [Pydantic v2](https://docs.pydantic.dev/) & [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Orbital Mechanics:** [sgp4](https://pypi.org/project/sgp4/) & [skyfield](https://rhodesmill.org/skyfield/)
- **Scheduled Jobs:** [APScheduler](https://apscheduler.readthedocs.io/)
- **HTTP Client:** [httpx](https://www.python-httpx.org/) (used to fetch data from Celestrak)
- **Package Manager:** [uv](https://astral.sh/uv)
- **Testing:** [pytest](https://docs.pytest.org/) & [httpx](https://www.python-httpx.org/)

---

## 🛠️ Setup Instructions

### 1. Prerequisites

Ensure you have Python 3.12+ and `uv` installed on your system.

To install `uv` (if not already installed):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Clone and Navigate to Backend

```bash
git clone <repository-url>
cd SATquery/backend
```

### 3. Install Dependencies

Sync the environment and install all dependencies (including dev tools):
```bash
uv sync
```

### 4. Configure Environment Variables

Create your `.env` file from the provided `.env.example`:
```bash
cp .env.example .env
```

Then edit `.env` and set your own secret `API_KEY` (see the Authentication section below):
```env
APP_TITLE="SATQuery API"
APP_DESCRIPTION="Backend API for SATQuery"
APP_VERSION="0.1.0"
API_KEY="your-secret-key-here"
```

### 5. Run Database Migrations

Apply the Alembic migrations to set up the SQLite database schema:
```bash
uv run alembic upgrade head
```

---

## 💻 Running the Server

Start the local FastAPI development server with automatic reload:
```bash
uv run fastapi dev app/main.py
```

Once running:
- **API Base URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

On startup, a background scheduler also begins running, automatically syncing satellite data from Celestrak's "stations" and "active" groups every 24 hours (see Scheduled Syncing below).

---

## 🔐 Authentication

Every endpoint in this API — including `GET /` and `GET /health` — requires a valid API key. Requests must include it in an `X-API-Key` header:

```bash
curl -H "X-API-Key: your-secret-key-here" http://localhost:8000/satellites/
```

Requests missing the header, or sending an incorrect key, receive a `401 Unauthorized` response.

The API key is configured via the `API_KEY` variable in `.env`. Generate a secure random key with:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🧪 Running Tests

Run the automated test suite using `pytest`:
```bash
uv run pytest -v
```

> **Note:** Tests run against an isolated in-memory SQLite database (`sqlite:///:memory:` with `StaticPool`), ensuring no test operations affect your local `database.db`. The test client automatically authenticates using the `API_KEY` from your `.env`.

---

## 📡 API Endpoints

> All endpoints below require the `X-API-Key` header described in the Authentication section above.

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Service root and metadata | `200 OK` |
| `GET` | `/health` | Health check endpoint | `200 OK` |
| `POST` | `/satellites/` | Create a new satellite record (`name`, `norad_id`) | `201 Created`, `409 Conflict`, `422 Unprocessable Entity` |
| `GET` | `/satellites/` | List satellites with pagination (`?skip=0&limit=10`) and optional name search (`?search=iss`) | `200 OK` |
| `GET` | `/satellites/{satellite_id}` | Retrieve a satellite by its internal ID | `200 OK`, `404 Not Found` |
| `GET` | `/satellites/{satellite_id}/position` | Compute the satellite's real-time latitude, longitude, and altitude from its stored orbital data | `200 OK`, `400 Bad Request` (no orbital data synced yet), `404 Not Found` |
| `PATCH` | `/satellites/{satellite_id}` | Partially update a satellite (`name` and/or `norad_id`) | `200 OK`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity` |
| `DELETE` | `/satellites/{satellite_id}` | Delete a satellite by ID | `204 No Content`, `404 Not Found` |
| `POST` | `/satellites/sync?group=stations` | Fetch real orbital data from Celestrak for a given group and upsert it into the database (creates new satellites, updates existing ones by NORAD ID) | `200 OK`, `400 Bad Request` (invalid group), `502 Bad Gateway` (Celestrak unreachable) |

**Allowed `group` values for `/satellites/sync`:** `stations`, `active`, `starlink`, `gps-ops`, `weather` (defaults to `stations` if omitted).

---

## 🔄 Scheduled Syncing

In addition to manually triggering `POST /satellites/sync`, the app automatically syncs the `stations` and `active` Celestrak groups every 24 hours in the background via APScheduler. This does **not** run immediately on startup (to avoid disruptive syncs during development hot-reloads) — the first automatic run happens 24 hours after the app starts.

---

## 📁 Project Structure

```text
backend/
├── .env                       # Local environment configuration (ignored by git)
├── .env.example                # Template for environment configuration
├── .gitignore                  # Git ignore rules
├── database.db                  # SQLite database file (schema managed by Alembic)
├── app.log                      # Application log file (console output is also mirrored here)
├── alembic/                     # Database migration environment and version scripts
│   ├── env.py                   # Alembic runtime configuration
│   └── versions/                 # Migration revision scripts
├── alembic.ini                   # Alembic configuration file
├── app/                          # Main application package (import root)
│   ├── core/                      # Core configurations and utilities
│   │   ├── auth.py                 # API key verification dependency (X-API-Key header)
│   │   ├── config.py               # Pydantic BaseSettings loading from .env
│   │   ├── database.py             # SQLAlchemy engine, SessionLocal, Base, and get_db dependency
│   │   └── logging_config.py        # Centralized console and file logging setup
│   ├── models/                     # SQLAlchemy database models
│   │   └── satellite.py             # Satellite ORM model (includes TLE orbital data fields)
│   ├── schemas/                    # Pydantic validation and serialization schemas
│   │   └── satellite.py             # SatelliteCreate, SatelliteUpdate, SatelliteRead
│   ├── routers/                    # API route definitions
│   │   ├── health.py                # Health check and root endpoints
│   │   └── satellites.py            # Satellite CRUD, search, position calculation, and Celestrak sync
│   └── main.py                     # FastAPI app entry point: middleware, auth, exception handling, scheduler
├── tests/                        # Test suite
│   ├── conftest.py                # Pytest fixtures and in-memory test database setup
│   └── test_satellites.py          # Endpoint tests: CRUD, search, position, and authentication
├── pyproject.toml                # Project metadata and dependencies
└── uv.lock                       # Dependency lockfile
```

---

## 📝 Logging & CORS

- **Logging:** All logs are formatted with timestamps, log levels, and logger names, and are simultaneously output to the console (`stdout`) and saved to `backend/app.log`.
- **CORS:** Cross-Origin Resource Sharing is enabled out of the box for frontend development on `http://localhost:3000` (React/Next.js) and `http://localhost:5173` (Vite). Update the `origins` list in `app/main.py` once a real deployed frontend URL exists.