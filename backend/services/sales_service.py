from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import selectinload
from models.sales import SalesInvoice, SalesLineItem, PaymentStatus
from models.payment import Payment
from models.product import Product
from models.inventory import InventoryTransaction, TransactionType
from models.customer import Customer
from services.inventory_service import InventoryService
from schemas.inventory import TransactionCreate
from fastapi import HTTPException
import uuid

class SalesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_inv_number(self) -> str:
        return f"SINV-{date.today().strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"

    async def create_sales_invoice(self, payload: dict, user_id: str) -> SalesInvoice:
        total = Decimal("0")
        for item in payload["items"]:
            item["line_total"] = Decimal(str(item["unit_price"])) * item["quantity"]
            total += item["line_total"]

        invoice = SalesInvoice(
            invoice_number=payload.get("invoice_number") or self._generate_inv_number(),
            customer_id=payload.get("customer_id"),
            total_amount=total,
            invoice_date=payload.get("invoice_date", date.today()),
            due_date=payload.get("due_date"),
            notes=payload.get("notes"),
            created_by=user_id,
        )
        self.db.add(invoice)
        await self.db.flush()

        inv_service = InventoryService(self.db)
        for item in payload["items"]:
            line = SalesLineItem(
                invoice_id=invoice.id,
                product_id=item.get("product_id"),
                description=item["description"],
                quantity=item["quantity"],
                unit_price=Decimal(str(item["unit_price"])),
                line_total=item["line_total"],
            )
            self.db.add(line)

            if item.get("product_id"):
                try:
                    await inv_service.record_transaction(
                        TransactionCreate(
                            product_id=item["product_id"],
                            type=TransactionType.SALE,
                            quantity=-item["quantity"],
                            unit_cost=Decimal(str(item["unit_price"])),
                            reference_id=invoice.invoice_number,
                            notes=f"Auto deduction from {invoice.invoice_number}",
                        ),
                        user_id=user_id,
                    )
                except HTTPException:
                    pass  # Don't block sale if stock tracking fails

        await self.db.flush()
        return invoice

    async def record_payment(self, invoice_id: str, amount: float, method: str,
                              reference: str, notes: str, user_id: str) -> Payment:
        result = await self.db.execute(
            select(SalesInvoice).where(SalesInvoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail="Sales invoice not found")
        if invoice.payment_status == PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Invoice is already fully paid")

        pay_amount = Decimal(str(amount))
        outstanding = invoice.total_amount - invoice.amount_paid

        if pay_amount > outstanding:
            raise HTTPException(
                status_code=400,
                detail=f"Payment ₹{amount} exceeds outstanding ₹{outstanding}"
            )

        payment = Payment(
            sales_invoice_id=invoice_id,
            amount=pay_amount,
            payment_date=date.today(),
            method=method,
            reference=reference,
            notes=notes,
            recorded_by=user_id,
        )
        self.db.add(payment)

        invoice.amount_paid += pay_amount
        new_outstanding = invoice.total_amount - invoice.amount_paid

        if new_outstanding <= 0:
            invoice.payment_status = PaymentStatus.PAID
        elif invoice.amount_paid > 0:
            invoice.payment_status = PaymentStatus.PARTIAL

        await self.db.flush()
        return payment

    async def get_ar_dashboard(self) -> dict:
        today = date.today()
        result = await self.db.execute(
            select(SalesInvoice)
            .options(selectinload(SalesInvoice.customer))
            .where(SalesInvoice.payment_status.in_([
                PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE
            ]))
            .order_by(SalesInvoice.due_date)
        )
        invoices = result.scalars().all()

        buckets = {
            "current":  {"invoices": [], "total": Decimal("0")},
            "1_30":     {"invoices": [], "total": Decimal("0")},
            "31_60":    {"invoices": [], "total": Decimal("0")},
            "61_90":    {"invoices": [], "total": Decimal("0")},
            "90_plus":  {"invoices": [], "total": Decimal("0")},
        }
        total_outstanding = Decimal("0")

        for inv in invoices:
            outstanding = inv.total_amount - inv.amount_paid
            total_outstanding += outstanding
            days_overdue = (today - inv.due_date).days if inv.due_date else 0

            # Update to OVERDUE status if past due
            if inv.due_date and today > inv.due_date and inv.payment_status != PaymentStatus.OVERDUE:
                await self.db.execute(
                    update(SalesInvoice)
                    .where(SalesInvoice.id == inv.id)
                    .values(payment_status=PaymentStatus.OVERDUE)
                )

            item = {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer.name if inv.customer else "—",
                "outstanding": float(outstanding),
                "total_amount": float(inv.total_amount),
                "due_date": str(inv.due_date) if inv.due_date else None,
                "days_overdue": max(0, days_overdue),
                "payment_status": inv.payment_status,
            }

            if not inv.due_date or days_overdue <= 0:
                buckets["current"]["invoices"].append(item)
                buckets["current"]["total"] += outstanding
            elif days_overdue <= 30:
                buckets["1_30"]["invoices"].append(item)
                buckets["1_30"]["total"] += outstanding
            elif days_overdue <= 60:
                buckets["31_60"]["invoices"].append(item)
                buckets["31_60"]["total"] += outstanding
            elif days_overdue <= 90:
                buckets["61_90"]["invoices"].append(item)
                buckets["61_90"]["total"] += outstanding
            else:
                buckets["90_plus"]["invoices"].append(item)
                buckets["90_plus"]["total"] += outstanding

        for key in buckets:
            buckets[key]["total"] = float(buckets[key]["total"])

        return {
            "total_outstanding": float(total_outstanding),
            "buckets": buckets,
            "overdue_count": sum(1 for inv in invoices if inv.due_date and today > inv.due_date),
            "has_cash_risk": float(total_outstanding) > 100000,
        }

    async def get_invoices(self, status: str = None) -> list[SalesInvoice]:
        query = (
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.customer),
                selectinload(SalesInvoice.line_items),
            )
            .order_by(SalesInvoice.created_at.desc())
        )
        if status:
            query = query.where(SalesInvoice.payment_status == status)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_invoice(self, invoice_id: str) -> SalesInvoice:
        result = await self.db.execute(
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.customer),
                selectinload(SalesInvoice.line_items).selectinload(SalesLineItem.product),
                selectinload(SalesInvoice.payments),
            )
            .where(SalesInvoice.id == invoice_id)
        )
        inv = result.scalar_one_or_none()
        if not inv:
            raise HTTPException(status_code=404, detail="Sales invoice not found")
        return inv

    async def get_customers(self) -> list[Customer]:
        result = await self.db.execute(
            select(Customer).where(Customer.is_active == True).order_by(Customer.name)
        )
        return result.scalars().all()