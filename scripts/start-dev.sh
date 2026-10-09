#!/usr/bin/env bash
set -e

echo "==================================================="
echo "  Starting RecoverX Infrastructure Platform (Dev)  "
echo "==================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PYTHONPATH="${DIR}"

echo "[1/2] Launching FastAPI Backend on http://0.0.0.0:8000..."
(
  cd "${DIR}"
  source backend/venv/bin/activate 2>/dev/null || true
  uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

echo "[2/2] Launching Next.js Frontend on http://localhost:3000..."
(
  cd "${DIR}/frontend"
  npm run dev
) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT

wait
