import { pgTable, uuid, integer, varchar, timestamp, check, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { items } from './item.model.js'
import { locations } from './location.model.js'

export const inventory = pgTable('inventory', {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id').notNull().references(() => items.id),
    locationId: uuid('location_id').notNull().references(() => locations.id),
    batchNumber: varchar('batch_number', { length: 50 }).notNull().default('DEFAULT'),
    physicalQuantity: integer('physical_quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
    // Unique inventory row per item + location + batch
    uniqueItemLocationBatch: uniqueIndex('unique_item_location_batch').on(
        table.itemId, table.locationId, table.batchNumber
    ),
    // DB-level constraint: physical quantity must be non-negative
    physicalQtyCheck: check('physical_qty_non_negative', sql`${table.physicalQuantity} >= 0`),
    // DB-level constraint: reserved quantity must be non-negative
    reservedQtyCheck: check('reserved_qty_non_negative', sql`${table.reservedQuantity} >= 0`),
    // DB-level constraint: reserved cannot exceed physical
    reservedLtePhysical: check('reserved_lte_physical', sql`${table.reservedQuantity} <= ${table.physicalQuantity}`)
}))
