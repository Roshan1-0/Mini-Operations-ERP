import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { locations } from './location.model.js'
import { items } from './item.model.js'
import { users } from './user.model.js'

export const transferStatusEnum = pgEnum('transfer_status', [
    'REQUESTED',
    'DISPATCHED',
    'RECEIVED'
])

export const transfers = pgTable('transfers', {
    id: uuid('id').primaryKey().defaultRandom(),
    transferNumber: varchar('transfer_number', { length: 50 }).notNull().unique(),
    sourceLocationId: uuid('source_location_id').notNull().references(() => locations.id),
    destinationLocationId: uuid('destination_location_id').notNull().references(() => locations.id),
    itemId: uuid('item_id').notNull().references(() => items.id),
    quantity: integer('quantity').notNull(),
    status: transferStatusEnum('status').notNull().default('REQUESTED'),
    requestedBy: uuid('requested_by').notNull().references(() => users.id),
    dispatchedBy: uuid('dispatched_by').references(() => users.id),
    receivedBy: uuid('received_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    dispatchedAt: timestamp('dispatched_at'),
    receivedAt: timestamp('received_at')
})
