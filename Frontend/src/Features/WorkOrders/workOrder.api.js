import api from '../../util/api.js'

export async function getWorkOrders() {
    const response = await api.get('/work-orders')
    return response.data
}

export async function getWorkOrderById(id) {
    const response = await api.get(`/work-orders/${id}`)
    return response.data
}

export async function createWorkOrder(data) {
    const response = await api.post('/work-orders', data)
    return response.data
}

export async function updateWorkOrderStatus(id, status) {
    const response = await api.patch(`/work-orders/${id}/status`, { status })
    return response.data
}

export async function checkMaterialStock(id) {
    const response = await api.get(`/work-orders/${id}/stock-check`)
    return response.data
}
