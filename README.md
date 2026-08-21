# Mini Operations ERP

A production-grade, transaction-safe Mini Operations ERP application built with PostgreSQL, Express.js, React (Vite), and Node.js.

---

## 🌟 Key Features

- **Inventory Tracking**: Multi-location, multi-batch real-time stock balances. Calculated available inventory (`physical - reserved`) prevents double-selling.
- **Work Orders**: Lifecycle tracking (`ASSIGNED` → `IN_PROGRESS` → `COMPLETED`) with automated material availability check and cross-location shortage detection.
- **Internal Transfers**: Multi-step warehouse transfer pipeline (`REQUESTED` → `DISPATCHED` → `RECEIVED`). Atomic inventory deduction on dispatch, verified addition on receipt, and prevention of duplicate receipt.
- **Customer Orders & Stock Reservation**: Concurrency-safe atomic reservations. Simultaneous requests competing for identical stock are resolved safely at the database transaction layer.
- **Role-Based Access Control (RBAC)**: Secure JWT session management in `HttpOnly` cookies. Granular roles: `ADMIN`, `OPERATIONS`, `SALES`.
- **Comprehensive Test Suite**: Automated tests verifying concurrency, transaction integrity, invariants, and authorization.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ (v24 recommended)
- **PostgreSQL**: Cloud (Neon, Supabase) or Local instance

---

### 1. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file inside `Backend/`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://neondb_owner:...............-damp-recipe-azh2miet-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=super_secret_jwt_key_that_is_at_least_32_characters_long
CLIENT_URL=http://localhost:5173
```

Run migrations & seed initial demo data:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Start the backend server:
```bash
npm run dev
```
> Server runs on `http://localhost:5000`

---

### 2. Frontend Setup

```bash
cd ../Frontend
npm install
```

Create a `.env` file inside `Frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Start the frontend development server:
```bash
npm run dev
```
> App runs on `http://localhost:5173`

---

## 🔑 Demo Credentials

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **Admin** | `admin@erp.com` | `password123` | Full access (Inventory adjustment, Work Order creation, Transfers, Customer Orders) |
| **Operations** | `ops@erp.com` | `password123` | Inventory adjustments, Work order status progress, Transfers dispatch/receive |
| **Sales** | `sales@erp.com` | `password123` | Customer order creation, Stock reservations, Order cancellation |

---

## 🧪 Running Automated Tests

Run the full Vitest suite:
```bash
cd Backend
npm test
```

### Verified Scenarios:
1. **TEST 1**: Cannot reserve more stock than available (`409 Conflict`).
2. **TEST 2**: Cannot dispatch internal transfer exceeding available inventory.
3. **TEST 3**: Destination stock increases only after receipt (dispatch does not prematurely credit destination).
4. **TEST 4**: Same transfer cannot be received twice (`409 Conflict`).
5. **TEST 5**: Role authorization matrix enforced (e.g. Sales cannot dispatch transfers → `403 Forbidden`).
6. **CONCURRENCY**: Simultaneous conflicting reservations safely isolate and allow exactly one winner.

---

## 📂 Project Architecture

```
mini-erp/
├── docs/
│   ├── ARCHITECTURE.md          # Architecture details, concurrency strategy, state machines
│   ├── SCHEMA.md                # Entity relationship diagram and DB constraints
│   ├── API.md                   # Complete REST API reference
│   └── ANTIGRAVITY_JOB_DESCRIPTION.md # Job description & prompt specification
├── Backend/
│   ├── src/
│   │   ├── config/              # Database pool & Drizzle ORM config
│   │   ├── controllers/         # Thin request/response handlers
│   │   ├── middlewares/         # Auth, RBAC, Validation & Error handler
│   │   ├── models/              # Drizzle ORM schema definitions
│   │   ├── routes/              # Express route registrations
│   │   ├── services/            # Transactional business logic
│   │   ├── validators/          # Zod schema validation
│   │   ├── utils/               # AppError, response helpers
│   │   └── app.js               # Express application initialization
│   ├── tests/                   # Vitest unit & integration test suites
│   ├── server.js                # Server entry point
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── Features/            # Domain modules (Auth, Inventory, WorkOrders, Transfers, Orders)
│   │   ├── components/          # Shared UI (Layout, Badges, Modals, Confirmations, Tables)
│   │   ├── styles/              # SCSS variables, mixins, responsive styles
│   │   ├── util/                # Axios instance, formatting helpers, constants
│   │   ├── App.jsx              # Client router with protected routes
│   │   └── main.jsx
│   └── package.json
└── README.md
```
