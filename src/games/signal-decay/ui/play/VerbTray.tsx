import type { ReactNode } from 'react'
import { Button, type ButtonProps } from '../kit/Button'
import { FailReason, type FailAction } from './FailReason'

export interface VerbSecondary {
  key: string
  label: ReactNode
  onClick: () => void
  fact?: ReactNode
  disabled?: boolean
  coachId?: string
  title?: string
}

export interface VerbTrayProps {
  primary: ButtonProps & { label: ReactNode }
  secondaries?: VerbSecondary[]
  failReason?: ReactNode
  failAction?: FailAction
  hint?: ReactNode
}

export function VerbTray({ primary, secondaries = [], failReason, failAction, hint }: VerbTrayProps) {
  const { label, tone = 'free', className, ...rest } = primary
  const secs = secondaries.slice(0, 4)
  return (
    <div className="pf__tray">
      <div className="pf__primary">
        <Button {...rest} tone={tone} className={`pf-press${className ? ` ${className}` : ''}`.trim()}>
          {label}
        </Button>
        {hint && !rest.disabled ? <p className="pf__hint">{hint}</p> : null}
        {failReason && rest.disabled ? <FailReason action={failAction}>{failReason}</FailReason> : null}
      </div>
      {secs.length ? (
        <div className="pf__secondaries">
          {secs.map((s) => (
            <Button
              key={s.key}
              tone="secondary"
              size="sm"
              disabled={s.disabled}
              coachId={s.coachId}
              title={s.title}
              className="pf-press"
              onClick={s.onClick}
            >
              <span className="pf-row__main">
                <span className="pf-row__label">{s.label}</span>
                {s.fact != null ? <span className="pf-row__fact">{s.fact}</span> : null}
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
