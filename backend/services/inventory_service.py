from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.product import Product
from models.inventory import InventoryTransaction, TransactionType
from schemas.inventory import ProductCreate, TransactionCreate
from audit.logger import AuditLog
from fastapi import HTTPException


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_product(self, payload: ProductCreate, user_id: str) -> Product:
        existing = await self.db.execute(
            select(Product).where(Product.sku == payload.sku, Product.is_deleted == False)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"SKU '{payload.sku}' already exists")
        product = Product(**payload.model_dump())
        self.db.add(product)
        await self.db.flush()
        return product

    async def get_products(self, search: str = None, low_stock: bool = False) -> list[Product]:
        query = select(Product).where(Product.is_deleted == False, Product.is_active == True)
        if search:
            query = query.where(
                Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%")
            )
        if low_stock:
            query = query.where(Product.current_stock <= Product.reorder_point)
        result = await self.db.execute(query.order_by(Product.name))
        return result.scalars().all()

    async def record_transaction(self, payload: TransactionCreate, user_id: str) -> InventoryTransaction:
        result = await self.db.execute(
            select(Product).where(Product.id == payload.product_id, Product.is_deleted == False)
        )
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if payload.quantity < 0:
            new_stock = product.current_stock + payload.quantity
            if new_stock < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock. Available: {product.current_stock}, requested: {abs(payload.quantity)}"
                )

        stock_before = product.current_stock

        await self.db.execute(
            update(Product)
            .where(Product.id == payload.product_id)
            .values(current_stock=Product.current_stock + payload.quantity)
        )

        txn = InventoryTransaction(
            product_id=payload.product_id,
            type=payload.type,
            quantity=payload.quantity,
            unit_cost=payload.unit_cost,
            reference_id=payload.reference_id,
            notes=payload.notes,
            created_by=user_id,
        )
        self.db.add(txn)

        audit = AuditLog(
            action=f"STOCK_{payload.type.value}",
            entity_id=payload.product_id,
            user_id=user_id,
            meta={
                "product_name": product.name,
                "sku": product.sku,
                "quantity": payload.quantity,
                "stock_before": stock_before,
                "stock_after": stock_before + payload.quantity,
                "type": payload.type.value,
                "notes": payload.notes or "",
            }
        )
        self.db.add(audit)

        await self.db.flush()

        await self.db.refresh(product)
        return txn

    async def get_low_stock_alerts(self) -> list[dict]:
        result = await self.db.execute(
            select(Product)
            .where(Product.is_deleted == False, Product.current_stock <= Product.reorder_point)
            .order_by(Product.current_stock)
        )
        products = result.scalars().all()
        return [
            {
                "id": p.id, "sku": p.sku, "name": p.name,
                "current_stock": p.current_stock,
                "reorder_point": p.reorder_point,
                "deficit": p.reorder_point - p.current_stock,
                "unit": p.unit,
            }
            for p in products
        ]