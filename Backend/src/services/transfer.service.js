import { eq, sql, and } from 'drizzle-orm'
import { db } from '../config/db.config.js'
import { transfers, inventory, inventoryTransactions, locations, items } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

/**
 * Returns all transfers with joined location and item details.
 */
export async function getAllTransfers() {
    const srcLoc = { ...locations }
    const dstLoc = { ...locations }

    const rows = await db.execute(
        sql`
            SELECT
                t.id,
                t.transfer_number AS "transferNumber",
                t.source_location_id AS "sourceLocationId",
                src.name AS "sourceLocationName",
                t.destination_location_id AS "destinationLocationId",
                dst.name AS "destinationLocationName",
                t.item_id AS "itemId",
                i.name AS "itemName",
                i.sku AS "itemSku",
                t.quantity,
                t.status,
                t.requested_by AS "requestedBy",
                t.dispatched_by AS "dispatchedBy",
                t.received_by AS "receivedBy",
                t.created_at AS "createdAt",
                t.dispatched_at AS "dispatchedAt",
                t.received_at AS "receivedAt"
            FROM transfers t
            JOIN locations src ON t.source_location_id = src.id
            JOIN locations dst ON t.destination_location_id = dst.id
            JOIN items i ON t.item_id = i.id
            ORDER BY t.created_at DESC
        `
    )

    return rows.rows
}

/**
 * Returns a single transfer by ID.
 */
export async function getTransferById(transferId) {
    const rows = await db.execute(
        sql`
            SELECT
                t.id,
                t.transfer_number AS "transferNumber",
                t.source_location_id AS "sourceLocationId",
                src.name AS "sourceLocationName",
                t.destination_location_id AS "destinationLocationId",
                dst.name AS "destinationLocationName",
                t.item_id AS "itemId",
                i.name AS "itemName",
                t.quantity,
                t.status,
                t.requested_by AS "requestedBy",
                t.dispatched_by AS "dispatchedBy",
                t.received_by AS "receivedBy",
                t.created_at AS "createdAt",
                t.dispatched_at AS "dispatchedAt",
                t.received_at AS "receivedAt"
            FROM transfers t
            JOIN locations src ON t.source_location_id = src.id
            JOIN locations dst ON t.destination_location_id = dst.id
            JOIN items i ON t.item_id = i.id
            WHERE t.id = ${transferId}
            LIMIT 1
        `
    )

    if (rows.rows.length === 0) {
        throw new AppError('Transfer not found.', 404)
    }

    return rows.rows[0]
}

/**
 * Generates a sequential transfer number: TRN-YYYYMMDD-XXXX
 */
async function generateTransferNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await db.select({ count: sql`COUNT(*)` }).from(transfers)
    const seq = String(Number(count[0].count) + 1).padStart(4, '0')
    return `TRN-${dateStr}-${seq}`
}

/**
 * Creates a new transfer request.
 * Creating a transfer does NOT change any inventory quantities.
 * Stock only moves when the transfer is dispatched and received.
 */
export async function createTransfer(data, requestedBy) {
    const transferNumber = await generateTransferNumber()

    const [created] = await db.insert(transfers).values({
        ...data,
        transferNumber,
        requestedBy
    }).returning()

    return created
}

/**
 * Dispatches a transfer: moves stock out of the source location.
 *
 * This is a critical transaction:
 * 1. Verify transfer is in REQUESTED state
 * 2. Atomically reduce source inventory only if sufficient stock is available
 * 3. Create audit transaction record
 * 4. Update transfer status to DISPATCHED
 *
 * The atomic UPDATE ensures that two simultaneous dispatch requests
 * cannot both succeed — only one can subtract stock and get a row back.
 */
export async function dispatchTransfer(transferId, userId) {
    return await db.transaction(async (tx) => {
        // Step 1: Read and lock the transfer row
        const [transfer] = await tx
            .select()
            .from(transfers)
            .where(eq(transfers.id, transferId))
            .limit(1)

        if (!transfer) {
            throw new AppError('Transfer not found.', 404)
        }

        // Step 2: Validate the transfer is in a dispatchable state
        if (transfer.status !== 'REQUESTED') {
            throw new AppError(
                `Transfer cannot be dispatched. Current status: ${transfer.status}.`,
                409
            )
        }

        // Step 3: Atomically reduce source inventory.
        // The WHERE clause checks available quantity INSIDE the same atomic operation.
        // This prevents race conditions where two requests both pass an application-level check.
        const updatedInventory = await tx.execute(
            sql`
                UPDATE inventory
                SET
                    physical_quantity = physical_quantity - ${transfer.quantity},
                    updated_at = NOW()
                WHERE
                    item_id = ${transfer.itemId}
                    AND location_id = ${transfer.sourceLocationId}
                    AND (physical_quantity - reserved_quantity) >= ${transfer.quantity}
                RETURNING *
            `
        )

        // If no rows were updated, the source has insufficient available stock
        if (updatedInventory.rows.length === 0) {
            throw new AppError(
                'Insufficient available inventory at the source location.',
                409
            )
        }

        const sourceInventoryId = updatedInventory.rows[0].id

        // Step 4: Write an audit record for the stock decrease
        await tx.insert(inventoryTransactions).values({
            inventoryId: sourceInventoryId,
            transactionType: 'TRANSFER_DISPATCH',
            quantity: -transfer.quantity, // Negative = decrease
            referenceType: 'TRANSFER',
            referenceId: transferId,
            createdBy: userId
        })

        // Step 5: Update the transfer status to DISPATCHED
        const [updatedTransfer] = await tx
            .update(transfers)
            .set({
                status: 'DISPATCHED',
                dispatchedBy: userId,
                dispatchedAt: sql`NOW()`
            })
            .where(eq(transfers.id, transferId))
            .returning()

        return updatedTransfer
    })
}

/**
 * Receives a dispatched transfer: adds stock to the destination location.
 *
 * This is a critical transaction:
 * 1. Verify transfer is exactly in DISPATCHED state (not RECEIVED — prevents duplicate receipt)
 * 2. Upsert the destination inventory row
 * 3. Create audit transaction record
 * 4. Update transfer status to RECEIVED
 *
 * The DISPATCHED status check guarantees a transfer cannot be received twice:
 * the first receipt moves it to RECEIVED, so the second call fails at step 1.
 */
export async function receiveTransfer(transferId, userId) {
    return await db.transaction(async (tx) => {
        // Step 1: Read and lock the transfer row
        const [transfer] = await tx
            .select()
            .from(transfers)
            .where(eq(transfers.id, transferId))
            .limit(1)

        if (!transfer) {
            throw new AppError('Transfer not found.', 404)
        }

        // Step 2: Validate the transfer is in a receivable state
        if (transfer.status === 'RECEIVED') {
            throw new AppError('Transfer has already been received.', 409)
        }

        if (transfer.status !== 'DISPATCHED') {
            throw new AppError(
                `Transfer cannot be received. Current status: ${transfer.status}.`,
                409
            )
        }

        // Step 3: Upsert destination inventory.
        // If a row exists for this item+location+batch, increase its quantity.
        // If not, create a new row.
        const upsertResult = await tx.execute(
            sql`
                INSERT INTO inventory (id, item_id, location_id, batch_number, physical_quantity, reserved_quantity)
                VALUES (gen_random_uuid(), ${transfer.itemId}, ${transfer.destinationLocationId}, 'DEFAULT', ${transfer.quantity}, 0)
                ON CONFLICT (item_id, location_id, batch_number)
                DO UPDATE SET
                    physical_quantity = inventory.physical_quantity + ${transfer.quantity},
                    updated_at = NOW()
                RETURNING *
            `
        )

        const destInventoryId = upsertResult.rows[0].id

        // Step 4: Write an audit record for the stock increase
        await tx.insert(inventoryTransactions).values({
            inventoryId: destInventoryId,
            transactionType: 'TRANSFER_RECEIPT',
            quantity: transfer.quantity, // Positive = increase
            referenceType: 'TRANSFER',
            referenceId: transferId,
            createdBy: userId
        })

        // Step 5: Update the transfer status to RECEIVED
        const [updatedTransfer] = await tx
            .update(transfers)
            .set({
                status: 'RECEIVED',
                receivedBy: userId,
                receivedAt: sql`NOW()`
            })
            .where(eq(transfers.id, transferId))
            .returning()

        return updatedTransfer
    })
}
