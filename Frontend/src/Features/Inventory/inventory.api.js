import api from '../../util/api.js'

export async function getInventory() {
    const response = await api.get('/inventory')
    return response.data
}

export async function getInventoryById(id) {
    const response = await api.get(`/inventory/${id}`)
    return response.data
}

export async function getInventoryMeta() {
    const response = await api.get('/inventory/meta')
    return response.data
}

export async function createInventory(data) {
    const response = await api.post('/inventory', data)
    return response.data
}

export async function adjustInventory(id, adjustment, reason) {
    const response = await api.patch(`/inventory/${id}/adjust`, { adjustment, reason })
    return response.data
}
