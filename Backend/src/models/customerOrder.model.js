import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './user.model.js'

export const orderStatusEnum = pgEnum('order_status', [
    'PENDING',
    'RESERVED',
    'COMPLETED',
    'CANCELLED'
])

export const customerOrders = pgTable('customer_orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    customerName: varchar('customer_name', { length: 200 }).notNull(),
    status: orderStatusEnum('status').notNull().default('PENDING'),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
})
