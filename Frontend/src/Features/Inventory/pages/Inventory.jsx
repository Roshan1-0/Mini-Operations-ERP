import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getInventory, getInventoryMeta, createInventory, adjustInventory } from '../inventory.api.js'
import { useAuth } from '../../Auth/AuthContext.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import StatCard from '../../../components/common/StatCard.jsx'
import Badge from '../../../components/common/Badge.jsx'
import LoadingState from '../../../components/common/LoadingState.jsx'
import ErrorState from '../../../components/common/ErrorState.jsx'
import EmptyState from '../../../components/common/EmptyState.jsx'
import Modal from '../../../components/common/Modal.jsx'
import { getApiError } from '../../../util/helpers.js'
import styles from './Inventory.module.scss'

export default function Inventory() {
    const { user } = useAuth()
    const canManage = ['ADMIN', 'OPERATIONS'].includes(user?.role)

    const [inventory, setInventory] = useState([])
    const [meta, setMeta] = useState({ items: [], locations: [], categories: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterLocation, setFilterLocation] = useState('')
    const [showLowStock, setShowLowStock] = useState(false)

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false)
    const [showAdjustModal, setShowAdjustModal] = useState(null) // inventory row
    const [formError, setFormError] = useState('')
    const [formLoading, setFormLoading] = useState(false)

    // Add form
    const [addForm, setAddForm] = useState({ itemId: '', locationId: '', batchNumber: '', physicalQuantity: '' })
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')

    async function loadData() {
        try {
            setLoading(true)
            setError('')
            const [invRes, metaRes] = await Promise.all([getInventory(), getInventoryMeta()])
            setInventory(invRes.data)
            setMeta(metaRes.data)
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const filtered = inventory.filter(row => {
        const matchSearch = !search ||
            row.itemName?.toLowerCase().includes(search.toLowerCase()) ||
            row.sku?.toLowerCase().includes(search.toLowerCase())
        const matchCategory = !filterCategory || row.categoryName === filterCategory
        const matchLocation = !filterLocation || row.locationId === filterLocation
        const matchLowStock = !showLowStock || row.availableQuantity <= 10
        return matchSearch && matchCategory && matchLocation && matchLowStock
    })

    const totalPhysical = inventory.reduce((s, r) => s + r.physicalQuantity, 0)
    const totalReserved = inventory.reduce((s, r) => s + r.reservedQuantity, 0)
    const totalAvailable = inventory.reduce((s, r) => s + r.availableQuantity, 0)

    async function handleAddInventory(e) {
        e.preventDefault()
        setFormError('')
        setFormLoading(true)
        try {
            await createInventory({
                ...addForm,
                physicalQuantity: parseInt(addForm.physicalQuantity)
            })
            setShowAddModal(false)
            setAddForm({ itemId: '', locationId: '', batchNumber: '', physicalQuantity: '' })
            await loadData()
        } catch (err) {
            setFormError(getApiError(err))
        } finally {
            setFormLoading(false)
        }
    }

    async function handleAdjust(e) {
        e.preventDefault()
        setFormError('')
        setFormLoading(true)
        try {
            const amount = parseInt(adjustAmount)
            if (amount === 0 || isNaN(amount)) {
                setFormError('Adjustment amount cannot be zero.')
                return
            }
            await adjustInventory(showAdjustModal.id, amount, adjustReason)
            setShowAdjustModal(null)
            setAdjustAmount('')
            setAdjustReason('')
            await loadData()
        } catch (err) {
            setFormError(getApiError(err))
        } finally {
            setFormLoading(false)
        }
    }

    if (loading) return <LoadingState message="Loading inventory..." />
    if (error) return <ErrorState message={error} onRetry={loadData} />

    return (
        <div className={styles.page}>
            <PageHeader
                title="Inventory"
                subtitle="Monitor physical, reserved and available stock across locations."
                action={canManage && (
                    <button className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Add Inventory
                    </button>
                )}
            />

            {/* Stats */}
            <div className={styles.stats}>
                <StatCard label="Total Items" value={inventory.length} />
                <StatCard label="Physical Quantity" value={totalPhysical.toLocaleString()} />
                <StatCard label="Reserved Quantity" value={totalReserved.toLocaleString()} />
                <StatCard label="Available Quantity" value={totalAvailable.toLocaleString()} highlight />
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="Search items..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={styles.search}
                />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={styles.select}>
                    <option value="">All Categories</option>
                    {meta.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className={styles.select}>
                    <option value="">All Locations</option>
                    {meta.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <label className={styles.checkLabel}>
                    <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} />
                    Show Low Stock Only
                </label>
            </div>

            {/* Table */}
            <div className={styles.tableCard}>
                {filtered.length === 0 ? (
                    <EmptyState title="No inventory records found." description="Try changing your filters or add inventory." />
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ITEM</th>
                                    <th>CATEGORY</th>
                                    <th>LOCATION</th>
                                    <th>BATCH</th>
                                    <th>PHYSICAL</th>
                                    <th>RESERVED</th>
                                    <th>AVAILABLE</th>
                                    {canManage && <th>ACTIONS</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(row => (
                                    <tr key={row.id}>
                                        <td>
                                            <div className={styles.itemName}>{row.itemName}</div>
                                            <div className={styles.sku}>{row.sku}</div>
                                        </td>
                                        <td>{row.categoryName}</td>
                                        <td>{row.locationName}</td>
                                        <td>{row.batchNumber}</td>
                                        <td>{row.physicalQuantity}</td>
                                        <td>{row.reservedQuantity}</td>
                                        <td>
                                            <span className={`${styles.available} ${row.availableQuantity <= 10 ? styles.low : ''}`}>
                                                {row.availableQuantity}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => { setShowAdjustModal(row); setFormError('') }}
                                                >
                                                    Adjust
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Inventory Modal */}
            {showAddModal && (
                <Modal title="Add Inventory" onClose={() => setShowAddModal(false)}
                    footer={
                        <>
                            <button className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className={styles.primaryBtn} form="add-inventory-form" type="submit" disabled={formLoading}>
                                {formLoading ? 'Adding...' : 'Add Inventory'}
                            </button>
                        </>
                    }
                >
                    <form id="add-inventory-form" onSubmit={handleAddInventory} className={styles.form}>
                        <div className={styles.field}>
                            <label>Item *</label>
                            <select required value={addForm.itemId} onChange={e => setAddForm(f => ({...f, itemId: e.target.value}))} className={styles.formSelect}>
                                <option value="">Select item</option>
                                {meta.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Location *</label>
                            <select required value={addForm.locationId} onChange={e => setAddForm(f => ({...f, locationId: e.target.value}))} className={styles.formSelect}>
                                <option value="">Select location</option>
                                {meta.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Batch Number</label>
                            <input type="text" value={addForm.batchNumber} onChange={e => setAddForm(f => ({...f, batchNumber: e.target.value}))} placeholder="e.g. BATCH-001" className={styles.formInput} />
                        </div>
                        <div className={styles.field}>
                            <label>Physical Quantity *</label>
                            <input type="number" required min="0" value={addForm.physicalQuantity} onChange={e => setAddForm(f => ({...f, physicalQuantity: e.target.value}))} className={styles.formInput} />
                        </div>
                        {formError && <div className={styles.formError}>{formError}</div>}
                    </form>
                </Modal>
            )}

            {/* Adjust Modal */}
            {showAdjustModal && (
                <Modal title={`Adjust: ${showAdjustModal.itemName}`} onClose={() => setShowAdjustModal(null)}
                    footer={
                        <>
                            <button className={styles.cancelBtn} onClick={() => setShowAdjustModal(null)}>Cancel</button>
                            <button className={styles.primaryBtn} form="adjust-form" type="submit" disabled={formLoading}>
                                {formLoading ? 'Adjusting...' : 'Apply Adjustment'}
                            </button>
                        </>
                    }
                >
                    <form id="adjust-form" onSubmit={handleAdjust} className={styles.form}>
                        <p className={styles.adjustInfo}>
                            Current: <strong>{showAdjustModal.physicalQuantity}</strong> physical / <strong>{showAdjustModal.availableQuantity}</strong> available
                        </p>
                        <div className={styles.field}>
                            <label>Adjustment (+/-) *</label>
                            <input type="number" required value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="e.g. +50 or -10" className={styles.formInput} />
                            <span className={styles.hint}>Positive = add stock, Negative = remove stock</span>
                        </div>
                        <div className={styles.field}>
                            <label>Reason</label>
                            <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Optional reason for adjustment" className={styles.formInput} />
                        </div>
                        {formError && <div className={styles.formError}>{formError}</div>}
                    </form>
                </Modal>
            )}
        </div>
    )
}
