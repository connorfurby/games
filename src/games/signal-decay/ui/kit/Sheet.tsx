import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sd-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sd-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sd-sheet__head">
          <h2>{title}</h2>
          <Button tone="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </header>
        <div className="sd-sheet__body">{children}</div>
      </div>
    </div>
  )
}
