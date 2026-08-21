import {
    getAllWorkOrders,
    getWorkOrderById,
    createWorkOrder,
    updateWorkOrderStatus,
    checkMaterialStock
} from '../services/workOrder.service.js'
import { sendSuccess } from '../utils/response.js'

export async function listWorkOrders(req, res, next) {
    try {
        const workOrders = await getAllWorkOrders()
        return sendSuccess(res, workOrders, 'Work orders fetched successfully.')
    } catch (error) {
        next(error)
    }
}

export async function getWorkOrder(req, res, next) {
    try {
        const workOrder = await getWorkOrderById(req.params.id)
        return sendSuccess(res, workOrder, 'Work order fetched.')
    } catch (error) {
        next(error)
    }
}

export async function createWorkOrderHandler(req, res, next) {
    try {
        const workOrder = await createWorkOrder(req.body, req.user.id)
        return sendSuccess(res, workOrder, 'Work order created successfully.', 201)
    } catch (error) {
        next(error)
    }
}

export async function updateStatus(req, res, next) {
    try {
        const updated = await updateWorkOrderStatus(req.params.id, req.body.status)
        return sendSuccess(res, updated, 'Work order status updated.')
    } catch (error) {
        next(error)
    }
}

export async function stockCheck(req, res, next) {
    try {
        const result = await checkMaterialStock(req.params.id)
        return sendSuccess(res, result, 'Stock check complete.')
    } catch (error) {
        next(error)
    }
}
