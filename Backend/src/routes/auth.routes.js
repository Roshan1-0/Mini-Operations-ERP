import { Router } from 'express'
import { register, login, logout, getMe } from '../controllers/auth.controller.js'
import { authUser } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { loginSchema, registerSchema } from '../validators/auth.validator.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/logout', logout)
router.get('/me', authUser, getMe)

export default router
