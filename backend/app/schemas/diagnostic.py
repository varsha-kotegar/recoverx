from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class DiagnosticCheckResult(BaseModel):
    name: str
    status: str # "PASS", "WARN", "FAIL"
    category: str
    message: str
    details: Optional[Dict[str, Any]] = None
    suggested_action: Optional[str] = None

class DiagnosticReportResponse(BaseModel):
    generated_at: datetime
    overall_health: str # "HEALTHY", "DEGRADED", "CRITICAL"
    checks_run: int
    passed_count: int
    warn_count: int
    failed_count: int
    results: List[DiagnosticCheckResult]
    recent_failures: List[Dict[str, Any]]
    recommendations: List[str]
