"""Workspace model — multi-tenant isolation unit."""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="workspaces")
    datasets: Mapped[list["Dataset"]] = relationship(back_populates="workspace", lazy="select")
    customers: Mapped[list["Customer"]] = relationship(back_populates="workspace", lazy="select")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="workspace", lazy="select")
    reports: Mapped[list["Report"]] = relationship(back_populates="workspace", lazy="select")
    analytics_snapshots: Mapped[list["AnalyticsSnapshot"]] = relationship(back_populates="workspace", lazy="select")

    def __repr__(self) -> str:
        return f"<Workspace {self.name}>"
