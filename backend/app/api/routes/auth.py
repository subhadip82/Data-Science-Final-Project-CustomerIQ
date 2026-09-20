"""Auth routes — user sync and workspace info."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.core.security import get_current_user_id
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import UserSyncRequest, UserResponse, WorkspaceResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    body: UserSyncRequest,
    clerk_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Sync Clerk user to local database and create default workspace."""
    # Security: always use token's clerk_user_id, never body's
    repo = UserRepository(db)
    user = await repo.upsert(
        clerk_user_id=clerk_user_id,
        email=body.email,
        full_name=body.full_name,
        avatar_url=body.avatar_url,
    )
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/workspace", response_model=WorkspaceResponse)
async def get_workspace(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    workspace = await repo.get_workspace(user.id)
    return workspace
