import type { ReactNode } from 'react'

/** One-shot garnish wrapper. `kind` picks the keyframe; fx.css drops it under reduced motion. */
export function Beat({
  on,
  kind = 'pop',
  className = '',
  children,
}: {
  on: boolean
  kind?: 'pop' | 'lock'
  className?: string
  children?: ReactNode
}) {
  return (
    <span className={`fx-beat fx-beat--${kind}${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
