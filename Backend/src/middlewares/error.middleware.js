import { AppError } from '../utils/AppError.js'

/**
 * Centralized Express error handler.
 * All errors passed to next(error) land here.
 * Operational errors (AppError) return their message and status code.
 * Unexpected errors return a generic 500 to avoid leaking internals.
 */
export function errorHandler(err, req, res, next) {
    // Drizzle/Postgres unique constraint violation
    if (err.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'A record with that value already exists.'
        })
    }

    // Drizzle/Postgres foreign key violation
    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Referenced record does not exist.'
        })
    }

    // Drizzle/Postgres check constraint violation (e.g. negative quantity)
    if (err.code === '23514') {
        return res.status(400).json({
            success: false,
            message: 'Operation violates a data integrity constraint.'
        })
    }

    // Known operational error thrown deliberately by a service
    if (err instanceof AppError && err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
    }

    // Unknown error — log it and return a safe generic message
    console.error('Unexpected error:', err)

    return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again.'
    })
}
