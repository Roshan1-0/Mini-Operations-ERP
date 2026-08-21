import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { locations } from './location.model.js'
import { items } from './item.model.js'
import { users } from './user.model.js'

export const workOrderStatusEnum = pgEnum('work_order_status', [
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED'
])

export const workOrders = pgTable('work_orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderNumber: varchar('work_order_number', { length: 50 }).notNull().unique(),
    locationId: uuid('location_id').notNull().references(() => locations.id),
    itemId: uuid('item_id').notNull().references(() => items.id),
    requiredQuantity: integer('required_quantity').notNull(),
    assignedUserId: uuid('assigned_user_id').references(() => users.id),
    status: workOrderStatusEnum('status').notNull().default('ASSIGNED'),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
})
