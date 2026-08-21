import { registerUser, loginUser, getCurrentUser } from '../services/auth.service.js'
import { sendSuccess } from '../utils/response.js'

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}

export async function register(req, res, next) {
    try {
        const user = await registerUser(req.body)
        return sendSuccess(res, user, 'User registered successfully.', 201)
    } catch (error) {
        next(error)
    }
}

export async function login(req, res, next) {
    try {
        const { token, user } = await loginUser(req.body)

        // Store JWT in HTTP-only cookie — never exposed to JavaScript
        res.cookie('token', token, COOKIE_OPTIONS)

        return sendSuccess(res, { ...user, token }, 'Logged in successfully.')
    } catch (error) {
        next(error)
    }
}

export async function logout(req, res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    })
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
    })
}

export async function getMe(req, res, next) {
    try {
        const user = await getCurrentUser(req.user.id)
        return sendSuccess(res, user, 'User fetched successfully.')
    } catch (error) {
        next(error)
    }
}
