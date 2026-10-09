from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.restore import (
    RestoreRequest,
    RestoreResponse,
    RestoreListResponse,
    RestorePreviewResponse
)
from backend.app.services.restore_service import RestoreService
from backend.app.utils.path_validator import SecurityPathError

router = APIRouter(tags=["Restores"])

@router.post("/backups/{backup_id}/restore/preview", response_model=RestorePreviewResponse)
def preview_restore(backup_id: str, payload: RestoreRequest, db: Session = Depends(get_db)):
    """Preview restoration: detect file conflicts and validate target destination."""
    try:
        return RestoreService.preview_restore(
            db=db,
            backup_id=backup_id,
            destination_path_str=payload.destination_path
        )
    except SecurityPathError as spe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(spe))
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Preview failed: {str(e)}")

@router.post("/backups/{backup_id}/restore", response_model=RestoreResponse)
def restore_backup(backup_id: str, payload: RestoreRequest, db: Session = Depends(get_db)):
    """Perform verified extraction and file restoration from backup."""
    try:
        restore_record = RestoreService.execute_restore(
            db=db,
            backup_id=backup_id,
            destination_path_str=payload.destination_path,
            overwrite_existing=payload.overwrite_existing
        )
        return RestoreService.get_restore(db, restore_record.id)
    except SecurityPathError as spe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(spe))
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except FileNotFoundError as fne:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fne))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Restore operation failed: {str(e)}")

@router.get("/restores", response_model=RestoreListResponse)
def list_restores(db: Session = Depends(get_db)):
    """List historical restore operations."""
    return RestoreService.list_restores(db)

@router.get("/restores/{restore_id}", response_model=RestoreResponse)
def get_restore(restore_id: str, db: Session = Depends(get_db)):
    """Get details of a specific restore operation."""
    try:
        return RestoreService.get_restore(db, restore_id)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
