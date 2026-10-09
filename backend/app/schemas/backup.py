from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class BackupManifestEntry(BaseModel):
    rel_path: str
    size_bytes: int
    sha256: str
    modified_time: str

class BackupManifest(BaseModel):
    backup_id: str
    created_at: str
    source_label: str
    file_count: int
    total_uncompressed_bytes: int
    files: List[BackupManifestEntry]

class BackupCreateRequest(BaseModel):
    source_path: str = Field(..., description="Path to source directory or file within permitted roots")
    label: Optional[str] = Field(None, description="Descriptive label for the backup")

class BackupVerifyResponse(BaseModel):
    backup_id: str
    verification_status: str # "VERIFIED", "CORRUPTED", "ERROR"
    archive_checksum_match: bool
    manifest_checksum_match: bool
    verified_files_count: int
    corrupted_files: List[str]
    message: str
    verified_at: datetime

class BackupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    created_at: datetime
    archive_format: str
    archive_filename: str
    archive_path: str
    source_path: str
    file_count: int
    uncompressed_bytes: int
    archive_size_bytes: int
    sha256_checksum: str
    status: str
    verification_status: str
    last_verified_at: Optional[datetime]
    manifest: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class BackupListResponse(BaseModel):
    total: int
    backups: List[BackupResponse]
