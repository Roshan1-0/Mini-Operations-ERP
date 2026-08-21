import {
    getAllOrders,
    getOrderById,
    createOrder,
    reserveStock,
    cancelOrder
} from '../services/customerOrder.service.js'
import { sendSuccess } from '../utils/response.js'

export async function listOrders(req, res, next) {
    try {
        const orders = await getAllOrders()
        return sendSuccess(res, orders, 'Orders fetched successfully.')
    } catch (error) {
        next(error)
    }
}

export async function getOrder(req, res, next) {
    try {
        const order = await getOrderById(req.params.id)
        return sendSuccess(res, order, 'Order fetched.')
    } catch (error) {
        next(error)
    }
}

export async function createOrderHandler(req, res, next) {
    try {
        const order = await createOrder(req.body, req.user.id)
        return sendSuccess(res, order, 'Order created successfully.', 201)
    } catch (error) {
        next(error)
    }
}

export async function reserve(req, res, next) {
    try {
        const order = await reserveStock(req.params.id, req.user.id)
        return sendSuccess(res, order, 'Stock reserved successfully.')
    } catch (error) {
        next(error)
    }
}

export async function cancel(req, res, next) {
    try {
        const order = await cancelOrder(req.params.id, req.user.id)
        return sendSuccess(res, order, 'Order cancelled and stock released.')
    } catch (error) {
        next(error)
    }
}
