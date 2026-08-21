import styles from './StatCard.module.scss'

export default function StatCard({ label, value, highlight }) {
    return (
        <div className={`${styles.card} ${highlight ? styles.highlight : ''}`}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{value ?? '—'}</span>
        </div>
    )
}
