import styles from './BuyerPortal.module.css'

export default function BuyerPortal() {
  return (
    <iframe
      className={styles.frame}
      src="/sales-app.html?v=36"
      title="Sales App"
    />
  )
}
