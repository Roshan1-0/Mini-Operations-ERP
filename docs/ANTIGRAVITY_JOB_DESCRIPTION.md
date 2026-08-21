# Antigravity ERP Development Contract & Specification

This document details the engineering specifications and architectural directives governing the implementation of the Mini Operations ERP system.

---

## 1. Core Principles & Coding Standards

1. **Backend Truth**: All business rules, invariants, and validation must exist on the backend and within database constraints. The frontend is purely a presentation layer.
2. **Deterministic Concurrency**: Never check stock in memory before updating in a separate query. All reservations and deductions must use atomic SQL conditional statements (`WHERE physical - reserved >= qty`).
3. **Atomic Multi-Step Workflows**: Dispatches, receipts, adjustments, and reservations must occur inside explicit database transactions (`db.transaction`).
4. **Thin Controllers, Rich Services**: Controllers only unpack input, pass to services, and format output. Models contain schema definitions only.
5. **Strict RBAC**: Routes must guard both authentication and role-specific permissions via middleware.

---

## 2. Mandatory Verification Scenarios

| Scenario | Expected Behavior |
|---|---|
| **Stock Over-reservation** | Requesting reservation > available inventory fails with `409 Conflict`. Database values remain untouched. |
| **Transfer Over-dispatch** | Dispatching transfer > source available stock fails with `409 Conflict`. |
| **Transfer Isolation** | Dispatching stock decrements source location; destination remains unchanged until explicitly received. |
| **Duplicate Receipt Protection** | A transfer in `RECEIVED` state rejected if receipt attempted again (`409 Conflict`). |
| **Role Enforcement** | Unauthorized role executing privileged actions receives `403 Forbidden`. |
| **Race Conditions** | Parallel competing reservations for the last remaining units allow exactly one request to succeed, rejecting the other with `409 Conflict`. |

---

## 3. Tech Stack Matrix

- **Backend**: Node.js v24 (ES Modules), Express.js 4.x, Drizzle ORM, `pg`, Zod, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS, Cookie-Parser, Vitest, Supertest.
- **Frontend**: React 18, Vite 6, React Router v7, Axios (`withCredentials: true`), SCSS modules, Lucide React.
- **Database**: PostgreSQL (Neon Cloud / Local) with Drizzle Migrations.
