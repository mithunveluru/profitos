from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
import datetime
from models.purchase_order import POStatus

class POLineItemCreate(BaseModel):
    product_id: str
    quantity_ordered: int
    unit_price: Decimal

class POCreate(BaseModel):
    supplier_id: str
    expected_date: Optional[datetime.date] = None
    items: list[POLineItemCreate]

class POStatusUpdate(BaseModel):
    status: POStatus