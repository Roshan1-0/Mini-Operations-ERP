/**
 * Returns middleware that validates req.body against a Zod schema.
 * Returns 422 Unprocessable Entity if validation fails,
 * with a clear message describing the first failing field.
 */
export function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body)

        if (!result.success) {
            const firstError = result.error.errors[0]
            const field = firstError.path.join('.')
            const message = field
                ? `${field}: ${firstError.message}`
                : firstError.message

            return res.status(422).json({
                success: false,
                message
            })
        }

        // Replace req.body with the validated (and coerced) data
        req.body = result.data
        next()
    }
}
