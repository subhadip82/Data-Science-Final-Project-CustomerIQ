"""
Universal Modules Router
========================
Implements:
- Segments (Universal K-Means + PCA)
- RFM Analysis (Conditional on transaction + customer + monetary fields)
- Sales Analytics (Conditional on revenue fields)
- Business Insights (Data-grounded findings)
- Action Recommendations (Impact & Effort ratings)
- Notifications (Persistent CRUD)
- Reports (Persistent CRUD + JSON/CSV export)
- Workspace Storage (Live disk usage calculation)
- Machine Learning (Classification / Regression leaderboard)
- Statistics (Correlations & Hypothesis testing)
"""
import io
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List
from pydantic import BaseModel
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, desc

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.models import (
    Dataset, Notification, Report,
    VisualizationItem, InsightItem, RecommendationItem,
    MLModel, MLModelMetric
)
from app.repositories.user_repository import UserRepository
from app.services.dataset_service import DatasetService
from app.ml.universal_clustering import run_universal_clustering
from app.ml.universal_ml import train_and_compare_models, analyze_feature_importance
from app.ml.universal_stats import compute_correlations, run_statistical_tests
from app.ml.universal_insights import generate_universal_insights_and_recs


async def _get_workspace_id(user: User, db: AsyncSession) -> uuid.UUID:
    repo = UserRepository(db)
    ws = await repo.get_workspace(user.id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.id


# ─── Storage Router ──────────────────────────────────────────────────────────
storage_router = APIRouter(prefix="/workspace", tags=["workspace"])

@storage_router.get("/storage")
async def get_workspace_storage(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculates live storage metrics for the user's workspace."""
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    return service.calculate_workspace_storage(workspace_id)


# ─── Segments Router ─────────────────────────────────────────────────────────
segments_router = APIRouter(prefix="/segments", tags=["segments"])

class ClusterRequest(BaseModel):
    features: Optional[List[str]] = None
    n_clusters: Optional[int] = None

@segments_router.get("")
async def get_segments(
    n_clusters: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"has_dataset": False, "segments": [], "pca_points": [], "n_clusters": 0}

    try:
        df = service.load_dataframe(dataset)
        clustering_res = run_universal_clustering(df, n_clusters=n_clusters)
        return {
            "has_dataset": True,
            "available": True,
            "dataset_name": dataset.name,
            "segments": clustering_res["clusters"],
            "pca_points": clustering_res["pca_points"],
            "elbow_curve": clustering_res["elbow_curve"],
            "explained_variance": clustering_res["explained_variance"],
            "total_customers": clustering_res["total_records"],
            "n_clusters": clustering_res["n_clusters"],
            "available_features": clustering_res["features"],
        }
    except Exception as e:
        return {
            "has_dataset": True,
            "available": False,
            "reason": str(e),
            "segments": [],
            "pca_points": [],
            "n_clusters": 0,
        }

@segments_router.post("/cluster")
async def customize_clustering(
    body: ClusterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="No active dataset")

    df = service.load_dataframe(dataset)
    res = run_universal_clustering(df, feature_cols=body.features, n_clusters=body.n_clusters)
    return res


# ─── RFM Router (Conditional) ────────────────────────────────────────────────
rfm_router = APIRouter(prefix="/rfm", tags=["rfm"])

@rfm_router.get("")
async def get_rfm(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    segment: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"has_dataset": False, "available": False, "reason": "No active dataset uploaded.", "customers": [], "total": 0}

    summary = dataset.summary_json or {}
    plan = summary.get("plan", {}).get("modules", {}).get("rfm", {})

    if not plan.get("available", False):
        return {
            "has_dataset": True,
            "available": False,
            "reason": plan.get("reason", "RFM analysis is unavailable because required fields (customer identifier, transaction date, or monetary value) were not detected."),
            "missing_fields": plan.get("missing_fields", ["Customer ID", "Invoice Date", "Monetary Value"]),
            "customers": [],
            "total": 0,
        }

    # If RFM is available, calculate on the fly from active dataset
    df = service.load_dataframe(dataset)
    det = plan.get("detected_fields", {})
    cust_col = det.get("customer_col")
    date_col = det.get("date_col")
    mon_col = det.get("monetary_col")

    temp = df.dropna(subset=[cust_col, date_col, mon_col]).copy()
    temp["dt"] = pd.to_datetime(temp[date_col], errors="coerce")
    temp = temp.dropna(subset=["dt"])

    ref_date = temp["dt"].max() + timedelta(days=1)
    rfm_df = temp.groupby(cust_col).agg(
        recency_days=("dt", lambda d: int((ref_date - d.max()).days)),
        frequency=("dt", "count"),
        monetary=(mon_col, "sum"),
    ).reset_index()

    # Quintile calculations
    rfm_df["r_score"] = pd.qcut(rfm_df["recency_days"].rank(method="first"), 5, labels=[5, 4, 3, 2, 1]).astype(int)
    rfm_df["f_score"] = pd.qcut(rfm_df["frequency"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_df["m_score"] = pd.qcut(rfm_df["monetary"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_df["rfm_score"] = rfm_df["r_score"] * 100 + rfm_df["f_score"] * 10 + rfm_df["m_score"]

    def map_segment(row):
        r, f, m = row["r_score"], row["f_score"], row["m_score"]
        if r >= 4 and m >= 4:
            return "VIP Customers"
        elif f >= 4:
            return "Loyal Customers"
        elif r >= 3 and f <= 2:
            return "Potential Customers"
        else:
            return "At-Risk Customers"

    rfm_df["segment_label"] = rfm_df.apply(map_segment, axis=1)

    if segment:
        rfm_df = rfm_df[rfm_df["segment_label"] == segment]

    total = len(rfm_df)
    offset = (page - 1) * page_size
    paged = rfm_df.iloc[offset : offset + page_size]

    customers = [
        {
            "customer_id": str(r[cust_col]),
            "customer_code": str(r[cust_col]),
            "name": str(r[cust_col]),
            "country": "Global",
            "recency_days": int(r["recency_days"]),
            "frequency": int(r["frequency"]),
            "monetary": round(float(r["monetary"]), 2),
            "r_score": int(r["r_score"]),
            "f_score": int(r["f_score"]),
            "m_score": int(r["m_score"]),
            "rfm_score": int(r["rfm_score"]),
            "segment_label": str(r["segment_label"]),
        }
        for _, r in paged.iterrows()
    ]

    r_counts = rfm_df["r_score"].value_counts().to_dict()
    f_counts = rfm_df["f_score"].value_counts().to_dict()

    rec_dist = [{"score": i, "count": r_counts.get(i, 0)} for i in range(1, 6)]
    freq_dist = [{"score": i, "count": f_counts.get(i, 0)} for i in range(1, 6)]
    mon_dist = [{"bucket": float(v), "count": int(c)} for v, c in rfm_df["m_score"].value_counts().items()]

    return {
        "has_dataset": True,
        "available": True,
        "customers": customers,
        "total": total,
        "page": page,
        "page_size": page_size,
        "recency_distribution": rec_dist,
        "frequency_distribution": freq_dist,
        "monetary_distribution": mon_dist,
    }


# ─── Sales Router (Conditional) ──────────────────────────────────────────────
sales_router = APIRouter(prefix="/sales", tags=["sales"])

@sales_router.get("")
async def get_sales(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"has_dataset": False, "available": False, "reason": "No active dataset."}

    summary = dataset.summary_json or {}
    plan = summary.get("plan", {}).get("modules", {}).get("sales", {})

    if not plan.get("available", False):
        return {
            "has_dataset": True,
            "available": False,
            "reason": plan.get("reason", "Sales analytics is unavailable because no revenue or sales numeric fields were detected."),
            "total_revenue": 0,
            "total_orders": 0,
            "monthly_sales": [],
            "top_products": [],
            "country_sales": [],
        }

    df = service.load_dataframe(dataset)
    rev_col = plan.get("detected_fields", {}).get("revenue_col")
    date_col = plan.get("detected_fields", {}).get("date_col") or next((c for c in df.columns if "date" in c.lower()), None)
    prod_col = next((c for c in df.columns if any(k in c.lower() for k in ["product", "item", "sku", "description"])), None)
    ctry_col = next((c for c in df.columns if any(k in c.lower() for k in ["country", "state", "region", "city"])), None)

    total_rev = round(float(df[rev_col].sum()), 2) if rev_col else 0.0
    total_orders = len(df)
    aov = round(total_rev / total_orders, 2) if total_orders > 0 else 0.0

    monthly_sales = []
    growth_rate = 0.0
    if date_col and rev_col:
        try:
            temp = df.dropna(subset=[date_col, rev_col]).copy()
            temp["dt"] = pd.to_datetime(temp[date_col], errors="coerce")
            temp = temp.dropna(subset=["dt"]).sort_values("dt")
            temp["month"] = temp["dt"].dt.strftime("%Y-%m")
            grouped = temp.groupby("month")[rev_col].agg(["sum", "count"]).reset_index()
            for _, r in grouped.iterrows():
                monthly_sales.append({
                    "month": str(r["month"]),
                    "revenue": round(float(r["sum"]), 2),
                    "orders": int(r["count"]),
                    "avg_order_value": round(float(r["sum"]) / max(int(r["count"]), 1), 2),
                })
            if len(monthly_sales) >= 2:
                last = monthly_sales[-1]["revenue"]
                prev = monthly_sales[-2]["revenue"]
                if prev > 0:
                    growth_rate = round(((last - prev) / prev) * 100, 1)
        except Exception:
            pass

    top_products = []
    if prod_col and rev_col:
        try:
            pg = df.groupby(prod_col)[rev_col].agg(["sum", "count"]).sort_values("sum", ascending=False).head(10)
            for k, r in pg.iterrows():
                top_products.append({
                    "product": str(k)[:35],
                    "revenue": round(float(r["sum"]), 2),
                    "quantity": int(r["count"]),
                })
        except Exception:
            pass

    country_sales = []
    if ctry_col and rev_col:
        try:
            cg = df.groupby(ctry_col)[rev_col].agg(["sum", "count"]).sort_values("sum", ascending=False).head(10)
            for k, r in cg.iterrows():
                country_sales.append({
                    "country": str(k),
                    "revenue": round(float(r["sum"]), 2),
                    "orders": int(r["count"]),
                })
        except Exception:
            pass

    return {
        "has_dataset": True,
        "available": True,
        "total_revenue": total_rev,
        "total_orders": total_orders,
        "avg_order_value": aov,
        "growth_rate": growth_rate,
        "monthly_sales": monthly_sales,
        "top_products": top_products,
        "country_sales": country_sales,
    }


# ─── Insights Router ─────────────────────────────────────────────────────────
insights_router = APIRouter(prefix="/insights", tags=["insights"])

@insights_router.get("")
async def get_insights(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"has_dataset": False, "insights": [], "generated_at": datetime.utcnow().isoformat()}

    summary = dataset.summary_json or {}
    insights = summary.get("insights", [])
    if not insights:
        try:
            df = service.load_dataframe(dataset)
            cols = summary.get("profile", {}).get("columns", [])
            insights, _ = generate_universal_insights_and_recs(df, dataset.dataset_type, cols)
        except Exception:
            insights = []

    return {
        "has_dataset": True,
        "dataset_name": dataset.name,
        "insights": insights,
        "generated_at": dataset.processed_at.isoformat() if dataset.processed_at else datetime.utcnow().isoformat(),
    }


# ─── Recommendations Router ──────────────────────────────────────────────────
recommendations_router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@recommendations_router.get("")
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"has_dataset": False, "recommendations": []}

    summary = dataset.summary_json or {}
    recs = summary.get("recommendations", [])
    if not recs:
        try:
            df = service.load_dataframe(dataset)
            cols = summary.get("profile", {}).get("columns", [])
            _, recs = generate_universal_insights_and_recs(df, dataset.dataset_type, cols)
        except Exception:
            recs = []

    return {
        "has_dataset": True,
        "dataset_name": dataset.name,
        "recommendations": recs,
    }


# ─── Notifications Router ────────────────────────────────────────────────────
# ─── Notifications Router ────────────────────────────────────────────────────
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])

@notifications_router.get("")
async def list_notifications(
    limit: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    stmt = (
        select(Notification)
        .where(Notification.workspace_id == workspace_id)
        .order_by(desc(Notification.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    # Total unread
    unread_stmt = (
        select(Notification)
        .where(Notification.workspace_id == workspace_id, Notification.is_read == False)
    )
    unread_res = await db.execute(unread_stmt)
    unread_items = unread_res.scalars().all()
    unread_count = len(unread_items)

    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "severity": getattr(n, "severity", None) or n.type,
                "is_read": n.is_read,
                "target_route": getattr(n, "target_route", None),
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ],
        "unread_count": unread_count,
        "total": len(items),
    }

@notifications_router.get("/unread-count")
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    stmt = (
        select(Notification)
        .where(Notification.workspace_id == workspace_id, Notification.is_read == False)
    )
    res = await db.execute(stmt)
    unread_count = len(res.scalars().all())
    return {"unread_count": unread_count}

@notifications_router.patch("/{id}/read")
async def mark_notification_read(
    id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    await db.execute(
        update(Notification)
        .where(Notification.id == id, Notification.workspace_id == workspace_id)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}

@notifications_router.patch("/mark-all-read")
@notifications_router.patch("/read-all")
async def mark_all_notifications_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    await db.execute(
        update(Notification).where(Notification.workspace_id == workspace_id).values(is_read=True)
    )
    await db.commit()
    return {"status": "success", "unread_count": 0}


# ─── Reports Router ──────────────────────────────────────────────────────────
reports_router = APIRouter(prefix="/reports", tags=["reports"])

@reports_router.get("")
async def list_reports(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    res = await db.execute(
        select(Report)
        .where(Report.workspace_id == workspace_id)
        .order_by(desc(Report.created_at))
    )
    reports = res.scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "name": r.name,
                "type": r.type,
                "status": r.status,
                "summary": r.summary_json,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ],
        "total": len(reports),
    }

@reports_router.post("/generate")
async def generate_report(
    report_type: str = Query("summary"),  # summary | full | statistics | ml | business | features
    dataset_id: Optional[uuid.UUID] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)

    ds_uuid = None
    if dataset_id and not hasattr(dataset_id, "default"):
        try:
            ds_uuid = uuid.UUID(str(dataset_id))
        except Exception:
            ds_uuid = None

    if ds_uuid:
        stmt = select(Dataset).where(Dataset.id == ds_uuid, Dataset.workspace_id == workspace_id)
        dataset = (await db.execute(stmt)).scalar_one_or_none()
    else:
        dataset = await service.get_active_dataset(workspace_id)

    report_titles = {
        "summary": "Executive Summary",
        "full": "Comprehensive Analysis Report",
        "statistics": "Statistical & Correlation Audit",
        "ml": "Predictive Machine Learning Benchmark",
        "business": "Strategic Business Intelligence & Playbook",
        "features": "Feature Importance & Key Drivers Report",
    }
    title_suffix = report_titles.get(report_type.lower(), f"{report_type.title()} Report")
    name = f"{dataset.name if dataset else 'Workspace'} — {title_suffix}"

    # Gather data from dataset summary and database
    summary_json: dict = {}
    if dataset:
        ds_summary = dataset.summary_json or {}
        profile = ds_summary.get("profile", {})
        classification = ds_summary.get("classification", {})
        plan = ds_summary.get("plan", {})

        # Load dataframe for dynamic calculations
        df = None
        try:
            df = service.load_dataframe(dataset)
        except Exception:
            df = None

        # Fetch stored visualizations, insights, recommendations
        viz_res = await db.execute(
            select(VisualizationItem).where(VisualizationItem.dataset_id == dataset.id)
        )
        visualizations = [
            {"title": v.title, "chart_type": v.chart_type, "x_col": v.x_col, "y_col": v.y_col}
            for v in viz_res.scalars().all()
        ]

        ins_res = await db.execute(
            select(InsightItem).where(InsightItem.dataset_id == dataset.id).limit(10)
        )
        insights = [
            {"title": i.title, "finding": i.finding, "evidence": i.evidence, "priority": i.priority}
            for i in ins_res.scalars().all()
        ]

        rec_res = await db.execute(
            select(RecommendationItem).where(RecommendationItem.dataset_id == dataset.id).limit(10)
        )
        recommendations = [
            {"title": r.title, "recommendation": r.recommendation, "impact": r.impact, "effort": r.effort}
            for r in rec_res.scalars().all()
        ]

        # If analysis has not been run yet, synthesize on-the-fly insights & charts
        if (not visualizations or not insights) and df is not None and len(df) > 0:
            try:
                raw_cols = profile.get("columns") or []
                d_type = classification.get("dataset_type", dataset.dataset_type or "generic-tabular")
                dyn_insights, dyn_recs = generate_universal_insights_and_recs(df, d_type, raw_cols)
                if not insights:
                    insights = [
                        {"title": ins.get("title"), "finding": ins.get("finding"), "evidence": ins.get("evidence"), "priority": ins.get("priority", "medium")}
                        for ins in dyn_insights[:8]
                    ]
                if not recommendations:
                    recommendations = [
                        {"title": r.get("title"), "recommendation": r.get("recommendation"), "impact": r.get("impact", "medium"), "effort": r.get("effort", "medium")}
                        for r in dyn_recs[:6]
                    ]
                if not visualizations:
                    # Synthesize basic visualizations
                    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                    cat_cols = [c for c in df.columns if c not in num_cols]
                    if cat_cols:
                        c_col = cat_cols[0]
                        visualizations.append({
                            "title": f"Distribution by {c_col.replace('_', ' ').title()}",
                            "chart_type": "bar",
                            "x_col": c_col,
                            "y_col": "count",
                        })
                    if num_cols:
                        n_col = num_cols[0]
                        visualizations.append({
                            "title": f"Spread of {n_col.replace('_', ' ').title()}",
                            "chart_type": "area",
                            "x_col": n_col,
                            "y_col": "frequency",
                        })
            except Exception:
                pass

        # Feature Importance Analysis
        feature_importance_data = None
        if df is not None and len(df) >= 5:
            try:
                feat_res = analyze_feature_importance(df)
                if feat_res.get("status") == "success":
                    feature_importance_data = feat_res
            except Exception:
                pass

        summary_json = {
            "report_type": report_type,
            "generated_at": datetime.utcnow().isoformat(),
            "dataset_overview": {
                "dataset_name": dataset.name,
                "dataset_id": str(dataset.id),
                "filename": dataset.filename,
                "rows": dataset.row_count,
                "columns": dataset.column_count,
                "dataset_type": dataset.dataset_type,
                "confidence": dataset.type_confidence,
            },
            "data_quality": {
                "quality_score": dataset.quality_score or 100.0,
                "missing_pct": profile.get("missing_pct", 0.0),
                "duplicates": profile.get("duplicates", 0),
                "warnings": profile.get("issues", []),
            },
            "eda": {
                "numeric_columns": plan.get("numeric_columns", []),
                "categorical_columns": plan.get("categorical_columns", []),
                "datetime_columns": plan.get("datetime_columns", []),
                "text_columns": plan.get("text_columns", []),
            },
            "feature_importance": feature_importance_data,
            "visualizations": visualizations,
            "insights": insights,
            "recommendations": recommendations,
            "limitations": [
                "Analysis reflects tabular distributions at upload time.",
                f"Data quality confidence rating: {dataset.quality_score or 100:.0f}/100.",
                "Statistical tests assume random sampling from underlying population.",
            ],
        }
    else:
        summary_json = {
            "report_type": report_type,
            "generated_at": datetime.utcnow().isoformat(),
            "note": "Generated without active dataset.",
        }

    report = Report(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        dataset_id=dataset.id if dataset else None,
        name=name,
        type=report_type,
        status="completed",
        summary_json=summary_json,
    )
    db.add(report)

    # Emit real notification
    notification = Notification(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=user.id,
        title="Report Generated",
        message=f"'{name}' has been compiled and is ready for export and sharing.",
        type="report_generated",
        severity="success",
        target_route="/app/reports",
        is_read=False,
    )
    db.add(notification)

    await db.commit()
    return {"status": "success", "report_id": str(report.id), "name": name, "type": report_type}

@reports_router.delete("/{id}")
async def delete_report(
    id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    await db.execute(delete(Report).where(Report.id == id, Report.workspace_id == workspace_id))
    await db.commit()
    return {"status": "success"}


# ─── Machine Learning Router ─────────────────────────────────────────────────
ml_router = APIRouter(prefix="/ml", tags=["machine-learning"])

class MLTrainRequest(BaseModel):
    target_column: str
    feature_columns: Optional[List[str]] = None
    task_type: Optional[str] = None

@ml_router.post("/train")
async def train_models(
    body: MLTrainRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="No active dataset")

    df = service.load_dataframe(dataset)
    res = train_and_compare_models(
        df=df,
        target_column=body.target_column,
        feature_columns=body.feature_columns,
        task_type=body.task_type,
    )

    if res.get("status") == "success":
        notif = Notification(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            user_id=user.id,
            title="ML Benchmark Complete",
            message=f"Trained models for target '{body.target_column}'. Top algorithm: {res.get('best_model')}.",
            type="model_completed",
            severity="info",
            target_route="/app/analytics",
            is_read=False,
        )
        db.add(notif)
        await db.commit()

    return res


# ─── Statistics Router ───────────────────────────────────────────────────────
stats_router = APIRouter(prefix="/statistics", tags=["statistics"])

@stats_router.get("")
async def get_statistics(
    method: str = Query("pearson"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)
    dataset = await service.get_active_dataset(workspace_id)
    if not dataset:
        return {"has_dataset": False, "correlations": None, "tests": []}

    df = service.load_dataframe(dataset)
    corr = compute_correlations(df, method=method)
    tests = run_statistical_tests(df)
    return {
        "has_dataset": True,
        "correlations": corr,
        "tests": tests,
    }


# ─── Features Router ─────────────────────────────────────────────────────────
features_router = APIRouter(prefix="/features", tags=["features"])

@features_router.get("/importance")
async def get_feature_importance(
    dataset_id: Optional[uuid.UUID] = Query(None),
    target_column: Optional[str] = Query(None),
    top_k: int = Query(15),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)

    ds_uuid = None
    if dataset_id and not hasattr(dataset_id, "default"):
        try:
            ds_uuid = uuid.UUID(str(dataset_id))
        except Exception:
            ds_uuid = None

    if ds_uuid:
        stmt = select(Dataset).where(Dataset.id == ds_uuid, Dataset.workspace_id == workspace_id)
        dataset = (await db.execute(stmt)).scalar_one_or_none()
    else:
        dataset = await service.get_active_dataset(workspace_id)

    if not dataset:
        return {
            "has_dataset": False,
            "status": "empty",
            "message": "No active dataset found in workspace. Upload or select a dataset to inspect features.",
            "features": [],
        }

    try:
        df = service.load_dataframe(dataset)
        target_col = str(target_column) if (target_column and not hasattr(target_column, "default")) else None
        try:
            k_val = int(top_k) if (top_k and not hasattr(top_k, "default")) else 15
        except Exception:
            k_val = 15

        result = analyze_feature_importance(
            df=df,
            target_column=target_col,
            top_k=k_val,
        )
        result["has_dataset"] = True
        result["dataset_id"] = str(dataset.id)
        result["dataset_name"] = dataset.name
        result["dataset_type"] = dataset.dataset_type
        result["total_rows"] = dataset.row_count
        result["total_columns"] = dataset.column_count
        return result
    except Exception as e:
        return {
            "has_dataset": True,
            "dataset_id": str(dataset.id),
            "dataset_name": dataset.name,
            "status": "error",
            "message": str(e),
            "features": [],
        }


@features_router.get("/targets")
async def get_candidate_targets(
    dataset_id: Optional[uuid.UUID] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = await _get_workspace_id(user, db)
    service = DatasetService(db)

    ds_uuid = None
    if dataset_id and not hasattr(dataset_id, "default"):
        try:
            ds_uuid = uuid.UUID(str(dataset_id))
        except Exception:
            ds_uuid = None

    if ds_uuid:
        stmt = select(Dataset).where(Dataset.id == ds_uuid, Dataset.workspace_id == workspace_id)
        dataset = (await db.execute(stmt)).scalar_one_or_none()
    else:
        dataset = await service.get_active_dataset(workspace_id)

    if not dataset:
        return {"has_dataset": False, "targets": []}

    try:
        df = service.load_dataframe(dataset)
        target_keywords = [
            "target", "churn", "attrition", "status", "outcome", "converted",
            "default", "sales", "revenue", "profit", "score", "performance",
            "rating", "satisfaction", "salary", "price", "amount", "total", "grade"
        ]
        candidates = []
        for col in df.columns:
            if col.lower().endswith(("id", "uuid", "key", "code")) and df[col].nunique() > len(df) * 0.8:
                continue
            is_num = pd.api.types.is_numeric_dtype(df[col])
            n_uniq = int(df[col].nunique())
            if n_uniq <= 1:
                continue
            is_candidate = any(kw in col.lower() for kw in target_keywords) or (is_num and n_uniq >= 3)
            candidates.append({
                "column": col,
                "display_name": col.replace("_", " ").title(),
                "data_type": "numeric" if is_num else "categorical",
                "unique_values": n_uniq,
                "is_candidate": is_candidate,
            })
        return {
            "has_dataset": True,
            "dataset_id": str(dataset.id),
            "dataset_name": dataset.name,
            "targets": candidates,
        }
    except Exception as e:
        return {"has_dataset": True, "targets": [], "error": str(e)}
