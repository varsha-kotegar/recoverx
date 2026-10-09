# RecoverX — Troubleshooting Guide & Common Solutions

This guide provides actionable remediation steps for common operational errors encountered when running RecoverX.

---

## 1. Fast Diagnostic Quick-Check

To check overall platform health from the CLI or API:
```bash
# Run automated backend test suite
scripts\run-tests.bat

# Query backend health probe
curl http://localhost:8000/api/health
curl http://localhost:8000/api/readyz
```

---

## 2. Common Scenarios & Resolutions

### Issue 1: "Path is outside permitted root directories"
- **Symptom**: `HTTP 400 Bad Request` when creating a backup or previewing a restore.
- **Cause**: The specified folder path is not within `settings.ALLOWED_ROOTS`.
- **Solution**:
  1. Ensure you target directories within `sample_data/` or the project root.
  2. Navigate to **Settings** in the RecoverX console and add the custom directory to `ALLOWED_ROOTS`.
  3. Ensure absolute paths match the host operating system conventions.

---

### Issue 2: "Database readiness check failed / no such table"
- **Symptom**: `HTTP 503 Service Unavailable` on `/api/readyz`.
- **Cause**: SQLite database file locked or not initialized.
- **Solution**:
  1. Check permissions on `backend/data/`.
  2. Restart the FastAPI backend server (`init_db()` runs automatically on startup).
  3. Inspect `backend/logs/recoverx.log` for database errors.

---

### Issue 3: "Backup integrity check returned CORRUPTED"
- **Symptom**: Red badge and critical incident raised after running backup verification.
- **Cause**:
  1. Archive file bytes on disk were modified or corrupted.
  2. File hash inside archive does not match original SHA-256 in manifest.
- **Solution**:
  1. Inspect the verification report modal to identify the specific corrupted file.
  2. If simulated via demo mode, acknowledge and resolve the incident.
  3. For real failures, quarantine the archive and use a previous verified snapshot.

---

### Issue 4: "Container monitoring shows container metrics, not host metrics"
- **Symptom**: When running in Docker, CPU/memory reflects the container limits rather than the physical machine.
- **Cause**: Docker container isolation namespace.
- **Solution**:
  - For host-level monitoring on Linux/WSL2, execute RecoverX directly on the host using the local virtual environment (`backend/venv`) or run Docker with `--pid=host` where appropriate.

---

### Issue 5: "Frontend fails to connect to backend (API OFFLINE)"
- **Symptom**: Header shows "API OFFLINE" and dashboard cards display loading skeletons.
- **Cause**: Backend server on port 8000 is not running or CORS is blocking the request.
- **Solution**:
  1. Verify backend is running on `http://127.0.0.1:8000`.
  2. Check if another process is occupying port 8000:
     ```powershell
     netstat -ano | findstr :8000
     ```
  3. Check that Next.js environment variable `NEXT_PUBLIC_API_URL` is set to `http://localhost:8000/api` or proxy rewrite is active.
