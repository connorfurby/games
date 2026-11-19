import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cx } from './hooks'

export type ToastTone = 'info' | 'good' | 'warn' | 'danger'

export interface ToastOptions {
  tone?: ToastTone
  /** Milliseconds on screen. Default 2400. */
  ms?: number
}

interface ToastItem {
  id: number
  text: string
  tone: ToastTone
}

interface ToastApi {
  push: (text: string, opts?: ToastOptions) => void
  dismiss: (id: number) => void
}

const MAX_TOASTS = 3
const ToastCtx = createContext<ToastApi | null>(null)

/** Stacked, auto-dismissing toast host. Polite live region so screen readers hear it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t != null) window.clearTimeout(t)
    timers.current.delete(id)
    setItems((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (text: string, opts: ToastOptions = {}) => {
      const id = nextId.current++
      const tone = opts.tone ?? 'info'
      setItems((xs) => [...xs.filter((x) => x.text !== text), { id, text, tone }].slice(-MAX_TOASTS))
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), opts.ms ?? 2400),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => window.clearTimeout(t))
      map.clear()
    }
  }, [])

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="sd-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('sd-toast-item', `sd-toast-item--${t.tone}`)}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
