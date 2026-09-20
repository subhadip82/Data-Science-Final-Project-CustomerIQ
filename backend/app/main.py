"""FastAPI main application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes.auth import router as auth_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.customers import router as customers_router
from app.api.routes.upload import router as upload_router
from app.api.routes.datasets import router as datasets_router
from app.api.routes.data_profile import router as data_profile_router
from app.api.routes.routes import (
    segments_router,
    rfm_router,
    sales_router,
    insights_router,
    recommendations_router,
    notifications_router,
    reports_router,
    storage_router,
    ml_router,
    stats_router,
    features_router,
)
from app.api.routes.share import router as share_router
from app.api.routes.analysis_jobs import router as analysis_jobs_router


from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: register models


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Ensure SQLite schema parity for newer columns
            for col_stmt in [
                "ALTER TABLE reports ADD COLUMN dataset_id VARCHAR(36)",
                "ALTER TABLE datasets ADD COLUMN file_hash VARCHAR(64)",
                "ALTER TABLE datasets ADD COLUMN selected_sheet VARCHAR(255)",
                "ALTER TABLE datasets ADD COLUMN available_sheets JSON",
            ]:
                try:
                    await conn.execute(text(col_stmt))
                except Exception:
                    pass
    except Exception as e:
        print(f"Warning on table initialization: {e}")
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend across localhost, local IP, and Vercel deployments (*.vercel.app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?|https://.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Router Registration ─────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth_router, prefix=PREFIX)
app.include_router(analytics_router, prefix=PREFIX)
app.include_router(customers_router, prefix=PREFIX)
app.include_router(upload_router, prefix=PREFIX)
app.include_router(segments_router, prefix=PREFIX)
app.include_router(rfm_router, prefix=PREFIX)
app.include_router(sales_router, prefix=PREFIX)
app.include_router(insights_router, prefix=PREFIX)
app.include_router(recommendations_router, prefix=PREFIX)
app.include_router(notifications_router, prefix=PREFIX)
app.include_router(notifications_router, prefix="/api")
app.include_router(reports_router, prefix=PREFIX)
app.include_router(datasets_router, prefix=PREFIX)
app.include_router(datasets_router, prefix="/api")
app.include_router(data_profile_router, prefix=PREFIX)
app.include_router(storage_router, prefix=PREFIX)
app.include_router(ml_router, prefix=PREFIX)
app.include_router(stats_router, prefix=PREFIX)
app.include_router(features_router, prefix=PREFIX)
app.include_router(features_router, prefix="/api")
app.include_router(share_router, prefix=PREFIX)
app.include_router(analysis_jobs_router, prefix=PREFIX)
app.include_router(analysis_jobs_router, prefix="/api")


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "status": "healthy"}


@app.get("/health")
async def health():
    return {"status": "ok"}
