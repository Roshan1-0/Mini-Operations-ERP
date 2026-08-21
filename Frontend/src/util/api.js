import axios from 'axios'

// Single Axios instance used across the entire application.
// withCredentials: true ensures the HTTP-only JWT cookie is sent with every request.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
    withCredentials: true
})

export default api
