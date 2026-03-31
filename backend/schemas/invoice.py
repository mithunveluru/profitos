from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
import datetime

class InvoiceCreate(BaseModel):
    invoice_number: str
    vendor_id: str
    po_id: Optional[str] = None
    amount: Decimal
    invoice_date: datetime.date
    due_date: Optional[datetime.date] = None
    notes: Optional[str] = None