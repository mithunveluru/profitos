import enum
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base, UUIDMixin, TimestampMixin
import datetime

class POStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"
    RECEIVED = "received"
    CANCELLED = "cancelled"

class PurchaseOrder(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "purchase_orders"

    po_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    status: Mapped[POStatus] = mapped_column(PgEnum(POStatus), default=POStatus.DRAFT, nullable=False)
    expected_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    received_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)

    items: Mapped[list["POLineItem"]] = relationship(back_populates="purchase_order", cascade="all, delete-orphan")
    supplier: Mapped["Supplier"] = relationship()

class POLineItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "po_line_items"

    po_id: Mapped[str] = mapped_column(ForeignKey("purchase_orders.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()