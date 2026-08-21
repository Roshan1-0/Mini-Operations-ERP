// Load environment variables FIRST — before importing db.config which creates the pool
import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '../src/config/db.config.js'
import { runSeed } from '../src/seed.js'

/**
 * Resets the database between test suites by truncating all tables.
 * This ensures tests don't interfere with each other.
 */
export async function resetDatabase() {
    await db.execute(sql`
        TRUNCATE TABLE
            inventory_transactions,
            customer_order_items,
            customer_orders,
            transfers,
            work_orders,
            inventory,
            items,
            locations,
            categories,
            users
        RESTART IDENTITY CASCADE
    `)
}

/**
 * Inserts the minimum seed data needed for tests:
 * - 3 users (admin@erp.com, ops@erp.com, sales@erp.com)
 * - 2 locations
 * - 1 category
 * - 1 item
 * - 1 inventory row with known quantities
 */
export async function seedTestData() {
    const bcrypt = await import('bcryptjs')
    const { users, locations, categories, items, inventory } = await import('../src/models/index.js')

    const passwordHash = await bcrypt.default.hash('password123', 10)

    const [admin, ops, sales] = await db.insert(users).values([
        { name: 'Admin User', email: 'admin@erp.com', passwordHash, role: 'ADMIN' },
        { name: 'Operations User', email: 'ops@erp.com', passwordHash, role: 'OPERATIONS' },
        { name: 'Sales User', email: 'sales@erp.com', passwordHash, role: 'SALES' }
    ]).returning()

    const [mainLoc, branchLoc] = await db.insert(locations).values([
        { name: 'Test Main', code: 'TEST-MAIN' },
        { name: 'Test Branch', code: 'TEST-BRANCH' }
    ]).returning()

    const [cat] = await db.insert(categories).values([
        { name: 'Test Category' }
    ]).returning()

    const [item] = await db.insert(items).values([
        { sku: 'TEST-001', name: 'Test Item', categoryId: cat.id }
    ]).returning()

    // Inventory: 100 physical, 10 reserved → 90 available
    const [inv] = await db.insert(inventory).values([{
        itemId: item.id,
        locationId: mainLoc.id,
        batchNumber: 'TEST-BATCH',
        physicalQuantity: 100,
        reservedQuantity: 10
    }]).returning()

    return { admin, ops, sales, mainLoc, branchLoc, cat, item, inv }
}

/**
 * Restores full demo seed data after test execution finishes.
 */
export async function restoreDemoSeed() {
    await resetDatabase()
    await runSeed()
}
