import styles from './StoreFront.module.css'

const RECOMMENDED = [
  {
    id: 1,
    name: 'Galaxy Z Flip4',
    price: '$999.99',
    badge: '10% off',
    img: '/rec-galaxyz.png',
  },
  {
    id: 2,
    name: 'Galaxy Book3 Ultra',
    price: '$2,499.99',
    badge: '8% off',
    img: '/rec-book3.png',
  },
]

const LATEST = [
  { id: 1, name: 'Galaxy Buds2 Pro', from: '$229.99', img: '/product-buds.png' },
  { id: 2, name: '32" 4K UHD Smart Monitor with Streaming TV and SlimFit Camera Included', from: '$499.99', img: '/product-monitor.png' },
  { id: 3, name: '7.4 cu. ft. Smart Electric Dryer with Steam Sanitize+', from: '$679.00', img: '/product-dryer.png' },
  { id: 4, name: '32" Odyssey Neo G8 4K UHD 240Hz 1ms Quantum HDR2000 Curved Gaming Monitor', from: '$1,199.00', img: '/product-odyssey.png' },
]

const TRUST_BADGES = [
  { icon: 'local_shipping', title: 'Buy online', sub: 'Get free shipping' },
  { icon: 'autorenew', title: 'Free return', sub: '30 days to return' },
  { icon: 'card_giftcard', title: 'Gift cards', sub: '$25 / $50 / $100' },
  { icon: 'store', title: 'Physical stores', sub: '+40 stores in USA' },
  { icon: 'verified_user', title: '3-Year guarantee', sub: 'On all products' },
]

const FOOTER_COLS = [
  { title: 'Our Company', links: ['About us', 'Our Blog', 'Stores', 'Work with us'] },
  { title: 'Order & Purchases', links: ['Check order status', 'Return and exchanges', 'Product detail', 'Gift cards'] },
  { title: 'Support & Services', links: ['Support Center', 'Schedule a service', 'Contact us'] },
  { title: 'Business', links: ['Business support', 'Volume pricing', 'Fleet management', 'Contact sales'] },
]

export default function StoreFront() {
  return (
    <div className={styles.storefront}>

      {/* ── Hero ── */}
      <div className={styles.heroWrap}>
        <section className={styles.hero}>
          <img src="/hero-s23.png" alt="" className={styles.heroBg} aria-hidden="true" />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Galaxy S23<br />Ultra</h1>
            <p className={styles.heroFrom}>From</p>
            <div className={styles.heroPriceRow}>
              <span className={styles.heroPrice}>$549.99</span>
              <span className={styles.heroBadge}>15% Off</span>
            </div>
            <button className={styles.heroCta}>Select items</button>
          </div>
        </section>
      </div>

      {/* ── Recommended for your business ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recommended for your business</h2>
          <a href="#" className={styles.seeAll}>See all</a>
        </div>
        <div className={styles.recommendedGrid}>
          {RECOMMENDED.map((item) => (
            <div key={item.id} className={styles.recommendedCard}>
              <div className={styles.recommendedImgWrap}>
                <img src={item.img} alt={item.name} className={styles.recommendedImg} />
              </div>
              <div className={styles.recommendedBody}>
                <p className={styles.recommendedName}>{item.name}</p>
                <a href="#" className={styles.selectLink}>Select items</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Latest purchases ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Latest purchases</h2>
          <a href="#" className={styles.seeAll}>See all</a>
        </div>
        <div className={styles.latestGrid}>
          {LATEST.map((item) => (
            <div key={item.id} className={styles.latestCard}>
              <div className={styles.latestImgWrap}>
                <img src={item.img} alt={item.name} className={styles.latestImg} />
              </div>
              <div className={styles.latestBody}>
                <p className={styles.latestName}>{item.name}</p>
                <p className={styles.latestFromLabel}>From</p>
                <p className={styles.latestPrice}>{item.from}</p>
                <a href="#" className={styles.selectLinkSm}>Select items</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mid Banner ── */}
      <section className={styles.midBanner}>
        <div className={styles.midBannerOverlay} />
        <div className={styles.midBannerContent}>
          <p className={styles.midBannerLabel}>Coming soon</p>
          <h2 className={styles.midBannerTitle}>Galaxy S24 Ultra</h2>
          <button className={styles.midBannerCta}>Reserve</button>
        </div>
      </section>

      {/* ── Promo Banner ── */}
      <section className={styles.promoSection}>
        <div className={styles.promoCard}>
          <div className={styles.promoLeft}>
            <h2 className={styles.promoHeading}>-20% with Demo Care+<br />for Business</h2>
            <p className={styles.promoSub}>Coverage against accidental damage, theft and more.</p>
            <button className={styles.promoCta}>Learn more</button>
          </div>
          <div className={styles.promoRight}>
            <img
              src="/promo-woman.png"
              alt="Demo Care+ promotion"
              className={styles.promoImg}
            />
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className={styles.newsletter}>
        <div className={styles.newsletterInner}>
          <h2 className={styles.newsletterTitle}>Get top deals, latest trends, and more.</h2>
          <p className={styles.newsletterSub}>
            Receive our news and promotions in advance. Sign up and get 10% off your first purchase.
          </p>
          <form className={styles.newsletterForm} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email address"
              className={styles.newsletterInput}
            />
            <button type="submit" className={styles.newsletterBtn}>Sign up</button>
          </form>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>

        {/* Trust badges */}
        <div className={styles.trustRow}>
          {TRUST_BADGES.map((badge, i) => (
            <div key={i} className={styles.trustBadge}>
              <span className={`material-symbols-outlined ${styles.trustIcon}`}>{badge.icon}</span>
              <span className={styles.trustTitle}>{badge.title}</span>
              <span className={styles.trustSub}>{badge.sub}</span>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className={styles.footerLinks}>
          {FOOTER_COLS.map((col, i) => (
            <div key={i} className={styles.footerCol}>
              <p className={styles.footerColTitle}>{col.title}</p>
              <ul className={styles.footerList}>
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className={styles.footerLink}>{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className={styles.footerBottom}>
          <span className={styles.footerCopy}>© 2026 Demo Store. All rights reserved.</span>
          <span className={styles.footerPayments}>VISA &nbsp; MC &nbsp; AMEX &nbsp; PAYPAL</span>
        </div>

      </footer>

    </div>
  )
}
