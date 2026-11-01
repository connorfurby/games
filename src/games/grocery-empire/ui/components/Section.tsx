import type { ReactNode } from 'react'

export function Section({
  label,
  children,
  className = '',
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ge-section ${className}`.trim()}>
      {label ? <div className="ge-section__label">{label}</div> : null}
      {children}
    </div>
  )
}
