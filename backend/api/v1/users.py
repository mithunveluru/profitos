from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.dependencies import get_current_user, require_roles
from models.user import User, UserRole
from utils.responses import success
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role:      Optional[UserRole] = None
    is_active: Optional[bool] = None

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return success({
        "id":        current_user.id,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "role":      current_user.role,
        "is_active": current_user.is_active,
    })

@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER)),
):
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return success([{
        "id":        u.id,
        "email":     u.email,
        "full_name": u.full_name,
        "role":      u.role,
        "is_active": u.is_active,
    } for u in users])

@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from utils.responses import error
        return error("User not found", 404)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    return success({"id": user.id, "role": user.role, "is_active": user.is_active})