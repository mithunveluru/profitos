from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.product import Product
from services.cashflow_service import CashflowService
from services.inventory_service import InventoryService
from utils.responses import success

router = APIRouter()

@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cf_service  = CashflowService(db)
    inv_service = InventoryService(db)

    summary   = await cf_service.get_summary()
    low_stock = await inv_service.get_low_stock_alerts()

    # Inventory value
    result = await db.execute(
        select(func.sum(Product.current_stock * Product.cost_price))
        .where(Product.is_deleted == False)
    )
    inventory_value = float(result.scalar() or 0)

    return success({
        **summary,
        "inventory_value":    inventory_value,
        "low_stock_count":    len(low_stock),
        "low_stock_alerts":   low_stock[:5],
    })

@router.get("/cashflow")
async def cashflow_projection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CashflowService(db)
    data    = await service.get_projection()
    return success(data)

@router.get("/kpis")
async def kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cf_service = CashflowService(db)
    summary    = await cf_service.get_summary()

    gross_margin_pct = 0.0
    if summary["revenue_30d"] > 0:
        gross_margin_pct = round(
            (summary["gross_margin_30d"] / summary["revenue_30d"]) * 100, 1
        )

    return success({
        "revenue_30d":       summary["revenue_30d"],
        "spend_30d":         summary["spend_30d"],
        "gross_margin_30d":  summary["gross_margin_30d"],
        "gross_margin_pct":  gross_margin_pct,
        "ar_outstanding":    summary["ar_outstanding"],
        "ap_due":            summary["ap_due"],
        "cash_position":     summary["cash_position"],
    })