from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    severity: str # informational, warning, critical
    category: str
    description: str
    status: str # OPEN, ACKNOWLEDGED, RESOLVED
    first_detected_at: datetime
    last_observed_at: datetime
    evidence: Optional[str] = None
    troubleshooting_steps: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None

class IncidentResolveRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=3, description="Notes detailing how the incident was resolved")

class IncidentSimulateRequest(BaseModel):
    incident_type: str = Field(..., description="e.g. cpu_spike, memory_exhaustion, disk_full, backup_corruption, service_failure")
    severity: Optional[str] = Field("warning", description="informational, warning, critical")
    custom_title: Optional[str] = None
    custom_description: Optional[str] = None

class IncidentListResponse(BaseModel):
    total: int
    open_count: int
    acknowledged_count: int
    resolved_count: int
    incidents: List[IncidentResponse]
