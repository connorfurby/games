import { Children, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '../kit/hooks'

/** First six sheet rows settle 40ms apart. Reduced motion paints immediately. */
export function SheetStagger({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const items = Children.toArray(children).slice(0, 24)
  if (reduced) return <>{children}</>
  return (
    <>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 5) * 0.04, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {child}
        </motion.div>
      ))}
      {Children.toArray(children).slice(24)}
    </>
  )
}
