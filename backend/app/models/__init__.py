"""Import all models so Alembic can detect them."""
from app.models.user import User
from app.models.workspace import Workspace
from app.models.models import (
    Dataset,
    DatasetColumn,
    AnalysisRun,
    AnalysisResult,
    VisualizationItem,
    InsightItem,
    RecommendationItem,
    MLModel,
    MLModelMetric,
    Customer,
    Order,
    RFMScore,
    CustomerSegment,
    AnalyticsSnapshot,
    Notification,
    Report,
)

__all__ = [
    "User",
    "Workspace",
    "Dataset",
    "DatasetColumn",
    "AnalysisRun",
    "AnalysisResult",
    "VisualizationItem",
    "InsightItem",
    "RecommendationItem",
    "MLModel",
    "MLModelMetric",
    "Customer",
    "Order",
    "RFMScore",
    "CustomerSegment",
    "AnalyticsSnapshot",
    "Notification",
    "Report",
]

