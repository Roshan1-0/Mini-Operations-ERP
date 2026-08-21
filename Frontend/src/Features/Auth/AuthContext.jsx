import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from './auth.api.js'
import { logout as logoutApi } from './auth.api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // On mount, try to fetch the current user from the cookie
    useEffect(() => {
        getMe()
            .then(res => setUser(res.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    async function logout() {
        await logoutApi()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
