from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from backend.app.core.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True) # e.g. inc_20261009_120000
    title = Column(String(255), nullable=False)
    severity = Column(String(32), default="warning") # informational, warning, critical
    category = Column(String(64), default="system") # cpu, memory, disk, backup, integrity, restore, system, simulated
    description = Column(Text, nullable=False)
    status = Column(String(32), default="OPEN") # OPEN, ACKNOWLEDGED, RESOLVED
    first_detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    last_observed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    evidence = Column(Text, nullable=True) # Measured metric values or stack / context
    troubleshooting_steps = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
