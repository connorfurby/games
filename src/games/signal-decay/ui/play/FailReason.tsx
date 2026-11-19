import type { ReactNode } from 'react'

export type FailAction = { label: string; onClick: () => void } | undefined

export function FailReason({ children, action }: { children: ReactNode; action?: FailAction }) {
  if (!children) return null
  return (
    <p className="sd-fail">
      {children}
      {action ? (
        <>
          {' '}
          <button type="button" className="sd-fail__link" onClick={action.onClick}>
            {action.label}
          </button>
        </>
      ) : null}
    </p>
  )
}
