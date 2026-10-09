from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class RestorePreviewResponse(BaseModel):
    backup_id: str
    destination_path: str
    file_count: int
    total_bytes: int
    files_to_restore: List[str]
    conflicts_exist: bool
    conflicting_files: List[str]
    safe_to_proceed: bool
    warning_notes: List[str]

class RestoreRequest(BaseModel):
    destination_path: str = Field(..., description="Target directory for restore within permitted roots")
    overwrite_existing: bool = Field(False, description="Explicit confirmation required to overwrite existing files")

class RestoreFileResult(BaseModel):
    rel_path: str
    restored_bytes: int
    sha256: str
    status: str # "RESTORED", "SKIPPED", "CORRUPTED", "FAILED"
    error: Optional[str] = None

class RestoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    backup_id: str
    created_at: datetime
    destination_path: str
    file_count: int
    bytes_restored: int
    status: str # "SUCCESS", "FAILED", "PARTIAL"
    overwrite_used: bool
    sha256_report: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None

class RestoreListResponse(BaseModel):
    total: int
    restores: List[RestoreResponse]
