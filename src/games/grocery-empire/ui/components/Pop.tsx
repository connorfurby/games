import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { playSaleFx } from '@/shared/audio'

export interface PopItem {
  id: number
  text: string
  x: number
}

let popSeq = 1

function formatDelta(delta: number): string | null {
  if (delta <= 0) return null
  // Dev cheats / offline dumps shouldn't spray a green phone number into the chrome.
  if (delta >= 500) return null
  if (delta >= 100) return `+${Math.floor(delta)}`
  if (delta >= 1) return `+${Math.floor(delta)}`
  return '+…'
}

/** Lightweight sale scrap toward the baskets counter. */
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
    const text = formatDelta(delta)
    if (!text) return
    const id = popSeq++
    setPops((p) => [...p.slice(-5), { id, text, x: 18 + Math.random() * 50 }])
    const t = window.setTimeout(() => {
      setPops((p) => p.filter((x) => x.id !== id))
    }, 750)
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
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: -16, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {p.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
