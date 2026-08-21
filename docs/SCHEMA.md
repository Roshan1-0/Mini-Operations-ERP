# Database Schema & Entity Relationships

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        user_role role
        timestamp created_at
        timestamp updated_at
    }

    LOCATIONS {
        uuid id PK
        varchar name
        varchar code UK
        timestamp created_at
    }

    CATEGORIES {
        uuid id PK
        varchar name UK
    }

    ITEMS {
        uuid id PK
        varchar sku UK
        varchar name
        uuid category_id FK
        timestamp created_at
    }

    INVENTORY {
        uuid id PK
        uuid item_id FK
        uuid location_id FK
        varchar batch_number
        integer physical_quantity
        integer reserved_quantity
        timestamp created_at
        timestamp updated_at
    }

    INVENTORY_TRANSACTIONS {
        uuid id PK
        uuid inventory_id FK
        transaction_type transaction_type
        integer quantity
        varchar reference_type
        uuid reference_id
        uuid created_by FK
        timestamp created_at
    }

    WORK_ORDERS {
        uuid id PK
        varchar work_order_number UK
        uuid location_id FK
        uuid item_id FK
        integer required_quantity
        uuid assigned_user_id FK
        work_order_status status
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    TRANSFERS {
        uuid id PK
        varchar transfer_number UK
        uuid source_location_id FK
        uuid destination_location_id FK
        uuid item_id FK
        integer quantity
        transfer_status status
        uuid requested_by FK
        uuid dispatched_by FK
        uuid received_by FK
        timestamp created_at
        timestamp dispatched_at
        timestamp received_at
    }

    CUSTOMER_ORDERS {
        uuid id PK
        varchar order_number UK
        varchar customer_name
        order_status status
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMER_ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid item_id FK
        uuid location_id FK
        integer quantity
        integer reserved_quantity
    }

    USERS ||--o{ WORK_ORDERS : "creates"
    USERS ||--o{ TRANSFERS : "requests"
    USERS ||--o{ CUSTOMER_ORDERS : "creates"
    CATEGORIES ||--o{ ITEMS : "classifies"
    ITEMS ||--o{ INVENTORY : "stocked_as"
    LOCATIONS ||--o{ INVENTORY : "houses"
    INVENTORY ||--o{ INVENTORY_TRANSACTIONS : "audited_by"
    CUSTOMER_ORDERS ||--|{ CUSTOMER_ORDER_ITEMS : "contains"
    ITEMS ||--o{ CUSTOMER_ORDER_ITEMS : "referenced_in"
    LOCATIONS ||--o{ CUSTOMER_ORDER_ITEMS : "allocated_from"
```

---

## 2. Table Specifications & Constraints

### `users`
- `id`: UUID primary key default `gen_random_uuid()`
- `email`: Unique, non-null
- `role`: PostgreSQL enum `('ADMIN', 'OPERATIONS', 'SALES')`

### `locations`
- `code`: Unique warehouse/facility identifier (e.g. `WH-MAIN`, `WH-BRANCH`)

### `items`
- `sku`: Unique stock keeping unit (e.g. `ELEC-001`)
- `category_id`: Foreign key referencing `categories(id)`

### `inventory` (Core Ledger Anchor)
- `unique_item_location_batch`: `UNIQUE (item_id, location_id, batch_number)`
- `physical_qty_non_negative`: `CHECK (physical_quantity >= 0)`
- `reserved_qty_non_negative`: `CHECK (reserved_quantity >= 0)`
- `reserved_lte_physical`: `CHECK (reserved_quantity <= physical_quantity)`

> **Computed Field Rule**: `available_quantity` is computed as `physical_quantity - reserved_quantity` dynamically in the service layer to avoid data drift.

### `inventory_transactions` (Audit Trail)
- `transaction_type`: Enum `('ADJUSTMENT', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIPT', 'RESERVATION', 'RESERVATION_RELEASE')`
- `quantity`: Signed integer (+ for addition, - for deduction)

### `transfers`
- `transfer_number`: Unique (Format: `TRN-YYYYMMDD-XXXX`)
- `status`: Enum `('REQUESTED', 'DISPATCHED', 'RECEIVED')`

### `work_orders`
- `work_order_number`: Unique (Format: `WO-YYYYMMDD-XXXX`)
- `status`: Enum `('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')`

### `customer_orders` & `customer_order_items`
- `order_number`: Unique (Format: `ORD-YYYYMMDD-XXXX`)
- `status`: Enum `('PENDING', 'RESERVED', 'COMPLETED', 'CANCELLED')`
- Foreign key cascade on `customer_order_items(order_id)` for relational integrity.
