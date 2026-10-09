from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.backup import (
    BackupCreateRequest,
    BackupResponse,
    BackupListResponse,
    BackupVerifyResponse
)
from backend.app.services.backup_service import BackupService
from backend.app.services.integrity_service import IntegrityService
from backend.app.utils.path_validator import SecurityPathError

router = APIRouter(prefix="/backups", tags=["Backups"])

@router.post("", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
def create_backup(payload: BackupCreateRequest, db: Session = Depends(get_db)):
    """Create a new secure ZIP backup archive with embedded SHA-256 manifest."""
    try:
        backup = BackupService.create_backup(
            db=db,
            source_path_str=payload.source_path,
            label=payload.label
        )
        return BackupService.get_backup(db, backup.id)
    except SecurityPathError as spe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(spe))
    except FileNotFoundError as fne:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fne))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Backup creation failed: {str(e)}")

@router.get("", response_model=BackupListResponse)
def list_backups(db: Session = Depends(get_db)):
    """List all created backup archives."""
    return BackupService.list_backups(db)

@router.get("/{backup_id}", response_model=BackupResponse)
def get_backup(backup_id: str, db: Session = Depends(get_db)):
    """Get metadata and manifest for a specific backup."""
    try:
        return BackupService.get_backup(db, backup_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{backup_id}/verify", response_model=BackupVerifyResponse)
def verify_backup_integrity(backup_id: str, db: Session = Depends(get_db)):
    """Verify archive integrity and individual file SHA-256 hashes against manifest."""
    try:
        return IntegrityService.verify_backup(db, backup_id)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except FileNotFoundError as fne:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fne))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Verification failed: {str(e)}")

@router.delete("/{backup_id}")
def delete_backup(backup_id: str, db: Session = Depends(get_db)):
    """Delete a backup record and remove its archive from disk."""
    try:
        BackupService.delete_backup(db, backup_id)
        return {"success": True, "message": f"Backup '{backup_id}' removed successfully."}
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete backup: {str(e)}")
