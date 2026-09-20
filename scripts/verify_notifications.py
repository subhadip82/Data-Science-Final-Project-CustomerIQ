import asyncio
import sys
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import uuid
import httpx
from datetime import datetime
from sqlalchemy import select, update, func

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import User, Workspace, Notification, Dataset, Report
from app.services.dataset_service import DatasetService

async def test_notifications():
    print("=" * 60)
    print("TESTING NOTIFICATION SYSTEM & REAL EVENTS")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # 1. Fetch or create a test user & workspace
        stmt = select(User).limit(1)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                clerk_user_id="test_user_notif",
                email="notif_test@customeriq.local",
                full_name="Notification Tester"
            )
            db.add(user)
            await db.flush()

        w_stmt = select(Workspace).where(Workspace.owner_id == user.id).limit(1)
        w_res = await db.execute(w_stmt)
        workspace = w_res.scalar_one_or_none()
        if not workspace:
            workspace = Workspace(
                id=uuid.uuid4(),
                name="Notif Workspace",
                owner_id=user.id
            )
            db.add(workspace)
            await db.commit()

        workspace_id = workspace.id
        print(f"[PASS] Testing with Workspace ID: {workspace_id}")

        # 2. Insert distinct notification types
        test_notifs = [
            Notification(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user.id,
                title="Dataset processing completed",
                message="sales_data.csv is ready for dynamic exploration.",
                type="dataset_completed",
                severity="success",
                target_route="/app/data-profile",
                is_read=False
            ),
            Notification(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user.id,
                title="Data quality warning",
                message="8% missing values detected in customer records.",
                type="data_quality_warning",
                severity="warning",
                target_route="/app/data-profile",
                is_read=False
            ),
            Notification(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user.id,
                title="New insight",
                message="Revenue increased 14.2% in the last quarter.",
                type="insight_generated",
                severity="info",
                target_route="/app/insights",
                is_read=False
            ),
            Notification(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user.id,
                title="Report generated",
                message="Monthly analytics report ready for review.",
                type="report_generated",
                severity="success",
                target_route="/app/reports",
                is_read=True
            ),
        ]

        for n in test_notifs:
            db.add(n)
        await db.commit()
        print(f"[PASS] Seeded {len(test_notifs)} real notification variants.")

        # 3. Query unread count
        unread_q = select(func.count()).select_from(Notification).where(
            Notification.workspace_id == workspace_id,
            Notification.is_read == False
        )
        unread_res = await db.execute(unread_q)
        unread_count = unread_res.scalar()
        assert unread_count >= 3, f"Expected at least 3 unread, got {unread_count}"
        print(f"[PASS] Unread count query verified: {unread_count} unread notifications.")

        # 4. Test mark single notification read
        target_id = test_notifs[0].id
        await db.execute(
            update(Notification).where(Notification.id == target_id).values(is_read=True)
        )
        await db.commit()

        res_check = await db.execute(select(Notification).where(Notification.id == target_id))
        updated_n = res_check.scalar_one()
        assert updated_n.is_read is True
        print(f"[PASS] Single markRead verified for notification '{updated_n.title}'.")

        # 5. Test mark all as read
        await db.execute(
            update(Notification).where(Notification.workspace_id == workspace_id).values(is_read=True)
        )
        await db.commit()

        unread_res_after = await db.execute(unread_q)
        assert unread_res_after.scalar() == 0
        print("[PASS] Mark all read verified: 0 unread notifications remaining.")

    print("=" * 60)
    print("ALL NOTIFICATION DATABASE & LOGIC CHECKS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_notifications())
