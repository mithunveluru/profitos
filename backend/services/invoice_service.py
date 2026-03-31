from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from models.invoice import Invoice, InvoiceStatus
from models.purchase_order import PurchaseOrder, POStatus
from models.supplier import Supplier
from schemas.invoice import InvoiceCreate
from audit.logger import AuditLog
from fastapi import HTTPException

DUPLICATE_WINDOW_DAYS = 7
AUTO_APPROVE_THRESHOLD = Decimal("5000")

class InvoiceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _log(self, action: str, entity_id: str, user_id: str, meta: dict = None):
        log = AuditLog(action=action, entity_id=entity_id, user_id=user_id, meta=meta)
        self.db.add(log)

    async def _find_duplicate(self, vendor_id: str, amount: Decimal, invoice_date: date) -> Invoice | None:
        window_start = invoice_date - timedelta(days=DUPLICATE_WINDOW_DAYS)
        window_end   = invoice_date + timedelta(days=DUPLICATE_WINDOW_DAYS)
        result = await self.db.execute(
            select(Invoice).where(
                and_(
                    Invoice.vendor_id == vendor_id,
                    Invoice.amount == amount,
                    Invoice.invoice_date.between(window_start, window_end),
                    Invoice.status != InvoiceStatus.REJECTED,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _match_po(self, vendor_id: str, amount: Decimal) -> PurchaseOrder | None:
        result = await self.db.execute(
            select(PurchaseOrder).where(
                and_(
                    PurchaseOrder.supplier_id == vendor_id,
                    PurchaseOrder.status == POStatus.SENT,
                    PurchaseOrder.total_amount == amount,
                )
            )
        )
        return result.scalar_one_or_none()

    async def create_invoice(self, payload: InvoiceCreate, user_id: str, file_url: str = None) -> Invoice:
        duplicate = await self._find_duplicate(payload.vendor_id, payload.amount, payload.invoice_date)
        matched_po = await self._match_po(payload.vendor_id, payload.amount)

        invoice = Invoice(
            invoice_number=payload.invoice_number,
            vendor_id=payload.vendor_id,
            po_id=matched_po.id if matched_po else payload.po_id,
            amount=payload.amount,
            invoice_date=payload.invoice_date,
            due_date=payload.due_date,
            file_url=file_url,
            notes=payload.notes,
        )

        if duplicate:
            invoice.is_duplicate     = True
            invoice.duplicate_of_id  = duplicate.id
            invoice.status           = InvoiceStatus.DUPLICATE_REVIEW
        elif payload.amount < AUTO_APPROVE_THRESHOLD:
            invoice.status      = InvoiceStatus.APPROVED
            invoice.approved_by = user_id
        else:
            invoice.status = InvoiceStatus.PENDING

        self.db.add(invoice)
        await self.db.flush()
        await self._log("invoice.created", invoice.id, user_id, {
            "amount": str(payload.amount),
            "status": invoice.status,
            "po_matched": matched_po.id if matched_po else None,
            "is_duplicate": invoice.is_duplicate,
        })
        return invoice

    async def get_invoices(self, status: str = None) -> list[Invoice]:
        query = select(Invoice).options(
            selectinload(Invoice.vendor)
        ).order_by(Invoice.created_at.desc())
        if status:
            query = query.where(Invoice.status == status)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_invoice(self, invoice_id: str) -> Invoice:
        result = await self.db.execute(
            select(Invoice)
            .options(selectinload(Invoice.vendor))
            .where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice

    async def approve_invoice(self, invoice_id: str, user_id: str) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status not in (InvoiceStatus.PENDING, InvoiceStatus.DUPLICATE_REVIEW):
            raise HTTPException(status_code=400, detail=f"Cannot approve invoice in '{invoice.status}' state")
        invoice.status      = InvoiceStatus.APPROVED
        invoice.approved_by = user_id
        await self.db.flush()
        await self._log("invoice.approved", invoice.id, user_id)
        return invoice

    async def reject_invoice(self, invoice_id: str, user_id: str, reason: str = None) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status == InvoiceStatus.PAID:
            raise HTTPException(status_code=400, detail="Cannot reject a paid invoice")
        invoice.status = InvoiceStatus.REJECTED
        invoice.notes  = reason or invoice.notes
        await self.db.flush()
        await self._log("invoice.rejected", invoice.id, user_id, {"reason": reason})
        return invoice

    async def get_approval_inbox(self) -> dict:
        pending_result = await self.db.execute(
            select(Invoice).options(selectinload(Invoice.vendor))
            .where(Invoice.status == InvoiceStatus.PENDING)
            .order_by(Invoice.amount.desc())
        )
        duplicate_result = await self.db.execute(
            select(Invoice).options(selectinload(Invoice.vendor))
            .where(Invoice.status == InvoiceStatus.DUPLICATE_REVIEW)
            .order_by(Invoice.created_at.desc())
        )
        return {
            "pending_approval": pending_result.scalars().all(),
            "duplicate_review": duplicate_result.scalars().all(),
        }