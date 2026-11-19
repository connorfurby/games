import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import './curtain.css'

import { CURTAIN_EVT as EVT, type CurtainReq } from './curtainBus'

export function CurtainHost() {
  const [req, setReq] = useState<CurtainReq | null>(null)
  const ran = useRef(false)
  useEffect(() => {
    const h = (e: Event) => {
      ran.current = false
      setReq((e as CustomEvent<CurtainReq>).detail)
    }
    window.addEventListener(EVT, h)
    return () => window.removeEventListener(EVT, h)
  }, [])
  return (
    <AnimatePresence>
      {req ? (
        <motion.div
          key="curtain"
          className="ge-curtain"
          role="status"
          aria-label={req.title}
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%', transition: { duration: 0.55, ease: [0.7, 0, 0.2, 1] } }}
          transition={{ duration: 0.45, ease: [0.6, 0, 0.3, 1] }}
          onAnimationComplete={() => {
            // Shutter is down: swap the store behind it, hold a beat, roll it up on the new one.
            if (ran.current) return
            ran.current = true
            try {
              req.run()
            } finally {
              setTimeout(() => setReq(null), 650)
            }
          }}
        >
          <div className="ge-curtain__slats" aria-hidden />
          <div className="ge-curtain__plate">
            <strong>{req.title}</strong>
            {req.sub ? <span>{req.sub}</span> : null}
          </div>
          <div className="ge-curtain__handle" aria-hidden />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
