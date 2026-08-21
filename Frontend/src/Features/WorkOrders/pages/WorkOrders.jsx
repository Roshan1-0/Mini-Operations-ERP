import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { getWorkOrders, createWorkOrder, updateWorkOrderStatus, checkMaterialStock } from '../workOrder.api.js'
import { getInventoryMeta } from '../../Inventory/inventory.api.js'
import { useAuth } from '../../Auth/AuthContext.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import Badge from '../../../components/common/Badge.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import ErrorState from '../../../components/common/ErrorState.jsx'
import EmptyState from '../../../components/common/EmptyState.jsx'
import Modal from '../../../components/common/Modal.jsx'
import { getApiError, formatDate } from '../../../util/helpers.js'
import styles from './WorkOrders.module.scss'

const STATUS_NEXT = { ASSIGNED: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED' }
const STATUS_LABEL = { ASSIGNED: 'Start Progress', IN_PROGRESS: 'Mark Complete' }

export default function WorkOrders() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'
    const canUpdateStatus = ['ADMIN', 'OPERATIONS'].includes(user?.role)

    const [workOrders, setWorkOrders] = useState([])
    const [meta, setMeta] = useState({ items: [], locations: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selected, setSelected] = useState(null)
    const [stockCheck, setStockCheck] = useState(null)
    const [stockLoading, setStockLoading] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [formError, setFormError] = useState('')
    const [formLoading, setFormLoading] = useState(false)
    const [form, setForm] = useState({ locationId: '', itemId: '', requiredQuantity: '', assignedUserId: '' })

    async function loadData() {
        try {
            setLoading(true)
            setError('')
            const [woRes, metaRes] = await Promise.all([getWorkOrders(), getInventoryMeta()])
            setWorkOrders(woRes.data)
            setMeta(metaRes.data)
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    async function handleSelect(wo) {
        setSelected(wo)
        setStockCheck(null)
        setStockLoading(true)
        try {
            const res = await checkMaterialStock(wo.id)
            setStockCheck(res.data)
        } catch {}
        finally { setStockLoading(false) }
    }

    async function handleStatusUpdate(woId, newStatus) {
        try {
            await updateWorkOrderStatus(woId, newStatus)
            await loadData()
            if (selected?.id === woId) {
                const updatedWo = workOrders.find(w => w.id === woId)
                if (updatedWo) setSelected({ ...updatedWo, status: newStatus })
            }
        } catch (err) {
            alert(getApiError(err))
        }
    }

    async function handleCreate(e) {
        e.preventDefault()
        setFormError('')
        setFormLoading(true)
        try {
            await createWorkOrder({
                ...form,
                requiredQuantity: parseInt(form.requiredQuantity)
            })
            setShowCreate(false)
            setForm({ locationId: '', itemId: '', requiredQuantity: '', assignedUserId: '' })
            await loadData()
        } catch (err) {
            setFormError(getApiError(err))
        } finally {
            setFormLoading(false)
        }
    }

    if (loading) return <LoadingState message="Loading work orders..." />
    if (error) return <ErrorState message={error} onRetry={loadData} />

    return (
        <div className={styles.page}>
            <div className={styles.content}>
                {/* Left: list */}
                <div className={styles.listPanel}>
                    <PageHeader
                        title="Work Orders"
                        subtitle="Create and track operational work and required materials."
                        action={isAdmin && (
                            <button className={styles.primaryBtn} onClick={() => setShowCreate(true)}>
                                <Plus size={16} /> Create Work Order
                            </button>
                        )}
                    />

                    {workOrders.length === 0 ? (
                        <EmptyState title="No work orders found." />
                    ) : (
                        <div className={styles.tableCard}>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>WORK ORDER ID</th>
                                            <th>ITEM</th>
                                            <th>LOCATION</th>
                                            <th>REQ QTY</th>
                                            <th>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workOrders.map(wo => (
                                            <tr
                                                key={wo.id}
                                                className={`${styles.row} ${selected?.id === wo.id ? styles.selectedRow : ''}`}
                                                onClick={() => handleSelect(wo)}
                                            >
                                                <td className={styles.woNumber}>{wo.workOrderNumber}</td>
                                                <td>{wo.itemName}</td>
                                                <td>{wo.locationName}</td>
                                                <td>{wo.requiredQuantity}</td>
                                                <td><Badge status={wo.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: detail panel */}
                {selected && (
                    <div className={styles.detailPanel}>
                        <div className={styles.detailHeader}>
                            <div>
                                <h2 className={styles.detailTitle}>{selected.workOrderNumber}</h2>
                                <Badge status={selected.status} />
                            </div>
                            <button className={styles.closeBtn} onClick={() => setSelected(null)}><X size={18} /></button>
                        </div>

                        <div className={styles.detailSection}>
                            <h3 className={styles.sectionTitle}>WORK ORDER INFO</h3>
                            <div className={styles.infoGrid}>
                                <div><span className={styles.infoLabel}>Item</span><span>{selected.itemName}</span></div>
                                <div><span className={styles.infoLabel}>Location</span><span>{selected.locationName}</span></div>
                                <div><span className={styles.infoLabel}>Required Qty</span><span>{selected.requiredQuantity}</span></div>
                                <div><span className={styles.infoLabel}>Created</span><span>{formatDate(selected.createdAt)}</span></div>
                            </div>
                        </div>

                        <div className={styles.detailSection}>
                            <h3 className={styles.sectionTitle}>MATERIAL STOCK CHECK</h3>
                            {stockLoading ? (
                                <p className={styles.checking}>Checking stock...</p>
                            ) : stockCheck ? (
                                <>
                                    <div className={styles.stockGrid}>
                                        <div className={styles.stockItem}>
                                            <span className={styles.stockValue}>{stockCheck.requiredQuantity}</span>
                                            <span className={styles.stockLabel}>Required</span>
                                        </div>
                                        <div className={styles.stockItem}>
                                            <span className={`${styles.stockValue} ${styles.available}`}>{stockCheck.availableQuantity}</span>
                                            <span className={styles.stockLabel}>Available</span>
                                        </div>
                                        <div className={styles.stockItem}>
                                            <span className={`${styles.stockValue} ${stockCheck.shortage > 0 ? styles.shortage : styles.ok}`}>{stockCheck.shortage}</span>
                                            <span className={styles.stockLabel}>Shortage</span>
                                        </div>
                                    </div>
                                    {stockCheck.shortage > 0 && (
                                        <div className={styles.shortageAlert}>
                                            <strong>⚠ Material Deficit Detected</strong>
                                            <p>{stockCheck.shortage} units are required from another location.</p>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        {canUpdateStatus && STATUS_NEXT[selected.status] && (
                            <div className={styles.detailActions}>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={() => handleStatusUpdate(selected.id, STATUS_NEXT[selected.status])}
                                >
                                    {STATUS_LABEL[selected.status]}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <Modal title="Create Work Order" onClose={() => setShowCreate(false)}
                    footer={
                        <>
                            <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className={styles.primaryBtn} form="wo-form" type="submit" disabled={formLoading}>
                                {formLoading ? 'Creating...' : 'Create Work Order'}
                            </button>
                        </>
                    }
                >
                    <form id="wo-form" onSubmit={handleCreate} className={styles.form}>
                        <div className={styles.field}>
                            <label>Location *</label>
                            <select required value={form.locationId} onChange={e => setForm(f => ({...f, locationId: e.target.value}))} className={styles.formSelect}>
                                <option value="">Select location</option>
                                {meta.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Item *</label>
                            <select required value={form.itemId} onChange={e => setForm(f => ({...f, itemId: e.target.value}))} className={styles.formSelect}>
                                <option value="">Select item</option>
                                {meta.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Required Quantity *</label>
                            <input type="number" required min="1" value={form.requiredQuantity} onChange={e => setForm(f => ({...f, requiredQuantity: e.target.value}))} className={styles.formInput} />
                        </div>
                        {formError && <div className={styles.formError}>{formError}</div>}
                    </form>
                </Modal>
            )}
        </div>
    )
}
