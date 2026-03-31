import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, Date, Integer, ForeignKey, Text, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import relationship
from core.database import Base
import enum

class PaymentStatus(str, enum.Enum):
    UNPAID      = "unpaid"
    PARTIAL     = "partial"
    PAID        = "paid"
    OVERDUE     = "overdue"
    WRITTEN_OFF = "written_off"

class SalesInvoice(Base):
    __tablename__ = "sales_invoices"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String, unique=True, nullable=False)
    customer_id    = Column(String, ForeignKey("customers.id"), nullable=True)
    total_amount   = Column(Numeric(12, 2), nullable=False)
    amount_paid    = Column(Numeric(12, 2), default=Decimal("0"))
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.UNPAID)
    invoice_date   = Column(Date, default=date.today)
    due_date       = Column(Date, nullable=True)
    notes          = Column(Text, nullable=True)
    created_by     = Column(String, ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    customer   = relationship("Customer", back_populates="sales_invoices", lazy="noload")
    line_items = relationship("SalesLineItem", back_populates="invoice", lazy="noload", cascade="all, delete-orphan")
    payments   = relationship("Payment", back_populates="sales_invoice", lazy="noload")

class SalesLineItem(Base):
    __tablename__ = "sales_line_items"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id  = Column(String, ForeignKey("sales_invoices.id"), nullable=False)
    product_id  = Column(String, ForeignKey("products.id"), nullable=True)
    description = Column(String, nullable=False)
    quantity    = Column(Integer, nullable=False)
    unit_price  = Column(Numeric(12, 2), nullable=False)
    line_total  = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("SalesInvoice", back_populates="line_items")
    product = relationship("Product", lazy="noload")
