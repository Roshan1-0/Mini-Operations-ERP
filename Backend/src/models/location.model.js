import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const locations = pgTable('locations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow()
})
