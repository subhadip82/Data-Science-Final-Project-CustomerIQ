"""User repository — database access for User model."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.workspace import Workspace


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_clerk_id(self, clerk_user_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.clerk_user_id == clerk_user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, clerk_user_id: str, email: str, full_name: str | None = None, avatar_url: str | None = None) -> User:
        user = User(
            clerk_user_id=clerk_user_id,
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        self.db.add(user)
        await self.db.flush()
        # Create default workspace
        workspace = Workspace(name=f"{full_name or email}'s Workspace", owner_id=user.id)
        self.db.add(workspace)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def upsert(self, clerk_user_id: str, email: str, full_name: str | None, avatar_url: str | None) -> User:
        user = await self.get_by_clerk_id(clerk_user_id)
        if user:
            user.email = email
            if full_name:
                user.full_name = full_name
            if avatar_url:
                user.avatar_url = avatar_url
            await self.db.commit()
            await self.db.refresh(user)
            return user
        try:
            return await self.create(clerk_user_id, email, full_name, avatar_url)
        except Exception:
            await self.db.rollback()
            existing = await self.get_by_clerk_id(clerk_user_id)
            if existing:
                return existing
            raise

    async def get_workspace(self, user_id: uuid.UUID) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace).where(Workspace.owner_id == user_id)
        )
        ws = result.scalars().first()
        if not ws:
            ws = Workspace(name="Primary Workspace", owner_id=user_id)
            self.db.add(ws)
            await self.db.commit()
            await self.db.refresh(ws)
        return ws
