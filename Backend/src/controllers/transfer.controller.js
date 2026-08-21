import {
    getAllTransfers,
    getTransferById,
    createTransfer,
    dispatchTransfer,
    receiveTransfer
} from '../services/transfer.service.js'
import { sendSuccess } from '../utils/response.js'

export async function listTransfers(req, res, next) {
    try {
        const transferList = await getAllTransfers()
        return sendSuccess(res, transferList, 'Transfers fetched successfully.')
    } catch (error) {
        next(error)
    }
}

export async function getTransfer(req, res, next) {
    try {
        const transfer = await getTransferById(req.params.id)
        return sendSuccess(res, transfer, 'Transfer fetched.')
    } catch (error) {
        next(error)
    }
}

export async function createTransferHandler(req, res, next) {
    try {
        const transfer = await createTransfer(req.body, req.user.id)
        return sendSuccess(res, transfer, 'Transfer request created.', 201)
    } catch (error) {
        next(error)
    }
}

export async function dispatch(req, res, next) {
    try {
        const transfer = await dispatchTransfer(req.params.id, req.user.id)
        return sendSuccess(res, transfer, 'Transfer dispatched successfully.')
    } catch (error) {
        next(error)
    }
}

export async function receive(req, res, next) {
    try {
        const transfer = await receiveTransfer(req.params.id, req.user.id)
        return sendSuccess(res, transfer, 'Transfer received successfully.')
    } catch (error) {
        next(error)
    }
}
