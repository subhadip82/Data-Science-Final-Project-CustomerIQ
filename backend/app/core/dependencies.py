"""FastAPI dependencies for authentication and database access."""
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.core.security import get_current_user_id
from app.repositories.user_repository import UserRepository
from app.models.user import User


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    clerk_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current authenticated user from the database, auto-provisioning if first time."""
    user_repo = UserRepository(db)
    user = await user_repo.get_by_clerk_id(clerk_user_id)
    
    if not user:
        # Auto-provision user & workspace for seamless first-time onboarding
        user = await user_repo.create(
            clerk_user_id=clerk_user_id,
            email=f"{clerk_user_id}@customeriq.app",
            full_name="Workspace User",
        )
    
    return user

