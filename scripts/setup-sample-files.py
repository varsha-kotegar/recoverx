import os
from pathlib import Path

def setup_sample_data(base_dir: Path):
    sample_dir = base_dir / "sample_data"
    sample_dir.mkdir(parents=True, exist_ok=True)

    # 1. System configs
    conf_dir = sample_dir / "configs"
    conf_dir.mkdir(exist_ok=True)
    (conf_dir / "nginx.conf").write_text("""events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name recoverx.local;
        location / {
            proxy_pass http://localhost:8000;
        }
    }
}
""", encoding="utf-8")

    (conf_dir / "app_settings.json").write_text("""{
  "service_name": "recoverx-core",
  "port": 8000,
  "telemetry_enabled": true,
  "cluster_nodes": ["node-01.local", "node-02.local"]
}
""", encoding="utf-8")

    # 2. Database mock dumps
    db_dir = sample_dir / "db_backups"
    db_dir.mkdir(exist_ok=True)
    (db_dir / "schema_dump.sql").write_text("""-- RecoverX Demo Database Dump
CREATE TABLE users (id INT PRIMARY KEY, username VARCHAR(50), role VARCHAR(20));
CREATE TABLE audit_logs (id INT PRIMARY KEY, event VARCHAR(100), timestamp DATETIME);
INSERT INTO users VALUES (1, 'sysadmin', 'superadmin'), (2, 'support_agent', 'operator');
""", encoding="utf-8")

    # 3. Application log files
    logs_dir = sample_dir / "app_logs"
    logs_dir.mkdir(exist_ok=True)
    (logs_dir / "access.log").write_text("""192.168.1.10 - - [09/Oct/2026:10:00:01 +0000] "GET /api/health HTTP/1.1" 200 84
192.168.1.12 - - [09/Oct/2026:10:00:05 +0000] "POST /api/backups HTTP/1.1" 201 512
192.168.1.15 - - [09/Oct/2026:10:01:10 +0000] "GET /api/system/summary HTTP/1.1" 200 1024
""", encoding="utf-8")

    # 4. Docs and notes
    docs_dir = sample_dir / "documentation"
    docs_dir.mkdir(exist_ok=True)
    (docs_dir / "DISASTER_RECOVERY_RUNBOOK.md").write_text("""# Disaster Recovery SOP
1. Verify system telemetry and alerts in RecoverX Incidents.
2. Select latest verified backup snapshot in Backup Center.
3. Validate SHA-256 cryptographic checksums before restore.
4. Preview restore target directory for existing file conflicts.
5. Execute atomic restoration into designated staging/target volume.
""", encoding="utf-8")

    print(f"Sample data generated successfully at: {sample_dir.resolve()}")

if __name__ == "__main__":
    setup_sample_data(Path(__file__).resolve().parent.parent)
