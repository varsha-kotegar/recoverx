import os
import psutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.backup import Backup
from backend.app.models.incident import Incident
from backend.app.schemas.diagnostic import (
    DiagnosticReportResponse,
    DiagnosticCheckResult
)
from backend.app.core.logging_config import logger

class DiagnosticService:
    @staticmethod
    def run_all_diagnostics(db: Session) -> DiagnosticReportResponse:
        """
        Run fixed allowlist of safe system health, integrity, and storage diagnostics.
        Never executes arbitrary unvetted shell commands.
        """
        now = datetime.now(timezone.utc)
        results: List[DiagnosticCheckResult] = []
        recent_failures: List[Dict[str, Any]] = []
        recommendations: List[str] = []

        passed_count = 0
        warn_count = 0
        failed_count = 0

        # Check 1: Storage & Directory Write Permissions
        try:
            test_file = settings.DATA_DIR / ".diag_write_test"
            with open(test_file, "w") as f:
                f.write("healthcheck")
            test_file.unlink()

            disk_usage = psutil.disk_usage(str(settings.DATA_DIR))
            free_gb = disk_usage.free / (1024 ** 3)
            
            if free_gb < 1.0:
                status = "WARN"
                warn_count += 1
                msg = f"Data directory is writable, but free storage is low: {free_gb:.2f} GB remaining."
                rec = "Free up storage space or configure a larger volume for backups."
                recommendations.append(rec)
            else:
                status = "PASS"
                passed_count += 1
                msg = f"Data and backup directories are writable. Available space: {free_gb:.2f} GB."
                rec = None

            results.append(DiagnosticCheckResult(
                name="Storage Writable & Capacity Check",
                status=status,
                category="storage",
                message=msg,
                details={"data_dir": str(settings.DATA_DIR), "free_gb": round(free_gb, 2)},
                suggested_action=rec
            ))
        except Exception as e:
            failed_count += 1
            results.append(DiagnosticCheckResult(
                name="Storage Writable Check",
                status="FAIL",
                category="storage",
                message=f"Cannot write to storage directory: {str(e)}",
                details={"error": str(e)},
                suggested_action="Check user permissions on backend/data directory."
            ))
            recommendations.append("Fix filesystem permissions on application data directory.")

        # Check 2: SQLite Database Integrity Check
        try:
            db_check_result = db.execute(text("PRAGMA integrity_check;")).scalar()
            if db_check_result == "ok":
                passed_count += 1
                results.append(DiagnosticCheckResult(
                    name="Database PRAGMA Integrity Check",
                    status="PASS",
                    category="database",
                    message="SQLite database passed internal B-tree and page integrity checks.",
                    details={"pragma_result": "ok"}
                ))
            else:
                failed_count += 1
                results.append(DiagnosticCheckResult(
                    name="Database PRAGMA Integrity Check",
                    status="FAIL",
                    category="database",
                    message=f"Database integrity check returned issues: {db_check_result}",
                    details={"pragma_result": db_check_result},
                    suggested_action="Backup current database and run vacuum/rebuild."
                ))
                recommendations.append("Database integrity error detected. Restore from safe snapshot.")
        except Exception as e:
            failed_count += 1
            results.append(DiagnosticCheckResult(
                name="Database PRAGMA Integrity Check",
                status="FAIL",
                category="database",
                message=f"Database query error: {str(e)}",
                suggested_action="Check SQLite database file locks and connectivity."
            ))

        # Check 3: Host Memory Availability
        try:
            mem = psutil.virtual_memory()
            avail_mb = mem.available / (1024 * 1024)
            if mem.percent > settings.MEMORY_CRITICAL_THRESHOLD:
                failed_count += 1
                results.append(DiagnosticCheckResult(
                    name="Memory Availability Check",
                    status="FAIL",
                    category="memory",
                    message=f"Memory utilization is critical ({mem.percent}%). Available: {avail_mb:.0f} MB.",
                    suggested_action="Identify and terminate high-memory consuming processes."
                ))
                recommendations.append("Severe memory pressure detected. Add RAM or restart services.")
            elif mem.percent > settings.MEMORY_WARNING_THRESHOLD:
                warn_count += 1
                results.append(DiagnosticCheckResult(
                    name="Memory Availability Check",
                    status="WARN",
                    category="memory",
                    message=f"Memory utilization is elevated ({mem.percent}%). Available: {avail_mb:.0f} MB.",
                    suggested_action="Monitor memory usage trends."
                ))
            else:
                passed_count += 1
                results.append(DiagnosticCheckResult(
                    name="Memory Availability Check",
                    status="PASS",
                    category="memory",
                    message=f"System memory is healthy ({mem.percent}% used, {avail_mb:.0f} MB free).",
                    details={"total_mb": round(mem.total / (1024*1024), 2), "used_mb": round(mem.used / (1024*1024), 2)}
                ))
        except Exception as e:
            warn_count += 1
            results.append(DiagnosticCheckResult(
                name="Memory Availability Check",
                status="WARN",
                category="memory",
                message=f"Could not read memory statistics: {str(e)}"
            ))

        # Check 4: Allowed Root Directories Safety Check
        missing_roots = []
        for r in settings.ALLOWED_ROOTS:
            if not Path(r).exists():
                missing_roots.append(r)
        if missing_roots:
            warn_count += 1
            results.append(DiagnosticCheckResult(
                name="Permitted Roots Path Verification",
                status="WARN",
                category="security",
                message=f"{len(missing_roots)} permitted root path(s) do not exist on disk.",
                details={"missing": missing_roots},
                suggested_action="Create missing directories or update ALLOWED_ROOTS in settings."
            ))
        else:
            passed_count += 1
            results.append(DiagnosticCheckResult(
                name="Permitted Roots Path Verification",
                status="PASS",
                category="security",
                message=f"All {len(settings.ALLOWED_ROOTS)} permitted security root directories are accessible.",
                details={"allowed_roots": settings.ALLOWED_ROOTS}
            ))

        # Check 5: Recent Failures and Incidents Audit
        failed_backups = db.query(Backup).filter(Backup.status == "FAILED").order_by(Backup.created_at.desc()).limit(5).all()
        for fb in failed_backups:
            recent_failures.append({
                "type": "backup_failure",
                "id": fb.id,
                "timestamp": fb.created_at.isoformat(),
                "details": fb.error_message or "Unknown failure"
            })

        open_incidents = db.query(Incident).filter(Incident.status == "OPEN").order_by(Incident.first_detected_at.desc()).all()
        for inc in open_incidents:
            recent_failures.append({
                "type": "open_incident",
                "id": inc.id,
                "title": inc.title,
                "severity": inc.severity,
                "detected": inc.first_detected_at.isoformat()
            })

        if open_incidents:
            warn_count += 1
            results.append(DiagnosticCheckResult(
                name="Active Incident Audit",
                status="WARN",
                category="incidents",
                message=f"{len(open_incidents)} unresolved operational incident(s) detected.",
                details={"open_incident_ids": [i.id for i in open_incidents]},
                suggested_action="Review and resolve open incidents in Incident Management."
            ))
            recommendations.append("Investigate and clear open operational alerts.")
        else:
            passed_count += 1
            results.append(DiagnosticCheckResult(
                name="Active Incident Audit",
                status="PASS",
                category="incidents",
                message="No open or unacknowledged incidents in the queue."
            ))

        # Determine overall health
        if failed_count > 0:
            overall_health = "CRITICAL"
        elif warn_count > 0:
            overall_health = "DEGRADED"
        else:
            overall_health = "HEALTHY"

        if not recommendations:
            recommendations.append("System is functioning within normal parameters. Routine monitoring active.")

        logger.info(
            f"Diagnostic run completed. Overall health: {overall_health} (Passed: {passed_count}, Warn: {warn_count}, Failed: {failed_count})",
            extra={"component": "diagnostic", "event_type": "diagnostic_completed"}
        )

        return DiagnosticReportResponse(
            generated_at=now,
            overall_health=overall_health,
            checks_run=len(results),
            passed_count=passed_count,
            warn_count=warn_count,
            failed_count=failed_count,
            results=results,
            recent_failures=recent_failures,
            recommendations=recommendations
        )
