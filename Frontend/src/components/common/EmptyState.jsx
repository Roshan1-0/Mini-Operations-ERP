import styles from './EmptyState.module.scss'

export default function EmptyState({ title = 'No records found.', description, action }) {
    return (
        <div className={styles.container}>
            <div className={styles.icon}>📭</div>
            <p className={styles.title}>{title}</p>
            {description && <p className={styles.description}>{description}</p>}
            {action}
        </div>
    )
}
