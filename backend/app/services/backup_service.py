import os
import json
import zipfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.backup import Backup
from backend.app.schemas.backup import BackupResponse, BackupListResponse
from backend.app.utils.path_validator import validate_safe_path, SecurityPathError
from backend.app.utils.hashing import calculate_sha256_file
from backend.app.core.logging_config import logger
from backend.app.services.incident_service import IncidentService

class BackupService:
    @staticmethod
    def generate_backup_id() -> str:
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        rand_suffix = uuid.uuid4().hex[:6]
        return f"bkp_{now_str}_{rand_suffix}"

    @staticmethod
    def create_backup(db: Session, source_path_str: str, label: Optional[str] = None) -> Backup:
        """
        Create a secure, verifiable ZIP backup archive with embedded manifest and SHA-256 checksums.
        """
        backup_id = BackupService.generate_backup_id()
        backup_label = label or f"Backup of {Path(source_path_str).name or 'root'}"

        try:
            # 1. Validate source path against allowed roots and blocklists
            source_path = validate_safe_path(source_path_str, must_exist=True)

            # Prevent backing up the backup storage directory itself to avoid recursive loops
            backup_storage_resolved = settings.BACKUP_DIR.resolve()
            if source_path == backup_storage_resolved or backup_storage_resolved in source_path.parents:
                raise SecurityPathError("Source directory cannot be the backup storage directory or its parent.")

            # 2. Collect files and calculate per-file SHA-256 hashes
            manifest_files: List[Dict[str, Any]] = []
            files_to_pack: List[tuple[Path, str]] = [] # (absolute_path, archive_relative_path)
            total_uncompressed_bytes = 0

            if source_path.is_file():
                file_hash = calculate_sha256_file(source_path)
                file_size = source_path.stat().st_size
                mtime_str = datetime.fromtimestamp(source_path.stat().st_mtime, timezone.utc).isoformat()
                rel_name = source_path.name

                manifest_files.append({
                    "rel_path": rel_name,
                    "size_bytes": file_size,
                    "sha256": file_hash,
                    "modified_time": mtime_str
                })
                files_to_pack.append((source_path, rel_name))
                total_uncompressed_bytes += file_size
            else:
                for root, dirs, filenames in os.walk(source_path):
                    # Sort for deterministic processing
                    dirs.sort()
                    filenames.sort()
                    
                    for fname in filenames:
                        file_path = Path(root) / fname
                        
                        # Do not follow symlinks pointing outside the source root
                        if file_path.is_symlink():
                            try:
                                link_target = file_path.resolve()
                                link_target.relative_to(source_path)
                            except (ValueError, Exception):
                                logger.warning(f"Skipping symlink {file_path} resolving outside source root.")
                                continue

                        if not file_path.is_file():
                            continue

                        try:
                            file_hash = calculate_sha256_file(file_path)
                            file_size = file_path.stat().st_size
                            mtime_str = datetime.fromtimestamp(file_path.stat().st_mtime, timezone.utc).isoformat()
                            rel_name = file_path.relative_to(source_path).as_posix()

                            manifest_files.append({
                                "rel_path": rel_name,
                                "size_bytes": file_size,
                                "sha256": file_hash,
                                "modified_time": mtime_str
                            })
                            files_to_pack.append((file_path, rel_name))
                            total_uncompressed_bytes += file_size
                        except (PermissionError, FileNotFoundError) as fe:
                            logger.warning(f"Could not read file during backup creation: {file_path}: {fe}")
                            continue

            # 3. Build manifest data
            created_at_dt = datetime.now(timezone.utc)
            manifest_dict = {
                "backup_id": backup_id,
                "created_at": created_at_dt.isoformat(),
                "source_label": backup_label,
                "source_path": str(source_path),
                "file_count": len(manifest_files),
                "total_uncompressed_bytes": total_uncompressed_bytes,
                "files": manifest_files
            }
            manifest_json_str = json.dumps(manifest_dict, indent=2)

            # 4. Construct ZIP archive in backup directory
            archive_filename = f"{backup_id}.zip"
            archive_path = settings.BACKUP_DIR / archive_filename

            with zipfile.ZipFile(archive_path, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                # Embed manifest.json at root of archive
                zf.writestr("manifest.json", manifest_json_str)
                for abs_file, rel_arcname in files_to_pack:
                    # Prefix payload inside "data/" subdirectory in ZIP to keep cleanly separated
                    zf.write(abs_file, arcname=f"data/{rel_arcname}")

            # 5. Compute overall archive SHA-256
            archive_size = archive_path.stat().st_size
            archive_sha256 = calculate_sha256_file(archive_path)

            # 6. Save record to DB
            backup_record = Backup(
                id=backup_id,
                label=backup_label,
                created_at=created_at_dt,
                archive_format="zip",
                archive_filename=archive_filename,
                archive_path=str(archive_path.resolve()),
                source_path=str(source_path.resolve()),
                file_count=len(manifest_files),
                uncompressed_bytes=total_uncompressed_bytes,
                archive_size_bytes=archive_size,
                sha256_checksum=archive_sha256,
                status="SUCCESS",
                verification_status="UNVERIFIED",
                manifest_json=manifest_json_str,
                error_message=None
            )
            db.add(backup_record)
            db.commit()
            db.refresh(backup_record)

            logger.info(
                f"Backup created successfully: {backup_id} ({len(manifest_files)} files, {archive_size} bytes)",
                extra={"component": "backup", "event_type": "backup_created", "related_id": backup_id}
            )
            return backup_record

        except Exception as exc:
            db.rollback()
            error_msg = f"Backup failed: {str(exc)}"
            logger.error(
                error_msg,
                extra={"component": "backup", "event_type": "backup_failed", "related_id": backup_id}
            )

            # Record failure in DB for auditing
            failed_record = Backup(
                id=backup_id,
                label=backup_label,
                created_at=datetime.now(timezone.utc),
                archive_format="zip",
                archive_filename=f"{backup_id}.zip",
                archive_path="",
                source_path=str(source_path_str),
                file_count=0,
                uncompressed_bytes=0,
                archive_size_bytes=0,
                sha256_checksum="FAILED",
                status="FAILED",
                verification_status="ERROR",
                manifest_json=None,
                error_message=error_msg
            )
            try:
                db.add(failed_record)
                db.commit()
            except Exception:
                db.rollback()

            # Trigger an incident
            IncidentService.record_or_update_incident(
                db=db,
                title="Backup Operation Failed",
                severity="critical",
                category="backup",
                description=f"Backup creation of '{source_path_str}' failed: {str(exc)}",
                evidence=f"Backup ID: {backup_id}\nError: {str(exc)}",
                troubleshooting_steps="1. Verify permissions of source directory.\n2. Ensure sufficient disk space is available in backup storage volume.\n3. Check that source path is in configured allowed roots."
            )
            raise

    @staticmethod
    def list_backups(db: Session) -> BackupListResponse:
        records = db.query(Backup).order_by(Backup.created_at.desc()).all()
        results: List[BackupResponse] = []
        for r in records:
            manifest_dict = json.loads(r.manifest_json) if r.manifest_json else None
            resp = BackupResponse(
                id=r.id,
                label=r.label,
                created_at=r.created_at,
                archive_format=r.archive_format,
                archive_filename=r.archive_filename,
                archive_path=r.archive_path,
                source_path=r.source_path,
                file_count=r.file_count,
                uncompressed_bytes=r.uncompressed_bytes,
                archive_size_bytes=r.archive_size_bytes,
                sha256_checksum=r.sha256_checksum,
                status=r.status,
                verification_status=r.verification_status,
                last_verified_at=r.last_verified_at,
                manifest=manifest_dict,
                error_message=r.error_message
            )
            results.append(resp)
        return BackupListResponse(total=len(results), backups=results)

    @staticmethod
    def get_backup(db: Session, backup_id: str) -> BackupResponse:
        record = db.query(Backup).filter(Backup.id == backup_id).first()
        if not record:
            raise KeyError(f"Backup '{backup_id}' not found.")
        manifest_dict = json.loads(record.manifest_json) if record.manifest_json else None
        return BackupResponse(
            id=record.id,
            label=record.label,
            created_at=record.created_at,
            archive_format=record.archive_format,
            archive_filename=record.archive_filename,
            archive_path=record.archive_path,
            source_path=record.source_path,
            file_count=record.file_count,
            uncompressed_bytes=record.uncompressed_bytes,
            archive_size_bytes=record.archive_size_bytes,
            sha256_checksum=record.sha256_checksum,
            status=record.status,
            verification_status=record.verification_status,
            last_verified_at=record.last_verified_at,
            manifest=manifest_dict,
            error_message=record.error_message
        )

    @staticmethod
    def delete_backup(db: Session, backup_id: str) -> bool:
        record = db.query(Backup).filter(Backup.id == backup_id).first()
        if not record:
            raise KeyError(f"Backup '{backup_id}' not found.")
        
        # Remove physical archive file if it exists
        if record.archive_path:
            p = Path(record.archive_path)
            if p.exists() and p.is_file():
                try:
                    p.unlink()
                except Exception as e:
                    logger.warning(f"Could not remove backup file {p}: {e}")

        db.delete(record)
        db.commit()
        logger.info(f"Backup {backup_id} deleted.", extra={"component": "backup", "event_type": "backup_deleted", "related_id": backup_id})
        return True
