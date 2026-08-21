# REST API Reference

Base URL: `http://localhost:5000/api/v1`

All protected routes require an active session via HTTP-only JWT cookie (`token`).

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
- **Access:** Public
- **Body:** `{ "name": "string", "email": "string", "password": "min6chars", "role": "ADMIN|OPERATIONS|SALES" }`
- **Response `201`:** `{ "success": true, "message": "User registered successfully.", "data": { ... } }`

### `POST /auth/login`
- **Access:** Public
- **Body:** `{ "email": "string", "password": "string" }`
- **Response `200`:** Sets `Set-Cookie: token=...; HttpOnly; SameSite=Strict` and returns user object.

### `POST /auth/logout`
- **Access:** Authenticated
- **Response `200`:** Clears cookie.

### `GET /auth/me`
- **Access:** Authenticated (Any role)
- **Response `200`:** `{ "success": true, "data": { "id": "...", "name": "...", "email": "...", "role": "..." } }`

---

## 2. Inventory (`/inventory`)

### `GET /inventory`
- **Access:** Authenticated (`ADMIN`, `OPERATIONS`, `SALES`)
- **Response `200`:** List of inventory items with computed `availableQuantity`.

### `GET /inventory/meta`
- **Access:** Authenticated (`ADMIN`, `OPERATIONS`, `SALES`)
- **Response `200`:** Dropdown datasets (`items`, `locations`, `categories`).

### `POST /inventory`
- **Access:** `ADMIN`, `OPERATIONS`
- **Body:** `{ "itemId": "uuid", "locationId": "uuid", "batchNumber": "string", "physicalQuantity": 100 }`
- **Response `201`:** Created inventory record.

### `PATCH /inventory/:id/adjust`
- **Access:** `ADMIN`, `OPERATIONS`
- **Body:** `{ "adjustment": -10, "reason": "Damaged stock" }`
- **Response `200`:** Updated inventory record + created audit ledger entry.

---

## 3. Work Orders (`/work-orders`)

### `GET /work-orders`
- **Access:** Authenticated (`ADMIN`, `OPERATIONS`, `SALES`)
- **Response `200`:** List of work orders with joined item and location.

### `POST /work-orders`
- **Access:** `ADMIN` only
- **Body:** `{ "locationId": "uuid", "itemId": "uuid", "requiredQuantity": 50, "assignedUserId": "uuid (optional)" }`
- **Response `201`:** Created work order with generated `WO-YYYYMMDD-XXXX` number.

### `GET /work-orders/:id/stock-check`
- **Access:** Authenticated
- **Response `200`:** Detailed stock check:
  ```json
  {
    "success": true,
    "data": {
      "requiredQuantity": 50,
      "availableQuantity": 20,
      "shortage": 30,
      "isFullyAvailable": false,
      "alternateLocations": [{ "locationId": "...", "locationName": "Branch Warehouse", "availableQuantity": 100 }]
    }
  }
  ```

### `PATCH /work-orders/:id/status`
- **Access:** `ADMIN`, `OPERATIONS`
- **Body:** `{ "status": "IN_PROGRESS" | "COMPLETED" }`
- **Response `200`:** Updated work order.

---

## 4. Internal Transfers (`/transfers`)

### `GET /transfers`
- **Access:** Authenticated (`ADMIN`, `OPERATIONS`, `SALES`)
- **Response `200`:** List of transfers.

### `POST /transfers`
- **Access:** `ADMIN`, `OPERATIONS`
- **Body:** `{ "sourceLocationId": "uuid", "destinationLocationId": "uuid", "itemId": "uuid", "quantity": 25 }`
- **Response `201`:** Transfer created in `REQUESTED` status (stock unchanged).

### `PATCH /transfers/:id/dispatch`
- **Access:** `ADMIN`, `OPERATIONS`
- **Behavior:** Deducts stock atomically from source location; status becomes `DISPATCHED`.
- **Response `200`:** Dispatched transfer. (Throws `409` if insufficient source stock).

### `PATCH /transfers/:id/receive`
- **Access:** `ADMIN`, `OPERATIONS`
- **Behavior:** Upserts destination inventory and increments stock; status becomes `RECEIVED`.
- **Response `200`:** Received transfer. (Throws `409` if already received or not dispatched).

---

## 5. Customer Orders (`/orders`)

### `GET /orders`
- **Access:** Authenticated (`ADMIN`, `OPERATIONS`, `SALES`)
- **Response `200`:** List of customer orders with aggregated line items.

### `POST /orders`
- **Access:** `ADMIN`, `SALES`
- **Body:**
  ```json
  {
    "customerName": "Acme Corp",
    "items": [
      { "itemId": "uuid", "locationId": "uuid", "quantity": 10 }
    ]
  }
  ```
- **Response `201`:** Order created in `PENDING` status.

### `POST /orders/:id/reserve`
- **Access:** `ADMIN`, `SALES`
- **Behavior:** Atomically increments `reserved_quantity` on matching inventory rows inside a single transaction. Status becomes `RESERVED`.
- **Response `200`:** Order marked as `RESERVED`. (Throws `409` if any item lacks available stock).

### `PATCH /orders/:id/cancel`
- **Access:** `ADMIN`, `SALES`
- **Behavior:** Atomically decrements any allocated `reserved_quantity` and releases stock. Status becomes `CANCELLED`.
- **Response `200`:** Order marked as `CANCELLED`.
