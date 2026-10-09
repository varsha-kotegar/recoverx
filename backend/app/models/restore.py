from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean
from backend.app.core.database import Base

class Restore(Base):
    __tablename__ = "restores"

    id = Column(String(64), primary_key=True, index=True) # e.g. rst_20261009_120000
    backup_id = Column(String(64), index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    destination_path = Column(String(512), nullable=False)
    file_count = Column(Integer, default=0)
    bytes_restored = Column(Integer, default=0)
    status = Column(String(32), default="SUCCESS") # SUCCESS, FAILED, PARTIAL
    overwrite_used = Column(Boolean, default=False)
    sha256_report_json = Column(Text, nullable=True) # JSON list of verified restored files and integrity status
    error_message = Column(Text, nullable=True)
