from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from services.auth_service import AuthService
from schemas.auth import RegisterRequest, LoginRequest
from utils.responses import success

router = APIRouter()

@router.post("/register")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    token_data = await service.register(payload)
    return success(token_data.model_dump(), status_code=201)

@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    token_data = await service.login(payload)
    return success(token_data.model_dump())