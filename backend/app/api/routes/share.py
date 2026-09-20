"""
Secure Analysis Sharing & Transactional Email Routes
===================================================
Provides:
- Transactional email delivery with CustomerIQ branding via EmailService
- Signed cryptographic share link creation with expiration
- Safe, limited-access public viewer endpoint for shared reports
- Audit logging to email_logs and real navbar notifications
"""
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.models import Dataset, Report, ShareLink, EmailLog, Notification, VisualizationItem, InsightItem, RecommendationItem
from app.repositories.user_repository import UserRepository
from app.services.dataset_service import DatasetService
from app.services.email_service import EmailService, generate_analysis_email_html

router = APIRouter(prefix="/share", tags=["share"])


async def _get_workspace_id(user: User, db: AsyncSession) -> uuid.UUID:
    repo = UserRepository(db)
    ws = await repo.get_workspace(user.id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.id


class EmailShareRequest(BaseModel):
    recipient_email: str
    dataset_id: Optional[uuid.UUID] = None
    report_id: Optional[uuid.UUID] = None
    custom_message: Optional[str] = None
    include_sections: Optional[List[str]] = ["summary", "visualizations", "insights", "recommendations", "report_link"]


class CreateShareLinkRequest(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    report_id: Optional[uuid.UUID] = None
    title: Optional[str] = "CustomerIQ Analysis Report"
    allowed_sections: Optional[List[str]] = ["summary", "visualizations", "insights", "recommendations"]
    expires_in_days: Optional[int] = 7


@router.post("/email")
async def send_share_email(
    body: EmailShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dispatches a branded executive summary email and creates audit records."""
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)

    # Resolve dataset
    dataset: Optional[Dataset] = None
    if body.dataset_id:
        res = await db.execute(
            select(Dataset).where(Dataset.id == body.dataset_id, Dataset.workspace_id == workspace_id)
        )
        dataset = res.scalar_one_or_none()
    else:
        dataset = await service.get_active_dataset(workspace_id)

    if not dataset:
        raise HTTPException(status_code=404, detail="No active or specified dataset found for sharing.")

    # Generate or resolve secure share link token
    token = secrets.token_urlsafe(32)
    share_link = ShareLink(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        dataset_id=dataset.id,
        report_id=body.report_id,
        token=token,
        title=f"Analysis: {dataset.name}",
        allowed_sections=body.include_sections,
        expires_at=datetime.utcnow() + timedelta(days=14),
        is_revoked=False,
    )
    db.add(share_link)

    # Compile data for email
    summary_json = dataset.summary_json or {}
    metrics = {
        "Dataset": dataset.name,
        "Rows": f"{dataset.row_count:,}" if dataset.row_count else "0",
        "Columns": str(dataset.column_count or 0),
        "Data Quality": f"{dataset.quality_score or 100:.0f}/100",
    }

    # Fetch top insights and recommendations
    ins_res = await db.execute(
        select(InsightItem).where(InsightItem.dataset_id == dataset.id).limit(3)
    )
    top_insights = [
        {"title": i.title, "finding": i.finding, "priority": i.priority}
        for i in ins_res.scalars().all()
    ]
    if not top_insights and summary_json.get("insights"):
        top_insights = summary_json.get("insights", [])[:3]

    rec_res = await db.execute(
        select(RecommendationItem).where(RecommendationItem.dataset_id == dataset.id).limit(2)
    )
    top_recs = [
        {"title": r.title, "recommendation": r.recommendation, "impact": r.impact}
        for r in rec_res.scalars().all()
    ]
    if not top_recs and summary_json.get("recommendations"):
        top_recs = summary_json.get("recommendations", [])[:2]

    share_url = f"/share/{token}"
    email_html = generate_analysis_email_html(
        dataset_name=dataset.name,
        recipient_email=body.recipient_email,
        custom_message=body.custom_message,
        summary_metrics=metrics,
        top_insights=top_insights,
        top_recommendations=top_recs,
        secure_report_url=share_url if ("report_link" in (body.include_sections or [])) else None,
    )

    # Dispatch email
    email_svc = EmailService()
    try:
        dispatch_res = email_svc.send_email(
            to_email=body.recipient_email,
            subject=f"CustomerIQ Analysis Report: {dataset.name}",
            html_body=email_html,
        )
        status_val = dispatch_res.get("status", "sent")
        err_msg = dispatch_res.get("error")
    except Exception as e:
        status_val = "failed"
        err_msg = str(e)

    # Audit log to email_logs
    email_log = EmailLog(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=user.id,
        dataset_id=dataset.id,
        report_id=body.report_id,
        recipient=body.recipient_email,
        subject=f"CustomerIQ Analysis Report: {dataset.name}",
        status=status_val,
        error_message=err_msg,
    )
    db.add(email_log)

    # Create real notification for the user
    notif = Notification(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=user.id,
        title="Analysis Report Emailed",
        message=f"Analysis report for '{dataset.name}' was successfully emailed to {body.recipient_email}.",
        type="email_sent",
        severity="success" if status_val == "sent" else "warning",
        target_route="/app",
        is_read=False,
    )
    db.add(notif)

    await db.commit()

    if status_val == "failed":
        raise HTTPException(
            status_code=500,
            detail=f"Email could not be sent: {err_msg}. Please check configuration or retry.",
        )

    return {
        "status": "success",
        "message": f"Analysis report sent to {body.recipient_email}.",
        "email_id": str(email_log.id),
        "recipient": body.recipient_email,
        "share_url": share_url,
    }


@router.post("/link")
async def create_share_link(
    body: CreateShareLinkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a secure cryptographic share link with expiration."""
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)

    dataset: Optional[Dataset] = None
    if body.dataset_id:
        res = await db.execute(
            select(Dataset).where(Dataset.id == body.dataset_id, Dataset.workspace_id == workspace_id)
        )
        dataset = res.scalar_one_or_none()
    else:
        dataset = await service.get_active_dataset(workspace_id)

    if not dataset:
        raise HTTPException(status_code=404, detail="No dataset found to share.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days or 7)

    share_link = ShareLink(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        dataset_id=dataset.id,
        report_id=body.report_id,
        token=token,
        title=body.title or f"Analysis: {dataset.name}",
        allowed_sections=body.allowed_sections,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(share_link)

    notif = Notification(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=user.id,
        title="Secure Share Link Generated",
        message=f"Created share link for '{dataset.name}'. Valid for {body.expires_in_days} days.",
        type="share_link_created",
        severity="info",
        target_route="/app",
        is_read=False,
    )
    db.add(notif)

    await db.commit()

    return {
        "status": "success",
        "token": token,
        "share_url": f"/share/{token}",
        "expires_at": expires_at.isoformat(),
        "title": share_link.title,
    }


@router.get("/view/{token}")
async def get_public_shared_report(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public/unauthenticated endpoint allowing authorized recipients to securely
    view the shared report without exposing internal workspace or user data.
    """
    stmt = select(ShareLink).where(ShareLink.token == token)
    res = await db.execute(stmt)
    link = res.scalar_one_or_none()

    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or invalid.")

    if link.is_revoked:
        raise HTTPException(status_code=410, detail="This share link has been revoked by the owner.")

    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This share link has expired.")

    # Load dataset
    if not link.dataset_id:
        raise HTTPException(status_code=404, detail="Target dataset not found.")

    ds_stmt = select(Dataset).where(Dataset.id == link.dataset_id)
    ds_res = await db.execute(ds_stmt)
    dataset = ds_res.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no longer exists.")

    summary_json = dataset.summary_json or {}
    allowed = link.allowed_sections or ["summary", "visualizations", "insights", "recommendations"]

    # Gather visualizations if allowed
    visualizations = []
    if "visualizations" in allowed:
        viz_stmt = select(VisualizationItem).where(VisualizationItem.dataset_id == dataset.id).order_by(VisualizationItem.rank)
        viz_res = await db.execute(viz_stmt)
        visualizations = [
            {
                "id": str(v.id),
                "chart_type": v.chart_type,
                "title": v.title,
                "x_col": v.x_col,
                "y_col": v.y_col,
                "config": v.config_json,
            }
            for v in viz_res.scalars().all()
        ]

    # Gather insights if allowed
    insights = []
    if "insights" in allowed:
        ins_stmt = select(InsightItem).where(InsightItem.dataset_id == dataset.id).order_by(desc(InsightItem.created_at)).limit(6)
        ins_res = await db.execute(ins_stmt)
        insights = [
            {
                "title": i.title,
                "finding": i.finding,
                "evidence": i.evidence,
                "interpretation": i.interpretation,
                "recommended_action": i.recommended_action,
                "priority": i.priority,
            }
            for i in ins_res.scalars().all()
        ]
        if not insights and summary_json.get("insights"):
            insights = summary_json.get("insights", [])[:6]

    # Gather recommendations if allowed
    recommendations = []
    if "recommendations" in allowed:
        rec_stmt = select(RecommendationItem).where(RecommendationItem.dataset_id == dataset.id).order_by(desc(RecommendationItem.created_at)).limit(4)
        rec_res = await db.execute(rec_stmt)
        recommendations = [
            {
                "title": r.title,
                "finding": r.finding,
                "recommendation": r.recommendation,
                "impact": r.impact,
                "effort": r.effort,
            }
            for r in rec_res.scalars().all()
        ]
        if not recommendations and summary_json.get("recommendations"):
            recommendations = summary_json.get("recommendations", [])[:4]

    return {
        "title": link.title,
        "dataset_name": dataset.name,
        "dataset_type": dataset.dataset_type,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "quality_score": dataset.quality_score,
        "created_at": link.created_at.isoformat(),
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "summary": summary_json.get("profile", {}) if "summary" in allowed else {},
        "visualizations": visualizations,
        "insights": insights,
        "recommendations": recommendations,
    }


@router.delete("/link/{token}")
async def revoke_share_link(
    token: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revokes an active share link."""
    workspace_id = await _get_workspace_id(user, db)
    stmt = (
        update(ShareLink)
        .where(ShareLink.token == token, ShareLink.workspace_id == workspace_id)
        .values(is_revoked=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "Share link has been revoked."}
