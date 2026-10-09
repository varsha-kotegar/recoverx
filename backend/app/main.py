import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import init_db, SessionLocal
from backend.app.core.logging_config import setup_logging, logger
from backend.app.api.routes import api_router
from backend.app.services.system_monitor import SystemMonitorService

# Background task for continuous metric collection
async def periodic_metric_collector():
    while True:
        try:
            db = SessionLocal()
            try:
                SystemMonitorService.record_metric(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error during periodic metric collection: {e}")
        await asyncio.sleep(settings.POLLING_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("Initializing RecoverX Database and Services...")
    init_db()
    
    # Collect initial baseline metric
    db = SessionLocal()
    try:
        SystemMonitorService.record_metric(db)
    finally:
        db.close()

    collector_task = asyncio.create_task(periodic_metric_collector())
    logger.info("RecoverX Platform started successfully.")
    yield
    # Shutdown
    collector_task.cancel()
    try:
        await collector_task
    except asyncio.CancelledError:
        pass
    logger.info("RecoverX Platform shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RecoverX — Linux & Infrastructure System Monitoring, Backup & Disaster Recovery Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router)

# Root endpoint
@app.get("/")
def root():
    return {
        "message": "RecoverX Monitoring, Backup & Recovery API is running.",
        "docs": "/docs",
        "health": "/api/health",
        "system_summary": "/api/system/summary"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please consult diagnostic logs."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
