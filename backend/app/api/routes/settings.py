import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.setting import AppSetting
from backend.app.schemas.setting import AppSettingsSchema, SettingsUpdateResponse
from backend.app.core.logging_config import logger

router = APIRouter(prefix="/settings", tags=["Settings"])

def load_persisted_settings(db: Session) -> AppSettingsSchema:
    """Load settings from DB overrides or fallback to core config defaults."""
    record = db.query(AppSetting).filter(AppSetting.key == "global_config").first()
    if record and record.value:
        try:
            data = json.loads(record.value)
            return AppSettingsSchema(**data)
        except Exception:
            pass

    return AppSettingsSchema(
        cpu_warning_threshold=settings.CPU_WARNING_THRESHOLD,
        cpu_critical_threshold=settings.CPU_CRITICAL_THRESHOLD,
        memory_warning_threshold=settings.MEMORY_WARNING_THRESHOLD,
        memory_critical_threshold=settings.MEMORY_CRITICAL_THRESHOLD,
        disk_warning_threshold=settings.DISK_WARNING_THRESHOLD,
        disk_critical_threshold=settings.DISK_CRITICAL_THRESHOLD,
        polling_interval_seconds=settings.POLLING_INTERVAL_SECONDS,
        metrics_retention_hours=settings.METRICS_RETENTION_HOURS,
        demo_mode=settings.DEMO_MODE,
        allowed_roots=settings.ALLOWED_ROOTS,
        backup_storage_path=str(settings.BACKUP_DIR.resolve())
    )

@router.get("", response_model=AppSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve current platform configuration and thresholds."""
    return load_persisted_settings(db)

@router.put("", response_model=SettingsUpdateResponse)
def update_settings(payload: AppSettingsSchema, db: Session = Depends(get_db)):
    """Update and persist platform configuration."""
    if payload.cpu_warning_threshold >= payload.cpu_critical_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPU warning threshold must be strictly less than critical threshold."
        )
    if payload.memory_warning_threshold >= payload.memory_critical_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory warning threshold must be strictly less than critical threshold."
        )
    if payload.disk_warning_threshold >= payload.disk_critical_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disk warning threshold must be strictly less than critical threshold."
        )

    # Update in-memory singleton
    settings.CPU_WARNING_THRESHOLD = payload.cpu_warning_threshold
    settings.CPU_CRITICAL_THRESHOLD = payload.cpu_critical_threshold
    settings.MEMORY_WARNING_THRESHOLD = payload.memory_warning_threshold
    settings.MEMORY_CRITICAL_THRESHOLD = payload.memory_critical_threshold
    settings.DISK_WARNING_THRESHOLD = payload.disk_warning_threshold
    settings.DISK_CRITICAL_THRESHOLD = payload.disk_critical_threshold
    settings.POLLING_INTERVAL_SECONDS = payload.polling_interval_seconds
    settings.METRICS_RETENTION_HOURS = payload.metrics_retention_hours
    settings.DEMO_MODE = payload.demo_mode
    settings.ALLOWED_ROOTS = payload.allowed_roots

    # Persist to database
    record = db.query(AppSetting).filter(AppSetting.key == "global_config").first()
    json_val = payload.model_dump_json()
    if record:
        record.value = json_val
    else:
        record = AppSetting(key="global_config", value=json_val, description="Global runtime settings")
        db.add(record)
    
    db.commit()

    logger.info("Platform settings updated and persisted to database.", extra={"component": "settings", "event_type": "settings_updated"})

    return SettingsUpdateResponse(
        success=True,
        message="Settings updated successfully.",
        settings=payload
    )
