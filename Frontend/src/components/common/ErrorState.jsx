import styles from './ErrorState.module.scss'

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
    return (
        <div className={styles.container}>
            <div className={styles.icon}>⚠️</div>
            <p className={styles.message}>{message}</p>
            {onRetry && (
                <button className={styles.retryBtn} onClick={onRetry}>
                    Try Again
                </button>
            )}
        </div>
    )
}
