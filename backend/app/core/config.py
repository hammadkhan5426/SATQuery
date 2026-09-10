from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_title: str = "SATQuery API"
    app_description: str = "Backend API for SATQuery"
    app_version: str = "0.1.0"
    api_key: str

    # Database connection URL read from .env (DATABASE_URL).
    # An empty string indicates to fall back to the SQLite default in database.py.
    database_url: str = ""

    # Comma-separated list of allowed CORS origins read from .env (CORS_ORIGINS)
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Local directory where uploaded satellite images are stored on disk.
    # Relative paths are resolved against the backend/ directory at runtime.
    image_storage_dir: str = "storage/images"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Splits the comma-separated cors_origins string into a clean list for CORSMiddleware."""
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()

