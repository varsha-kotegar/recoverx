from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AppSettingsSchema(BaseModel):
    cpu_warning_threshold: float = Field(..., ge=1, le=100)
    cpu_critical_threshold: float = Field(..., ge=1, le=100)
    memory_warning_threshold: float = Field(..., ge=1, le=100)
    memory_critical_threshold: float = Field(..., ge=1, le=100)
    disk_warning_threshold: float = Field(..., ge=1, le=100)
    disk_critical_threshold: float = Field(..., ge=1, le=100)
    polling_interval_seconds: int = Field(..., ge=1, le=300)
    metrics_retention_hours: int = Field(..., ge=1, le=720)
    demo_mode: bool
    allowed_roots: List[str]
    backup_storage_path: str

class SettingsUpdateResponse(BaseModel):
    success: bool
    message: str
    settings: AppSettingsSchema
