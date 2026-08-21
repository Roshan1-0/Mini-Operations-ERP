/**
 * Format a date string to a readable local format.
 */
export function formatDate(dateString) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

/**
 * Format a datetime string to readable local format with time.
 */
export function formatDateTime(dateString) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * Returns a CSS class name for a given status value.
 */
export function getStatusClass(status) {
    const map = {
        ASSIGNED: 'badge--blue',
        IN_PROGRESS: 'badge--amber',
        COMPLETED: 'badge--green',
        REQUESTED: 'badge--gray',
        DISPATCHED: 'badge--blue',
        RECEIVED: 'badge--green',
        PENDING: 'badge--gray',
        RESERVED: 'badge--blue',
        CANCELLED: 'badge--red'
    }
    return map[status] || 'badge--gray'
}

/**
 * Format status for display (replaces underscores with spaces, title cases).
 */
export function formatStatus(status) {
    if (!status) return '—'
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Returns the axios error message from a failed request.
 */
export function getApiError(error) {
    return error?.response?.data?.message || 'An unexpected error occurred.'
}
