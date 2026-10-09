import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from sqlalchemy.orm import Session

from backend.app.models.backup import Backup
from backend.app.schemas.backup import BackupVerifyResponse
from backend.app.utils.hashing import calculate_sha256_file, calculate_sha256_bytes
from backend.app.core.logging_config import logger
from backend.app.services.incident_service import IncidentService

class IntegrityService:
    @staticmethod
    def verify_backup(db: Session, backup_id: str) -> BackupVerifyResponse:
        """
        Perform rigorous SHA-256 cryptographic verification of the backup archive
        and every individual file inside its manifest.
        """
        record = db.query(Backup).filter(Backup.id == backup_id).first()
        if not record:
            raise KeyError(f"Backup with ID '{backup_id}' not found.")

        archive_path = Path(record.archive_path)
        if not archive_path.exists() or not archive_path.is_file():
            record.verification_status = "ERROR"
            db.commit()
            raise FileNotFoundError(f"Backup archive file not found on disk at {archive_path}")

        now = datetime.now(timezone.utc)
        record.last_verified_at = now

        corrupted_files: List[str] = []
        archive_checksum_match = False
        manifest_checksum_match = True
        verified_files_count = 0

        try:
            # 1. Compute overall archive SHA-256
            computed_archive_hash = calculate_sha256_file(archive_path)
            archive_checksum_match = (computed_archive_hash.lower() == record.sha256_checksum.lower())

            # 2. Test ZIP archive integrity and extract manifest
            with zipfile.ZipFile(archive_path, "r") as zf:
                # Test CRC for all entries
                bad_file = zf.testzip()
                if bad_file:
                    corrupted_files.append(f"CRC check failed for: {bad_file}")
                    manifest_checksum_match = False

                # Read embedded manifest
                if "manifest.json" not in zf.namelist():
                    corrupted_files.append("Missing embedded manifest.json in archive")
                    manifest_checksum_match = False
                    manifest_data = None
                else:
                    manifest_raw = zf.read("manifest.json")
                    manifest_data = json.loads(manifest_raw.decode("utf-8"))

                # 3. Verify individual file hashes if manifest is present
                if manifest_data and "files" in manifest_data:
                    for entry in manifest_data["files"]:
                        rel_path = entry["rel_path"]
                        expected_hash = entry["sha256"]
                        arc_name = f"data/{rel_path}"

                        if arc_name not in zf.namelist():
                            corrupted_files.append(f"{rel_path} (missing from archive data payload)")
                            manifest_checksum_match = False
                            continue

                        file_bytes = zf.read(arc_name)
                        actual_file_hash = calculate_sha256_bytes(file_bytes)
                        if actual_file_hash.lower() != expected_hash.lower():
                            corrupted_files.append(f"{rel_path} (hash mismatch: expected {expected_hash[:8]}..., got {actual_file_hash[:8]}...)")
                            manifest_checksum_match = False
                        else:
                            verified_files_count += 1

            # Determine overall outcome
            if archive_checksum_match and manifest_checksum_match and len(corrupted_files) == 0:
                record.verification_status = "VERIFIED"
                msg = f"Backup {backup_id} successfully verified! All {verified_files_count} file checksums matched."
                logger.info(msg, extra={"component": "integrity", "event_type": "integrity_verified", "related_id": backup_id})
            else:
                record.verification_status = "CORRUPTED"
                msg = f"Integrity check failed for backup {backup_id}! Corruption or hash discrepancy detected."
                logger.error(msg, extra={"component": "integrity", "event_type": "integrity_failed", "related_id": backup_id})

                # Raise incident for corruption
                IncidentService.record_or_update_incident(
                    db=db,
                    title="Backup Integrity Verification Failure",
                    severity="critical",
                    category="integrity",
                    description=f"Backup {backup_id} failed cryptographic SHA-256 verification. Corrupted files: {len(corrupted_files)}",
                    evidence=f"Archive Checksum Match: {archive_checksum_match}\nManifest Match: {manifest_checksum_match}\nCorrupted items:\n" + "\n".join(corrupted_files[:5]),
                    troubleshooting_steps="1. Quarantine the affected backup.\n2. Verify filesystem health and storage media.\n3. Restore from an earlier verified snapshot."
                )

            db.commit()
            db.refresh(record)

            return BackupVerifyResponse(
                backup_id=backup_id,
                verification_status=record.verification_status,
                archive_checksum_match=archive_checksum_match,
                manifest_checksum_match=manifest_checksum_match,
                verified_files_count=verified_files_count,
                corrupted_files=corrupted_files,
                message=msg,
                verified_at=now
            )

        except Exception as exc:
            record.verification_status = "ERROR"
            db.commit()
            err_msg = f"Integrity verification exception for {backup_id}: {str(exc)}"
            logger.error(err_msg, extra={"component": "integrity", "event_type": "integrity_error", "related_id": backup_id})

            IncidentService.record_or_update_incident(
                db=db,
                title="Integrity Verification Process Error",
                severity="warning",
                category="integrity",
                description=f"Integrity check crashed while inspecting backup {backup_id}: {str(exc)}",
                evidence=f"Backup ID: {backup_id}\nError: {str(exc)}",
                troubleshooting_steps="Check archive file permissions and format."
            )

            return BackupVerifyResponse(
                backup_id=backup_id,
                verification_status="ERROR",
                archive_checksum_match=False,
                manifest_checksum_match=False,
                verified_files_count=0,
                corrupted_files=[str(exc)],
                message=err_msg,
                verified_at=now
            )
