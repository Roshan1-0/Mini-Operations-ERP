# Mini Operations ERP — Coding Standards & Engineering Protocols

## Architecture
- **Routes (`src/routes/`)**: Connect HTTP endpoints to middleware pipelines and controllers only.
- **Controllers (`src/controllers/`)**: Read request → validate payload → call service → return structured response.
- **Services (`src/services/`)**: Domain business logic, database queries, and transaction boundaries (`db.transaction`).
- **Models (`src/models/`)**: Drizzle schema definitions and database constraints only.
- **Middleware (`src/middlewares/`)**: Authentication, role authorization (RBAC), schema validation (Zod), centralized error handling.

## Code Style & Conventions
- ES modules (`import`/`export`) with `"type": "module"`.
- `async`/`await` exclusively (no unhandled promises or callbacks).
- Descriptive domain naming (`physicalQuantity`, `reservedQuantity`, `availableQuantity`).
- Short, single-purpose functions.
- Inline explanations reserved for non-obvious business behavior and SQL transaction guarantees.

## API Uniform Response Shape
- **Success**: `{ "success": true, "message": "...", "data": ... }`
- **Error**: `{ "success": false, "message": "..." }`

## Critical Engineering Invariants
- **NEVER** trust frontend quantities or calculations for availability checks.
- **ALWAYS** compute `availableQuantity` dynamically (`physical_quantity - reserved_quantity`).
- **ALWAYS** use atomic database conditional updates (`UPDATE inventory ... WHERE physical - reserved >= qty`) under concurrency.
- **ALWAYS** wrap multi-step operations (transfers, reservations, adjustments) in database transactions.
- **NEVER** put database queries or domain calculations in Express controllers.
- **NEVER** enforce authorization solely on the client UI layer.

## Prohibited Patterns
- Negative physical or reserved inventory balances.
- Out-of-order state transitions across work orders or transfers.
- Duplicate transfer receipt execution.
- Over-allocation or over-reservation of warehouse stock.
- Floating-point arithmetic for inventory item units (integers only).
- Direct raw `axios` calls in React components (use domain API client wrappers).
