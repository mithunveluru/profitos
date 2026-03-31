import enum
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Date, ForeignKey, Enum as PgEnum, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base, UUIDMixin, TimestampMixin
import datetime

class InvoiceStatus(str, enum.Enum):
    PENDING = "pending"
    DUPLICATE_REVIEW = "duplicate_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"

class Invoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "invoices"

    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    po_id: Mapped[Optional[str]] = mapped_column(ForeignKey("purchase_orders.id"), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    invoice_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    status: Mapped[InvoiceStatus] = mapped_column(PgEnum(InvoiceStatus), default=InvoiceStatus.PENDING)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of_id: Mapped[Optional[str]] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    vendor: Mapped["Supplier"] = relationship()