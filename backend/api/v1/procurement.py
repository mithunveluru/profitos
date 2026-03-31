from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.dependencies import get_current_user, require_roles
from models.user import User, UserRole
from models.purchase_order import POLineItem
from services.procurement_service import ProcurementService
from schemas.procurement import POCreate, POStatusUpdate
from utils.responses import success

router = APIRouter()

def _serialize_po(po, detail=False) -> dict:
    base = {
        "id": po.id,
        "po_number": po.po_number,
        "status": po.status,
        "total_amount": str(po.total_amount),
        "expected_date": str(po.expected_date) if po.expected_date else None,
        "received_date": str(po.received_date) if po.received_date else None,
        "created_at": str(po.created_at),
        "supplier": {"id": po.supplier.id, "name": po.supplier.name} if po.supplier else None,
    }
    if detail:
        base["items"] = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else None,
                "product_sku": item.product.sku if item.product else None,
                "quantity_ordered": item.quantity_ordered,
                "quantity_received": item.quantity_received,
                "unit_price": str(item.unit_price),
                "line_total": str(item.unit_price * item.quantity_ordered),
            }
            for item in po.items
        ]
    return base

@router.get("/reorder-suggestions")
async def reorder_suggestions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProcurementService(db)
    data = await service.get_reorder_suggestions()
    return success(data)

@router.post("/purchase-orders")
async def create_po(
    payload: POCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = ProcurementService(db)
    po = await service.create_po(payload, current_user.id)
    return success({"id": po.id, "po_number": po.po_number, "status": po.status,
                    "total_amount": str(po.total_amount)}, status_code=201)

@router.get("/purchase-orders")
async def list_pos(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProcurementService(db)
    pos = await service.get_po_list(status=status)
    return success([_serialize_po(po) for po in pos])

@router.get("/purchase-orders/{po_id}")
async def get_po(
    po_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProcurementService(db)
    po = await service.get_po(po_id)
    return success(_serialize_po(po, detail=True))

@router.patch("/purchase-orders/{po_id}/status")
async def update_po_status(
    po_id: str,
    payload: POStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = ProcurementService(db)
    po = await service.update_po_status(po_id, payload, current_user.id)
    return success({"id": po.id, "po_number": po.po_number, "status": po.status,
                    "received_date": str(po.received_date) if po.received_date else None})