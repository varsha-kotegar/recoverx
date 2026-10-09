import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.incident import Incident
from backend.app.schemas.incident import IncidentResponse, IncidentListResponse
from backend.app.core.logging_config import logger

class IncidentService:
    @staticmethod
    def generate_incident_id() -> str:
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        short_suffix = uuid.uuid4().hex[:6]
        return f"inc_{timestamp_str}_{short_suffix}"

    @staticmethod
    def record_or_update_incident(
        db: Session,
        title: str,
        severity: str,
        category: str,
        description: str,
        evidence: Optional[str] = None,
        troubleshooting_steps: Optional[str] = None
    ) -> Incident:
        """
        Create a new incident or update an existing open/acknowledged incident
        with identical title and category to prevent spamming.
        """
        existing = db.query(Incident).filter(
            Incident.title == title,
            Incident.category == category,
            Incident.status.in_(["OPEN", "ACKNOWLEDGED"])
        ).first()

        now = datetime.now(timezone.utc)
        if existing:
            existing.last_observed_at = now
            existing.evidence = evidence
            if severity == "critical" and existing.severity != "critical":
                existing.severity = "critical"
            db.commit()
            db.refresh(existing)
            return existing

        incident_id = IncidentService.generate_incident_id()
        new_incident = Incident(
            id=incident_id,
            title=title,
            severity=severity.lower(),
            category=category.lower(),
            description=description,
            status="OPEN",
            first_detected_at=now,
            last_observed_at=now,
            evidence=evidence,
            troubleshooting_steps=troubleshooting_steps
        )
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        logger.warning(
            f"Incident Raised: [{severity.upper()}] {title} - {description}",
            extra={"component": "incident", "event_type": "incident_raised", "related_id": incident_id}
        )
        return new_incident

    @staticmethod
    def evaluate_system_metrics(db: Session, metrics: Dict[str, Any]):
        """Evaluate current system metrics against warning and critical thresholds."""
        # CPU evaluation
        cpu = metrics.get("cpu_percent", 0.0)
        if cpu >= settings.CPU_CRITICAL_THRESHOLD:
            IncidentService.record_or_update_incident(
                db=db,
                title="Critical CPU Saturation Detected",
                severity="critical",
                category="cpu",
                description=f"System CPU utilization reached {cpu:.1f}%, exceeding critical threshold ({settings.CPU_CRITICAL_THRESHOLD}%).",
                evidence=f"Measured CPU: {cpu:.1f}%, Active Process Count: {metrics.get('process_count')}",
                troubleshooting_steps="1. Inspect top CPU-consuming processes using Task Manager / top / htop.\n2. Review recently launched background tasks.\n3. Check for runaway loops or thread contention."
            )
        elif cpu >= settings.CPU_WARNING_THRESHOLD:
            IncidentService.record_or_update_incident(
                db=db,
                title="Elevated CPU Utilization Warning",
                severity="warning",
                category="cpu",
                description=f"System CPU utilization reached {cpu:.1f}%, exceeding warning threshold ({settings.CPU_WARNING_THRESHOLD}%).",
                evidence=f"Measured CPU: {cpu:.1f}%, Active Process Count: {metrics.get('process_count')}",
                troubleshooting_steps="1. Monitor CPU trend over the next 5 minutes.\n2. Verify if a scheduled backup or batch job is in progress."
            )

        # Memory evaluation
        mem = metrics.get("memory_percent", 0.0)
        if mem >= settings.MEMORY_CRITICAL_THRESHOLD:
            IncidentService.record_or_update_incident(
                db=db,
                title="Critical Memory Pressure Detected",
                severity="critical",
                category="memory",
                description=f"System memory usage reached {mem:.1f}% ({metrics.get('memory_used_mb')} MB used), exceeding critical threshold ({settings.MEMORY_CRITICAL_THRESHOLD}%).",
                evidence=f"Memory Used: {metrics.get('memory_used_mb')} MB / {metrics.get('memory_total_mb')} MB ({mem:.1f}%)",
                troubleshooting_steps="1. Identify high-memory processes.\n2. Check for memory leaks or uncollected buffers.\n3. Terminate or restart non-critical memory-heavy services."
            )
        elif mem >= settings.MEMORY_WARNING_THRESHOLD:
            IncidentService.record_or_update_incident(
                db=db,
                title="High Memory Usage Warning",
                severity="warning",
                category="memory",
                description=f"System memory usage reached {mem:.1f}% ({metrics.get('memory_used_mb')} MB used), exceeding warning threshold ({settings.MEMORY_WARNING_THRESHOLD}%).",
                evidence=f"Memory Used: {metrics.get('memory_used_mb')} MB / {metrics.get('memory_total_mb')} MB ({mem:.1f}%)",
                troubleshooting_steps="1. Verify cache and buffer allocation.\n2. Track if memory usage steadily increases over time."
            )

        # Disk evaluation
        disk = metrics.get("disk_percent", 0.0)
        if disk >= settings.DISK_CRITICAL_THRESHOLD:
            IncidentService.record_or_update_incident(
                db=db,
                title="Critical Disk Space Depletion",
                severity="critical",
                category="disk",
                description=f"Primary storage partition usage reached {disk:.1f}% ({metrics.get('disk_used_gb')} GB used), exceeding critical threshold ({settings.DISK_CRITICAL_THRESHOLD}%).",
                evidence=f"Disk Used: {metrics.get('disk_used_gb')} GB / {metrics.get('disk_total_gb')} GB ({disk:.1f}%)",
                troubleshooting_steps="1. Clear temporary directories and stale backup archives.\n2. Run database vacuum or log rotation.\n3. Expand disk storage partition."
            )
        elif disk >= settings.DISK_WARNING_THRESHOLD:
            IncidentService.record_or_update_incident(
                db=db,
                title="High Disk Space Usage Warning",
                severity="warning",
                category="disk",
                description=f"Primary storage partition usage reached {disk:.1f}% ({metrics.get('disk_used_gb')} GB used), exceeding warning threshold ({settings.DISK_WARNING_THRESHOLD}%).",
                evidence=f"Disk Used: {metrics.get('disk_used_gb')} GB / {metrics.get('disk_total_gb')} GB ({disk:.1f}%)",
                troubleshooting_steps="1. Review retention policies for logs and backups.\n2. Prune old backup files in the backup directory."
            )

    @staticmethod
    def acknowledge_incident(db: Session, incident_id: str) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise KeyError(f"Incident with ID '{incident_id}' not found.")
        incident.status = "ACKNOWLEDGED"
        db.commit()
        db.refresh(incident)
        logger.info(f"Incident {incident_id} acknowledged.", extra={"component": "incident", "event_type": "incident_acknowledged", "related_id": incident_id})
        return incident

    @staticmethod
    def resolve_incident(db: Session, incident_id: str, resolution_notes: str) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise KeyError(f"Incident with ID '{incident_id}' not found.")
        incident.status = "RESOLVED"
        incident.resolution_notes = resolution_notes
        incident.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(incident)
        logger.info(f"Incident {incident_id} resolved: {resolution_notes}", extra={"component": "incident", "event_type": "incident_resolved", "related_id": incident_id})
        return incident

    @staticmethod
    def list_incidents(db: Session, status_filter: Optional[str] = None, category_filter: Optional[str] = None) -> IncidentListResponse:
        query = db.query(Incident)
        if status_filter:
            query = query.filter(Incident.status == status_filter.upper())
        if category_filter:
            query = query.filter(Incident.category == category_filter.lower())
        
        incidents = query.order_by(Incident.first_detected_at.desc()).all()
        
        open_count = db.query(Incident).filter(Incident.status == "OPEN").count()
        ack_count = db.query(Incident).filter(Incident.status == "ACKNOWLEDGED").count()
        res_count = db.query(Incident).filter(Incident.status == "RESOLVED").count()

        return IncidentListResponse(
            total=len(incidents),
            open_count=open_count,
            acknowledged_count=ack_count,
            resolved_count=res_count,
            incidents=[IncidentResponse.model_validate(i) for i in incidents]
        )

    @staticmethod
    def simulate_incident(
        db: Session,
        incident_type: str,
        severity: str = "warning",
        custom_title: Optional[str] = None,
        custom_description: Optional[str] = None
    ) -> Incident:
        """Simulate an incident for hands-on learning and operational testing."""
        presets = {
            "cpu_spike": {
                "title": custom_title or "Simulated CPU Saturation Spike",
                "severity": severity,
                "category": "cpu",
                "description": custom_description or "Simulated sustained CPU spike at 98.4% across all logical cores.",
                "evidence": "Simulated Metric: CPU 98.4%, Load Average: 8.42, 4.10, 2.05",
                "troubleshooting_steps": "1. Analyze thread dumps.\n2. Verify process CPU affinity.\n3. Check for deadlock / spinlock scenarios."
            },
            "memory_exhaustion": {
                "title": custom_title or "Simulated Memory Exhaustion (OOM Danger)",
                "severity": severity or "critical",
                "category": "memory",
                "description": custom_description or "Simulated heap leak leading to 96.2% memory utilization and paging thrash.",
                "evidence": "Simulated Metric: Memory 96.2%, Swap in use: 85%",
                "troubleshooting_steps": "1. Check kernel dmesg for oom-killer invocations.\n2. Review recent container memory limit configurations."
            },
            "disk_full": {
                "title": custom_title or "Simulated Storage Depletion (/var/log)",
                "severity": severity or "critical",
                "category": "disk",
                "description": custom_description or "Simulated unrotated log expansion filling up disk volume to 99.1%.",
                "evidence": "Simulated Metric: /data partition 99.1% used (50 MB remaining)",
                "troubleshooting_steps": "1. Inspect disk usage with ncdu or du -sh *.\n2. Purge stale debug logs and archives."
            },
            "backup_corruption": {
                "title": custom_title or "Simulated Backup SHA-256 Bit-Rot Detection",
                "severity": "critical",
                "category": "integrity",
                "description": custom_description or "Simulated integrity verification failure: archive SHA-256 mismatch detected.",
                "evidence": "Expected SHA-256: 4a2f8b... Computed SHA-256: 9e71c2...",
                "troubleshooting_steps": "1. Quarantine corrupted archive.\n2. Review storage media SMART diagnostics.\n3. Fall back to secondary replica or previous verified snapshot."
            },
            "service_failure": {
                "title": custom_title or "Simulated System Service Termination",
                "severity": severity or "warning",
                "category": "system",
                "description": custom_description or "Simulated unexpected shutdown of background health collector daemon.",
                "evidence": "Daemon PID exited with exit code 137 (SIGKILL)",
                "troubleshooting_steps": "1. Check system logs / journalctl.\n2. Restart daemon service and verify heartbeat."
            }
        }

        config = presets.get(incident_type.lower(), {
            "title": custom_title or f"Simulated Incident ({incident_type})",
            "severity": severity,
            "category": "simulated",
            "description": custom_description or f"Custom simulated operational event of type '{incident_type}'.",
            "evidence": "Educational demonstration trigger invoked via RecoverX API.",
            "troubleshooting_steps": "Review incident context and verify platform notification pipeline."
        })

        return IncidentService.record_or_update_incident(
            db=db,
            title=config["title"],
            severity=config["severity"],
            category=config["category"],
            description=config["description"],
            evidence=config["evidence"],
            troubleshooting_steps=config["troubleshooting_steps"]
        )
