import 'dotenv/config'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { db } from '../src/config/db.config.js'
import { inventory, transfers } from '../src/models/index.js'
import { eq } from 'drizzle-orm'
import { resetDatabase, seedTestData } from './setup.js'

let adminCookie
let testData

async function createTransfer(overrides = {}) {
    return request(app)
        .post('/api/v1/transfers')
        .set('Cookie', adminCookie)
        .send({
            sourceLocationId: testData.mainLoc.id,
            destinationLocationId: testData.branchLoc.id,
            itemId: testData.item.id,
            quantity: 10,
            ...overrides
        })
}

describe('Transfer Tests', () => {
    beforeEach(async () => {
        await resetDatabase()
        testData = await seedTestData()

        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@erp.com', password: 'password123' })
        adminCookie = loginRes.headers['set-cookie']
    })

    // TEST 2: Cannot transfer more than available inventory
    it('TEST 2: Cannot dispatch transfer for more than available inventory', async () => {
        // Available = 90 (100 physical - 10 reserved)
        const createRes = await createTransfer({ quantity: 95 }) // Exceeds available
        expect(createRes.status).toBe(201) // Creating the request is allowed

        const transferId = createRes.body.data.id

        // Dispatch should fail — not enough available stock
        const dispatchRes = await request(app)
            .patch(`/api/v1/transfers/${transferId}/dispatch`)
            .set('Cookie', adminCookie)

        expect(dispatchRes.status).toBe(409)
        expect(dispatchRes.body.success).toBe(false)
        expect(dispatchRes.body.message).toContain('Insufficient')

        // Source inventory must be unchanged
        const [invRow] = await db.select().from(inventory).where(eq(inventory.id, testData.inv.id))
        expect(invRow.physicalQuantity).toBe(100) // Unchanged
    })

    // TEST 3: Destination stock changes only after receipt
    it('TEST 3: Destination stock is unchanged after dispatch, increases after receipt', async () => {
        // Get initial destination inventory (does not exist yet)
        const initialDestInventory = await db.select()
            .from(inventory)
            .where(eq(inventory.locationId, testData.branchLoc.id))

        const initialDestQty = initialDestInventory.reduce((sum, row) =>
            sum + row.physicalQuantity, 0)

        // Create and dispatch a transfer for 20 units
        const createRes = await createTransfer({ quantity: 20 })
        const transferId = createRes.body.data.id

        const dispatchRes = await request(app)
            .patch(`/api/v1/transfers/${transferId}/dispatch`)
            .set('Cookie', adminCookie)
        expect(dispatchRes.status).toBe(200)

        // After dispatch: source decreases, destination UNCHANGED
        const [srcAfterDispatch] = await db.select()
            .from(inventory)
            .where(eq(inventory.id, testData.inv.id))
        expect(srcAfterDispatch.physicalQuantity).toBe(80) // 100 - 20

        const destAfterDispatch = await db.select()
            .from(inventory)
            .where(eq(inventory.locationId, testData.branchLoc.id))
        const destQtyAfterDispatch = destAfterDispatch.reduce((sum, row) =>
            sum + row.physicalQuantity, 0)
        expect(destQtyAfterDispatch).toBe(initialDestQty) // Unchanged!

        // Now receive the transfer
        const receiveRes = await request(app)
            .patch(`/api/v1/transfers/${transferId}/receive`)
            .set('Cookie', adminCookie)
        expect(receiveRes.status).toBe(200)

        // After receipt: destination increases
        const destAfterReceipt = await db.select()
            .from(inventory)
            .where(eq(inventory.locationId, testData.branchLoc.id))
        const destQtyAfterReceipt = destAfterReceipt.reduce((sum, row) =>
            sum + row.physicalQuantity, 0)
        expect(destQtyAfterReceipt).toBe(initialDestQty + 20) // Increased by 20
    })

    // TEST 4: Same transfer cannot be received twice
    it('TEST 4: Same transfer cannot be received twice', async () => {
        const createRes = await createTransfer({ quantity: 10 })
        const transferId = createRes.body.data.id

        // Dispatch it
        await request(app)
            .patch(`/api/v1/transfers/${transferId}/dispatch`)
            .set('Cookie', adminCookie)

        // First receipt — should succeed
        const firstReceive = await request(app)
            .patch(`/api/v1/transfers/${transferId}/receive`)
            .set('Cookie', adminCookie)
        expect(firstReceive.status).toBe(200)

        // Get destination stock after first receipt
        const destAfterFirst = await db.select()
            .from(inventory)
            .where(eq(inventory.locationId, testData.branchLoc.id))
        const destQtyAfterFirst = destAfterFirst.reduce((sum, row) =>
            sum + row.physicalQuantity, 0)

        // Second receipt — must fail with 409
        const secondReceive = await request(app)
            .patch(`/api/v1/transfers/${transferId}/receive`)
            .set('Cookie', adminCookie)
        expect(secondReceive.status).toBe(409)
        expect(secondReceive.body.message).toContain('already been received')

        // Destination stock must NOT have increased again
        const destAfterSecond = await db.select()
            .from(inventory)
            .where(eq(inventory.locationId, testData.branchLoc.id))
        const destQtyAfterSecond = destAfterSecond.reduce((sum, row) =>
            sum + row.physicalQuantity, 0)
        expect(destQtyAfterSecond).toBe(destQtyAfterFirst) // Unchanged from after first receipt
    })
})
