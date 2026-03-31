from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Column, String, JSON, DateTime, func
from models.base import Base, UUIDMixin
from datetime import datetime, timezone

class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    action: str = Column(String(100), nullable=False, index=True)
    entity_id: str = Column(String(255), nullable=True)
    user_id: str = Column(String(255), nullable=False, index=True)
    meta: dict = Column(JSON, nullable=True)
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())

class AuditLogger:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(self, action: str, entity_id: str, user_id: str, meta: dict = None):
        log = AuditLog(action=action, entity_id=entity_id, user_id=user_id, meta=meta)
        self.db.add(log)
        # No flush — commited with parent transaction