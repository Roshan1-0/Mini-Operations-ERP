import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'

import authRoutes from './routes/auth.routes.js'
import inventoryRoutes from './routes/inventory.routes.js'
import workOrderRoutes from './routes/workOrder.routes.js'
import transferRoutes from './routes/transfer.routes.js'
import customerOrderRoutes from './routes/customerOrder.routes.js'
import { errorHandler } from './middlewares/error.middleware.js'

const app = express()

// Security headers
app.use(helmet())

// CORS — only allow the configured frontend origin
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true // Required for HTTP-only cookie to be sent
}))

// Parse JSON bodies
app.use(express.json())

// Parse cookies (needed to read the JWT token)
app.use(cookieParser())

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
}

// Health check
app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, message: 'Mini Operations ERP API is running.' })
})

// Feature routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/work-orders', workOrderRoutes)
app.use('/api/v1/transfers', transferRoutes)
app.use('/api/v1/orders', customerOrderRoutes)

// 404 handler — catches any routes that don't match above
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' })
})

// Centralized error handler — must be last middleware
app.use(errorHandler)

export default app
