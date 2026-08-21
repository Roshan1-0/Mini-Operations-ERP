import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { config } from 'dotenv'

config()

const { Pool } = pg

async function runMigrations() {
    const isNeon = process.env.DATABASE_URL?.includes('neon.tech')
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isNeon ? { rejectUnauthorized: false } : false
    })
    const db = drizzle(pool)

    console.log('Running migrations...')
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Migrations complete.')

    await pool.end()
}

runMigrations().catch(console.error)
