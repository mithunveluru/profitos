from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from core.database import get_db
from core.dependencies import get_current_user, require_roles
from models.user import User, UserRole
from models.supplier import Supplier
from models.purchase_order import PurchaseOrder, POStatus
from utils.responses import success, error
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from sqlalchemy import func

router = APIRouter()

class SupplierCreate(BaseModel):
    name:            str
    contact_name:    Optional[str] = None
    email:           Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None
    payment_terms:   Optional[str] = "net30"
    avg_lead_time_days: int = 7

class SupplierUpdate(BaseModel):
    name:            Optional[str] = None
    contact_name:    Optional[str] = None
    email:           Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None
    payment_terms:   Optional[str] = None
    avg_lead_time_days: Optional[int] = None
    is_active:       Optional[bool] = None

def _serialize(s, stats=None) -> dict:
    base = {
        "id":                s.id,
        "name":              s.name,
        "contact_name":      s.contact_name,
        "email":             s.email,
        "phone":             s.phone,
        "address":           s.address,
        "payment_terms":     s.payment_terms,
        "avg_lead_time_days":s.avg_lead_time_days,
        "reliability_score": str(s.reliability_score),
        "is_active":         s.is_active,
    }
    if stats:
        base["stats"] = stats
    return base

@router.get("")
async def list_suppliers(
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Supplier).order_by(Supplier.name)
    if not include_inactive:
        query = query.where(Supplier.is_active == True)
    result = await db.execute(query)
    return success([_serialize(s) for s in result.scalars().all()])

@router.post("")
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    await db.flush()
    return success(_serialize(supplier), status_code=201)

@router.get("/{supplier_id}")
async def get_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        return error("Supplier not found", 404)

    # Compute stats
    po_result = await db.execute(
        select(
            func.count(PurchaseOrder.id).label("total_pos"),
            func.sum(PurchaseOrder.total_amount).label("total_spend"),
            func.count(PurchaseOrder.id).filter(
                PurchaseOrder.status == POStatus.RECEIVED
            ).label("received_pos"),
        ).where(PurchaseOrder.supplier_id == supplier_id)
    )
    row = po_result.one()
    stats = {
        "total_pos":    row.total_pos or 0,
        "total_spend":  float(row.total_spend or 0),
        "received_pos": row.received_pos or 0,
        "fulfillment_rate": round(
            (row.received_pos / row.total_pos * 100) if row.total_pos else 0, 1
        ),
    }
    return success(_serialize(supplier, stats=stats))

@router.patch("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        return error("Supplier not found", 404)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await db.flush()
    return success(_serialize(supplier))

@router.delete("/{supplier_id}")
async def deactivate_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER)),
):
    await db.execute(
        update(Supplier).where(Supplier.id == supplier_id).values(is_active=False)
    )
    return success({"id": supplier_id, "is_active": False})

@router.post("/{supplier_id}/recalculate-score")
async def recalculate_score(
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    po_result = await db.execute(
        select(
            func.count(PurchaseOrder.id).label("total"),
            func.count(PurchaseOrder.id).filter(
                PurchaseOrder.status == POStatus.RECEIVED
            ).label("received"),
        ).where(PurchaseOrder.supplier_id == supplier_id)
    )
    row = po_result.one()
    score = Decimal(str(
        round((row.received / row.total * 10), 1) if row.total else 5.0
    ))
    await db.execute(
        update(Supplier).where(Supplier.id == supplier_id).values(reliability_score=score)
    )
    return success({"supplier_id": supplier_id, "reliability_score": str(score)})