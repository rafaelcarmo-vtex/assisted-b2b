import { useState, useRef, useEffect } from 'react'
import styles from './FloatingToggle.module.css'

const MODES = [
  { id: 'buyer', label: 'Buyer'    },
  { id: 'sales', label: 'Sales Rep' },
]

const MARGIN = 20

export default function FloatingToggle({ mode = 'buyer', onChange }) {
  const [pos, setPos]           = useState({ x: MARGIN, y: MARGIN })
  const [snapping, setSnapping] = useState(false)
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, opacity: 0 })
  const posRef     = useRef({ x: MARGIN, y: MARGIN })
  const dragging   = useRef(false)
  const hasMoved   = useRef(false)
  const startMouse = useRef({ x: 0, y: 0 })
  const offset     = useRef({ x: 0, y: 0 })
  const ref        = useRef(null)
  const btnRefs    = useRef([])

  // Init: bottom-center
  useEffect(() => {
    if (!ref.current) return
    const w    = ref.current.offsetWidth
    const h    = ref.current.offsetHeight
    const init = {
      x: (window.innerWidth - w) / 2,
      y: window.innerHeight - h - 32,
    }
    posRef.current = init
    setPos(init)
  }, [])

  // Update pill position whenever mode changes
  useEffect(() => {
    const idx = MODES.findIndex(m => m.id === mode)
    const btn = btnRefs.current[idx]
    if (!btn) return
    setPillStyle({
      width: btn.offsetWidth,
      left: btn.offsetLeft,
      opacity: 1,
    })
  }, [mode])

  // Also measure on mount after render — defer to after paint so dimensions are ready
  useEffect(() => {
    requestAnimationFrame(() => {
      const idx = MODES.findIndex(m => m.id === mode)
      const btn = btnRefs.current[idx]
      if (!btn) return
      setPillStyle({
        width: btn.offsetWidth,
        left: btn.offsetLeft,
        opacity: 1,
      })
    })
  }, [])

  function applyPos(newPos) {
    posRef.current = newPos
    setPos(newPos)
  }

  function snapToCorner(x, y) {
    if (!ref.current) return { x, y }
    const w  = ref.current.offsetWidth
    const h  = ref.current.offsetHeight
    const cx = x + w / 2
    const cy = y + h / 2
    return {
      x: cx < window.innerWidth  / 2 ? MARGIN : window.innerWidth  - w - MARGIN,
      y: cy < window.innerHeight / 2 ? MARGIN : window.innerHeight - h - MARGIN,
    }
  }

  function onPointerDown(e) {
    if (e.target.closest(`.${styles.modeBtn}`)) return
    dragging.current   = true
    hasMoved.current   = false
    startMouse.current = { x: e.clientX, y: e.clientY }
    const rect = ref.current.getBoundingClientRect()
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    ref.current.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onPointerMove(e) {
    if (!dragging.current) return
    const dx = e.clientX - startMouse.current.x
    const dy = e.clientY - startMouse.current.y
    if (!hasMoved.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasMoved.current = true
    }
    if (hasMoved.current) {
      const w    = ref.current.offsetWidth
      const h    = ref.current.offsetHeight
      const newX = Math.max(0, Math.min(window.innerWidth  - w, e.clientX - offset.current.x))
      const newY = Math.max(0, Math.min(window.innerHeight - h, e.clientY - offset.current.y))
      applyPos({ x: newX, y: newY })
    }
  }

  function onPointerUp() {
    if (dragging.current && hasMoved.current) {
      const snapped = snapToCorner(posRef.current.x, posRef.current.y)
      setSnapping(true)
      applyPos(snapped)
      setTimeout(() => setSnapping(false), 350)
    }
    dragging.current = false
  }

  return (
    <div
      ref={ref}
      className={styles.floatingToggle}
      style={{
        left: pos.x,
        top:  pos.y,
        transition: snapping
          ? 'left 0.35s cubic-bezier(0.2,0,0,1), top 0.35s cubic-bezier(0.2,0,0,1)'
          : 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className={styles.track}>
        {/* Sliding pill */}
        <span
          className={styles.pill}
          style={{
            width: pillStyle.width,
            left: pillStyle.left,
            opacity: pillStyle.opacity,
          }}
        />
        {MODES.map((m, i) => (
          <button
            key={m.id}
            ref={el => btnRefs.current[i] = el}
            className={styles.modeBtn}
            onClick={() => onChange?.(m.id)}
          >
            <span className={`${styles.modeBtnLabel} ${mode === m.id ? styles.modeBtnLabelActive : ''}`}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
