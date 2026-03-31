from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.dependencies import get_current_user, require_roles
from models.user import User, UserRole
from models.customer import Customer
from services.sales_service import SalesService
from utils.responses import success
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date

router = APIRouter()

# ── Schemas ─────────────────────────────────────────────────────────────────

class LineItemIn(BaseModel):
    product_id:  Optional[str] = None
    description: str
    quantity:    int
    unit_price:  float

class SalesInvoiceCreate(BaseModel):
    customer_id:    Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date:   Optional[date] = None
    due_date:       Optional[date] = None
    notes:          Optional[str]  = None
    items:          List[LineItemIn]

class PaymentIn(BaseModel):
    amount:    float
    method:    str = "bank_transfer"
    reference: Optional[str] = None
    notes:     Optional[str] = None

class CustomerCreate(BaseModel):
    name:         str
    contact_name: Optional[str] = None
    email:        Optional[str] = None
    phone:        Optional[str] = None
    address:      Optional[str] = None
    credit_limit: Optional[float] = 0

# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_inv(inv) -> dict:
    base = {
        "id":             inv.id,
        "invoice_number": inv.invoice_number,
        "customer_id":    inv.customer_id,
        "customer_name":  inv.customer.name if inv.customer else None,
        "total_amount":   str(inv.total_amount),
        "amount_paid":    str(inv.amount_paid),
        "outstanding":    str(inv.total_amount - inv.amount_paid),
        "payment_status": inv.payment_status,
        "invoice_date":   str(inv.invoice_date),
        "due_date":       str(inv.due_date) if inv.due_date else None,
        "notes":          inv.notes,
        "created_at":     str(inv.created_at),
    }
    if hasattr(inv, "line_items") and inv.line_items:
        base["line_items"] = [
            {
                "id":          li.id,
                "product_id":  li.product_id,
                "product_name": li.product.name if li.product else None,
                "description": li.description,
                "quantity":    li.quantity,
                "unit_price":  str(li.unit_price),
                "line_total":  str(li.line_total),
            }
            for li in inv.line_items
        ]
    if hasattr(inv, "payments") and inv.payments:
        base["payments"] = [
            {
                "id":           p.id,
                "amount":       str(p.amount),
                "method":       p.method,
                "payment_date": str(p.payment_date),
                "reference":    p.reference,
            }
            for p in inv.payments
        ]
    return base

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/invoices")
async def list_sales_invoices(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SalesService(db)
    invoices = await service.get_invoices(status=status)
    return success([_serialize_inv(i) for i in invoices])

@router.post("/invoices")
async def create_sales_invoice(
    payload: SalesInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = SalesService(db)
    invoice = await service.create_sales_invoice(payload.model_dump(), current_user.id)
    return success(_serialize_inv(invoice), status_code=201)

@router.get("/invoices/{invoice_id}")
async def get_sales_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SalesService(db)
    invoice = await service.get_invoice(invoice_id)
    return success(_serialize_inv(invoice))

@router.post("/invoices/{invoice_id}/payments")
async def record_payment(
    invoice_id: str,
    payload: PaymentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTS)),
):
    service = SalesService(db)
    payment = await service.record_payment(
        invoice_id=invoice_id,
        amount=payload.amount,
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
        user_id=current_user.id,
    )
    return success({
        "id":           payment.id,
        "amount":       str(payment.amount),
        "method":       payment.method,
        "payment_date": str(payment.payment_date),
    }, status_code=201)

@router.get("/ar-dashboard")
async def ar_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SalesService(db)
    data = await service.get_ar_dashboard()
    return success(data)

@router.get("/customers")
async def list_customers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SalesService(db)
    customers = await service.get_customers()
    return success([{
        "id": c.id, "name": c.name, "email": c.email,
        "phone": c.phone, "credit_limit": str(c.credit_limit),
    } for c in customers])

@router.post("/customers")
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    await db.flush()
    return success({"id": customer.id, "name": customer.name}, status_code=201)