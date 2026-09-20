"""Pydantic schemas for all API request/response models."""
from __future__ import annotations
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict


# ─── Base ───────────────────────────────────────────────────────────────────

class TimestampMixin(BaseModel):
    created_at: datetime


# ─── Auth / User ─────────────────────────────────────────────────────────────

class UserSyncRequest(BaseModel):
    clerk_user_id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clerk_user_id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    plan: str
    created_at: datetime


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_revenue: float
    total_orders: int
    total_customers: int
    avg_order_value: float
    repeat_customer_rate: float
    revenue_change_pct: float
    orders_change_pct: float
    customers_change_pct: float
    aov_change_pct: float


class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    orders: int


class CountryRevenue(BaseModel):
    country: str
    revenue: float
    orders: int


class ProductRevenue(BaseModel):
    product: str
    revenue: float
    quantity: int


class SegmentDistribution(BaseModel):
    segment: str
    count: int
    percentage: float
    revenue: float


class AnalyticsResponse(BaseModel):
    summary: DashboardSummary
    revenue_trend: list[RevenueDataPoint]
    country_revenue: list[CountryRevenue]
    top_products: list[ProductRevenue]
    segment_distribution: list[SegmentDistribution]


# ─── Customers ───────────────────────────────────────────────────────────────

class CustomerListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_code: str
    name: Optional[str]
    country: Optional[str]
    status: str
    total_orders: int = 0
    total_revenue: float = 0.0
    recency_days: Optional[int] = None
    frequency: Optional[int] = None
    monetary: Optional[float] = None
    rfm_score: Optional[int] = None
    segment_label: Optional[str] = None


class CustomerListResponse(BaseModel):
    items: list[CustomerListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrderDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: str
    order_date: date
    product: str
    category: Optional[str]
    quantity: int
    unit_price: float
    total_price: float
    country: Optional[str]


class CustomerDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_code: str
    name: Optional[str]
    email: Optional[str]
    country: Optional[str]
    join_date: Optional[date]
    status: str
    total_orders: int = 0
    total_revenue: float = 0.0
    avg_order_value: float = 0.0
    last_purchase_date: Optional[date] = None
    recency_days: Optional[int] = None
    frequency: Optional[int] = None
    monetary: Optional[float] = None
    r_score: Optional[int] = None
    f_score: Optional[int] = None
    m_score: Optional[int] = None
    rfm_score: Optional[int] = None
    segment_label: Optional[str] = None
    pca_x: Optional[float] = None
    pca_y: Optional[float] = None
    orders: list[OrderDetail] = []
    recommended_actions: list[str] = []


# ─── Segments ────────────────────────────────────────────────────────────────

class SegmentStats(BaseModel):
    segment_label: str
    customer_count: int
    total_revenue: float
    avg_revenue: float
    avg_recency_days: float
    avg_frequency: float
    avg_monetary: float
    percentage: float


class PCAPoint(BaseModel):
    customer_id: str
    customer_code: str
    pca_x: float
    pca_y: float
    segment_label: str


class SegmentationResponse(BaseModel):
    segments: list[SegmentStats]
    pca_points: list[PCAPoint]
    total_customers: int
    silhouette_score: Optional[float] = None
    n_clusters: int = 4


# ─── RFM ────────────────────────────────────────────────────────────────────

class RFMCustomerRow(BaseModel):
    customer_id: str
    customer_code: str
    name: Optional[str]
    country: Optional[str]
    recency_days: int
    frequency: int
    monetary: float
    r_score: int
    f_score: int
    m_score: int
    rfm_score: int
    segment_label: Optional[str]


class RFMDistribution(BaseModel):
    score: int
    count: int


class RFMResponse(BaseModel):
    customers: list[RFMCustomerRow]
    total: int
    page: int
    page_size: int
    recency_distribution: list[RFMDistribution]
    frequency_distribution: list[RFMDistribution]
    monetary_distribution: list[dict]


# ─── Sales ──────────────────────────────────────────────────────────────────

class MonthlySales(BaseModel):
    month: str
    revenue: float
    orders: int
    avg_order_value: float


class SalesResponse(BaseModel):
    monthly_sales: list[MonthlySales]
    top_products: list[ProductRevenue]
    country_sales: list[CountryRevenue]
    total_revenue: float
    total_orders: int
    avg_order_value: float
    growth_rate: float


# ─── Insights ────────────────────────────────────────────────────────────────

class InsightItem(BaseModel):
    id: str
    category: str  # opportunity|warning|growth|recommendation
    title: str
    description: str
    metric: Optional[str] = None
    metric_value: Optional[str] = None
    priority: str = "medium"  # high|medium|low
    action_label: Optional[str] = None


class InsightsResponse(BaseModel):
    insights: list[InsightItem]
    generated_at: datetime


# ─── Recommendations ─────────────────────────────────────────────────────────

class RecommendationAction(BaseModel):
    title: str
    description: str
    impact: str  # high|medium|low
    effort: str  # high|medium|low


class SegmentRecommendation(BaseModel):
    segment_label: str
    customer_count: int
    total_revenue: float
    priority: str
    actions: list[RecommendationAction]
    reasoning: str


class RecommendationsResponse(BaseModel):
    recommendations: list[SegmentRecommendation]
    generated_at: datetime


# ─── Upload ──────────────────────────────────────────────────────────────────

class UploadStatusResponse(BaseModel):
    dataset_id: str
    status: str
    message: str
    row_count: Optional[int] = None
    error: Optional[str] = None


# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime


class NotificationsResponse(BaseModel):
    items: list[NotificationItem]
    total: int
    unread_count: int


# ─── Reports ─────────────────────────────────────────────────────────────────

class ReportItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    status: str
    created_at: datetime


class ReportsResponse(BaseModel):
    items: list[ReportItem]
    total: int
