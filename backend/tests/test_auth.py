import pytest

@pytest.mark.asyncio
async def test_login_valid(client, auth_headers):
    # BB-TC-01 — valid login
    assert "Authorization" in auth_headers

@pytest.mark.asyncio
async def test_login_invalid_password(client):
    # BB-TC-02 — wrong password
    res = await client.post("/api/v1/auth/login", json={
        "email": "testowner@nexustech.in",
        "password": "wrongpassword"
    })
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    res = await client.post("/api/v1/auth/login", json={
        "email": "ghost@nowhere.com",
        "password": "whatever"
    })
    assert res.status_code == 401