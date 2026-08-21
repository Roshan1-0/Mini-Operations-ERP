import { pgTable, uuid, integer } from 'drizzle-orm/pg-core'
import { customerOrders } from './customerOrder.model.js'
import { items } from './item.model.js'
import { locations } from './location.model.js'

export const customerOrderItems = pgTable('customer_order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => customerOrders.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => items.id),
    locationId: uuid('location_id').notNull().references(() => locations.id),
    quantity: integer('quantity').notNull(),
    reservedQuantity: integer('reserved_quantity').notNull().default(0)
})
