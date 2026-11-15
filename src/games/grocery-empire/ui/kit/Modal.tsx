import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cx, useEscape, useReducedMotion } from './hooks'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
  tone?: 'default' | 'danger'
  reducedMotion?: boolean
  className?: string
}

/** Centered dialog. Esc and scrim click close it. */
export function Modal({ open, onClose, title, children, footer, tone = 'default', reducedMotion, className }: ModalProps) {
  const reduced = useReducedMotion(reducedMotion)
  const box = useRef<HTMLDivElement>(null)
  useEscape(open, onClose)
  useEffect(() => {
    if (open) box.current?.focus()
  }, [open])
  const dur = reduced ? 0 : 0.16

  return (
    <AnimatePresence>
      {open ? (
        <div className="gk-modal-root" key="modal">
          <motion.div
            className="gk-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
            onClick={onClose}
          />
          <motion.div
            ref={box}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={cx('gk-modal', tone === 'danger' && 'gk-modal--danger', className)}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: dur, ease: 'easeOut' }}
          >
            <h3 className="gk-modal__title">{title}</h3>
            {children != null ? <div className="gk-modal__body">{children}</div> : null}
            {footer ? <footer className="gk-modal__foot">{footer}</footer> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
