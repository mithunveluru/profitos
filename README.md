# Procurement & Invoice Management System

A full-stack system built to streamline procurement, inventory updates, and invoice handling in a single workflow.  
The focus is not only on individual features, but on how these components work together in a real operational system.

## Overview

This project connects three core parts of operations:

- Procurement: purchase orders and supplier flow.
- Inventory: stock tracking and movement.
- Invoices: approval, validation, and audit.

Instead of treating them as separate modules, the system is designed so that each action naturally triggers the next, similar to how things run in practice.

## Core Features

### Procurement
- Generates reorder suggestions based on recent consumption.
- Create and manage purchase orders with line items.
- Clear status flow: `Draft → Approved → Sent → Received`.
- Automatic stock update when items are received.

### Inventory
- Transaction-based stock tracking.
- Supports sales and GRN (Goods Received Note) updates.
- Keeps stock levels consistent without manual correction.

### Invoice Processing
- Create and upload invoices.
- Auto-approval for low-value invoices.
- Duplicate detection within a defined window.
- Approval/rejection flow with basic audit logging.

### User Interface
- Minimal and functional interface.
- Focused views for purchase orders and suggestions.
- Detailed modals instead of cluttered pages.

## Tech Stack

### Backend
- FastAPI
- Async SQLAlchemy
- Relational database (PostgreSQL preferred)

### Frontend
- React
- Simple component-driven structure
- API-first approach

## System Flow

At a high level:

1. Low stock is detected, and reorder suggestions are generated.
2. A purchase order is created and progresses through its states.
3. When goods are received, inventory is updated automatically.
4. An invoice is created, validated, and then approved or rejected.

Each step is connected, so the system stays consistent without manual syncing.

## Project Structure

```bash
backend/
  api/
  services/
  models/

frontend/
  modules/
    procurement/
    invoices/
  services/
```

## Running the Project

### Backend
```bash
uvicorn main:app --reload
```

### Frontend
```bash
npm install
npm run dev
```

## Design Notes

- State transitions are enforced, so invalid jumps in the purchase order lifecycle are not allowed.
- Inventory updates are triggered through transactions, not direct edits.
- Invoice validation includes duplicate detection and auto-approval rules.
- Backend logic is kept modular, with the service layer handling business rules.

## Scope for Improvement

- Add analytics and dashboards for procurement trends.
- Add notifications for approvals and low stock.
- Improve role-based access control.
- Add external storage for invoice documents.

## Conclusion

This project is mainly about building a clean, connected workflow rather than isolated features.  
The goal is to keep the system predictable, easy to extend, and close to real-world usage.
