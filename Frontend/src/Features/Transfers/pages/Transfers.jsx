import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getTransfers, createTransfer, dispatchTransfer, receiveTransfer } from '../transfer.api.js'
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
import styles from './Transfers.module.scss'

export default function Transfers() {
    const { user } = useAuth()
    const canManage = ['ADMIN', 'OPERATIONS'].includes(user?.role)

    const [transfers, setTransfers] = useState([])
    const [meta, setMeta] = useState({ items: [], locations: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [confirm, setConfirm] = useState(null) // { action, transferId, label }
    const [actionError, setActionError] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [form, setForm] = useState({ sourceLocationId: '', destinationLocationId: '', itemId: '', quantity: '' })
    const [formError, setFormError] = useState('')
    const [formLoading, setFormLoading] = useState(false)

    async function loadData() {
        try {
            setLoading(true)
            setError('')
            const [tRes, mRes] = await Promise.all([getTransfers(), getInventoryMeta()])
            setTransfers(tRes.data)
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
            await createTransfer({ ...form, quantity: parseInt(form.quantity) })
            setShowCreate(false)
            setForm({ sourceLocationId: '', destinationLocationId: '', itemId: '', quantity: '' })
            await loadData()
        } catch (err) {
            setFormError(getApiError(err))
        } finally {
            setFormLoading(false)
        }
    }

    async function handleConfirmedAction() {
        setActionLoading(true)
        setActionError('')
        try {
            if (confirm.action === 'dispatch') {
                await dispatchTransfer(confirm.transferId)
            } else {
                await receiveTransfer(confirm.transferId)
            }
            setConfirm(null)
            await loadData()
        } catch (err) {
            setActionError(getApiError(err))
            setConfirm(null)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return <LoadingState message="Loading transfers..." />
    if (error) return <ErrorState message={error} onRetry={loadData} />

    return (
        <div className={styles.page}>
            <PageHeader
                title="Internal Transfers"
                subtitle="Move inventory between company locations."
                action={canManage && (
                    <button className={styles.primaryBtn} onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Create Transfer
                    </button>
                )}
            />

            {actionError && (
                <div className={styles.actionError}>{actionError}</div>
            )}

            <div className={styles.tableCard}>
                {transfers.length === 0 ? (
                    <EmptyState title="No transfers found." />
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>TRANSFER ID</th>
                                    <th>SOURCE</th>
                                    <th>DESTINATION</th>
                                    <th>ITEM</th>
                                    <th>QTY</th>
                                    <th>STATUS</th>
                                    <th>CREATED</th>
                                    {canManage && <th>ACTIONS</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.map(t => (
                                    <tr key={t.id}>
                                        <td className={styles.trnNumber}>{t.transferNumber}</td>
                                        <td>{t.sourceLocationName}</td>
                                        <td>{t.destinationLocationName}</td>
                                        <td>{t.itemName}</td>
                                        <td>{t.quantity}</td>
                                        <td><Badge status={t.status} /></td>
                                        <td>{formatDate(t.createdAt)}</td>
                                        {canManage && (
                                            <td>
                                                {t.status === 'REQUESTED' && (
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => setConfirm({ action: 'dispatch', transferId: t.id, label: 'Dispatch this transfer?' })}
                                                    >
                                                        Dispatch
                                                    </button>
                                                )}
                                                {t.status === 'DISPATCHED' && (
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.receive}`}
                                                        onClick={() => setConfirm({ action: 'receive', transferId: t.id, label: 'Mark this transfer as received?' })}
                                                    >
                                                        Receive
                                                    </button>
                                                )}
                                                {t.status === 'RECEIVED' && (
                                                    <span className={styles.completedTag}>✓ Received</span>
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

            {/* Create Transfer Modal */}
            {showCreate && (
                <Modal title="Create Transfer" onClose={() => setShowCreate(false)}
                    footer={
                        <>
                            <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className={styles.primaryBtn} form="transfer-form" type="submit" disabled={formLoading}>
                                {formLoading ? 'Creating...' : 'Create Transfer'}
                            </button>
                        </>
                    }
                >
                    <form id="transfer-form" onSubmit={handleCreate} className={styles.form}>
                        <div className={styles.field}>
                            <label>Source Location *</label>
                            <select required value={form.sourceLocationId} onChange={e => setForm(f => ({...f, sourceLocationId: e.target.value}))} className={styles.formSelect}>
                                <option value="">Select source</option>
                                {meta.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Destination Location *</label>
                            <select required value={form.destinationLocationId} onChange={e => setForm(f => ({...f, destinationLocationId: e.target.value}))} className={styles.formSelect}>
                                <option value="">Select destination</option>
                                {meta.locations.filter(l => l.id !== form.sourceLocationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
                            <label>Quantity *</label>
                            <input type="number" required min="1" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} className={styles.formInput} />
                        </div>
                        {formError && <div className={styles.formError}>{formError}</div>}
                    </form>
                </Modal>
            )}

            {/* Confirmation Dialog */}
            {confirm && (
                <ConfirmDialog
                    message={confirm.label}
                    confirmLabel={confirm.action === 'dispatch' ? 'Dispatch' : 'Receive'}
                    onConfirm={handleConfirmedAction}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    )
}
