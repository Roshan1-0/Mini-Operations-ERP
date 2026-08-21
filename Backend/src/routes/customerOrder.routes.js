import { Router } from 'express'
import {
    listOrders,
    getOrder,
    createOrderHandler,
    reserve,
    cancel
} from '../controllers/customerOrder.controller.js'
import { authUser } from '../middlewares/auth.middleware.js'
import { allowRoles } from '../middlewares/role.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createOrderSchema } from '../validators/order.validator.js'

const router = Router()

router.use(authUser)

router.get('/', listOrders)
router.get('/:id', getOrder)
router.post('/', allowRoles('ADMIN', 'SALES'), validate(createOrderSchema), createOrderHandler)
router.post('/:id/reserve', allowRoles('ADMIN', 'SALES'), reserve)
router.patch('/:id/cancel', allowRoles('ADMIN', 'SALES'), cancel)

export default router
