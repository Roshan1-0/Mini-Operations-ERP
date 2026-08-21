import { Router } from 'express'
import { listInventory, getInventory, addInventory, adjustStock, getMeta } from '../controllers/inventory.controller.js'
import { authUser } from '../middlewares/auth.middleware.js'
import { allowRoles } from '../middlewares/role.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createInventorySchema, adjustInventorySchema } from '../validators/inventory.validator.js'

const router = Router()

// All inventory routes require authentication
router.use(authUser)

router.get('/', listInventory)
router.get('/meta', getMeta)
router.get('/:id', getInventory)
router.post('/', allowRoles('ADMIN', 'OPERATIONS'), validate(createInventorySchema), addInventory)
router.patch('/:id/adjust', allowRoles('ADMIN', 'OPERATIONS'), validate(adjustInventorySchema), adjustStock)

export default router
