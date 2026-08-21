import api from '../../util/api.js'

export async function getTransfers() {
    const response = await api.get('/transfers')
    return response.data
}

export async function getTransferById(id) {
    const response = await api.get(`/transfers/${id}`)
    return response.data
}

export async function createTransfer(data) {
    const response = await api.post('/transfers', data)
    return response.data
}

export async function dispatchTransfer(id) {
    const response = await api.patch(`/transfers/${id}/dispatch`)
    return response.data
}

export async function receiveTransfer(id) {
    const response = await api.patch(`/transfers/${id}/receive`)
    return response.data
}
