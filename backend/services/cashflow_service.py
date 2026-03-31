from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from models.sales import SalesInvoice, PaymentStatus as SalesPaymentStatus
from models.invoice import Invoice, InvoiceStatus
from models.purchase_order import PurchaseOrder, POStatus

class CashflowService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_projection(self) -> dict:
        today = date.today()
        buckets = {
            "0_30":  {"ar_inflow": Decimal("0"), "ap_outflow": Decimal("0"), "net": Decimal("0")},
            "31_60": {"ar_inflow": Decimal("0"), "ap_outflow": Decimal("0"), "net": Decimal("0")},
            "61_90": {"ar_inflow": Decimal("0"), "ap_outflow": Decimal("0"), "net": Decimal("0")},
        }

        # AR inflows — unpaid/partial sales invoices
        ar_result = await self.db.execute(
            select(SalesInvoice).where(
                SalesInvoice.payment_status.in_([
                    SalesPaymentStatus.UNPAID,
                    SalesPaymentStatus.PARTIAL,
                    SalesPaymentStatus.OVERDUE,
                ])
            )
        )
        for inv in ar_result.scalars().all():
            outstanding = inv.total_amount - inv.amount_paid
            days = (inv.due_date - today).days if inv.due_date else 0
            key = "0_30" if days <= 30 else "31_60" if days <= 60 else "61_90"
            buckets[key]["ar_inflow"] += outstanding

        # AP outflows — approved supplier invoices
        ap_result = await self.db.execute(
            select(Invoice).where(Invoice.status == InvoiceStatus.APPROVED)
        )
        for inv in ap_result.scalars().all():
            days = (inv.due_date - today).days if inv.due_date else 0
            key = "0_30" if days <= 30 else "31_60" if days <= 60 else "61_90"
            buckets[key]["ap_outflow"] += inv.amount

        # AP outflows — sent POs (committed spend)
        po_result = await self.db.execute(
            select(PurchaseOrder).where(PurchaseOrder.status == POStatus.SENT)
        )
        for po in po_result.scalars().all():
            days = (po.expected_date - today).days if po.expected_date else 0
            key = "0_30" if days <= 30 else "31_60" if days <= 60 else "61_90"
            buckets[key]["ap_outflow"] += po.total_amount

        # Net and float conversion
        total_net = Decimal("0")
        for key in buckets:
            buckets[key]["net"] = buckets[key]["ar_inflow"] - buckets[key]["ap_outflow"]
            total_net += buckets[key]["net"]
            for field in ["ar_inflow", "ap_outflow", "net"]:
                buckets[key][field] = float(buckets[key][field])

        return {
            "projection": buckets,
            "total_net_90d": float(total_net),
            "has_cash_risk": float(total_net) < 0,
            "generated_at": str(today),
        }

    async def get_summary(self) -> dict:
        today = date.today()

        # Cash position = total AR outstanding - total AP due
        ar_result = await self.db.execute(
            select(func.sum(SalesInvoice.total_amount - SalesInvoice.amount_paid))
            .where(SalesInvoice.payment_status.in_([
                SalesPaymentStatus.UNPAID,
                SalesPaymentStatus.PARTIAL,
                SalesPaymentStatus.OVERDUE,
            ]))
        )
        ar_outstanding = ar_result.scalar() or Decimal("0")

        ap_result = await self.db.execute(
            select(func.sum(Invoice.amount))
            .where(Invoice.status == InvoiceStatus.APPROVED)
        )
        ap_due = ap_result.scalar() or Decimal("0")

        # 30-day revenue (paid sales invoices)
        revenue_result = await self.db.execute(
            select(func.sum(SalesInvoice.total_amount))
            .where(
                SalesInvoice.payment_status == SalesPaymentStatus.PAID,
                SalesInvoice.invoice_date >= today - timedelta(days=30),
            )
        )
        revenue_30d = revenue_result.scalar() or Decimal("0")

        # 30-day spend (received POs)
        spend_result = await self.db.execute(
            select(func.sum(PurchaseOrder.total_amount))
            .where(
                PurchaseOrder.status == POStatus.RECEIVED,
                PurchaseOrder.received_date >= today - timedelta(days=30),
            )
        )
        spend_30d = spend_result.scalar() or Decimal("0")

        return {
            "cash_position":   float(ar_outstanding - ap_due),
            "ar_outstanding":  float(ar_outstanding),
            "ap_due":          float(ap_due),
            "revenue_30d":     float(revenue_30d),
            "spend_30d":       float(spend_30d),
            "gross_margin_30d": float(revenue_30d - spend_30d),
        }