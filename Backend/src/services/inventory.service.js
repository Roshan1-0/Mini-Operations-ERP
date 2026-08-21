import { eq, sql } from 'drizzle-orm'
import { db } from '../config/db.config.js'
import { inventory, inventoryTransactions, items, locations, categories } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

/**
 * Returns all inventory records with item, location, and category details.
 * Available quantity is calculated as physical - reserved (never stored separately).
 */
export async function getAllInventory() {
    const rows = await db
        .select({
            id: inventory.id,
            itemId: inventory.itemId,
            itemName: items.name,
            sku: items.sku,
            categoryName: categories.name,
            locationId: inventory.locationId,
            locationName: locations.name,
            locationCode: locations.code,
            batchNumber: inventory.batchNumber,
            physicalQuantity: inventory.physicalQuantity,
            reservedQuantity: inventory.reservedQuantity,
            updatedAt: inventory.updatedAt
        })
        .from(inventory)
        .innerJoin(items, eq(inventory.itemId, items.id))
        .innerJoin(locations, eq(inventory.locationId, locations.id))
        .innerJoin(categories, eq(items.categoryId, categories.id))
        .orderBy(items.name)

    // Calculate availableQuantity in the service, not on the frontend
    return rows.map(row => ({
        ...row,
        availableQuantity: row.physicalQuantity - row.reservedQuantity
    }))
}

/**
 * Returns a single inventory record by ID.
 */
export async function getInventoryById(inventoryId) {
    const [row] = await db
        .select({
            id: inventory.id,
            itemId: inventory.itemId,
            itemName: items.name,
            sku: items.sku,
            categoryName: categories.name,
            locationId: inventory.locationId,
            locationName: locations.name,
            batchNumber: inventory.batchNumber,
            physicalQuantity: inventory.physicalQuantity,
            reservedQuantity: inventory.reservedQuantity
        })
        .from(inventory)
        .innerJoin(items, eq(inventory.itemId, items.id))
        .innerJoin(locations, eq(inventory.locationId, locations.id))
        .innerJoin(categories, eq(items.categoryId, categories.id))
        .where(eq(inventory.id, inventoryId))
        .limit(1)

    if (!row) {
        throw new AppError('Inventory record not found.', 404)
    }

    return {
        ...row,
        availableQuantity: row.physicalQuantity - row.reservedQuantity
    }
}

/**
 * Creates a new inventory record for an item at a location.
 */
export async function createInventory(data) {
    const [created] = await db.insert(inventory).values(data).returning()
    return created
}

/**
 * Adjusts physical quantity by a positive or negative amount.
 * Creates an audit transaction record.
 * Uses a database transaction so both updates succeed or fail together.
 */
export async function adjustInventory(inventoryId, adjustment, userId) {
    return await db.transaction(async (tx) => {
        // Lock the row and apply the adjustment atomically
        const updated = await tx
            .update(inventory)
            .set({
                physicalQuantity: sql`${inventory.physicalQuantity} + ${adjustment}`,
                updatedAt: sql`NOW()`
            })
            .where(eq(inventory.id, inventoryId))
            .returning()

        if (updated.length === 0) {
            throw new AppError('Inventory record not found.', 404)
        }

        const row = updated[0]

        // The DB CHECK constraint will catch negative physical_quantity.
        // We also check here for a clearer error message.
        if (row.physicalQuantity < 0) {
            throw new AppError('Adjustment would result in negative inventory.', 409)
        }

        // Write an audit record
        await tx.insert(inventoryTransactions).values({
            inventoryId,
            transactionType: 'ADJUSTMENT',
            quantity: adjustment,
            referenceType: 'MANUAL',
            createdBy: userId
        })

        return {
            ...row,
            availableQuantity: row.physicalQuantity - row.reservedQuantity
        }
    })
}

/**
 * Returns all items and locations for dropdown population on the frontend.
 */
export async function getItemsAndLocations() {
    const [allItems, allLocations, allCategories] = await Promise.all([
        db.select().from(items).orderBy(items.name),
        db.select().from(locations).orderBy(locations.name),
        db.select().from(categories).orderBy(categories.name)
    ])
    return { items: allItems, locations: allLocations, categories: allCategories }
}
