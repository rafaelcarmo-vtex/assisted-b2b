import { useState, useRef, useEffect, useMemo } from 'react'
import styles from './OrderBuilder.module.css'
import headerStyles from '../Header/Header.module.css'
import { asset } from '../../utils/asset'

function ReasonedToggle() {
  const [open, setOpen] = useState(false)
  return (
    <button className={styles.reasonedToggle} onClick={() => setOpen(o => !o)}>
      Reasoned
      <span className="material-symbols-outlined" style={{ fontSize: '16px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        expand_more
      </span>
    </button>
  )
}

function fadeNavigate(href) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;z-index:9999;transition:opacity 0.2s ease;pointer-events:none;'
  document.body.appendChild(overlay)
  requestAnimationFrame(() => { overlay.style.opacity = '1' })
  setTimeout(() => { window.location.href = href }, 220)
}

export default function OrderBuilder({ onClose, repMode = false, newOrder = false }) {
  const [activeTab, setActiveTab] = useState('products')
  const [tabVisible, setTabVisible] = useState(true)

  function switchTab(tab) {
    if (tab === activeTab) return
    setTabVisible(false)
    setTimeout(() => {
      setActiveTab(tab)
      setTabVisible(true)
    }, 150)
  }
  const [metaExpanded, setMetaExpanded] = useState(false)
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [attachedFile, setAttachedFile] = useState(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isFilling, setIsFilling] = useState(false)
  const [orderFilled, setOrderFilled] = useState(repMode && !newOrder)
  const fillingTimerRef = useRef(null)

  const FILLED_ITEMS = [
    { name: 'Smart TV 55" UHD 4K – Hotel Series', sku: 'HTV-55UHD-HSR', qty: 8, disc: 5, unitNum: 649, originalUnitNum: 729, unit: '$649.00', ship: 'Boston Boylston St', delivery: 'Express Delivery (1–2 business days)', costCenters: ['HPSL01', 'HPSL02'], img: asset('/items/TV.png') },
    { name: 'Smart TV 43" Full HD – Standard Room', sku: 'HTV-43FHD-STD', qty: 12, disc: 5, unitNum: 449, unit: '$449.00', ship: 'Cambridge Harvard Sq', delivery: 'Standard Delivery (3–4 business days)', costCenters: ['HPSL02'], img: asset('/items/TV.png') },
    { name: 'Minibar Refrigerator 40L – Premium', sku: 'HMB-40L-PRE', qty: 10, disc: 6, unitNum: 389, originalUnitNum: 429, unit: '$389.00', ship: 'Boston Boylston St', delivery: 'Express Delivery (1–2 business days)', costCenters: ['HPSL01', 'HPSL03'], img: asset('/items/Frigobar.png'), stockStatus: 'out' },
    { name: 'Minibar Slim 20L – Compact Room', sku: 'HMB-20L-SLM', qty: 8, disc: 4, unitNum: 279, unit: '$279.00', ship: 'Springfield Elm', delivery: 'Standard Delivery (5–6 business days)', costCenters: ['HPSL03'], img: asset('/items/Frigobar.png') },
    { name: 'Digital Safe – Laptop Size (14")', sku: 'HCF-LPT-14', qty: 15, disc: 3, unitNum: 199, unit: '$199.00', ship: 'Boston Boylston St', delivery: 'Express Delivery (1–2 business days)', costCenters: ['HPSL01'], img: asset('/items/Cofre.png'), stockStatus: 'low', stockQty: 4 },
    { name: 'Digital Safe – Standard In-Room', sku: 'HCF-STD-IR', qty: 20, disc: 3, unitNum: 149, unit: '$149.00', ship: 'Worcester Main', delivery: 'Standard Delivery (5–6 business days)', costCenters: ['HPSL04'], img: asset('/items/Cofre.png') },
    { name: 'Smart Thermostat Wi-Fi – HVAC Control', sku: 'HTT-WIFI-HVC', qty: 18, disc: 7, unitNum: 259, originalUnitNum: 299, unit: '$259.00', ship: 'Boston Boylston St', delivery: 'Express Delivery (1–2 business days)', costCenters: ['HPSL01', 'HPSL05'], img: asset('/items/Termostato%20inteligente.png') },
    { name: 'Articulating TV Mount 32–65"', sku: 'HSP-ART-6532', qty: 20, disc: 4, unitNum: 89, unit: '$89.00', ship: 'Cambridge Harvard Sq', delivery: 'Standard Delivery (3–4 business days)', costCenters: ['HPSL02'], img: asset('/items/Suporte.png') },
    { name: 'Access Point Wi-Fi 6 Dual Band – Enterprise', sku: 'HAP-W6DB-ENT', qty: 6, disc: 5, unitNum: 349, originalUnitNum: 399, unit: '$349.00', ship: 'Boston Boylston St', delivery: 'Pickup', costCenters: ['HPSL01'], img: asset('/items/Access%20points%20Wi-Fi%20corporativos.png') },
    { name: 'Access Point Wi-Fi 5 – Corporate', sku: 'HAP-W5-CRP', qty: 5, disc: 5, unitNum: 299, unit: '$299.00', ship: 'Providence Downtown', delivery: 'Pickup', costCenters: ['HPSL05'], img: asset('/items/Access%20points%20Wi-Fi%20corporativos.png') },
  ]
  const [liveItems, setLiveItems] = useState(FILLED_ITEMS)

  // Dynamic totals — recompute whenever quantities change
  const SHIPPING = 24.80
  const STATE_TAX_RATE = 0.0625
  const CITY_TAX_RATE = 0.0375
  const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const calcItemSub = (item) => item.unitNum * (typeof item.qty === 'number' ? item.qty : 0) * (1 - item.disc / 100)
  const liveSubtotalNum = useMemo(() => liveItems.reduce((s, it) => s + calcItemSub(it), 0), [liveItems])
  const liveBostonSubNum = useMemo(() => liveItems.filter(it => it.ship?.includes('Boston')).reduce((s, it) => s + calcItemSub(it), 0), [liveItems])
  const liveStateTaxNum = useMemo(() => liveSubtotalNum * STATE_TAX_RATE, [liveSubtotalNum])
  const liveCityTaxNum = useMemo(() => liveBostonSubNum * CITY_TAX_RATE, [liveBostonSubNum])
  const liveTaxesNum = useMemo(() => liveStateTaxNum + liveCityTaxNum, [liveStateTaxNum, liveCityTaxNum])
  const liveTotalNum = useMemo(() => liveSubtotalNum + SHIPPING + liveTaxesNum, [liveSubtotalNum, liveTaxesNum])
  // Original totals (from FILLED_ITEMS, for strikethrough in repMode)
  const origSubtotalNum = useMemo(() => FILLED_ITEMS.reduce((s, it) => s + calcItemSub(it), 0), [])
  const origBostonSubNum = useMemo(() => FILLED_ITEMS.filter(it => it.ship?.includes('Boston')).reduce((s, it) => s + calcItemSub(it), 0), [])
  const origTaxesNum = origSubtotalNum * STATE_TAX_RATE + origBostonSubNum * CITY_TAX_RATE
  const origTotalNum = origSubtotalNum + SHIPPING + origTaxesNum

  useEffect(() => {
    if (!repMode) return
    if (isFirstLiveItemsRender.current) { isFirstLiveItemsRender.current = false; return }
    setRepHasEdited(true)
  }, [liveItems])

  const [visibleCount, setVisibleCount] = useState(repMode && !newOrder ? 10 : 5)
  const [revealedFrom, setRevealedFrom] = useState(0)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [selectedContext, setSelectedContext] = useState(null)
  const [awaitingQuoteConfirm, setAwaitingQuoteConfirm] = useState(false)
  const [awaitingHotelConfirm, setAwaitingHotelConfirm] = useState(false)
  const [repChipsDismissed, setRepChipsDismissed] = useState(false)
  const [repSuggestionsShown, setRepSuggestionsShown] = useState(false)
  const [awaitingSuggestions, setAwaitingSuggestions] = useState(repMode && !newOrder)
  const [awaitingOptionSelect, setAwaitingOptionSelect] = useState(false)
  const [awaitingMessageApproval, setAwaitingMessageApproval] = useState(false)
  const [awaitingRepConfirm, setAwaitingRepConfirm] = useState(false)
  const [repItemUpdated, setRepItemUpdated] = useState(false)
  const [awaitingQtyConfirm, setAwaitingQtyConfirm] = useState(false)
  const [awaitingSendConfirm, setAwaitingSendConfirm] = useState(false)
  const [repBuyerPending, setRepBuyerPending] = useState(false)
  const [repHasEdited, setRepHasEdited] = useState(false)
  const [repCustomer] = useState(() => {
    if (!repMode) return null
    try { const r = sessionStorage.getItem('repCustomer'); return r ? JSON.parse(r) : null } catch { return null }
  })
  const isFirstLiveItemsRender = useRef(true)
  // Capture initial item values in repMode to compare against rep edits
  const repOrigItemsRef = useRef(repMode ? FILLED_ITEMS.map(it => ({ disc: it.disc, unitNum: it.unitNum, qty: it.qty })) : null)
  const [quotePct, setQuotePct] = useState(null)
  const [quotePending, setQuotePending] = useState(false)
  const [quoteBannerDismissed, setQuoteBannerDismissed] = useState(false)

  function handleCardClick(label) {
    setSelectedContext(prev => prev?.label === label ? null : { label })
  }

  const thinkingPhrases = [
    'Reading your message',
    'Processing request',
    'Working on it',
    'Almost there',
  ]
  const [thinkingPhrase, setThinkingPhrase] = useState(thinkingPhrases[0])
  const [showDrawer, setShowDrawer] = useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState('boston')
  const [addrDrawerTab, setAddrDrawerTab] = useState('address')
  const [locationSearch, setLocationSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)

  const LOCATION_OPTIONS = [
    { id: 'loc1', label: '1st Floor – Lobby',       sub: 'Main entrance level' },
    { id: 'loc2', label: '2nd Floor – Operations',   sub: 'Admin & back-office' },
    { id: 'loc3', label: '3rd Floor – Executive',    sub: 'C-suite & boardroom' },
    { id: 'loc4', label: 'Loading Dock A',            sub: 'Rear entrance, freight' },
    { id: 'loc5', label: 'Loading Dock B',            sub: 'Side entrance, freight' },
    { id: 'loc6', label: 'East Wing – Conference',   sub: 'Meeting rooms E1–E12' },
    { id: 'loc7', label: 'West Wing – IT Room',      sub: 'Server & network infra' },
    { id: 'loc8', label: 'Basement – Storage',       sub: 'Cold storage & warehouse' },
  ]

  const locationResults = useMemo(() => {
    const q = locationSearch.trim().toLowerCase()
    if (!q) return LOCATION_OPTIONS
    return LOCATION_OPTIONS.filter(l => l.label.toLowerCase().includes(q) || l.sub.toLowerCase().includes(q))
  }, [locationSearch])

  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
  const [promoDrawerOpen, setPromoDrawerOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState('')
  const [selectedPaymentId, setSelectedPaymentId] = useState('corp-card')
  const [shippingDrawerOpen, setShippingDrawerOpen] = useState(false)
  const [shippingItemIdx, setShippingItemIdx] = useState(null)
  const [selectedShippingId, setSelectedShippingId] = useState('standard')
  const [ccDrawerOpen, setCcDrawerOpen] = useState(false)
  const [ccDrawerItemIdx, setCcDrawerItemIdx] = useState(null)
  const [ccDrawerSelected, setCcDrawerSelected] = useState([])
  const [ccDrawerTab, setCcDrawerTab] = useState('rooms')
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false)
  const [ccDrawerSearch, setCcDrawerSearch] = useState('')
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [orderHistory, setOrderHistory] = useState([])

  function addHistory(action, detail, user = 'Donald Green', initials = 'DG') {
    const time = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    setOrderHistory(prev => [...prev, { id: `h${Date.now()}`, user, initials, time, action, detail }])
  }

  const [addProductDrawerOpen, setAddProductDrawerOpen] = useState(false)
  const [addProductSearch, setAddProductSearch] = useState('')
  const [recipientDrawerOpen, setRecipientDrawerOpen] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState(null)

  const RECIPIENT_CATALOG = [
    { id: 'r1', name: 'Donald Green', email: 'donald.green@stellarglobal.com', initials: 'DG' },
    { id: 'r2', name: 'Sarah Mitchell', email: 'sarah.mitchell@stellarglobal.com', initials: 'SM' },
    { id: 'r3', name: 'James Okonkwo', email: 'james.okonkwo@stellarglobal.com', initials: 'JO' },
    { id: 'r4', name: 'Laura Chen', email: 'laura.chen@stellarglobal.com', initials: 'LC' },
    { id: 'r5', name: 'Marcus Reyes', email: 'marcus.reyes@stellarglobal.com', initials: 'MR' },
  ]

  const recipientResults = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase()
    if (!q) return []
    return RECIPIENT_CATALOG.filter(r =>
      r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    )
  }, [recipientSearch])
  const [poDrawerOpen, setPoDrawerOpen] = useState(false)
  const [poDrawerTab, setPoDrawerTab] = useState('po')
  const [poDropdownOpen, setPoDropdownOpen] = useState(false)
  const [poDrawerSearch, setPoDrawerSearch] = useState('')
  const [poSelected, setPoSelected] = useState({ po: ['LS-PO1'], callcenter: [], release: [] })

  const PO_CATALOG = {
    po: [
      { id: 'LS-PO1', name: 'LS-PO1', sub: 'Hotel Supplies – Q2 2025' },
      { id: 'LS-PO2', name: 'LS-PO2', sub: 'Hotel Supplies – Q3 2025' },
      { id: 'LS-PO3', name: 'LS-PO3', sub: 'Renovation – Block A' },
      { id: 'LS-PO4', name: 'LS-PO4', sub: 'Renovation – Block B' },
      { id: 'LS-PO5', name: 'LS-PO5', sub: 'IT Equipment – Annual' },
    ],
    callcenter: [
      { id: 'CC-001', name: 'CC-001', sub: 'Front Office' },
      { id: 'CC-002', name: 'CC-002', sub: 'Housekeeping' },
      { id: 'CC-003', name: 'CC-003', sub: 'Maintenance' },
      { id: 'CC-004', name: 'CC-004', sub: 'F&B – Restaurant' },
    ],
    release: [
      { id: 'REL-2025-01', name: 'REL-2025-01', sub: 'January batch' },
      { id: 'REL-2025-02', name: 'REL-2025-02', sub: 'February batch' },
      { id: 'REL-2025-Q2', name: 'REL-2025-Q2', sub: 'Q2 consolidated' },
    ],
  }

  const poTabItems = useMemo(() => {
    const q = poDrawerSearch.trim().toLowerCase()
    const items = PO_CATALOG[poDrawerTab] || []
    if (!q) return items
    return items.filter(it => it.name.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q))
  }, [poDrawerTab, poDrawerSearch])

  const poAllSelected = useMemo(() => {
    const total = Object.values(poSelected).flat().length
    if (total === 0) return 'None'
    const parts = []
    if (poSelected.po.length) parts.push(...poSelected.po)
    if (poSelected.callcenter.length) parts.push(...poSelected.callcenter)
    if (poSelected.release.length) parts.push(...poSelected.release)
    return parts.join(' · ')
  }, [poSelected])

  function togglePoItem(tab, id) {
    setPoSelected(prev => {
      const arr = prev[tab]
      return { ...prev, [tab]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] }
    })
  }
  const [addProductSelected, setAddProductSelected] = useState({}) // { id: qty }

  const SEARCH_CATALOG = [
    { id: 'sp1', name: 'Business Phone X200', sku: 'PHN-X200-BLK', availability: 'In stock', price: 349.00, img: asset('/product-phone.png') },
    { id: 'sp2', name: 'Business Phone X200 – White', sku: 'PHN-X200-WHT', availability: 'In stock', price: 349.00, img: asset('/product-phone.png') },
    { id: 'sp3', name: 'Conference Phone CP960', sku: 'PHN-CP960-GRY', availability: 'Low stock', price: 589.00, img: asset('/product-phone.png') },
    { id: 'sp4', name: 'IP Desk Phone T54W', sku: 'PHN-T54W-BLK', availability: 'In stock', price: 219.00, img: asset('/product-phone.png') },
    { id: 'sp5', name: 'Wireless DECT Phone W73P', sku: 'PHN-W73P-SET', availability: 'Out of stock', price: 179.00, img: asset('/product-phone.png') },
  ]

  const addProductResults = useMemo(() => {
    const q = addProductSearch.trim().toLowerCase()
    if (!q) return []
    return SEARCH_CATALOG.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [addProductSearch])

  const ADDRESS_OPTIONS = [
    { id: 'boston',      label: 'Boston Boylston St, 02116', shortLabel: 'Boston Boylston St', name: 'Stellar Global – Boston', street: '123 Boylston Street', city: 'Boston, MA 02116', country: 'United States' },
    { id: 'cambridge',   label: 'Cambridge Harvard Sq',      shortLabel: 'Cambridge Harvard Sq', name: 'Stellar Global – Cambridge', street: '1 Brattle Square, Suite 300', city: 'Cambridge, MA 02138', country: 'United States' },
    { id: 'springfield', label: 'Springfield Elm',           shortLabel: 'Springfield Elm', name: 'Stellar Global – Springfield', street: '45 Elm Street', city: 'Springfield, MA 01103', country: 'United States' },
    { id: 'providence',  label: 'Providence Downtown',       shortLabel: 'Providence Downtown', name: 'Stellar Global – Providence', street: '72 Westminster Street', city: 'Providence, RI 02903', country: 'United States' },
  ]
  const activeAddress = ADDRESS_OPTIONS.find(a => a.id === selectedAddressId)

  const PAYMENT_OPTIONS = [
    { id: 'corp-card',  label: 'Corporate credit card', name: 'Corporate credit card', sub: 'Visa or Mastercard',                   detail: null },
    { id: 'pers-card',  label: 'Personal credit card',  name: 'Personal credit card',  sub: 'Visa or Mastercard',                   detail: null },
    { id: 'net-terms',  label: 'Net Terms',             name: 'Net Terms',             sub: 'Pay within 30 days of invoice',        detail: 'Subject to credit approval' },
    { id: 'pix',        label: 'PIX',                   name: 'PIX',                   sub: 'Immediate approval',                   detail: 'Payment code will be generated after completing the order' },
  ]
  const activePayment = PAYMENT_OPTIONS.find(p => p.id === selectedPaymentId)

  const SHIPPING_OPTIONS = [
    { id: 'standard', label: 'Standard shipping', days: '5–7 business days', price: 'Free' },
    { id: 'express',  label: 'Express shipping',  days: '1–2 business days', price: '$12.40/item' },
    { id: 'pickup',   label: 'Pickup',             days: 'Ready in 2–3 business days', price: 'Free' },
  ]
  const deliveryToShippingId = (delivery) => {
    if (delivery === 'Pickup') return 'pickup'
    if (delivery?.startsWith('Express')) return 'express'
    return 'standard'
  }
  const shippingIdToDelivery = (id) => {
    if (id === 'pickup') return 'Pickup'
    if (id === 'express') return 'Express Delivery (1–2 business days)'
    return 'Standard Delivery (5–7 business days)'
  }
  const openShippingDrawer = (e, idx) => {
    e.stopPropagation()
    setShippingItemIdx(idx)
    setSelectedShippingId(deliveryToShippingId(liveItems[idx].delivery))
    setShippingDrawerOpen(true)
  }

  const COST_CENTER_OPTIONS = {
    rooms: [
      { id: 'HPSL01', name: 'HPSL01', sub: 'Rooms & Housekeeping' },
      { id: 'HPSL02', name: 'HPSL02', sub: 'Front Desk & Common Areas' },
      { id: 'HPSL06', name: 'HPSL06', sub: 'Laundry & Linen' },
    ],
    fb: [
      { id: 'HPSL03', name: 'HPSL03', sub: 'F&B Operations' },
      { id: 'HPSL07', name: 'HPSL07', sub: 'Banquet & Events' },
      { id: 'HPSL08', name: 'HPSL08', sub: 'Bar & Lounge' },
    ],
    facilities: [
      { id: 'HPSL04', name: 'HPSL04', sub: 'Security & Safety' },
      { id: 'HPSL05', name: 'HPSL05', sub: 'IT & Infrastructure' },
      { id: 'HPSL09', name: 'HPSL09', sub: 'Maintenance & Repairs' },
    ],
  }
  const CC_TABS = [
    { id: 'rooms',      label: 'Rooms' },
    { id: 'fb',         label: 'F&B' },
    { id: 'facilities', label: 'Facilities' },
  ]
  const ccTabItems = useMemo(() => {
    const q = ccDrawerSearch.trim().toLowerCase()
    const all = Object.values(COST_CENTER_OPTIONS).flat()
    const base = ccDrawerSearch ? all : (COST_CENTER_OPTIONS[ccDrawerTab] || [])
    if (!q) return base
    return base.filter(cc => cc.name.toLowerCase().includes(q) || cc.sub.toLowerCase().includes(q))
  }, [ccDrawerTab, ccDrawerSearch])

  const openCcDrawer = (e, idx) => {
    e.stopPropagation()
    setCcDrawerItemIdx(idx)
    setCcDrawerSelected([...(liveItems[idx].costCenters || [])])
    setCcDrawerTab('rooms')
    setCcDrawerSearch('')
    setCcDrawerOpen(true)
  }
  const toggleCc = (id) => {
    setCcDrawerSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  function attachFile(file) {
    if (!file) return
    setAttachedFile({ name: 'hotel-supplies-order-2025', type: 'XLSX', loading: true })
    setTimeout(() => {
      setAttachedFile(prev => prev ? { ...prev, name: 'hotel-supplies-order-2025', loading: false } : null)
    }, 2000)
  }

  function handleDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0
    const file = e.dataTransfer.files?.[0]
    if (file) attachFile(file)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (!poDropdownOpen) return
    function handleClick(e) {
      if (!e.target.closest('[data-po-dropdown]')) setPoDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [poDropdownOpen])

  useEffect(() => {
    if (!ccDropdownOpen) return
    function handleClick(e) {
      if (!e.target.closest('[data-cc-dropdown]')) setCcDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ccDropdownOpen])

  const mockOrders = Array.from({ length: 12 }, (_, i) => `ORD-2026-XYZ-${789 + i}`)


  function handleSend() {
    const text = message.trim()
    if (text || attachedFile) {
      const hasFile = !!attachedFile
      setChatMessages(prev => [...prev, { type: 'user', text, file: attachedFile }])
      if (repMode) setRepHasEdited(true)
      setMessage('')
      setAttachedFile(null)
      setSelectedContext(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      const isDiscount = !hasFile && orderFilled && /(\d+)\s*%|(\d+)\s*off\b/i.test(text)
      const phrase = hasFile ? 'Filling out order' : isDiscount ? 'Working on it' : thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)]
      setThinkingPhrase(phrase)
      setIsThinking(true)
      setTimeout(() => setIsThinking(false), hasFile ? 5000 : 3000)
      if (hasFile) {
        setIsFilling(true)
        clearTimeout(fillingTimerRef.current)
        fillingTimerRef.current = setTimeout(() => {
          setIsFilling(false)
          setOrderFilled(true)
          setVisibleCount(5)
          setRevealedFrom(5)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `**All 112 items were successfully added.**\n\nThe order has been built from your file — quantities, unit prices, and delivery methods are all set.\n\nPlease review the order details before checkout.`
          }])
        }, 5000)
      } else if (awaitingHotelConfirm && !hasFile) {
        setAwaitingHotelConfirm(false)
        const now = new Date()
        const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '') +
          ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
        setTimeout(() => {
          setIsThinking(false)
          setQuotePending(true)
          setQuoteBannerDismissed(false)
          addHistory('Requested quote', 'Quote requested. Status changed to Pending quote.')
          setChatMessages(prev => [...prev, {
            type: 'ai',
            quoteCard: { pct: null, date: dateStr, items: 10 },
            text: `Your quote request has been submitted. Your request has been saved under the [[Drafts]] tab on the Orders page.`
          }])
        }, 1500)
      } else if (awaitingQuoteConfirm && !hasFile) {
        setAwaitingQuoteConfirm(false)
        const now = new Date()
        const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '') +
          ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
        setTimeout(() => {
          setIsThinking(false)
          setQuotePending(true)
          setQuoteBannerDismissed(false)
          addHistory('Requested quote', 'Quote requested. Status changed to Pending quote.')
          setChatMessages(prev => [...prev, {
            type: 'ai',
            quoteCard: { pct: quotePct, date: dateStr, items: 10 },
            text: `Your quote request has been submitted. Your request has been saved under the [[Drafts]] tab on the Orders page.`
          }])
        }, 1500)
      } else if (orderFilled && /(\d+)\s*%|(\d+)\s*off\b/i.test(text)) {
        const pctMatch = text.match(/(\d+)\s*%/) || text.match(/(\d+)\s*off/i)
        const pct = pctMatch ? pctMatch[1] : '?'
        setQuotePct(pct)
        setTimeout(() => {
          setIsThinking(false)
          setAwaitingQuoteConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            reasoned: true,
            text: `Ok! You are requesting for a **${pct}% discount on all demo items** in your order. However, this request will need to be reviewed by a sales representative before it can be approved.\n\nThis process takes around 48 hours, and your order cannot be edited until you receive a response.\n\n**Would you like to proceed with the quote request?**`
          }])
        }, 2000)
      } else if (repMode && awaitingSuggestions && !hasFile) {
        setAwaitingSuggestions(false)
        setAwaitingOptionSelect(true)
        setRepSuggestionsShown(true)
        setThinkingPhrase('Analyzing order')
        setTimeout(() => {
          setIsThinking(false)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Here are my recommendations to strengthen the offer for Donald Green:\n\n**1.** Replace Smart TV 55" UHD 4K with LG QNED55 4K – Hotel Series — same specs, $579.00/unit, saving $560.00\n\n**2.** Increase Smart TV 43" Full HD qty from 12 → 16 units, unlocking volume pricing at $419.00/unit\n\n**3.** Apply both changes and send the revised proposal to the buyer\n\n**4.** Apply all suggestions automatically\n\n**Which would you like to proceed with?**`
          }])
        }, 2200)
      } else if (repMode && awaitingRepConfirm && /yes|sim|confirm|ok|sure|go ahead/i.test(text) && !hasFile) {
        setAwaitingRepConfirm(false)
        setThinkingPhrase('Applying changes')
        setTimeout(() => {
          setIsThinking(false)
          setLiveItems(prev => prev.map((item, i) =>
            i === 0
              ? { ...item, name: 'LG QNED55 4K – Hotel Series', sku: 'LG-QNED55-HSR', unitNum: 579, unit: '$579.00' }
              : item
          ))
          setRepItemUpdated(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Done. The order has been updated:\n\n**Smart TV 55" UHD 4K – Hotel Series** replaced with **LG QNED55 4K – Hotel Series** (×8 @ $579.00)\n\nNew subtotal: **$24,037.54** · New total: **$29,719.03** · Saving: **$532.00**\n\nThe item list on the right has been updated. Would you like to send the revised proposal to Donald Green?`
          }])
        }, 1800)
      } else if (repMode && awaitingQtyConfirm && /yes|sim|confirm|ok|sure|go ahead/i.test(text) && !hasFile) {
        setAwaitingQtyConfirm(false)
        setThinkingPhrase('Applying changes')
        setTimeout(() => {
          setIsThinking(false)
          setLiveItems(prev => prev.map((item, i) =>
            i === 1
              ? { ...item, qty: 16, unitNum: 419, unit: '$419.00' }
              : item
          ))
          setAwaitingSendConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Done. The order has been updated:\n\n**Smart TV 43" Full HD – Standard Room** quantity increased from 12 to **16 units** at **$419.00/unit** (5% disc)\n\nNew item subtotal: **$6,368.80** · New order total: **$30,969.23**\n\nThe proposal is ready!\n\n**Would you like to send it to Donald Green?**`
          }])
        }, 1800)
      } else if (repMode && awaitingMessageApproval && !hasFile) {
        setAwaitingMessageApproval(false)
        setThinkingPhrase('Sending proposal')
        setTimeout(() => {
          setIsThinking(false)
          setRepBuyerPending(true)
          localStorage.setItem('quoteRevised', '1')
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `The revised proposal has been sent to **Donald Green** at Stellar Global.\n\nHe will be notified and can review the updated pricing directly.\n\nIs there anything else I can help you with?`,
            backToHome: true
          }])
        }, 1500)
      } else if (repMode && awaitingSendConfirm && !hasFile) {
        setAwaitingSendConfirm(false)
        setAwaitingMessageApproval(true)
        setThinkingPhrase('Drafting message')
        setTimeout(() => {
          setIsThinking(false)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Here's my suggested message to send to Donald:`,
            draftMessage: `Hi Donald,\n\nI've reviewed your order and made a couple of optimizations to get you the best value. We've upgraded the Smart TV 55" to the LG QNED55 4K — same specs, better price point — and increased the Smart TV 43" to 16 units, which unlocked volume tier pricing.\n\nRevised total: $30,487.23 (saving of $1,040.00 from the original quote). I'm confident this is a strong offer and look forward to hearing your thoughts!`,
            draftOptions: true
          }])
        }, 1500)
      } else if (repMode && repSuggestionsShown && text.trim() === '4' && !hasFile) {
        setAwaitingOptionSelect(false)
        setThinkingPhrase('Applying changes')
        setTimeout(() => {
          setIsThinking(false)
          setLiveItems(prev => prev.map((item, i) => {
            if (i === 0) return { ...item, name: 'LG QNED55 4K – Hotel Series', sku: 'LG-QNED55-HSR', unitNum: 579, unit: '$579.00' }
            if (i === 1) return { ...item, qty: 16, unitNum: 419, unit: '$419.00' }
            return item
          }))
          setRepItemUpdated(true)
          setAwaitingSendConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `All changes applied:\n\n**1.** Smart TV 55" replaced with **LG QNED55 4K – Hotel Series** (×8 @ $579.00) — saving $560.00\n**2.** Smart TV 43" qty increased to **16 units** @ $419.00/unit — saving $480.00\n\nTotal savings: **$1,040.00** · New order total: **$30,487.23**\n\nThe proposal is ready!\n\n**Would you like to send it to Donald Green?**`
          }])
        }, 1800)
      } else if (repMode && awaitingOptionSelect && !hasFile) {
        setAwaitingOptionSelect(false)
        setThinkingPhrase('Applying changes')
        setTimeout(() => {
          setIsThinking(false)
          setLiveItems(prev => prev.map((item, i) => {
            if (i === 0) return { ...item, name: 'LG QNED55 4K – Hotel Series', sku: 'LG-QNED55-HSR', unitNum: 579, unit: '$579.00' }
            if (i === 1) return { ...item, qty: 16, unitNum: 419, unit: '$419.00' }
            return item
          }))
          setRepItemUpdated(true)
          setAwaitingSendConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `All changes applied:\n\n**1.** Smart TV 55" replaced with **LG QNED55 4K – Hotel Series** (×8 @ $579.00) — saving $560.00\n**2.** Smart TV 43" qty increased to **16 units** @ $419.00/unit — saving $480.00\n\nTotal savings: **$1,040.00** · New order total: **$30,487.23**\n\nThe proposal is ready!\n\n**Would you like to send it to Donald Green?**`
          }])
        }, 2200)
      } else if (repMode && !awaitingRepConfirm && !repItemUpdated && /^4$|apply all/i.test(text) && !hasFile) {
        setThinkingPhrase('Applying changes')
        setTimeout(() => {
          setIsThinking(false)
          setLiveItems(prev => prev.map((item, i) => {
            if (i === 0) return { ...item, name: 'LG QNED55 4K – Hotel Series', sku: 'LG-QNED55-HSR', unitNum: 579, unit: '$579.00' }
            if (i === 1) return { ...item, qty: 16, unitNum: 419, unit: '$419.00' }
            return item
          }))
          setRepItemUpdated(true)
          setAwaitingSendConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `All changes applied:\n\n**1.** Smart TV 55" replaced with **LG QNED55 4K – Hotel Series** (×8 @ $579.00) — saving $560.00\n**2.** Smart TV 43" qty increased to **16 units** @ $419.00/unit — saving $480.00\n\nTotal savings: **$1,040.00** · New order total: **$30,487.23**\n\nThe proposal is ready!\n\n**Would you like to send it to Donald Green?**`
          }])
        }, 2200)
      } else if (repMode && repItemUpdated && !awaitingQtyConfirm && !hasFile) {
        setThinkingPhrase('Analyzing order')
        setTimeout(() => {
          setIsThinking(false)
          setAwaitingQtyConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Got it. I can increase the **Smart TV 43" Full HD – Standard Room** from 12 to **16 units**, which unlocks a lower unit price of **$419.00** (down from $449.00 — volume tier pricing).\n\nUnit saving: **$30.00/unit** · New item subtotal: **$6,368.80**\n\n**Shall I apply this change to the order?**`
          }])
        }, 2000)
      } else if (repMode && !hasFile) {
        setThinkingPhrase('Applying changes')
        setTimeout(() => {
          setIsThinking(false)
          setAwaitingRepConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Got it. Based on the order, I suggest the following replacement:\n\n**Replace** Smart TV 55" UHD 4K – Hotel Series (×8 @ $649.00) **with** LG QNED55 4K – Hotel Series — identical panel specs, $579.00/unit.\n\nSaving: **$560.00** (unit price difference × 8 units)\n\n**Shall I apply this change to the order?**`
          }])
        }, 2000)
      } else if (!repMode && orderFilled && !hasFile) {
        setTimeout(() => {
          setIsThinking(false)
          setAwaitingHotelConfirm(true)
          setChatMessages(prev => [...prev, {
            type: 'ai',
            text: `Understood — I'll submit a quote request on your behalf so our team can put together the best pricing for your hotel network.\n\nJust to confirm: this will send your order of **112 items** to our sales team for review. Your order won't be editable while the quote is pending, and you can expect a response within **2 business days**.\n\n**Shall I go ahead and submit the request?**`
          }])
        }, 2000)
      }
    }
  }

  function cancelFilling() {
    clearTimeout(fillingTimerRef.current)
    setIsFilling(false)
  }

  function handleInput(e) {
    setMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={styles.overlay}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className={styles.fullDragOverlay}>
          <img src={asset('/Illustration-dragdrop.svg')} alt="" width={69} height={58} />
          <span className={styles.fullDragTitle}>Drop file</span>
          <span className={styles.fullDragSub}>Drop your file here to fill your order in bulk</span>
        </div>
      )}

      {/* ── Account Drawer (Stellar Global) ── */}
      {accountDrawerOpen && (
        <div className={headerStyles.drawerOverlay} onClick={() => setAccountDrawerOpen(false)} />
      )}
      <div className={`${headerStyles.drawer} ${headerStyles.drawerLeft} ${accountDrawerOpen ? headerStyles.drawerOpen : ''}`} style={{zIndex: 400}}>
        <div className={headerStyles.drawerCover}>
          <button className={headerStyles.drawerClose} type="button" aria-label="Close" onClick={() => setAccountDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className={headerStyles.drawerAvatar}><img src={asset('/logo-stellarglobal.png')} alt="Stellar Global" /></div>
        </div>
        <div className={headerStyles.drawerBody}>
          <div className={headerStyles.drawerIdentity}>
            <div className={headerStyles.drawerIdentityRow}>
              <span className={headerStyles.drawerCompany}>Stellar Global</span>
              <button className={headerStyles.drawerSwitchBtn} type="button">Switch</button>
            </div>
          </div>
          <nav className={headerStyles.drawerNav}>
            {[
              { label: 'Profile', href: '#' },
              { label: 'Orders', href: '#' },
              { label: 'Quotes', href: '/storefrontb2b/account/quotes' },
              { label: 'Addresses', href: '#' },
              { label: 'User details', href: '#' },
              { label: 'Authentication', href: '#' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className={headerStyles.drawerNavItem}>{label}</a>
            ))}
          </nav>
        </div>
        <div className={headerStyles.drawerFooter}>
          <div className={headerStyles.drawerFooterBox}>
            <div className={headerStyles.drawerFooterRow}>
              <span className={headerStyles.drawerFooterLabel}>
                <span className="material-symbols-outlined" style={{fontSize:'20px',color:'#0366DD',fontVariationSettings:"'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20"}}>folder</span>
                Operations and facilities
              </span>
              <a href="/manage.html" className={headerStyles.drawerManageLink} onClick={e => {
                e.preventDefault()
                const overlay = document.createElement('div')
                overlay.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;z-index:9999;transition:opacity 0.15s ease;pointer-events:none;'
                document.body.appendChild(overlay)
                requestAnimationFrame(() => { overlay.style.opacity = '1' })
                setTimeout(() => { window.location.href = '/manage.html' }, 180)
              }}>
                Manage
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>open_in_new</span>
              </a>
            </div>
            <div className={headerStyles.drawerFooterRow}>
              <div className={headerStyles.drawerUserInfo}>
                <span className={headerStyles.drawerUserName}>Donald Green</span>
                <span className={headerStyles.drawerUserEmail}>d.green@stellar.com</span>
              </div>
              <a href="#" className={headerStyles.drawerLogout}>Log out</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Address Drawer ── */}
      {addressDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setAddressDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${addressDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Delivery address</span>
            <span className={styles.addProductDrawerSub}>Select an address and location</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setAddressDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.poDrawerTabs}>
          <button
            className={`${styles.poDrawerTab} ${addrDrawerTab === 'address' ? styles.poDrawerTabActive : ''}`}
            onClick={() => setAddrDrawerTab('address')}
          >
            Address
          </button>
          <button
            className={`${styles.poDrawerTab} ${addrDrawerTab === 'locations' ? styles.poDrawerTabActive : ''}`}
            onClick={() => { setAddrDrawerTab('locations'); setLocationSearch('') }}
          >
            Location
          </button>
        </div>

        {addrDrawerTab === 'address' ? (
          <div className={styles.addrDrawerList}>
            {ADDRESS_OPTIONS.map(addr => {
              const isActive = addr.id === selectedAddressId
              return (
                <div
                  key={addr.id}
                  className={`${styles.addrCard} ${isActive ? styles.addrCardActive : ''}`}
                  onClick={() => setSelectedAddressId(addr.id)}
                >
                  <div className={`${styles.addProductItemCheck} ${isActive ? styles.addProductItemCheckOn : ''}`}>
                    {isActive && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                  </div>
                  <div className={styles.addrCardBody}>
                    <span className={styles.addrCardName}>{addr.name}</span>
                    <span className={styles.addrCardStreet}>{addr.street}</span>
                    <span className={styles.addrCardCity}>{addr.city}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div className={styles.addProductSearchWrap} style={{margin: '12px 60px 4px'}}>
              <span className={`material-symbols-outlined ${styles.addProductSearchIcon}`}>search</span>
              <input
                className={styles.addProductSearchInput}
                type="text"
                placeholder="Search locations…"
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                autoFocus
              />
              {locationSearch && (
                <button className={styles.addProductSearchClear} onClick={() => setLocationSearch('')}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
            <div className={styles.addrDrawerList}>
              {locationResults.length === 0 ? (
                <div className={styles.addProductEmptyState} style={{padding: '32px 24px'}}>
                  <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>location_off</span>
                  <span className={styles.addProductEmptyTitle}>No locations found</span>
                  <span className={styles.addProductEmptyHint}>Try a different search term</span>
                </div>
              ) : locationResults.map(loc => {
                const isActive = selectedLocation?.id === loc.id
                return (
                  <div
                    key={loc.id}
                    className={`${styles.addrCard} ${isActive ? styles.addrCardActive : ''}`}
                    onClick={() => setSelectedLocation(isActive ? null : loc)}
                  >
                    <div className={`${styles.addProductItemCheck} ${isActive ? styles.addProductItemCheckOn : ''}`}>
                      {isActive && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                    </div>
                    <div className={styles.addrCardBody}>
                      <span className={styles.addrCardName}>{loc.label}</span>
                      <span className={styles.addrCardStreet}>{loc.sub}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className={styles.addrDrawerFooter}>
          <button
            className={styles.addrChangeBtn}
            onClick={() => {
              setAddressDrawerOpen(false)
            }}
          >
            {addrDrawerTab === 'address' ? 'Confirm address' : 'Confirm location'}
          </button>
        </div>
      </div>

      {/* ── Payment Drawer ── */}
      {paymentDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setPaymentDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${paymentDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <span className={styles.addrDrawerTitle}>Payment method</span>
          <button className={styles.addrDrawerClose} onClick={() => setPaymentDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.addrDrawerList}>
          {PAYMENT_OPTIONS.map(pm => {
            const isActive = pm.id === selectedPaymentId
            return (
              <div
                key={pm.id}
                className={`${styles.addrCard} ${isActive ? styles.addrCardActive : ''}`}
                onClick={() => setSelectedPaymentId(pm.id)}
              >
                <div className={`${styles.addProductItemCheck} ${isActive ? styles.addProductItemCheckOn : ''}`}>
                  {isActive && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                </div>
                <div className={styles.addrCardBody}>
                  <span className={styles.addrCardName}>{pm.name}</span>
                  {pm.sub && <span className={styles.addrCardStreet}>{pm.sub}</span>}
                  {pm.detail && <span className={styles.addrCardCity}>{pm.detail}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.addrDrawerFooter}>
          <button
            className={styles.addrChangeBtn}
            disabled={selectedPaymentId === 'corp-card'}
            onClick={() => {
              setPaymentDrawerOpen(false)
            }}
          >
            Change payment
          </button>
        </div>
      </div>

      {/* ── Promo Code Drawer ── */}
      {promoDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setPromoDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${promoDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Promo code</span>
            <span className={styles.addProductDrawerSub}>Enter a promo code to apply a discount or special offer.</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setPromoDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style={{padding:'40px 60px 0'}}>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontSize:'12px',fontWeight:'500',color:'#5C5C5C'}}>Promo code</label>
            <input
              type="text"
              autoFocus
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER25"
              style={{height:'40px',border:'1.5px solid #D6D6D6',borderRadius:'10px',padding:'0 14px',fontSize:'14px',fontFamily:'inherit',outline:'none',letterSpacing:'0.04em',transition:'border-color 0.15s'}}
              onFocus={e => e.target.style.borderColor='#0366DD'}
              onBlur={e => e.target.style.borderColor='#D6D6D6'}
              onKeyDown={e => { if (e.key === 'Enter' && promoCode.trim()) { setPromoApplied(promoCode.trim()); setPromoDrawerOpen(false) }}}
            />
          </div>
        </div>
        <div className={styles.addrDrawerFooter} style={{borderTop:'none'}}>
          <button
            className={styles.addrChangeBtn}
            disabled={!promoCode.trim()}
            onClick={() => { setPromoApplied(promoCode.trim()); setPromoDrawerOpen(false) }}
          >
            Apply code
          </button>
        </div>
      </div>

      {/* ── Shipping Drawer ── */}
      {shippingDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setShippingDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${shippingDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <span className={styles.addrDrawerTitle}>Delivery option</span>
          <button className={styles.addrDrawerClose} onClick={() => setShippingDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.addrDrawerList}>
          {SHIPPING_OPTIONS.map(opt => {
            const isActive = opt.id === selectedShippingId
            return (
              <div
                key={opt.id}
                className={`${styles.addrCard} ${isActive ? styles.addrCardActive : ''}`}
                onClick={() => setSelectedShippingId(opt.id)}
              >
                <div className={`${styles.addProductItemCheck} ${isActive ? styles.addProductItemCheckOn : ''}`}>
                  {isActive && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                </div>
                <div className={styles.addrCardBody}>
                  <span className={styles.addrCardName}>{opt.label}</span>
                  <span className={styles.addrCardStreet}>{opt.days}</span>
                  <span className={styles.addrCardCity}>{opt.price}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.addrDrawerFooter}>
          <button
            className={styles.addrChangeBtn}
            disabled={shippingItemIdx !== null && deliveryToShippingId(liveItems[shippingItemIdx]?.delivery) === selectedShippingId}
            onClick={() => {
              if (shippingItemIdx !== null) {
                setLiveItems(prev => prev.map((it, j) =>
                  j === shippingItemIdx ? { ...it, delivery: shippingIdToDelivery(selectedShippingId) } : it
                ))
              }
              setShippingDrawerOpen(false)
            }}
          >
            Change delivery
          </button>
        </div>
      </div>

      {/* ── Cost Center Drawer ── */}
      {ccDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setCcDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${ccDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Cost centers</span>
            <span className={styles.addProductDrawerSub}>Select one or more cost centers</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setCcDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search */}
        <div className={styles.addProductSearchWrap} style={{margin: '16px 60px 0'}}>
          <span className={`material-symbols-outlined ${styles.addProductSearchIcon}`}>search</span>
          <input
            className={styles.addProductSearchInput}
            type="text"
            placeholder="Search cost centers…"
            value={ccDrawerSearch}
            onChange={e => setCcDrawerSearch(e.target.value)}
          />
          {ccDrawerSearch && (
            <button className={styles.addProductSearchClear} onClick={() => setCcDrawerSearch('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Category dropdown */}
        {(() => {
          const activeTab = CC_TABS.find(t => t.id === ccDrawerTab) || CC_TABS[0]
          const activeCount = (COST_CENTER_OPTIONS[ccDrawerTab] || []).filter(cc => ccDrawerSelected.includes(cc.id)).length
          return (
            <div className={styles.poDropdownWrap} data-cc-dropdown>
              <button
                className={styles.poDropdownBtn}
                onClick={() => setCcDropdownOpen(o => !o)}
              >
                <span className={styles.poDropdownBtnLabel}>{activeTab.label}</span>
                {activeCount > 0 && (
                  <span className={styles.poDrawerTabBadge}>{activeCount}</span>
                )}
                <span className={`material-symbols-outlined ${styles.poDropdownChevron} ${ccDropdownOpen ? styles.poDropdownChevronOpen : ''}`}>expand_more</span>
              </button>
              {ccDropdownOpen && (
                <div className={styles.poDropdownMenu}>
                  {CC_TABS.map(tab => {
                    const count = (COST_CENTER_OPTIONS[tab.id] || []).filter(cc => ccDrawerSelected.includes(cc.id)).length
                    return (
                      <button
                        key={tab.id}
                        className={`${styles.poDropdownItem} ${ccDrawerTab === tab.id ? styles.poDropdownItemActive : ''}`}
                        onClick={() => { setCcDrawerTab(tab.id); setCcDrawerSearch(''); setCcDropdownOpen(false) }}
                      >
                        <span className={styles.poDropdownItemLabel}>{tab.label}</span>
                        {count > 0 && <span className={styles.poDrawerTabBadge}>{count}</span>}
                        {ccDrawerTab === tab.id && (
                          <span className={`material-symbols-outlined ${styles.poDropdownItemCheck}`}>check</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        <div className={styles.addrDrawerList}>
          {ccTabItems.length === 0 ? (
            <div className={styles.addProductEmptyState} style={{padding: '32px 24px'}}>
              <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>search_off</span>
              <span className={styles.addProductEmptyTitle}>No results found</span>
              <span className={styles.addProductEmptyHint}>Try a different search term</span>
            </div>
          ) : ccTabItems.map(cc => {
            const isChecked = ccDrawerSelected.includes(cc.id)
            return (
              <div
                key={cc.id}
                className={`${styles.addrCard} ${isChecked ? styles.addrCardActive : ''}`}
                onClick={() => toggleCc(cc.id)}
              >
                <div className={`${styles.addProductItemCheck} ${isChecked ? styles.addProductItemCheckOn : ''}`}>
                  {isChecked && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                </div>
                <div className={styles.addrCardBody}>
                  <span className={styles.addrCardName}>{cc.name}</span>
                  <span className={styles.addrCardStreet}>{cc.sub}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.addrDrawerFooter}>
          <button
            className={styles.addrChangeBtn}
            disabled={
              ccDrawerItemIdx !== null &&
              JSON.stringify([...(liveItems[ccDrawerItemIdx]?.costCenters || [])].sort()) === JSON.stringify([...ccDrawerSelected].sort())
            }
            onClick={() => {
              if (ccDrawerItemIdx !== null && ccDrawerSelected.length > 0) {
                setLiveItems(prev => prev.map((it, j) =>
                  j === ccDrawerItemIdx ? { ...it, costCenters: [...ccDrawerSelected] } : it
                ))
              }
              setCcDrawerOpen(false)
            }}
          >
            Apply{ccDrawerSelected.length > 0 ? ` (${ccDrawerSelected.length})` : ''}
          </button>
        </div>
      </div>

      {/* ── History Drawer ── */}
      {historyDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setHistoryDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${historyDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Order history</span>
            <span className={styles.addProductDrawerSub}>All changes made to this order</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setHistoryDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {orderHistory.length === 0 ? (
          <div className={styles.addProductEmptyState} style={{padding: '48px 32px'}}>
            <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>history</span>
            <span className={styles.addProductEmptyTitle}>No activity yet</span>
            <span className={styles.addProductEmptyHint}>Changes made to this order will appear here</span>
          </div>
        ) : (
        <div className={styles.historyList}>
          {orderHistory.slice().reverse().map((entry, idx, arr) => (
            <div key={entry.id} className={styles.historyItem}>
              <div className={styles.historyLeft}>
                <div className={styles.historyAvatar}>{entry.initials}</div>
                {idx < arr.length - 1 && <div className={styles.historyLine} />}
              </div>
              <div className={styles.historyContent}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyUser}>{entry.user}</span>
                  <span className={styles.historyAction}>{entry.action}</span>
                </div>
                <span className={styles.historyDetail}>{entry.detail}</span>
                <span className={styles.historyTime}>{entry.time}</span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* ── Recipient Drawer ── */}
      {recipientDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setRecipientDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${styles.addProductDrawer} ${recipientDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Add recipient</span>
            <span className={styles.addProductDrawerSub}>Search and select who will receive this order</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setRecipientDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search */}
        <div className={styles.addProductSearchWrap} style={{margin: '16px 60px 8px'}}>
          <span className={`material-symbols-outlined ${styles.addProductSearchIcon}`}>search</span>
          <input
            className={styles.addProductSearchInput}
            type="text"
            placeholder="Search by name or role…"
            value={recipientSearch}
            onChange={e => setRecipientSearch(e.target.value)}
            autoFocus
          />
          {recipientSearch && (
            <button className={styles.addProductSearchClear} onClick={() => setRecipientSearch('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className={`${styles.addProductResults} ${styles.recipientResultsWrap}`}>
          {recipientSearch.trim() === '' ? (
            <div className={styles.addProductEmptyState}>
              <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>person_search</span>
              <span className={styles.addProductEmptyTitle}>Search for a recipient</span>
              <span className={styles.addProductEmptyHint}>Type a name or email address</span>
            </div>
          ) : recipientResults.length === 0 ? (
            <div className={styles.addProductEmptyState}>
              <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>search_off</span>
              <span className={styles.addProductEmptyTitle}>No contacts found</span>
              <span className={styles.addProductEmptyHint}>Try a different name or email</span>
            </div>
          ) : (
            <div className={styles.addProductList}>
              {recipientResults.map(r => {
                const isActive = selectedRecipient?.id === r.id
                return (
                  <div
                    key={r.id}
                    className={`${styles.addProductItem} ${isActive ? styles.addProductItemChecked : ''}`}
                    onClick={() => setSelectedRecipient(isActive ? null : r)}
                  >
                    <div className={styles.recipientAvatar}>{r.initials}</div>
                    <div className={styles.addProductItemInfo}>
                      <span className={styles.addProductItemName}>{r.name}</span>
                      <span className={styles.addProductItemSku}>{r.email}</span>
                    </div>
                    {isActive && (
                      <span className="material-symbols-outlined" style={{fontSize:'20px', color:'#0366DD', marginLeft:'auto', flexShrink:0, fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.addProductFooter}>
          <span className={styles.addProductFooterInfo}>
            {selectedRecipient ? selectedRecipient.name : 'No recipient selected'}
          </span>
          <button
            className={styles.addProductFooterBtn}
            disabled={!selectedRecipient}
            onClick={() => {
              setRecipientDrawerOpen(false)
            }}
          >
            Confirm
          </button>
        </div>
      </div>

      {/* ── PO / Accounting Drawer ── */}
      {poDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setPoDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${poDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Accounting fields</span>
            <span className={styles.addProductDrawerSub}>Select PO numbers, call-centers or releases</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setPoDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search */}
        <div className={styles.addProductSearchWrap} style={{margin: '16px 60px 0'}}>
          <span className={`material-symbols-outlined ${styles.addProductSearchIcon}`}>search</span>
          <input
            className={styles.addProductSearchInput}
            type="text"
            placeholder="Search…"
            value={poDrawerSearch}
            onChange={e => setPoDrawerSearch(e.target.value)}
          />
          {poDrawerSearch && (
            <button className={styles.addProductSearchClear} onClick={() => setPoDrawerSearch('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Category dropdown */}
        {(() => {
          const PO_CATS = [
            { key: 'po', label: 'PO Number' },
            { key: 'callcenter', label: 'Call-center' },
            { key: 'release', label: 'Release' },
          ]
          const active = PO_CATS.find(c => c.key === poDrawerTab)
          return (
            <div className={styles.poDropdownWrap} data-po-dropdown>
              <button
                className={styles.poDropdownBtn}
                onClick={() => setPoDropdownOpen(o => !o)}
              >
                <span className={styles.poDropdownBtnLabel}>{active.label}</span>
                {poSelected[poDrawerTab].length > 0 && (
                  <span className={styles.poDrawerTabBadge}>{poSelected[poDrawerTab].length}</span>
                )}
                <span className={`material-symbols-outlined ${styles.poDropdownChevron} ${poDropdownOpen ? styles.poDropdownChevronOpen : ''}`}>expand_more</span>
              </button>
              {poDropdownOpen && (
                <div className={styles.poDropdownMenu}>
                  {PO_CATS.map(c => (
                    <button
                      key={c.key}
                      className={`${styles.poDropdownItem} ${poDrawerTab === c.key ? styles.poDropdownItemActive : ''}`}
                      onClick={() => { setPoDrawerTab(c.key); setPoDrawerSearch(''); setPoDropdownOpen(false) }}
                    >
                      <span className={styles.poDropdownItemLabel}>{c.label}</span>
                      {poSelected[c.key].length > 0 && (
                        <span className={styles.poDrawerTabBadge}>{poSelected[c.key].length}</span>
                      )}
                      {poDrawerTab === c.key && (
                        <span className={`material-symbols-outlined ${styles.poDropdownItemCheck}`}>check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* List */}
        <div className={styles.addrDrawerList} style={{paddingTop: 14}}>
          {poTabItems.length === 0 ? (
            <div className={styles.addProductEmptyState} style={{padding: '32px 0'}}>
              <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>search_off</span>
              <span className={styles.addProductEmptyHint}>No results found</span>
            </div>
          ) : poTabItems.map(item => {
            const isChecked = poSelected[poDrawerTab].includes(item.id)
            return (
              <div
                key={item.id}
                className={`${styles.addrCard} ${isChecked ? styles.addrCardActive : ''}`}
                onClick={() => togglePoItem(poDrawerTab, item.id)}
              >
                <div className={`${styles.addProductItemCheck} ${isChecked ? styles.addProductItemCheckOn : ''}`}>
                  {isChecked && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                </div>
                <div className={styles.addrCardBody}>
                  <span className={styles.addrCardName}>{item.name}</span>
                  <span className={styles.addrCardStreet}>{item.sub}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className={styles.addProductFooter}>
          <span className={styles.addProductFooterInfo}>
            {Object.values(poSelected).flat().length === 0
              ? 'Nothing selected'
              : `${Object.values(poSelected).flat().length} selected`}
          </span>
          <button className={styles.addProductFooterBtn} onClick={() => setPoDrawerOpen(false)}>
            Confirm
          </button>
        </div>
      </div>

      {/* ── Add Product Drawer ── */}
      {addProductDrawerOpen && (
        <div className={styles.addrDrawerOverlay} onClick={() => setAddProductDrawerOpen(false)} />
      )}
      <div className={`${styles.addrDrawer} ${styles.addProductDrawer} ${addProductDrawerOpen ? styles.addrDrawerOpen : ''}`}>
        <div className={styles.addrDrawerHeader}>
          <div className={styles.addProductDrawerTitleBlock}>
            <span className={styles.addrDrawerTitle}>Add products</span>
            <span className={styles.addProductDrawerSub}>Search and select items to add</span>
          </div>
          <button className={styles.addrDrawerClose} onClick={() => setAddProductDrawerOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.addProductSearchWrap}>
          <span className={`material-symbols-outlined ${styles.addProductSearchIcon}`}>search</span>
          <input
            className={styles.addProductSearchInput}
            type="text"
            placeholder="Search by name, SKU, category…"
            value={addProductSearch}
            onChange={e => setAddProductSearch(e.target.value)}
            autoFocus
          />
          {addProductSearch && (
            <button className={styles.addProductSearchClear} onClick={() => setAddProductSearch('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <div className={styles.addProductResults}>
          {addProductSearch.trim() === '' ? (
            <div className={styles.addProductEmptyState}>
              <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>search</span>
              <span className={styles.addProductEmptyTitle}>Search for products</span>
              <span className={styles.addProductEmptyHint}>Type a product name, SKU or category</span>
            </div>
          ) : addProductResults.length === 0 ? (
            <div className={styles.addProductEmptyState}>
              <span className={`material-symbols-outlined ${styles.addProductEmptyIcon}`}>search_off</span>
              <span className={styles.addProductEmptyTitle}>No results found</span>
              <span className={styles.addProductEmptyHint}>Try a different name or SKU</span>
            </div>
          ) : (
            <>
              <div className={styles.addProductResultsHeader}>
                <span className={styles.addProductResultsCount}>{addProductResults.length} result{addProductResults.length !== 1 ? 's' : ''}</span>
              </div>
              <div className={styles.addProductList}>
                {addProductResults.map(p => {
                  const isChecked = !!addProductSelected[p.id]
                  const qty = addProductSelected[p.id] || 1
                  return (
                    <div
                      key={p.id}
                      className={`${styles.addProductItem} ${isChecked ? styles.addProductItemChecked : ''}`}
                      onClick={() => setAddProductSelected(prev => {
                        if (prev[p.id]) { const n = {...prev}; delete n[p.id]; return n }
                        return { ...prev, [p.id]: 1 }
                      })}
                    >
                      <div className={`${styles.addProductItemCheck} ${isChecked ? styles.addProductItemCheckOn : ''}`}>
                        {isChecked && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#ffffff',fontVariationSettings:"'FILL' 1,'wght' 700"}}>check</span>}
                      </div>
                      <img className={styles.addProductItemImg} src={p.img} alt={p.name} />
                      <div className={styles.addProductItemInfo}>
                        <span className={styles.addProductItemName}>{p.name}</span>
                        <span className={styles.addProductItemSku}>{p.sku}</span>
                        {p.availability === 'Out of stock' && (
                          <span className={`${styles.stockBadge} ${styles.stockBadgeOut}`}>Out of stock</span>
                        )}
                        {p.availability === 'Low stock' && (
                          <span className={`${styles.stockBadge} ${styles.stockBadgeLow}`}>Low stock</span>
                        )}
                      </div>
                      <div className={styles.addProductItemRight}>
                        <span className={styles.addProductItemPrice}>${p.price.toFixed(2)}</span>
                        <span className={styles.qtyStepper} onClick={e => e.stopPropagation()}>
                          <button className={styles.qtyBtn} onClick={e => { e.stopPropagation(); setAddProductSelected(prev => prev[p.id] ? { ...prev, [p.id]: Math.max(1, prev[p.id] - 1) } : prev) }}>
                            <span className="material-symbols-outlined" style={{fontSize:'16px',lineHeight:1}}>remove</span>
                          </button>
                          <input
                            className={styles.qtyVal}
                            type="text"
                            value={isChecked ? qty : 1}
                            readOnly
                          />
                          <button className={styles.qtyBtn} onClick={e => { e.stopPropagation(); setAddProductSelected(prev => prev[p.id] ? { ...prev, [p.id]: prev[p.id] + 1 } : prev) }}>
                            <span className="material-symbols-outlined" style={{fontSize:'16px',lineHeight:1}}>add</span>
                          </button>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        {/* Footer */}
        {(() => {
          const selectedCount = Object.keys(addProductSelected).length
          return (
            <div className={styles.addProductFooter}>
              <span className={styles.addProductFooterInfo}>
                {selectedCount === 0 ? 'No items selected' : `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`}
              </span>
              <button
                className={styles.addProductFooterBtn}
                disabled={selectedCount === 0}
              >
                Add products
              </button>
            </div>
          )
        })()}
      </div>

      {/* ── Left Nav Drawer ── */}
      <div className={`${styles.drawer} ${showDrawer ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLogo} onClick={() => repMode ? window.location.href = '/salesapp/home' : onClose()} style={{ cursor: 'pointer' }}>Demo Store</span>
          <button className={styles.railBtn} aria-label="Close sidebar" onClick={() => setShowDrawer(false)}>
            <span className="material-symbols-outlined">dock_to_right</span>
          </button>
        </div>
        <div className={styles.drawerNav}>
          <button className={styles.drawerNavItem}>
            <span className="material-symbols-outlined">add</span>
            New order
          </button>
          <button className={styles.drawerNavItem}>
            <span className="material-symbols-outlined">contract_edit</span>
            Orders
          </button>
        </div>
        <div className={styles.drawerSection}>
          <span className={styles.drawerSectionLabel}>Orders</span>
          <div className={styles.drawerOrderList}>
            {mockOrders.map((order) => (
              <button key={order} className={styles.drawerOrderItem}>{order}</button>
            ))}
          </div>
        </div>
        <div className={styles.drawerFooter}>
          <div className={styles.avatar} style={repCustomer && repCustomer.name !== 'Stellar Global' ? {background:'#EBF3FF'} : {}}>
            {repCustomer && repCustomer.name !== 'Stellar Global'
              ? <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#0366DD',fontVariationSettings:"'wght' 300"}}>apartment</span>
              : <img src={asset('/logo-stellarglobal.png')} alt="Stellar Global" />}
          </div>
          <span className={styles.drawerFooterName}>{repCustomer ? repCustomer.name : 'Stellar Global'}</span>
          <span className={styles.spacer} />
          <button className={styles.iconBtn} aria-label="More options">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Drawer backdrop */}
      {showDrawer && (
        <div className={styles.drawerBackdrop} onClick={() => setShowDrawer(false)} />
      )}

      {/* ── Left panel ── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftBody}>

          {/* Icon rail */}
          <div className={styles.iconRail}>
            <div className={styles.railTop}>
              {repMode ? (
                <button className={styles.railBtn} aria-label="Collapse sidebar" onClick={() => setShowDrawer(true)}>
                  <span className="material-symbols-outlined">dock_to_right</span>
                </button>
              ) : (
                <button className={styles.railBtn} aria-label="Back to Home" data-tooltip="Back to Home" onClick={() => onClose()}>
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              {repMode && (
                <>
                  <button className={styles.railBtn} aria-label="New order" onClick={() => setShowDrawer(true)}>
                    <span className="material-symbols-outlined">add</span>
                  </button>
                  <button className={styles.railBtn} aria-label="Order history" onClick={() => setShowDrawer(true)}>
                    <span className="material-symbols-outlined">contract_edit</span>
                  </button>
                </>
              )}
            </div>
            <div className={styles.railBottom}>
              <div className={styles.avatar} aria-label="User avatar" onClick={() => repMode ? setShowDrawer(true) : setAccountDrawerOpen(true)} style={{ cursor: 'pointer', background: repCustomer && repCustomer.name !== 'Stellar Global' ? '#EBF3FF' : undefined }}>
                {repCustomer && repCustomer.name !== 'Stellar Global'
                  ? <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#0366DD',fontVariationSettings:"'wght' 300"}}>apartment</span>
                  : <img src={asset('/logo-stellarglobal.png')} alt="Stellar Global" />}
              </div>
            </div>
          </div>

          {/* Chat column: header + messages + input */}
          <div className={styles.chatColumn}>

            {/* Top bar */}
            <div className={styles.leftTopBar}>
              <button className={styles.titleBtn} aria-label="Order Builder menu">
                <span className={styles.panelTitle}>Order Builder</span>
                <span className="material-symbols-outlined">arrow_drop_down</span>
              </button>
              <span className={styles.spacer} />
              <button className={styles.iconBtn} aria-label="More options">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            {/* Chat area */}
            <div className={styles.chatArea}>
              <div className={styles.chatMessages}>
                <div className={`${styles.aiMessage} ${styles.aiMessageIntro}`}>
                  {repMode && !newOrder ? (
                    <>
                      <div className={styles.quoteCard} style={{marginBottom:'16px'}}>
                        <div className={styles.quoteCardHeader}>
                          <span className={styles.quoteCardTitle}>ORD-2023-XYZ-789</span>
                          <div className={styles.quoteCardStatus}>
                            <span className={styles.quoteCardDot} />
                            <span className={styles.quoteCardStatusLabel}>Requested</span>
                          </div>
                          <button className={styles.quoteCardMenu} type="button">
                            <span className="material-symbols-outlined">more_horiz</span>
                          </button>
                        </div>
                        <div className={styles.quoteCardBody}>
                          <div className={styles.quoteCardDiscount}>Hotel equipment order · 112 items</div>
                          <div className={styles.quoteCardMeta}>Buyer: <a href="#" style={{color:'#0366DD',textDecoration:'none'}}>Stellar Global</a></div>
                          <div className={styles.quoteCardMeta}>Profile: <a href="#" style={{color:'#0366DD',textDecoration:'none'}}>Donald Green</a></div>
                          <div className={styles.quoteCardMeta}>Total: <strong style={{color:'#1F1F1F'}}>$33,726.18</strong></div>
                        </div>
                      </div>
                      <p>
                        Hi, Andrew! <strong>Donald Green</strong> from <strong>Stellar Global</strong> sent the following message:
                      </p>
                      <blockquote className={styles.buyerQuote}>
                        &ldquo;I&rsquo;m equipping dozens of rooms for my hotel chain and would like a quote with the best prices. I&rsquo;m considering other offers as well &mdash; let me know what you can do for me.&rdquo;
                      </blockquote>
                      <p>
                        I have a few suggestions that could strengthen this offer. <strong>Shall I walk you through them?</strong>
                      </p>
                      <p className={styles.disclaimer}>
                        AI responses may contain errors.{' '}
                        <button className={styles.learnMoreBtn}>Learn more</button>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Hello! I&rsquo;m the <strong>Order Builder</strong>.
                      </p>
                      <p>I&rsquo;m here to help you create a new order.</p>
                      <p>
                        To get started, upload a structured file and I&rsquo;ll use it to fill in the
                        order for you. You can select a file from your computer or simply drag and drop
                        it here.
                      </p>
                      <p>
                        <strong>Supported formats</strong>: docx, csv, xlsx and txt.
                      </p>
                      <p>
                        Once the file is uploaded, I&rsquo;ll extract the information and build the
                        order automatically.
                      </p>
                      <p>
                        <strong>How would you like to proceed?</strong>
                      </p>
                      <ol>
                        <li>Upload a file to build the order</li>
                        <li>Drag and drop a supported document</li>
                      </ol>
                      <p>I&rsquo;m here to help along the way.</p>
                      <p className={styles.disclaimer}>
                        AI responses may contain errors.{' '}
                        <button className={styles.learnMoreBtn}>Learn more</button>
                      </p>
                    </>
                  )}
                </div>

                {chatMessages.map((msg, i) => (
                  msg.type === 'ai' ? (
                    <div key={i} className={`${styles.aiMessage} ${styles.aiMessageAnimated}`}>
                      {msg.reasoned && <ReasonedToggle />}
                      {msg.text.split('\n').map((line, j) => {
                        if (!line) return null
                        const renderInline = (str) => {
                          const parts = str.split(/(\*\*.*?\*\*|\[\[.*?\]\])/g)
                          return parts.map((part, k) => {
                            if (part.startsWith('**') && part.endsWith('**')) return <strong key={k}>{part.slice(2,-2)}</strong>
                            if (part.startsWith('[[') && part.endsWith(']]')) return <a key={k} href="#" className={styles.inlineLink}>{part.slice(2,-2)}</a>
                            return part
                          })
                        }
                        if (/^\d+\./.test(line)) return <p key={j} style={{paddingLeft:'16px'}}>{renderInline(line)}</p>
                        return <p key={j}>{renderInline(line)}</p>
                      })}
                      {msg.draftMessage && (
                        <blockquote className={styles.buyerQuote} style={{marginTop:'10px', whiteSpace:'pre-line'}}>
                          {msg.draftMessage}
                        </blockquote>
                      )}
                      {msg.draftOptions && (
                        <div style={{marginTop:'10px'}}>
                          <p><strong>1.</strong> Edit message</p>
                          <p><strong>2.</strong> Send proposal with this message</p>
                        </div>
                      )}
                      {msg.backToHome && (
                        <div style={{display:'flex', justifyContent:'center', marginTop:'4px'}}>
                        <button
                          onClick={() => fadeNavigate('/salesapp/home')}
                          style={{
                            marginTop: '12px',
                            padding: '7px 12px',
                            background: 'none',
                            border: '1.5px solid #D0D0D0',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#3D3D3D',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'border-color 0.15s, color 0.15s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F1F1F'; e.currentTarget.style.color = '#1F1F1F' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D0D0D0'; e.currentTarget.style.color = '#3D3D3D' }}
                        >
                          <span className="material-symbols-outlined" style={{fontSize:'14px'}}>arrow_back</span>
                          Back to Home
                        </button>
                        </div>
                      )}
                      {msg.quoteCard && (
                        <>
                        <div className={styles.quoteCard}>
                          <div className={styles.quoteCardHeader}>
                            <span className={styles.quoteCardTitle}>Quote request</span>
                            <div className={styles.quoteCardStatus}>
                              <span className={styles.quoteCardDot} />
                              <span className={styles.quoteCardStatusLabel}>Requested</span>
                            </div>
                            <button className={styles.quoteCardMenu} type="button">
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                          </div>
                          <div className={styles.quoteCardBody}>
                            {msg.quoteCard.pct && (
                              <div className={styles.quoteCardDiscount}>{msg.quoteCard.pct}% discount requested</div>
                            )}
                            <div className={styles.quoteCardMeta}>Submitted {msg.quoteCard.date}</div>
                            <div className={styles.quoteCardMeta}>{msg.quoteCard.items} items · $33,726.18</div>
                            <div className={styles.quoteCardMeta}>Assigned to <strong style={{color:'#ADADAD',fontStyle:'italic',fontWeight:500}}>To be assigned</strong></div>
                            <div className={styles.quoteCardMeta}>Expected response within <strong style={{color:'#1F1F1F'}}>2 business days</strong></div>
                          </div>
                        </div>
                        <div style={{display:'flex', justifyContent:'center', marginTop:'12px'}}>
                          <button
                            onClick={() => fadeNavigate('/storefrontb2b')}
                            style={{padding:'7px 12px',background:'none',border:'1.5px solid #D0D0D0',borderRadius:'100px',fontSize:'12px',fontWeight:'600',color:'#3D3D3D',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'5px',transition:'border-color 0.15s, color 0.15s',fontFamily:'inherit'}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor='#1F1F1F';e.currentTarget.style.color='#1F1F1F'}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='#D0D0D0';e.currentTarget.style.color='#3D3D3D'}}
                          >
                            <span className="material-symbols-outlined" style={{fontSize:'14px'}}>arrow_back</span>
                            Back to Home
                          </button>
                        </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div key={i} className={styles.userMessageGroup}>
                      {msg.file && (
                        <div className={styles.fileChipBubble}>
                          <div className={styles.fileChipIcon}>
                            <span className="material-symbols-outlined">border_all</span>
                          </div>
                          <div className={styles.fileChipInfo}>
                            <span className={styles.fileChipName}>{msg.file.name}</span>
                            <span className={styles.fileChipType}>{msg.file.type}</span>
                          </div>
                        </div>
                      )}
                      {msg.text && (
                        <div className={styles.userMessage}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  )
                ))}
                {isThinking && (
                  <div className={styles.thinkingIndicator}>
                    {thinkingPhrase.split(' ').map((word, i) => (
                      <span key={i} className={styles.thinkingWord} style={{ animationDelay: `${i * 0.15}s` }}>
                        {word}
                      </span>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className={styles.inputArea}>
                <div
                  className={styles.inputRow}
                  onClick={() => textareaRef.current?.focus()}
                >
                  {selectedContext && (
                    <div className={styles.contextChip}>
                      <span className={`material-symbols-outlined ${styles.contextChipArrow}`}>prompt_suggestion</span>
                      <span className={styles.contextChipLabel}>"{selectedContext.label}"</span>
                      <button className={styles.contextChipClose} onClick={e => { e.stopPropagation(); setSelectedContext(null) }} aria-label="Remove context">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}
                  {attachedFile && (
                    <div className={styles.fileChip}>
                      <div className={`${styles.fileChipIcon} ${attachedFile.loading ? styles.fileChipIconBlue : ''}`}>
                        {attachedFile.loading
                          ? <div className={styles.fileChipSpinner} />
                          : <span className="material-symbols-outlined">border_all</span>
                        }
                      </div>
                      <div className={styles.fileChipInfo}>
                        <span className={styles.fileChipName}>{attachedFile.name}</span>
                        <span className={styles.fileChipType}>
                          {attachedFile.loading ? 'Uploading your file...' : attachedFile.type}
                        </span>
                      </div>
                      <button
                        className={styles.fileChipRemove}
                        onClick={e => { e.stopPropagation(); setAttachedFile(null) }}
                        aria-label="Remove file"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    className={styles.messageInput}
                    placeholder="Message..."
                    value={message}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <div className={styles.inputActions}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.docx,.csv,.xlsx,.txt"
                      style={{ display: 'none' }}
                      onChange={e => {
                        attachFile(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                    <button className={styles.attachBtn} aria-label="Attach file" data-tooltip="Adicionar arquivo" onClick={() => fileInputRef.current?.click()}>
                      <span className="material-symbols-outlined">attach_file</span>
                    </button>
                    <button
                      className={styles.sendBtn}
                      aria-label="Send message"
                      onClick={handleSend}
                      disabled={(!message.trim() && !attachedFile) || attachedFile?.loading}
                    >
                      <span className="material-symbols-outlined">arrow_upward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>{/* end chatColumn */}
        </div>{/* end leftBody */}
      </div>{/* end leftPanel */}

      {/* ── Right panel ── */}
      <div className={styles.rightPanel}>

        {/* Right panel top bar */}
        <div className={styles.rightTopBar}>
          <div className={styles.orderTitleGroup}>
            <span className={styles.orderTitle}>ORD-2023-XYZ-789</span>
            <span className={styles.draftBadge}>
              <span className={`${styles.draftDot} ${repBuyerPending ? styles.draftDotGreen : quotePending || (repMode && !newOrder) ? styles.draftDotPending : ''}`} aria-hidden="true" />
              {quotePending ? 'Requested' : repBuyerPending ? 'Revised' : (repMode && !newOrder) ? 'Requested' : 'Draft'}
            </span>
          </div>
          <span className={styles.spacer} />
          <div className={styles.topBarActions}>
            <button className={styles.iconBtn} aria-label="Download" data-tooltip="Download">
              <span className="material-symbols-outlined">file_download</span>
            </button>
            <button className={styles.iconBtn} aria-label="Comments" data-tooltip="Comments">
              <span className="material-symbols-outlined">chat_bubble_outline</span>
            </button>
            {orderHistory.length > 0 && (
              <button className={styles.iconBtn} aria-label="History" data-tooltip="History" onClick={() => setHistoryDrawerOpen(true)}>
                <span className="material-symbols-outlined">history</span>
              </button>
            )}
            <button className={styles.iconBtn} aria-label="More options" data-tooltip="More options">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>

        {/* Filling overlay */}
        {isFilling && (
          <div className={styles.fillingOverlay}>
            <span className={styles.fillingLabel}>Filling out order...</span>
            <div className={styles.fillingBarTrack}>
              <div className={styles.fillingBarFill} />
            </div>
            <button className={styles.fillingCancelBtn} onClick={cancelFilling}>Cancel</button>
          </div>
        )}

        {/* Details content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff', visibility: isFilling ? 'hidden' : 'visible' }}>
          <div className={styles.detailsContent}>

            {/* Quote pending banner */}
            {quotePending && !quoteBannerDismissed && (
              <div className={styles.quoteBanner}>
                <svg className={styles.quoteBannerIcon} xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#E8920A"><path d="m40-120 440-760 440 760H40Zm468.5-131.5Q520-263 520-280t-11.5-28.5Q497-320 480-320t-28.5 11.5Q440-297 440-280t11.5 28.5Q463-240 480-240t28.5-11.5ZM440-360h80v-200h-80v200Z"/></svg>
                <span className={styles.quoteBannerText}>
                  This order includes a pending quote request. Any changes to its content will immediately revoke the quote.
                </span>
                <button className={styles.quoteBannerBtn} aria-label="More options">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
                <button className={styles.quoteBannerBtn} aria-label="Dismiss" onClick={() => setQuoteBannerDismissed(true)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )}

            {/* Summary — metadata grid */}
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionHeader}>
                <span className={styles.detailsSectionTitle}>Summary</span>
              </div>
              <div className={styles.metaGrid}>
                {(quotePending || repMode || repBuyerPending) ? (<>
                  {newOrder ? (<>
                    {/* ── NEW ORDER columns ── */}
                    <div className={styles.metaCol}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">person_edit</span></span>
                        <span className={styles.metaLabel}>Origin</span>
                        <span className={styles.metaValue}>Sales App</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">edit</span></span>
                        <span className={styles.metaLabel}>Last update</span>
                        <span className={styles.metaValue}>Just now</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">credit_card</span></span>
                        <span className={styles.metaLabel}>Payment</span>
                        {orderFilled ? <button className={styles.metaPill} onClick={() => setPaymentDrawerOpen(true)}>{activePayment.label}</button> : <span className={styles.metaEmpty}>Not set</span>}
                      </div>
                      <div className={`${styles.metaExpandable} ${metaExpanded ? styles.metaExpandableOpen : ''}`}>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">redeem</span></span>
                          <span className={styles.metaLabel}>Promo code</span>
                          <button className={styles.metaPill} onClick={() => { setPromoCode(promoApplied); setPromoDrawerOpen(true) }}>{promoApplied || 'Add'}</button>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">storefront</span></span>
                          <span className={styles.metaLabel}>Pickup</span>
                          <span className={styles.metaEmpty}>—</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.metaCol}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">badge</span></span>
                        <span className={styles.metaLabel}>Sales Rep</span>
                        <span className={styles.metaValue}>Andrew Miller</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">person</span></span>
                        <span className={styles.metaLabel}>Created by</span>
                        <span className={styles.metaValue}>Andrew Miller</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">group</span></span>
                        <span className={styles.metaLabel}>Buyer</span>
                        <span className={styles.metaValue}>{repCustomer?.contact || 'Donald Green'}</span>
                      </div>
                      <div className={`${styles.metaExpandable} ${metaExpanded ? styles.metaExpandableOpen : ''}`}>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">local_shipping</span></span>
                          <span className={styles.metaLabel}>Delivery addr.</span>
                          <button className={styles.metaPill} onClick={() => { setAddrDrawerTab('address'); setAddressDrawerOpen(true) }}>
                            {activeAddress.shortLabel}{selectedLocation ? ` · ${selectedLocation.label}` : ''}
                          </button>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">person</span></span>
                          <span className={styles.metaLabel}>Recipient</span>
                          <button className={styles.metaPill} onClick={() => { setRecipientSearch(selectedRecipient ? selectedRecipient.name : ''); setRecipientDrawerOpen(true) }}>{selectedRecipient ? selectedRecipient.name : 'Add'}</button>
                        </div>
                      </div>
                    </div>
                  </>) : (<>
                    {/* ── REQUESTED state ── */}
                    <div className={styles.metaCol}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">sell</span></span>
                        <span className={styles.metaLabel}>Quote ID</span>
                        <span className={styles.metaValue}>#9585340993649</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">person_edit</span></span>
                        <span className={styles.metaLabel}>Origin</span>
                        <span className={styles.metaValue}>Cart / Storefront B2B</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">app_badging</span></span>
                        <span className={styles.metaLabel}>Status</span>
                        <span className={styles.metaStatusChip} data-status={repBuyerPending ? 'revised' : 'requested'}>
                          <span className={styles.metaStatusDot} />
                          {repBuyerPending ? 'Revised' : 'Requested'}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">hourglass_empty</span></span>
                        <span className={styles.metaLabel}>Expires on</span>
                        <span className={styles.metaValue}>May 12, 2026 (in 2 weeks)</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">calendar_today</span></span>
                        <span className={styles.metaLabel}>Requested</span>
                        <span className={styles.metaValue}>Apr 28, 2026 – 10:42</span>
                      </div>
                      <div className={`${styles.metaExpandable} ${metaExpanded ? styles.metaExpandableOpen : ''}`}>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">local_shipping</span></span>
                          <span className={styles.metaLabel}>Delivery addr.</span>
                          <button className={styles.metaPill} onClick={() => { setAddrDrawerTab('address'); setAddressDrawerOpen(true) }}>
                            {activeAddress.shortLabel}{selectedLocation ? ` · ${selectedLocation.label}` : ''}
                          </button>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">person</span></span>
                          <span className={styles.metaLabel}>Recipient</span>
                          <button className={styles.metaPill} onClick={() => { setRecipientSearch(selectedRecipient ? selectedRecipient.name : ''); setRecipientDrawerOpen(true) }}>{selectedRecipient ? selectedRecipient.name : 'Add'}</button>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">receipt_long</span></span>
                          <span className={styles.metaLabel}>Billing addr.</span>
                          <span className={styles.metaEmpty}>Same as delivery</span>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">storefront</span></span>
                          <span className={styles.metaLabel}>Pickup</span>
                          <span className={styles.metaEmpty}>—</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.metaCol}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">badge</span></span>
                        <span className={styles.metaLabel}>Sales Rep</span>
                        <span className={styles.metaValue} style={!repItemUpdated ? {color:'#ADADAD',fontStyle:'italic'} : {}}>
                          {repItemUpdated ? 'Andrew Miller' : 'Unassigned'}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">person</span></span>
                        <span className={styles.metaLabel}>Created by</span>
                        <span className={styles.metaValue}>{repCustomer?.contact || 'Donald Green'}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">group</span></span>
                        <span className={styles.metaLabel}>Buyer</span>
                        <span className={styles.metaValue}>{repCustomer?.contact || 'Donald Green'}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">credit_card</span></span>
                        <span className={styles.metaLabel}>Payment</span>
                        {orderFilled ? <button className={styles.metaPill} onClick={() => setPaymentDrawerOpen(true)}>{activePayment.label}</button> : <span className={styles.metaEmpty}>Not set</span>}
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">redeem</span></span>
                        <span className={styles.metaLabel}>Promo code</span>
                        <button className={styles.metaPill} onClick={() => { setPromoCode(promoApplied); setPromoDrawerOpen(true) }}>{promoApplied || 'Add'}</button>
                      </div>
                      <div className={`${styles.metaExpandable} ${metaExpanded ? styles.metaExpandableOpen : ''}`}>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">calculate</span></span>
                          <span className={styles.metaLabel}>Accounting</span>
                          <button className={styles.metaPill} onClick={() => { setPoDrawerSearch(''); setPoDrawerOpen(true) }}>{poAllSelected === 'None' ? 'PO: LS-PO1' : poAllSelected}</button>
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metaIcon}><span className="material-symbols-outlined">edit</span></span>
                          <span className={styles.metaLabel}>Last update</span>
                          <span className={styles.metaValue}>Just now</span>
                        </div>
                      </div>
                    </div>
                  </>)}
                </>) : (<>
                  {/* ── DRAFT state ── */}
                  <div className={styles.metaCol}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaIcon}><span className="material-symbols-outlined">person_edit</span></span>
                      <span className={styles.metaLabel}>Origin</span>
                      <span className={styles.metaValue}>{newOrder ? 'Sales App' : 'Cart / Storefront B2B'}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaIcon}><span className="material-symbols-outlined">edit</span></span>
                      <span className={styles.metaLabel}>Last update</span>
                      <span className={styles.metaValue}>Just now</span>
                    </div>
                    <div className={`${styles.metaExpandable} ${metaExpanded ? styles.metaExpandableOpen : ''}`}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">calculate</span></span>
                        <span className={styles.metaLabel}>Accounting</span>
                        <button className={styles.metaPill} onClick={() => { setPoDrawerSearch(''); setPoDrawerOpen(true) }}>{poAllSelected === 'None' ? 'PO: LS-PO1' : poAllSelected}</button>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">redeem</span></span>
                        <span className={styles.metaLabel}>Promo code</span>
                        <button className={styles.metaPill} onClick={() => { setPromoCode(promoApplied); setPromoDrawerOpen(true) }}>{promoApplied || 'Add'}</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.metaCol}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaIcon}><span className="material-symbols-outlined">credit_card</span></span>
                      <span className={styles.metaLabel}>Payment</span>
                      {orderFilled ? <button className={styles.metaPill} onClick={() => setPaymentDrawerOpen(true)}>{activePayment.label}</button> : <span className={styles.metaEmpty}>Not set</span>}
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaIcon}><span className="material-symbols-outlined">local_shipping</span></span>
                      <span className={styles.metaLabel}>Delivery addr.</span>
                      <button className={styles.metaPill} onClick={() => { setAddrDrawerTab('address'); setAddressDrawerOpen(true) }}>
                        {activeAddress.shortLabel}{selectedLocation ? ` · ${selectedLocation.label}` : ''}
                      </button>
                    </div>
                    <div className={`${styles.metaExpandable} ${metaExpanded ? styles.metaExpandableOpen : ''}`}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">person</span></span>
                        <span className={styles.metaLabel}>Recipient</span>
                        <button className={styles.metaPill} onClick={() => { setRecipientSearch(selectedRecipient ? selectedRecipient.name : ''); setRecipientDrawerOpen(true) }}>{selectedRecipient ? selectedRecipient.name : 'Add'}</button>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">receipt_long</span></span>
                        <span className={styles.metaLabel}>Billing addr.</span>
                        <span className={styles.metaEmpty}>Same as delivery</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><span className="material-symbols-outlined">storefront</span></span>
                        <span className={styles.metaLabel}>Pickup</span>
                        <span className={styles.metaEmpty}>—</span>
                      </div>
                    </div>
                  </div>
                </>)}
                <button className={styles.metaToggle} onClick={() => setMetaExpanded(e => !e)}>
                  {metaExpanded ? 'Show less' : 'Show more'}
                </button>
              </div>
            </div>

            {/* Items */}
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionHeader}>
                <span className={styles.detailsSectionTitle}>Items</span>
                <span className={styles.detailsSectionMeta}>{orderFilled ? <>Items <strong>{liveItems.length}</strong> &nbsp;·&nbsp; Subtotal <strong>{fmt(liveSubtotalNum)}</strong></> : <>Items <strong>0</strong> &nbsp;·&nbsp; Subtotal <strong>$0.00</strong></>}</span>
              </div>
              {orderFilled ? (
                <div className={styles.itemsTable}>
                  <div className={styles.itemsTableHeader}>
                    <span className={styles.itemsColMain}>Line item details</span>
                    <span className={`${styles.itemsColNum} ${styles.itemsColStepper}`}>Quantity</span>
                    {repMode && <span className={`${styles.itemsColNum} ${styles.itemsColStepper}`}>Discount</span>}
                    <span className={styles.itemsColNum}>Unit price</span>
                    <span className={styles.itemsColNum}>Subtotal</span>
                  </div>
                  {liveItems.slice(0, visibleCount).map((item, i) => (
                    <div
                      key={i}
                      className={`${styles.itemsTableRow} ${selectedContext?.label === item.name ? styles.itemsTableRowSelected : ''} ${isCollapsing && i >= 5 ? styles.itemsTableRowCollapse : i >= revealedFrom ? styles.itemsTableRowReveal : ''}`}
                      style={isCollapsing && i >= 5 ? { animationDelay: `${(visibleCount - 1 - i) * 50}ms` } : i >= revealedFrom ? { animationDelay: `${(i - revealedFrom) * 60}ms` } : {}}
                      onClick={() => handleCardClick(item.name)}
                    >
                      <div className={styles.itemsColMain}>
                        <img src={item.img} alt={item.name} className={styles.itemThumb} />
                        <div className={styles.itemDetails}>
                          <span className={styles.itemNameRow}>
                            <span className={styles.itemName}>{item.name}</span>
                            {item.stockStatus === 'out' && (
                              <span className={`${styles.stockBadge} ${styles.stockBadgeOut}`}>Out of stock</span>
                            )}
                            {item.stockStatus === 'low' && (
                              <span className={`${styles.stockBadge} ${styles.stockBadgeLow}`}>Only {item.stockQty} available</span>
                            )}
                          </span>
                          <span className={styles.itemSku}>{item.sku}</span>

                          <span className={styles.itemTags}>
                            {(() => {
                              const shippingLabel = item.delivery === 'Pickup' ? 'Pickup' : item.delivery?.startsWith('Express') ? 'Express shipping' : 'Standard shipping'
                              return (
                                <span className={styles.itemTagsRow}>
                                  {(item.costCenters || []).length > 0 && (
                                    <button className={styles.itemCostCenter} onClick={e => openCcDrawer(e, i)}>
                                      {(item.costCenters).join(' · ')}
                                    </button>
                                  )}
                                  <span className={styles.itemTagSep}>-</span>
                                  <button className={styles.itemCostCenter} onClick={e => openShippingDrawer(e, i)}>{shippingLabel}</button>
                                </span>
                              )
                            })()}
                          </span>
                        </div>
                      </div>
                      <span className={`${styles.itemsColNum} ${styles.itemsColStepper}`}>
                        <span className={styles.qtyStepper}>
                          <button className={styles.qtyBtn} onClick={e => {
                            e.stopPropagation()
                            const oldQty = item.qty
                            const newQty = Math.max(1, oldQty - 1)
                            if (newQty !== oldQty) {
                              setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, qty: newQty } : it))
                            }
                          }}><span className="material-symbols-outlined" style={{fontSize:'16px',lineHeight:1}}>remove</span></button>
                          <input
                            className={styles.qtyVal}
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            value={item.qty}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const raw = e.target.value.replace(/\D/g, '').slice(0, 3)
                              const num = raw === '' ? '' : parseInt(raw, 10)
                              setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, qty: num === '' ? '' : Math.min(999, num) } : it))
                            }}
                            onBlur={e => {
                              const val = parseInt(e.target.value, 10)
                              const newQty = isNaN(val) || val < 1 ? 1 : Math.min(999, val)
                              setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, qty: newQty } : it))
                            }}
                          />
                          <button className={styles.qtyBtn} onClick={e => {
                            e.stopPropagation()
                            setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, qty: it.qty + 1 } : it))
                          }}><span className="material-symbols-outlined" style={{fontSize:'16px',lineHeight:1}}>add</span></button>
                        </span>
                      </span>
                      {repMode && (
                        <span className={`${styles.itemsColNum} ${styles.itemsColStepper}`}>
                          {repOrigItemsRef.current && item.disc !== repOrigItemsRef.current[i]?.disc && (
                            <span className={styles.itemOldPrice}>{repOrigItemsRef.current[i].disc}%</span>
                          )}
                          <span className={styles.qtyStepper}>
                            <button className={styles.qtyBtn} onClick={e => {
                              e.stopPropagation()
                              setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, disc: Math.max(0, it.disc - 1) } : it))
                            }}><span className="material-symbols-outlined" style={{fontSize:'16px',lineHeight:1}}>remove</span></button>
                            <input
                              className={styles.discVal}
                              type="text"
                              inputMode="numeric"
                              maxLength={3}
                              value={item.disc}
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '').slice(0, 3)
                                const num = raw === '' ? 0 : Math.min(100, parseInt(raw, 10))
                                setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, disc: num } : it))
                              }}
                              onBlur={e => {
                                const val = parseInt(e.target.value, 10)
                                const d = isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
                                setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, disc: d } : it))
                              }}
                            />
                            <span className={styles.discPct}>%</span>
                            <button className={styles.qtyBtn} onClick={e => {
                              e.stopPropagation()
                              setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, disc: Math.min(100, it.disc + 1) } : it))
                            }}><span className="material-symbols-outlined" style={{fontSize:'16px',lineHeight:1}}>add</span></button>
                          </span>
                        </span>
                      )}
                      <span className={styles.itemsColNum}>
                        {repMode
                          ? (() => {
                              const orig = repOrigItemsRef.current?.[i]
                              if (!orig) return null
                              const discChanged = item.disc !== orig.disc
                              const unitChanged = item.unitNum !== orig.unitNum
                              if (!discChanged && !unitChanged) return null
                              const origEffective = orig.unitNum * (1 - orig.disc / 100)
                              return <span className={styles.itemOldPrice}>${origEffective.toFixed(2)}</span>
                            })()
                          : item.originalUnitNum && (
                              <span className={styles.itemOldPrice}>${item.originalUnitNum.toFixed(2)}</span>
                            )
                        }
                        {repMode ? (
                          <span className={styles.priceInputWrap}>
                            <span className={styles.priceInputPrefix}>$</span>
                            <input
                              key={`unit-${i}-${item.unitNum}-${item.disc}`}
                              className={styles.priceInput}
                              type="text"
                              inputMode="decimal"
                              defaultValue={(item.unitNum * (1 - item.disc / 100)).toFixed(2)}
                              onClick={e => e.stopPropagation()}
                              onBlur={e => {
                                e.stopPropagation()
                                const val = parseFloat(e.target.value.replace(/[^\d.]/g, ''))
                                if (!isNaN(val) && val >= 0) {
                                  const discFactor = 1 - item.disc / 100
                                  const base = discFactor > 0 ? Math.round(val / discFactor * 100) / 100 : val
                                  setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, unitNum: base, unit: `$${base.toFixed(2)}` } : it))
                                }
                              }}
                            />
                          </span>
                        ) : item.unit}
                      </span>
                      <span className={`${styles.itemsColNum} ${styles.itemsColSubtotal}`}>
                        {repMode
                          ? (() => {
                              const orig = repOrigItemsRef.current?.[i]
                              if (!orig) return null
                              const discChanged = item.disc !== orig.disc
                              const unitChanged = item.unitNum !== orig.unitNum
                              if (!discChanged && !unitChanged) return null
                              const origSub = orig.unitNum * orig.qty * (1 - orig.disc / 100)
                              return <span className={styles.itemOldPrice}>{fmt(origSub)}</span>
                            })()
                          : item.originalUnitNum && (
                              <span className={styles.itemOldPrice}>{fmt(item.originalUnitNum * item.qty)}</span>
                            )
                        }
                        {repMode ? (
                          <span className={styles.priceInputWrap}>
                            <span className={styles.priceInputPrefix}>$</span>
                            <input
                              key={`sub-${i}-${calcItemSub(item).toFixed(2)}`}
                              className={`${styles.priceInput} ${styles.priceInputSub}`}
                              type="text"
                              inputMode="decimal"
                              defaultValue={calcItemSub(item).toFixed(2)}
                              onClick={e => e.stopPropagation()}
                              onBlur={e => {
                                e.stopPropagation()
                                const sub = parseFloat(e.target.value.replace(/[^\d.]/g, ''))
                                if (!isNaN(sub) && sub >= 0) {
                                  const qty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1
                                  const discFactor = 1 - item.disc / 100
                                  const newUnit = discFactor > 0 ? sub / qty / discFactor : sub / qty
                                  const rounded = Math.round(newUnit * 100) / 100
                                  setLiveItems(prev => prev.map((it, j) => j === i ? { ...it, unitNum: rounded, unit: `$${rounded.toFixed(2)}` } : it))
                                }
                              }}
                            />
                          </span>
                        ) : fmt(calcItemSub(item))}
                      </span>
                    </div>
                  ))}
                  <div className={styles.itemsTableFooter}>
                    <span className={styles.itemsTableFooterLeft}>
                      {visibleCount < liveItems.length ? (
                        <button
                          className={styles.showMoreBtn}
                          onClick={() => { setRevealedFrom(visibleCount); setVisibleCount(c => Math.min(c + 5, liveItems.length)) }}
                        >
                          Show {Math.min(5, liveItems.length - visibleCount)} more items
                        </button>
                      ) : (
                        <button
                          className={styles.showMoreBtn}
                          onClick={() => {
                            setIsCollapsing(true)
                            setTimeout(() => {
                              setVisibleCount(5)
                              setRevealedFrom(0)
                              setIsCollapsing(false)
                            }, 350)
                          }}
                        >
                          Show less
                        </button>
                      )}
                      <span className={styles.footerDivider}>|</span>
                      <button className={styles.addProductBtn} onClick={() => { setAddProductSearch(''); setAddProductDrawerOpen(true) }}>Add product</button>
                    </span>
                    <span className={styles.itemsPagination}>
                      1 — {visibleCount} of {liveItems.length} items
                    </span>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyCard}>
                  <span className={styles.emptyText}>No items yet</span>
                  <button className={styles.addProductBtn} onClick={() => { setAddProductSearch(''); setAddProductDrawerOpen(true) }}>Add product</button>
                </div>
              )}
            </div>

            {/* Delivery */}
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionHeader}>
                <span className={styles.detailsSectionTitle}>Delivery Options</span>
                <span className={styles.detailsSectionMeta}>Subtotal <strong>{orderFilled ? '$24.80' : '$0.00'}</strong></span>
              </div>
              <div className={styles.deliveryTable}>
                <div className={styles.deliveryTableHeader}>
                  <span>Method</span>
                  <span>Address</span>
                  <span>Option</span>
                  <span>Items</span>
                  <span>Subtotal</span>
                </div>
                {orderFilled ? (
                  <>
                    <div className={`${styles.deliveryTableRow} ${selectedContext?.label === 'Boston Boylston' ? styles.deliveryTableRowSelected : ''}`} onClick={() => handleCardClick('Boston Boylston')}>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>1. Ship to</span>
                      </div>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>Boston Boylston</span>
                        <span className={styles.deliveryCellSub}>8234 Boylston Street</span>
                        <span className={styles.deliveryCellSub}>Building B, Block 3</span>
                        <span className={styles.deliveryCellSub}>Boston, MA 02467</span>
                        <span className={styles.deliveryCellSub}>United States</span>
                        <span className={styles.deliveryCellGap} />
                        <span className={styles.deliveryCellSub}>DT1731200727786</span>
                        <span className={styles.deliveryCellSub}>Arthur Mast</span>
                        <span className={styles.deliveryCellSub}>(780) 824-6723</span>
                      </div>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>Standard shipping</span>
                        <span className={styles.deliveryCellSub}>Estimated delivery</span>
                        <span className={styles.deliveryCellSub}>5-7 business days</span>
                      </div>
                      <span className={styles.deliveryItemsCount}>48</span>
                      <span className={styles.deliveryCellRight}>$0.00</span>
                    </div>
                    <div className={`${styles.deliveryTableRow} ${selectedContext?.label === 'Springfield Elm' ? styles.deliveryTableRowSelected : ''}`} onClick={() => handleCardClick('Springfield Elm')}>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>2. Ship to</span>
                      </div>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>Boston Boylston</span>
                        <span className={styles.deliveryCellSub}>8234 Boylston Street</span>
                        <span className={styles.deliveryCellSub}>Building B, Block 3</span>
                        <span className={styles.deliveryCellSub}>Boston, MA 02467</span>
                        <span className={styles.deliveryCellSub}>United States</span>
                        <span className={styles.deliveryCellGap} />
                        <span className={styles.deliveryCellSub}>DT1731200727786</span>
                        <span className={styles.deliveryCellSub}>Arthur Mast</span>
                        <span className={styles.deliveryCellSub}>(780) 824-6723</span>
                      </div>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>Express shipping</span>
                        <span className={styles.deliveryCellSub}>Estimated delivery</span>
                        <span className={styles.deliveryCellSub}>1-2 business days</span>
                      </div>
                      <span className={styles.deliveryItemsCount}>64</span>
                      <span className={styles.deliveryCellRight}>$24.80</span>
                    </div>
                    <div className={styles.deliveryTableRow}>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>3. Pickup</span>
                      </div>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>Stellar Global HQ</span>
                        <span className={styles.deliveryCellSub}>500 Technology Square</span>
                        <span className={styles.deliveryCellSub}>Suite 300</span>
                        <span className={styles.deliveryCellSub}>Cambridge, MA 02139</span>
                        <span className={styles.deliveryCellSub}>United States</span>
                        <span className={styles.deliveryCellGap} />
                        <span className={styles.deliveryCellSub}>Mon–Fri, 9am–6pm</span>
                      </div>
                      <div className={styles.deliveryCell}>
                        <span className={styles.deliveryCellLabel}>In-store pickup</span>
                        <span className={styles.deliveryCellSub}>Ready in</span>
                        <span className={styles.deliveryCellSub}>2-3 business days</span>
                      </div>
                      <span className={styles.deliveryItemsCount}>11</span>
                      <span className={styles.deliveryCellRight}>$0.00</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.deliveryEmpty}>No delivery yet</div>
                )}
              </div>
            </div>

            {/* Taxes */}
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionHeader}>
                <span className={styles.detailsSectionTitle}>Taxes</span>
                <span className={styles.detailsSectionMeta}>Subtotal <strong>{orderFilled ? fmt(liveTaxesNum) : '$0.00'}</strong></span>
              </div>
              <div className={styles.taxTable}>
                {orderFilled ? (
                  <>
                    <div className={styles.taxTableHeader}>
                      <span className={styles.taxColMain}>Tax type</span>
                      <span className={styles.taxColNum}>Rate</span>
                      <span className={styles.taxColNum}>Taxable amount</span>
                      <span className={styles.taxColNum}>Tax amount</span>
                    </div>
                    <div className={styles.taxTableRow}>
                      <span className={styles.taxColMain}>
                        <span className={styles.taxName}>State Sales Tax — Massachusetts</span>
                        <span className={styles.taxSub}>Applied to all taxable items</span>
                      </span>
                      <span className={styles.taxColNum}>6.25%</span>
                      <span className={styles.taxColNum}>{fmt(liveSubtotalNum)}</span>
                      <span className={`${styles.taxColNum} ${styles.taxColAmount}`}>{fmt(liveStateTaxNum)}</span>
                    </div>
                    <div className={styles.taxTableRow}>
                      <span className={styles.taxColMain}>
                        <span className={styles.taxName}>City Tax — Boston</span>
                        <span className={styles.taxSub}>Applied to items shipped to Boston</span>
                      </span>
                      <span className={styles.taxColNum}>3.75%</span>
                      <span className={styles.taxColNum}>{fmt(liveBostonSubNum)}</span>
                      <span className={`${styles.taxColNum} ${styles.taxColAmount}`}>{fmt(liveCityTaxNum)}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.deliveryEmpty}>No taxes calculated yet</div>
                )}
              </div>
            </div>

            {/* HIDDEN — Additional data (re-enable when needed)
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionHeader}>
                <span className={styles.detailsSectionTitle}>Additional data</span>
              </div>
              <div className={`${styles.detailsGrid} ${styles.detailsGrid2}`}>
                <div className={styles.detailsCard}>
                  <span className={styles.detailsCardLabel}>Accounting fields</span>
                  <div className={styles.accountingFields}>
                    {(orderFilled ? [
                      ['PO number', 'POSLG019989990005'],
                      ['Cost center', '0002 - Operations'],
                      ['Department', 'Finance'],
                      ['Release', 'RLSOP023045010202'],
                    ] : [
                      ['PO number', 'No PO number yet'],
                      ['Cost center', 'No cost center yet'],
                      ['Department', 'No department yet'],
                      ['Release', 'No release yet'],
                    ]).map(([label, value]) => (
                      <div key={label} className={styles.accountingField}>
                        <span className={styles.accountingFieldLabel}>{label}</span>
                        <span className={orderFilled ? styles.accountingFieldFilled : styles.accountingFieldValue}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.detailsCard}>
                  <span className={styles.detailsCardLabel}>Comments</span>
                  {orderFilled ? (
                    <span className={styles.accountingFieldFilled}>
                      Replenishment requested to restore standard office supply stock levels for Q1 2026, based on recent consumption and forecasted operational needs. This will ensure continuity of operations and avoid ad-hoc purchases.
                    </span>
                  ) : (
                    <span className={styles.detailsEmpty}>No comments yet</span>
                  )}
                </div>
              </div>
            </div>
            */}

            {/* HIDDEN — Budget (re-enable when needed)
            {orderFilled && (
              <div className={styles.detailsSection}>
                <div className={styles.detailsSectionHeader}>
                  <span className={styles.detailsSectionTitle}>Budget</span>
                </div>
                <div className={styles.budgetCard}>
                  <div>
                    <div className={styles.budgetName}>Marketing-DigitalAds-Q4-2024</div>
                    <div className={styles.budgetSub}>OD SLN Training Center</div>
                  </div>
                  <div className={styles.budgetRows}>
                    {[
                      ['Available', '$50,000.00'],
                      ['To be spent', '$33,726.18'],
                      ['Remaining', '$19,748.97'],
                    ].map(([label, value]) => (
                      <div key={label} className={styles.budgetRow}>
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            */}

            {/* Order totals */}
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionHeader}>
                <span className={styles.detailsSectionTitle}>Order totals</span>
              </div>
              <div className={styles.orderTotals}>
                {(orderFilled ? [
                  ['Subtotal', fmt(liveSubtotalNum), repMode && Math.abs(liveSubtotalNum - origSubtotalNum) > 0.01 ? fmt(origSubtotalNum) : null],
                  ['Shipping', fmt(SHIPPING), null],
                  ['Taxes', fmt(liveTaxesNum), null],
                ] : [
                  ['Subtotal', '$0.00', null],
                  ['Shipping', '$0.00', null],
                  ['Taxes', '$0.00', null],
                ]).map(([label, value, origValue]) => (
                  <div key={label} className={styles.orderTotalRow}>
                    <span>{label}</span>
                    <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                      {origValue && <span className={styles.itemOldPrice} style={{fontSize:'inherit',fontWeight:'inherit'}}>{origValue}</span>}
                      {value}
                    </span>
                  </div>
                ))}
                <div className={styles.orderTotalDivider} />
                <div className={`${styles.orderTotalRow} ${styles.orderTotalFinal}`}>
                  <span>Total</span>
                  <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                    {repMode && orderFilled && Math.abs(liveTotalNum - origTotalNum) > 0.01 && (
                      <span className={styles.itemOldPrice} style={{fontSize:'inherit',fontWeight:400,color:'#ADADAD'}}>{fmt(origTotalNum)}</span>
                    )}
                    {orderFilled ? fmt(liveTotalNum) : '$0.00'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>{/* end details content wrapper */}

        {/* Footer */}
        <div className={styles.rightFooter}>
          <div className={styles.footerInfo}>
            <span className={styles.footerTotal}>Total {orderFilled ? fmt(liveTotalNum) : '$0.00'}</span>
            <span className={styles.footerItems}>Items {orderFilled ? liveItems.length : '0'}</span>
          </div>
          <div className={styles.footerActions}>
            {!repMode && <button className={styles.rfqBtn} onClick={() => {
              const hasUserInteracted = chatMessages.some(m => m.type === 'user')
              if (!hasUserInteracted) {
                setChatMessages(prev => [...prev, {
                  type: 'ai',
                  text: `You don't have a recorded discount request yet. In the message box below, describe what you want—for example: "I want 10% off all items"—so we can save it and continue with your quote.`
                }])
              }
            }}>Request for Quote</button>}
            {repMode && (
              <button
                className={styles.sendToBuyerBtn}
                disabled={!repItemUpdated}
              >
                Send to Buyer
              </button>
            )}
            <button className={styles.checkoutBtn} onClick={() => repMode ? window.location.href = '/salesapp/order-summary' : null}>
              Go to Checkout
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>{/* end rightPanel */}
    </div>
  )
}
