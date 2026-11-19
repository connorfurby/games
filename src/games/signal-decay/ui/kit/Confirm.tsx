import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, type ButtonTone } from './Button'
import { Modal } from './Modal'

export interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ButtonTone
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmCtx = createContext<ConfirmFn | null>(null)

/** Promise-based confirm: `if (await confirm({ title: 'Retune?' })) dispatch(...)`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false)
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = useCallback((v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }, [])

  const cancel = useCallback(() => settle(false), [settle])
  const fn = useMemo(() => confirm, [confirm])

  return (
    <ConfirmCtx.Provider value={fn}>
      {children}
      <Modal
        open={opts != null}
        title={opts?.title ?? ''}
        onClose={cancel}
        size="sm"
        hideClose
        footer={
          <>
            <Button tone="ghost" onClick={cancel}>
              {opts?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button tone={opts?.tone ?? 'primary'} onClick={() => settle(true)}>
              {opts?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {opts?.body ? <div className="sd-confirm__body">{opts.body}</div> : null}
      </Modal>
    </ConfirmCtx.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx)
  if (!ctx) throw new Error('useConfirm outside ConfirmProvider')
  return ctx
}
