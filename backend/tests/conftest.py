import os
import shutil
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.core.database import init_db, get_db, engine, SessionLocal
from backend.app.models import (
    Metric,
    Backup,
    Restore,
    Incident,
    LogEntry,
    AppSetting
)
from backend.app.main import app

@pytest.fixture(scope="session")
def test_env_dir():
    temp_dir = Path(tempfile.mkdtemp(prefix="recoverx_test_"))
    test_data_dir = temp_dir / "data"
    test_backups_dir = test_data_dir / "backups"
    test_staging_dir = test_data_dir / "staging"
    test_sample_dir = temp_dir / "sample_files"
    test_restore_dir = temp_dir / "restored_output"
    test_logs_dir = temp_dir / "logs"

    test_data_dir.mkdir(parents=True, exist_ok=True)
    test_backups_dir.mkdir(parents=True, exist_ok=True)
    test_staging_dir.mkdir(parents=True, exist_ok=True)
    test_sample_dir.mkdir(parents=True, exist_ok=True)
    test_restore_dir.mkdir(parents=True, exist_ok=True)
    test_logs_dir.mkdir(parents=True, exist_ok=True)

    # Populate sample files
    (test_sample_dir / "file1.txt").write_text("Hello RecoverX Test 1", encoding="utf-8")
    (test_sample_dir / "file2.json").write_text('{"status": "ok", "env": "testing"}', encoding="utf-8")
    sub_dir = test_sample_dir / "nested"
    sub_dir.mkdir(exist_ok=True)
    (sub_dir / "nested_file.conf").write_text("setting=active", encoding="utf-8")

    # Update settings pointers
    old_data_dir = settings.DATA_DIR
    old_backup_dir = settings.BACKUP_DIR
    old_staging_dir = settings.RESTORE_STAGING_DIR
    old_logs_dir = settings.LOGS_DIR
    old_allowed_roots = settings.ALLOWED_ROOTS

    settings.DATA_DIR = test_data_dir
    settings.BACKUP_DIR = test_backups_dir
    settings.RESTORE_STAGING_DIR = test_staging_dir
    settings.LOGS_DIR = test_logs_dir
    settings.ALLOWED_ROOTS = [
        str(temp_dir.resolve()),
        str(settings.BASE_DIR.resolve())
    ]

    # Initialize tables
    init_db()

    yield {
        "root": temp_dir,
        "sample_dir": test_sample_dir,
        "restore_dir": test_restore_dir,
        "backup_dir": test_backups_dir
    }

    # Cleanup
    settings.DATA_DIR = old_data_dir
    settings.BACKUP_DIR = old_backup_dir
    settings.RESTORE_STAGING_DIR = old_staging_dir
    settings.LOGS_DIR = old_logs_dir
    settings.ALLOWED_ROOTS = old_allowed_roots
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="function")
def db_session(test_env_dir):
    db = SessionLocal()
    try:
        # Clear rows between tests for isolation
        db.query(Metric).delete()
        db.query(Backup).delete()
        db.query(Restore).delete()
        db.query(Incident).delete()
        db.query(LogEntry).delete()
        db.query(AppSetting).delete()
        db.commit()
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
