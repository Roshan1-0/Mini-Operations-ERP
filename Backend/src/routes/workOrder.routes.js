import { Router } from 'express'
import {
    listWorkOrders,
    getWorkOrder,
    createWorkOrderHandler,
    updateStatus,
    stockCheck
} from '../controllers/workOrder.controller.js'
import { authUser } from '../middlewares/auth.middleware.js'
import { allowRoles } from '../middlewares/role.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createWorkOrderSchema, updateWorkOrderStatusSchema } from '../validators/workOrder.validator.js'

const router = Router()

router.use(authUser)

router.get('/', listWorkOrders)
router.get('/:id', getWorkOrder)
router.get('/:id/stock-check', stockCheck)
router.post('/', allowRoles('ADMIN'), validate(createWorkOrderSchema), createWorkOrderHandler)
router.patch('/:id/status', allowRoles('ADMIN', 'OPERATIONS'), validate(updateWorkOrderStatusSchema), updateStatus)

export default router
