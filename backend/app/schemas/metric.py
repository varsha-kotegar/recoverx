from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class MetricPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    network_sent_mb: float
    network_recv_mb: float
    process_count: int

class SystemDiskInfo(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    total_gb: float
    used_gb: float
    free_gb: float
    percent: float

class SystemNetworkInfo(BaseModel):
    interface: str
    bytes_sent_mb: float
    bytes_recv_mb: float
    packets_sent: int
    packets_recv: int
    is_up: bool

class SystemSummary(BaseModel):
    hostname: str
    platform: str
    os_name: str
    os_version: str
    architecture: str
    python_version: str
    boot_time: datetime
    uptime_seconds: float
    cpu_count_logical: int
    cpu_count_physical: int
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    process_count: int
    system_status: str # "healthy", "warning", "critical"
    status_reasons: List[str]
    total_backups: int
    last_successful_backup: Optional[datetime]
    open_incidents_count: int
