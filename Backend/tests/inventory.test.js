import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { resetDatabase, seedTestData } from './setup.js'

let cookie
let testData

describe('Inventory Tests', () => {
    beforeEach(async () => {
        await resetDatabase()
        testData = await seedTestData()

        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@erp.com', password: 'password123' })
        cookie = loginRes.headers['set-cookie']
    })

    it('should return all inventory with available quantity calculated', async () => {
        const res = await request(app)
            .get('/api/v1/inventory')
            .set('Cookie', cookie)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(Array.isArray(res.body.data)).toBe(true)

        const inv = res.body.data[0]
        // Available = physical - reserved (calculated by backend, not trusted from frontend)
        expect(inv.availableQuantity).toBe(inv.physicalQuantity - inv.reservedQuantity)
    })

    it('should correctly calculate availableQuantity = 90 (100 physical - 10 reserved)', async () => {
        const res = await request(app)
            .get('/api/v1/inventory')
            .set('Cookie', cookie)

        const inv = res.body.data.find(i => i.batchNumber === 'TEST-BATCH')
        expect(inv.physicalQuantity).toBe(100)
        expect(inv.reservedQuantity).toBe(10)
        expect(inv.availableQuantity).toBe(90)
    })

    it('should not allow creating inventory with negative quantity', async () => {
        const res = await request(app)
            .post('/api/v1/inventory')
            .set('Cookie', cookie)
            .send({
                itemId: testData.item.id,
                locationId: testData.mainLoc.id,
                batchNumber: 'NEG-TEST',
                physicalQuantity: -5 // Invalid!
            })

        expect(res.status).toBe(422)
        expect(res.body.success).toBe(false)
    })
})
