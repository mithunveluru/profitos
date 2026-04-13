# ProfitOS — Inventory & Procurement Management System

A production-grade, role-based inventory and procurement management platform built for
small-to-mid-size distributors. ProfitOS streamlines purchase orders, supplier invoice
tracking, warehouse stock movement, customer sales invoicing, and payment reconciliation
under one unified backend.

---

## Why ProfitOS Exists

Managing inventory, procurement, and accounts payable across spreadsheets and disconnected
tools leads to duplicate invoices, stock-outs, payment delays, and zero audit visibility.

ProfitOS solves this by providing:

- **Role-based access control** — Owner, Manager, Accounts, and Warehouse roles with clearly scoped permissions
- **End-to-end procurement tracking** — from PO creation to GRN to invoice approval
- **Duplicate invoice detection** — automatic flagging of re-submitted vendor invoices
- **Real-time stock management** — GRN, sales deduction, and manual adjustment transactions
- **Sales & AR tracking** — sales invoices, partial payments, overdue alerts, and customer credit limits
- **Audit trail** — every transaction is tied to the user who created or approved it

---

## Tech Stack

### Backend

| Layer      | Technology               |
|------------|--------------------------|
| Language   | Python 3.12              |
| Framework  | FastAPI                  |
| ORM        | SQLAlchemy (async)       |
| Database   | PostgreSQL 15            |
| Auth       | JWT + bcrypt (passlib)   |
| Migrations | Alembic                  |
| Validation | Pydantic v2              |

### Frontend

| Layer       | Technology             |
|-------------|------------------------|
| Framework   | React + Vite           |
| Styling     | Tailwind CSS           |
| HTTP Client | Axios                  |
| State       | React Context / hooks  |

### Infrastructure

| Tool                  | Purpose                                            |
|-----------------------|----------------------------------------------------|
| Docker                | Containerise backend, frontend, and database       |
| Docker Compose        | Orchestrate multi-service local development        |
| PostgreSQL (Docker)   | Persistent relational database via named volume    |

---

## Project Structure

```text
profitos/
├── backend/
│   ├── core/
│   │   └── database.py          # Async SQLAlchemy engine + session
│   ├── models/
│   │   ├── user.py              # User model + UserRole enum
│   │   ├── supplier.py
│   │   ├── product.py
│   │   ├── purchaseorder.py
│   │   ├── invoice.py
│   │   ├── inventory.py
│   │   ├── customer.py
│   │   ├── sales.py
│   │   └── payment.py
│   ├── routers/                 # FastAPI route handlers per domain
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── seedbusiness.py          # Realistic 9-month business seed script
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── public/
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
---

## User Roles & Permissions

| Role        | Access Scope                                                              |
|-------------|---------------------------------------------------------------------------|
| `OWNER`     | Full system access — users, overrides, escalations, all approvals         |
| `MANAGER`   | Suppliers, products, purchase orders, inventory adjustments               |
| `ACCOUNTS`  | AP invoices, sales invoices, payments, duplicate detection, AR tracking   |
| `WAREHOUSE` | GRN creation, stock movement entries, inventory visibility                |

---

## Docker Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### Services defined in `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: profitos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/profitos
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "5173:5173"

volumes:
  postgres_data:
```

> **Note:** The `version` attribute in `docker-compose.yml` is intentionally omitted —
> it is deprecated in Compose v2 and will generate a warning if included.

---

## Running the Project

### 1. Clone the repository

```bash
git clone https://github.com/mithunveluru/profitos.git
cd profitos
```

### 2. Start all services

```bash
docker compose up --build
```

### 3. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Seed the database

```bash
docker compose exec backend python seedbusiness.py
```

This seeds a realistic 9-month business history including:

- 5 users across all roles
- 5 suppliers (3 reliable, 1 with quality disputes, 1 new)
- 20 products across networking, compute, peripherals, storage, and power categories
- 11 purchase orders (received, partially received, sent, approved, cancelled)
- 10 AP invoices including 1 duplicate flagged automatically
- 48 inventory transactions (GRN, sales deductions, adjustments)
- 7 customers including 1 chronic late payer and 1 government client
- 16 sales invoices (paid, partial, overdue, unpaid)

### 5. Access the app

| Service             | URL                          |
|---------------------|------------------------------|
| Frontend            | http://localhost:5173        |
| Backend API         | http://localhost:8000        |
| API Docs (Swagger)  | http://localhost:8000/docs   |

---

## Default Login Credentials

> These are seeded credentials for local development only. **Do not use in production.**

| Role      | Email                     | Password      |
|-----------|---------------------------|---------------|
| Owner     | `owner@profitos.com`      | `password123` |
| Manager   | `manager@profitos.com`    | `password123` |
| Accounts  | `accounts@profitos.com`   | `password123` |
| Warehouse | `warehouse@profitos.com`  | `password123` |

---

## Key Business Scenarios Covered

- Duplicate AP invoice detection (same invoice number re-submitted by vendor)
- Partially received PO with quality rejection and credit note tracking
- Chronic late-paying customer with credit hold escalation
- Government client order with net-60 terms and partial advance payment
- Stock adjustments for write-offs, physical audits, and defective returns
- End-of-quarter rush PO with approved status pending release
- Supplier on probation after quality dispute and cancelled PO

---

## Environment Variables

Create a `.env` file in `/backend` for local development outside Docker:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/profitos
SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

## Development Notes

- The `seedbusiness.py` script **wipes all existing data** before re-seeding. Never run this on a production database.
- Async SQLAlchemy sessions use `AsyncSessionLocal` from `core/database.py`.
- All monetary values use `Decimal` with explicit precision to avoid floating-point drift on financial calculations.
- The `bcrypt` version warning on startup (`module 'bcrypt' has no attribute 'about'`) is a known passlib compatibility issue with bcrypt >= 4.x and does not affect functionality.

---

## License

MIT License. See `LICENSE` for details.
