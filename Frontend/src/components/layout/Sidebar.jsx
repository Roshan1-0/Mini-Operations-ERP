import { NavLink, useNavigate } from 'react-router-dom'
import { Package, ClipboardList, ArrowLeftRight, ShoppingCart, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../Features/Auth/AuthContext.jsx'
import styles from './Sidebar.module.scss'

const NAV_ITEMS = [
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/work-orders', icon: ClipboardList, label: 'Work Orders' },
    { to: '/transfers', icon: ArrowLeftRight, label: 'Internal Transfers' },
    { to: '/orders', icon: ShoppingCart, label: 'Customer Orders' }
]

const ROLE_LABELS = {
    ADMIN: 'Internal Admin',
    OPERATIONS: 'Operations User',
    SALES: 'Sales User'
}

export default function Sidebar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <aside className={styles.sidebar}>
            {/* Logo */}
            <div className={styles.logo}>
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="8" fill="#2563eb"/>
                    <path d="M8 12h16M8 16h10M8 20h13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className={styles.logoText}>
                    <span className={styles.logoName}>Mini Ops ERP</span>
                    <span className={styles.logoRole}>{ROLE_LABELS[user?.role] || user?.role}</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `${styles.navItem} ${isActive ? styles.active : ''}`
                        }
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className={styles.footer}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                        <span className={styles.userName}>{user?.name}</span>
                        <span className={styles.userRole}>{user?.role}</span>
                    </div>
                </div>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </aside>
    )
}
