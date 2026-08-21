import { Router } from 'express'
import {
    listTransfers,
    getTransfer,
    createTransferHandler,
    dispatch,
    receive
} from '../controllers/transfer.controller.js'
import { authUser } from '../middlewares/auth.middleware.js'
import { allowRoles } from '../middlewares/role.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createTransferSchema } from '../validators/transfer.validator.js'

const router = Router()

router.use(authUser)

router.get('/', listTransfers)
router.get('/:id', getTransfer)
router.post('/', allowRoles('ADMIN', 'OPERATIONS'), validate(createTransferSchema), createTransferHandler)
router.patch('/:id/dispatch', allowRoles('ADMIN', 'OPERATIONS'), dispatch)
router.patch('/:id/receive', allowRoles('ADMIN', 'OPERATIONS'), receive)

export default router
