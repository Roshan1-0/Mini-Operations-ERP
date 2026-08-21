import api from '../../util/api.js'

export async function getOrders() {
    const response = await api.get('/orders')
    return response.data
}

export async function getOrderById(id) {
    const response = await api.get(`/orders/${id}`)
    return response.data
}

export async function createOrder(data) {
    const response = await api.post('/orders', data)
    return response.data
}

export async function reserveStock(id) {
    const response = await api.post(`/orders/${id}/reserve`)
    return response.data
}

export async function cancelOrder(id) {
    const response = await api.patch(`/orders/${id}/cancel`)
    return response.data
}
