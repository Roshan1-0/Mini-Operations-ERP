import api from '../../util/api.js'

export async function login({ email, password }) {
    const response = await api.post('/auth/login', { email, password })
    return response.data
}

export async function logout() {
    const response = await api.post('/auth/logout')
    return response.data
}

export async function getMe() {
    const response = await api.get('/auth/me')
    return response.data
}
