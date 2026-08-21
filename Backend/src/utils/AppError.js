/**
 * Custom application error class.
 * Allows controllers and services to throw errors with a specific
 * HTTP status code rather than always returning 500.
 */
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}
