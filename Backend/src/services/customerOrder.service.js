import { eq, sql } from 'drizzle-orm'
import { db } from '../config/db.config.js'
import { customerOrders, customerOrderItems, inventory, inventoryTransactions, items, locations } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

/**
 * Returns all customer orders with joined details.
 */
export async function getAllOrders() {
    const rows = await db.execute(
        sql`
            SELECT
                co.id,
                co.order_number AS "orderNumber",
                co.customer_name AS "customerName",
                co.status,
                co.created_at AS "createdAt",
                co.updated_at AS "updatedAt",
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', coi.id,
                            'itemId', coi.item_id,
                            'itemName', i.name,
                            'itemSku', i.sku,
                            'locationId', coi.location_id,
                            'locationName', l.name,
                            'quantity', coi.quantity,
                            'reservedQuantity', coi.reserved_quantity
                        )
                    ) FILTER (WHERE coi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM customer_orders co
            LEFT JOIN customer_order_items coi ON co.id = coi.order_id
            LEFT JOIN items i ON coi.item_id = i.id
            LEFT JOIN locations l ON coi.location_id = l.id
            GROUP BY co.id
            ORDER BY co.created_at DESC
        `
    )
    return rows.rows
}

/**
 * Returns a single order by ID.
 */
export async function getOrderById(orderId) {
    const rows = await db.execute(
        sql`
            SELECT
                co.id,
                co.order_number AS "orderNumber",
                co.customer_name AS "customerName",
                co.status,
                co.created_at AS "createdAt",
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', coi.id,
                            'itemId', coi.item_id,
                            'itemName', i.name,
                            'locationId', coi.location_id,
                            'locationName', l.name,
                            'quantity', coi.quantity,
                            'reservedQuantity', coi.reserved_quantity
                        )
                    ) FILTER (WHERE coi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM customer_orders co
            LEFT JOIN customer_order_items coi ON co.id = coi.order_id
            LEFT JOIN items i ON coi.item_id = i.id
            LEFT JOIN locations l ON coi.location_id = l.id
            WHERE co.id = ${orderId}
            GROUP BY co.id
            LIMIT 1
        `
    )

    if (rows.rows.length === 0) {
        throw new AppError('Order not found.', 404)
    }

    return rows.rows[0]
}

/**
 * Generates a sequential order number: ORD-YYYYMMDD-XXXX
 */
async function generateOrderNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await db.select({ count: sql`COUNT(*)` }).from(customerOrders)
    const seq = String(Number(count[0].count) + 1).padStart(4, '0')
    return `ORD-${dateStr}-${seq}`
}

/**
 * Creates a new customer order without reserving stock.
 * Stock is reserved only when reserveStock() is called.
 */
export async function createOrder(data, createdBy) {
    const orderNumber = await generateOrderNumber()

    return await db.transaction(async (tx) => {
        const [order] = await tx.insert(customerOrders).values({
            orderNumber,
            customerName: data.customerName,
            createdBy
        }).returning()

        // Insert order line items
        const lineItems = data.items.map(item => ({
            orderId: order.id,
            itemId: item.itemId,
            locationId: item.locationId,
            quantity: item.quantity,
            reservedQuantity: 0
        }))

        await tx.insert(customerOrderItems).values(lineItems)

        return order
    })
}

/**
 * Reserves stock for a customer order.
 *
 * This is the most critical concurrent operation in the system:
 * Two simultaneous reservation requests for the same item+location
 * must NOT both succeed if there is only enough stock for one.
 *
 * How concurrency safety is achieved:
 * The UPDATE statement includes a WHERE clause that rechecks availability
 * INSIDE the same atomic database operation.
 * If (physical_quantity - reserved_quantity) < quantity at update time,
 * the UPDATE affects 0 rows and we rollback with a 409 error.
 * This is guaranteed by the database — no application-level race condition possible.
 */
export async function reserveStock(orderId, userId) {
    return await db.transaction(async (tx) => {
        // Step 1: Read the order and its items
        const [order] = await tx
            .select()
            .from(customerOrders)
            .where(eq(customerOrders.id, orderId))
            .limit(1)

        if (!order) {
            throw new AppError('Order not found.', 404)
        }

        if (order.status !== 'PENDING') {
            throw new AppError(
                `Order cannot be reserved. Current status: ${order.status}.`,
                409
            )
        }

        const orderLineItems = await tx
            .select()
            .from(customerOrderItems)
            .where(eq(customerOrderItems.orderId, orderId))

        // Step 2: For each line item, atomically increase reserved_quantity
        // The WHERE clause ensures we only succeed if sufficient stock is available
        for (const lineItem of orderLineItems) {
            const result = await tx.execute(
                sql`
                    UPDATE inventory
                    SET
                        reserved_quantity = reserved_quantity + ${lineItem.quantity},
                        updated_at = NOW()
                    WHERE
                        item_id = ${lineItem.itemId}
                        AND location_id = ${lineItem.locationId}
                        AND (physical_quantity - reserved_quantity) >= ${lineItem.quantity}
                    RETURNING id
                `
            )

            // If 0 rows returned, there is insufficient available stock.
            // Rollback the entire transaction — no partial reservations.
            if (result.rows.length === 0) {
                throw new AppError(
                    'Insufficient available inventory to complete this reservation.',
                    409
                )
            }

            const inventoryId = result.rows[0].id

            // Write audit record for the reservation
            await tx.insert(inventoryTransactions).values({
                inventoryId,
                transactionType: 'RESERVATION',
                quantity: lineItem.quantity,
                referenceType: 'ORDER',
                referenceId: orderId,
                createdBy: userId
            })

            // Update the order item's reserved quantity
            await tx
                .update(customerOrderItems)
                .set({ reservedQuantity: lineItem.quantity })
                .where(eq(customerOrderItems.id, lineItem.id))
        }

        // Step 3: Mark the order as RESERVED
        const [updatedOrder] = await tx
            .update(customerOrders)
            .set({ status: 'RESERVED', updatedAt: sql`NOW()` })
            .where(eq(customerOrders.id, orderId))
            .returning()

        return updatedOrder
    })
}

/**
 * Cancels a customer order and releases any reserved stock.
 * This handles the future-readiness requirement for order cancellation.
 */
export async function cancelOrder(orderId, userId) {
    return await db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(customerOrders)
            .where(eq(customerOrders.id, orderId))
            .limit(1)

        if (!order) {
            throw new AppError('Order not found.', 404)
        }

        if (order.status === 'CANCELLED') {
            throw new AppError('Order is already cancelled.', 409)
        }

        if (order.status === 'COMPLETED') {
            throw new AppError('Completed orders cannot be cancelled.', 409)
        }

        const orderLineItems = await tx
            .select()
            .from(customerOrderItems)
            .where(eq(customerOrderItems.orderId, orderId))

        // Release any reserved stock
        for (const lineItem of orderLineItems) {
            if (lineItem.reservedQuantity > 0) {
                const result = await tx.execute(
                    sql`
                        UPDATE inventory
                        SET
                            reserved_quantity = reserved_quantity - ${lineItem.reservedQuantity},
                            updated_at = NOW()
                        WHERE
                            item_id = ${lineItem.itemId}
                            AND location_id = ${lineItem.locationId}
                        RETURNING id
                    `
                )

                if (result.rows.length > 0) {
                    await tx.insert(inventoryTransactions).values({
                        inventoryId: result.rows[0].id,
                        transactionType: 'RESERVATION_RELEASE',
                        quantity: -lineItem.reservedQuantity,
                        referenceType: 'ORDER',
                        referenceId: orderId,
                        createdBy: userId
                    })
                }
            }
        }

        const [updatedOrder] = await tx
            .update(customerOrders)
            .set({ status: 'CANCELLED', updatedAt: sql`NOW()` })
            .where(eq(customerOrders.id, orderId))
            .returning()

        return updatedOrder
    })
}
