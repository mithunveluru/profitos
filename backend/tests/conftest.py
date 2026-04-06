import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from main import app
from core.database import get_db
from models.base import Base
from models.user import User, UserRole


TEST_DB_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Insert test user directly — bypass the register endpoint entirely
    async with TestSessionLocal() as session:
        existing = await session.get(User, "test-owner-id")
        if not existing:
            user = User(
                id="test-owner-id",
                email="testowner@nexustech.in",
                full_name="Test Owner",
                hashed_password=pwd_context.hash("Test1234"),
                role=UserRole.OWNER,
            )
            session.add(user)
            await session.commit()

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    res = await client.post("/api/v1/auth/login", json={
        "email": "testowner@nexustech.in",
        "password": "Test1234"
    })

    body = res.json()
    token = body.get("data", body).get("access_token")

    assert token is not None, f"Login failed — response was: {body}"
    return {"Authorization": f"Bearer {token}"}