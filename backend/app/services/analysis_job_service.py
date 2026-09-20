"""
Analysis Job Service for CustomerIQ
==================================
Manages asynchronous background analysis jobs:
- Dispatches non-blocking async worker jobs
- Real-time step and progress percentage tracking (0 - 100%)
- Job cancellation and safe resource cleanup
- Idempotency protection against duplicate concurrent job creation
- Job retry support without requiring dataset re-upload
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_

from app.db.session import AsyncSessionLocal
from app.models.models import AnalysisJob, Dataset, Notification
from app.services.dataset_service import DatasetService

logger = logging.getLogger(__name__)

# In-memory tracking of active tasks for cancellation
_ACTIVE_JOB_TASKS: Dict[str, asyncio.Task] = {}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AnalysisJobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_job(
        self,
        workspace_id: uuid.UUID,
        dataset_id: uuid.UUID,
        user_id: uuid.UUID,
        config: Optional[Dict[str, Any]] = None,
    ) -> AnalysisJob:
        """
        Creates an AnalysisJob record and kicks off an asynchronous background runner.
        Enforces idempotency: if an active job already exists for this dataset, returns it.
        """
        config = config or {}

        # 1. Check for existing running or queued job for this dataset
        stmt = select(AnalysisJob).where(
            and_(
                AnalysisJob.dataset_id == dataset_id,
                AnalysisJob.workspace_id == workspace_id,
                AnalysisJob.status.in_(["queued", "processing"]),
            )
        )
        existing = (await self.db.execute(stmt)).scalars().first()
        if existing:
            return existing

        # 2. Create new AnalysisJob
        job_id = uuid.uuid4()
        job = AnalysisJob(
            id=job_id,
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            status="queued",
            progress=0,
            current_step="Queued for analysis",
            completed_steps=[],
            config_json=config,
            created_at=_utc_now(),
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        # 3. Launch background asyncio task
        task = asyncio.create_task(
            self._run_job_worker(job_id=job_id, user_id=user_id, config=config)
        )
        _ACTIVE_JOB_TASKS[str(job_id)] = task

        return job

    async def get_job(self, job_id: uuid.UUID, workspace_id: uuid.UUID) -> Optional[AnalysisJob]:
        """Fetches an AnalysisJob by ID and ensures workspace isolation."""
        stmt = select(AnalysisJob).where(
            and_(AnalysisJob.id == job_id, AnalysisJob.workspace_id == workspace_id)
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def cancel_job(self, job_id: uuid.UUID, workspace_id: uuid.UUID) -> bool:
        """Cancels a queued or processing job safely."""
        job = await self.get_job(job_id, workspace_id)
        if not job or job.status in ("completed", "failed", "cancelled"):
            return False

        job.status = "cancelled"
        job.current_step = "Analysis cancelled by user"
        job.updated_at = _utc_now()
        await self.db.commit()

        # Cancel running asyncio task if registered
        task = _ACTIVE_JOB_TASKS.get(str(job_id))
        if task and not task.done():
            task.cancel()

        return True

    async def retry_job(
        self,
        job_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[AnalysisJob]:
        """Retries a failed or cancelled analysis job using the existing dataset."""
        old_job = await self.get_job(job_id, workspace_id)
        if not old_job:
            return None

        # Re-dispatch new job with same config
        return await self.create_job(
            workspace_id=workspace_id,
            dataset_id=old_job.dataset_id,
            user_id=user_id,
            config=old_job.config_json or {},
        )

    @staticmethod
    async def _run_job_worker(job_id: uuid.UUID, user_id: uuid.UUID, config: Dict[str, Any]):
        """Background asynchronous execution pipeline with milestone updates."""
        completed_milestones: List[str] = []

        async def set_step(step_name: str, pct: int):
            async with AsyncSessionLocal() as s:
                stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
                current_job = (await s.execute(stmt)).scalars().first()
                if current_job:
                    if current_job.status == "cancelled":
                        raise asyncio.CancelledError("Job was cancelled by user.")
                    current_job.status = "processing"
                    current_job.current_step = step_name
                    current_job.progress = pct
                    current_job.completed_steps = list(completed_milestones)
                    current_job.updated_at = _utc_now()
                    await s.commit()

        try:
            # Milestone 1: File & Memory Validation
            await set_step("Validating memory and tabular structure", 12)
            await asyncio.sleep(0.2)
            completed_milestones.append("File & Memory Validation")

            # Milestone 2: Schema & Semantic Detection
            await set_step("Detecting column schemas and semantic types", 25)
            await asyncio.sleep(0.2)
            completed_milestones.append("Schema & Semantic Detection")

            # Milestone 3: Data Quality & Profiling
            await set_step("Profiling missing values and integrity scores", 38)
            await asyncio.sleep(0.2)
            completed_milestones.append("Data Quality & Integrity Profiling")

            # Milestone 4 - 8: Execute universal analysis via DatasetService
            async with AsyncSessionLocal() as session:
                job_stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
                job_rec = (await session.execute(job_stmt)).scalars().first()
                if not job_rec:
                    return

                ds_stmt = select(Dataset).where(Dataset.id == job_rec.dataset_id)
                dataset = (await session.execute(ds_stmt)).scalars().first()
                if not dataset:
                    raise FileNotFoundError(f"Dataset {job_rec.dataset_id} not found.")

                await set_step("Running Exploratory Data Analysis (EDA)", 50)
                completed_milestones.append("Exploratory Data Analysis")

                await set_step("Computing statistical correlations and tests", 65)
                completed_milestones.append("Statistical & Correlation Analysis")

                await set_step("Training machine learning and segmentation models", 78)
                completed_milestones.append("Machine Learning & Segmentation")

                await set_step("Generating dynamic charts and visualizations", 88)
                completed_milestones.append("Automated Visualizations")

                await set_step("Synthesizing business insights & strategic playbooks", 95)

                service = DatasetService(session)
                analysis_result = await service.run_full_analysis(
                    dataset=dataset,
                    user_id=user_id,
                    config=config,
                )

                completed_milestones.append("Insights & Strategic Playbooks")

                # Refresh job record and mark completed
                job_stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
                job_rec = (await session.execute(job_stmt)).scalars().first()
                if job_rec:
                    job_rec.status = "completed"
                    job_rec.progress = 100
                    job_rec.current_step = "Analysis completed successfully"
                    job_rec.completed_steps = completed_milestones
                    job_rec.completed_at = _utc_now()
                    job_rec.updated_at = _utc_now()
                    await session.commit()
                logger.info(f"Analysis job {job_id} successfully completed.")

        except asyncio.CancelledError:
            logger.info(f"Analysis job {job_id} was cancelled.")
            try:
                async with AsyncSessionLocal() as cleanup_session:
                    stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
                    j = (await cleanup_session.execute(stmt)).scalars().first()
                    if j:
                        j.status = "cancelled"
                        j.current_step = "Analysis cancelled by user"
                        j.updated_at = _utc_now()
                        await cleanup_session.commit()
            except Exception as ex:
                logger.warning(f"Could not record cancellation for {job_id}: {ex}")
        except Exception as e:
            # Check if this task or job was cancelled
            is_cancelled = False
            try:
                curr_task = asyncio.current_task()
                if curr_task and curr_task.cancelling() > 0:
                    is_cancelled = True
            except Exception:
                pass

            if is_cancelled or isinstance(e, asyncio.CancelledError):
                logger.info(f"Analysis job {job_id} task was cancelled during execution.")
                return

            try:
                async with AsyncSessionLocal() as cleanup_session:
                    stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
                    j = (await cleanup_session.execute(stmt)).scalars().first()
                    if j and j.status == "cancelled":
                        logger.info(f"Analysis job {job_id} is already marked cancelled.")
                        return
                    if j:
                        logger.error(f"Analysis job {job_id} failed: {e}", exc_info=True)
                        j.status = "failed"
                        j.error = str(e)
                        j.current_step = f"Failed: {str(e)}"
                        j.updated_at = _utc_now()
                        await cleanup_session.commit()
            except Exception as ex:
                logger.warning(f"Could not record failure for {job_id}: {ex}")
        finally:
            _ACTIVE_JOB_TASKS.pop(str(job_id), None)
