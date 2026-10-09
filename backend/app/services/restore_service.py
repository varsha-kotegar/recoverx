import os
import json
import shutil
import zipfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.backup import Backup
from backend.app.models.restore import Restore
from backend.app.schemas.restore import (
    RestoreResponse,
    RestoreListResponse,
    RestorePreviewResponse,
    RestoreFileResult
)
from backend.app.utils.path_validator import (
    validate_safe_path,
    is_safe_archive_entry,
    SecurityPathError
)
from backend.app.utils.hashing import calculate_sha256_file
from backend.app.core.logging_config import logger
from backend.app.services.incident_service import IncidentService

class RestoreService:
    @staticmethod
    def generate_restore_id() -> str:
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        rand_suffix = uuid.uuid4().hex[:6]
        return f"rst_{now_str}_{rand_suffix}"

    @staticmethod
    def preview_restore(db: Session, backup_id: str, destination_path_str: str) -> RestorePreviewResponse:
        """Preview the restore operation, detecting file conflicts and validating destination security."""
        backup_record = db.query(Backup).filter(Backup.id == backup_id).first()
        if not backup_record:
            raise KeyError(f"Backup '{backup_id}' not found.")

        dest_path = validate_safe_path(destination_path_str, must_exist=False)

        manifest_dict = json.loads(backup_record.manifest_json) if backup_record.manifest_json else {}
        files_list = manifest_dict.get("files", [])

        files_to_restore = [f["rel_path"] for f in files_list]
        total_bytes = manifest_dict.get("total_uncompressed_bytes", 0)

        conflicts: List[str] = []
        warnings: List[str] = []

        if dest_path.exists():
            for rel_file in files_to_restore:
                target_file = dest_path / rel_file
                if target_file.exists():
                    conflicts.append(rel_file)

        if conflicts:
            warnings.append(f"{len(conflicts)} existing file(s) in the target destination will be affected if overwrite is enabled.")
        else:
            warnings.append("No file conflicts detected. Destination is clear.")

        return RestorePreviewResponse(
            backup_id=backup_id,
            destination_path=str(dest_path),
            file_count=len(files_to_restore),
            total_bytes=total_bytes,
            files_to_restore=files_to_restore,
            conflicts_exist=len(conflicts) > 0,
            conflicting_files=conflicts,
            safe_to_proceed=True,
            warning_notes=warnings
        )

    @staticmethod
    def execute_restore(
        db: Session,
        backup_id: str,
        destination_path_str: str,
        overwrite_existing: bool = False
    ) -> Restore:
        """
        Safely restore files from verified backup into destination directory.
        Uses staging area and atomic file operations.
        """
        restore_id = RestoreService.generate_restore_id()
        backup_record = db.query(Backup).filter(Backup.id == backup_id).first()
        if not backup_record:
            raise KeyError(f"Backup '{backup_id}' not found.")

        archive_path = Path(backup_record.archive_path)
        if not archive_path.exists():
            raise FileNotFoundError(f"Backup archive file '{archive_path}' does not exist.")

        # 1. Validate destination path
        dest_path = validate_safe_path(destination_path_str, must_exist=False)
        dest_path.mkdir(parents=True, exist_ok=True)

        staging_dir = settings.RESTORE_STAGING_DIR / f"stage_{restore_id}"
        staging_dir.mkdir(parents=True, exist_ok=True)

        restored_files_report: List[Dict[str, Any]] = []
        bytes_restored = 0
        overall_status = "SUCCESS"
        error_msg: Optional[str] = None

        try:
            # 2. Extract to staging directory and validate entry paths
            manifest_dict = json.loads(backup_record.manifest_json) if backup_record.manifest_json else {}
            manifest_files_map = {f["rel_path"]: f for f in manifest_dict.get("files", [])}

            with zipfile.ZipFile(archive_path, "r") as zf:
                for member in zf.namelist():
                    if member == "manifest.json" or member.endswith("/"):
                        continue
                    
                    if not member.startswith("data/"):
                        logger.warning(f"Skipping unexpected archive entry: {member}")
                        continue

                    rel_payload_name = member[len("data/"):]

                    # Security check against Zip Slip / path traversal
                    if not is_safe_archive_entry(rel_payload_name):
                        raise SecurityPathError(f"Malicious or unsafe entry detected in archive: '{member}'")

                    # Extract entry to staging
                    extracted_stage_file = staging_dir / rel_payload_name
                    extracted_stage_file.parent.mkdir(parents=True, exist_ok=True)

                    with zf.open(member) as source_f, open(extracted_stage_file, "wb") as target_f:
                        shutil.copyfileobj(source_f, target_f)

            # 3. Verify extracted staging files against manifest and copy to destination
            for rel_path, meta in manifest_files_map.items():
                staged_file = staging_dir / rel_path
                target_dest_file = dest_path / rel_path

                if not staged_file.exists():
                    restored_files_report.append({
                        "rel_path": rel_path,
                        "restored_bytes": 0,
                        "sha256": "",
                        "status": "FAILED",
                        "error": "Missing from staging extraction"
                    })
                    overall_status = "PARTIAL"
                    continue

                # SHA-256 check
                computed_hash = calculate_sha256_file(staged_file)
                if computed_hash.lower() != meta["sha256"].lower():
                    restored_files_report.append({
                        "rel_path": rel_path,
                        "restored_bytes": 0,
                        "sha256": computed_hash,
                        "status": "CORRUPTED",
                        "error": "Extracted hash mismatch against manifest"
                    })
                    overall_status = "PARTIAL"
                    continue

                # Check conflict & overwrite policy
                if target_dest_file.exists() and not overwrite_existing:
                    restored_files_report.append({
                        "rel_path": rel_path,
                        "restored_bytes": 0,
                        "sha256": computed_hash,
                        "status": "SKIPPED",
                        "error": "Target file exists and overwrite was not enabled"
                    })
                    overall_status = "PARTIAL"
                    continue

                # Place file in destination
                target_dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(staged_file, target_dest_file)
                fsize = target_dest_file.stat().st_size
                bytes_restored += fsize

                restored_files_report.append({
                    "rel_path": rel_path,
                    "restored_bytes": fsize,
                    "sha256": computed_hash,
                    "status": "RESTORED",
                    "error": None
                })

            # 4. Record restore in DB
            restore_record = Restore(
                id=restore_id,
                backup_id=backup_id,
                created_at=datetime.now(timezone.utc),
                destination_path=str(dest_path),
                file_count=len(restored_files_report),
                bytes_restored=bytes_restored,
                status=overall_status,
                overwrite_used=overwrite_existing,
                sha256_report_json=json.dumps(restored_files_report),
                error_message=None
            )
            db.add(restore_record)
            db.commit()
            db.refresh(restore_record)

            logger.info(
                f"Restore completed: {restore_id} (Status: {overall_status}, Restored {bytes_restored} bytes to {dest_path})",
                extra={"component": "restore", "event_type": "restore_completed", "related_id": restore_id}
            )
            return restore_record

        except Exception as exc:
            db.rollback()
            overall_status = "FAILED"
            error_msg = str(exc)
            logger.error(
                f"Restore operation {restore_id} failed: {error_msg}",
                extra={"component": "restore", "event_type": "restore_failed", "related_id": restore_id}
            )

            failed_record = Restore(
                id=restore_id,
                backup_id=backup_id,
                created_at=datetime.now(timezone.utc),
                destination_path=str(destination_path_str),
                file_count=0,
                bytes_restored=0,
                status="FAILED",
                overwrite_used=overwrite_existing,
                sha256_report_json=json.dumps(restored_files_report),
                error_message=error_msg
            )
            try:
                db.add(failed_record)
                db.commit()
            except Exception:
                db.rollback()

            IncidentService.record_or_update_incident(
                db=db,
                title="Restore Operation Failed",
                severity="critical",
                category="restore",
                description=f"Restore operation {restore_id} from backup {backup_id} failed: {error_msg}",
                evidence=f"Destination: {destination_path_str}\nError: {error_msg}",
                troubleshooting_steps="1. Verify target directory permissions.\n2. Ensure target path is inside allowed roots.\n3. Check disk space on destination filesystem."
            )
            raise

        finally:
            # Clean up staging directory
            if staging_dir.exists():
                shutil.rmtree(staging_dir, ignore_errors=True)

    @staticmethod
    def list_restores(db: Session) -> RestoreListResponse:
        records = db.query(Restore).order_by(Restore.created_at.desc()).all()
        results: List[RestoreResponse] = []
        for r in records:
            report_dict = json.loads(r.sha256_report_json) if r.sha256_report_json else None
            results.append(
                RestoreResponse(
                    id=r.id,
                    backup_id=r.backup_id,
                    created_at=r.created_at,
                    destination_path=r.destination_path,
                    file_count=r.file_count,
                    bytes_restored=r.bytes_restored,
                    status=r.status,
                    overwrite_used=r.overwrite_used,
                    sha256_report=report_dict,
                    error_message=r.error_message
                )
            )
        return RestoreListResponse(total=len(results), restores=results)

    @staticmethod
    def get_restore(db: Session, restore_id: str) -> RestoreResponse:
        record = db.query(Restore).filter(Restore.id == restore_id).first()
        if not record:
            raise KeyError(f"Restore record '{restore_id}' not found.")
        report_dict = json.loads(record.sha256_report_json) if record.sha256_report_json else None
        return RestoreResponse(
            id=record.id,
            backup_id=record.backup_id,
            created_at=record.created_at,
            destination_path=record.destination_path,
            file_count=record.file_count,
            bytes_restored=record.bytes_restored,
            status=record.status,
            overwrite_used=record.overwrite_used,
            sha256_report=report_dict,
            error_message=record.error_message
        )
