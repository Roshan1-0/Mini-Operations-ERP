import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../models/index.js'

const { Pool } = pg

// Neon (and most cloud PostgreSQL providers) require SSL.
// rejectUnauthorized: false is needed for the Neon pooler endpoint.
const isNeon = process.env.DATABASE_URL?.includes('neon.tech')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isNeon ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
})

const db = drizzle(pool, { schema })

export { db, pool }
