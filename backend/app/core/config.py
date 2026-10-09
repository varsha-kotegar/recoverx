import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "RecoverX"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEMO_MODE: bool = True

    # Base workspace directory (c:\PROJECTS\RECOVERX)
    BASE_DIR: Path = Path(__file__).resolve().parents[3]
    DATA_DIR: Path = BASE_DIR / "backend" / "data"
    BACKUP_DIR: Path = DATA_DIR / "backups"
    RESTORE_STAGING_DIR: Path = DATA_DIR / "restore_staging"
    LOGS_DIR: Path = BASE_DIR / "backend" / "logs"

    # SQLite database URL
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'recoverx.db'}"

    # Allowed roots for backup and restore (security barrier)
    ALLOWED_ROOTS: List[str] = [
        str(BASE_DIR.resolve()),
        str((BASE_DIR / "sample_data").resolve()),
        str(DATA_DIR.resolve()),
    ]

    # Monitoring & Threshold Defaults
    CPU_WARNING_THRESHOLD: float = 75.0
    CPU_CRITICAL_THRESHOLD: float = 90.0
    MEMORY_WARNING_THRESHOLD: float = 80.0
    MEMORY_CRITICAL_THRESHOLD: float = 95.0
    DISK_WARNING_THRESHOLD: float = 80.0
    DISK_CRITICAL_THRESHOLD: float = 90.0
    POLLING_INTERVAL_SECONDS: int = 5
    METRICS_RETENTION_HOURS: int = 48

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

# Ensure critical directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
settings.RESTORE_STAGING_DIR.mkdir(parents=True, exist_ok=True)
settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
