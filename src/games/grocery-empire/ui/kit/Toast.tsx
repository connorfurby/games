import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx, useReducedMotion } from './hooks'

export type ToastTone = 'info' | 'success' | 'warn' | 'danger'

export interface ToastItem {
  id: number
  text: ReactNode
  tone: ToastTone
}

interface ToastApi {
  push: (text: ReactNode, opts?: { tone?: ToastTone; ms?: number }) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

/** Presentational host: renders a stack of toasts. Use ToastProvider for the managed version. */
export function ToastHost({ items, onDismiss, reducedMotion }: { items: ToastItem[]; onDismiss: (id: number) => void; reducedMotion?: boolean }) {
  const reduced = useReducedMotion(reducedMotion)
  return (
    <div className="gk-toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            layout={!reduced}
            className={cx('gk-toast', `gk-toast--${t.tone}`)}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 6 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            onClick={() => onDismiss(t.id)}
            title="Dismiss"
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Mount once. `useToast().push('Saved')` shows a toast that clears itself. */
export function ToastProvider({ children, max = 3 }: { children: ReactNode; max?: number }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const next = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const push = useCallback<ToastApi['push']>(
    (text, opts) => {
      const id = next.current++
      setItems((xs) => [...xs.slice(-(max - 1)), { id, text, tone: opts?.tone ?? 'info' }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), opts?.ms ?? 3200))
    },
    [dismiss, max],
  )

  useEffect(() => {
    const t = timers.current
    return () => t.forEach((h) => window.clearTimeout(h))
  }, [])

  const api = useMemo(() => ({ push }), [push])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastHost items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastCtx)
  if (!api) throw new Error('useToast outside ToastProvider')
  return api
}
