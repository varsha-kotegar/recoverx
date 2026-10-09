import os
import platform
import psutil
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.metric import Metric
from backend.app.models.backup import Backup
from backend.app.models.incident import Incident
from backend.app.schemas.metric import MetricPoint, SystemSummary, SystemDiskInfo, SystemNetworkInfo
from backend.app.core.logging_config import logger

class SystemMonitorService:
    @staticmethod
    def get_current_metrics() -> Dict[str, Any]:
        """Collect live real-time hardware metrics via psutil."""
        cpu_percent = psutil.cpu_percent(interval=None)
        virtual_mem = psutil.virtual_memory()
        
        # Disk usage for the primary root/system partition
        try:
            primary_disk = psutil.disk_usage(str(settings.BASE_DIR.anchor or "/"))
        except Exception:
            primary_disk = psutil.disk_usage("/")
            
        # Network IO counters
        net_io = psutil.net_io_counters()
        process_count = len(psutil.pids())

        return {
            "timestamp": datetime.now(timezone.utc),
            "cpu_percent": float(cpu_percent),
            "memory_percent": float(virtual_mem.percent),
            "memory_used_mb": round(virtual_mem.used / (1024 * 1024), 2),
            "memory_total_mb": round(virtual_mem.total / (1024 * 1024), 2),
            "disk_percent": float(primary_disk.percent),
            "disk_used_gb": round(primary_disk.used / (1024 * 1024 * 1024), 2),
            "disk_total_gb": round(primary_disk.total / (1024 * 1024 * 1024), 2),
            "network_sent_mb": round(net_io.bytes_sent / (1024 * 1024), 2) if net_io else 0.0,
            "network_recv_mb": round(net_io.bytes_recv / (1024 * 1024), 2) if net_io else 0.0,
            "process_count": process_count,
        }

    @staticmethod
    def record_metric(db: Session) -> Metric:
        """Collect current metric, persist to SQLite, prune old records, and check for incident triggers."""
        metrics_dict = SystemMonitorService.get_current_metrics()
        
        metric_record = Metric(
            timestamp=metrics_dict["timestamp"],
            cpu_percent=metrics_dict["cpu_percent"],
            memory_percent=metrics_dict["memory_percent"],
            memory_used_mb=metrics_dict["memory_used_mb"],
            memory_total_mb=metrics_dict["memory_total_mb"],
            disk_percent=metrics_dict["disk_percent"],
            disk_used_gb=metrics_dict["disk_used_gb"],
            disk_total_gb=metrics_dict["disk_total_gb"],
            network_sent_mb=metrics_dict["network_sent_mb"],
            network_recv_mb=metrics_dict["network_recv_mb"],
            process_count=metrics_dict["process_count"],
        )
        db.add(metric_record)
        
        # Prune metrics older than retention period
        cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.METRICS_RETENTION_HOURS)
        db.query(Metric).filter(Metric.timestamp < cutoff).delete()
        
        db.commit()
        db.refresh(metric_record)

        # Trigger incident evaluation
        from backend.app.services.incident_service import IncidentService
        IncidentService.evaluate_system_metrics(db, metrics_dict)

        return metric_record

    @staticmethod
    def get_metrics_history(db: Session, limit: int = 60) -> List[MetricPoint]:
        """Fetch chronological list of recorded metrics."""
        records = db.query(Metric).order_by(Metric.timestamp.desc()).limit(limit).all()
        # Return in ascending chronological order for charts
        return [MetricPoint.model_validate(r) for r in reversed(records)]

    @staticmethod
    def get_disks() -> List[SystemDiskInfo]:
        """Collect partition and disk space info across drives."""
        disks = []
        partitions = psutil.disk_partitions(all=False)
        for part in partitions:
            try:
                usage = psutil.disk_usage(part.mountpoint)
                disks.append(
                    SystemDiskInfo(
                        device=part.device,
                        mountpoint=part.mountpoint,
                        fstype=part.fstype,
                        total_gb=round(usage.total / (1024 ** 3), 2),
                        used_gb=round(usage.used / (1024 ** 3), 2),
                        free_gb=round(usage.free / (1024 ** 3), 2),
                        percent=usage.percent
                    )
                )
            except (PermissionError, OSError):
                continue
        return disks

    @staticmethod
    def get_network() -> List[SystemNetworkInfo]:
        """Collect per-interface network counters."""
        net_info = []
        stats = psutil.net_if_stats()
        io_counters = psutil.net_io_counters(pernic=True)

        for iface_name, stat in stats.items():
            io = io_counters.get(iface_name)
            net_info.append(
                SystemNetworkInfo(
                    interface=iface_name,
                    bytes_sent_mb=round(io.bytes_sent / (1024 * 1024), 2) if io else 0.0,
                    bytes_recv_mb=round(io.bytes_recv / (1024 * 1024), 2) if io else 0.0,
                    packets_sent=io.packets_sent if io else 0,
                    packets_recv=io.packets_recv if io else 0,
                    is_up=stat.isup
                )
            )
        return net_info

    @staticmethod
    def get_system_summary(db: Session) -> SystemSummary:
        """Aggregate system hardware, OS summary, and health status."""
        current = SystemMonitorService.get_current_metrics()
        boot_timestamp = psutil.boot_time()
        boot_time = datetime.fromtimestamp(boot_timestamp, timezone.utc)
        uptime_seconds = (datetime.now(timezone.utc) - boot_time).total_seconds()

        # Check total backups and last backup
        total_backups = db.query(Backup).count()
        last_backup_obj = db.query(Backup).filter(Backup.status == "SUCCESS").order_by(Backup.created_at.desc()).first()
        last_successful_backup = last_backup_obj.created_at if last_backup_obj else None

        # Check open incidents
        open_incidents_count = db.query(Incident).filter(Incident.status.in_(["OPEN", "ACKNOWLEDGED"])).count()

        # Determine status
        status = "healthy"
        reasons = []

        if current["cpu_percent"] >= settings.CPU_CRITICAL_THRESHOLD:
            status = "critical"
            reasons.append(f"CPU utilization ({current['cpu_percent']}%) exceeds critical threshold ({settings.CPU_CRITICAL_THRESHOLD}%)")
        elif current["cpu_percent"] >= settings.CPU_WARNING_THRESHOLD:
            if status != "critical":
                status = "warning"
            reasons.append(f"CPU utilization ({current['cpu_percent']}%) exceeds warning threshold ({settings.CPU_WARNING_THRESHOLD}%)")

        if current["memory_percent"] >= settings.MEMORY_CRITICAL_THRESHOLD:
            status = "critical"
            reasons.append(f"Memory utilization ({current['memory_percent']}%) exceeds critical threshold ({settings.MEMORY_CRITICAL_THRESHOLD}%)")
        elif current["memory_percent"] >= settings.MEMORY_WARNING_THRESHOLD:
            if status != "critical":
                status = "warning"
            reasons.append(f"Memory utilization ({current['memory_percent']}%) exceeds warning threshold ({settings.MEMORY_WARNING_THRESHOLD}%)")

        if current["disk_percent"] >= settings.DISK_CRITICAL_THRESHOLD:
            status = "critical"
            reasons.append(f"Disk utilization ({current['disk_percent']}%) exceeds critical threshold ({settings.DISK_CRITICAL_THRESHOLD}%)")
        elif current["disk_percent"] >= settings.DISK_WARNING_THRESHOLD:
            if status != "critical":
                status = "warning"
            reasons.append(f"Disk utilization ({current['disk_percent']}%) exceeds warning threshold ({settings.DISK_WARNING_THRESHOLD}%)")

        if open_incidents_count > 0:
            if any("critical" in i.severity.lower() for i in db.query(Incident).filter(Incident.status == "OPEN").all()):
                status = "critical"
            elif status == "healthy":
                status = "warning"
            reasons.append(f"{open_incidents_count} active incident(s) require investigation")

        if not reasons:
            reasons.append("All core system metrics are within normal operational parameters")

        return SystemSummary(
            hostname=platform.node(),
            platform=platform.system(),
            os_name=platform.platform(),
            os_version=platform.version(),
            architecture=platform.machine(),
            python_version=platform.python_version(),
            boot_time=boot_time,
            uptime_seconds=max(0.0, uptime_seconds),
            cpu_count_logical=psutil.cpu_count(logical=True) or 1,
            cpu_count_physical=psutil.cpu_count(logical=False) or 1,
            cpu_percent=current["cpu_percent"],
            memory_percent=current["memory_percent"],
            memory_used_mb=current["memory_used_mb"],
            memory_total_mb=current["memory_total_mb"],
            disk_percent=current["disk_percent"],
            disk_used_gb=current["disk_used_gb"],
            disk_total_gb=current["disk_total_gb"],
            process_count=current["process_count"],
            system_status=status,
            status_reasons=reasons,
            total_backups=total_backups,
            last_successful_backup=last_successful_backup,
            open_incidents_count=open_incidents_count
        )
