import { z } from 'zod'

export const createOrderSchema = z.object({
    customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
    items: z.array(z.object({
        itemId: z.string().uuid('Invalid item ID'),
        locationId: z.string().uuid('Invalid location ID'),
        quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive')
    })).min(1, 'Order must have at least one item')
})
