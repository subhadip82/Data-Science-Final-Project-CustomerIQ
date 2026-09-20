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
import urllib.parse
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


def normalize_database_url(raw_url: str) -> tuple[str, dict]:
    """Normalize database connection URL for SQLAlchemy asyncpg engine and cloud providers."""
    connect_args: dict = {}
    if raw_url.startswith("sqlite"):
        if ":///" in raw_url:
            proto, path_part = raw_url.split(":///", 1)
            if not os.path.isabs(path_part):
                clean_rel = path_part.lstrip("./\\")
                abs_db_path = (BACKEND_DIR / clean_rel).resolve()
                raw_url = f"{proto}:///{abs_db_path.as_posix()}"
        connect_args["check_same_thread"] = False
        return raw_url, connect_args

    parsed = urllib.parse.urlparse(raw_url)
    scheme = parsed.scheme
    if scheme in ("postgres", "postgresql", "postgresql+psycopg2"):
        scheme = "postgresql+asyncpg"

    # Query params handling: asyncpg does not support 'sslmode' query param (raises unexpected keyword argument)
    query_params = urllib.parse.parse_qs(parsed.query)
    has_ssl = False

    if "sslmode" in query_params:
        sslmode_val = query_params.pop("sslmode")[0]
        if sslmode_val.lower() in ("require", "verify-ca", "verify-full", "prefer"):
            has_ssl = True

    if "ssl" in query_params:
        ssl_val = query_params.pop("ssl")[0]
        if ssl_val.lower() in ("true", "require", "1"):
            has_ssl = True

    # Cloud hosted Postgres (Render, Neon, Supabase, AWS RDS, etc.) require SSL
    if parsed.hostname and parsed.hostname not in ("localhost", "127.0.0.1", "db", "0.0.0.0"):
        has_ssl = True

    if has_ssl:
        connect_args["ssl"] = "require"

    clean_query = urllib.parse.urlencode({k: v[0] for k, v in query_params.items()})
    rebuilt_url = urllib.parse.urlunparse((
        scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment,
    ))
    return rebuilt_url, connect_args


normalized_db_url, db_connect_args = normalize_database_url(settings.DATABASE_URL)

if normalized_db_url.startswith("sqlite"):
    engine = create_async_engine(
        normalized_db_url,
        connect_args=db_connect_args,
        json_serializer=custom_json_dumps,
        echo=settings.DEBUG,
        future=True,
    )
else:
    engine = create_async_engine(
        normalized_db_url,
        connect_args=db_connect_args,
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
