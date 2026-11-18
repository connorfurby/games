import type { ReactNode } from 'react'
import { requestInbox } from '../shell/uiBus'

export interface FailAction {
  label: string
  onClick: () => void
}

/**
 * One line under a disabled primary — usually the can() message.
 * When the reason points at another department, pass `action` to render a jump link.
 */
export function FailReason({ children, action }: { children: ReactNode; action?: FailAction }) {
  // A reason that says "… in Memos." gets the way there for free.
  if (!action && typeof children === 'string' && /\bin Memos\.?$/.test(children.trim())) {
    action = { label: 'Open Memos →', onClick: () => requestInbox('memos') }
  }
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
