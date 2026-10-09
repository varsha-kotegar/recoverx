from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text
from backend.app.core.database import Base

class Backup(Base):
    __tablename__ = "backups"

    id = Column(String(64), primary_key=True, index=True) # e.g. bkp_20261009_120000
    label = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    archive_format = Column(String(32), default="zip")
    archive_filename = Column(String(255), nullable=False)
    archive_path = Column(String(512), nullable=False)
    source_path = Column(String(512), nullable=False)
    file_count = Column(Integer, default=0)
    uncompressed_bytes = Column(Integer, default=0)
    archive_size_bytes = Column(Integer, default=0)
    sha256_checksum = Column(String(64), nullable=False)
    status = Column(String(32), default="SUCCESS") # SUCCESS, FAILED
    verification_status = Column(String(32), default="UNVERIFIED") # UNVERIFIED, VERIFIED, CORRUPTED, ERROR
    last_verified_at = Column(DateTime, nullable=True)
    manifest_json = Column(Text, nullable=True) # JSON containing list of files, hashes, sizes
    error_message = Column(Text, nullable=True)
