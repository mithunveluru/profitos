import uuid
from sqlalchemy import Column, String, Numeric, Boolean, Text
from sqlalchemy.orm import relationship
from core.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name         = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    email        = Column(String, nullable=True)
    phone        = Column(String, nullable=True)
    address      = Column(Text, nullable=True)
    credit_limit = Column(Numeric(12, 2), default=0)
    is_active    = Column(Boolean, default=True)

    sales_invoices = relationship("SalesInvoice", back_populates="customer", lazy="noload")