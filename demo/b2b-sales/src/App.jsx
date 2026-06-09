import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Header from './components/Header/Header'
import StoreFront from './components/StoreFront/StoreFront'
import OrderBuilder from './components/OrderBuilder/OrderBuilder'
import FloatingToggle from './components/FloatingToggle/FloatingToggle'
import './App.css'


function BuyerHome() {
  const location  = useLocation()
  const navigate  = useNavigate()

  // Read URL params
  const params       = new URLSearchParams(location.search)
  const initRepMode  = params.get('repMode') === 'true'
  const initNewOrder = params.get('newOrder') === 'true'
  const initOpenOB   = params.get('openOB') === 'true' || location.pathname === '/storefrontb2b/orderbuilder' || location.pathname === '/salesapp/orderbuilder'
  const [obMounted,  setObMounted]  = useState(initRepMode || initOpenOB)
  const [obVisible,  setObVisible]  = useState(initRepMode || initOpenOB)
  const [fabLoading, setFabLoading] = useState(false)
  const [repMode,    setRepMode]    = useState(initRepMode)
  const [newOrder,   setNewOrder]   = useState(initNewOrder)
  const [pageVisible, setPageVisible] = useState(true)
  const [toast,      setToast]      = useState(null)
  const [toastOut,   setToastOut]   = useState(false)

  useEffect(() => {
    // Clean URL params after reading
    if (location.search) {
      navigate(location.pathname, { replace: true })
    }
    // Check for pending toast from sessionStorage
    const pending = sessionStorage.getItem('pendingToast')
    if (pending) {
      sessionStorage.removeItem('pendingToast')
      setTimeout(() => setToast(pending), 500)
    }
  }, [])

  function dismissToast() {
    setToastOut(true)
    setTimeout(() => { setToast(null); setToastOut(false) }, 300)
  }

  useEffect(() => {
    if (toast) {
      setToastOut(false)
      const t = setTimeout(() => dismissToast(), 8000)
      return () => clearTimeout(t)
    }
  }, [toast])

  function openOB() {
    if (fabLoading) return
    setFabLoading(true)
    setTimeout(() => {
      setFabLoading(false)
      setObMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setObVisible(true)))
    }, 900)
  }

  function closeOB() {
    setObVisible(false)
    setTimeout(() => { setObMounted(false); setRepMode(false); setNewOrder(false) }, 200)
  }

  function handleModeChange(mode) {
    if (mode === 'sales') {
      setPageVisible(false)
      setTimeout(() => {
        window.location.href = '/salesapp/home'
      }, 180)
    } else if (mode === 'buyer' && repMode) {
      closeOB()
    }
  }

  return (
    <>
      <div style={{ opacity: pageVisible ? 1 : 0, transition: 'opacity 0.18s ease' }}>
        <Header />
        <StoreFront />
        <button
          className={`fab${fabLoading ? ' fab-loading' : ''}`}
          type="button"
          aria-label="Order Builder"
          onClick={openOB}
        >
          {fabLoading
            ? <span className="fab-spinner" />
            : <span className="material-symbols-outlined">add</span>
          }
          <span className="fab-label">New Order</span>
        </button>

        {obMounted && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            opacity: obVisible ? 1 : 0,
            transform: obVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: obVisible ? 'auto' : 'none',
          }}>
            <OrderBuilder onClose={closeOB} repMode={repMode} newOrder={newOrder} />
          </div>
        )}
      </div>

      <FloatingToggle mode={repMode ? 'sales' : 'buyer'} onChange={handleModeChange} />

      {toast === 'cart-saved' && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px',
          background: '#1F1F1F', color: '#FFFFFF', borderRadius: '100px',
          padding: '12px 20px', fontSize: '13px', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 9999,
          whiteSpace: 'nowrap',
          animation: toastOut
            ? 'toastOut 0.28s cubic-bezier(0.2,0,0,1) both'
            : 'toastIn 0.22s cubic-bezier(0.2,0,0,1) both',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#4ADE80' }}>check_circle</span>
          <span>Quote saved as draft. Go to&nbsp;<button onClick={() => { dismissToast(); window.location.href = '/storefrontb2b/account/quotes'; }} style={{ background: 'none', border: 'none', color: '#60A5FA', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Quotes</button>&nbsp;to access it.</span>
        </div>
      )}
    </>
  )
}

function App() {
  useEffect(() => {
    function handleReset(e) {
      if ((e.key === 'r' || e.key === 'R') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        localStorage.removeItem('quoteRevised')
      }
    }
    window.addEventListener('keydown', handleReset)
    return () => window.removeEventListener('keydown', handleReset)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/storefrontb2b" replace />} />
        <Route path="/storefrontb2b" element={<BuyerHome />} />
        <Route path="/storefrontb2b/orderbuilder" element={<BuyerHome />} />
        <Route path="/storefrontb2b/*" element={<Navigate to="/storefrontb2b" replace />} />
        <Route path="/salesapp/orderbuilder" element={<BuyerHome />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
