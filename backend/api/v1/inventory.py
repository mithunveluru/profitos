from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.dependencies import get_current_user, require_roles
from models.user import User, UserRole
from models.product import Product
from models.inventory import InventoryTransaction
from services.inventory_service import InventoryService
from schemas.inventory import ProductCreate, ProductUpdate, TransactionCreate
from utils.responses import success

router = APIRouter()

@router.get("/products")
async def list_products(
    search: str = Query(None),
    low_stock: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    products = await service.get_products(search=search, low_stock=low_stock)
    return success([_serialize_product(p) for p in products])

@router.post("/products")
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = InventoryService(db)
    product = await service.create_product(payload, current_user.id)
    return success(_serialize_product(product), status_code=201)

@router.get("/products/{product_id}")
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        from utils.responses import error
        return error("Product not found", 404)
    return success(_serialize_product(product))

@router.patch("/products/{product_id}")
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        from utils.responses import error
        return error("Product not found", 404)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    return success(_serialize_product(product))

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER)),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        from utils.responses import error
        return error("Product not found", 404)
    product.is_deleted = True
    await db.flush()
    return success({"id": product_id, "deleted": True})

@router.post("/transactions")
async def record_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER, UserRole.WAREHOUSE)),
):
    service = InventoryService(db)
    txn = await service.record_transaction(payload, current_user.id)
    return success({
        "id": txn.id,
        "product_id": txn.product_id,
        "type": txn.type,
        "quantity": txn.quantity,
        "unit_cost": str(txn.unit_cost),
    }, status_code=201)

@router.get("/transactions")
async def list_transactions(
    product_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(InventoryTransaction).order_by(InventoryTransaction.created_at.desc())
    if product_id:
        query = query.where(InventoryTransaction.product_id == product_id)
    result = await db.execute(query.limit(100))
    txns = result.scalars().all()
    return success([{
        "id": t.id, "product_id": t.product_id, "type": t.type,
        "quantity": t.quantity, "unit_cost": str(t.unit_cost),
        "reference_id": t.reference_id, "notes": t.notes,
        "created_at": str(t.created_at),
    } for t in txns])

@router.get("/alerts/low-stock")
async def low_stock_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    alerts = await service.get_low_stock_alerts()
    return success(alerts)

def _serialize_product(p: Product) -> dict:
    return {
        "id": p.id, "sku": p.sku, "name": p.name,
        "description": p.description, "unit": p.unit,
        "cost_price": str(p.cost_price),
        "selling_price": str(p.selling_price),
        "reorder_point": p.reorder_point,
        "lead_time_days": p.lead_time_days,
        "current_stock": p.current_stock,
        "is_active": p.is_active,
        "supplier_id": p.supplier_id,
        "created_at": str(p.created_at),
    }