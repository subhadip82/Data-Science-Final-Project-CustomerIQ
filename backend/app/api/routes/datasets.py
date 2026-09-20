"""
Datasets Management Routes
==========================
List, activate, rename, and delete uploaded datasets in the workspace.
"""
import uuid
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.models import Dataset, DatasetColumn
from app.repositories.user_repository import UserRepository
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/datasets", tags=["datasets"])


async def _get_workspace_id(user: User, db: AsyncSession) -> uuid.UUID:
    repo = UserRepository(db)
    ws = await repo.get_workspace(user.id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.id


class RenameDatasetRequest(BaseModel):
    name: str


@router.get("")
async def list_datasets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all datasets in the user's workspace."""
    workspace_id = await _get_workspace_id(user, db)
    result = await db.execute(
        select(Dataset)
        .where(Dataset.workspace_id == workspace_id)
        .order_by(Dataset.is_active.desc(), Dataset.uploaded_at.desc())
    )
    datasets = result.scalars().all()

    return {
        "items": [
            {
                "id": str(d.id),
                "name": d.name,
                "filename": d.filename,
                "file_type": d.file_type or "csv",
                "file_size": d.file_size,
                "row_count": d.row_count,
                "column_count": d.column_count,
                "dataset_type": d.dataset_type,
                "type_confidence": d.type_confidence,
                "type_reason": d.type_reason,
                "quality_score": d.quality_score,
                "is_active": d.is_active,
                "status": d.status,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            }
            for d in datasets
        ],
        "total": len(datasets),
    }


@router.get("/active")
async def get_active_dataset(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the currently active dataset and its capability matrix."""
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"dataset": None, "has_active": False}

    # Fetch columns
    cols_res = await db.execute(
        select(DatasetColumn).where(DatasetColumn.dataset_id == dataset.id)
    )
    columns = cols_res.scalars().all()

    return {
        "has_active": True,
        "dataset": {
            "id": str(dataset.id),
            "name": dataset.name,
            "filename": dataset.filename,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "dataset_type": dataset.dataset_type,
            "type_confidence": dataset.type_confidence,
            "type_reason": dataset.type_reason,
            "quality_score": dataset.quality_score,
            "is_active": dataset.is_active,
            "summary": dataset.summary_json,
            "uploaded_at": dataset.uploaded_at.isoformat() if dataset.uploaded_at else None,
            "columns": [
                {
                    "name": c.name,
                    "data_type": c.data_type,
                    "semantic_type": c.semantic_type,
                    "missing_pct": c.missing_pct,
                    "unique_count": c.unique_count,
                    "sample_values": c.sample_values,
                    "stats": c.stats,
                    "outlier_count": c.outlier_count,
                }
                for c in columns
            ],
        }
    }


@router.post("/{dataset_id}/activate")
async def activate_dataset(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Switch the workspace's active dataset."""
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    await service.set_active_dataset(workspace_id, dataset_id)
    return {"status": "success", "message": f"Dataset {dataset_id} activated."}


@router.patch("/{dataset_id}")
async def rename_dataset(
    dataset_id: uuid.UUID,
    body: RenameDatasetRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a dataset."""
    workspace_id = await _get_workspace_id(user, db)
    await db.execute(
        update(Dataset)
        .where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
        .values(name=body.name)
    )
    await db.commit()
    return {"status": "success", "name": body.name}


class AnalyzeDatasetRequest(BaseModel):
    selected_modules: Optional[list[str]] = None
    target_column: Optional[str] = None
    date_column: Optional[str] = None
    customer_column: Optional[str] = None
    text_column: Optional[str] = None
    measure_column: Optional[str] = None


@router.post("/{dataset_id}/analyze")
async def analyze_dataset(
    dataset_id: uuid.UUID,
    body: Optional[AnalyzeDatasetRequest] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executes full universal analysis and persists results in database."""
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    service = DatasetService(db)
    config = body.model_dump() if body else {}
    analysis_res = await service.run_full_analysis(dataset, user.id, config=config)
    return analysis_res


@router.get("/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: uuid.UUID,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns top N rows of the dataset for preview table."""
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    service = DatasetService(db)
    rows = service.get_dataset_preview(dataset, limit=limit)
    return {
        "dataset_id": str(dataset.id),
        "name": dataset.name,
        "rows": rows,
        "total_rows": dataset.row_count,
        "columns": [c.name for c in dataset.columns] if dataset.columns else (list(rows[0].keys()) if rows else []),
    }


@router.get("/{dataset_id}/profile")
async def get_dataset_profile(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns complete dataset profile:
    row count, column count, missing percentage, duplicate count, and column type breakdown.
    Does NOT return full row-level data.
    """
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    cols_stmt = select(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id)
    columns = (await db.execute(cols_stmt)).scalars().all()

    summary = dataset.summary_json or {}
    prof = summary.get("profile", {})
    plan = summary.get("plan", {})

    numeric_cols = [c.name for c in columns if c.data_type in ("numeric", "integer", "float")]
    categorical_cols = [c.name for c in columns if c.data_type in ("categorical", "category")]
    datetime_cols = [c.name for c in columns if c.data_type in ("datetime", "date")]
    text_cols = [c.name for c in columns if c.data_type in ("text", "string")]
    boolean_cols = [c.name for c in columns if c.data_type == "boolean"]

    possible_targets = [
        c.name for c in columns
        if c.semantic_type == "target"
        or any(term in c.name.lower() for term in ["target", "label", "churn", "status", "revenue", "salary"])
    ]
    possible_ids = [
        c.name for c in columns
        if c.semantic_type in ("id", "customer_id")
        or any(term in c.name.lower() for term in ["id", "code", "uuid", "key", "number"])
    ]

    return {
        "dataset_id": str(dataset.id),
        "name": dataset.name,
        "rows": dataset.row_count,
        "columns": dataset.column_count,
        "file_size": dataset.file_size,
        "missing_percentage": prof.get("missing_pct", 0.0),
        "duplicate_count": prof.get("duplicates", 0),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "datetime_columns": datetime_cols,
        "text_columns": text_cols,
        "boolean_columns": boolean_cols,
        "possible_id_columns": possible_ids,
        "possible_target_columns": possible_targets,
    }


@router.get("/{dataset_id}/quality")
async def get_dataset_quality(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns real, calculated data quality score (0-100), warnings, errors,
    missingness summary, and outlier breakdown from complete dataset.
    """
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    cols_stmt = select(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id)
    columns = (await db.execute(cols_stmt)).scalars().all()

    summary = dataset.summary_json or {}
    prof = summary.get("profile", {})

    missing_summary = {c.name: round(c.missing_pct, 2) for c in columns if c.missing_pct > 0}
    outlier_summary = {c.name: c.outlier_count for c in columns if c.outlier_count > 0}

    warnings = list(prof.get("issues", []))
    if not warnings and prof.get("missing_pct", 0) > 5:
        warnings.append(f"Overall missing values: {prof['missing_pct']}% across records.")
    if prof.get("duplicates", 0) > 0:
        warnings.append(f"{prof['duplicates']:,} duplicate records detected.")

    return {
        "dataset_id": str(dataset.id),
        "quality_score": dataset.quality_score,
        "warnings": warnings,
        "errors": [],
        "missing_summary": missing_summary,
        "duplicate_count": prof.get("duplicates", 0),
        "outlier_summary": outlier_summary,
        "invalid_value_summary": {},
    }


@router.get("/{dataset_id}/capabilities")
async def get_dataset_capabilities(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the 14 universal analysis capability items:
    name, available, confidence, reason, and required_columns.
    """
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = dataset.summary_json or {}
    plan = summary.get("plan", {})
    features = plan.get("features", {})

    capabilities_list = []
    for feat_key, feat_val in features.items():
        capabilities_list.append({
            "key": feat_key,
            "name": feat_val.get("name", feat_key.replace("_", " ").title()),
            "available": bool(feat_val.get("available", False)),
            "confidence": feat_val.get("confidence", 0.95),
            "reason": feat_val.get("reason", ""),
            "required_columns": feat_val.get("required_columns", []),
        })

    return {
        "dataset_id": str(dataset.id),
        "dataset_type": dataset.dataset_type,
        "type_confidence": dataset.type_confidence,
        "type_reason": dataset.type_reason,
        "capabilities": capabilities_list,
    }


@router.get("/{dataset_id}/analysis-plan")
async def get_dataset_analysis_plan(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns recommended analyses for the dataset with selection justifications
    and pre-detected selector columns.
    """
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = dataset.summary_json or {}
    plan = summary.get("plan", {})

    return {
        "dataset_id": str(dataset.id),
        "recommended_analyses": plan.get("recommended_analyses", []),
        "detected_selectors": plan.get("detected_selectors", {}),
        "features": plan.get("features", {}),
        "modules": plan.get("modules", {}),
    }


@router.get("/{dataset_id}/sheets")
async def get_dataset_sheets(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns available worksheets for an Excel workbook."""
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    from app.services.file_ingestion_service import FileIngestionService
    sheets = ["Sheet1"]
    if dataset.file_type in ("xlsx", "xls") and dataset.file_path:
        sheets = FileIngestionService.inspect_xlsx_sheets(dataset.file_path)

    return {
        "dataset_id": str(dataset.id),
        "available_sheets": sheets,
        "selected_sheet": dataset.selected_sheet or sheets[0],
    }


class SelectSheetRequest(BaseModel):
    sheet_name: str


@router.post("/{dataset_id}/select-sheet")
async def select_dataset_sheet(
    dataset_id: uuid.UUID,
    body: SelectSheetRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Switches the active worksheet for an Excel workbook and extracts updated 20-row preview.
    """
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    dataset = (await db.execute(stmt)).scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    from app.services.file_ingestion_service import FileIngestionService
    preview_rows, cols, col_metadata = FileIngestionService.extract_lightweight_preview(
        file_path=dataset.file_path,
        file_type="xlsx",
        sheet_name=body.sheet_name,
        limit=20,
    )

    dataset.selected_sheet = body.sheet_name
    await db.commit()

@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Streams the raw dataset file for download."""
    import os
    from fastapi.responses import FileResponse
    workspace_id = await _get_workspace_id(user, db)
    stmt = select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    file_path = dataset.file_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found on disk")

    return FileResponse(
        path=file_path,
        filename=dataset.filename or f"{dataset.name}.csv",
        media_type="application/octet-stream",
    )


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a dataset and its associated profiling data."""
    workspace_id = await _get_workspace_id(user, db)
    await db.execute(
        delete(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    )
    await db.commit()
    return {"status": "success", "message": "Dataset deleted."}

