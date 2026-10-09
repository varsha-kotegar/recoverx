from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.schemas.incident import (
    IncidentResponse,
    IncidentListResponse,
    IncidentResolveRequest,
    IncidentSimulateRequest
)
from backend.app.services.incident_service import IncidentService

router = APIRouter(tags=["Incidents"])

@router.get("/incidents", response_model=IncidentListResponse)
def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    db: Session = Depends(get_db)
):
    """List operational incidents with optional filtering."""
    return IncidentService.list_incidents(db, status_filter=status_filter, category_filter=category_filter)

@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Fetch details of a specific incident."""
    incident = db.query(IncidentService.Incident).filter_by(id=incident_id).first() if hasattr(IncidentService, "Incident") else None
    from backend.app.models.incident import Incident
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident '{incident_id}' not found.")
    return IncidentResponse.model_validate(incident)

@router.post("/incidents/{incident_id}/acknowledge", response_model=IncidentResponse)
def acknowledge_incident(incident_id: str, db: Session = Depends(get_db)):
    """Acknowledge an open incident."""
    try:
        incident = IncidentService.acknowledge_incident(db, incident_id)
        return IncidentResponse.model_validate(incident)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))

@router.post("/incidents/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(incident_id: str, payload: IncidentResolveRequest, db: Session = Depends(get_db)):
    """Resolve an incident by providing resolution troubleshooting notes."""
    try:
        incident = IncidentService.resolve_incident(db, incident_id, payload.resolution_notes)
        return IncidentResponse.model_validate(incident)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))

@router.post("/demo/simulate-incident", response_model=IncidentResponse)
def simulate_incident(payload: IncidentSimulateRequest, db: Session = Depends(get_db)):
    """Simulate an operational incident for training and demonstrations (Demo mode only)."""
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incident simulation is disabled when demo mode is inactive."
        )
    incident = IncidentService.simulate_incident(
        db=db,
        incident_type=payload.incident_type,
        severity=payload.severity or "warning",
        custom_title=payload.custom_title,
        custom_description=payload.custom_description
    )
    return IncidentResponse.model_validate(incident)
