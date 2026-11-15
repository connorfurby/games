import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

export interface ConfirmOptions {
  title: ReactNode
  body?: ReactNode
  tone?: 'default' | 'danger'
  confirmLabel?: string
  cancelLabel?: string
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmCtx = createContext<ConfirmFn | null>(null)

/** Mount once near the app root. `useConfirm()` then returns an awaitable confirm(). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false) // a newer prompt cancels the older one
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOpts(o)
    })
  }, [])

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpts(null)
  }

  const value = useMemo(() => confirm, [confirm])
  const danger = opts?.tone === 'danger'

  return (
    <ConfirmCtx.Provider value={value}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => settle(false)}
        title={opts?.title ?? ''}
        tone={opts?.tone}
        footer={
          <>
            <Button tone="ghost" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button tone={danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {opts?.confirmLabel ?? (danger ? 'Yes, do it' : 'Confirm')}
            </Button>
          </>
        }
      >
        {opts?.body}
      </Modal>
    </ConfirmCtx.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmCtx)
  if (!fn) throw new Error('useConfirm outside ConfirmProvider')
  return fn
}
