import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './hooks'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Hide the Done button in the header (e.g. when the footer owns the actions). */
  hideClose?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Centered radio-skinned dialog. Escape closes, Tab is trapped, focus returns on close. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  hideClose,
  size = 'md',
  className,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sd-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={cx('sd-modal', `sd-modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sd-modal__head">
          <h2 id={titleId}>{title}</h2>
          {hideClose ? null : (
            <Button tone="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
          )}
        </header>
        <div className="sd-modal__body">{children}</div>
        {footer ? <footer className="sd-modal__foot">{footer}</footer> : null}
      </div>
    </div>
  )
}
