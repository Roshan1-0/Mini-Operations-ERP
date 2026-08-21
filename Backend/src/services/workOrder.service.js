import { eq, sql, and, ne } from 'drizzle-orm'
import { db } from '../config/db.config.js'
import { workOrders, inventory, items, locations, users } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

// Valid status transitions for work orders
const VALID_TRANSITIONS = {
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: []
}

/**
 * Returns all work orders with joined item, location, and user details.
 */
export async function getAllWorkOrders() {
    const assignedUser = {
        id: users.id,
        name: users.name
    }

    const rows = await db
        .select({
            id: workOrders.id,
            workOrderNumber: workOrders.workOrderNumber,
            locationId: workOrders.locationId,
            locationName: locations.name,
            itemId: workOrders.itemId,
            itemName: items.name,
            itemSku: items.sku,
            requiredQuantity: workOrders.requiredQuantity,
            assignedUserId: workOrders.assignedUserId,
            status: workOrders.status,
            createdAt: workOrders.createdAt,
            updatedAt: workOrders.updatedAt
        })
        .from(workOrders)
        .innerJoin(locations, eq(workOrders.locationId, locations.id))
        .innerJoin(items, eq(workOrders.itemId, items.id))
        .orderBy(sql`${workOrders.createdAt} DESC`)

    return rows
}

/**
 * Returns a single work order by ID.
 */
export async function getWorkOrderById(workOrderId) {
    const [row] = await db
        .select({
            id: workOrders.id,
            workOrderNumber: workOrders.workOrderNumber,
            locationId: workOrders.locationId,
            locationName: locations.name,
            itemId: workOrders.itemId,
            itemName: items.name,
            itemSku: items.sku,
            requiredQuantity: workOrders.requiredQuantity,
            assignedUserId: workOrders.assignedUserId,
            status: workOrders.status,
            createdAt: workOrders.createdAt
        })
        .from(workOrders)
        .innerJoin(locations, eq(workOrders.locationId, locations.id))
        .innerJoin(items, eq(workOrders.itemId, items.id))
        .where(eq(workOrders.id, workOrderId))
        .limit(1)

    if (!row) {
        throw new AppError('Work order not found.', 404)
    }

    return row
}

/**
 * Generates a sequential work order number: WO-YYYYMMDD-XXXX
 */
async function generateWorkOrderNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await db.select({ count: sql`COUNT(*)` }).from(workOrders)
    const seq = String(Number(count[0].count) + 1).padStart(4, '0')
    return `WO-${dateStr}-${seq}`
}

/**
 * Creates a new work order. Only Admin can create work orders.
 */
export async function createWorkOrder(data, createdBy) {
    const workOrderNumber = await generateWorkOrderNumber()

    const [created] = await db.insert(workOrders).values({
        ...data,
        workOrderNumber,
        createdBy
    }).returning()

    return created
}

/**
 * Updates work order status, validating the transition is allowed.
 * Work orders can only move forward: ASSIGNED → IN_PROGRESS → COMPLETED
 */
export async function updateWorkOrderStatus(workOrderId, newStatus) {
    const [existing] = await db
        .select({ id: workOrders.id, status: workOrders.status })
        .from(workOrders)
        .where(eq(workOrders.id, workOrderId))
        .limit(1)

    if (!existing) {
        throw new AppError('Work order not found.', 404)
    }

    const allowedNext = VALID_TRANSITIONS[existing.status]

    if (!allowedNext.includes(newStatus)) {
        throw new AppError(
            `Cannot change work order status from ${existing.status} to ${newStatus}.`,
            400
        )
    }

    const [updated] = await db
        .update(workOrders)
        .set({ status: newStatus, updatedAt: sql`NOW()` })
        .where(eq(workOrders.id, workOrderId))
        .returning()

    return updated
}

/**
 * Checks material availability for a work order.
 * Calculates the shortage at the work order's location
 * and finds alternate locations that have stock.
 */
export async function checkMaterialStock(workOrderId) {
    const workOrder = await getWorkOrderById(workOrderId)

    // Find inventory for this item at this work order's location
    const [inventoryAtLocation] = await db
        .select({
            id: inventory.id,
            physicalQuantity: inventory.physicalQuantity,
            reservedQuantity: inventory.reservedQuantity
        })
        .from(inventory)
        .where(
            and(
                eq(inventory.itemId, workOrder.itemId),
                eq(inventory.locationId, workOrder.locationId)
            )
        )
        .limit(1)

    const availableAtLocation = inventoryAtLocation
        ? inventoryAtLocation.physicalQuantity - inventoryAtLocation.reservedQuantity
        : 0

    const shortage = Math.max(workOrder.requiredQuantity - availableAtLocation, 0)

    // If there's a shortage, find other locations that have stock of this item
    let alternateLocations = []
    if (shortage > 0) {
        alternateLocations = await db
            .select({
                locationId: inventory.locationId,
                locationName: locations.name,
                availableQuantity: sql`${inventory.physicalQuantity} - ${inventory.reservedQuantity}`
            })
            .from(inventory)
            .innerJoin(locations, eq(inventory.locationId, locations.id))
            .where(
                and(
                    eq(inventory.itemId, workOrder.itemId),
                    ne(inventory.locationId, workOrder.locationId)
                )
            )
    }

    return {
        workOrder,
        requiredQuantity: workOrder.requiredQuantity,
        availableQuantity: availableAtLocation,
        shortage,
        isFullyAvailable: shortage === 0,
        alternateLocations
    }
}
