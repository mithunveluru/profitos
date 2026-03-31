import enum
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Integer, Numeric, Text, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base, UUIDMixin, TimestampMixin

class TransactionType(str, enum.Enum):
    GRN = "grn"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    RETURN = "return"

class InventoryTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "inventory_transactions"

    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    type: Mapped[TransactionType] = mapped_column(PgEnum(TransactionType), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="transactions")