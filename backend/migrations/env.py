import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from alembic import context

# Import ALL your models here so Alembic can detect them
from models.base import Base
from models.user import User
from models.product import Product
from models.inventory import InventoryTransaction
from models.purchase_order import PurchaseOrder, POLineItem
from models.invoice import Invoice
from models.sales import SalesInvoice, SalesLineItem
from models.supplier import Supplier
from models.customer import Customer
from models.payment import Payment
from audit.logger import AuditLog

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online():
    asyncio.run(run_async_migrations())

run_migrations_online()