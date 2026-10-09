from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, DateTime
from backend.app.core.database import Base

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    cpu_percent = Column(Float, nullable=False)
    memory_percent = Column(Float, nullable=False)
    memory_used_mb = Column(Float, nullable=False)
    memory_total_mb = Column(Float, nullable=False)
    disk_percent = Column(Float, nullable=False)
    disk_used_gb = Column(Float, nullable=False)
    disk_total_gb = Column(Float, nullable=False)
    network_sent_mb = Column(Float, nullable=False, default=0.0)
    network_recv_mb = Column(Float, nullable=False, default=0.0)
    process_count = Column(Integer, nullable=False, default=0)
