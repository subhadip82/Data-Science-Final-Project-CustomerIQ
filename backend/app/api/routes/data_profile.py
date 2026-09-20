"""
Data Profile Route
==================
Returns comprehensive data profiling metrics, quality scores, column distributions,
and transformation suggestions for the active dataset.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.models import Dataset, DatasetColumn
from app.repositories.user_repository import UserRepository
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/data-profile", tags=["data-profile"])


async def _get_workspace_id(user: User, db: AsyncSession) -> uuid.UUID:
    repo = UserRepository(db)
    ws = await repo.get_workspace(user.id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.id


@router.get("")
async def get_data_profile(
    dataset_id: Optional[uuid.UUID] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full data profiling metrics, quality score, and transformation suggestions."""
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)

    if dataset_id:
        res = await db.execute(
            select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
        )
        dataset = res.scalar_one_or_none()
    else:
        dataset = await service.get_active_dataset(workspace_id)

    if not dataset:
        return {"has_dataset": False, "profile": None}

    # Fetch columns
    cols_res = await db.execute(
        select(DatasetColumn).where(DatasetColumn.dataset_id == dataset.id)
    )
    columns = cols_res.scalars().all()

    summary = dataset.summary_json or {}
    profile_data = summary.get("profile", {})
    classification = summary.get("classification", {})
    plan = summary.get("plan", {})

    return {
        "has_dataset": True,
        "dataset_id": str(dataset.id),
        "dataset_name": dataset.name,
        "filename": dataset.filename,
        "dataset_type": dataset.dataset_type,
        "type_confidence": dataset.type_confidence,
        "type_reason": dataset.type_reason,
        "quality_score": dataset.quality_score,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "duplicate_rows": profile_data.get("duplicate_rows", 0),
        "memory_usage_kb": profile_data.get("memory_usage_kb", 0),
        "type_counts": profile_data.get("type_counts", {}),
        "issues": profile_data.get("issues", []),
        "recommendations": profile_data.get("recommendations", []),
        "modules": plan.get("modules", {}),
        "columns": [
            {
                "name": c.name,
                "data_type": c.data_type,
                "semantic_type": c.semantic_type,
                "missing_count": c.missing_count,
                "missing_pct": c.missing_pct,
                "unique_count": c.unique_count,
                "sample_values": c.sample_values,
                "stats": c.stats,
                "outlier_count": c.outlier_count,
            }
            for c in columns
        ],
    }
