import jwt from 'jsonwebtoken'

/**
 * Reads the JWT from the HTTP-only cookie (or Authorization header)
 * and attaches the decoded user payload ({ id, role }) to req.user.
 * Returns 401 if no token is present or if the token is invalid.
 */
export async function authUser(req, res, next) {
    let token = req.cookies?.token

    // Fallback: Authorization: Bearer <token> header support for API testing
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        })
    }
}
