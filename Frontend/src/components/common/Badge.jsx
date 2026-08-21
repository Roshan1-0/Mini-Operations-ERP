import { getStatusClass, formatStatus } from '../../util/helpers.js'
import styles from './Badge.module.scss'

export default function Badge({ status, label }) {
    const text = label || formatStatus(status)
    const className = getStatusClass(status)
    return (
        <span className={`${styles.badge} ${styles[className]}`}>
            {text}
        </span>
    )
}
