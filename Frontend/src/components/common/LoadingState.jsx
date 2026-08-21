import styles from './LoadingState.module.scss'

export default function LoadingState({ message = 'Loading...' }) {
    return (
        <div className={styles.container}>
            <div className={styles.spinner} />
            <p className={styles.message}>{message}</p>
        </div>
    )
}
