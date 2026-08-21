import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { categories } from './category.model.js'

export const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    categoryId: uuid('category_id').notNull().references(() => categories.id),
    createdAt: timestamp('created_at').notNull().defaultNow()
})
