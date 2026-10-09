# RecoverX — Automated Test Plan & QA Specification

## 1. Test Matrix Overview

| Test Module | Coverage Scope | Target File | Status |
| :--- | :--- | :--- | :--- |
| **Health Probes** | `/api/health`, `/api/healthz`, `/api/readyz` | `backend/tests/test_health.py` | Passed (100%) |
| **System Telemetry** | CPU, RAM, Disk partitions, NICs, time-series history | `backend/tests/test_system_monitor.py` | Passed (100%) |
| **Backup Lifecycle** | Creation, ZIP generation, manifest hashes, listing | `backend/tests/test_backup_restore.py` | Passed (100%) |
| **Restore Workflow** | Pre-flight conflict check, staging, atomic copy, reports | `backend/tests/test_backup_restore.py` | Passed (100%) |
| **Integrity & Bit-Rot** | Cryptographic SHA-256 match, byte tampering detection | `backend/tests/test_integrity.py` | Passed (100%) |
| **Incident Lifecycle** | Deduplication, alert triggers, acknowledge, resolve | `backend/tests/test_incidents.py` | Passed (100%) |
| **Security Barriers** | Path traversal, protected directory blocklists, zip slip | `backend/tests/test_security.py` | Passed (100%) |
| **Settings Engine** | Configuration persistence, threshold validation | `backend/tests/test_settings.py` | Passed (100%) |
| **Frontend Build** | Next.js compilation, TypeScript types, static prerender | `frontend/` (`npm run build`) | Passed (100%) |

---

## 2. Test Execution Commands

### Running Backend Tests (Pytest)
```bash
# Windows
$env:PYTHONPATH="."; backend\venv\Scripts\pytest backend\tests -v

# Linux / WSL2
export PYTHONPATH="."
pytest backend/tests -v
```

### Running Frontend Type Checks & Build
```bash
cd frontend
npm run build
```

### Running Complete Monorepo Test Script
```bash
scripts\run-tests.bat
```
