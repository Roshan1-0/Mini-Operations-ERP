import { Navigate } from 'react-router-dom'
import { useAuth } from '../../Features/Auth/AuthContext.jsx'
import LoadingState from './LoadingState.jsx'

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth()

    if (loading) {
        return <LoadingState message="Checking authentication..." />
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/inventory" replace />
    }

    return children
}
