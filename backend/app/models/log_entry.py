from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from backend.app.core.database import Base

class LogEntry(Base):
    __tablename__ = "diagnostic_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    severity = Column(String(32), default="INFO", index=True) # INFO, WARNING, ERROR, CRITICAL
    component = Column(String(64), default="system", index=True) # monitor, backup, restore, integrity, incident, api
    event_type = Column(String(64), default="general", index=True)
    message = Column(Text, nullable=False)
    related_id = Column(String(64), nullable=True, index=True) # e.g. backup_id, incident_id
    extra_metadata = Column(Text, nullable=True) # JSON or additional context
