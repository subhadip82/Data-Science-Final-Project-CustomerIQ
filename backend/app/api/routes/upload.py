"""
Universal Tabular Upload Route (CSV & XLSX)
============================================
Supports:
- File validation (type, size, non-empty, encoding)
- Universal profiling & data quality check
- Automatic dataset classification (Sales, E-commerce, Customer, HR, Finance, etc.)
- Analysis planning & module suitability diagnostics
- Flexible Parquet & metadata persistence
"""
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.dependencies import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.models import Dataset, DatasetColumn, Notification
from app.repositories.user_repository import UserRepository
from app.services.dataset_service import DatasetService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


async def _get_workspace_id(user: User, db: AsyncSession) -> uuid.UUID:
    repo = UserRepository(db)
    ws = await repo.get_workspace(user.id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.id


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Universal ingestion pipeline for CSV and XLSX structured datasets."""
    # 1. Validate extension
    filename = file.filename or "unnamed_dataset.csv"
    ext = filename.lower().split(".")[-1]
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. CustomerIQ accepts CSV and XLSX files.",
        )

    # 2. Read and validate file size
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is completely empty.")
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    workspace_id = await _get_workspace_id(user, db)
    from app.services.file_ingestion_service import FileIngestionService

    file_hash = FileIngestionService.compute_file_hash(contents)

    # Check for existing duplicate dataset by file hash
    dup_stmt = select(Dataset).where(
        Dataset.workspace_id == workspace_id,
        Dataset.file_hash == file_hash,
    )
    existing_dup = (await db.execute(dup_stmt)).scalars().first()
    is_duplicate = existing_dup is not None
    duplicate_id = str(existing_dup.id) if existing_dup else None
    duplicate_name = existing_dup.name if existing_dup else None

    dataset_id = uuid.uuid4()
    service = DatasetService(db)

    try:
        # 3. Parse, profile, classify, and persist
        df, summary, raw_path, parquet_path = service.save_and_profile_file(
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            file_bytes=contents,
            original_filename=filename,
        )

        profile = summary["profile"]
        classification = summary["classification"]
        plan = summary["plan"]

        available_sheets = ["Sheet1"]
        selected_sheet = "Sheet1"
        if ext in ("xlsx", "xls"):
            available_sheets = FileIngestionService.inspect_xlsx_sheets(raw_path)
            selected_sheet = available_sheets[0] if available_sheets else "Sheet1"

        # Deactivate existing active datasets in this workspace
        await db.execute(
            update(Dataset).where(Dataset.workspace_id == workspace_id).values(is_active=False)
        )

        # 4. Insert Dataset record
        dataset = Dataset(
            id=dataset_id,
            workspace_id=workspace_id,
            name=filename.rsplit(".", 1)[0].replace("_", " ").title(),
            filename=filename,
            file_path=raw_path,
            parquet_path=parquet_path,
            file_size=len(contents),
            file_type=ext,
            file_hash=file_hash,
            selected_sheet=selected_sheet,
            available_sheets=available_sheets,
            status="completed",
            row_count=profile["row_count"],
            column_count=profile["column_count"],
            dataset_type=classification["dataset_type"],
            type_confidence=classification["confidence"],
            type_reason=classification["reason"],
            quality_score=profile["quality_score"],
            is_active=True,
            summary_json=summary,
            processed_at=datetime.utcnow(),
        )
        db.add(dataset)
        await db.flush()

        # 5. Insert DatasetColumn records
        for col_info in profile["columns"]:
            col_record = DatasetColumn(
                id=uuid.uuid4(),
                dataset_id=dataset_id,
                name=col_info["name"],
                original_name=col_info["original_name"],
                data_type=col_info["data_type"],
                semantic_type=col_info["semantic_type"],
                missing_count=col_info["missing_count"],
                missing_pct=col_info["missing_pct"],
                unique_count=col_info["unique_count"],
                sample_values=col_info["sample_values"],
                stats=col_info["stats"],
                outlier_count=col_info["outlier_count"],
            )
            db.add(col_record)

        # 6. Add real notifications
        notification = Notification(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            user_id=user.id,
            title="Dataset Processing Completed",
            message=f"'{dataset.name}' ({profile['row_count']:,} rows, {profile['column_count']} cols) is ready for dynamic exploration.",
            type="dataset_completed",
            severity="success",
            target_route="/app/data-profile",
            is_read=False,
        )
        db.add(notification)

        if profile.get("issues"):
            warning_notif = Notification(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user.id,
                title="Data Quality Warning",
                message=f"{profile['issues'][0]} detected in '{dataset.name}'.",
                type="data_quality_warning",
                severity="warning",
                target_route="/app/data-profile",
                is_read=False,
            )
            db.add(warning_notif)

        await db.commit()
        await db.refresh(dataset)

        return {
            "dataset_id": str(dataset_id),
            "name": dataset.name,
            "filename": filename,
            "file_type": ext,
            "file_size": len(contents),
            "uploaded_at": dataset.uploaded_at.isoformat() if dataset.uploaded_at else datetime.utcnow().isoformat(),
            "row_count": profile["row_count"],
            "column_count": profile["column_count"],
            "missing_pct": profile.get("missing_pct", 0.0),
            "duplicates": profile.get("duplicates", 0),
            "numeric_columns_count": len(plan.get("numeric_columns", [])),
            "categorical_columns_count": len(plan.get("categorical_columns", [])),
            "datetime_columns_count": len(plan.get("datetime_columns", [])),
            "text_columns_count": len(plan.get("text_columns", [])),
            "dataset_type": classification["dataset_type"],
            "dataset_type_label": classification["dataset_type_label"],
            "confidence": classification["confidence"],
            "reason": classification["reason"],
            "quality_score": profile["quality_score"],
            "issues": profile.get("issues", []),
            "recommendations": profile.get("recommendations", []),
            "features": plan.get("features", {}),
            "recommended_analyses": plan.get("recommended_analyses", []),
            "detected_selectors": plan.get("detected_selectors", {}),
            "modules": plan.get("modules", {}),
            "columns": profile.get("columns", []),
            "preview": summary.get("preview", [])[:20],
            "is_duplicate": is_duplicate,
            "duplicate_dataset_id": duplicate_id,
            "duplicate_name": duplicate_name,
            "available_sheets": available_sheets,
            "selected_sheet": selected_sheet,
            "status": "ready",
        }

    except Exception as e:
        logger.exception("Upload processing failed: %s", e)
        await db.rollback()
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process tabular file: {str(e)}",
        )


@router.get("/status/{dataset_id}")
async def get_upload_status(
    dataset_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.workspace_id == workspace_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "id": str(dataset.id),
        "status": dataset.status,
        "row_count": dataset.row_count,
        "error_message": dataset.error_message,
        "dataset_type": dataset.dataset_type,
    }


@router.get("/history")
async def get_upload_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    result = await db.execute(
        select(Dataset)
        .where(Dataset.workspace_id == workspace_id)
        .order_by(Dataset.uploaded_at.desc())
    )
    datasets = result.scalars().all()
    return {
        "datasets": [
            {
                "id": str(d.id),
                "name": d.name,
                "filename": d.filename,
                "file_type": d.file_type or "csv",
                "file_size": d.file_size,
                "row_count": d.row_count,
                "column_count": d.column_count,
                "dataset_type": d.dataset_type,
                "quality_score": d.quality_score,
                "is_active": d.is_active,
                "status": d.status,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            }
            for d in datasets
        ]
    }
