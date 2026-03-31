from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1 import auth, inventory as inv_router, procurement, invoices, \
                   sales as sales_router, suppliers, dashboard, audit, users
from contextlib import asynccontextmanager
import sentry_sdk
from core.config import settings

from models import user, product, inventory, purchase_order, invoice, sales, supplier, customer, payment
from audit.logger import AuditLog

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT, traces_sample_rate=0.2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="ProfitOS API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "https://profitos.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/v1/auth",        tags=["Auth"])
app.include_router(inv_router.router,    prefix="/api/v1/inventory",   tags=["Inventory"])
app.include_router(procurement.router,   prefix="/api/v1/procurement", tags=["Procurement"])
app.include_router(invoices.router,      prefix="/api/v1/invoices",    tags=["Invoices"])
app.include_router(sales_router.router,  prefix="/api/v1/sales",       tags=["Sales"])
app.include_router(suppliers.router,     prefix="/api/v1/suppliers",   tags=["Suppliers"])
app.include_router(dashboard.router,     prefix="/api/v1/dashboard",   tags=["Dashboard"])
app.include_router(audit.router,         prefix="/api/v1/audit",       tags=["Audit"])
app.include_router(users.router,         prefix="/api/v1/users",       tags=["Users"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}