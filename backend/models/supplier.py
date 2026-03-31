from typing import Optional
from sqlalchemy import String, Numeric, Integer
from sqlalchemy.orm import mapped_column, Mapped
from models.base import Base, UUIDMixin, TimestampMixin
from decimal import Decimal

class Supplier(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "suppliers"

    name:               Mapped[str]            = mapped_column(String(255), nullable=False)
    contact_name:       Mapped[Optional[str]]  = mapped_column(String(255), nullable=True)
    email:              Mapped[Optional[str]]  = mapped_column(String(255), nullable=True)
    phone:              Mapped[Optional[str]]  = mapped_column(String(50),  nullable=True)
    address:            Mapped[Optional[str]]  = mapped_column(String(500), nullable=True)
    payment_terms:      Mapped[Optional[str]]  = mapped_column(String(50),  nullable=True, default="net30")
    reliability_score:  Mapped[Decimal]        = mapped_column(Numeric(5, 2), nullable=False, default=5)
    avg_lead_time_days: Mapped[int]            = mapped_column(Integer, nullable=False, default=7)
    is_active:          Mapped[bool]           = mapped_column(default=True, nullable=False)
