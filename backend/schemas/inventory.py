from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
from models.inventory import TransactionType

class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    unit: str = "pcs"
    cost_price: Decimal
    selling_price: Decimal
    reorder_point: int = 10
    lead_time_days: int = 7
    supplier_id: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    reorder_point: Optional[int] = None
    lead_time_days: Optional[int] = None

class TransactionCreate(BaseModel):
    product_id: str
    type: TransactionType
    quantity: int
    unit_cost: Decimal
    reference_id: Optional[str] = None
    notes: Optional[str] = None