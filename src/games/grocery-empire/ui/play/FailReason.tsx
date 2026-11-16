import type { ReactNode } from 'react'

export interface FailAction {
  label: string
  onClick: () => void
}

/**
 * One line under a disabled primary — usually the can() message.
 * When the reason points at another department, pass `action` to render a jump link.
 */
export function FailReason({ children, action }: { children: ReactNode; action?: FailAction }) {
  return (
    <p className="pf__fail">
      {children}
      {action ? (
        <>
          {' '}
          <button type="button" className="pf-chip__link" onClick={action.onClick}>
            {action.label}
          </button>
        </>
      ) : null}
    </p>
  )
}
