from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class LogEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    severity: str
    component: str
    event_type: str
    message: str
    related_id: Optional[str] = None
    extra_metadata: Optional[str] = None

class LogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    logs: List[LogEntryResponse]
