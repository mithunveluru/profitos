from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base, UUIDMixin, TimestampMixin

class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="pcs")
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reorder_point: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    current_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    supplier_id: Mapped[Optional[str]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    
    transactions: Mapped[list["InventoryTransaction"]] = relationship(back_populates="product")