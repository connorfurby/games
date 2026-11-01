import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { playSaleFx } from '@/shared/audio'

export interface PopItem {
  id: number
  text: string
  x: number
}

let popSeq = 1

/** Lightweight sale/receipt scrap toward the baskets counter. */
export function useSalePops(baskets: number, reducedMotion: boolean, muted = true): PopItem[] {
  const prevRef = useRef(baskets)
  const [pops, setPops] = useState<PopItem[]>([])

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = baskets
    if (baskets <= prev) return
    const delta = baskets - prev
    playSaleFx(muted)
    if (reducedMotion) return
    const id = popSeq++
    const text = delta >= 1 ? `+${Math.floor(delta)}` : '+…'
    setPops((p) => [...p.slice(-11), { id, text, x: 20 + Math.random() * 60 }])
    const t = window.setTimeout(() => {
      setPops((p) => p.filter((x) => x.id !== id))
    }, 900)
    return () => clearTimeout(t)
  }, [baskets, reducedMotion, muted])

  return pops
}

export function PopLayer({ pops }: { pops: PopItem[] }) {
  return (
    <div className="ge-pops" aria-hidden>
      <AnimatePresence>
        {pops.map((p) => (
          <motion.span
            key={p.id}
            className="ge-pop"
            style={{ left: `${p.x}%` }}
            initial={{ opacity: 0, y: 18, scale: 0.85 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          >
            {p.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
