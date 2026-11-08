import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId } from 'react'
import { Btn } from './Btn'

export type ConfirmSpec = {
  title: string
  body: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
}

export function ConfirmModal({
  open,
  spec,
  reducedMotion,
  onClose,
}: {
  open: boolean
  spec: ConfirmSpec | null
  reducedMotion: boolean
  onClose: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && spec ? (
        <motion.div
          className="ge-modal ge-confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className="ge-confirm"
            initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }
            }
          >
            <p className="ge-confirm__kicker">Confirm</p>
            <h3 id={titleId}>{spec.title}</h3>
            <p className="ge-confirm__body">{spec.body}</p>
            {spec.detail ? <p className="ge-confirm__detail">{spec.detail}</p> : null}
            <div className="ge-confirm__actions">
              <Btn tone="ghost" onClick={onClose}>
                {spec.cancelLabel ?? 'Cancel'}
              </Btn>
              <Btn
                autoFocus
                tone={spec.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => {
                  spec.onConfirm()
                  onClose()
                }}
              >
                {spec.confirmLabel ?? 'Confirm'}
              </Btn>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
