from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from models.purchase_order import PurchaseOrder, POLineItem, POStatus
from models.inventory import InventoryTransaction, TransactionType
from models.product import Product
from models.supplier import Supplier
from schemas.procurement import POCreate, POStatusUpdate
from schemas.inventory import TransactionCreate
from services.inventory_service import InventoryService
from fastapi import HTTPException
import uuid

class ProcurementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._inv = InventoryService(db)

    def _generate_po_number(self) -> str:
        return f"PO-{date.today().strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"

    async def get_reorder_suggestions(self) -> list[dict]:
        thirty_days_ago = date.today() - timedelta(days=30)

        sales_agg = await self.db.execute(
            select(
                InventoryTransaction.product_id,
                func.sum(func.abs(InventoryTransaction.quantity)).label("units_sold"),
            )
            .where(
                InventoryTransaction.type == TransactionType.SALE,
                InventoryTransaction.created_at >= thirty_days_ago,
            )
            .group_by(InventoryTransaction.product_id)
        )
        sales_map = {row.product_id: row.units_sold for row in sales_agg}

        result = await self.db.execute(
            select(Product).where(
                Product.is_deleted == False,
                Product.current_stock <= Product.reorder_point,
            ).order_by(Product.current_stock)
        )
        low_stock_products = result.scalars().all()

        suggestions = []
        for p in low_stock_products:
            units_sold_30d = sales_map.get(p.id, 0)
            daily_avg = units_sold_30d / 30
            suggested_qty = max(
                int(daily_avg * p.lead_time_days * 1.2),
                p.reorder_point * 2,  # minimum: 2x reorder point
            )
            suggestions.append({
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "unit": p.unit,
                "current_stock": p.current_stock,
                "reorder_point": p.reorder_point,
                "deficit": p.reorder_point - p.current_stock,
                "daily_avg_sales": round(daily_avg, 2),
                "lead_time_days": p.lead_time_days,
                "suggested_qty": suggested_qty,
                "estimated_cost": float(p.cost_price * suggested_qty),
                "supplier_id": p.supplier_id,
                "cost_price": str(p.cost_price),
            })
        return suggestions

    async def create_po(self, payload: POCreate, user_id: str) -> PurchaseOrder:
        po = PurchaseOrder(
            po_number=self._generate_po_number(),
            supplier_id=payload.supplier_id,
            expected_date=payload.expected_date,
            created_by=user_id,
        )
        self.db.add(po)
        await self.db.flush()

        total = Decimal("0")
        for item in payload.items:
            line = POLineItem(
                po_id=po.id,
                product_id=item.product_id,
                quantity_ordered=item.quantity_ordered,
                unit_price=item.unit_price,
            )
            self.db.add(line)
            total += item.unit_price * item.quantity_ordered

        po.total_amount = total
        await self.db.flush()
        return po

    async def get_po_list(self, status: str = None) -> list[PurchaseOrder]:
        query = select(PurchaseOrder).options(
            selectinload(PurchaseOrder.items),
            selectinload(PurchaseOrder.supplier),
        ).order_by(PurchaseOrder.created_at.desc())
        if status:
            query = query.where(PurchaseOrder.status == status)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_po(self, po_id: str) -> PurchaseOrder:
        result = await self.db.execute(
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.items).selectinload(POLineItem.product),
                     selectinload(PurchaseOrder.supplier))
            .where(PurchaseOrder.id == po_id)
        )
        po = result.scalar_one_or_none()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
        return po

    async def update_po_status(self, po_id: str, payload: POStatusUpdate, user_id: str) -> PurchaseOrder:
        po = await self.get_po(po_id)

        VALID_TRANSITIONS = {
            POStatus.DRAFT:    [POStatus.APPROVED, POStatus.CANCELLED],
            POStatus.APPROVED: [POStatus.SENT,     POStatus.CANCELLED],
            POStatus.SENT:     [POStatus.RECEIVED, POStatus.CANCELLED],
        }
        allowed = VALID_TRANSITIONS.get(po.status, [])
        if payload.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot move from '{po.status}' to '{payload.status}'. Allowed: {[s.value for s in allowed]}"
            )

        po.status = payload.status

        # Auto-GRN when received
        if payload.status == POStatus.RECEIVED:
            po.received_date = date.today()
            for item in po.items:
                await self._inv.record_transaction(
                    TransactionCreate(
                        product_id=item.product_id,
                        type=TransactionType.GRN,
                        quantity=item.quantity_ordered,
                        unit_cost=item.unit_price,
                        reference_id=po.po_number,
                        notes=f"Auto GRN from {po.po_number}",
                    ),
                    user_id=user_id,
                )
                item.quantity_received = item.quantity_ordered

        await self.db.flush()
        return po