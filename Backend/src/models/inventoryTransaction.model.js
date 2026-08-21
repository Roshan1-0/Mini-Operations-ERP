import { pgTable, uuid, integer, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { inventory } from './inventory.model.js'
import { users } from './user.model.js'

export const transactionTypeEnum = pgEnum('transaction_type', [
    'ADJUSTMENT',
    'TRANSFER_DISPATCH',
    'TRANSFER_RECEIPT',
    'RESERVATION',
    'RESERVATION_RELEASE'
])

export const inventoryTransactions = pgTable('inventory_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    inventoryId: uuid('inventory_id').notNull().references(() => inventory.id),
    transactionType: transactionTypeEnum('transaction_type').notNull(),
    // Positive = increase, Negative = decrease
    quantity: integer('quantity').notNull(),
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow()
})
