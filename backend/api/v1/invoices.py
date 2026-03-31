from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from decimal import Decimal
from datetime import date
from core.database import get_db
from core.dependencies import get_current_user, require_roles
from models.user import User, UserRole
from services.invoice_service import InvoiceService
from schemas.invoice import InvoiceCreate
from utils.responses import success, error
import uuid

router = APIRouter()

def _serialize(inv) -> dict:
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "vendor_id": inv.vendor_id,
        "vendor_name": inv.vendor.name if inv.vendor else None,
        "po_id": inv.po_id,
        "amount": str(inv.amount),
        "invoice_date": str(inv.invoice_date),
        "due_date": str(inv.due_date) if inv.due_date else None,
        "status": inv.status,
        "is_duplicate": inv.is_duplicate,
        "duplicate_of_id": inv.duplicate_of_id,
        "file_url": inv.file_url,
        "notes": inv.notes,
        "approved_by": inv.approved_by,
        "created_at": str(inv.created_at),
    }

@router.get("")
async def list_invoices(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InvoiceService(db)
    invoices = await service.get_invoices(status=status)
    return success([_serialize(i) for i in invoices])

@router.get("/inbox")
async def approval_inbox(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = InvoiceService(db)
    inbox = await service.get_approval_inbox()
    return success({
        "pending_approval": [_serialize(i) for i in inbox["pending_approval"]],
        "duplicate_review": [_serialize(i) for i in inbox["duplicate_review"]],
        "total_pending": len(inbox["pending_approval"]) + len(inbox["duplicate_review"]),
    })

@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InvoiceService(db)
    invoice = await service.get_invoice(invoice_id)
    return success(_serialize(invoice))

@router.post("")
async def create_invoice(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTS)),
):
    service = InvoiceService(db)
    invoice = await service.create_invoice(payload, current_user.id)
    return success(_serialize(invoice), status_code=201)

@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    invoice_number: str = Form(...),
    vendor_id: str = Form(...),
    amount: str = Form(...),
    invoice_date: str = Form(...),
    due_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTS)),
):
    # Validate file type
    if file.content_type not in ("application/pdf", "image/jpeg", "image/png"):
        return error("Only PDF, JPG, PNG files are allowed", 400)

    # In production this uploads to R2 — for now save locally
    file_key = f"invoices/{uuid.uuid4()}_{file.filename}"
    file_url = f"/uploads/{file_key}"  # Replace with R2 URL in production

    payload = InvoiceCreate(
        invoice_number=invoice_number,
        vendor_id=vendor_id,
        amount=Decimal(amount),
        invoice_date=date.fromisoformat(invoice_date),
        due_date=date.fromisoformat(due_date) if due_date else None,
        notes=notes,
    )
    service = InvoiceService(db)
    invoice = await service.create_invoice(payload, current_user.id, file_url=file_url)
    return success(_serialize(invoice), status_code=201)

@router.post("/{invoice_id}/approve")
async def approve_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = InvoiceService(db)
    invoice = await service.approve_invoice(invoice_id, current_user.id)
    return success(_serialize(invoice))

@router.post("/{invoice_id}/reject")
async def reject_invoice(
    invoice_id: str,
    payload: dict = {},
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.MANAGER)),
):
    service = InvoiceService(db)
    invoice = await service.reject_invoice(invoice_id, current_user.id, reason=payload.get("reason"))
    return success(_serialize(invoice))