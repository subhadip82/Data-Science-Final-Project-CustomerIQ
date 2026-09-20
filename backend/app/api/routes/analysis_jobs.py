"""
Analysis Jobs API Routes for CustomerIQ
======================================
Provides asynchronous background job operations:
- POST /api/v1/analysis/jobs - Dispatches async background analysis
- GET /api/v1/analysis/jobs/{job_id} - Fetches real-time status & progress
- POST /api/v1/analysis/jobs/{job_id}/cancel - Safely cancels running job
- POST /api/v1/analysis/jobs/{job_id}/retry - Retries failed job without re-uploading
"""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_db, get_current_user
from app.models.models import AnalysisJob, Dataset
from app.models.user import User
from app.models.workspace import Workspace
from app.services.analysis_job_service import AnalysisJobService

router = APIRouter(prefix="/analysis/jobs", tags=["analysis-jobs"])


async def _get_workspace_id(user: User, db: AsyncSession) -> uuid.UUID:
    stmt = select(Workspace).where(Workspace.owner_id == user.id)
    res = await db.execute(stmt)
    ws = res.scalars().first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return ws.id


class CreateAnalysisJobRequest(BaseModel):
    dataset_id: uuid.UUID
    selected_modules: Optional[List[str]] = None
    target_column: Optional[str] = None
    date_column: Optional[str] = None
    customer_column: Optional[str] = None
    text_column: Optional[str] = None
    measure_column: Optional[str] = None


class AnalysisJobResponse(BaseModel):
    job_id: str
    dataset_id: str
    status: str
    progress: int
    current_step: str
    completed_steps: List[str]
    error: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


@router.post("", response_model=AnalysisJobResponse)
async def create_analysis_job(
    body: CreateAnalysisJobRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates and kicks off an asynchronous background analysis job.
    Returns immediately with job_id and status='queued'.
    """
    workspace_id = await _get_workspace_id(user, db)

    # Verify dataset exists and belongs to workspace
    ds_stmt = select(Dataset).where(Dataset.id == body.dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(ds_stmt)).scalars().first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in active workspace.")

    config = {
        "selected_modules": body.selected_modules or ["eda", "statistics", "segmentation", "ml", "insights", "recommendations"],
        "target_column": body.target_column,
        "date_column": body.date_column,
        "customer_column": body.customer_column,
        "text_column": body.text_column,
        "measure_column": body.measure_column,
    }

    job_service = AnalysisJobService(db)
    job = await job_service.create_job(
        workspace_id=workspace_id,
        dataset_id=body.dataset_id,
        user_id=user.id,
        config=config,
    )

    return AnalysisJobResponse(
        job_id=str(job.id),
        dataset_id=str(job.dataset_id),
        status=job.status,
        progress=job.progress,
        current_step=job.current_step,
        completed_steps=job.completed_steps or [],
        error=job.error,
        created_at=job.created_at.isoformat() if job.created_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


@router.get("/{job_id}", response_model=AnalysisJobResponse)
async def get_analysis_job_status(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetches real-time status and milestone progress for an analysis job."""
    workspace_id = await _get_workspace_id(user, db)
    job_service = AnalysisJobService(db)
    job = await job_service.get_job(job_id, workspace_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found.")

    return AnalysisJobResponse(
        job_id=str(job.id),
        dataset_id=str(job.dataset_id),
        status=job.status,
        progress=job.progress,
        current_step=job.current_step,
        completed_steps=job.completed_steps or [],
        error=job.error,
        created_at=job.created_at.isoformat() if job.created_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


@router.post("/{job_id}/cancel")
async def cancel_analysis_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Safely cancels an active or queued background analysis job."""
    workspace_id = await _get_workspace_id(user, db)
    job_service = AnalysisJobService(db)
    cancelled = await job_service.cancel_job(job_id, workspace_id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled (may be already completed or failed).")
    return {"status": "success", "message": "Analysis job cancelled."}


@router.post("/{job_id}/retry", response_model=AnalysisJobResponse)
async def retry_analysis_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retries a failed or cancelled analysis job using the existing dataset."""
    workspace_id = await _get_workspace_id(user, db)
    job_service = AnalysisJobService(db)
    new_job = await job_service.retry_job(job_id, workspace_id, user.id)
    if not new_job:
        raise HTTPException(status_code=404, detail="Original job not found to retry.")

    return AnalysisJobResponse(
        job_id=str(new_job.id),
        dataset_id=str(new_job.dataset_id),
        status=new_job.status,
        progress=new_job.progress,
        current_step=new_job.current_step,
        completed_steps=new_job.completed_steps or [],
        error=new_job.error,
        created_at=new_job.created_at.isoformat() if new_job.created_at else None,
        completed_at=new_job.completed_at.isoformat() if new_job.completed_at else None,
    )
