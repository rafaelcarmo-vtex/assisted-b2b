import { useState, useRef, useEffect } from 'react'
import styles from './Header.module.css'
import { asset } from '../../utils/asset'

const NAV_LINKS = [
  { label: 'Shop', active: true },
  { label: 'Mobile' },
  { label: 'TV & AV' },
  { label: 'Home Appliance' },
  { label: 'Displays' },
  { label: 'Accessories' },
  { label: 'Sale', sale: true },
]

const MENU_ITEMS = [
  { label: 'Profile', href: '#' },
  { label: 'Orders', href: '#' },
  { label: 'Carts', href: '#' },
  { label: 'Quotes', href: '/storefrontb2b/account/quotes' },
  { label: 'Addresses', href: '#' },
  { label: 'User details', href: '#' },
  { label: 'Authentication', href: '#' },
]

export default function Header() {
  const [searchQuery, setSearchQuery]   = useState('')
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [bulkOpen, setBulkOpen]         = useState(false)
  const bulkRef                         = useRef(null)
  const fileInputRef                    = useRef(null)

  useEffect(() => {
    if (!bulkOpen) return
    function handleClick(e) {
      if (bulkRef.current && !bulkRef.current.contains(e.target)) {
        setBulkOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [bulkOpen])

  return (
    <>
      <header className={styles.header}>

        {/* ── Top row ── */}
        <div className={styles.topRow}>
          <div className={styles.logoWrap}>
            <a href="/storefrontb2b" className={styles.logo}>Demo Store</a>
          </div>

          <div className={styles.searchWrap} ref={bulkRef}>
            <div className={`${styles.searchBar} ${bulkOpen ? styles.searchBarBulkOpen : ''}`}>
              <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search for items, brands and collections…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
              />
              <button
                className={`${styles.searchBulkBtn} ${bulkOpen ? styles.searchBulkBtnActive : ''}`}
                type="button"
                onClick={() => setBulkOpen(v => !v)}
              >In bulk</button>
            </div>

            {bulkOpen && (
              <div className={styles.bulkPanel}>
                <div className={styles.bulkDropZone}>
                  {/* Illustration */}
                  <div className={styles.bulkIllustration}>
                    <img src={asset('/Illustration-dragdrop.svg')} alt="" width={60} height={50} />
                  </div>
                  <p className={styles.bulkTitle}>Drop a file to search in bulk</p>
                  <input ref={fileInputRef} type="file" style={{display:'none'}} />
                  <button className={styles.bulkSelectBtn} type="button" onClick={() => fileInputRef.current.click()}>Select file</button>
                  <a href="#" className={styles.bulkTemplateLink}>Download template</a>
                </div>
              </div>
            )}
          </div>

          <div className={styles.accountArea}>
            <button
              className={styles.accountBtn}
              type="button"
              aria-label="Account menu"
              onClick={() => setDrawerOpen(true)}
            >
              <span className={styles.accountAvatar}><img src={asset('/logo-stellarglobal.png')} alt="Stellar Global" /></span>
              <span className={styles.accountName}>Stellar Global</span>
            </button>
            <button className={styles.cartBtn} type="button" aria-label="Shopping cart" onClick={() => window.location.href = '/storefrontb2b/cart'}>
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className={styles.cartCount}>10</span>
            </button>
          </div>
        </div>

        {/* ── Bottom row (nav + info) ── */}
        <div className={styles.bottomRow}>
          <nav className={styles.nav} aria-label="Categories">
            {NAV_LINKS.map(({ label, active, sale }) => (
              <a
                key={label}
                href="#"
                className={[
                  styles.navLink,
                  active ? styles.navLinkActive : '',
                  sale   ? styles.navLinkSale   : '',
                ].join(' ')}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className={styles.deliveryInfo}>
            <span className={styles.niItem}>
              <span className={styles.niLbl}>Ship to:</span>
              <button className={styles.niVal} type="button">
                Boston Boylston St, 02116
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </span>
            <span className={styles.niSep} aria-hidden="true">|</span>
            <span className={styles.niItem}>
              <span className={styles.niLbl}>Delivery method:</span>
              <button className={styles.niVal} type="button">
                Standard shipping
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </span>
          </div>
        </div>

      </header>

      {/* ── Account Drawer ── */}
      {drawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>

        {/* Cover */}
        <div className={styles.drawerCover}>
          <button
            className={styles.drawerClose}
            type="button"
            aria-label="Close"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className={styles.drawerAvatar}><img src={asset('/logo-stellarglobal.png')} alt="Stellar Global" /></div>
        </div>

        <div className={styles.drawerBody}>
          {/* Account identity */}
          <div className={styles.drawerIdentity}>
            <div className={styles.drawerIdentityRow}>
              <span className={styles.drawerCompany}>Stellar Global</span>
              <button className={styles.drawerSwitchBtn} type="button">Switch</button>
            </div>
          </div>

          {/* Menu items */}
          <nav className={styles.drawerNav}>
            {MENU_ITEMS.map(({ label, href }) => (
              <a key={label} href={href} className={styles.drawerNavItem}>
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className={styles.drawerFooter}>
          <div className={styles.drawerFooterBox}>
            <div className={styles.drawerFooterRow}>
              <span className={styles.drawerFooterLabel}>
                <span className="material-symbols-outlined" style={{fontSize:'20px',color:'#0366DD',fontVariationSettings:"'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20"}}>folder</span>
                Operations and facilities
              </span>
              <a
                href="/manage.html"
                className={styles.drawerManageLink}
                onClick={(e) => {
                  e.preventDefault()
                  const overlay = document.createElement('div')
                  overlay.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;z-index:9999;transition:opacity 0.15s ease;pointer-events:none;'
                  document.body.appendChild(overlay)
                  requestAnimationFrame(() => { overlay.style.opacity = '1' })
                  setTimeout(() => { window.location.href = '/manage.html' }, 180)
                }}
              >
                Manage
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>open_in_new</span>
              </a>
            </div>
            <div className={styles.drawerFooterRow}>
              <div className={styles.drawerUserInfo}>
                <span className={styles.drawerUserName}>Donald Green</span>
                <span className={styles.drawerUserEmail}>d.green@stellar.com</span>
              </div>
              <a href="#" className={styles.drawerLogout}>Log out</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
