from fastapi import APIRouter
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.system import router as system_router
from backend.app.api.routes.backups import router as backups_router
from backend.app.api.routes.restores import router as restores_router
from backend.app.api.routes.incidents import router as incidents_router
from backend.app.api.routes.logs import router as logs_router
from backend.app.api.routes.diagnostics import router as diagnostics_router
from backend.app.api.routes.settings import router as settings_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(system_router)
api_router.include_router(backups_router)
api_router.include_router(restores_router)
api_router.include_router(incidents_router)
api_router.include_router(logs_router)
api_router.include_router(diagnostics_router)
api_router.include_router(settings_router)
