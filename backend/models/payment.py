import uuid
from datetime import date
from sqlalchemy import Column, String, Numeric, Date, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship
from core.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sales_invoice_id = Column(String, ForeignKey("sales_invoices.id"), nullable=False)
    amount           = Column(Numeric(12, 2), nullable=False)
    payment_date     = Column(Date, default=date.today)
    method           = Column(String, default="bank_transfer")
    reference        = Column(String, nullable=True)
    notes            = Column(Text, nullable=True)
    recorded_by      = Column(String, ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    sales_invoice = relationship("SalesInvoice", back_populates="payments")
