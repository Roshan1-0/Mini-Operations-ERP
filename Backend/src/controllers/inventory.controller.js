import {
    getAllInventory,
    getInventoryById,
    createInventory,
    adjustInventory,
    getItemsAndLocations
} from '../services/inventory.service.js'
import { sendSuccess } from '../utils/response.js'

export async function listInventory(req, res, next) {
    try {
        const records = await getAllInventory()
        return sendSuccess(res, records, 'Inventory fetched successfully.')
    } catch (error) {
        next(error)
    }
}

export async function getInventory(req, res, next) {
    try {
        const record = await getInventoryById(req.params.id)
        return sendSuccess(res, record, 'Inventory record fetched.')
    } catch (error) {
        next(error)
    }
}

export async function addInventory(req, res, next) {
    try {
        const created = await createInventory(req.body)
        return sendSuccess(res, created, 'Inventory record created.', 201)
    } catch (error) {
        next(error)
    }
}

export async function adjustStock(req, res, next) {
    try {
        const updated = await adjustInventory(
            req.params.id,
            req.body.adjustment,
            req.user.id
        )
        return sendSuccess(res, updated, 'Inventory adjusted successfully.')
    } catch (error) {
        next(error)
    }
}

export async function getMeta(req, res, next) {
    try {
        const meta = await getItemsAndLocations()
        return sendSuccess(res, meta, 'Metadata fetched.')
    } catch (error) {
        next(error)
    }
}
