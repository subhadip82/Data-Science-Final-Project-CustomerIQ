"""SQLAlchemy async session configuration."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

import json
import numpy as np
import datetime
import uuid

def custom_json_dumps(obj):
    def default(o):
        if isinstance(o, (np.bool_, bool)):
            return bool(o)
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return float(o)
        if isinstance(o, (np.ndarray,)):
            return o.tolist()
        if isinstance(o, (datetime.date, datetime.datetime)):
            return o.isoformat()
        if isinstance(o, uuid.UUID):
            return str(o)
        return str(o)
    return json.dumps(obj, default=default)

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    if ":///" in db_url:
        proto, path_part = db_url.split(":///", 1)
        if not os.path.isabs(path_part):
            clean_rel = path_part.lstrip("./\\")
            abs_db_path = (BACKEND_DIR / clean_rel).resolve()
            db_url = f"{proto}:///{abs_db_path.as_posix()}"

    engine = create_async_engine(
        db_url,
        connect_args={"check_same_thread": False},
        json_serializer=custom_json_dumps,
        echo=settings.DEBUG,
        future=True,
    )
else:
    engine = create_async_engine(
        db_url,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        json_serializer=custom_json_dumps,
        echo=settings.DEBUG,
        future=True,
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
