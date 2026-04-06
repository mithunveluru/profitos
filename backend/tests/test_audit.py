import pytest

@pytest.mark.asyncio
async def test_audit_log_no_auth(client):
    # BB-TC-04 — unauthenticated access must fail
    res = await client.get("/api/v1/audit")
    assert res.status_code in (401, 403)

@pytest.mark.asyncio
async def test_audit_log_authenticated(client, auth_headers):
    # Valid access — should return list
    res = await client.get("/api/v1/audit", headers=auth_headers)
    assert res.status_code == 200
    assert "data" in res.json()

@pytest.mark.asyncio
async def test_audit_log_filter_by_action(client, auth_headers):
    # BB-TC-05 — filter should only return matching action types
    res = await client.get(
        "/api/v1/audit?action=STOCK_adjustment",
        headers=auth_headers
    )
    assert res.status_code == 200
    logs = res.json()["data"]
    for log in logs:
        assert "STOCK_adjustment" in log["action"].lower() or \
               "stock_adjustment" in log["action"].lower()