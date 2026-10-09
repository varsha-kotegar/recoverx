from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.diagnostic import DiagnosticReportResponse
from backend.app.services.diagnostic_service import DiagnosticService

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])

@router.post("/run", response_model=DiagnosticReportResponse)
def run_diagnostics(db: Session = Depends(get_db)):
    """Run full suite of safe system, database, storage, and health diagnostics."""
    return DiagnosticService.run_all_diagnostics(db)
