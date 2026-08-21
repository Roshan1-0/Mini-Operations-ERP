import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getOrders, createOrder, reserveStock, cancelOrder } from '../order.api.js'
import { getInventoryMeta } from '../../Inventory/inventory.api.js'
import { useAuth } from '../../Auth/AuthContext.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import Badge from '../../../components/common/Badge.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import ErrorState from '../../../components/common/ErrorState.jsx'
import EmptyState from '../../../components/common/EmptyState.jsx'
import Modal from '../../../components/common/Modal.jsx'
import ConfirmDialog from '../../../components/common/ConfirmDialog.jsx'
import { getApiError, formatDate } from '../../../util/helpers.js'
import styles from './CustomerOrders.module.scss'

export default function CustomerOrders() {
    const { user } = useAuth()
    const canCreate = ['ADMIN', 'SALES'].includes(user?.role)

    const [orders, setOrders] = useState([])
    const [meta, setMeta] = useState({ items: [], locations: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [confirmCancel, setConfirmCancel] = useState(null)
    const [actionError, setActionError] = useState('')
    const [form, setForm] = useState({ customerName: '', items: [{ itemId: '', locationId: '', quantity: '' }] })
    const [formError, setFormError] = useState('')
    const [formLoading, setFormLoading] = useState(false)

    async function loadData() {
        try {
            setLoading(true)
            setError('')
            const [oRes, mRes] = await Promise.all([getOrders(), getInventoryMeta()])
            setOrders(oRes.data)
            setMeta(mRes.data)
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    async function handleCreate(e) {
        e.preventDefault()
        setFormError('')
        setFormLoading(true)
        try {
            await createOrder({
                customerName: form.customerName,
                items: form.items.map(i => ({ ...i, quantity: parseInt(i.quantity) }))
            })
            setShowCreate(false)
            setForm({ customerName: '', items: [{ itemId: '', locationId: '', quantity: '' }] })
            await loadData()
        } catch (err) {
            setFormError(getApiError(err))
        } finally {
            setFormLoading(false)
        }
    }

    async function handleReserve(orderId) {
        setActionError('')
        try {
            await reserveStock(orderId)
            await loadData()
        } catch (err) {
            setActionError(getApiError(err))
        }
    }

    async function handleCancel() {
        setActionError('')
        try {
            await cancelOrder(confirmCancel)
            setConfirmCancel(null)
            await loadData()
        } catch (err) {
            setActionError(getApiError(err))
            setConfirmCancel(null)
        }
    }

    function updateItem(index, field, value) {
        setForm(f => {
            const newItems = [...f.items]
            newItems[index] = { ...newItems[index], [field]: value }
            return { ...f, items: newItems }
        })
    }

    if (loading) return <LoadingState message="Loading customer orders..." />
    if (error) return <ErrorState message={error} onRetry={loadData} />

    return (
        <div className={styles.page}>
            <PageHeader
                title="Customer Orders"
                subtitle="Create orders and reserve available inventory."
                action={canCreate && (
                    <button className={styles.primaryBtn} onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Create Customer Order
                    </button>
                )}
            />

            {actionError && <div className={styles.actionError}>{actionError}</div>}

            <div className={styles.tableCard}>
                {orders.length === 0 ? (
                    <EmptyState title="No customer orders found." />
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ORDER ID</th>
                                    <th>CUSTOMER</th>
                                    <th>ITEMS</th>
                                    <th>STATUS</th>
                                    <th>CREATED</th>
                                    {canCreate && <th>ACTIONS</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id}>
                                        <td className={styles.ordNumber}>{order.orderNumber}</td>
                                        <td>{order.customerName}</td>
                                        <td>
                                            {order.items?.map(item => (
                                                <div key={item.id} className={styles.orderItem}>
                                                    <span>{item.itemName}</span>
                                                    <span className={styles.qty}>Qty: {item.quantity}</span>
                                                    {item.reservedQuantity > 0 && (
                                                        <span className={styles.reserved}>Reserved: {item.reservedQuantity}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </td>
                                        <td><Badge status={order.status} /></td>
                                        <td>{formatDate(order.createdAt)}</td>
                                        {canCreate && (
                                            <td className={styles.actions}>
                                                {order.status === 'PENDING' && (
                                                    <button className={styles.reserveBtn} onClick={() => handleReserve(order.id)}>
                                                        Reserve Stock
                                                    </button>
                                                )}
                                                {['PENDING', 'RESERVED'].includes(order.status) && (
                                                    <button className={styles.cancelBtn2} onClick={() => setConfirmCancel(order.id)}>
                                                        Cancel
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Order Modal */}
            {showCreate && (
                <Modal title="Create Customer Order" onClose={() => setShowCreate(false)}
                    footer={
                        <>
                            <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className={styles.primaryBtn} form="order-form" type="submit" disabled={formLoading}>
                                {formLoading ? 'Creating...' : 'Create Order'}
                            </button>
                        </>
                    }
                >
                    <form id="order-form" onSubmit={handleCreate} className={styles.form}>
                        <div className={styles.field}>
                            <label>Customer Name *</label>
                            <input type="text" required value={form.customerName} onChange={e => setForm(f => ({...f, customerName: e.target.value}))} placeholder="Company or customer name" className={styles.formInput} />
                        </div>

                        <div className={styles.itemsSection}>
                            <label className={styles.itemsLabel}>Order Items</label>
                            {form.items.map((item, idx) => (
                                <div key={idx} className={styles.itemRow}>
                                    <select required value={item.itemId} onChange={e => updateItem(idx, 'itemId', e.target.value)} className={styles.formSelect}>
                                        <option value="">Select item</option>
                                        {meta.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                    <select required value={item.locationId} onChange={e => updateItem(idx, 'locationId', e.target.value)} className={styles.formSelect}>
                                        <option value="">Location</option>
                                        {meta.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    <input type="number" required min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className={styles.qtyInput} />
                                </div>
                            ))}
                        </div>

                        {formError && (
                            <div className={styles.formError}>
                                {formError.includes('Insufficient') && <strong>⚠ Not enough available stock. </strong>}
                                {formError}
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            {/* Cancel Confirm */}
            {confirmCancel && (
                <ConfirmDialog
                    message="Cancel this order? Any reserved stock will be released."
                    confirmLabel="Cancel Order"
                    danger
                    onConfirm={handleCancel}
                    onCancel={() => setConfirmCancel(null)}
                />
            )}
        </div>
    )
}
