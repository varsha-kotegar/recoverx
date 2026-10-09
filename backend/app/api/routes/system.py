from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.metric import MetricPoint, SystemSummary, SystemDiskInfo, SystemNetworkInfo
from backend.app.services.system_monitor import SystemMonitorService

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/summary", response_model=SystemSummary)
def get_system_summary(db: Session = Depends(get_db)):
    """Get high-level system hardware, OS summary, and health status."""
    return SystemMonitorService.get_system_summary(db)

@router.get("/metrics", response_model=MetricPoint)
def record_and_get_metrics(db: Session = Depends(get_db)):
    """Sample live metrics, record to database history, and return latest point."""
    metric_record = SystemMonitorService.record_metric(db)
    return MetricPoint.model_validate(metric_record)

@router.get("/metrics/history", response_model=List[MetricPoint])
def get_metrics_history(limit: int = Query(60, ge=5, le=300), db: Session = Depends(get_db)):
    """Fetch chronological metrics history for charting."""
    return SystemMonitorService.get_metrics_history(db, limit=limit)

@router.get("/disks", response_model=List[SystemDiskInfo])
def get_disks_info():
    """Fetch filesystem and partition storage metrics."""
    return SystemMonitorService.get_disks()

@router.get("/network", response_model=List[SystemNetworkInfo])
def get_network_info():
    """Fetch per-interface network metrics."""
    return SystemMonitorService.get_network()
