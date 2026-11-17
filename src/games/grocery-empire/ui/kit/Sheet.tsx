import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { sfx } from '@/shared/audio'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { DeskInline, useDeskInline } from './desk'
import { cx, useEscape, usePhone, useReducedMotion, overlayRoot } from './hooks'
import { IconButton } from './IconButton'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
  reducedMotion?: boolean
  className?: string
  /** In a desk area: hide this card (e.g. the feature is not unlocked yet). */
  deskHidden?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Bottom sheet on phones (<= 720px), right-hand drawer on desktop. */
export function Sheet({ open: openProp, onClose, title, children, footer, reducedMotion, className, deskHidden }: SheetProps) {
  const inline = useDeskInline()
  const open = openProp && !inline
  const phone = usePhone()
  const reduced = useReducedMotion(reducedMotion)
  const panel = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  useEscape(open, onClose)

  useEffect(() => {
    if (!open) return
    sfx.open()
    prevFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const node = panel.current
    if (!node) return
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('disabled'))
    const first = focusables()[0] ?? node
    first.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const i = list.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault()
          list[list.length - 1]!.focus()
        }
      } else if (i === list.length - 1 || i < 0) {
        e.preventDefault()
        list[0]!.focus()
      }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      prevFocus.current?.focus()
    }
  }, [open])

  const hidden = phone ? { y: '100%' } : { x: '100%' }
  const shown = phone ? { y: 0 } : { x: 0 }
  const dur = reduced ? 0 : 0.22

  const tree = (
    <AnimatePresence>
      {open ? (
        <div className="gk-sheet-root" key="sheet">
          <motion.div
            className="gk-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cx('gk-sheet', phone ? 'gk-sheet--bottom' : 'gk-sheet--side', className)}
            initial={reduced ? false : hidden}
            animate={shown}
            exit={reduced ? undefined : hidden}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
          >
            <header className="gk-sheet__head">
              {phone ? <span className="gk-sheet__grip" aria-hidden /> : null}
              <h3 id={titleId} className="gk-sheet__title">
                {title}
              </h3>
              <IconButton aria-label="Close" icon="×" size="sm" onClick={onClose} />
            </header>
            <div className="gk-sheet__body">{children}</div>
            {footer ? <footer className="gk-sheet__foot">{footer}</footer> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
  if (inline) {
    if (deskHidden) return null
    return (
      <section className={cx('pf-desk', className)} aria-labelledby={titleId}>
        <h3 id={titleId} className="pf-desk__title">
          {title}
        </h3>
        {/* Sheets nested in a desk (item details) are real sheets again. */}
        <DeskInline.Provider value={false}>
          <div className="pf-desk__body">{children}</div>
          {footer ? <footer className="pf-desk__foot">{footer}</footer> : null}
        </DeskInline.Provider>
      </section>
    )
  }
  const root = overlayRoot()
  return root ? createPortal(tree, root) : tree
}
