import { z } from 'zod'

export const createWorkOrderSchema = z.object({
    locationId: z.string().uuid('Invalid location ID'),
    itemId: z.string().uuid('Invalid item ID'),
    requiredQuantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
    assignedUserId: z.string().uuid('Invalid user ID').optional()
})

export const updateWorkOrderStatusSchema = z.object({
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'], {
        errorMap: () => ({ message: 'Status must be ASSIGNED, IN_PROGRESS, or COMPLETED' })
    })
})
