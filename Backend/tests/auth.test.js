import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { resetDatabase, seedTestData } from './setup.js'

describe('Authentication Tests', () => {
    beforeEach(async () => {
        await resetDatabase()
        await seedTestData()
    })

    it('should login successfully with valid credentials', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@erp.com', password: 'password123' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.role).toBe('ADMIN')
        // Cookie should be set (HTTP-only)
        expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should reject login with wrong password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@erp.com', password: 'wrongpassword' })

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('should reject login with non-existent email', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'nobody@erp.com', password: 'password123' })

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('should return 401 when accessing protected route without token', async () => {
        const res = await request(app)
            .get('/api/v1/auth/me')

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('should return current user when authenticated', async () => {
        // Login to get cookie
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'ops@erp.com', password: 'password123' })

        const cookie = loginRes.headers['set-cookie']

        const res = await request(app)
            .get('/api/v1/auth/me')
            .set('Cookie', cookie)

        expect(res.status).toBe(200)
        expect(res.body.data.role).toBe('OPERATIONS')
    })

    // Test 5: Unauthorized operation
    it('TEST 5: Sales user cannot dispatch a transfer (403 Forbidden)', async () => {
        // Login as sales user
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'sales@erp.com', password: 'password123' })

        const cookie = loginRes.headers['set-cookie']

        // Attempt to dispatch a transfer — Sales role is not allowed
        const res = await request(app)
            .patch('/api/v1/transfers/some-transfer-id/dispatch')
            .set('Cookie', cookie)

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
    })

    it('TEST 5: Operations user cannot create a work order (403 Forbidden)', async () => {
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'ops@erp.com', password: 'password123' })

        const cookie = loginRes.headers['set-cookie']

        const res = await request(app)
            .post('/api/v1/work-orders')
            .set('Cookie', cookie)
            .send({ locationId: 'test', itemId: 'test', requiredQuantity: 10 })

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
    })
})
