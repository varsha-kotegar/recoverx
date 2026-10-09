import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone
from backend.app.core.config import settings

class SQLiteLogHandler(logging.Handler):
    """Custom logging handler to record structured log messages into SQLite."""
    def emit(self, record):
        try:
            from backend.app.core.database import SessionLocal
            from backend.app.models.log_entry import LogEntry
            
            # Extract structured attributes if passed in extra
            component = getattr(record, "component", record.name.split(".")[-1])
            event_type = getattr(record, "event_type", "general")
            related_id = getattr(record, "related_id", None)
            extra_metadata = getattr(record, "extra_metadata", None)

            msg = self.format(record)

            db = SessionLocal()
            try:
                log_record = LogEntry(
                    timestamp=datetime.now(timezone.utc),
                    severity=record.levelname,
                    component=str(component)[:64],
                    event_type=str(event_type)[:64],
                    message=msg,
                    related_id=str(related_id) if related_id else None,
                    extra_metadata=str(extra_metadata) if extra_metadata else None
                )
                db.add(log_record)
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        except Exception:
            self.handleError(record)

def setup_logging():
    log_file = settings.LOGS_DIR / "recoverx.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024, # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.INFO)

    sqlite_handler = SQLiteLogHandler()
    sqlite_handler.setLevel(logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup is called multiple times
    if not root_logger.handlers:
        root_logger.addHandler(file_handler)
        root_logger.addHandler(stream_handler)
        root_logger.addHandler(sqlite_handler)
    
    # Also silence overly verbose third-party loggers if needed
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger("recoverx")
