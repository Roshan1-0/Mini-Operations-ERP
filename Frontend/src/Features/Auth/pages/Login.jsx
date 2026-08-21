import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../auth.api.js'
import { useAuth } from '../AuthContext.jsx'
import { getApiError } from '../../../util/helpers.js'
import styles from './Login.module.scss'

export default function Login() {
    const navigate = useNavigate()
    const { setUser } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await login({ email: email.trim(), password })
            setUser(res.data)
            navigate('/inventory')
        } catch (err) {
            setError(getApiError(err))
        } finally {
            setLoading(false)
        }
    }

    function selectCredential(userEmail, userPassword = 'password123') {
        setEmail(userEmail)
        setPassword(userPassword)
        setError('')
    }

    return (
        <div className={styles.page}>
            {/* Left panel - branding */}
            <div className={styles.brand}>
                <div className={styles.brandContent}>
                    <div className={styles.logo}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="#2563eb"/>
                            <path d="M8 12h16M8 16h10M8 20h13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Mini Operations ERP</span>
                    </div>
                    <h1 className={styles.tagline}>
                        Optimize your enterprise logistics.
                    </h1>
                    <p className={styles.subtagline}>
                        Manage inventory, work orders, internal stock transfers, and customer order reservations with zero concurrency risks.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>📦</span>
                            <span>Multi-location real-time inventory tracking</span>
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>⚙️</span>
                            <span>Work order material deficit checks</span>
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>🚚</span>
                            <span>Atomic multi-stage internal transfers</span>
                        </div>
                        <div className={styles.feature}>
                            <span className={styles.featureIcon}>🛒</span>
                            <span>Race-condition-safe customer order reservations</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel - login form */}
            <div className={styles.formPanel}>
                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>Sign In</h2>
                    <p className={styles.formSubtitle}>Enter your credentials to access the ERP dashboard.</p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label}>Email Address</label>
                            <input
                                type="email"
                                className={styles.input}
                                placeholder="name@erp.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className={styles.togglePassword}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className={styles.error}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading || !email || !password}
                        >
                            {loading ? 'Signing in...' : 'Sign in to Dashboard'}
                        </button>
                    </form>

                    <div className={styles.demoCredentials}>
                        <p className={styles.demoTitle}>Quick 1-Click Demo Login</p>
                        
                        <div className={styles.demoGrid}>
                            <button
                                type="button"
                                className={styles.demoBtn}
                                onClick={() => selectCredential('admin@erp.com')}
                            >
                                👑 Admin
                            </button>
                            <button
                                type="button"
                                className={styles.demoBtn}
                                onClick={() => selectCredential('ops@erp.com')}
                            >
                                ⚙️ Operations
                            </button>
                            <button
                                type="button"
                                className={styles.demoBtn}
                                onClick={() => selectCredential('sales@erp.com')}
                            >
                                🛒 Sales
                            </button>
                        </div>

                        <div className={styles.passwordHint}>
                            Default Password: <code>password123</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
