"""Customer, Order, Dataset, RFMScore, CustomerSegment, AnalyticsSnapshot, Notification, Report models."""
import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String, DateTime, Date, Integer, Float, Numeric, Boolean,
    ForeignKey, Text, func, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(500))
    file_path: Mapped[str | None] = mapped_column(String(1000))
    parquet_path: Mapped[str | None] = mapped_column(String(1000))
    file_size: Mapped[int | None] = mapped_column(Integer, default=0)
    file_type: Mapped[str | None] = mapped_column(String(20), default="csv")  # csv | xlsx
    file_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    selected_sheet: Mapped[str | None] = mapped_column(String(255), nullable=True)
    available_sheets: Mapped[list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending|processing|completed|failed
    row_count: Mapped[int | None] = mapped_column(Integer, default=0)
    column_count: Mapped[int | None] = mapped_column(Integer, default=0)
    dataset_type: Mapped[str | None] = mapped_column(String(100), default="generic-tabular")
    type_confidence: Mapped[float | None] = mapped_column(Float, default=1.0)
    type_reason: Mapped[str | None] = mapped_column(Text)
    quality_score: Mapped[float | None] = mapped_column(Float, default=100.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    summary_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    error_message: Mapped[str | None] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workspace: Mapped["Workspace"] = relationship(back_populates="datasets")
    columns: Mapped[list["DatasetColumn"]] = relationship(back_populates="dataset", cascade="all, delete-orphan", lazy="select")
    analysis_runs: Mapped[list["AnalysisRun"]] = relationship(back_populates="dataset", cascade="all, delete-orphan", lazy="select")
    insights: Mapped[list["InsightItem"]] = relationship(back_populates="dataset", cascade="all, delete-orphan", lazy="select")
    recommendations: Mapped[list["RecommendationItem"]] = relationship(back_populates="dataset", cascade="all, delete-orphan", lazy="select")
    ml_models: Mapped[list["MLModel"]] = relationship(back_populates="dataset", cascade="all, delete-orphan", lazy="select")
    visualizations: Mapped[list["VisualizationItem"]] = relationship(back_populates="dataset", cascade="all, delete-orphan", lazy="select")



class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    customer_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # original CustomerID from CSV
    name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(100))
    join_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="customers")
    orders: Mapped[list["Order"]] = relationship(back_populates="customer", lazy="select")
    rfm_score: Mapped["RFMScore | None"] = relationship(back_populates="customer", uselist=False, lazy="select")
    segment: Mapped["CustomerSegment | None"] = relationship(back_populates="customer", uselist=False, lazy="select")

    def __repr__(self) -> str:
        return f"<Customer {self.customer_code}>"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, index=True)
    invoice_id: Mapped[str] = mapped_column(String(100))
    order_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(500))
    category: Mapped[str | None] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    country: Mapped[str | None] = mapped_column(String(100))

    customer: Mapped["Customer"] = relationship(back_populates="orders")


class RFMScore(Base):
    __tablename__ = "rfm_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, unique=True, index=True)
    recency_days: Mapped[int] = mapped_column(Integer)
    frequency: Mapped[int] = mapped_column(Integer)
    monetary: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    r_score: Mapped[int] = mapped_column(Integer)  # 1-5
    f_score: Mapped[int] = mapped_column(Integer)  # 1-5
    m_score: Mapped[int] = mapped_column(Integer)  # 1-5
    rfm_score: Mapped[int] = mapped_column(Integer)  # Combined e.g. 555
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="rfm_score")


class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, unique=True, index=True)
    segment_label: Mapped[str] = mapped_column(String(100))  # VIP, Loyal, Potential, At-Risk
    cluster_id: Mapped[int] = mapped_column(Integer)
    pca_x: Mapped[float | None] = mapped_column(Float)
    pca_y: Mapped[float | None] = mapped_column(Float)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="segment")


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_customers: Mapped[int] = mapped_column(Integer, default=0)
    avg_order_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    repeat_customer_rate: Mapped[float] = mapped_column(Float, default=0.0)
    metrics_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="analytics_snapshots")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="info")  # info|success|warning|error
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_route: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="notifications")
    user: Mapped["User"] = relationship(back_populates="notifications")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100))  # analytics|customers|rfm|segments|sales|profile
    status: Mapped[str] = mapped_column(String(50), default="completed")  # generating|completed|failed
    file_path: Mapped[str | None] = mapped_column(String(1000))
    summary_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="reports")


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    data_type: Mapped[str] = mapped_column(String(50), nullable=False)  # numeric, categorical, datetime, text, boolean
    semantic_type: Mapped[str] = mapped_column(String(100), default="generic")  # id, monetary, quantity, date, text, target
    missing_count: Mapped[int] = mapped_column(Integer, default=0)
    missing_pct: Mapped[float] = mapped_column(Float, default=0.0)
    unique_count: Mapped[int] = mapped_column(Integer, default=0)
    sample_values: Mapped[dict | list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    stats: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    outlier_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dataset: Mapped["Dataset"] = relationship(back_populates="columns")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    module_type: Mapped[str] = mapped_column(String(100), nullable=False)  # profiling, rfm, segmentation, sales, ml_classification, ml_regression, statistics, time_series, nlp
    status: Mapped[str] = mapped_column(String(50), default="completed")  # pending, running, completed, failed
    config_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    dataset: Mapped["Dataset"] = relationship(back_populates="analysis_runs")
    results: Mapped[list["AnalysisResult"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("analysis_runs.id"), nullable=False, index=True)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    result_type: Mapped[str] = mapped_column(String(100), nullable=False)
    summary_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    payload_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    run: Mapped["AnalysisRun"] = relationship(back_populates="results")


class VisualizationItem(Base):
    __tablename__ = "visualizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    chart_type: Mapped[str] = mapped_column(String(50), nullable=False)  # bar, line, area, scatter, pie, heatmap, boxplot, histogram
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    x_col: Mapped[str | None] = mapped_column(String(255))
    y_col: Mapped[str | None] = mapped_column(String(255))
    config_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    rank: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dataset: Mapped["Dataset"] = relationship(back_populates="visualizations")


class InsightItem(Base):
    __tablename__ = "insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # trend, comparison, distribution, anomaly, correlation, data_quality, ml_performance, segmentation
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    finding: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    interpretation: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # high, medium, low
    metric: Mapped[str | None] = mapped_column(String(100))
    metric_value: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dataset: Mapped["Dataset"] = relationship(back_populates="insights")


class RecommendationItem(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), default="operational")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    finding: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[str] = mapped_column(String(20), default="medium")  # high, medium, low
    effort: Mapped[str] = mapped_column(String(20), default="medium")  # high, medium, low
    status: Mapped[str] = mapped_column(String(50), default="open")  # open, in_progress, implemented, dismissed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dataset: Mapped["Dataset"] = relationship(back_populates="recommendations")


class MLModel(Base):
    __tablename__ = "ml_models"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)  # classification, regression
    algorithm: Mapped[str] = mapped_column(String(100), nullable=False)
    target_column: Mapped[str] = mapped_column(String(255), nullable=False)
    feature_columns: Mapped[list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    metrics: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    model_path: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dataset: Mapped["Dataset"] = relationship(back_populates="ml_models")
    metrics_records: Mapped[list["MLModelMetric"]] = relationship(back_populates="model", cascade="all, delete-orphan")


class MLModelMetric(Base):
    __tablename__ = "ml_model_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ml_models.id"), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    split_type: Mapped[str] = mapped_column(String(50), default="test")  # train, test, validation

    model: Mapped["MLModel"] = relationship(back_populates="metrics_records")


class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=True, index=True)
    report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Shared Analysis Report")
    allowed_sections: Mapped[list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmailLog(Base):
    __tablename__ = "email_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=True, index=True)
    report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True, index=True)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="sent")  # queued, sent, failed
    error_message: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="queued")  # queued | processing | completed | failed | cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0)
    current_step: Mapped[str] = mapped_column(String(255), default="Initializing")
    completed_steps: Mapped[list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=list)
    config_json: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    dataset: Mapped["Dataset"] = relationship()

