import 'dotenv/config'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { db } from '../src/config/db.config.js'
import { inventory } from '../src/models/index.js'
import { eq } from 'drizzle-orm'
import app from '../src/app.js'
import { resetDatabase, seedTestData } from './setup.js'

let adminCookie
let salesCookie
let testData

async function createOrder(quantity = 10) {
    return request(app)
        .post('/api/v1/orders')
        .set('Cookie', adminCookie)
        .send({
            customerName: 'Test Customer',
            items: [{
                itemId: testData.item.id,
                locationId: testData.mainLoc.id,
                quantity
            }]
        })
}

describe('Customer Order Tests', () => {
    beforeEach(async () => {
        await resetDatabase()
        testData = await seedTestData()

        const adminLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@erp.com', password: 'password123' })
        adminCookie = adminLogin.headers['set-cookie']

        const salesLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'sales@erp.com', password: 'password123' })
        salesCookie = salesLogin.headers['set-cookie']
    })

    // TEST 1: Cannot reserve more than available inventory
    it('TEST 1: Cannot reserve more than available inventory', async () => {
        // Available = 90 (100 physical - 10 reserved)
        const createRes = await createOrder(95) // Requesting 95 — exceeds the 90 available
        expect(createRes.status).toBe(201)

        const orderId = createRes.body.data.id

        const reserveRes = await request(app)
            .post(`/api/v1/orders/${orderId}/reserve`)
            .set('Cookie', adminCookie)

        expect(reserveRes.status).toBe(409)
        expect(reserveRes.body.success).toBe(false)
        expect(reserveRes.body.message).toContain('Insufficient')

        // Inventory reserved_quantity must be unchanged
        const [invRow] = await db.select().from(inventory).where(eq(inventory.id, testData.inv.id))
        expect(invRow.reservedQuantity).toBe(10) // Still 10, not increased
    })

    it('should successfully reserve when sufficient stock exists', async () => {
        const createRes = await createOrder(50) // 50 <= 90 available
        const orderId = createRes.body.data.id

        const reserveRes = await request(app)
            .post(`/api/v1/orders/${orderId}/reserve`)
            .set('Cookie', adminCookie)

        expect(reserveRes.status).toBe(200)
        expect(reserveRes.body.data.status).toBe('RESERVED')

        // Inventory reserved_quantity should have increased by 50
        const [invRow] = await db.select().from(inventory).where(eq(inventory.id, testData.inv.id))
        expect(invRow.reservedQuantity).toBe(60) // 10 + 50
    })

    // Concurrent reservation test
    it('CONCURRENCY: Two simultaneous requests for last available stock — only one wins', async () => {
        // Available = 90. Two requests each want 80 (total 160 > 90, only one should win)
        const orderRes1 = await createOrder(80)
        const orderRes2 = await createOrder(80)

        const orderId1 = orderRes1.body.data.id
        const orderId2 = orderRes2.body.data.id

        // Fire both reservation requests at the same time
        const [result1, result2] = await Promise.all([
            request(app).post(`/api/v1/orders/${orderId1}/reserve`).set('Cookie', adminCookie),
            request(app).post(`/api/v1/orders/${orderId2}/reserve`).set('Cookie', adminCookie)
        ])

        const successes = [result1, result2].filter(r => r.status === 200)
        const failures = [result1, result2].filter(r => r.status === 409)

        // Exactly one should succeed, one should fail
        expect(successes.length).toBe(1)
        expect(failures.length).toBe(1)

        // Reserved quantity should reflect only the one successful reservation
        const [invRow] = await db.select().from(inventory).where(eq(inventory.id, testData.inv.id))
        expect(invRow.reservedQuantity).toBe(90) // 10 + 80 (from the single winning reservation)
    })

    it('should cancel an order and release reserved stock', async () => {
        const createRes = await createOrder(30)
        const orderId = createRes.body.data.id

        // Reserve it first
        await request(app).post(`/api/v1/orders/${orderId}/reserve`).set('Cookie', adminCookie)

        const [invBefore] = await db.select().from(inventory).where(eq(inventory.id, testData.inv.id))
        expect(invBefore.reservedQuantity).toBe(40) // 10 + 30

        // Now cancel
        const cancelRes = await request(app)
            .patch(`/api/v1/orders/${orderId}/cancel`)
            .set('Cookie', adminCookie)

        expect(cancelRes.status).toBe(200)
        expect(cancelRes.body.data.status).toBe('CANCELLED')

        // Reserved stock should be released
        const [invAfter] = await db.select().from(inventory).where(eq(inventory.id, testData.inv.id))
        expect(invAfter.reservedQuantity).toBe(10) // Back to original 10
    })
})
