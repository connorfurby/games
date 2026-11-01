import type { ReactNode } from 'react'

export function Line({
  left,
  right,
  muted,
  className = '',
}: {
  left: ReactNode
  right?: ReactNode
  muted?: boolean
  className?: string
}) {
  return (
    <div className={`ge-line ${muted ? 'ge-line--muted' : ''} ${className}`.trim()}>
      <span className="ge-line__left">{left}</span>
      {right != null ? <span className="ge-line__right">{right}</span> : null}
    </div>
  )
}
