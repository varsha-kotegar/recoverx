from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.log_entry import LogEntry
from backend.app.schemas.log_entry import LogEntryResponse, LogListResponse

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("", response_model=LogListResponse)
def list_logs(
    severity: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    related_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve filtered, paginated diagnostic log entries from SQLite."""
    query = db.query(LogEntry)

    if severity:
        query = query.filter(LogEntry.severity == severity.upper())
    if component:
        query = query.filter(LogEntry.component == component.lower())
    if event_type:
        query = query.filter(LogEntry.event_type == event_type.lower())
    if related_id:
        query = query.filter(LogEntry.related_id == related_id)
    if search:
        query = query.filter(LogEntry.message.ilike(f"%{search}%"))

    total = query.count()
    logs = query.order_by(LogEntry.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return LogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        logs=[LogEntryResponse.model_validate(l) for l in logs]
    )

@router.get("/{log_id}", response_model=LogEntryResponse)
def get_log(log_id: int, db: Session = Depends(get_db)):
    """Fetch an individual log entry."""
    entry = db.query(LogEntry).filter(LogEntry.id == log_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Log entry #{log_id} not found.")
    return LogEntryResponse.model_validate(entry)
