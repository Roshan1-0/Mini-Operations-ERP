import { z } from 'zod'

export const createTransferSchema = z.object({
    sourceLocationId: z.string().uuid('Invalid source location ID'),
    destinationLocationId: z.string().uuid('Invalid destination location ID'),
    itemId: z.string().uuid('Invalid item ID'),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive')
}).refine(
    data => data.sourceLocationId !== data.destinationLocationId,
    { message: 'Source and destination locations must be different', path: ['destinationLocationId'] }
)
