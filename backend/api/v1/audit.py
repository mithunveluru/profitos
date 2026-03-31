from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.dependencies import require_roles
from models.user import UserRole, User
from audit.logger import AuditLog
from utils.responses import success


router = APIRouter()


@router.get("")
async def list_audit_logs(
    entity_id: str = Query(None),
    action:    str = Query(None),
    limit:     int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    query = select(AuditLog)

    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    query = query.order_by(AuditLog.created_at.desc()).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    # Collect all unique user IDs from the logs and fetch in one query
    user_ids = {log.user_id for log in logs if log.user_id}
    user_map = {}
    if user_ids:
        users_result = await db.execute(
            select(User.id, User.full_name, User.email)
            .where(User.id.in_(user_ids))
        )
        for row in users_result.all():
            user_map[row.id] = {
                "name":  row.full_name,
                "email": row.email,
            }

    return success([
        {
            "id":           log.id,
            "action":       log.action,
            "created_at":   str(log.created_at),

            # Who did it
            "performed_by": user_map.get(log.user_id, {}).get("name", "Unknown"),
            "user_email":   user_map.get(log.user_id, {}).get("email", ""),

            # What entity was affected — pulled from meta
            "entity_id":    log.entity_id,
            "entity_name":  (log.meta or {}).get("product_name") or
                            (log.meta or {}).get("entity_name") or
                            "—",
            "entity_sku":   (log.meta or {}).get("sku", "—"),

            # Stock change summary (only present for inventory actions)
            "stock_before": (log.meta or {}).get("stock_before"),
            "stock_after":  (log.meta or {}).get("stock_after"),
            "quantity":     (log.meta or {}).get("quantity"),

            # Full metadata for detailed view
            "meta":         log.meta,
        }
        for log in logs
    ])