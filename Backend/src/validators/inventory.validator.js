import { z } from 'zod'

export const createInventorySchema = z.object({
    itemId: z.string().uuid('Invalid item ID'),
    locationId: z.string().uuid('Invalid location ID'),
    batchNumber: z.string().min(1).max(50).optional().default('DEFAULT'),
    physicalQuantity: z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative')
})

export const adjustInventorySchema = z.object({
    adjustment: z.number().int('Adjustment must be an integer').refine(n => n !== 0, 'Adjustment cannot be zero'),
    reason: z.string().min(1).max(500).optional()
})
